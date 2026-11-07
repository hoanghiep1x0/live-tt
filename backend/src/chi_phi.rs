//! Sổ chi phí của một buổi live: mỗi lượt gọi AI tốn bao nhiêu, cộng dồn từ
//! lúc lên sóng tới lúc tắt.
//!
//! Số ở đây là số THẬT nhà cung cấp báo về trong phần `usage` của từng lượt
//! gọi, không phải ước lượng: OpenRouter trả thẳng `usage.cost` (USD); Claude
//! trả số token, nhân với bảng giá bên dưới. Nhà nào không cho biết giá thì
//! lượt đó ghi là "chưa rõ giá" — đếm riêng, không đoán bừa thành 0.
//!
//! Sổ nằm trong bộ nhớ (`AppState::chi_phi`) để bảng ở sân khấu thấy ngay; tắt
//! live thì sổ được ghi thêm một dòng vào `database/designs/<id>/chi-phi.jsonl`.

use std::collections::BTreeMap;

use serde::Serialize;
use serde_json::Value;

/// Các khoản tiền của một buổi.
pub const MC: &str = "mc";
pub const VIET: &str = "viet";
pub const KE_HOACH_ANH: &str = "ke-hoach-anh";
pub const VE_ANH: &str = "ve-anh";
/// Vẽ qua muse.ai trong app (`muse.rs`): không tốn tiền, vẫn đếm số ảnh.
pub const VE_ANH_MUSE: &str = "ve-anh-muse";
pub const GIONG: &str = "giong";

/// Một lượt gọi đã dùng bao nhiêu, đọc từ trả lời của nhà cung cấp.
#[derive(Debug, Default, Clone, PartialEq)]
pub struct Dung {
    pub tok_vao: u64,
    pub tok_ra: u64,
    pub cache_doc: u64,
    pub cache_ghi: u64,
    /// Số ký tự đọc (giọng đọc).
    pub ky_tu: u64,
    /// Giá nhà cung cấp tự báo (OpenRouter `usage.cost`), USD.
    pub usd: Option<f64>,
}

fn so(v: &Value, k: &str) -> u64 {
    v.get(k).and_then(Value::as_u64).unwrap_or(0)
}

/// Đọc phần `usage` của một trả lời, nhận ba kiểu: Anthropic
/// (`input_tokens`…, kèm hai loại token bộ đệm), OpenAI (`prompt_tokens`,
/// `completion_tokens`) và OpenRouter (như OpenAI, thêm `cost`). Hàm thuần.
pub fn dung_tu(tra_loi: &Value) -> Dung {
    let Some(u) = tra_loi.get("usage") else { return Dung::default() };
    let vao = so(u, "input_tokens").max(so(u, "prompt_tokens"));
    let ra = so(u, "output_tokens").max(so(u, "completion_tokens"));
    Dung {
        tok_vao: vao,
        tok_ra: ra,
        cache_doc: so(u, "cache_read_input_tokens"),
        cache_ghi: so(u, "cache_creation_input_tokens"),
        ky_tu: 0,
        usd: u.get("cost").and_then(Value::as_f64).filter(|x| x.is_finite() && *x >= 0.0),
    }
}

/// Giá Claude, USD cho một triệu token (vào, ra). Đọc bộ đệm tính 0,1×, ghi
/// bộ đệm 1,25× giá vào. Model không có trong bảng thì `None` — chưa rõ giá.
pub fn gia_claude(model: &str) -> Option<(f64, f64)> {
    let m = model.to_lowercase();
    [
        ("haiku-5-5", (0.10, 0.50)),
        ("sonnet-5-5", (2.0, 10.0)),
        ("opus-5-5", (4.0, 20.0)),
        ("sonnet-5", (2.0, 10.0)),
        ("opus-5", (5.0, 25.0)),
        ("haiku-4-5", (1.0, 5.0)),
    ]
    .iter()
    .find(|(k, _)| m.contains(k))
    .map(|(_, g)| *g)
}

/// Tiền của một lượt chat. Nhà tự báo giá thì lấy luôn; Claude thì tính theo
/// bảng; còn lại `None`. Hàm thuần.
pub fn usd_chat(model: &str, la_claude: bool, d: &Dung) -> Option<f64> {
    if d.usd.is_some() {
        return d.usd;
    }
    if !la_claude {
        return None;
    }
    let (vao, ra) = gia_claude(model)?;
    Some(
        (d.tok_vao as f64 * vao
            + d.cache_doc as f64 * vao * 0.1
            + d.cache_ghi as f64 * vao * 1.25
            + d.tok_ra as f64 * ra)
            / 1_000_000.0,
    )
}

/// Một khoản trong sổ.
#[derive(Debug, Default, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Khoan {
    pub lan: u32,
    pub tok_vao: u64,
    pub tok_ra: u64,
    pub ky_tu: u64,
    pub usd: f64,
    /// Số lượt không biết giá.
    pub chua_ro: u32,
}

/// Sổ của một buổi.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct So {
    pub design_id: String,
    pub bat_dau: i64,
    pub ket_thuc: Option<i64>,
    /// Buổi live thật (`false`: chi phí lúc xem thử, chưa lên sóng).
    pub live: bool,
    pub khoan: BTreeMap<String, Khoan>,
    pub tong_usd: f64,
    pub chua_ro: u32,
    /// Tên các truyện đã kể trong buổi, theo thứ tự. Số truyện là độ dài.
    pub truyen: Vec<String>,
    /// Dấu (tên + các đoạn) của truyện đang kể — để nhận ra lúc đổi truyện.
    #[serde(skip)]
    pub dau_truyen: Option<String>,
}

impl So {
    pub fn moi(design_id: &str, live: bool, now: i64) -> Self {
        So {
            design_id: design_id.to_string(),
            bat_dau: now,
            ket_thuc: None,
            live,
            khoan: BTreeMap::new(),
            tong_usd: 0.0,
            chua_ro: 0,
            truyen: Vec::new(),
            dau_truyen: None,
        }
    }

    /// Ghi truyện đang kể. Trả `true` khi đếm thêm một truyện.
    ///
    /// Truyện có mặt lúc mở sổ là truyện thứ nhất. Đổi sang truyện khác (dấu
    /// tên + các đoạn khác) thì cộng một; sửa chữ trong cùng truyện — cùng tên —
    /// thì không cộng, chỉ nhớ dấu mới.
    pub fn ghi_truyen(&mut self, ten: &str, dau: &str) -> bool {
        if self.dau_truyen.as_deref() == Some(dau) {
            return false;
        }
        self.dau_truyen = Some(dau.to_string());
        let ten = ten.trim();
        if !ten.is_empty() && self.truyen.last().map(String::as_str) == Some(ten) {
            return false;
        }
        self.truyen.push(if ten.is_empty() { "Truyện chưa đặt tên".into() } else { ten.to_string() });
        true
    }

    /// Ghi một lượt. `usd` `None` là nhà không cho biết giá.
    pub fn ghi(&mut self, khoan: &str, d: &Dung, usd: Option<f64>) {
        let k = self.khoan.entry(khoan.to_string()).or_default();
        k.lan += 1;
        k.tok_vao += d.tok_vao + d.cache_doc + d.cache_ghi;
        k.tok_ra += d.tok_ra;
        k.ky_tu += d.ky_tu;
        match usd {
            Some(x) => {
                k.usd += x;
                self.tong_usd += x;
            }
            None => {
                k.chua_ro += 1;
                self.chua_ro += 1;
            }
        }
    }
}

/// Giọng đọc miễn phí: Microsoft Edge và Google Dịch (qua 9router). Hàm thuần.
pub fn giong_mien_phi(ten_hoac_model: &str) -> bool {
    let t = ten_hoac_model.trim().to_lowercase();
    t.starts_with("edge-tts/") || t.starts_with("google-tts/")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn doc_du_ba_kieu_usage() {
        let a = dung_tu(&json!({ "usage": {
            "input_tokens": 100, "output_tokens": 20,
            "cache_read_input_tokens": 50, "cache_creation_input_tokens": 10 } }));
        assert_eq!((a.tok_vao, a.tok_ra, a.cache_doc, a.cache_ghi, a.usd), (100, 20, 50, 10, None));

        let o = dung_tu(&json!({ "usage": { "prompt_tokens": 7, "completion_tokens": 3 } }));
        assert_eq!((o.tok_vao, o.tok_ra, o.usd), (7, 3, None));

        let r = dung_tu(&json!({ "usage": { "prompt_tokens": 7, "completion_tokens": 3, "cost": 0.0042 } }));
        assert_eq!(r.usd, Some(0.0042));

        assert_eq!(dung_tu(&json!({ "data": [] })), Dung::default());
    }

    #[test]
    fn tinh_gia_claude_va_uu_tien_gia_nha_bao() {
        let d = Dung { tok_vao: 1_000_000, tok_ra: 1_000_000, ..Dung::default() };
        let x = usd_chat("claude-haiku-5-5", true, &d).unwrap();
        assert!((x - 0.60).abs() < 1e-9);

        let bo_dem = Dung { cache_doc: 1_000_000, cache_ghi: 1_000_000, ..Dung::default() };
        let y = usd_chat("claude-sonnet-5-5", true, &bo_dem).unwrap();
        assert!((y - (0.2 + 2.5)).abs() < 1e-9);

        let co_gia = Dung { usd: Some(0.01), ..d.clone() };
        assert_eq!(usd_chat("gpt-x", false, &co_gia), Some(0.01));
        assert_eq!(usd_chat("gpt-x", false, &d), None, "nhà không báo giá thì chưa rõ");
        assert_eq!(usd_chat("claude-model-la", true, &d), None);
    }

    #[test]
    fn so_cong_don_va_dem_luot_chua_ro_gia() {
        let mut s = So::moi("ke-chuyen", true, 1);
        s.ghi(MC, &Dung { tok_vao: 10, tok_ra: 5, ..Dung::default() }, Some(0.5));
        s.ghi(MC, &Dung { tok_vao: 10, cache_doc: 4, ..Dung::default() }, Some(0.25));
        s.ghi(VE_ANH, &Dung::default(), None);
        let mc = &s.khoan[MC];
        assert_eq!((mc.lan, mc.tok_vao, mc.tok_ra), (2, 24, 5));
        assert!((s.tong_usd - 0.75).abs() < 1e-9);
        assert_eq!((s.chua_ro, s.khoan[VE_ANH].chua_ro), (1, 1));
    }

    #[test]
    fn dem_truyen_da_ke() {
        let mut s = So::moi("ke-chuyen", true, 1);
        assert!(s.ghi_truyen("Cây vú sữa", "a"), "truyện lúc mở sổ là truyện thứ nhất");
        assert!(!s.ghi_truyen("Cây vú sữa", "a"), "không đổi gì");
        assert!(!s.ghi_truyen("Cây vú sữa", "b"), "sửa chữ trong cùng truyện");
        assert!(s.ghi_truyen("Tấm Cám", "c"));
        assert!(s.ghi_truyen("", "d"));
        assert_eq!(s.truyen, ["Cây vú sữa", "Tấm Cám", "Truyện chưa đặt tên"]);
    }

    #[test]
    fn giong_edge_va_google_la_mien_phi() {
        assert!(giong_mien_phi("edge-tts/vi-VN-HoaiMyNeural"));
        assert!(giong_mien_phi("google-tts/vi"));
        assert!(!giong_mien_phi("abc123voiceid"));
    }
}
