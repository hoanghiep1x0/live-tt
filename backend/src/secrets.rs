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
const MAX_KEY: usize = 4000;
const MAX_URL: usize = 500;

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

/// Loại việc một kết nối làm được. Trang quản lý chia tab theo đây, và mỗi
/// tính năng chỉ được chọn kết nối có đúng loại nó cần.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Use {
    Chat,
    Tts,
    Image,
    Video,
}

impl Use {
    pub const MOI: [Use; 4] = [Use::Chat, Use::Tts, Use::Image, Use::Video];

    pub fn ten(self) -> &'static str {
        match self {
            Use::Chat => "chat",
            Use::Tts => "tts",
            Use::Image => "image",
            Use::Video => "video",
        }
    }
}

/// Kho cũ chưa có `uses`: đoán theo giao thức, đúng như cách các tính năng đã
/// dùng nó trước giờ. Nhờ vậy nâng cấp xong mọi thứ chạy y như cũ.
fn uses_theo_kieu(kind: ProviderKind) -> Vec<Use> {
    match kind {
        ProviderKind::Anthropic => vec![Use::Chat],
        ProviderKind::Elevenlabs => vec![Use::Tts],
        ProviderKind::Openai => vec![Use::Chat, Use::Tts, Use::Image],
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Provider {
    pub kind: ProviderKind,
    /// Tên hiển thị, đúng như người vận hành gõ ("MC"). Id trong kho là bản
    /// nắn của nó ("mc") để code gọi; rỗng là kho cũ — hiển thị bằng id.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub name: String,
    #[serde(rename = "baseUrl", default, skip_serializing_if = "String::is_empty")]
    pub base_url: String,
    /// Giá trị thật. KHÔNG BAO GIỜ gửi ra ngoài backend.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub key: String,
    /// Model chung của bản cũ. Còn giữ để kho cũ đọc được; loại nào chưa có
    /// model riêng trong `models` thì rơi về đây.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub model: String,
    /// Kết nối này dùng cho những loại việc nào. Rỗng là kho cũ — đoán theo
    /// giao thức, xem [`Provider::cac_loai`].
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub uses: Vec<Use>,
    /// Model mặc định theo từng loại: một khoá OpenAI nhập một lần, chat dùng
    /// `gpt-4o-mini`, vẽ ảnh dùng `gpt-image-1`.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub models: BTreeMap<Use, String>,
}

impl Provider {
    /// Loại việc kết nối này làm được, kể cả với kho cũ chưa khai.
    pub fn cac_loai(&self) -> Vec<Use> {
        if self.uses.is_empty() {
            uses_theo_kieu(self.kind)
        } else {
            self.uses.clone()
        }
    }

    pub fn dung_duoc(&self, u: Use) -> bool {
        self.cac_loai().contains(&u)
    }

    /// Model mặc định cho một loại: riêng của loại đó trước, rồi model chung.
    pub fn model_cho(&self, u: Use) -> &str {
        match self.models.get(&u).map(|m| m.trim()) {
            Some(m) if !m.is_empty() => m,
            _ => self.model.trim(),
        }
    }
}

/// Bản công khai: đủ để trang quản lý vẽ, không có gì bí mật.
#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub kind: ProviderKind,
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    pub model: String,
    pub uses: Vec<Use>,
    pub models: BTreeMap<Use, String>,
    #[serde(rename = "hasKey")]
    pub has_key: bool,
}

/// Bản cho sân khấu: còn ít hơn nữa — không địa chỉ, chỉ đủ để chọn trong
/// danh sách. Trang sân khấu chạy trong OBS, không có token.
#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct ProviderPublic {
    pub id: String,
    pub name: String,
    pub kind: ProviderKind,
    /// Địa chỉ nhà cung cấp. KHÔNG phải bí mật — bảng xem thử cần nó để mở lại
    /// một kết nối cũ mà không bắt người vận hành gõ lại địa chỉ. Khoá thì vẫn
    /// không bao giờ ra khỏi máy chủ.
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    pub uses: Vec<Use>,
    pub models: BTreeMap<Use, String>,
    #[serde(rename = "hasKey")]
    pub has_key: bool,
}

fn thong_tin(id: String, p: &Provider) -> ProviderInfo {
    // Model của từng loại điền đủ, kể cả loại chỉ đang rơi về model chung, để
    // trang quản lý hiện đúng thứ sẽ được dùng.
    let models = p
        .cac_loai()
        .into_iter()
        .filter_map(|u| {
            let m = p.model_cho(u);
            (!m.is_empty()).then(|| (u, m.to_string()))
        })
        .collect();
    ProviderInfo {
        name: if p.name.is_empty() { id.clone() } else { p.name.clone() },
        id,
        kind: p.kind,
        base_url: p.base_url.clone(),
        model: p.model.clone(),
        uses: p.cac_loai(),
        models,
        has_key: !p.key.is_empty(),
    }
}

/// Danh sách cho sân khấu.
pub fn list_public(layout: &Layout) -> Vec<ProviderPublic> {
    list(layout)
        .into_iter()
        .map(|i| ProviderPublic {
            id: i.id,
            name: i.name,
            kind: i.kind,
            base_url: i.base_url,
            uses: i.uses,
            models: i.models,
            has_key: i.has_key,
        })
        .collect()
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
    let mut kho: Kho = match store::read_json(&layout.secrets_file()) {
        Ok(Some(v)) => serde_json::from_value(v).unwrap_or_default(),
        _ => Kho::new(),
    };
    // Nắn địa chỉ ngay lúc đọc, không chỉ lúc ghi: người vận hành dán nguyên
    // endpoint (`…/v1/audio/speech`, `…/v1/messages`) là đúng theo tài liệu
    // của nhà cung cấp, và mọi chỗ gọi API (MC, viết, vẽ ảnh, giọng đọc) đều
    // đọc kho qua đây — kể cả kết nối đã lưu từ bản cũ chưa biết nắn.
    for p in kho.values_mut() {
        p.base_url = chuan_base(p.kind, &p.base_url);
    }
    kho
}

/// Địa chỉ gốc mà backend nối đường dẫn của từng việc vào. Địa chỉ hỏng thì
/// giữ nguyên để lúc gọi báo lỗi rõ, không lặng lẽ thay bằng thứ khác.
fn chuan_base(kind: ProviderKind, u: &str) -> String {
    if u.trim().is_empty() {
        return String::new();
    }
    kiem_base(u).map_or_else(|_| u.to_string(), |b| bo_duoi_endpoint(kind, &b))
}

/// Danh sách nhà cung cấp, **không kèm khoá**.
pub fn list(layout: &Layout) -> Vec<ProviderInfo> {
    doc(layout).into_iter().map(|(id, p)| thong_tin(id, &p)).collect()
}

/// Lấy một nhà cung cấp kèm khoá. Chỉ dùng trong backend.
pub fn get(layout: &Layout, id: &str) -> Option<Provider> {
    doc(layout).remove(id)
}

/// Kết nối cho một việc. Người vận hành đã chọn (`chon`) thì đúng kết nối đó —
/// kể cả khi nó hỏng, để lỗi nói rõ là nó. Để "Mặc định" thì lấy kết nối mang
/// tên mặc định cũ (`cu`, như "mc") nếu còn, không thì kết nối ĐẦU TIÊN trong
/// kho làm được việc này và có khoá. Trước đây "Mặc định" luôn là "mc": kho
/// không có kết nối tên ấy là MC báo lỗi dù kho có sẵn kết nối chat dùng được.
pub fn tim(layout: &Layout, chon: &str, cu: &str, viec: Use) -> Option<(String, Provider)> {
    let mut kho = doc(layout);
    let chon = chon.trim();
    if !chon.is_empty() {
        return kho.remove(chon).map(|p| (chon.to_string(), p));
    }
    if let Some(p) = kho.remove(cu) {
        return Some((cu.to_string(), p));
    }
    kho.into_iter()
        .find(|(_, p)| !p.key.is_empty() && p.cac_loai().contains(&viec))
}

/// Ghi một nhà cung cấp. Người nhập gõ gì cũng nhận: tên, địa chỉ, khoá và
/// model được nắn lại cho dùng được thay vì bắt gõ lại — mỗi nhà cung cấp đặt
/// tên model và đường dẫn một kiểu, đoán trước để chặn chỉ thêm phiền.
pub fn set(layout: &Layout, ten: &str, than: &Value) -> Result<ProviderInfo, SecretError> {
    let id = nan_id(ten);
    if !valid_label(&id) {
        return Err(SecretError::Invalid("tên ngắn cần ít nhất hai chữ hoặc số".into()));
    }
    let id = id.as_str();
    let mut moi: Provider = serde_json::from_value(than.clone())
        .map_err(|e| SecretError::Invalid(format!("thiếu hoặc sai trường: {e}")))?;

    // Khoá không bao giờ có khoảng trắng: dán dính xuống dòng thì bỏ đi.
    moi.key.retain(|c| !c.is_whitespace() && !c.is_control());
    kiem_khoa(&moi.key)?;
    moi.base_url = moi.base_url.trim().to_string();
    if !moi.base_url.is_empty() {
        kiem_base(&moi.base_url)?;
        moi.base_url = chuan_base(moi.kind, &moi.base_url);
    }
    moi.model = moi.model.trim().to_string();
    for m in moi.models.values_mut() {
        *m = m.trim().to_string();
    }

    moi.uses.sort();
    moi.uses.dedup();
    moi.models.retain(|_, m| !m.trim().is_empty());

    let mut kho = doc(layout);
    // Khoá rỗng nghĩa là "giữ khoá cũ": trang quản lý không đọc được khoá nên
    // không gửi lại được, mà người dùng vẫn phải sửa được baseUrl hay model.
    let cu = kho.get(id);
    let giu = cu.map(|c| c.key.clone()).unwrap_or_default();
    // Tên hiển thị: thân gửi kèm thì lấy, không thì giữ tên cũ (trang quản lý
    // sửa theo id), kết nối mới thì lấy đúng chữ người ta gõ.
    let name = match moi.name.trim() {
        "" => cu.map(|c| c.name.clone()).filter(|n| !n.is_empty()).unwrap_or_else(|| ten.trim().to_string()),
        n => n.to_string(),
    };
    let p = Provider {
        key: if moi.key.is_empty() { giu } else { moi.key },
        name,
        ..moi
    };
    let info = thong_tin(id.to_string(), &p);
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
    Ok(())
}

/// Nắn địa chỉ nhà cung cấp về dạng gọi được: cắt khoảng trắng và gạch cuối,
/// thiếu `http(s)://` thì thêm vào (máy này dùng http, máy khác https). Chỉ
/// từ chối thứ không thể là một địa chỉ.
pub fn kiem_base(u: &str) -> Result<String, SecretError> {
    let loi = |m: &str| SecretError::Invalid(m.to_string());
    let t = u.trim();
    if t.chars().count() > MAX_URL {
        return Err(loi("địa chỉ quá dài"));
    }
    if t.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return Err(loi("địa chỉ có khoảng trắng ở giữa"));
    }
    let t = if t.starts_with("http://") || t.starts_with("https://") {
        t.trim_end_matches('/').to_string()
    } else if t.contains("://") {
        return Err(loi("địa chỉ phải là http:// hoặc https://"));
    } else {
        let may = t.split(['/', ':']).next().unwrap_or("");
        let la_may_nay = matches!(may, "localhost" | "127.0.0.1" | "[");
        format!("{}://{}", if la_may_nay { "http" } else { "https" }, t.trim_end_matches('/'))
    };
    let sau = t.split_once("://").map_or("", |(_, s)| s);
    if sau.split('/').next().unwrap_or("").is_empty() {
        return Err(loi("địa chỉ thiếu tên máy"));
    }
    Ok(t)
}

/// Tên ngắn gõ kiểu gì cũng được: "MC", "Giọng Bắc", "my_router" đều thành
/// một id chữ thường, số và gạch nối.
fn nan_id(ten: &str) -> String {
    let mut id = String::new();
    for c in ten.trim().chars().flat_map(char::to_lowercase) {
        let c = match c {
            'đ' => 'd',
            c => bo_dau(c),
        };
        if c.is_ascii_alphanumeric() {
            id.push(c);
        } else if !id.is_empty() && !id.ends_with('-') {
            id.push('-');
        }
    }
    let id = id.trim_end_matches('-');
    id.chars().take(32).collect::<String>().trim_end_matches('-').to_string()
}

/// Bỏ dấu tiếng Việt của một chữ thường; chữ khác giữ nguyên.
fn bo_dau(c: char) -> char {
    const NHOM: [(&str, char); 6] = [
        ("àáảãạăằắẳẵặâầấẩẫậ", 'a'),
        ("èéẻẽẹêềếểễệ", 'e'),
        ("ìíỉĩị", 'i'),
        ("òóỏõọôồốổỗộơờớởỡợ", 'o'),
        ("ùúủũụưừứửữự", 'u'),
        ("ỳýỷỹỵ", 'y'),
    ];
    NHOM.iter().find(|(s, _)| s.contains(c)).map_or(c, |&(_, a)| a)
}

/// Người ta hay dán nguyên địa chỉ endpoint (`…/v1/audio/speech`) từ tài liệu
/// của nhà cung cấp, trong khi backend tự nối đuôi đó vào. Cắt đi để khỏi gọi
/// tới `…/audio/speech/audio/speech`.
fn bo_duoi_endpoint(kind: ProviderKind, u: &str) -> String {
    const DUOI: [&str; 3] = ["/audio/speech", "/chat/completions", "/images/generations"];
    let u = DUOI.iter().find_map(|d| u.strip_suffix(d)).unwrap_or(u);
    // Anthropic: backend tự nối `/v1/messages` vào gốc (ai.rs), nên gốc chỉ
    // là tên máy — dán `…/v1/messages` hay `…/v1` đều cắt về đó.
    if kind == ProviderKind::Anthropic {
        let u = u.strip_suffix("/messages").unwrap_or(u);
        return u.strip_suffix("/v1").unwrap_or(u).to_string();
    }
    u.to_string()
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
    fn mac_dinh_la_ket_noi_dau_tien_lam_duoc_viec_co_khoa() {
        let (_d, l) = moi();
        set(&l, "9router", &json!({ "kind": "openai", "uses": ["tts"], "key": "k" })).unwrap();
        set(&l, "claude", &json!({ "kind": "anthropic", "uses": ["chat"], "key": "k" })).unwrap();
        // Không có kết nối "mc" mà kho có kết nối chat: "Mặc định" phải ra nó.
        assert_eq!(tim(&l, "", "mc", Use::Chat).map(|(id, _)| id).as_deref(), Some("claude"));
        assert!(tim(&l, "", "anh", Use::Image).is_none(), "không ai vẽ ảnh được thì không đoán bừa");
        // Đã chọn thì đúng kết nối đó, kể cả khi nó không làm được việc này.
        assert_eq!(tim(&l, "9router", "mc", Use::Chat).map(|(id, _)| id).as_deref(), Some("9router"));
        assert!(tim(&l, "khong-co", "mc", Use::Chat).is_none());
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
    fn dan_nguyen_endpoint_thi_cat_duoi() {
        let (_d, l) = moi();
        let than = json!({ "kind": "openai", "baseUrl": "http://localhost:20128/v1/audio/speech/", "key": "sk-1" });
        set(&l, "mc", &than).unwrap();
        assert_eq!(get(&l, "mc").unwrap().base_url, "http://localhost:20128/v1");
    }

    #[test]
    fn kho_cu_luu_nguyen_endpoint_van_goi_dung() {
        // Kho ghi từ bản chưa biết nắn: địa chỉ còn nguyên đuôi endpoint.
        let (_d, l) = moi();
        let kho = json!({
            "9router": { "kind": "openai", "baseUrl": "http://localhost:20128/v1/audio/speech", "key": "k" },
            "claude": { "kind": "anthropic", "baseUrl": "https://api.anthropic.com/v1/messages", "key": "k" },
        });
        store::write_json_atomic(&l.secrets_file(), &kho).unwrap();
        assert_eq!(get(&l, "9router").unwrap().base_url, "http://localhost:20128/v1");
        assert_eq!(get(&l, "claude").unwrap().base_url, "https://api.anthropic.com");
        assert_eq!(list(&l)[0].base_url, "http://localhost:20128/v1");
    }

    #[test]
    fn anthropic_dan_nguyen_endpoint_thi_cat_ve_ten_may() {
        let (_d, l) = moi();
        for u in ["https://api.anthropic.com/v1/messages", "https://api.anthropic.com/v1/"] {
            set(&l, "claude", &json!({ "kind": "anthropic", "baseUrl": u, "key": "k" })).unwrap();
            assert_eq!(get(&l, "claude").unwrap().base_url, "https://api.anthropic.com", "{u}");
        }
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
    fn kho_cu_chua_khai_loai_thi_doan_theo_giao_thuc() {
        let (_d, l) = moi();
        set(&l, "mc", &json!({ "kind": "anthropic", "key": "k", "model": "claude-x" })).unwrap();
        set(&l, "giong", &json!({ "kind": "elevenlabs", "key": "k" })).unwrap();
        set(&l, "oa", &json!({ "kind": "openai", "key": "k", "model": "gpt-4o-mini" })).unwrap();

        assert_eq!(get(&l, "mc").unwrap().cac_loai(), vec![Use::Chat]);
        assert_eq!(get(&l, "giong").unwrap().cac_loai(), vec![Use::Tts]);
        let oa = get(&l, "oa").unwrap();
        assert_eq!(oa.cac_loai(), vec![Use::Chat, Use::Tts, Use::Image]);
        // Model chung cũ vẫn dùng cho mọi loại, y như trước khi nâng cấp.
        assert_eq!(oa.model_cho(Use::Image), "gpt-4o-mini");
    }

    #[test]
    fn mot_khoa_nhieu_loai_moi_loai_mot_model() {
        let (_d, l) = moi();
        let info = set(
            &l,
            "openai",
            &json!({
                "kind": "openai",
                "key": "sk-1",
                "uses": ["image", "chat", "chat"],
                "models": { "chat": "gpt-4o-mini", "image": "gpt-image-1", "tts": "  " }
            }),
        )
        .unwrap();
        assert_eq!(info.uses, vec![Use::Chat, Use::Image], "sắp xếp, bỏ trùng");
        let p = get(&l, "openai").unwrap();
        assert_eq!(p.model_cho(Use::Chat), "gpt-4o-mini");
        assert_eq!(p.model_cho(Use::Image), "gpt-image-1");
        assert!(!p.models.contains_key(&Use::Tts), "model rỗng không lưu");
        assert!(!p.dung_duoc(Use::Tts));
    }

    #[test]
    fn ban_cho_san_khau_co_dia_chi_nhung_khong_bao_gio_co_khoa() {
        // Địa chỉ đi theo để bảng xem thử mở lại được một kết nối cũ mà không
        // bắt người vận hành gõ lại. Khoá thì không, không bao giờ: đó mới là
        // bí mật. Trước đây bản này giấu cả địa chỉ, nhưng vậy thì mở một kết
        // nối cũ ra là trống trơn.
        let (_d, l) = moi();
        set(
            &l,
            "oa",
            &json!({ "kind": "openai", "baseUrl": "https://nha-cua-toi.example/v1", "key": "sk-bi-mat" }),
        )
        .unwrap();
        let j = serde_json::to_string(&list_public(&l)).unwrap();
        assert!(!j.contains("sk-bi-mat"), "lộ khoá: {j}");
        assert!(j.contains("https://nha-cua-toi.example/v1"), "{j}");
        assert!(j.contains("\"hasKey\":true"));
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
    fn khoa_dinh_khoang_trang_thi_bo_khoang_trang() {
        let (_d, l) = moi();
        set(&l, "vieneu", &json!({ "kind": "openai", "key": " sk-a
b " })).unwrap();
        assert_eq!(get(&l, "vieneu").unwrap().key, "sk-ab");
        let kq = set(&l, "vieneu", &json!({ "kind": "openai", "key": "x".repeat(MAX_KEY + 1) }));
        assert!(matches!(kq, Err(SecretError::Invalid(_))));
    }

    #[test]
    fn ten_go_kieu_gi_cung_nan_thanh_id() {
        let (_d, l) = moi();
        let p = set(&l, "MC", &json!({ "kind": "openai", "key": "x" })).unwrap();
        assert_eq!(p.id, "mc");
        assert_eq!(p.name, "MC", "tên hiển thị giữ đúng chữ đã gõ");
        // Sửa theo id (trang quản lý) không làm mất tên hiển thị.
        let p = set(&l, "mc", &json!({ "kind": "openai", "model": "m2" })).unwrap();
        assert_eq!(p.name, "MC");
        assert_eq!(nan_id("  Giọng Bắc_đẹp! "), "giong-bac-dep");
        assert!(set(&l, "!", &json!({ "kind": "openai", "key": "x" })).is_err());
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
    fn thieu_giao_thuc_thi_tu_them() {
        assert_eq!(kiem_base(" localhost:20128/v1 ").unwrap(), "http://localhost:20128/v1");
        assert_eq!(kiem_base("api.openai.com/v1").unwrap(), "https://api.openai.com/v1");
        assert!(kiem_base("http://may-khac.lan:8080/v1").is_ok());
    }

    #[test]
    fn chi_chan_thu_khong_phai_dia_chi() {
        for u in ["ftp://a.b/v1", "https://", "https://a.b /v1"] {
            assert!(kiem_base(u).is_err(), "phải chặn: {u}");
        }
    }
}
