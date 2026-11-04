//! Kho khoá API.
//!
//! Khoá nằm ở `database/secrets.json`, **chỉ backend đọc**. Client gửi tên nhà
//! cung cấp, backend tự gắn khoá rồi gọi đi. Bản cũ làm ngược: khoá nằm ở
//! `localStorage` của trình duyệt rồi truyền kèm mỗi lần gọi — ai mở DevTools
//! trên máy đang live cũng lấy được.
//!
//! Ở đây không bao giờ trả giá trị khoá ra ngoài, kể cả cho trang quản lý. Trang
//! quản lý chỉ cần biết "nhà này đã có khoá hay chưa".

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::paths::{valid_label, Layout};
use crate::store::{self, StoreError};

/// Khoá dài hơn mức này là dán nhầm cả đoạn văn bản.
const MAX_KEY: usize = 300;
const MAX_URL: usize = 200;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderKind {
    /// Giao thức kiểu OpenAI: `POST {base}/audio/speech`, khoá ở `Authorization`.
    /// VieNeu, OpenAI và 9router chạy trên máy đều theo kiểu này.
    Openai,
    /// ElevenLabs: khoá ở header `xi-api-key`, giọng nằm trong đường dẫn.
    Elevenlabs,
    /// Anthropic Messages API cho MC. Khoá ở header `x-api-key`.
    Anthropic,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Provider {
    pub kind: ProviderKind,
    #[serde(rename = "baseUrl", default, skip_serializing_if = "String::is_empty")]
    pub base_url: String,
    /// Giá trị thật. KHÔNG BAO GIỜ gửi ra ngoài backend.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub key: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub model: String,
}

/// Bản công khai: đủ để trang quản lý vẽ, không có gì bí mật.
#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct ProviderInfo {
    pub id: String,
    pub kind: ProviderKind,
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    pub model: String,
    #[serde(rename = "hasKey")]
    pub has_key: bool,
}

#[derive(Debug)]
pub enum SecretError {
    Invalid(String),
    Store(StoreError),
}

impl From<StoreError> for SecretError {
    fn from(e: StoreError) -> Self {
        Self::Store(e)
    }
}

type Kho = BTreeMap<String, Provider>;

fn doc(layout: &Layout) -> Kho {
    match store::read_json(&layout.secrets_file()) {
        Ok(Some(v)) => serde_json::from_value(v).unwrap_or_default(),
        _ => Kho::new(),
    }
}

/// Danh sách nhà cung cấp, **không kèm khoá**.
pub fn list(layout: &Layout) -> Vec<ProviderInfo> {
    doc(layout)
        .into_iter()
        .map(|(id, p)| ProviderInfo {
            id,
            kind: p.kind,
            base_url: p.base_url,
            model: p.model,
            has_key: !p.key.is_empty(),
        })
        .collect()
}

/// Lấy một nhà cung cấp kèm khoá. Chỉ dùng trong backend.
pub fn get(layout: &Layout, id: &str) -> Option<Provider> {
    doc(layout).remove(id)
}

pub fn set(layout: &Layout, id: &str, than: &Value) -> Result<ProviderInfo, SecretError> {
    if !valid_label(id) {
        return Err(SecretError::Invalid(format!("id nhà cung cấp \"{id}\" sai định dạng")));
    }
    let moi: Provider = serde_json::from_value(than.clone())
        .map_err(|e| SecretError::Invalid(format!("thiếu hoặc sai trường: {e}")))?;

    kiem_khoa(&moi.key)?;
    if !moi.base_url.is_empty() {
        kiem_base(&moi.base_url)?;
    }
    if moi.model.chars().count() > 80 {
        return Err(SecretError::Invalid("tên model quá dài".into()));
    }

    let mut kho = doc(layout);
    // Khoá rỗng nghĩa là "giữ khoá cũ": trang quản lý không đọc được khoá nên
    // không gửi lại được, mà người dùng vẫn phải sửa được baseUrl hay model.
    let giu = kho.get(id).map(|c| c.key.clone()).unwrap_or_default();
    let p = Provider {
        key: if moi.key.is_empty() { giu } else { moi.key },
        ..moi
    };
    let co_khoa = !p.key.is_empty();
    let info = ProviderInfo {
        id: id.to_string(),
        kind: p.kind,
        base_url: p.base_url.clone(),
        model: p.model.clone(),
        has_key: co_khoa,
    };
    kho.insert(id.to_string(), p);
    store::write_json_atomic(&layout.secrets_file(), &serde_json::to_value(&kho).unwrap())?;
    Ok(info)
}

pub fn remove(layout: &Layout, id: &str) -> Result<bool, SecretError> {
    let mut kho = doc(layout);
    let co = kho.remove(id).is_some();
    if co {
        store::write_json_atomic(&layout.secrets_file(), &serde_json::to_value(&kho).unwrap())?;
    }
    Ok(co)
}

fn kiem_khoa(k: &str) -> Result<(), SecretError> {
    if k.chars().count() > MAX_KEY {
        return Err(SecretError::Invalid("khoá quá dài".into()));
    }
    // Khoá dính khoảng trắng gần như luôn là dán nhầm cả dòng; báo sớm còn hơn
    // để người dùng ngồi đoán vì sao nhà cung cấp trả 401.
    if k.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return Err(SecretError::Invalid("khoá có khoảng trắng hoặc ký tự lạ".into()));
    }
    Ok(())
}

/// Địa chỉ nhà cung cấp phải là HTTPS, trừ khi nó chạy ngay trên máy này.
///
/// Giữ nguyên luật của bản cũ: chặn userinfo (`user:pass@`) và chuỗi truy vấn,
/// vì cả hai đều là đường để giấu một địa chỉ khác vào chỗ trông như hợp lệ.
pub fn kiem_base(u: &str) -> Result<String, SecretError> {
    let loi = |m: &str| SecretError::Invalid(m.to_string());
    if u.chars().count() > MAX_URL {
        return Err(loi("địa chỉ quá dài"));
    }
    if u.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return Err(loi("địa chỉ có ký tự lạ"));
    }
    let t = u.trim_end_matches('/');
    let (sau, la_https) = match (t.strip_prefix("https://"), t.strip_prefix("http://")) {
        (Some(s), _) => (s, true),
        (_, Some(s)) => (s, false),
        _ => return Err(loi("địa chỉ phải bắt đầu bằng http:// hoặc https://")),
    };
    if sau.contains('@') {
        return Err(loi("địa chỉ không được chứa tên đăng nhập"));
    }
    if sau.contains('?') || sau.contains('#') {
        return Err(loi("địa chỉ không được kèm tham số"));
    }
    let host = sau.split('/').next().unwrap_or("");
    let chi_may_nay = matches!(
        host.split(':').next().unwrap_or(""),
        "localhost" | "127.0.0.1" | "[::1]"
    );
    if !la_https && !chi_may_nay {
        return Err(loi("chỉ nhận http:// khi nhà cung cấp chạy ngay trên máy này"));
    }
    if host.is_empty() {
        return Err(loi("địa chỉ thiếu tên máy"));
    }
    Ok(t.to_string())
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
        assert!(list(&l).is_empty());
    }

    #[test]
    fn dat_roi_doc_lai_duoc_nhung_khong_lo_khoa() {
        let (_d, l) = moi();
        let info = set(
            &l,
            "vieneu",
            &json!({ "kind": "openai", "baseUrl": "https://api.vieneu.io/api/v1", "key": "sk-bi-mat" }),
        )
        .unwrap();
        assert!(info.has_key);

        let ds = list(&l);
        assert_eq!(ds.len(), 1);
        assert!(ds[0].has_key);
        // Bản công khai không được có khoá ở bất kỳ đâu.
        let j = serde_json::to_string(&ds).unwrap();
        assert!(!j.contains("sk-bi-mat"), "khoá lọt ra bản công khai: {j}");

        assert_eq!(get(&l, "vieneu").unwrap().key, "sk-bi-mat", "backend vẫn đọc được");
    }

    #[test]
    fn sua_dia_chi_ma_khong_phai_nhap_lai_khoa() {
        let (_d, l) = moi();
        set(&l, "vieneu", &json!({ "kind": "openai", "key": "sk-1" })).unwrap();
        set(
            &l,
            "vieneu",
            &json!({ "kind": "openai", "baseUrl": "https://api.vieneu.io/api/v1" }),
        )
        .unwrap();
        let p = get(&l, "vieneu").unwrap();
        assert_eq!(p.key, "sk-1", "khoá cũ phải được giữ");
        assert_eq!(p.base_url, "https://api.vieneu.io/api/v1");
    }

    #[test]
    fn xoa_duoc_nha_cung_cap() {
        let (_d, l) = moi();
        set(&l, "vieneu", &json!({ "kind": "openai", "key": "sk-1" })).unwrap();
        assert!(remove(&l, "vieneu").unwrap());
        assert!(list(&l).is_empty());
        assert!(!remove(&l, "vieneu").unwrap(), "xoá cái không có thì báo là không có");
    }

    #[test]
    fn khoa_dinh_khoang_trang_bi_tu_choi() {
        let (_d, l) = moi();
        for k in ["sk ab", "sk\nab", &"x".repeat(301)] {
            let kq = set(&l, "vieneu", &json!({ "kind": "openai", "key": k }));
            assert!(matches!(kq, Err(SecretError::Invalid(_))), "phải chặn: {k:?}");
        }
    }

    #[test]
    fn id_sai_dinh_dang_bi_tu_choi() {
        let (_d, l) = moi();
        assert!(set(&l, "Vie Neu", &json!({ "kind": "openai", "key": "x" })).is_err());
    }

    #[test]
    fn ten_nha_bat_dau_bang_so_van_duoc() {
        // "9router" là tên thật của một nhà cung cấp.
        let (_d, l) = moi();
        assert!(set(&l, "9router", &json!({ "kind": "openai", "key": "x" })).is_ok());
    }

    #[test]
    fn dia_chi_https_thi_nhan() {
        for u in ["https://api.vieneu.io/api/v1", "https://api.openai.com/v1/"] {
            assert!(kiem_base(u).is_ok(), "phải nhận: {u}");
        }
        assert_eq!(kiem_base("https://a.b/v1/").unwrap(), "https://a.b/v1", "cắt gạch cuối");
    }

    #[test]
    fn http_chi_nhan_khi_chay_tren_may_nay() {
        assert!(kiem_base("http://localhost:20128/v1").is_ok());
        assert!(kiem_base("http://127.0.0.1:20128/v1").is_ok());
        assert!(kiem_base("http://api.ke-gian.example/v1").is_err());
    }

    #[test]
    fn chan_dia_chi_giau_may_khac() {
        for u in [
            "https://api.vieneu.io@ke-gian.example/v1",
            "https://ke-gian.example/v1?key=x",
            "ftp://a.b/v1",
            "https://",
            "https://a.b /v1",
        ] {
            assert!(kiem_base(u).is_err(), "phải chặn: {u}");
        }
    }
}
