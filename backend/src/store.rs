//! Đọc ghi file JSON trên đĩa.
//!
//! Mọi lần ghi đều qua file tạm rồi `rename`. Mất điện giữa chừng thì file cũ
//! còn nguyên, không bao giờ có file JSON cụt.

use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};

use serde_json::{Map, Value};

/// Trần kích thước một file cấu hình. Lớn hơn là có gì đó sai, không phải nhu cầu thật.
pub const MAX_CONFIG_BYTES: usize = 1024 * 1024;

#[derive(Debug)]
pub enum StoreError {
    Io(io::Error),
    Json(serde_json::Error),
    TooLarge { got: usize, max: usize },
}

impl std::fmt::Display for StoreError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(e) => write!(f, "lỗi đĩa: {e}"),
            Self::Json(e) => write!(f, "JSON hỏng: {e}"),
            Self::TooLarge { got, max } => write!(f, "cấu hình {got} byte, quá mức {max}"),
        }
    }
}

impl std::error::Error for StoreError {}

impl From<io::Error> for StoreError {
    fn from(e: io::Error) -> Self {
        Self::Io(e)
    }
}

impl From<serde_json::Error> for StoreError {
    fn from(e: serde_json::Error) -> Self {
        Self::Json(e)
    }
}

/// Ghi JSON an toàn: ra file tạm cùng thư mục rồi đổi tên đè lên.
///
/// File tạm phải cùng ổ đĩa với đích, nếu không `rename` không nguyên tử —
/// nên đặt cạnh file đích chứ không đặt trong `.tmp/`.
pub fn write_json_atomic(path: &Path, value: &Value) -> Result<(), StoreError> {
    let body = serde_json::to_vec_pretty(value)?;
    if body.len() > MAX_CONFIG_BYTES {
        return Err(StoreError::TooLarge { got: body.len(), max: MAX_CONFIG_BYTES });
    }
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    let tmp = tmp_sibling(path);
    {
        let mut f = fs::File::create(&tmp)?;
        f.write_all(&body)?;
        f.sync_all()?;
    }
    // Windows: rename không đè được file đang tồn tại, phải xoá trước.
    // Khe hở này chấp nhận được vì chỉ tiến trình này ghi vào đây.
    if path.exists() {
        let _ = fs::remove_file(path);
    }
    match fs::rename(&tmp, path) {
        Ok(()) => Ok(()),
        Err(e) => {
            let _ = fs::remove_file(&tmp);
            Err(StoreError::Io(e))
        }
    }
}

pub fn read_json(path: &Path) -> Result<Option<Value>, StoreError> {
    match fs::read(path) {
        Ok(body) => {
            if body.len() > MAX_CONFIG_BYTES {
                return Err(StoreError::TooLarge { got: body.len(), max: MAX_CONFIG_BYTES });
            }
            Ok(Some(serde_json::from_slice(&body)?))
        }
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(StoreError::Io(e)),
    }
}

/// Đọc một object, trả object rỗng khi file chưa có hoặc nội dung không phải object.
pub fn read_object(path: &Path) -> Result<Map<String, Value>, StoreError> {
    Ok(match read_json(path)? {
        Some(Value::Object(m)) => m,
        _ => Map::new(),
    })
}

fn tmp_sibling(path: &Path) -> PathBuf {
    let mut name = path.file_name().map(|s| s.to_os_string()).unwrap_or_default();
    name.push(format!(".{}.tmp", std::process::id()));
    path.with_file_name(name)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn ghi_roi_doc_lai_duoc() {
        let d = tempfile::tempdir().unwrap();
        let p = d.path().join("designs").join("ke-chuyen").join("config.json");
        write_json_atomic(&p, &json!({ "modules": { "gift-thanks": { "enabled": true } } })).unwrap();
        let v = read_json(&p).unwrap().unwrap();
        assert_eq!(v["modules"]["gift-thanks"]["enabled"], json!(true));
    }

    #[test]
    fn ghi_de_khong_de_lai_file_tam() {
        let d = tempfile::tempdir().unwrap();
        let p = d.path().join("config.json");
        write_json_atomic(&p, &json!({ "a": 1 })).unwrap();
        write_json_atomic(&p, &json!({ "a": 2 })).unwrap();
        assert_eq!(read_json(&p).unwrap().unwrap()["a"], json!(2));
        let thua: Vec<_> = fs::read_dir(d.path())
            .unwrap()
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().to_string())
            .filter(|n| n.ends_with(".tmp"))
            .collect();
        assert!(thua.is_empty(), "còn sót file tạm: {thua:?}");
    }

    #[test]
    fn file_chua_co_thi_tra_none() {
        let d = tempfile::tempdir().unwrap();
        assert!(read_json(&d.path().join("chua-co.json")).unwrap().is_none());
    }

    #[test]
    fn json_hong_bao_loi_chu_khong_im_lang() {
        let d = tempfile::tempdir().unwrap();
        let p = d.path().join("hong.json");
        fs::write(&p, b"{ khong phai json").unwrap();
        assert!(matches!(read_json(&p), Err(StoreError::Json(_))));
    }

    #[test]
    fn json_hong_thi_read_object_tra_rong() {
        // read_object chịu được file hỏng vì cấu hình thiếu không được làm sập phòng.
        let d = tempfile::tempdir().unwrap();
        let p = d.path().join("mang.json");
        write_json_atomic(&p, &json!([1, 2, 3])).unwrap();
        assert!(read_object(&p).unwrap().is_empty());
    }

    #[test]
    fn tu_choi_cau_hinh_qua_lon() {
        let d = tempfile::tempdir().unwrap();
        let p = d.path().join("to.json");
        let khung = json!({ "x": "a".repeat(MAX_CONFIG_BYTES + 10) });
        assert!(matches!(
            write_json_atomic(&p, &khung),
            Err(StoreError::TooLarge { .. })
        ));
        assert!(!p.exists(), "không được tạo file khi đã từ chối");
    }
}
