//! Dàn giọng của phòng.
//!
//! Một phiên có nhiều nhân vật: MC dẫn chuyện, bé gái, cậu bé, người chào khách.
//! Mỗi nhân vật một giọng, nên ở đây là một **danh sách** chứ không phải một
//! giọng duy nhất. Module phát `Effect` dạng `say` kèm `voice` là id trong dàn
//! này; không kèm thì dùng giọng mặc định.
//!
//! Tách khỏi `secrets.rs` vì ở đây **không có gì bí mật**: tên giọng và vai diễn
//! là thứ sân khấu phải biết để đọc. Khoá vẫn nằm riêng và không bao giờ đi ra.

use serde::{Deserialize, Serialize};

use crate::paths::{valid_label, Layout};
use crate::store::{self, StoreError};

/// Nhiều hơn ngần này thì không còn là dàn diễn viên nữa.
const MAX_CAST: usize = 40;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CastVoice {
    /// Id ngắn, module gọi tới bằng cái này: `{ kind: 'say', voice: 'be-gai' }`.
    pub id: String,
    /// Nhà cung cấp trong kho khoá. Rỗng nghĩa là giọng máy của trình duyệt.
    #[serde(default)]
    pub provider: String,
    /// Tên giọng. Có nhà đặt giọng vào `model` — khi đó điền dạng `google-tts/vi`.
    #[serde(default)]
    pub voice: String,
    /// Vai diễn, viết cho người đọc: "MC dẫn chuyện — nam miền Bắc".
    #[serde(default)]
    pub role: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct VoiceCfg {
    /// Bật/tắt đọc to. Tắt thì câu MC vẫn hiện thành chữ trên màn.
    pub enabled: bool,
    pub speed: f32,
    pub volume: f32,
    /// Id giọng dùng khi câu không nói rõ đọc bằng giọng nào.
    #[serde(default, rename = "default")]
    pub mac_dinh: String,
    #[serde(default)]
    pub cast: Vec<CastVoice>,
    /// Đa giọng: mỗi tính năng đọc bằng giọng chính của nó, và dấu `[id]` trong
    /// câu đổi sang giọng khác. Tắt (đơn giọng) thì cả phòng một giọng mặc định.
    /// Sân khấu tự chia câu — backend chỉ giữ công tắc.
    #[serde(default)]
    pub multi: bool,
}

impl Default for VoiceCfg {
    fn default() -> Self {
        Self {
            enabled: true,
            speed: 1.0,
            volume: 1.0,
            mac_dinh: String::new(),
            cast: Vec::new(),
            multi: false,
        }
    }
}

impl VoiceCfg {
    /// Tìm giọng theo id; không có thì lấy giọng mặc định; không có nữa thì lấy
    /// giọng đầu dàn. Sân khấu luôn phải đọc được bằng cái gì đó.
    pub fn tim(&self, id: &str) -> Option<&CastVoice> {
        if !id.is_empty() {
            if let Some(v) = self.cast.iter().find(|v| v.id == id) {
                return Some(v);
            }
        }
        if !self.mac_dinh.is_empty() {
            if let Some(v) = self.cast.iter().find(|v| v.id == self.mac_dinh) {
                return Some(v);
            }
        }
        self.cast.first()
    }

    fn kep(mut self) -> Self {
        // Làm tròn hai chữ số: f32 cho ra 1.100000023841858, vừa khó đọc trong
        // file vừa hiện ra xấu trên trang quản lý.
        let tron = |x: f32| ((f64::from(x) * 100.0).round() / 100.0) as f32;
        self.speed = tron(self.speed.clamp(0.5, 2.0));
        self.volume = tron(self.volume.clamp(0.0, 1.0));

        self.cast.truncate(MAX_CAST);
        let mut da_thay: Vec<String> = Vec::new();
        self.cast.retain_mut(|v| {
            v.provider = v.provider.chars().take(40).collect();
            v.voice = v.voice.chars().take(80).filter(|c| !c.is_control()).collect();
            v.role = v.role.chars().take(160).filter(|c| !c.is_control()).collect();
            // Id trùng nhau thì module gọi tới sẽ ra nhầm người; bỏ bản sau.
            if !valid_label(&v.id) || da_thay.contains(&v.id) {
                return false;
            }
            da_thay.push(v.id.clone());
            true
        });

        if !self.cast.iter().any(|v| v.id == self.mac_dinh) {
            self.mac_dinh = self.cast.first().map(|v| v.id.clone()).unwrap_or_default();
        }
        self
    }
}

pub fn read(layout: &Layout) -> VoiceCfg {
    match store::read_json(&layout.voice_file()) {
        Ok(Some(v)) => serde_json::from_value::<VoiceCfg>(v).unwrap_or_default().kep(),
        _ => VoiceCfg::default(),
    }
}

pub fn write(layout: &Layout, cfg: VoiceCfg) -> Result<VoiceCfg, StoreError> {
    let c = cfg.kep();
    store::write_json_atomic(&layout.voice_file(), &serde_json::to_value(&c).unwrap())?;
    Ok(c)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn moi() -> (tempfile::TempDir, Layout) {
        let d = tempfile::tempdir().unwrap();
        let l = Layout::new(d.path());
        (d, l)
    }

    fn giong(id: &str) -> CastVoice {
        CastVoice {
            id: id.into(),
            provider: "9router".into(),
            voice: "google-tts/vi".into(),
            role: String::new(),
        }
    }

    #[test]
    fn cai_dat_cu_la_don_giong_va_cong_tac_luu_duoc() {
        let cu: VoiceCfg = serde_json::from_value(serde_json::json!({
            "enabled": true, "speed": 1.0, "volume": 1.0
        }))
        .unwrap();
        assert!(!cu.multi, "cài đặt cũ không có công tắc thì vẫn đơn giọng như trước");
        let (_d, l) = moi();
        let c = write(&l, VoiceCfg { multi: true, ..VoiceCfg::default() }).unwrap();
        assert!(c.multi);
        assert!(read(&l).multi);
    }

    #[test]
    fn mac_dinh_la_bat_va_dan_giong_rong() {
        let (_d, l) = moi();
        let c = read(&l);
        assert!(c.enabled);
        assert!(c.cast.is_empty(), "chưa cấu hình thì rơi về giọng của trình duyệt");
        assert_eq!(c.speed, 1.0);
    }

    #[test]
    fn ghi_ca_dan_giong_roi_doc_lai_duoc() {
        let (_d, l) = moi();
        write(
            &l,
            VoiceCfg {
                cast: vec![giong("mc"), giong("be-gai")],
                mac_dinh: "mc".into(),
                ..VoiceCfg::default()
            },
        )
        .unwrap();
        let c = read(&l);
        assert_eq!(c.cast.len(), 2);
        assert_eq!(c.mac_dinh, "mc");
        assert_eq!(c.tim("be-gai").unwrap().id, "be-gai");
    }

    #[test]
    fn goi_giong_khong_co_thi_ve_giong_mac_dinh() {
        let (_d, l) = moi();
        let c = write(
            &l,
            VoiceCfg {
                cast: vec![giong("mc"), giong("be-gai")],
                mac_dinh: "be-gai".into(),
                ..VoiceCfg::default()
            },
        )
        .unwrap();
        assert_eq!(c.tim("khong-co").unwrap().id, "be-gai");
        assert_eq!(c.tim("").unwrap().id, "be-gai");
    }

    #[test]
    fn mac_dinh_tro_vao_khoang_khong_thi_lay_giong_dau_dan() {
        let (_d, l) = moi();
        let c = write(
            &l,
            VoiceCfg {
                cast: vec![giong("mc")],
                mac_dinh: "da-xoa".into(),
                ..VoiceCfg::default()
            },
        )
        .unwrap();
        assert_eq!(c.mac_dinh, "mc", "mặc định trỏ vào giọng đã xoá thì phải sửa lại");
    }

    #[test]
    fn dan_rong_thi_tim_khong_ra_gi() {
        let c = VoiceCfg::default();
        assert!(c.tim("mc").is_none());
    }

    #[test]
    fn id_trung_nhau_thi_bo_ban_sau() {
        let (_d, l) = moi();
        let mut hai = giong("mc");
        hai.role = "bản sau".into();
        let c = write(&l, VoiceCfg { cast: vec![giong("mc"), hai], ..VoiceCfg::default() }).unwrap();
        assert_eq!(c.cast.len(), 1);
        assert_eq!(c.cast[0].role, "");
    }

    #[test]
    fn id_sai_dinh_dang_bi_bo() {
        let (_d, l) = moi();
        let xau = CastVoice { id: "MC Chinh".into(), ..giong("x") };
        let c = write(&l, VoiceCfg { cast: vec![xau, giong("mc")], ..VoiceCfg::default() }).unwrap();
        assert_eq!(c.cast.len(), 1);
        assert_eq!(c.cast[0].id, "mc");
    }

    #[test]
    fn so_vo_ly_bi_kep_lai() {
        let (_d, l) = moi();
        let c = write(&l, VoiceCfg { speed: 9.0, volume: -3.0, ..VoiceCfg::default() }).unwrap();
        assert_eq!(c.speed, 2.0);
        assert_eq!(c.volume, 0.0);
    }

    #[test]
    fn toc_do_duoc_lam_tron_cho_de_doc() {
        let (_d, l) = moi();
        let c = write(&l, VoiceCfg { speed: 1.100_000_02, ..VoiceCfg::default() }).unwrap();
        assert_eq!(c.speed, 1.1);
    }

    #[test]
    fn ky_tu_dieu_khien_trong_ten_giong_bi_loc() {
        let (_d, l) = moi();
        let mut v = giong("mc");
        v.voice = "goog\nle-tts/vi".into();
        let c = write(&l, VoiceCfg { cast: vec![v], ..VoiceCfg::default() }).unwrap();
        assert_eq!(c.cast[0].voice, "google-tts/vi");
    }

    #[test]
    fn dan_giong_khong_phinh_vo_han() {
        let (_d, l) = moi();
        let cast: Vec<CastVoice> = (0..60).map(|i| giong(&format!("g{i}"))).collect();
        let c = write(&l, VoiceCfg { cast, ..VoiceCfg::default() }).unwrap();
        assert_eq!(c.cast.len(), MAX_CAST);
    }

    #[test]
    fn file_hong_thi_ve_mac_dinh_chu_khong_sap() {
        let (_d, l) = moi();
        store::write_json_atomic(&l.voice_file(), &json!(["không", "phải", "object"])).unwrap();
        assert_eq!(read(&l), VoiceCfg::default());
    }
}
