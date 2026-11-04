//! Cài đặt của người vận hành cho từng thiết kế: tên hiện trên thẻ và link
//! TikTok LIVE Studio.
//!
//! Cố ý KHÔNG ghi vào `design.json` — file đó thuộc bản thiết kế, do người viết
//! thiết kế quản và được commit. Người vận hành đổi tên phòng là việc của họ,
//! không được làm bẩn mã nguồn thiết kế.

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::paths::Layout;
use crate::store::{self, StoreError};

/// Tên dài hơn mức này thì tràn thẻ, không phải nhu cầu thật.
const MAX_NAME_CHARS: usize = 80;

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct Settings {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default, rename = "studioUrl", skip_serializing_if = "Option::is_none")]
    pub studio_url: Option<String>,
}

#[derive(Debug)]
pub enum SettingsError {
    /// Dữ liệu người dùng gửi sai — trả lại kèm lý do cụ thể, không im lặng sửa.
    Invalid(String),
    Store(StoreError),
}

impl From<StoreError> for SettingsError {
    fn from(e: StoreError) -> Self {
        Self::Store(e)
    }
}

/// Đọc cài đặt. File chưa có hoặc hỏng thì coi như chưa đặt gì — trang quản lý
/// vẫn mở được, tên lấy từ manifest.
pub fn read(layout: &Layout, design_id: &str) -> Settings {
    match store::read_json(&layout.settings_file(design_id)) {
        Ok(Some(v)) => serde_json::from_value(v).unwrap_or_default(),
        _ => Settings::default(),
    }
}

/// Áp một bản vá. Khoá có mặt thì đổi, `null` thì xoá, khoá vắng thì giữ nguyên.
pub fn apply(layout: &Layout, design_id: &str, patch: &Value) -> Result<Settings, SettingsError> {
    let Some(obj) = patch.as_object() else {
        return Err(SettingsError::Invalid(
            "thân yêu cầu phải là một object".into(),
        ));
    };

    let mut s = read(layout, design_id);

    if let Some(v) = obj.get("name") {
        s.name = match v {
            Value::Null => None,
            Value::String(x) => Some(kiem_ten(x)?),
            _ => {
                return Err(SettingsError::Invalid(
                    "name phải là chuỗi hoặc null".into(),
                ))
            }
        };
    }

    if let Some(v) = obj.get("studioUrl") {
        s.studio_url = match v {
            Value::Null => None,
            Value::String(x) if x.trim().is_empty() => None,
            Value::String(x) => Some(kiem_studio_url(x.trim())?),
            _ => {
                return Err(SettingsError::Invalid(
                    "studioUrl phải là chuỗi hoặc null".into(),
                ))
            }
        };
    }

    store::write_json_atomic(
        &layout.settings_file(design_id),
        &serde_json::to_value(&s).unwrap(),
    )?;
    Ok(s)
}

fn kiem_ten(x: &str) -> Result<String, SettingsError> {
    let t = x.trim();
    if t.is_empty() {
        return Err(SettingsError::Invalid("tên không được để trống".into()));
    }
    if t.chars().count() > MAX_NAME_CHARS {
        return Err(SettingsError::Invalid(format!(
            "tên quá {MAX_NAME_CHARS} ký tự"
        )));
    }
    // Ký tự điều khiển lọt vào tên sẽ làm xuống dòng giữa thẻ và giữa log.
    if t.chars().any(char::is_control) {
        return Err(SettingsError::Invalid("tên có ký tự điều khiển".into()));
    }
    Ok(t.to_string())
}

/// Chỉ nhận link TikTok qua HTTPS.
///
/// Trang quản lý mở link này trong webview của app, nơi đã có cookie đăng nhập
/// TikTok. Cho một link bất kỳ là để trang ngoài chạy trong ngữ cảnh đó.
/// Giữ đúng tinh thần whitelist của `tiktok_navigate` trong mã cũ.
fn kiem_studio_url(x: &str) -> Result<String, SettingsError> {
    let loi = |m: &str| SettingsError::Invalid(m.to_string());

    if x.chars()
        .any(|c| c.is_whitespace() || c.is_control() || c == '\\')
    {
        return Err(loi("địa chỉ có ký tự không hợp lệ"));
    }
    let thap = x.to_ascii_lowercase();
    let Some(sau) = thap.strip_prefix("https://") else {
        return Err(loi("địa chỉ phải bắt đầu bằng https://"));
    };

    let phan_chu = sau.split(['/', '?', '#']).next().unwrap_or("");
    // Lấy phần SAU dấu @ cuối cùng: "https://tiktok.com@ke-gian.example/" thì máy
    // thật là ke-gian.example, không phải tiktok.com.
    let host = phan_chu.rsplit('@').next().unwrap_or("");
    let host = host.split(':').next().unwrap_or("");

    if host == "tiktok.com" || host.ends_with(".tiktok.com") {
        Ok(x.to_string())
    } else {
        Err(loi("chỉ nhận địa chỉ thuộc tiktok.com"))
    }
}

/// Xoá dữ liệu phiên của một thiết kế. Trả về tên những file đã xoá thật.
///
/// KHÔNG đụng `config.json` (cấu hình module) và KHÔNG đụng sổ quà — sổ quà chỉ
/// thêm, không xoá, vì nó là căn cứ đối soát.
pub fn reset(layout: &Layout, design_id: &str) -> Result<Vec<String>, StoreError> {
    let mut da_xoa = Vec::new();
    let p = layout.session_file(design_id);
    match std::fs::remove_file(&p) {
        Ok(()) => da_xoa.push("session.json".to_string()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
        Err(e) => return Err(StoreError::Io(e)),
    }
    Ok(da_xoa)
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
    fn chua_dat_gi_thi_rong() {
        let (_d, l) = moi();
        assert_eq!(read(&l, "ke-chuyen"), Settings::default());
    }

    #[test]
    fn doi_ten_roi_doc_lai_duoc() {
        let (_d, l) = moi();
        apply(
            &l,
            "ke-chuyen",
            &json!({ "name": "  Phòng kể chuyện đêm  " }),
        )
        .unwrap();
        assert_eq!(
            read(&l, "ke-chuyen").name.as_deref(),
            Some("Phòng kể chuyện đêm")
        );
    }

    #[test]
    fn va_mot_khoa_khong_lam_mat_khoa_kia() {
        let (_d, l) = moi();
        apply(&l, "ke-chuyen", &json!({ "name": "Phòng A" })).unwrap();
        apply(
            &l,
            "ke-chuyen",
            &json!({ "studioUrl": "https://livestudio.tiktok.com/room/9" }),
        )
        .unwrap();
        let s = read(&l, "ke-chuyen");
        assert_eq!(s.name.as_deref(), Some("Phòng A"));
        assert!(s.studio_url.is_some());
    }

    #[test]
    fn null_thi_xoa() {
        let (_d, l) = moi();
        apply(&l, "ke-chuyen", &json!({ "name": "Phòng A" })).unwrap();
        apply(&l, "ke-chuyen", &json!({ "name": null })).unwrap();
        assert!(read(&l, "ke-chuyen").name.is_none());
    }

    #[test]
    fn moi_thiet_ke_giu_cai_dat_rieng() {
        let (_d, l) = moi();
        apply(&l, "ke-chuyen", &json!({ "name": "A" })).unwrap();
        apply(&l, "hip-hop", &json!({ "name": "B" })).unwrap();
        assert_eq!(read(&l, "ke-chuyen").name.as_deref(), Some("A"));
        assert_eq!(read(&l, "hip-hop").name.as_deref(), Some("B"));
    }

    #[test]
    fn ten_rong_hoac_qua_dai_bi_tu_choi() {
        let (_d, l) = moi();
        for x in [json!({ "name": "   " }), json!({ "name": "a".repeat(81) })] {
            assert!(
                matches!(apply(&l, "ke-chuyen", &x), Err(SettingsError::Invalid(_))),
                "{x}"
            );
        }
    }

    #[test]
    fn ten_co_ky_tu_dieu_khien_bi_tu_choi() {
        let (_d, l) = moi();
        let kq = apply(&l, "ke-chuyen", &json!({ "name": "Phòng\nA" }));
        assert!(matches!(kq, Err(SettingsError::Invalid(_))));
    }

    #[test]
    fn nhan_dia_chi_tiktok_qua_https() {
        for x in [
            "https://livestudio.tiktok.com",
            "https://livestudio.tiktok.com/room/42?x=1",
            "https://tiktok.com/live/dashboard",
            "https://www.tiktok.com:443/live",
        ] {
            assert!(kiem_studio_url(x).is_ok(), "phải nhận: {x}");
        }
    }

    #[test]
    fn chan_dia_chi_khong_phai_tiktok() {
        for x in [
            "http://livestudio.tiktok.com",
            "https://ke-gian.example/live",
            "https://tiktok.com.ke-gian.example/live",
            "https://nottiktok.com",
            // Dạng userinfo: máy thật là ke-gian.example.
            "https://livestudio.tiktok.com@ke-gian.example/",
            "javascript:alert(1)",
            "https://tiktok.com\\@ke-gian.example",
            "https:// tiktok.com",
        ] {
            assert!(kiem_studio_url(x).is_err(), "phải chặn: {x}");
        }
    }

    #[test]
    fn reset_xoa_phien_nhung_giu_cau_hinh() {
        let (_d, l) = moi();
        store::write_json_atomic(
            &l.config_file("ke-chuyen"),
            &json!({ "modules": { "a": {} } }),
        )
        .unwrap();
        store::write_json_atomic(
            &l.session_file("ke-chuyen"),
            &json!({ "totals": { "xu": 9 } }),
        )
        .unwrap();

        let da_xoa = reset(&l, "ke-chuyen").unwrap();
        assert_eq!(da_xoa, vec!["session.json".to_string()]);
        assert!(!l.session_file("ke-chuyen").exists());
        assert!(
            l.config_file("ke-chuyen").exists(),
            "cấu hình module phải còn"
        );
    }

    #[test]
    fn reset_khi_chua_co_phien_thi_khong_phai_loi() {
        let (_d, l) = moi();
        assert_eq!(reset(&l, "ke-chuyen").unwrap(), Vec::<String>::new());
    }
}
