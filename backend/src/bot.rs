//! Nhân vật ảo — đám đông minh hoạ của phòng.
//!
//! Phòng vừa mở mà ghế trống trơn thì người thật ghé vào cũng đi ngay. Bộ này
//! giữ quanh `count` người ảo: họ vào dần, ngồi ghế, bình luận, thả tim; hạ số
//! xuống hay tắt hẳn thì họ **đi ra** dần chứ không biến mất một lúc.
//!
//! Hai điều cố ý:
//!
//! 1. **Nội dung là của thiết kế, không phải của đây.** Câu họ nói lấy từ
//!    `crowd.lines` trong `design.json` của phòng đang phát. Phòng kể chuyện thì
//!    "nghe hay quá", sàn bar thì "quẩy lên" — một bộ câu dùng chung cho mọi
//!    phòng là người xem nhận ra ngay. Thiết kế không khai `crowd.lines` thì bộ
//!    này đứng im, dù người vận hành có bật.
//! 2. **Sự kiện mang cờ `ao`.** Nhờ vậy module cảm ơn quà không cảm ơn người
//!    máy, bảng top không để họ chen lên, và chân màn ghi rõ phòng có nhân vật
//!    minh hoạ. Khác hẳn nguồn mẫu (`source/mau.rs`) — nguồn đó là cả một phòng
//!    giả để thử bố cục, sự kiện của nó KHÔNG mang cờ ảo.
//!
//! Họ **không** tặng quà. Quà là tiền thật của người thật; dựng một con số quà
//! không có thật lên bảng vinh danh là nói dối người xem, chứ không còn là
//! trang trí cho đỡ trống.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};
use serde::{Deserialize, Serialize};

use crate::events::{EventUser, LiveEvent, Payload};
use crate::state::AppState;

/// Nhiều hơn mức này thì ghế toàn người máy, phòng nhìn là biết giả.
pub const TOI_DA: u32 = 60;

/// Cơ hội (phần trăm) một nhịp có người ra khi đang thừa người. Nhịp 1,5 giây
/// nên trung bình chừng năm giây một người — mười hai người vãn trong khoảng
/// một phút, thay vì hai chục giây là hết sạch.
const PHAN_RA: u32 = 30;

/// Cơ hội (phần trăm) một nhịp có người nói, khi đã đủ người. Còn lại là thả
/// tim. Trung bình chừng mười giây một câu, như bản cũ.
const PHAN_LOI: u32 = 15;

/// Tắt bật và số lượng — phần người vận hành chỉnh. Lưu theo từng thiết kế.
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BotCfg {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "so_mac_dinh")]
    pub count: u32,
}

fn so_mac_dinh() -> u32 {
    12
}

impl Default for BotCfg {
    fn default() -> Self {
        // Mặc định TẮT. Dựng người xem giả mà người vận hành chưa bảo là tự ý
        // làm thay họ một việc có thể bị hiểu là lừa khán giả.
        Self {
            enabled: false,
            count: so_mac_dinh(),
        }
    }
}

impl BotCfg {
    /// Số người ảo cần giữ. Tắt là 0 — họ đi ra dần.
    pub fn muc_tieu(&self) -> usize {
        if self.enabled {
            self.count.min(TOI_DA) as usize
        } else {
            0
        }
    }
}

const HO: &[&str] = &[
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô",
    "Dương", "Lý",
];
const TEN: &[&str] = &[
    "An", "Bình", "Chi", "Dung", "Giang", "Hà", "Hạnh", "Hùng", "Khánh", "Lan", "Linh", "Mai",
    "Minh", "Nam", "Ngọc", "Như", "Phúc", "Quân", "Sơn", "Thảo", "Thu", "Trang", "Tuấn", "Vy",
    "Yến",
];

/// Lõi thuần: không chạm đồng hồ, không chạm mạng. Gieo cùng một hạt thì ra
/// cùng một chuỗi, nên test chạy lại cho cùng kết quả.
pub struct DamDong {
    rng: StdRng,
    trong_phong: Vec<EventUser>,
    dem: u64,
}

impl DamDong {
    pub fn new(seed: u64) -> Self {
        Self {
            rng: StdRng::seed_from_u64(seed),
            trong_phong: Vec::new(),
            dem: 0,
        }
    }

    pub fn so_nguoi(&self) -> usize {
        self.trong_phong.len()
    }

    fn nguoi_moi(&mut self, ten_rieng: &[String]) -> EventUser {
        self.dem += 1;
        let name = if ten_rieng.is_empty() {
            let ho = HO[self.rng.gen_range(0..HO.len())];
            let ten = TEN[self.rng.gen_range(0..TEN.len())];
            format!("{ho} {ten}")
        } else {
            ten_rieng[self.rng.gen_range(0..ten_rieng.len())].clone()
        };
        EventUser {
            // Tiền tố riêng, không đụng `ao####` của nguồn mẫu: nhìn feed là
            // biết ai do bộ này dựng.
            user: format!("mh{:04}", self.dem),
            name,
            avatar: None,
        }
    }

    /// Một bước. `lines` rỗng nghĩa là thiết kế không khai đám đông — đứng im.
    pub fn buoc(&mut self, muc_tieu: usize, lines: &[String], ten_rieng: &[String]) -> Option<LiveEvent> {
        if lines.is_empty() {
            return None;
        }

        if self.trong_phong.len() < muc_tieu {
            let n = self.nguoi_moi(ten_rieng);
            self.trong_phong.push(n.clone());
            return Some(LiveEvent {
                who: n,
                what: Payload::Join,
            });
        }

        // Ra THƯA, không ào một lượt: mỗi nhịp chỉ một phần cơ hội có người
        // đứng dậy, ai chưa đi thì vẫn ngồi thả tim, bình luận như thường. Bản
        // cũ cũng vậy — tắt nhân vật ảo là phòng vãn dần, không phải cả rạp
        // đồng loạt kéo nhau về.
        if self.trong_phong.len() > muc_tieu && self.rng.gen_range(0..100) < PHAN_RA {
            // Ra theo thứ tự vào: người ngồi lâu nhất nhường chỗ trước, nhìn tự
            // nhiên hơn là bốc ngẫu nhiên giữa phòng.
            let ra = self.trong_phong.remove(0);
            return Some(LiveEvent {
                who: ra,
                what: Payload::Leave,
            });
        }

        if self.trong_phong.is_empty() {
            return None;
        }

        let i = self.rng.gen_range(0..self.trong_phong.len());
        let who = self.trong_phong[i].clone();
        // Tim nhiều hơn lời: phòng thật cũng vậy, và lời thì dễ lặp hơn tim.
        // Bản cũ chỉ cho ~1/4 số nhịp 2,6 giây là lời — chừng mười giây một
        // câu, bóng chat có nhịp thong thả. Nhịp ở đây 1,5 giây nên lấy 15%.
        let what = if self.rng.gen_range(0..100) < PHAN_LOI {
            Payload::Comment {
                text: lines[self.rng.gen_range(0..lines.len())].clone(),
            }
        } else {
            Payload::Like {
                count: self.rng.gen_range(1..=5),
                total: None,
            }
        };
        Some(LiveEvent { who, what })
    }

    /// Đổi phòng thì quên hết: người của phòng cũ không được mang sang phòng mới.
    pub fn quen_het(&mut self) {
        self.trong_phong.clear();
    }
}

/// Nhịp sinh sự kiện. Đủ thưa để nhìn như người thật gõ, đủ dày để 12 người vào
/// hết trong khoảng hai chục giây.
const NHIP_MS: u64 = 1_500;

pub async fn chay(st: Arc<AppState>) {
    let mut dam = DamDong::new(st.seed_gia_lap() ^ 0x6d68);
    // Nhớ cả phòng LẪN mốc mở phiên. Chỉ nhớ phòng là hỏng: người vận hành ngắt
    // rồi phát lại cùng một phòng thì phiên mới trắng tinh, mà bộ này vẫn tưởng
    // tám người của mình còn ngồi trong đó nên không cho ai vào nữa — ghế trống
    // mà công tắc gạt kiểu gì cũng không ra người.
    let mut phong_cu: Option<(String, i64)> = None;
    let mut dong_ho = tokio::time::interval(Duration::from_millis(NHIP_MS));

    loop {
        dong_ho.tick().await;
        let (Some(id), Some(moc)) = (st.live(), st.phien_bat_dau()) else {
            phong_cu = None;
            dam.quen_het();
            continue;
        };
        if phong_cu.as_ref().map(|(p, m)| (p.as_str(), *m)) != Some((id.as_str(), moc)) {
            phong_cu = Some((id.clone(), moc));
            dam.quen_het();
        }

        let cfg = st.bot_config(&id);
        let (lines, ten_rieng) = st.crowd_cua(&id);
        if let Some(ev) = dam.buoc(cfg.muc_tieu(), &lines, &ten_rieng) {
            st.ap_su_kien(ev, true);
        }
    }
}

/// Nhân vật ảo của các phòng đang XEM THỬ. Mỗi phòng một đám đông riêng, nhớ
/// theo mốc mở phiên y như phòng đang phát: phiên xem thử dựng lại (thôi phát
/// rồi về xem thử) là ghế trống, phải cho người vào lại từ đầu.
pub async fn chay_xem_thu(st: Arc<AppState>) {
    let mut cac: HashMap<String, (i64, DamDong)> = HashMap::new();
    let mut hat = st.seed_gia_lap() ^ 0x7874;
    let mut dong_ho = tokio::time::interval(Duration::from_millis(NHIP_MS));

    loop {
        dong_ho.tick().await;
        let ds = st.cac_xem_thu();
        cac.retain(|id, _| ds.iter().any(|(k, _)| k == id));
        for (id, moc) in ds {
            let (m, dam) = cac.entry(id.clone()).or_insert_with(|| {
                hat = hat.wrapping_add(1);
                (moc, DamDong::new(hat))
            });
            if *m != moc {
                *m = moc;
                dam.quen_het();
            }
            let cfg = st.bot_config(&id);
            let (lines, ten_rieng) = st.crowd_cua(&id);
            if let Some(ev) = dam.buoc(cfg.muc_tieu(), &lines, &ten_rieng) {
                st.ap_su_kien_xem_thu(&id, ev, true);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cau() -> Vec<String> {
        vec!["nghe hay quá".into(), "kể tiếp đi ạ".into()]
    }

    #[test]
    fn tat_thi_muc_tieu_la_khong() {
        let c = BotCfg {
            enabled: false,
            count: 20,
        };
        assert_eq!(c.muc_tieu(), 0);
    }

    #[test]
    fn so_qua_lon_bi_keo_ve_tran() {
        let c = BotCfg {
            enabled: true,
            count: 1000,
        };
        assert_eq!(c.muc_tieu(), TOI_DA as usize);
    }

    #[test]
    fn thiet_ke_khong_khai_cau_nao_thi_dung_im() {
        let mut d = DamDong::new(1);
        assert!(d.buoc(10, &[], &[]).is_none(), "không có câu thì không ai vào");
        assert_eq!(d.so_nguoi(), 0);
    }

    #[test]
    fn vao_dan_cho_du_so_roi_thoi() {
        let mut d = DamDong::new(1);
        let c = cau();
        for _ in 0..3 {
            let ev = d.buoc(3, &c, &[]).unwrap();
            assert!(matches!(ev.what, Payload::Join));
        }
        assert_eq!(d.so_nguoi(), 3);
        // Đủ số rồi thì chuyển sang nói chuyện / thả tim, không vào thêm.
        for _ in 0..20 {
            let ev = d.buoc(3, &c, &[]).unwrap();
            assert!(!matches!(ev.what, Payload::Join));
        }
        assert_eq!(d.so_nguoi(), 3);
    }

    #[test]
    fn tat_thi_ho_di_ra_dan_chu_khong_bien_mat_mot_luc() {
        let mut d = DamDong::new(2);
        let c = cau();
        for _ in 0..4 {
            d.buoc(4, &c, &[]);
        }
        assert_eq!(d.so_nguoi(), 4);

        // Ra thưa: phải mất nhiều nhịp, và giữa hai lượt ra người còn lại vẫn
        // thả tim, bình luận.
        let mut nhip = 0;
        let mut ra = 0;
        let mut con_noi = 0;
        while d.so_nguoi() > 0 {
            nhip += 1;
            assert!(nhip < 200, "tắt rồi mà mãi không ai ra");
            match d.buoc(0, &c, &[]).unwrap().what {
                Payload::Leave => ra += 1,
                _ => con_noi += 1,
            }
        }
        assert_eq!(ra, 4);
        assert!(con_noi > 0, "không được ra liền một mạch, nhịp nào cũng có người đi");
        assert!(d.buoc(0, &c, &[]).is_none(), "hết người thì im");
    }

    #[test]
    fn chi_noi_cau_cua_thiet_ke_va_khong_bao_gio_tang_qua() {
        let mut d = DamDong::new(3);
        let c = cau();
        for _ in 0..2 {
            d.buoc(2, &c, &[]);
        }
        for _ in 0..200 {
            let ev = d.buoc(2, &c, &[]).unwrap();
            match ev.what {
                Payload::Comment { text } => assert!(c.contains(&text)),
                Payload::Like { .. } => {}
                khac => panic!("nhân vật ảo không được làm {khac:?}"),
            }
        }
    }

    #[test]
    fn ten_rieng_cua_thiet_ke_duoc_dung() {
        let mut d = DamDong::new(4);
        let ten = vec!["Bé Na".to_string()];
        let ev = d.buoc(1, &cau(), &ten).unwrap();
        assert_eq!(ev.who.name, "Bé Na");
        assert!(ev.who.user.starts_with("mh"));
    }

    #[test]
    fn phat_lai_cung_mot_phong_thi_cung_phai_quen() {
        // Phiên mới là ghế trống: nhớ lại người cũ thì không ai vào nữa.
        let mut d = DamDong::new(6);
        let c = cau();
        for _ in 0..3 {
            d.buoc(3, &c, &[]);
        }
        assert_eq!(d.so_nguoi(), 3);
        d.quen_het();
        let ev = d.buoc(3, &c, &[]).unwrap();
        assert!(matches!(ev.what, Payload::Join), "phải cho người vào lại từ đầu");
    }

    #[test]
    fn doi_phong_thi_quen_nguoi_cu() {
        let mut d = DamDong::new(5);
        let c = cau();
        for _ in 0..3 {
            d.buoc(3, &c, &[]);
        }
        d.quen_het();
        assert_eq!(d.so_nguoi(), 0);
    }
}
