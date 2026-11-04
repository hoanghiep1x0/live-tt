//! Sổ thiết kế: quét `client/designs/*/design.json`.
//!
//! Thiết kế chưa build thì vẫn liệt kê, kèm lý do — người dùng cần thấy nó tồn tại
//! và biết phải chạy build, thay vì thấy danh sách trống không hiểu vì sao.

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::paths::{valid_id, Layout};
use crate::settings;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Canvas {
    pub width: u32,
    pub height: u32,
}

impl Default for Canvas {
    fn default() -> Self {
        Self { width: 1080, height: 1920 }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DesignManifest {
    pub id: String,
    pub name: String,
    #[serde(default = "icon_mac_dinh")]
    pub icon: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default = "mot_cham_khong")]
    pub version: String,
    #[serde(default)]
    pub canvas: Canvas,
    #[serde(default)]
    pub slots: Vec<String>,
    #[serde(default)]
    pub provides: Vec<String>,
    #[serde(default)]
    pub recommends: Vec<String>,
    /// Số chỗ ngồi của phòng. Vị trí từng chỗ là việc của thiết kế.
    #[serde(default = "ghe_mac_dinh")]
    pub seats: usize,
    /// Đổi xu TikTok sang điểm của phòng. Mỗi bối cảnh có thể khác nhau.
    #[serde(default = "ti_le_mac_dinh", rename = "pointRate")]
    pub point_rate: f64,
    /// Cấu hình gợi ý cho bối cảnh này, nạp một lần lúc thiết kế chưa có gì.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub defaults: BTreeMap<String, Value>,
    #[serde(default = "entry_mac_dinh")]
    pub entry: String,
}

fn mot_cham_khong() -> String {
    "1.0.0".into()
}

fn entry_mac_dinh() -> String {
    "dist/index.html".into()
}

fn ghe_mac_dinh() -> usize {
    84
}

fn ti_le_mac_dinh() -> f64 {
    1.0
}

fn icon_mac_dinh() -> String {
    "🎬".into()
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DesignStatus {
    Live,
    Off,
    Error,
}

#[derive(Clone, Debug, Serialize)]
pub struct DesignInfo {
    pub manifest: DesignManifest,
    pub status: DesignStatus,
    #[serde(rename = "obsUrl")]
    pub obs_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub problem: Option<String>,
    /// Tên người vận hành tự đặt, hoặc `manifest.name` nếu chưa đặt. Giữ riêng
    /// thay vì ghi đè `manifest.name` để không ai phải đoán tên nào là tên gốc.
    #[serde(rename = "displayName")]
    pub display_name: String,
    #[serde(rename = "studioUrl", skip_serializing_if = "Option::is_none")]
    pub studio_url: Option<String>,
}

/// Đọc một design.json. Trả lý do đọc được khi hỏng, để hiện lên thẻ thiết kế.
pub fn read_manifest(path: &Path, dir_name: &str) -> Result<DesignManifest, String> {
    let body = fs::read(path).map_err(|e| format!("không đọc được design.json: {e}"))?;
    let m: DesignManifest =
        serde_json::from_slice(&body).map_err(|e| format!("design.json hỏng: {e}"))?;

    if !valid_id(&m.id) {
        return Err(format!("id \"{}\" phải là kebab-case, bắt đầu bằng chữ", m.id));
    }
    // Trùng nhau thì URL cho OBS sẽ trỏ nhầm thư mục — bắt sớm còn hơn gỡ sau.
    if m.id != dir_name {
        return Err(format!("id \"{}\" khác tên thư mục \"{dir_name}\"", m.id));
    }
    if m.name.trim().is_empty() {
        return Err("thiếu tên thiết kế".into());
    }
    Ok(m)
}

/// Quét toàn bộ thư mục thiết kế. Sắp theo tên để danh sách không nhảy chỗ mỗi lần tải.
pub fn scan(layout: &Layout, port: u16, live: Option<&str>) -> Vec<DesignInfo> {
    let dir = layout.designs_dir();
    let Ok(entries) = fs::read_dir(&dir) else {
        return Vec::new();
    };

    let mut out = Vec::new();
    for e in entries.flatten() {
        if !e.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            continue;
        }
        let name = e.file_name().to_string_lossy().to_string();
        if !valid_id(&name) {
            continue;
        }
        let manifest_path = layout.design_manifest(&name);
        if !manifest_path.exists() {
            continue;
        }

        let obs_url = format!("http://127.0.0.1:{port}/d/{name}/");
        let dat = settings::read(layout, &name);
        match read_manifest(&manifest_path, &name) {
            Ok(m) => {
                let da_build = layout.design_dist(&name).join("index.html").exists();
                let (status, problem) = if !da_build {
                    (DesignStatus::Error, Some("chưa build — chạy npm run build".into()))
                } else if live == Some(name.as_str()) {
                    (DesignStatus::Live, None)
                } else {
                    (DesignStatus::Off, None)
                };
                let display_name = dat.name.clone().unwrap_or_else(|| m.name.clone());
                out.push(DesignInfo {
                    manifest: m,
                    status,
                    obs_url,
                    problem,
                    display_name,
                    studio_url: dat.studio_url,
                });
            }
            Err(ly_do) => out.push(DesignInfo {
                manifest: DesignManifest {
                    id: name.clone(),
                    name: name.clone(),
                    icon: icon_mac_dinh(),
                    summary: String::new(),
                    version: mot_cham_khong(),
                    canvas: Canvas::default(),
                    slots: Vec::new(),
                    provides: Vec::new(),
                    recommends: Vec::new(),
                    seats: ghe_mac_dinh(),
                    point_rate: ti_le_mac_dinh(),
                    defaults: BTreeMap::new(),
                    entry: entry_mac_dinh(),
                },
                status: DesignStatus::Error,
                obs_url,
                problem: Some(ly_do),
                display_name: dat.name.unwrap_or_else(|| name.clone()),
                studio_url: dat.studio_url,
            }),
        }
    }

    out.sort_by(|a, b| a.manifest.id.cmp(&b.manifest.id));
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn dung_thiet_ke(root: &Path, id: &str, json: &str, build: bool) {
        let d = root.join("client").join("designs").join(id);
        fs::create_dir_all(&d).unwrap();
        fs::write(d.join("design.json"), json).unwrap();
        if build {
            fs::create_dir_all(d.join("dist")).unwrap();
            fs::write(d.join("dist").join("index.html"), "<!doctype html>").unwrap();
        }
    }

    #[test]
    fn doc_manifest_day_du_gia_tri_mac_dinh() {
        let d = tempfile::tempdir().unwrap();
        dung_thiet_ke(d.path(), "ke-chuyen", r#"{"id":"ke-chuyen","name":"Phòng kể chuyện"}"#, true);
        let l = Layout::new(d.path());
        let m = read_manifest(&l.design_manifest("ke-chuyen"), "ke-chuyen").unwrap();
        assert_eq!(m.version, "1.0.0");
        assert_eq!(m.canvas, Canvas { width: 1080, height: 1920 });
        assert_eq!(m.entry, "dist/index.html");
        assert!(m.slots.is_empty());
    }

    #[test]
    fn id_khac_ten_thu_muc_bi_tu_choi() {
        let d = tempfile::tempdir().unwrap();
        dung_thiet_ke(d.path(), "ke-chuyen", r#"{"id":"hip-hop","name":"x"}"#, true);
        let l = Layout::new(d.path());
        let e = read_manifest(&l.design_manifest("ke-chuyen"), "ke-chuyen").unwrap_err();
        assert!(e.contains("khác tên thư mục"), "{e}");
    }

    #[test]
    fn id_sai_dang_bi_tu_choi() {
        let d = tempfile::tempdir().unwrap();
        dung_thiet_ke(d.path(), "ke-chuyen", r#"{"id":"Ke Chuyen","name":"x"}"#, true);
        let l = Layout::new(d.path());
        assert!(read_manifest(&l.design_manifest("ke-chuyen"), "ke-chuyen").is_err());
    }

    #[test]
    fn chua_build_thi_bao_loi_chu_khong_bien_mat() {
        let d = tempfile::tempdir().unwrap();
        dung_thiet_ke(d.path(), "ke-chuyen", r#"{"id":"ke-chuyen","name":"Phòng kể chuyện"}"#, false);
        let ds = scan(&Layout::new(d.path()), 47830, None);
        assert_eq!(ds.len(), 1);
        assert_eq!(ds[0].status, DesignStatus::Error);
        assert!(ds[0].problem.as_deref().unwrap().contains("chưa build"));
    }

    #[test]
    fn danh_dau_thiet_ke_dang_phat() {
        let d = tempfile::tempdir().unwrap();
        dung_thiet_ke(d.path(), "ke-chuyen", r#"{"id":"ke-chuyen","name":"A"}"#, true);
        dung_thiet_ke(d.path(), "hip-hop", r#"{"id":"hip-hop","name":"B"}"#, true);
        let ds = scan(&Layout::new(d.path()), 47830, Some("hip-hop"));
        let hip = ds.iter().find(|x| x.manifest.id == "hip-hop").unwrap();
        let ke = ds.iter().find(|x| x.manifest.id == "ke-chuyen").unwrap();
        assert_eq!(hip.status, DesignStatus::Live);
        assert_eq!(ke.status, DesignStatus::Off);
    }

    #[test]
    fn url_obs_tro_dung_thiet_ke() {
        let d = tempfile::tempdir().unwrap();
        dung_thiet_ke(d.path(), "ke-chuyen", r#"{"id":"ke-chuyen","name":"A"}"#, true);
        let ds = scan(&Layout::new(d.path()), 47830, None);
        assert_eq!(ds[0].obs_url, "http://127.0.0.1:47830/d/ke-chuyen/");
    }

    #[test]
    fn design_json_hong_van_liet_ke_kem_ly_do() {
        let d = tempfile::tempdir().unwrap();
        dung_thiet_ke(d.path(), "ke-chuyen", "{ hỏng", true);
        let ds = scan(&Layout::new(d.path()), 47830, None);
        assert_eq!(ds.len(), 1);
        assert_eq!(ds[0].status, DesignStatus::Error);
        assert!(ds[0].problem.as_deref().unwrap().contains("hỏng"));
    }

    #[test]
    fn thu_muc_khong_co_manifest_thi_bo_qua() {
        let d = tempfile::tempdir().unwrap();
        fs::create_dir_all(d.path().join("client").join("designs").join("rac")).unwrap();
        assert!(scan(&Layout::new(d.path()), 47830, None).is_empty());
    }
}
