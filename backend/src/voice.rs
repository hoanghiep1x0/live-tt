//! Cài đặt giọng đọc của phòng: dùng nhà cung cấp nào, giọng nào, nhanh chậm.
//!
//! Tách khỏi `secrets.rs` vì ở đây **không có gì bí mật**: tên giọng và tốc độ
//! là thứ sân khấu phải biết để đọc. Khoá vẫn nằm riêng và không bao giờ đi ra.

use serde::{Deserialize, Serialize};

use crate::paths::Layout;
use crate::store::{self, StoreError};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct VoiceCfg {
    /// Bật/tắt đọc to. Tắt thì câu MC vẫn hiện thành chữ trên màn.
    pub enabled: bool,
    /// Id nhà cung cấp trong kho khoá. Rỗng nghĩa là dùng giọng máy của trình duyệt.
    pub provider: String,
    pub voice: String,
    pub speed: f32,
    pub volume: f32,
}

impl Default for VoiceCfg {
    fn default() -> Self {
        Self {
            enabled: true,
            provider: String::new(),
            voice: String::new(),
            speed: 1.0,
            volume: 1.0,
        }
    }
}

impl VoiceCfg {
    fn kep(mut self) -> Self {
        // Làm tròn hai chữ số: f32 cho ra 1.100000023841858, vừa khó đọc trong
        // file vừa hiện ra xấu trên trang quản lý.
        let tron = |x: f32| ((f64::from(x) * 100.0).round() / 100.0) as f32;
        self.speed = tron(self.speed.clamp(0.5, 2.0));
        self.volume = tron(self.volume.clamp(0.0, 1.0));
        self.provider = self.provider.chars().take(40).collect();
        self.voice = self.voice.chars().take(80).filter(|c| !c.is_control()).collect();
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

    #[test]
    fn mac_dinh_la_bat_va_dung_giong_may() {
        let (_d, l) = moi();
        let c = read(&l);
        assert!(c.enabled);
        assert_eq!(c.provider, "", "chưa cấu hình thì rơi về giọng của trình duyệt");
        assert_eq!(c.speed, 1.0);
    }

    #[test]
    fn ghi_roi_doc_lai_duoc() {
        let (_d, l) = moi();
        write(
            &l,
            VoiceCfg { provider: "vieneu".into(), voice: "Anh Khôi".into(), ..VoiceCfg::default() },
        )
        .unwrap();
        let c = read(&l);
        assert_eq!(c.provider, "vieneu");
        assert_eq!(c.voice, "Anh Khôi");
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
    fn ten_giong_co_ky_tu_dieu_khien_bi_loc() {
        let (_d, l) = moi();
        let c = write(&l, VoiceCfg { voice: "Anh\nKhôi".into(), ..VoiceCfg::default() }).unwrap();
        assert_eq!(c.voice, "AnhKhôi");
    }

    #[test]
    fn file_hong_thi_ve_mac_dinh_chu_khong_sap() {
        let (_d, l) = moi();
        store::write_json_atomic(&l.voice_file(), &json!(["không", "phải", "object"])).unwrap();
        assert_eq!(read(&l), VoiceCfg::default());
    }
}
