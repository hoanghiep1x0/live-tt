//! Tình hình do sân khấu của một thiết kế báo lên, để MC nói đúng chuyện đang diễn ra.
//!
//! Một số phòng tự chạy logic ở phía sân khấu (vd game Đại Chiến), backend không
//! biết trên sân có gì. Sân khấu gửi một object JSON ngắn theo nhịp; lượt MC tới thì
//! `ai.rs` thêm nó vào `<tin_phong>` dưới khoá `tinhHinhPhong`.
//!
//! Chỉ giữ trong bộ nhớ, bản mới đè bản cũ. Bản quá cũ coi như không có, nên phòng
//! không gửi gì thì lời nhắc của phòng đó không đổi một chữ.

use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

use axum::body::Bytes;
use axum::extract::Path;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::Value;

/// Đủ cho tình hình một trận; lời nhắc MC không phình theo dữ liệu sân khấu.
const TOI_DA_BYTE: usize = 8 * 1024;
/// Sân khấu báo vài giây một lần; quá hạn này là phòng đã tắt hoặc đã đổi.
const HAN_MS: i64 = 30_000;
/// Số phòng giữ cùng lúc, chặn kho phình vì id rác.
const TOI_DA_PHONG: usize = 32;

fn kho() -> &'static Mutex<HashMap<String, (i64, Value)>> {
    static KHO: OnceLock<Mutex<HashMap<String, (i64, Value)>>> = OnceLock::new();
    KHO.get_or_init(|| Mutex::new(HashMap::new()))
}

fn ghi(design_id: &str, now: i64, v: Value) -> bool {
    let mut k = kho().lock().unwrap_or_else(|e| e.into_inner());
    if !k.contains_key(design_id) && k.len() >= TOI_DA_PHONG {
        k.retain(|_, (luc, _)| now - *luc <= HAN_MS);
        if k.len() >= TOI_DA_PHONG {
            return false;
        }
    }
    k.insert(design_id.to_string(), (now, v));
    true
}

/// Tình hình còn mới của phòng, hoặc `None` nếu phòng không báo gì.
pub fn lay(design_id: &str, now: i64) -> Option<Value> {
    let k = kho().lock().unwrap_or_else(|e| e.into_inner());
    let (luc, v) = k.get(design_id)?;
    (now - *luc <= HAN_MS).then(|| v.clone())
}

/// `POST /s/boi-canh/:design_id`, thân là một object JSON.
pub async fn nhan(Path(design_id): Path<String>, body: Bytes) -> Response {
    if !crate::paths::valid_id(&design_id) {
        return (StatusCode::BAD_REQUEST, "id sai định dạng").into_response();
    }
    if body.len() > TOI_DA_BYTE {
        return (StatusCode::PAYLOAD_TOO_LARGE, "tình hình quá dài").into_response();
    }
    let Ok(v @ Value::Object(_)) = serde_json::from_slice::<Value>(&body) else {
        return (StatusCode::BAD_REQUEST, "cần một object JSON").into_response();
    };
    if !ghi(&design_id, crate::state::bay_gio_ms(), v) {
        return (StatusCode::TOO_MANY_REQUESTS, "quá nhiều phòng").into_response();
    }
    StatusCode::NO_CONTENT.into_response()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn phong_khong_bao_gi_thi_khong_co_gi() {
        assert_eq!(lay("test-chua-tung-bao", 1_000), None);
    }

    #[test]
    fn ban_moi_de_ban_cu_va_qua_han_thi_bo() {
        assert!(ghi("test-de-ban-cu", 1_000, json!({ "a": 1 })));
        assert!(ghi("test-de-ban-cu", 2_000, json!({ "a": 2 })));
        assert_eq!(lay("test-de-ban-cu", 2_000), Some(json!({ "a": 2 })));
        assert_eq!(lay("test-de-ban-cu", 2_000 + HAN_MS), Some(json!({ "a": 2 })));
        assert_eq!(lay("test-de-ban-cu", 2_001 + HAN_MS), None);
    }

    #[test]
    fn phong_nay_khong_doc_duoc_cua_phong_kia() {
        assert!(ghi("test-phong-a", 5_000, json!({ "x": 1 })));
        assert_eq!(lay("test-phong-b", 5_000), None);
    }
}
