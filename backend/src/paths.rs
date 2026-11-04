//! Chỗ đặt file và luật an toàn đường dẫn.
//!
//! Hai thiết kế khác nhau không bao giờ đọc được file của nhau. Mọi đường dẫn
//! từ bên ngoài đều đi qua `safe_join` trước khi chạm đĩa.

use std::path::{Component, Path, PathBuf};

/// Gốc dự án, chứa client/, database/, docs/…
#[derive(Clone, Debug)]
pub struct Layout {
    pub root: PathBuf,
}

impl Layout {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }

    pub fn designs_dir(&self) -> PathBuf {
        self.root.join("client").join("designs")
    }

    /// Bản đã build của thiết kế — thứ OBS tải về.
    pub fn design_dist(&self, id: &str) -> PathBuf {
        self.designs_dir().join(id).join("dist")
    }

    /// Assets riêng của thiết kế.
    pub fn design_assets(&self, id: &str) -> PathBuf {
        self.designs_dir().join(id).join("assets")
    }

    pub fn modules_dir(&self) -> PathBuf {
        self.root.join("client").join("modules")
    }

    /// Assets RIÊNG của một module.
    ///
    /// Module phải chạy được ở mọi bối cảnh phòng — đám cưới, chùa, quán bar —
    /// nên hình và tiếng của nó đi theo nó, không nằm trong thư mục của một
    /// thiết kế nào. Nhờ vậy bật module ở phòng mới là xong, không phải copy file.
    pub fn module_assets(&self, id: &str) -> PathBuf {
        self.modules_dir().join(id).join("assets")
    }

    pub fn design_manifest(&self, id: &str) -> PathBuf {
        self.designs_dir().join(id).join("design.json")
    }

    pub fn database_dir(&self) -> PathBuf {
        self.root.join("database")
    }

    /// Cấu hình mọi module của một thiết kế.
    pub fn config_file(&self, design_id: &str) -> PathBuf {
        self.database_dir()
            .join("designs")
            .join(design_id)
            .join("config.json")
    }

    /// Cài đặt người vận hành đặt cho thiết kế: tên hiện trên thẻ, link Studio.
    pub fn settings_file(&self, design_id: &str) -> PathBuf {
        self.database_dir()
            .join("designs")
            .join(design_id)
            .join("settings.json")
    }

    /// Bản chụp phiên, để mở lại không mất. "Reset dữ liệu" xoá đúng file này.
    pub fn session_file(&self, design_id: &str) -> PathBuf {
        self.database_dir()
            .join("designs")
            .join(design_id)
            .join("session.json")
    }

    /// Cài đặt giọng đọc. Không phải bí mật nên để riêng khỏi secrets.json.
    pub fn voice_file(&self) -> PathBuf {
        self.database_dir().join("voice.json")
    }

    pub fn secrets_file(&self) -> PathBuf {
        self.database_dir().join("secrets.json")
    }

    /// Thùng rác — file tạm lúc ghi nằm ở đây, không rải ra gốc dự án.
    pub fn tmp_dir(&self) -> PathBuf {
        self.root.join(".tmp")
    }
}

/// Ghép đường dẫn từ yêu cầu bên ngoài vào một thư mục gốc, từ chối mọi lối thoát.
///
/// Trả `None` khi đường dẫn chứa `..`, bắt đầu bằng `/`, có tên ổ đĩa, hoặc rỗng.
/// Cố ý chặn trước khi chạm đĩa, không dựa vào `canonicalize` — file chưa tồn tại
/// vẫn phải bị từ chối đúng cách.
pub fn safe_join(base: &Path, rel: &str) -> Option<PathBuf> {
    if rel.is_empty() {
        return None;
    }
    // Windows chấp nhận cả hai loại gạch; chuẩn hoá để không bỏ sót "..\\".
    let rel = rel.replace('\\', "/");
    // Bắt đầu bằng gạch là đường tuyệt đối hoặc UNC. Ghép vào base thì vẫn nằm
    // trong thư mục, nhưng từ chối thẳng rõ ràng hơn là âm thầm chuẩn hoá.
    if rel.starts_with('/') {
        return None;
    }
    let mut out = base.to_path_buf();
    let mut depth = 0usize;

    for part in rel.split('/') {
        if part.is_empty() || part == "." {
            continue;
        }
        if part == ".." {
            return None;
        }
        // Chặn "C:", "\\\\máy\\chia-se" và các dạng tuyệt đối khác.
        if Path::new(part)
            .components()
            .any(|c| !matches!(c, Component::Normal(_)))
        {
            return None;
        }
        out.push(part);
        depth += 1;
    }

    if depth == 0 {
        None
    } else {
        Some(out)
    }
}

/// ID hợp lệ: kebab-case, bắt đầu bằng chữ, 2–32 ký tự.
/// Giống `ID_RE` bên client — hai bên phải khớp nhau.
pub fn valid_id(id: &str) -> bool {
    let n = id.len();
    if !(2..=32).contains(&n) {
        return false;
    }
    let mut chars = id.chars();
    match chars.next() {
        Some(c) if c.is_ascii_lowercase() => {}
        _ => return false,
    }
    chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

/// Nhãn do người dùng tự đặt: tên nhà cung cấp giọng, id nhân vật trong dàn.
///
/// Lỏng hơn `valid_id` ở một điểm: được bắt đầu bằng số, vì có nhà cung cấp tên
/// thật là "9router". Những nhãn này không dùng làm tên thư mục nên không cần
/// chặt như id module và thiết kế.
pub fn valid_label(x: &str) -> bool {
    let n = x.len();
    if !(2..=32).contains(&n) {
        return false;
    }
    let mut chars = x.chars();
    match chars.next() {
        Some(c) if c.is_ascii_lowercase() || c.is_ascii_digit() => {}
        _ => return false,
    }
    chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> PathBuf {
        PathBuf::from("/goc/client/designs/ke-chuyen/assets")
    }

    #[test]
    fn ghep_duong_dan_binh_thuong() {
        let p = safe_join(&base(), "bg/rap-chieu.png").unwrap();
        assert!(p.ends_with("bg/rap-chieu.png") || p.ends_with("bg\\rap-chieu.png"));
    }

    #[test]
    fn bo_qua_dau_cham_va_gach_thua() {
        let p = safe_join(&base(), "./bg//rap.png").unwrap();
        assert!(p.ends_with("bg/rap.png") || p.ends_with("bg\\rap.png"));
    }

    #[test]
    fn chan_moi_duong_thoat_ra_ngoai() {
        for xau in [
            "../secrets.json",
            "bg/../../../database/secrets.json",
            "..",
            "bg/..",
            "..\\..\\database\\secrets.json",
            "bg\\..\\..\\secrets.json",
        ] {
            assert!(safe_join(&base(), xau).is_none(), "phải chặn: {xau}");
        }
    }

    #[test]
    fn chan_duong_dan_tuyet_doi() {
        for xau in [
            "C:/Windows/win.ini",
            "C:\\Windows\\win.ini",
            "//may/chia-se/x",
        ] {
            assert!(safe_join(&base(), xau).is_none(), "phải chặn: {xau}");
        }
    }

    #[test]
    fn chan_duong_dan_rong() {
        assert!(safe_join(&base(), "").is_none());
        assert!(safe_join(&base(), "/").is_none());
        assert!(safe_join(&base(), "./").is_none());
    }

    #[test]
    fn id_hop_le_theo_kebab_case() {
        for id in ["ke-chuyen", "hip-hop", "bar-3d", "tich-phuoc", "kieu-1"] {
            assert!(valid_id(id), "phải nhận: {id}");
        }
    }

    #[test]
    fn nhan_nguoi_dat_duoc_bat_dau_bang_so() {
        for x in ["9router", "vieneu", "eleven", "be-gai", "mc2"] {
            assert!(valid_label(x), "phải nhận: {x}");
        }
        for x in ["", "a", "9Router", "9 router", "chín_router", "-abc"] {
            assert!(!valid_label(x), "phải từ chối: {x}");
        }
    }

    #[test]
    fn id_thu_muc_van_phai_bat_dau_bang_chu() {
        // Nhãn thì lỏng, nhưng id thiết kế và module vẫn chặt vì nó là tên thư mục.
        assert!(!valid_id("9router"));
    }

    #[test]
    fn id_sai_bi_tu_choi() {
        for id in [
            "",
            "k",
            "A",
            "Ke-Chuyen",
            "1-phong",
            "ke_chuyen",
            "ke chuyen",
            "../x",
        ] {
            assert!(!valid_id(id), "phải từ chối: {id}");
        }
    }
}
