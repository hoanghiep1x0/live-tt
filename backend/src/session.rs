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
/// Ghế được ngồi nhiều hơn số người xem thật ngần này thì bắt đầu nhả bớt.
/// Chừa một ít: TikTok báo số người xem trễ vài giây so với tin "vào phòng".
const GHE_HON_NGUOI_XEM: usize = 2;
pub const GHE_VANG_MS: i64 = 10 * 60 * 1000;
pub const GHE_VANG_TANG_QUA_MS: i64 = 30 * 60 * 1000;

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Totals {
    /// Số người ĐANG xem (TikTok `total`).
    pub viewers: u64,
    /// Tổng lượt xem cả buổi live (TikTok `totalUser`): mọi người đã ghé, kể cả
    /// đã rời. Chỉ tăng. Bản chụp phiên cũ chưa có thì là 0.
    #[serde(default)]
    pub views: u64,
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
    /// Câu MC nói VỚI KHÁCH (chào người mới vào, đáp bình luận). Sân khấu đọc
    /// chồng lên lời kể, nhỏ tiếng hơn, để khách không phải chờ hết đoạn; lúc
    /// không kể thì đọc bình thường.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub khach: Option<bool>,
    /// Câu MC này là lời KỂ đoạn thứ mấy của truyện (đếm từ 0, `ke_truyen.rs`).
    /// Module Kể chuyện bắt nó để chuyển đoạn và hiện lời kể làm phụ đề.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ke: Option<u32>,
    /// Câu MC thuộc MẠCH TRUYỆN (lời kể, câu mở truyện): sân khấu đọc nó trước
    /// mọi lời chào, chào đang dài thì nhường. Chào hỏi để trống.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub truyen: Option<bool>,
    /// Lệnh khách gõ trong bình luận, đã đọc và áp (`lenh.rs`). Chỉ có ở mục
    /// `comment` là lệnh.
    #[serde(skip_serializing_if = "Option::is_none", skip_deserializing)]
    pub lenh: Option<crate::lenh::Lenh>,
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
            ke: None,
            truyen: None,
            khach: None,
            lenh: None,
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
    /// Điểm quy đổi từ quà của riêng người này.
    xu: i64,
    so_binh_luan: u32,
    so_tim: u64,
    /// Nhân vật do máy dựng. Không được chen vào bảng vinh danh: bảng đó để
    /// cảm ơn người xem thật.
    ao: bool,
}

/// Điểm tương tác để xếp bồ đoàn top: quà nặng nhất, rồi bình luận, rồi tim.
/// Nguyên công thức `interactScore` của bản cũ. Hàm thuần.
fn diem_tuong_tac(xu: i64, binh_luan: u32, tim: u64) -> i64 {
    xu.saturating_mul(10)
        .saturating_add(i64::from(binh_luan).saturating_mul(20))
        .saturating_add(i64::try_from(tim).unwrap_or(i64::MAX))
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
    /// Bảng vinh danh theo tương tác — xem `Session::top_tuong_tac`.
    #[serde(rename = "topTuongTac")]
    pub top_tuong_tac: Vec<Giver>,
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
    /// Sơ đồ hàng ghế thiết kế khai (`seatRows`). Không khai thì phòng không có
    /// mã ghế, và các lệnh "ghế B4", "chỗ…", "đánh…" không được đọc.
    so_do: Option<crate::lenh::SoDoGhe>,
    /// Mốc giờ gần nhất phiên được biết (tin vừa tới, hay nhịp thu hồi ghế).
    /// `view()` không nhận giờ từ ngoài, mà bảng vinh danh theo tương tác thì
    /// cần biết ai còn trong phòng — nên phiên tự giữ lấy mốc này.
    luc_nay: i64,
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
            so_do: None,
            luc_nay: now,
        }
    }

    /// Thiết kế có khai sơ đồ hàng ghế: bật các lệnh dùng mã ghế.
    pub fn dat_so_do(&mut self, hang: Vec<usize>, sau: usize) {
        if hang.is_empty() && sau == 0 {
            return;
        }
        let sau = if sau == 0 { hang.last().copied().unwrap_or(1) } else { sau };
        self.so_do = Some(crate::lenh::SoDoGhe { hang, sau, tong: self.ghe.len() });
    }

    /// Áp lệnh trong một bình luận của `user`. `None`: không phải lệnh, hoặc
    /// lệnh cần mã ghế mà phòng không có sơ đồ ghế.
    fn ap_lenh(&mut self, user: &str, chu: &str) -> Option<crate::lenh::Lenh> {
        use crate::lenh::{Lenh, LenhTho};
        match crate::lenh::doc(chu)? {
            LenhTho::Gui(chu) => Some(Lenh::Gui { chu }),
            LenhTho::Nhay => Some(Lenh::Nhay),
            LenhTho::Ghe(ma) => {
                let i = self.so_do.as_ref()?.chi_so(&ma);
                let Some(i) = i else {
                    return Some(Lenh::Ghe { ma, i: None, ok: false, ly_do: Some("phòng không có ghế này".into()) });
                };
                if self.ghe[i].as_deref().is_some_and(|u| u != user) {
                    return Some(Lenh::Ghe { ma, i: Some(i), ok: false, ly_do: Some("ghế đã có người".into()) });
                }
                self.tra_ghe(user);
                self.ghe[i] = Some(user.to_string());
                self.ghe_cua.insert(user.to_string(), i);
                Some(Lenh::Ghe { ma, i: Some(i), ok: true, ly_do: None })
            }
            LenhTho::Cho(ma) => {
                let so_do = self.so_do.as_ref()?;
                let i = if ma.is_empty() {
                    self.ghe_cua.get(user).copied()
                } else if ma.chars().all(|c| c.is_ascii_digit()) {
                    ma.parse::<usize>().ok().filter(|n| (1..=so_do.tong).contains(n)).map(|n| n - 1)
                } else {
                    so_do.chi_so(&ma)
                };
                let ma = i.and_then(|i| so_do.ma(i)).unwrap_or(ma);
                Some(Lenh::Cho { ma, i })
            }
            LenhTho::Treu(dich) => {
                let so_do = self.so_do.as_ref()?;
                let tu = self.ghe_cua.get(user).copied();
                // Đích là mã ghế, hoặc tên một người đang ngồi (khớp không dấu).
                let den = so_do.chi_so(&dich).or_else(|| {
                    let can = crate::lenh::bo_dau(dich.trim());
                    self.ghe_cua
                        .iter()
                        .filter(|(u, _)| u.as_str() != user)
                        .find(|(u, _)| {
                            self.viewers
                                .get(*u)
                                .is_some_and(|v| crate::lenh::bo_dau(&v.name).starts_with(&can))
                        })
                        .map(|(_, i)| *i)
                });
                Some(Lenh::Treu { dich, tu, den })
            }
        }
    }

    pub fn started_at(&self) -> i64 {
        self.started_at
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

    /// Nhận tổng lượt xem từ nguồn. Lấy `max`: con số này chỉ tăng, tin đến
    /// lệch thứ tự không được kéo nó lùi.
    pub fn dat_luot_xem(&mut self, n: u64) {
        self.totals.views = self.totals.views.max(n);
    }

    /// Buổi live kết thúc: trả hết ghế, xoá danh sách khách, số người xem về 0.
    ///
    /// TikTok KHÔNG BAO GIỜ gửi tin "rời phòng" — bản cũ cũng vậy
    /// (`mapMember` ở `D:\Live\client\src\lib\tiktokMap.ts` luôn trả `join`),
    /// nên bình thường ghế chỉ được trả khi người ta im quá 10 phút
    /// (`thu_hoi_ghe`). Nhưng live tắt thì cả phòng đã ra hết cùng lúc: ngồi
    /// chờ mười phút nữa là rạp còn đầy chibi và 👥 treo ở số cũ, nhìn vào
    /// tưởng phòng vẫn đông. Giữ lại tổng của buổi (tim, quà, điểm) và sổ quà
    /// — đó là thành tích của buổi, không phải người đang ngồi.
    ///
    /// Chỉ người xem THẬT rời đi. Nhân vật minh hoạ (`ao`) ở lại: họ do máy
    /// dựng, không ở trong phòng TikTok nào — mất nguồn là lúc máy chủ tự bật
    /// họ (`ai::canh_mat_nguon`), cầu nối báo "offline" mỗi phút mà dọn cả họ
    /// là đám đông minh hoạ biến mất mỗi phút.
    pub fn don_phong(&mut self) -> bool {
        let that: Vec<String> = self.viewers.iter().filter(|(_, v)| !v.ao).map(|(u, _)| u.clone()).collect();
        if that.is_empty() && self.nguoi_xem_ngoai.is_none() {
            return false;
        }
        for u in &that {
            self.viewers.remove(u);
            if let Some(i) = self.ghe_cua.remove(u) {
                if let Some(o) = self.ghe.get_mut(i) {
                    *o = None;
                }
            }
        }
        self.gan_day.retain(|u| self.viewers.contains_key(u));
        self.nguoi_xem_ngoai = None;
        self.totals.viewers = 0;
        self.cap_nhat_nguoi_xem();
        true
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
                xu: 0,
                so_binh_luan: 0,
                so_tim: 0,
                ao: false,
            });
        // Người đổi tên hiển thị giữa phiên là chuyện thường; theo tên mới nhất.
        v.name = ev.who.name.clone();
        if ev.who.avatar.is_some() {
            v.avatar = ev.who.avatar.clone();
        }
        v.last_at = now;
        self.luc_nay = self.luc_nay.max(now);
        if moi {
            self.gan_day.push_back(ev.who.user.clone());
            while self.gan_day.len() > NGUOI_GIU {
                self.gan_day.pop_front();
            }
        }
        moi
    }

    /// Xếp chỗ cho một người. Trả chỉ số ghế, hoặc `None` khi phòng đã kín.
    ///
    /// Chọn NGẪU NHIÊN trong các ghế còn trống, không lấp lần lượt từ đầu:
    /// lấp theo thứ tự thì rạp đầy dần thành một khối vuông vắn từ hàng A,
    /// nhìn là biết máy xếp. Rải ngẫu nhiên trông như người tự tìm chỗ ngồi.
    fn xep_ghe(&mut self, user: &str) -> Option<usize> {
        if let Some(i) = self.ghe_cua.get(user) {
            return Some(*i);
        }
        let trong: Vec<usize> =
            self.ghe.iter().enumerate().filter(|(_, g)| g.is_none()).map(|(i, _)| i).collect();
        // Bốc theo tên người: cùng một người vào lại cùng phiên thì về đúng
        // chỗ cũ, và hai cửa sổ cùng phòng xếp giống nhau (không dùng đồng hồ).
        let mut h: u64 = 1_469_598_103_934_665_603;
        for b in user.as_bytes().iter().chain(self.started_at.to_le_bytes().iter()) {
            h = (h ^ u64::from(*b)).wrapping_mul(1_099_511_628_211);
        }
        let i = *trong.get((h % trong.len().max(1) as u64) as usize)?;
        self.ghe[i] = Some(user.to_string());
        self.ghe_cua.insert(user.to_string(), i);
        Some(i)
    }

    fn tra_ghe(&mut self, user: &str) {
        if let Some(i) = self.ghe_cua.remove(user) {
            self.ghe[i] = None;
        }
    }

    /// Nhả bớt ghế khi số người ngồi vượt quá số người xem THẬT của phòng.
    ///
    /// TikTok gửi tin "vào phòng" cho từng người nhưng gần như không gửi tin
    /// "rời phòng", nên ghế cứ dồn lại: phòng hai người xem mà rạp hai chục
    /// ghế có người, nhìn là biết đếm sai. Nhả người ngồi lâu mà im nhất
    /// trước — ai vừa bình luận hay vừa tặng quà thì giữ.
    fn nha_ghe_du(&mut self) {
        let Some(that) = self.nguoi_xem_ngoai else { return };
        let toi_da = that as usize + GHE_HON_NGUOI_XEM;
        if self.ghe_cua.len() <= toi_da {
            return;
        }
        let mut ds: Vec<(String, i64, bool)> = self
            .ghe_cua
            .keys()
            .map(|u| {
                let v = self.viewers.get(u);
                (u.clone(), v.map_or(i64::MIN, |v| v.last_at), v.is_some_and(|v| v.da_tang))
            })
            .collect();
        // Người tặng quà xếp cuối (giữ lại lâu nhất), rồi tới người vừa có
        // hoạt động gần đây.
        ds.sort_by_key(|(_, luc, tang)| (*tang, *luc));
        for (u, _, _) in ds.into_iter().take(self.ghe_cua.len() - toi_da) {
            self.tra_ghe(&u);
            self.viewers.remove(&u);
        }
    }

    /// Vắng quá lâu thì trả ghế, để người đang xem có chỗ.
    /// Trả về số ghế vừa thu hồi.
    pub fn thu_hoi_ghe(&mut self, now: i64) -> usize {
        self.luc_nay = self.luc_nay.max(now);
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
        // Ghế nhiều hơn người xem thật: nhả bớt ngay, không chờ hết hạn vắng.
        self.nha_ghe_du();
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
        if ao {
            if let Some(v) = self.viewers.get_mut(&ev.who.user) {
                v.ao = true;
            }
        }
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
                if let Some(v) = self.viewers.get_mut(&user) {
                    v.so_binh_luan = v.so_binh_luan.saturating_add(1);
                }
                // Bình luận cũng là có mặt: người gõ chữ thì được giữ chỗ.
                self.xep_ghe(&user);
                let mut it = FeedItem::moi(id, now, "comment", &name, text.clone());
                it.lenh = self.ap_lenh(&user, text);
                it
            }
            Payload::Like { count, total } => {
                // Có tổng của TikTok thì DÙNG TỔNG (không cộng thêm `count` —
                // `count` đã nằm trong tổng rồi, cộng nữa là đếm hai lần và số
                // tim vọt lên cao hơn thật). Không có tổng mới cộng dồn. Tổng
                // không bao giờ lùi nên lấy max. Đúng như bản cũ.
                self.totals.likes = match total {
                    Some(t) => self.totals.likes.max(*t),
                    None => self.totals.likes.saturating_add(u64::from(*count)),
                };
                if let Some(v) = self.viewers.get_mut(&ev.who.user) {
                    v.so_tim = v.so_tim.saturating_add(u64::from(*count));
                }
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
                    v.xu = v.xu.saturating_add(xu);
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
    pub fn mc_noi(
        &mut self,
        now: i64,
        text: String,
        voice: Option<String>,
        ke: Option<u32>,
        truyen: bool,
        khach: bool,
    ) -> FeedItem {
        let id = self.id_moi();
        let mut item = FeedItem::moi(id, now, "host", "MC", text);
        item.voice = voice;
        item.ke = ke;
        item.truyen = (truyen || ke.is_some()).then_some(true);
        item.khach = khach.then_some(true);
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

    /// Bảng vinh danh theo TƯƠNG TÁC, không chỉ theo quà.
    ///
    /// Phòng mới mở chưa ai tặng quà thì bảng `top_givers` rỗng, năm bồ đoàn
    /// trống trơ ra — người xem nhìn vào tưởng phòng vắng. Bản cũ
    /// (`topInteract`) lấp bằng người đang trong phòng, nên lúc nào cũng có
    /// ảnh thật trên bồ đoàn. Chuyển nguyên cách xếp đó:
    ///
    /// - chỉ người xem thật còn trong phòng (vắng quá 10 phút thì nhường chỗ;
    ///   ai đã tặng quà được giữ 30 phút như giữ ghế),
    /// - người tặng quà luôn đứng trên người chỉ bình luận / thả tim, rồi mới
    ///   xét điểm tương tác,
    /// - còn chỗ thì lấp bằng người chưa tương tác gì, ai có ảnh đứng trước.
    ///
    /// `coins` lấy từ sổ quà nếu người đó từng tặng, không thì 0.
    pub fn top_tuong_tac(&self, n: usize, now: i64) -> Vec<Giver> {
        let mut co_mat: Vec<(&String, &Viewer, i64)> = self
            .viewers
            .iter()
            .filter(|(_, v)| !v.ao)
            .filter(|(_, v)| {
                let han = if v.xu > 0 {
                    GHE_VANG_TANG_QUA_MS
                } else {
                    GHE_VANG_MS
                };
                now - v.last_at < han
            })
            .map(|(u, v)| (u, v, diem_tuong_tac(v.xu, v.so_binh_luan, v.so_tim)))
            .collect();
        // Xếp một lần cho cả hai nhóm: ai có tương tác đứng trước ai chưa có,
        // trong nhóm có tương tác thì người tặng quà trước. Hoà hết thì lấy
        // nick làm chốt, để bảng không nhảy chỗ mỗi lần vẽ lại.
        co_mat.sort_by(|(ua, a, da), (ub, b, db)| {
            (*db > 0)
                .cmp(&(*da > 0))
                .then_with(|| (b.xu > 0).cmp(&(a.xu > 0)))
                .then_with(|| b.xu.cmp(&a.xu))
                .then_with(|| db.cmp(da))
                // Nhóm chưa tương tác: ai có ảnh đứng trước, rồi ai mới vào.
                .then_with(|| b.avatar.is_some().cmp(&a.avatar.is_some()))
                .then_with(|| b.last_at.cmp(&a.last_at))
                .then_with(|| ua.cmp(ub))
        });
        co_mat
            .into_iter()
            .take(n)
            .map(|(u, v, _)| Giver {
                user: u.clone(),
                name: v.name.clone(),
                xu: v.xu,
                coins: self.givers.get(u).map_or(0, |g| g.coins),
                avatar: v.avatar.clone(),
            })
            .collect()
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
            top_tuong_tac: self.top_tuong_tac(5, self.luc_nay),
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

    fn noi(u: &str, chu: &str) -> LiveEvent {
        LiveEvent {
            who: crate::events::EventUser { user: u.into(), name: u.into(), avatar: None },
            what: Payload::Comment { text: chu.into() },
        }
    }

    fn phong_co_so_do() -> Session {
        let mut s = Session::new("ke-chuyen", 84, 1.0, 0);
        s.dat_so_do(vec![8, 10, 12, 12, 14, 14], 14);
        s
    }

    #[test]
    fn go_ghe_b4_la_doi_sang_ghe_do() {
        use crate::lenh::Lenh;
        let mut s = phong_co_so_do();
        let it = s.apply(&noi("lan", "ghế B4"), 1, false);
        assert_eq!(it[0].lenh, Some(Lenh::Ghe { ma: "B4".into(), i: Some(11), ok: true, ly_do: None }));
        assert_eq!(s.seats().iter().find(|x| x.user == "lan").map(|x| x.i), Some(11));
        // Người khác xin đúng ghế đó: không được.
        let it = s.apply(&noi("minh", "ghe b4"), 2, false);
        assert!(matches!(&it[0].lenh, Some(Lenh::Ghe { ok: false, .. })));
    }

    #[test]
    fn cho_cua_toi_va_danh_yeu_tra_dung_ghe() {
        use crate::lenh::Lenh;
        let mut s = phong_co_so_do();
        s.apply(&noi("lan", "ghế A1"), 1, false);
        s.apply(&noi("Minh", "ghế C2"), 2, false);
        let it = s.apply(&noi("lan", "chỗ của tôi"), 3, false);
        assert_eq!(it[0].lenh, Some(Lenh::Cho { ma: "A1".into(), i: Some(0) }));
        let it = s.apply(&noi("lan", "đánh Minh"), 4, false);
        assert_eq!(it[0].lenh, Some(Lenh::Treu { dich: "Minh".into(), tu: Some(0), den: Some(19) }));
    }

    #[test]
    fn phong_khong_khai_so_do_ghe_thi_khong_doc_lenh_ghe() {
        let mut s = Session::new("san-bar", 84, 1.0, 0);
        let it = s.apply(&noi("lan", "ghế B4"), 1, false);
        assert_eq!(it[0].lenh, None);
        // Lệnh không cần ghế vẫn đọc: phòng có dải chữ / sàn nhảy thì dùng.
        let it = s.apply(&noi("lan", "nhảy"), 2, false);
        assert_eq!(it[0].lenh, Some(crate::lenh::Lenh::Nhay));
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
    fn ghe_khong_duoc_nhieu_hon_so_nguoi_xem_that() {
        let mut s = Session::new("ke-chuyen", 84, 1.0, 1_000);
        for i in 0..20 {
            s.apply(&vao(&format!("u{i}")), 1_000 + i64::from(i), false);
        }
        assert_eq!(s.seats().len(), 20, "ai vào cũng có ghế");
        // Nguồn báo phòng chỉ còn 3 người xem: nhả bớt ngay, chừa 2 ghế đệm —
        // không chờ hết hạn vắng, nếu không rạp đầy chibi của người đã ra.
        s.dat_nguoi_xem(3);
        s.thu_hoi_ghe(2_000);
        assert_eq!(s.seats().len(), 5, "3 người xem + 2 ghế đệm");
        assert_eq!(s.totals().viewers, 3, "số người xem lấy theo nguồn");
        // Người xem tăng lại thì không nhả thêm ghế nào.
        s.dat_nguoi_xem(50);
        s.thu_hoi_ghe(2_100);
        assert_eq!(s.seats().len(), 5);
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

        // Tin có tổng thì LẤY TỔNG, không cộng thêm `count` — `count` đã nằm
        // trong tổng rồi. Cộng nữa là số tim vọt lên cao hơn thật.
        s.apply(
            &LiveEvent::new("a", "A", P::Like { count: 3, total: Some(903) }),
            0,
            false,
        );
        assert_eq!(s.totals().likes, 903, "theo đúng tổng của TikTok");

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
        assert_eq!(s.totals().likes, 903);
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
        let it = s.mc_noi(2_000, "Chào An nha".into(), Some("vieneu:mai".into()), None, false, true);
        assert_eq!(it.khach, Some(true));
        assert_eq!(it.truyen, None, "lời chào không thuộc mạch truyện");
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
    fn live_tat_thi_don_sach_rap_va_so_nguoi_xem_ve_khong() {
        let mut s = phien();
        s.apply(&vao("an"), 1_000, false);
        s.apply(&vao("binh"), 1_000, false);
        s.dat_nguoi_xem(12);
        assert_eq!(s.seats().len(), 2);
        assert_eq!(s.totals().viewers, 12);

        assert!(s.don_phong(), "có người thì dọn là có đổi");
        assert!(s.seats().is_empty(), "ghế phải trống hết");
        assert_eq!(s.totals().viewers, 0);
        assert!(s.top_tuong_tac(5, 1_000).is_empty());
        assert!(!s.don_phong(), "dọn phòng đã trống thì không báo đổi");
    }

    #[test]
    fn don_phong_chi_tien_nguoi_that_nhan_vat_minh_hoa_o_lai() {
        let mut s = phien();
        s.apply(&LiveEvent::new("an", "An", P::Join), 1_000, false);
        s.apply(&LiveEvent::new("mh0001", "Bé Na", P::Join), 1_000, true);
        assert!(s.don_phong());
        let ghe: Vec<String> = s.seats().into_iter().map(|x| x.user).collect();
        assert_eq!(ghe, vec!["mh0001".to_string()], "nhân vật minh hoạ vẫn ngồi");
        // Báo "offline" lần nữa (cầu nối báo mỗi phút): không còn ai thật để dọn.
        assert!(!s.don_phong());
    }

    #[test]
    fn don_phong_giu_lai_thanh_tich_cua_buoi() {
        let mut s = phien();
        s.apply(
            &LiveEvent::new(
                "an",
                "An",
                P::Gift {
                    gift: "Rose".into(),
                    count: 2,
                    xu_each: 5,
                },
            ),
            1_000,
            false,
        );
        let xu = s.totals().xu;
        s.don_phong();
        assert_eq!(s.totals().xu, xu, "quà của buổi không bị xoá");
        assert_eq!(s.top_givers(5).len(), 1, "sổ quà của buổi vẫn còn");
    }

    #[test]
    fn bo_doan_top_lap_bang_nguoi_trong_phong_khi_chua_ai_tang_qua() {
        // Chuyện hay gặp nhất: phòng vừa mở, có người xem mà chưa ai tặng quà.
        // Bảng quà rỗng, nhưng bảng tương tác phải có người — để năm bồ đoàn
        // hiện ảnh thật chứ không trơ ra như phòng vắng.
        let mut s = phien();
        s.apply(&vao("an"), 1_000, false);
        s.apply(&vao("binh"), 1_100, false);
        assert!(s.top_givers(5).is_empty(), "chưa ai tặng quà");
        let t = s.top_tuong_tac(5, 1_200);
        assert_eq!(t.len(), 2);
        assert!(t.iter().all(|g| g.xu == 0));
    }

    #[test]
    fn bo_doan_top_xep_nguoi_tang_qua_tren_nguoi_chi_binh_luan() {
        let mut s = phien();
        s.apply(&vao("an"), 1_000, false);
        for i in 0..5 {
            s.apply(&noi("an", "hay quá"), 1_010 + i, false);
        }
        s.apply(&vao("binh"), 1_020, false);
        s.apply(
            &LiveEvent::new(
                "binh",
                "Bình",
                P::Gift {
                    gift: "Rose".into(),
                    count: 1,
                    xu_each: 1,
                },
            ),
            1_030,
            false,
        );
        let t = s.top_tuong_tac(5, 1_100);
        assert_eq!(
            t.iter().map(|g| g.user.as_str()).collect::<Vec<_>>(),
            vec!["binh", "an"],
            "một món quà vẫn đứng trên năm bình luận"
        );
    }

    #[test]
    fn bo_doan_top_bo_nhan_vat_ao_va_nguoi_vang_lau() {
        let mut s = phien();
        s.apply(&vao("bot"), 1_000, true);
        s.apply(&vao("an"), 1_000, false);
        s.apply(&vao("cu"), 1_000, false);
        let t = s.top_tuong_tac(5, 1_000);
        assert_eq!(t.len(), 2, "nhân vật ảo không được lên bảng vinh danh");

        // "cu" im từ đầu, quá hạn vắng thì nhường chỗ.
        s.apply(&noi("an", "còn đây"), 1_000 + GHE_VANG_MS, false);
        let t = s.top_tuong_tac(5, 1_000 + GHE_VANG_MS);
        assert_eq!(
            t.iter().map(|g| g.user.as_str()).collect::<Vec<_>>(),
            vec!["an"]
        );
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
            "topTuongTac",
            "seats",
            "recentUsers",
            "recentFeed",
        ] {
            assert!(j.get(k).is_some(), "thiếu khoá {k}");
        }
        assert_eq!(j["totals"]["viewers"], serde_json::json!(1));
    }
}
