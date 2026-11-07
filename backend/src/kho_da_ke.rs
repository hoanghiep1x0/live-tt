//! Kho truyện đã kể của một phòng: giữ nguyên văn truyện và ẢNH đã vẽ, để
//! tuần sau mở lại là kể được ngay — không phải tìm truyện, không phải vẽ lại.
//!
//! Lưu ở `database/designs/<id>/kho-truyen.json`, cạnh `config.json`. Để ở đó
//! có một lợi ích thật: bộ dọn ảnh (`media::don_dong_bo`) coi mọi file `.json`
//! trong thư mục thiết kế là nơi "còn dùng ảnh", nên ảnh của truyện trong kho
//! không bị dọn mất.
//!
//! Sổ `daKe` trong cấu hình vẫn là nơi quyết định "không kể lại" khi đang live
//! (`truyen_sau.rs`) — kho này là bản đầy đủ để người vận hành xem và kể lại.

use std::path::PathBuf;
use std::sync::Arc;

use axum::extract::{Path as AxPath, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::{json, Map, Value};

use crate::paths::valid_id;
use crate::state::AppState;
use crate::store;

/// Giữ nhiều nhất chừng này truyện; quá thì bỏ truyện CŨ NHẤT. Ảnh của truyện
/// bị bỏ hết được tham chiếu nên bộ dọn ảnh sẽ dọn giúp.
pub const TOI_DA: usize = 50;

fn duong(layout: &crate::paths::Layout, design_id: &str) -> PathBuf {
    layout.config_file(design_id).with_file_name("kho-truyen.json")
}

fn chuan(ten: &str) -> String {
    ten.trim().to_lowercase().split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Các truyện trong kho, cũ trước. Hàm thuần theo file.
pub fn doc(layout: &crate::paths::Layout, design_id: &str) -> Vec<Value> {
    match store::read_json(&duong(layout, design_id)) {
        Ok(Some(Value::Array(ds))) => ds,
        Ok(Some(Value::Object(o))) => o.get("truyen").and_then(Value::as_array).cloned().unwrap_or_default(),
        _ => Vec::new(),
    }
}

/// Một truyện lấy từ cấu hình Kể chuyện: chữ, ảnh và hồ sơ nhân vật. `None`
/// khi chưa có tên hay chưa có đoạn nào. Hàm thuần.
pub fn tu_cau_hinh(cfg: &Value, luc: i64) -> Option<Value> {
    let ten = cfg.get("title").and_then(Value::as_str).unwrap_or_default().trim().to_string();
    let doan = cfg.get("passages").and_then(Value::as_str).unwrap_or_default().trim().to_string();
    if ten.is_empty() || doan.is_empty() {
        return None;
    }
    let lay = |k: &str| cfg.get(k).cloned().unwrap_or(json!(""));
    Some(json!({
        "title": ten,
        "passages": doan,
        "loai": lay("loai"),
        "nguon": lay("nguon"),
        "moc": cfg.get("moc").cloned().unwrap_or(json!([])),
        "hoSoCua": lay("hoSoCua"),
        "phongCach": lay("phongCach"),
        "nhanVat": lay("nhanVat"),
        "hoSoTruyen": lay("hoSoTruyen"),
        "luc": luc,
    }))
}

/// Thêm truyện vào kho (trùng tên thì thay bản cũ — bản mới có thêm ảnh). Hàm
/// thuần. Trả kho mới.
pub fn them(kho: Vec<Value>, truyen: &Value) -> Vec<Value> {
    let ten = chuan(truyen.get("title").and_then(Value::as_str).unwrap_or_default());
    let mut ds: Vec<Value> = kho
        .into_iter()
        .filter(|t| chuan(t.get("title").and_then(Value::as_str).unwrap_or_default()) != ten)
        .collect();
    ds.push(truyen.clone());
    let bo = ds.len().saturating_sub(TOI_DA);
    ds.split_off(bo)
}

/// Cất truyện đang kể vào kho. Gọi lúc chuyển truyện (`truyen_sau.rs`).
pub fn luu(st: &AppState, design_id: &str, cfg: &Value) {
    let Some(t) = tu_cau_hinh(cfg, crate::state::bay_gio_ms()) else { return };
    let ds = them(doc(&st.layout, design_id), &t);
    let so = ds.len();
    match store::write_json_atomic(&duong(&st.layout, design_id), &Value::Array(ds)) {
        Ok(()) => tracing::info!(thiet_ke = %design_id, ten = %t["title"], so, "cất truyện vào kho đã kể"),
        Err(e) => tracing::warn!(thiet_ke = %design_id, ?e, "không cất được truyện vào kho"),
    }
}

/// Tên các truyện trong kho (để lời dặn "đừng kể lại" biết). Hàm thuần.
pub fn ten_trong_kho(kho: &[Value]) -> Vec<String> {
    kho.iter()
        .filter_map(|t| t.get("title").and_then(Value::as_str))
        .map(str::to_string)
        .collect()
}

fn loi(ma: StatusCode, vi_sao: &str) -> Response {
    (ma, Json(json!({ "error": vi_sao }))).into_response()
}

/// `GET /s/truyen-kho/:design_id` — kho truyện đã kể, mới trước.
pub async fn get_kho(State(st): State<Arc<AppState>>, AxPath(design_id): AxPath<String>) -> Response {
    if !valid_id(&design_id) {
        return loi(StatusCode::BAD_REQUEST, "id thiết kế sai định dạng");
    }
    let mut ds = doc(&st.layout, &design_id);
    ds.reverse();
    Json(ds).into_response()
}

#[derive(serde::Deserialize)]
pub struct MotTruyen {
    pub ten: String,
}

/// `POST /s/truyen-kho/:design_id/ke-lai` — đưa một truyện trong kho lên làm
/// truyện đang kể, kèm ảnh cũ: không tốn một lượt tìm truyện hay vẽ ảnh nào.
pub async fn post_ke_lai(
    State(st): State<Arc<AppState>>,
    AxPath(design_id): AxPath<String>,
    Json(m): Json<MotTruyen>,
) -> Response {
    if !valid_id(&design_id) {
        return loi(StatusCode::BAD_REQUEST, "id thiết kế sai định dạng");
    }
    let ten = chuan(&m.ten);
    let Some(t) = doc(&st.layout, &design_id)
        .into_iter()
        .find(|t| chuan(t.get("title").and_then(Value::as_str).unwrap_or_default()) == ten)
    else {
        return loi(StatusCode::NOT_FOUND, "không có truyện này trong kho");
    };
    let lay = |k: &str| t.get(k).cloned().unwrap_or(json!(""));
    // Truyện này đã kể rồi: bỏ khỏi sổ "đã kể" để máy chủ không coi nó là
    // truyện cấm, và dọn truyện kế tiếp cũ (sẽ chuẩn bị lại theo truyện mới).
    let cu = st.module_state(&design_id, "story").map(|x| x.config).unwrap_or(json!({}));
    let so: Vec<Value> = cu
        .get("daKe")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter(|x| chuan(x.get("ten").and_then(Value::as_str).unwrap_or_default()) != ten)
        .collect();
    let kq = st.set_config(
        &design_id,
        "story",
        json!({
            "title": lay("title"),
            "passages": lay("passages"),
            "loai": lay("loai"),
            "nguon": lay("nguon"),
            "moc": t.get("moc").cloned().unwrap_or(json!([])),
            "hoSoCua": lay("hoSoCua"),
            "phongCach": lay("phongCach"),
            "nhanVat": lay("nhanVat"),
            "hoSoTruyen": lay("hoSoTruyen"),
            "anhLoi": "",
            "truyenSau": {},
            "daKe": Value::Array(so),
        }),
    );
    match kq {
        Ok(()) => Json(json!({ "ok": true, "ten": lay("title") })).into_response(),
        Err(e) => {
            tracing::warn!(thiet_ke = %design_id, ?e, "không kể lại được truyện trong kho");
            loi(StatusCode::INTERNAL_SERVER_ERROR, "không đặt được truyện")
        }
    }
}

/// `POST /s/truyen-kho/:design_id/xoa` — bỏ một truyện khỏi kho.
pub async fn post_xoa(
    State(st): State<Arc<AppState>>,
    AxPath(design_id): AxPath<String>,
    Json(m): Json<MotTruyen>,
) -> Response {
    if !valid_id(&design_id) {
        return loi(StatusCode::BAD_REQUEST, "id thiết kế sai định dạng");
    }
    let ten = chuan(&m.ten);
    let ds: Vec<Value> = doc(&st.layout, &design_id)
        .into_iter()
        .filter(|t| chuan(t.get("title").and_then(Value::as_str).unwrap_or_default()) != ten)
        .collect();
    match store::write_json_atomic(&duong(&st.layout, &design_id), &Value::Array(ds)) {
        Ok(()) => Json(json!({ "ok": true })).into_response(),
        Err(e) => {
            tracing::warn!(thiet_ke = %design_id, ?e, "không xoá được truyện khỏi kho");
            loi(StatusCode::INTERNAL_SERVER_ERROR, "không ghi được kho truyện")
        }
    }
}

/// Xoá SẠCH lịch sử truyện đã kể của một phòng.
///
/// Phải dọn HAI nơi, không thì xoá như không: kho lâu dài (file này) và sổ
/// `daKe` trong cấu hình module. Cả hai đều chặn kể lại — còn một cái là
/// phòng vẫn từ chối đúng mấy truyện ấy, mà người vận hành thì đã thấy bảng
/// trống rồi, không hiểu vì sao.
pub async fn post_xoa_het(
    State(st): State<Arc<AppState>>,
    AxPath(design_id): AxPath<String>,
) -> Response {
    if !valid_id(&design_id) {
        return loi(StatusCode::BAD_REQUEST, "id thiết kế sai định dạng");
    }
    let so_kho = doc(&st.layout, &design_id).len();
    if let Err(e) = store::write_json_atomic(&duong(&st.layout, &design_id), &Value::Array(Vec::new())) {
        tracing::warn!(thiet_ke = %design_id, ?e, "không xoá được kho truyện");
        return loi(StatusCode::INTERNAL_SERVER_ERROR, "không ghi được kho truyện");
    }
    let so_so = st
        .module_state(&design_id, "story")
        .ok()
        .and_then(|m| m.config.get("daKe").and_then(Value::as_array).map(Vec::len))
        .unwrap_or(0);
    if let Err(e) = st.set_config(&design_id, "story", json!({ "daKe": [] })) {
        tracing::warn!(thiet_ke = %design_id, ?e, "không xoá được sổ đã kể");
        return loi(StatusCode::INTERNAL_SERVER_ERROR, "không xoá được sổ đã kể");
    }
    tracing::info!(thiet_ke = %design_id, so_kho, so_so, "đã xoá sạch lịch sử truyện đã kể");
    Json(json!({ "ok": true, "soKho": so_kho, "soSo": so_so })).into_response()
}

/// Số truyện và số ảnh đang giữ — cho dòng tóm tắt của bảng xem. Hàm thuần.
pub fn tom_tat(kho: &[Value]) -> Map<String, Value> {
    let anh = kho
        .iter()
        .flat_map(|t| t.get("moc").and_then(Value::as_array).cloned().unwrap_or_default())
        .filter(|m| m.get("anh").and_then(Value::as_str).is_some_and(|a| !a.is_empty()))
        .count();
    let mut o = Map::new();
    o.insert("truyen".into(), json!(kho.len()));
    o.insert("anh".into(), json!(anh));
    o
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn them_thay_ban_cu_cung_ten_va_co_tran() {
        let t = |ten: &str, moc: usize| {
            json!({ "title": ten, "passages": "a", "moc": vec![json!({ "anh": "x.png" }); moc] })
        };
        let kho = them(them(Vec::new(), &t("A", 0)), &t("B", 1));
        assert_eq!(kho.len(), 2);
        // Cùng tên (không phân biệt hoa thường, khoảng trắng): thay, không thêm.
        let kho = them(kho, &t("  a  ", 3));
        assert_eq!(kho.len(), 2);
        assert_eq!(kho[1]["moc"].as_array().unwrap().len(), 3, "bản mới có thêm ảnh");
        assert_eq!(ten_trong_kho(&kho), vec!["B".to_string(), "  a  ".to_string()]);
        assert_eq!(tom_tat(&kho)["anh"], json!(4));
        // Trần kho: bỏ truyện cũ nhất.
        let mut k = Vec::new();
        for i in 0..(TOI_DA + 5) {
            k = them(k, &t(&format!("T{i}"), 0));
        }
        assert_eq!(k.len(), TOI_DA, "giữ tối đa 50 truyện");
        assert_eq!(k[0]["title"], json!("T5"), "bỏ truyện cũ nhất");
    }

    #[test]
    fn tu_cau_hinh_bo_truyen_trong() {
        assert!(tu_cau_hinh(&json!({ "title": "A" }), 1).is_none());
        assert!(tu_cau_hinh(&json!({ "passages": "a" }), 1).is_none());
        let t = tu_cau_hinh(&json!({ "title": " A ", "passages": "a\nb", "moc": [1] }), 7).expect("có");
        assert_eq!(t["title"], json!("A"));
        assert_eq!(t["luc"], json!(7));
        assert_eq!(t["moc"], json!([1]));
    }
}
