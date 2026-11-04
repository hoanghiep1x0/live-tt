//! Nguồn giả lập.
//!
//! Để dựng phòng, chỉnh bố cục và thử tính năng khi chưa lên sóng thật. Không
//! giả vờ là TikTok: mọi mục nó sinh ra đều có cờ `virtual`, nên module cảm ơn
//! quà và bot chào hỏi bỏ qua đúng như với nhân vật ảo.
//!
//! Lõi sinh sự kiện là hàm thuần có `rand` tiêm vào, nên test chạy lại cho cùng
//! một kết quả.

use std::sync::Arc;
use std::time::Duration;

use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};

use crate::events::{EventUser, LiveEvent, Payload};
use crate::source::SourceCfg;
use crate::state::AppState;

const HO: &[&str] = &[
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ",
    "Ngô", "Dương", "Lý",
];
const TEN: &[&str] = &[
    "An", "Bình", "Chi", "Dung", "Giang", "Hà", "Hạnh", "Hùng", "Khánh", "Lan", "Linh", "Mai",
    "Minh", "Nam", "Ngọc", "Như", "Phúc", "Quân", "Sơn", "Thảo", "Thu", "Trang", "Tuấn", "Vy",
    "Yến",
];

/// Quà và xu của nó, lấy theo bộ quà của bản cũ.
const QUA: &[(&str, i64)] = &[
    ("Tim", 1),
    ("Hoa hồng", 1),
    ("Hoa sen", 10),
    ("Đèn lồng", 99),
    ("Tích phước", 199),
    ("Rương vàng", 500),
];

const CAU: &[&str] = &[
    "chào cả phòng",
    "nghe hay quá",
    "kể tiếp đi ạ",
    "mình mới vào",
    "giọng đọc dễ nghe ghê",
    "chuyện này mình nghe hồi bé rồi",
    "thả tim cho phòng nào",
    "ôm",
    "nhảy",
    "ai ở Hà Nội không",
    "hay quá ạ",
    "cho xin tên truyện với",
];

pub struct GiaLap {
    rng: StdRng,
    /// Người đã vào phòng. Bình luận, tim, quà lấy từ đây để cùng một người
    /// xuất hiện nhiều lần — có vậy ghế mới đầy và bảng top mới dồn lên.
    trong_phong: Vec<EventUser>,
    dem: u64,
}

impl GiaLap {
    pub fn new(seed: u64) -> Self {
        Self { rng: StdRng::seed_from_u64(seed), trong_phong: Vec::new(), dem: 0 }
    }

    fn nguoi_moi(&mut self) -> EventUser {
        self.dem += 1;
        let ho = HO[self.rng.gen_range(0..HO.len())];
        let ten = TEN[self.rng.gen_range(0..TEN.len())];
        EventUser {
            user: format!("ao{:04}", self.dem),
            name: format!("{ho} {ten}"),
            avatar: None,
        }
    }

    fn ai_do(&mut self) -> EventUser {
        if self.trong_phong.is_empty() {
            let n = self.nguoi_moi();
            self.trong_phong.push(n.clone());
            return n;
        }
        let i = self.rng.gen_range(0..self.trong_phong.len());
        self.trong_phong[i].clone()
    }

    /// Một sự kiện kế tiếp. Phòng còn thưa thì ưu tiên người vào, cho ghế đầy
    /// nhanh; đông rồi thì chủ yếu là bình luận và tim.
    pub fn buoc(&mut self) -> LiveEvent {
        let thua = self.trong_phong.len() < 12;
        let r: u32 = self.rng.gen_range(0..100);

        let vao = if thua { r < 55 } else { r < 12 };
        if vao {
            let n = self.nguoi_moi();
            self.trong_phong.push(n.clone());
            return LiveEvent { who: n, what: Payload::Join };
        }

        let who = self.ai_do();
        let what = if r < 40 {
            Payload::Comment { text: CAU[self.rng.gen_range(0..CAU.len())].to_string() }
        } else if r < 70 {
            Payload::Like { count: self.rng.gen_range(1..=15), total: None }
        } else if r < 88 {
            let (ten, xu) = QUA[self.rng.gen_range(0..QUA.len())];
            Payload::Gift {
                gift: ten.to_string(),
                count: self.rng.gen_range(1..=5),
                xu_each: xu,
            }
        } else if r < 94 {
            Payload::Follow
        } else if r < 97 {
            Payload::Share
        } else {
            // Người rời phòng: TikTok không gửi sự kiện này, chỉ giả lập mới có.
            // Giữ lại để thử được việc trả ghế.
            if self.trong_phong.len() > 8 {
                let i = self.rng.gen_range(0..self.trong_phong.len());
                let ra = self.trong_phong.remove(i);
                return LiveEvent { who: ra, what: Payload::Leave };
            }
            Payload::Like { count: 1, total: None }
        };

        LiveEvent { who, what }
    }
}

pub async fn chay(st: Arc<AppState>, cfg: SourceCfg, the_he: u64) {
    // Nhịp quá dày thì phòng thành bão tin, quá thưa thì ngồi chờ mỏi mắt.
    let nhip = cfg.nhip.clamp(50, 10_000);
    let mut g = GiaLap::new(st.seed_gia_lap());
    let mut dong_ho = tokio::time::interval(Duration::from_millis(nhip));
    tracing::info!(nhip, "mở nguồn giả lập");

    loop {
        dong_ho.tick().await;
        if st.the_he_nguon() != the_he {
            tracing::info!("nguồn giả lập dừng: đã đổi nguồn");
            return;
        }
        if st.live().is_none() {
            // Chưa phát phòng nào thì không sinh gì, nhưng vẫn giữ tác vụ sống:
            // người dùng bật phát là có sự kiện ngay, không phải mở lại nguồn.
            continue;
        }
        st.ap_su_kien(g.buoc(), true);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn cung_seed_thi_cung_ket_qua() {
        let mut a = GiaLap::new(7);
        let mut b = GiaLap::new(7);
        for _ in 0..50 {
            assert_eq!(a.buoc(), b.buoc());
        }
    }

    #[test]
    fn seed_khac_thi_khac_nhau() {
        let mut a = GiaLap::new(1);
        let mut b = GiaLap::new(2);
        let ra: Vec<_> = (0..30).map(|_| a.buoc()).collect();
        let rb: Vec<_> = (0..30).map(|_| b.buoc()).collect();
        assert_ne!(ra, rb);
    }

    #[test]
    fn luc_dau_chu_yeu_la_nguoi_vao_phong() {
        let mut g = GiaLap::new(3);
        let vao = (0..12).filter(|_| matches!(g.buoc().what, Payload::Join)).count();
        assert!(vao >= 4, "phòng thưa thì phải có người vào, thấy {vao}");
    }

    #[test]
    fn moi_nguoi_mot_nick_rieng() {
        let mut g = GiaLap::new(5);
        let mut nick = HashSet::new();
        for _ in 0..200 {
            let e = g.buoc();
            if matches!(e.what, Payload::Join) {
                assert!(nick.insert(e.who.user.clone()), "trùng nick: {}", e.who.user);
            }
        }
        assert!(nick.len() > 5);
    }

    #[test]
    fn sinh_du_cac_loai_su_kien() {
        let mut g = GiaLap::new(11);
        let mut thay = HashSet::new();
        for _ in 0..400 {
            thay.insert(g.buoc().kind());
        }
        for k in ["join", "comment", "like", "gift"] {
            assert!(thay.contains(k), "thiếu loại {k}; thấy {thay:?}");
        }
    }

    #[test]
    fn qua_luon_co_ten_va_xu_duong() {
        let mut g = GiaLap::new(13);
        for _ in 0..300 {
            if let Payload::Gift { gift, count, xu_each } = g.buoc().what {
                assert!(!gift.is_empty());
                assert!(count >= 1 && count <= 5);
                assert!(xu_each > 0);
            }
        }
    }

    #[test]
    fn nguoi_roi_phong_khong_duoc_nhac_lai() {
        let mut g = GiaLap::new(17);
        let mut da_ra: HashSet<String> = HashSet::new();
        for _ in 0..500 {
            let e = g.buoc();
            if matches!(e.what, Payload::Leave) {
                da_ra.insert(e.who.user.clone());
            } else if matches!(e.what, Payload::Join) {
                da_ra.remove(&e.who.user);
            } else {
                assert!(
                    !da_ra.contains(&e.who.user),
                    "người đã rời phòng vẫn còn hoạt động: {}",
                    e.who.user
                );
            }
        }
    }
}
