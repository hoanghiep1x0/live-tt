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

/// Phòng đã đủ người thì vẫn phải có người vào ra, không thì ghế đứng im cả
/// buổi — nhìn là biết dựng. Cơ hội (phần trăm) một nhịp có người VÀO khi đang
/// thiếu chỗ, và có người RA khi đã đủ: ra bằng một phần năm vào, nên phòng
/// luôn gần đủ người, thỉnh thoảng mới thấy một người đứng dậy rồi lại có
/// người mới ghé.
const PHAN_VAO: u32 = 25;
const PHAN_RA_NGAU: u32 = PHAN_VAO / 5;

/// Tắt bật và số lượng — phần người vận hành chỉnh. Lưu theo từng thiết kế.
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BotCfg {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "so_mac_dinh")]
    pub count: u32,
    /// Cho máy chủ TỰ bật nhân vật ảo khi mất nguồn dữ liệu quá lâu
    /// (`ai::canh_mat_nguon`), rồi tự tắt khi nối lại.
    ///
    /// Mặc định TẮT. Người vận hành tắt nhân vật ảo là họ đã quyết rồi; máy
    /// chủ tự bật lại sau lưng thì công tắc kia thành vô nghĩa — mà kênh chưa
    /// lên sóng cũng tính là "mất nguồn", nên nó bật gần như suốt.
    #[serde(default, rename = "tuBatKhiMatNguon")]
    pub tu_bat_khi_mat_nguon: bool,
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
            tu_bat_khi_mat_nguon: false,
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

        // Thiếu người: vào dần, không ào một lượt — phòng mới mở cũng phải
        // đông lên từ từ như phòng thật.
        if self.trong_phong.len() < muc_tieu {
            if self.rng.gen_range(0..100) >= PHAN_VAO {
                return None;
            }
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

        // Đủ người rồi vẫn có người đứng dậy về, thưa hơn nhịp vào năm lần.
        // Ai đi là ngẫu nhiên giữa phòng — không phải cứ người ngồi lâu nhất.
        if !self.trong_phong.is_empty() && self.rng.gen_range(0..100) < PHAN_RA_NGAU {
            let i = self.rng.gen_range(0..self.trong_phong.len());
            let ra = self.trong_phong.remove(i);
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

// ---- Nhân vật ảo đáp khách THẬT — chuyển từ `botReaction` của bản cũ ----
//
// Khách thật thấy mình được chú ý thì ở lại lâu hơn, bình luận nhiều hơn: có
// người vào thì nhân vật ảo chào, có quà thì cảm ơn. Câu chào / cảm ơn là của
// từng phòng (`crowd.greet` / `crowd.thanks` trong `design.json`); phòng không
// khai thì không đáp.

/// Mỗi khách thật tối đa một lần được đáp trong ngần này.
pub const DAP_MOI_NGUOI_MS: i64 = 45_000;
/// Các câu đáp cách nhau ít nhất ngần này — không lấn bình luận thật.
pub const DAP_CACH_MS: i64 = 3_000;
/// Cả phòng tối đa một câu chào người mới mỗi ngần này.
pub const CHAO_CACH_MS: i64 = 12_000;
/// MC vừa nói trong ngần này là MC đang trực và tự chào khách: nhân vật ảo
/// không chào nữa, tránh chào trùng.
pub const MC_TRUC_MS: i64 = 300_000;
/// Hàng câu đáp dồn quá ngần này thì bỏ bớt (trừ cảm ơn quà): đáp trễ là lạc.
const DON_TOI_DA_MS: i64 = 15_000;

/// Tên gọn để gọi: bỏ biểu tượng, tối đa 18 ký tự. Tên mặc định TikTok
/// ("user8788788166197") gọi lên nghe máy móc: `None`. Hàm thuần.
pub fn ten_goi(name: &str) -> Option<String> {
    let gon: String = name
        .chars()
        .filter(|c| c.is_alphanumeric() || matches!(c, ' ' | '.' | '_' | '-'))
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(18)
        .collect();
    let mac_dinh = gon.len() > 9
        && gon.to_lowercase().starts_with("user")
        && gon[4..].chars().all(|c| c.is_ascii_digit());
    (!gon.is_empty() && !mac_dinh).then_some(gon)
}

/// Bộ đáp khách của một phòng đang phát.
#[derive(Default)]
pub struct DapKhach {
    id_cuoi: u64,
    phien: i64,
    da_dap: HashMap<String, i64>,
    chao_cuoi: i64,
    /// Câu kế tiếp được nói sớm nhất lúc này.
    ranh_tu: i64,
    /// (lúc nói, câu)
    cho: Vec<(i64, String)>,
}

impl DapKhach {
    /// Xem các mục feed mới. `chao` / `cam_on`: câu của phòng, `{ten}` là tên.
    /// `chu_phong`: nick chủ kênh — nhân vật ảo cũng KHÔNG chào, không cảm ơn
    /// chính chủ phòng (người đang vận hành), như MC.
    pub fn xem(
        &mut self,
        phien: i64,
        feed: &[crate::session::FeedItem],
        now: i64,
        chao: &[String],
        cam_on: &[String],
        chu_phong: &str,
        rand: &mut impl Rng,
    ) {
        let chu = chu_phong.trim().trim_start_matches('@').to_lowercase();
        if phien != self.phien {
            // Phiên mới: feed đánh số lại; mục cũ có sẵn lúc mở thì bỏ qua.
            *self = Self {
                phien,
                id_cuoi: feed.last().map_or(0, |f| f.id),
                chao_cuoi: i64::MIN / 2,
                ..Self::default()
            };
            return;
        }
        let mc_truc = feed.iter().rev().find(|f| f.kind == "host").is_some_and(|f| now - f.at < MC_TRUC_MS);
        let tu = self.id_cuoi;
        for f in feed.iter().filter(|f| f.id > tu) {
            self.id_cuoi = self.id_cuoi.max(f.id);
            if f.ao == Some(true) {
                continue;
            }
            // Chủ phòng: bỏ qua hẳn.
            if !chu.is_empty()
                && f.user.as_deref().is_some_and(|u| u.trim_start_matches('@').eq_ignore_ascii_case(&chu))
            {
                continue;
            }
            let Some(ten) = ten_goi(&f.name) else { continue };
            let ai = f.user.clone().unwrap_or_else(|| f.name.clone());
            if now - self.da_dap.get(&ai).copied().unwrap_or(i64::MIN / 2) < DAP_MOI_NGUOI_MS {
                continue;
            }
            let (mau, so) = match f.kind.as_str() {
                "join" if !mc_truc && now - self.chao_cuoi >= CHAO_CACH_MS => (chao, 1),
                "gift" => (cam_on, 2),
                _ => continue,
            };
            if mau.is_empty() {
                continue;
            }
            if f.kind != "gift" && self.ranh_tu - now > DON_TOI_DA_MS {
                continue;
            }
            self.da_dap.insert(ai, now);
            if f.kind == "join" {
                self.chao_cuoi = now;
            }
            // Trễ 1,5–4 giây cho tự nhiên; các câu cách nhau ít nhất `DAP_CACH_MS`.
            let mut luc = (now + rand.gen_range(1_500..4_000)).max(self.ranh_tu);
            for _ in 0..so {
                let cau = &mau[rand.gen_range(0..mau.len())];
                self.cho.push((luc, cau.replace("{ten}", &ten)));
                luc += DAP_CACH_MS;
            }
            self.ranh_tu = luc;
        }
        if self.da_dap.len() > 500 {
            self.da_dap.clear();
        }
    }

    /// Các câu tới lượt nói lúc `now`.
    pub fn den_luot(&mut self, now: i64) -> Vec<String> {
        let (toi, con): (Vec<_>, Vec<_>) = std::mem::take(&mut self.cho).into_iter().partition(|(t, _)| *t <= now);
        self.cho = con;
        toi.into_iter().map(|(_, c)| c).collect()
    }
}

pub async fn chay(st: Arc<AppState>) {
    let mut dam = DamDong::new(st.seed_gia_lap() ^ 0x6d68);
    // Nhớ cả phòng LẪN mốc mở phiên. Chỉ nhớ phòng là hỏng: người vận hành ngắt
    // rồi phát lại cùng một phòng thì phiên mới trắng tinh, mà bộ này vẫn tưởng
    // tám người của mình còn ngồi trong đó nên không cho ai vào nữa — ghế trống
    // mà công tắc gạt kiểu gì cũng không ra người.
    let mut phong_cu: Option<(String, i64)> = None;
    let mut dong_ho = tokio::time::interval(Duration::from_millis(NHIP_MS));
    let mut dap = DapKhach::default();
    let mut rand = StdRng::seed_from_u64(st.seed_gia_lap() ^ 0x6461);

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
        // Chủ kênh: nhân vật ảo không chào, không cảm ơn chính người vận hành.
        let chu_phong = st.nguon().cfg.channel.clone();
        let (lines, ten_rieng) = st.crowd_cua(&id);
        if let Some(ev) = dam.buoc(cfg.muc_tieu(), &lines, &ten_rieng) {
            st.ap_su_kien(ev, true);
        }

        // Nhân vật ảo đáp khách thật — chỉ khi phòng đang bật nhân vật ảo.
        if cfg.enabled {
            if let Some(view) = st.session_view() {
                let now = crate::state::bay_gio_ms();
                let (chao, cam_on) = st.crowd_dap(&id);
                dap.xem(moc, &view.recent_feed, now, &chao, &cam_on, &chu_phong, &mut rand);
                for cau in dap.den_luot(now) {
                    st.ao_noi(&id, true, cau);
                }
            }
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

    fn muc(id: u64, at: i64, kind: &str, name: &str, ao: bool) -> crate::session::FeedItem {
        serde_json::from_value(serde_json::json!({
            "id": id, "at": at, "kind": kind, "name": name, "text": "", "user": name,
            "virtual": if ao { Some(true) } else { None }
        }))
        .unwrap()
    }

    #[test]
    fn ten_goi_bo_bieu_tuong_va_ten_mac_dinh() {
        assert_eq!(ten_goi("Lan 🌸").as_deref(), Some("Lan"));
        assert_eq!(ten_goi("user8788788166197"), None);
        assert_eq!(ten_goi("🌸🌸"), None);
    }

    #[test]
    fn chao_khach_that_cam_on_qua_bo_qua_nguoi_ao() {
        let mut r = StdRng::seed_from_u64(1);
        let chao = vec!["Chào {ten} 👋".to_string()];
        let cam = vec!["Cảm ơn {ten} nha".to_string()];
        let mut d = DapKhach::default();
        d.xem(7, &[], 0, &chao, &cam, "", &mut r);
        let feed = vec![muc(1, 0, "join", "Lan", false), muc(2, 0, "join", "Ảo", true), muc(3, 0, "gift", "Minh", false)];
        d.xem(7, &feed, 0, &chao, &cam, "", &mut r);
        assert!(d.den_luot(1_000).is_empty(), "chưa tới lúc: trễ cho tự nhiên");
        let noi = d.den_luot(60_000);
        assert_eq!(noi, ["Chào Lan 👋", "Cảm ơn Minh nha", "Cảm ơn Minh nha"]);
    }

    #[test]
    fn mc_dang_truc_thi_khong_chao_va_moi_nguoi_mot_lan() {
        let mut r = StdRng::seed_from_u64(2);
        let chao = vec!["Chào {ten}".to_string()];
        let mut d = DapKhach::default();
        d.xem(1, &[], 0, &chao, &[], "", &mut r);
        let feed = vec![muc(1, 100_000, "host", "MC", false), muc(2, 200_000, "join", "Lan", false)];
        d.xem(1, &feed, 200_000, &chao, &[], "", &mut r);
        assert!(d.den_luot(999_999).is_empty(), "MC vừa nói: MC tự chào");

        let mut d = DapKhach::default();
        d.xem(1, &[], 0, &chao, &[], "", &mut r);
        d.xem(1, &[muc(1, 0, "join", "Lan", false)], 0, &chao, &[], "", &mut r);
        d.xem(1, &[muc(2, 20_000, "join", "Lan", false)], 20_000, &chao, &[], "", &mut r);
        assert_eq!(d.den_luot(999_999).len(), 1, "một người một lần trong 45 giây");
    }

    #[test]
    fn phong_khong_khai_cau_chao_thi_khong_dap() {
        let mut r = StdRng::seed_from_u64(3);
        let mut d = DapKhach::default();
        d.xem(1, &[], 0, &[], &[], "", &mut r);
        d.xem(1, &[muc(1, 0, "join", "Lan", false)], 0, &[], &[], "", &mut r);
        assert!(d.den_luot(999_999).is_empty());
    }

    /// Bước tới khi phòng đủ `n` người (vào dần theo cơ hội từng nhịp).
    fn cho_du(d: &mut DamDong, n: usize, c: &[String]) {
        for _ in 0..500 {
            if d.so_nguoi() >= n {
                return;
            }
            d.buoc(n, c, &[]);
        }
        panic!("mãi không đủ người");
    }

    fn cau() -> Vec<String> {
        vec!["nghe hay quá".into(), "kể tiếp đi ạ".into()]
    }

    #[test]
    fn mac_dinh_tat_het_va_khong_tu_bat_lai() {
        let c = BotCfg::default();
        assert!(!c.enabled, "nhân vật ảo mặc định TẮT");
        assert!(
            !c.tu_bat_khi_mat_nguon,
            "mất nguồn cũng KHÔNG tự bật — người vận hành tắt là họ đã quyết"
        );
        // Cấu hình cũ chưa có khoá này thì cũng là tắt, không phải bật.
        let cu: BotCfg = serde_json::from_value(serde_json::json!({ "enabled": true, "count": 5 })).unwrap();
        assert!(!cu.tu_bat_khi_mat_nguon);
    }

    #[test]
    fn tat_thi_muc_tieu_la_khong() {
        let c = BotCfg { enabled: false, count: 20, ..BotCfg::default() };
        assert_eq!(c.muc_tieu(), 0);
    }

    #[test]
    fn so_qua_lon_bi_keo_ve_tran() {
        let c = BotCfg { enabled: true, count: 1000, ..BotCfg::default() };
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
        // Vào dần, mỗi nhịp một phần cơ hội — không ào một lượt.
        let mut vao = 0;
        for _ in 0..400 {
            if d.so_nguoi() >= 3 {
                break;
            }
            if let Some(ev) = d.buoc(3, &c, &[]) {
                assert!(matches!(ev.what, Payload::Join));
                vao += 1;
            }
        }
        assert_eq!(vao, 3);
        assert_eq!(d.so_nguoi(), 3);
        // Đủ số rồi thì không vào thêm: chỉ nói chuyện, thả tim, thỉnh thoảng
        // một người về (nhịp ra bằng 1/5 nhịp vào).
        let mut ra = 0;
        let mut noi = 0;
        for _ in 0..400 {
            match d.buoc(3, &c, &[]).map(|e| e.what) {
                Some(Payload::Join) => panic!("đủ người rồi mà còn cho vào"),
                Some(Payload::Leave) => {
                    ra += 1;
                    // Có người về thì lại có người mới ghé.
                    while d.so_nguoi() < 3 {
                        d.buoc(3, &c, &[]);
                    }
                }
                Some(_) => noi += 1,
                None => {}
            }
        }
        assert!(ra > 0, "phòng đứng im cả buổi: không ai ra vào");
        assert!(noi > ra, "ra phải thưa hơn nói chuyện");
        assert_eq!(d.so_nguoi(), 3);
    }

    #[test]
    fn tat_thi_ho_di_ra_dan_chu_khong_bien_mat_mot_luc() {
        let mut d = DamDong::new(2);
        let c = cau();
        cho_du(&mut d, 4, &c);
        assert_eq!(d.so_nguoi(), 4);

        // Ra thưa: phải mất nhiều nhịp, và giữa hai lượt ra người còn lại vẫn
        // thả tim, bình luận.
        let mut nhip = 0;
        let mut ra = 0;
        let mut con_noi = 0;
        while d.so_nguoi() > 0 {
            nhip += 1;
            assert!(nhip < 500, "tắt rồi mà mãi không ai ra");
            match d.buoc(0, &c, &[]).map(|e| e.what) {
                Some(Payload::Leave) => ra += 1,
                Some(_) => con_noi += 1,
                None => {}
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
        cho_du(&mut d, 2, &c);
        for _ in 0..200 {
            let Some(ev) = d.buoc(2, &c, &[]) else { continue };
            match ev.what {
                Payload::Comment { text } => assert!(c.contains(&text)),
                Payload::Like { .. } => {}
                // Đủ người vẫn có người về rồi người mới ghé — phòng không đứng im.
                Payload::Leave | Payload::Join => {}
                khac => panic!("nhân vật ảo không được làm {khac:?}"),
            }
        }
    }

    #[test]
    fn ten_rieng_cua_thiet_ke_duoc_dung() {
        let mut d = DamDong::new(4);
        let ten = vec!["Bé Na".to_string()];
        let ev = (0..200).find_map(|_| d.buoc(1, &cau(), &ten)).expect("có người vào");
        assert_eq!(ev.who.name, "Bé Na");
        assert!(ev.who.user.starts_with("mh"));
    }

    #[test]
    fn phat_lai_cung_mot_phong_thi_cung_phai_quen() {
        // Phiên mới là ghế trống: nhớ lại người cũ thì không ai vào nữa.
        let mut d = DamDong::new(6);
        let c = cau();
        cho_du(&mut d, 3, &c);
        assert_eq!(d.so_nguoi(), 3);
        d.quen_het();
        let ev = (0..200).find_map(|_| d.buoc(3, &c, &[])).expect("có sự kiện");
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
