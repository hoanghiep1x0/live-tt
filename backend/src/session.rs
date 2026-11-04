//! Lõi phiên: áp sự kiện live vào trạng thái phòng.
//!
//! Thuần, không I/O, không thời gian hệ thống — `now` luôn được truyền vào.
//! Nhờ vậy chạy lại cho cùng kết quả và test được không cần máy chủ.
//!
//! Phiên nằm ở backend chứ không ở trình duyệt: mở hai cửa sổ quản lý, mở thêm
//! OBS, mở thêm máy khác — tất cả phải thấy đúng một sự thật.

use std::collections::{BTreeMap, HashMap, VecDeque};

use serde::{Deserialize, Serialize};

use crate::events::{LiveEvent, Payload};

/// Giữ bấy nhiêu mục gần nhất. Sân khấu chỉ vẽ vài mục cuối; phần dài hơn là
/// việc của sổ sách, không phải của bộ nhớ.
const FEED_GIU: usize = 200;
/// Người xem gần đây, để module biết trong phòng đang có ai.
const NGUOI_GIU: usize = 60;

/// Vắng quá lâu thì trả ghế cho người khác. Người từng tặng quà được giữ lâu hơn.
pub const GHE_VANG_MS: i64 = 10 * 60 * 1000;
pub const GHE_VANG_TANG_QUA_MS: i64 = 30 * 60 * 1000;

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Totals {
    pub viewers: u64,
    pub likes: u64,
    pub gifts: u64,
    pub xu: i64,
    pub comments: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Giver {
    pub user: String,
    pub name: String,
    pub xu: i64,
    pub coins: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Seat {
    /// Chỉ số ghế. Ghế thứ i nằm ở đâu là việc của thiết kế — phòng kể chuyện
    /// xếp hình quạt, phòng đám cưới xếp bàn tròn.
    pub i: usize,
    pub user: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct FeedItem {
    pub id: u64,
    pub at: i64,
    pub kind: String,
    pub name: String,
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub xu: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub coins: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gift: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub count: Option<u32>,
    /// Nhân vật ảo. Module phải bỏ qua, nếu không bot tự cảm ơn chính nó.
    #[serde(rename = "virtual", skip_serializing_if = "Option::is_none")]
    pub ao: Option<bool>,
    /// Giọng đọc dạng "nhà-cung-cấp:tên-giọng", chỉ có ở câu MC.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub voice: Option<String>,
}

impl FeedItem {
    fn moi(id: u64, at: i64, kind: &str, name: &str, text: String) -> Self {
        Self {
            id,
            at,
            kind: kind.into(),
            name: name.into(),
            text,
            user: None,
            xu: None,
            coins: None,
            gift: None,
            count: None,
            ao: None,
            voice: None,
        }
    }
}

#[derive(Clone, Debug)]
struct Viewer {
    name: String,
    avatar: Option<String>,
    last_at: i64,
    /// Người từng tặng quà được giữ ghế lâu hơn.
    da_tang: bool,
}

/// Bản rút gọn chỉ đọc mà sân khấu và module được thấy.
/// Khớp `SessionView` bên `client/shared/contracts/src/events.ts`.
#[derive(Clone, Debug, Serialize)]
pub struct SessionView {
    #[serde(rename = "designId")]
    pub design_id: Option<String>,
    #[serde(rename = "startedAt")]
    pub started_at: Option<i64>,
    pub totals: Totals,
    #[serde(rename = "topGivers")]
    pub top_givers: Vec<Giver>,
    pub seats: Vec<Seat>,
    #[serde(rename = "recentUsers")]
    pub recent_users: Vec<crate::events::EventUser>,
    #[serde(rename = "recentFeed")]
    pub recent_feed: Vec<FeedItem>,
}

pub struct Session {
    design_id: String,
    started_at: i64,
    /// Đổi xu TikTok sang điểm của phòng. Mỗi bối cảnh có thể khác nhau.
    ti_le: f64,
    totals: Totals,
    viewers: HashMap<String, Viewer>,
    /// Ghế thứ i đang là của ai.
    ghe: Vec<Option<String>>,
    ghe_cua: HashMap<String, usize>,
    givers: BTreeMap<String, Giver>,
    feed: VecDeque<FeedItem>,
    gan_day: VecDeque<String>,
    next_id: u64,
    /// Số người xem do TikTok đếm. Khác hẳn số người mình thấy: phòng nghìn
    /// người thì mình chỉ biết mặt vài chục người có gõ chữ hay tặng quà.
    nguoi_xem_ngoai: Option<u64>,
}

impl Session {
    pub fn new(design_id: &str, suc_chua: usize, ti_le: f64, now: i64) -> Self {
        Self {
            design_id: design_id.to_string(),
            started_at: now,
            ti_le: if ti_le > 0.0 { ti_le } else { 1.0 },
            totals: Totals::default(),
            viewers: HashMap::new(),
            ghe: vec![None; suc_chua],
            ghe_cua: HashMap::new(),
            givers: BTreeMap::new(),
            feed: VecDeque::new(),
            gan_day: VecDeque::new(),
            next_id: 1,
            nguoi_xem_ngoai: None,
        }
    }

    pub fn design_id(&self) -> &str {
        &self.design_id
    }

    /// Nhận số người xem từ nguồn. Có con số này thì dùng nó, vì nó là số thật
    /// của phòng; không có thì đếm những người mình đã thấy.
    pub fn dat_nguoi_xem(&mut self, n: u64) {
        self.nguoi_xem_ngoai = Some(n);
        self.totals.viewers = n;
    }

    fn cap_nhat_nguoi_xem(&mut self) {
        if self.nguoi_xem_ngoai.is_none() {
            self.totals.viewers = self.viewers.len() as u64;
        }
    }

    fn id_moi(&mut self) -> u64 {
        let id = self.next_id;
        self.next_id += 1;
        id
    }

    /// Ghi nhận người xem; trả `true` nếu đây là lần đầu thấy người này.
    fn ghi_nguoi(&mut self, ev: &LiveEvent, now: i64) -> bool {
        let moi = !self.viewers.contains_key(&ev.who.user);
        let v = self
            .viewers
            .entry(ev.who.user.clone())
            .or_insert_with(|| Viewer {
                name: ev.who.name.clone(),
                avatar: ev.who.avatar.clone(),
                last_at: now,
                da_tang: false,
            });
        // Người đổi tên hiển thị giữa phiên là chuyện thường; theo tên mới nhất.
        v.name = ev.who.name.clone();
        if ev.who.avatar.is_some() {
            v.avatar = ev.who.avatar.clone();
        }
        v.last_at = now;
        if moi {
            self.gan_day.push_back(ev.who.user.clone());
            while self.gan_day.len() > NGUOI_GIU {
                self.gan_day.pop_front();
            }
        }
        moi
    }

    /// Xếp chỗ cho một người. Trả chỉ số ghế, hoặc `None` khi phòng đã kín.
    fn xep_ghe(&mut self, user: &str) -> Option<usize> {
        if let Some(i) = self.ghe_cua.get(user) {
            return Some(*i);
        }
        let i = self.ghe.iter().position(Option::is_none)?;
        self.ghe[i] = Some(user.to_string());
        self.ghe_cua.insert(user.to_string(), i);
        Some(i)
    }

    fn tra_ghe(&mut self, user: &str) {
        if let Some(i) = self.ghe_cua.remove(user) {
            self.ghe[i] = None;
        }
    }

    /// Vắng quá lâu thì trả ghế, để người đang xem có chỗ.
    /// Trả về số ghế vừa thu hồi.
    pub fn thu_hoi_ghe(&mut self, now: i64) -> usize {
        let het: Vec<String> = self
            .ghe_cua
            .keys()
            .filter(|u| match self.viewers.get(*u) {
                Some(v) => {
                    let han = if v.da_tang {
                        GHE_VANG_TANG_QUA_MS
                    } else {
                        GHE_VANG_MS
                    };
                    now - v.last_at > han
                }
                None => true,
            })
            .cloned()
            .collect();
        for u in &het {
            self.tra_ghe(u);
            self.viewers.remove(u);
        }
        self.cap_nhat_nguoi_xem();
        het.len()
    }

    /// Áp một sự kiện. Trả về các mục feed mới sinh ra, để phát xuống.
    ///
    /// `ao` là nhân vật do máy dựng trong một phiên thật (module bot sẽ sinh ra).
    /// Cờ này phải nằm NGAY TRONG phiên, không phải gắn thêm lúc phát xuống:
    /// sân khấu nhận feed qua hai đường — tin feed và bản chụp phiên — hai đường
    /// mà nói khác nhau thì module lúc chạy lúc không.
    pub fn apply(&mut self, ev: &LiveEvent, now: i64, ao: bool) -> Vec<FeedItem> {
        self.ghi_nguoi(ev, now);
        let id = self.id_moi();
        let name = ev.who.name.clone();
        let user = ev.who.user.clone();

        let mut item = match &ev.what {
            Payload::Join => {
                self.xep_ghe(&user);
                FeedItem::moi(id, now, "join", &name, "vào phòng".into())
            }
            Payload::Leave => {
                self.tra_ghe(&user);
                self.viewers.remove(&user);
                FeedItem::moi(id, now, "leave", &name, "rời phòng".into())
            }
            Payload::Comment { text } => {
                self.totals.comments += 1;
                // Bình luận cũng là có mặt: người gõ chữ thì được giữ chỗ.
                self.xep_ghe(&user);
                FeedItem::moi(id, now, "comment", &name, text.clone())
            }
            Payload::Like { count, total } => {
                // Tin tổng của TikTok hơn cộng dồn phía mình: tin có thể rơi mất
                // trên đường, và tổng thì không bao giờ lùi.
                let cong = self.totals.likes.saturating_add(u64::from(*count));
                self.totals.likes = match total {
                    Some(t) => cong.max(*t),
                    None => cong,
                };
                let mut it = FeedItem::moi(id, now, "like", &name, format!("thả {count} tim"));
                it.count = Some(*count);
                it
            }
            Payload::Gift {
                gift,
                count,
                xu_each,
            } => {
                let coins = i64::from(*count) * xu_each;
                let xu = (coins as f64 * self.ti_le).round() as i64;
                self.totals.gifts += u64::from(*count);
                self.totals.xu += xu;
                self.xep_ghe(&user);
                if let Some(v) = self.viewers.get_mut(&user) {
                    v.da_tang = true;
                }
                let anh = ev.who.avatar.clone();
                let g = self.givers.entry(user.clone()).or_insert_with(|| Giver {
                    user: user.clone(),
                    name: name.clone(),
                    xu: 0,
                    coins: 0,
                    avatar: None,
                });
                g.name = name.clone();
                if anh.is_some() {
                    g.avatar = anh;
                }
                g.xu += xu;
                g.coins += coins;

                let mut it = FeedItem::moi(id, now, "gift", &name, format!("tặng {gift} ×{count}"));
                it.gift = Some(gift.clone());
                it.count = Some(*count);
                it.coins = Some(coins);
                it.xu = Some(xu);
                it
            }
            Payload::Follow => FeedItem::moi(id, now, "follow", &name, "vừa theo dõi".into()),
            Payload::Share => FeedItem::moi(id, now, "share", &name, "vừa chia sẻ".into()),
            Payload::Subscribe { months } => FeedItem::moi(
                id,
                now,
                "subscribe",
                &name,
                match months {
                    Some(m) => format!("hội viên tháng {m}"),
                    None => "vừa thành hội viên".into(),
                },
            ),
        };
        item.user = Some(user);
        item.ao = if ao { Some(true) } else { None };

        self.cap_nhat_nguoi_xem();
        self.feed.push_back(item.clone());
        while self.feed.len() > FEED_GIU {
            self.feed.pop_front();
        }
        vec![item]
    }

    /// Ghi một câu MC vào feed.
    ///
    /// Câu MC phải nằm TRONG phiên chứ không chỉ phát thẳng xuống sân khấu: lượt
    /// sau AI cần đọc lại mình vừa nói gì mới nối mạch được, và cửa sổ xem mở
    /// giữa chừng cũng thấy MC đang kể tới đâu.
    pub fn mc_noi(&mut self, now: i64, text: String, voice: Option<String>) -> FeedItem {
        let id = self.id_moi();
        let mut item = FeedItem::moi(id, now, "host", "MC", text);
        item.voice = voice;
        self.feed.push_back(item.clone());
        while self.feed.len() > FEED_GIU {
            self.feed.pop_front();
        }
        item
    }

    pub fn totals(&self) -> &Totals {
        &self.totals
    }

    /// Top người tặng, nhiều xu trước. Hoà xu thì ai tên trước đứng trước, để
    /// bảng không nhảy chỗ mỗi lần vẽ lại.
    pub fn top_givers(&self, n: usize) -> Vec<Giver> {
        let mut v: Vec<Giver> = self.givers.values().cloned().collect();
        v.sort_by(|a, b| b.xu.cmp(&a.xu).then_with(|| a.user.cmp(&b.user)));
        v.truncate(n);
        v
    }

    pub fn seats(&self) -> Vec<Seat> {
        let mut ra: Vec<Seat> = self
            .ghe_cua
            .iter()
            .filter_map(|(u, i)| {
                let v = self.viewers.get(u)?;
                Some(Seat {
                    i: *i,
                    user: u.clone(),
                    name: v.name.clone(),
                    avatar: v.avatar.clone(),
                })
            })
            .collect();
        ra.sort_by_key(|s| s.i);
        ra
    }

    pub fn view(&self, feed_n: usize) -> SessionView {
        let recent_users = self
            .gan_day
            .iter()
            .rev()
            .filter_map(|u| {
                self.viewers.get(u).map(|v| crate::events::EventUser {
                    user: u.clone(),
                    name: v.name.clone(),
                    avatar: v.avatar.clone(),
                })
            })
            .collect();
        SessionView {
            design_id: Some(self.design_id.clone()),
            started_at: Some(self.started_at),
            totals: self.totals.clone(),
            top_givers: self.top_givers(5),
            seats: self.seats(),
            recent_users,
            recent_feed: self.feed.iter().rev().take(feed_n).rev().cloned().collect(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::events::Payload as P;

    fn phien() -> Session {
        Session::new("ke-chuyen", 4, 1.0, 1_000)
    }

    fn vao(u: &str) -> LiveEvent {
        LiveEvent::new(u, u, P::Join)
    }

    #[test]
    fn nguoi_vao_duoc_xep_cho() {
        let mut s = phien();
        s.apply(&vao("an"), 1_000, false);
        s.apply(&vao("binh"), 1_100, false);
        let g = s.seats();
        assert_eq!(g.len(), 2);
        assert_eq!(g[0].i, 0);
        assert_eq!(g[1].i, 1);
        assert_eq!(s.totals().viewers, 2);
    }

    #[test]
    fn mot_nguoi_vao_hai_lan_khong_chiem_hai_ghe() {
        let mut s = phien();
        s.apply(&vao("an"), 1_000, false);
        s.apply(&vao("an"), 2_000, false);
        assert_eq!(s.seats().len(), 1);
        assert_eq!(s.totals().viewers, 1);
    }

    #[test]
    fn ra_phong_thi_tra_ghe_cho_nguoi_khac() {
        let mut s = phien();
        for u in ["a", "b", "c", "d"] {
            s.apply(&vao(u), 1_000, false);
        }
        assert_eq!(s.seats().len(), 4, "phòng 4 ghế thì kín");

        // Kín chỗ: người thứ năm vẫn vào phòng, chỉ là chưa có ghế.
        s.apply(&vao("e"), 1_100, false);
        assert_eq!(s.seats().len(), 4);
        assert_eq!(s.totals().viewers, 5);

        s.apply(&LiveEvent::new("a", "a", P::Leave), 1_200, false);
        s.apply(&vao("e"), 1_300, false);
        let ghe: Vec<String> = s.seats().into_iter().map(|x| x.user).collect();
        assert!(
            ghe.iter().any(|x| x == "e"),
            "ghế trống phải tới tay người đang chờ: {ghe:?}"
        );
    }

    #[test]
    fn vang_qua_lau_thi_bi_thu_ghe() {
        let mut s = phien();
        s.apply(&vao("an"), 1_000, false);
        s.apply(
            &LiveEvent::new(
                "binh",
                "Bình",
                P::Comment {
                    text: "chào".into(),
                },
            ),
            1_000,
            false,
        );

        assert_eq!(
            s.thu_hoi_ghe(1_000 + GHE_VANG_MS),
            0,
            "chưa quá hạn thì giữ nguyên"
        );
        assert_eq!(s.thu_hoi_ghe(1_001 + GHE_VANG_MS), 2);
        assert_eq!(s.seats().len(), 0);
        assert_eq!(s.totals().viewers, 0);
    }

    #[test]
    fn nguoi_tung_tang_qua_duoc_giu_ghe_lau_hon() {
        let mut s = phien();
        s.apply(&vao("an"), 1_000, false);
        s.apply(
            &LiveEvent::new(
                "hao",
                "Hào",
                P::Gift {
                    gift: "Sen".into(),
                    count: 1,
                    xu_each: 10,
                },
            ),
            1_000,
            false,
        );

        s.thu_hoi_ghe(1_001 + GHE_VANG_MS);
        let con: Vec<String> = s.seats().into_iter().map(|x| x.user).collect();
        assert_eq!(con, vec!["hao".to_string()], "người tặng quà phải còn ghế");

        s.thu_hoi_ghe(1_001 + GHE_VANG_TANG_QUA_MS);
        assert_eq!(s.seats().len(), 0);
    }

    #[test]
    fn qua_cong_xu_va_len_bang_top() {
        let mut s = Session::new("ke-chuyen", 10, 1.0, 0);
        s.apply(
            &LiveEvent::new(
                "a",
                "An",
                P::Gift {
                    gift: "Sen".into(),
                    count: 3,
                    xu_each: 10,
                },
            ),
            0,
            false,
        );
        s.apply(
            &LiveEvent::new(
                "b",
                "Bình",
                P::Gift {
                    gift: "Sen".into(),
                    count: 1,
                    xu_each: 99,
                },
            ),
            0,
            false,
        );
        assert_eq!(s.totals().gifts, 4, "đếm số món, không phải số lần tặng");
        assert_eq!(s.totals().xu, 129);

        let top = s.top_givers(5);
        assert_eq!(top[0].user, "b", "nhiều xu đứng trước");
        assert_eq!(top[0].coins, 99);
        assert_eq!(top[1].xu, 30);
    }

    #[test]
    fn mot_nguoi_tang_nhieu_lan_thi_cong_don_vao_mot_dong() {
        let mut s = Session::new("ke-chuyen", 10, 1.0, 0);
        for _ in 0..3 {
            s.apply(
                &LiveEvent::new(
                    "a",
                    "An",
                    P::Gift {
                        gift: "Sen".into(),
                        count: 1,
                        xu_each: 10,
                    },
                ),
                0,
                false,
            );
        }
        let top = s.top_givers(5);
        assert_eq!(top.len(), 1);
        assert_eq!(top[0].xu, 30);
    }

    #[test]
    fn ti_le_doi_xu_theo_boi_canh() {
        let mut s = Session::new("chua", 10, 2.5, 0);
        s.apply(
            &LiveEvent::new(
                "a",
                "An",
                P::Gift {
                    gift: "Sen".into(),
                    count: 2,
                    xu_each: 10,
                },
            ),
            0,
            false,
        );
        assert_eq!(s.totals().xu, 50, "20 xu TikTok × 2,5");
        assert_eq!(
            s.top_givers(1)[0].coins,
            20,
            "xu thật của TikTok giữ nguyên để đối soát"
        );
    }

    #[test]
    fn tim_lay_tong_cua_tiktok_khi_co() {
        let mut s = phien();
        s.apply(
            &LiveEvent::new(
                "a",
                "A",
                P::Like {
                    count: 5,
                    total: None,
                },
            ),
            0,
            false,
        );
        assert_eq!(s.totals().likes, 5);

        // Tin rơi mất giữa chừng: tổng của TikTok kéo con số lên đúng.
        s.apply(
            &LiveEvent::new(
                "a",
                "A",
                P::Like {
                    count: 5,
                    total: Some(900),
                },
            ),
            0,
            false,
        );
        assert_eq!(s.totals().likes, 900);

        // Tổng không bao giờ lùi, kể cả khi tin tới trễ.
        s.apply(
            &LiveEvent::new(
                "a",
                "A",
                P::Like {
                    count: 1,
                    total: Some(10),
                },
            ),
            0,
            false,
        );
        assert_eq!(s.totals().likes, 901);
    }

    #[test]
    fn muc_feed_mang_du_thong_tin_cho_module() {
        let mut s = phien();
        let ra = s.apply(
            &LiveEvent::new(
                "a",
                "An",
                P::Gift {
                    gift: "Hoa hồng".into(),
                    count: 2,
                    xu_each: 10,
                },
            ),
            5_000,
            false,
        );
        let it = &ra[0];
        assert_eq!(it.kind, "gift");
        assert_eq!(it.gift.as_deref(), Some("Hoa hồng"));
        assert_eq!(it.count, Some(2));
        assert_eq!(it.coins, Some(20));
        assert_eq!(it.user.as_deref(), Some("a"));
        assert_eq!(it.at, 5_000);
    }

    #[test]
    fn doi_ten_giua_phien_thi_theo_ten_moi() {
        let mut s = phien();
        s.apply(&LiveEvent::new("a", "An", P::Join), 0, false);
        s.apply(
            &LiveEvent::new("a", "An Nguyễn", P::Comment { text: "hi".into() }),
            1,
            false,
        );
        assert_eq!(s.seats()[0].name, "An Nguyễn");
    }

    #[test]
    fn cau_mc_vao_feed_de_luot_sau_doc_lai_duoc() {
        let mut s = Session::new("ke-chuyen", 4, 1.0, 0);
        s.apply(&vao("an"), 1_000, false);
        let it = s.mc_noi(2_000, "Chào An nha".into(), Some("vieneu:mai".into()));
        assert_eq!(it.kind, "host");
        assert_eq!(it.name, "MC");
        assert_eq!(it.voice.as_deref(), Some("vieneu:mai"));
        let v = s.view(10);
        let cuoi = v.recent_feed.last().unwrap();
        assert_eq!(cuoi.kind, "host", "câu MC phải nằm trong phiên");
        assert_eq!(s.totals().comments, 0, "câu MC không phải bình luận của khách");
    }

    #[test]
    fn feed_khong_phinh_vo_han() {
        let mut s = Session::new("ke-chuyen", 10, 1.0, 0);
        for i in 0..(FEED_GIU + 50) {
            s.apply(
                &LiveEvent::new(
                    "a",
                    "A",
                    P::Comment {
                        text: format!("{i}"),
                    },
                ),
                i as i64,
                false,
            );
        }
        assert_eq!(s.feed.len(), FEED_GIU);
        let v = s.view(10);
        assert_eq!(v.recent_feed.len(), 10);
        assert_eq!(
            v.recent_feed.last().unwrap().text,
            format!("{}", FEED_GIU + 49)
        );
    }

    #[test]
    fn co_nhan_vat_ao_nam_ngay_trong_phien() {
        // Hai đường xuống sân khấu — tin feed và bản chụp phiên — phải nói
        // giống nhau, nếu không module lúc chạy lúc không.
        let mut s = phien();
        let ra = s.apply(&vao("bot"), 0, true);
        assert_eq!(ra[0].ao, Some(true));
        assert_eq!(s.view(5).recent_feed[0].ao, Some(true));

        let ra = s.apply(&vao("an"), 1, false);
        assert_eq!(ra[0].ao, None, "người thật thì không gắn cờ");
    }

    #[test]
    fn view_khop_hinh_dang_hop_dong_ben_client() {
        let mut s = phien();
        s.apply(&vao("an"), 1_000, false);
        let j = serde_json::to_value(s.view(5)).unwrap();
        for k in [
            "designId",
            "startedAt",
            "totals",
            "topGivers",
            "seats",
            "recentUsers",
            "recentFeed",
        ] {
            assert!(j.get(k).is_some(), "thiếu khoá {k}");
        }
        assert_eq!(j["totals"]["viewers"], serde_json::json!(1));
    }
}
