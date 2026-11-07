//! Sổ của module: một file JSON bền cho mỗi cặp (thiết kế, module), ở
//! `database/designs/<thiết kế>/so/<module>.json`.
//!
//! Cấu hình (`config.json`) là thứ người vận hành chỉnh; sổ là thứ tính năng tự
//! ghi trong lúc chạy và phải còn sau khi tắt máy — vd lớp học nhớ câu nào đã
//! hỏi, bảng vàng tuần, học bạ cả đời của từng người xem. Tách hai file để sổ
//! lớn dần không làm chậm việc đọc cấu hình, và "xoá dữ liệu phiên" không đụng tới sổ.
//!
//! Máy chủ KHÔNG hiểu nội dung sổ: cộng điểm, sang tuần mới… là lõi thuần của
//! module (test được ở Node). Ở đây chỉ giữ ranh giới: id hợp lệ, thiết kế có
//! thật, thân là một object, không quá cỡ, ghi nguyên tử.

use std::path::PathBuf;
use std::sync::Arc;

use axum::extract::{Path as AxPath, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::{json, Value};

use crate::paths::{valid_id, Layout};
use crate::state::AppState;
use crate::store::write_json_atomic;

/// Sổ lớp học treo live cả tuần có vài nghìn người xem, mỗi người một dòng học
/// bạ: vài trăm KB. Trần này đủ rộng cho nhiều năm mà vẫn chặn được thân rác.
pub const SO_TOI_DA: usize = 8 * 1024 * 1024;

fn loi(ma: StatusCode, vi_sao: &str) -> Response {
    (ma, Json(json!({ "error": vi_sao }))).into_response()
}

pub fn so_file(layout: &Layout, design_id: &str, module_id: &str) -> PathBuf {
    layout
        .database_dir()
        .join("designs")
        .join(design_id)
        .join("so")
        .join(format!("{module_id}.json"))
}

fn kiem(st: &AppState, design_id: &str, module_id: &str) -> Result<(), Response> {
    if !valid_id(design_id) || !valid_id(module_id) {
        return Err(loi(StatusCode::BAD_REQUEST, "id thiết kế hoặc module sai định dạng"));
    }
    // Không có thiết kế thì không mở sổ: chặn việc rải thư mục rác vào database/.
    if !st.design_exists(design_id) {
        return Err(loi(StatusCode::NOT_FOUND, "không có thiết kế này"));
    }
    Ok(())
}

/// Sổ chưa có thì trả `{}` — module tự hiểu là sổ mới.
pub async fn doc(
    State(st): State<Arc<AppState>>,
    AxPath((design_id, module_id)): AxPath<(String, String)>,
) -> Response {
    if let Err(r) = kiem(&st, &design_id, &module_id) {
        return r;
    }
    let p = so_file(&st.layout, &design_id, &module_id);
    match tokio::task::spawn_blocking(move || doc_file(&p)).await {
        Ok(Ok(v)) => Json(v).into_response(),
        Ok(Err(e)) => loi(StatusCode::INTERNAL_SERVER_ERROR, &e),
        Err(_) => loi(StatusCode::INTERNAL_SERVER_ERROR, "không đọc được sổ"),
    }
}

pub async fn ghi(
    State(st): State<Arc<AppState>>,
    AxPath((design_id, module_id)): AxPath<(String, String)>,
    Json(than): Json<Value>,
) -> Response {
    if let Err(r) = kiem(&st, &design_id, &module_id) {
        return r;
    }
    if !than.is_object() {
        return loi(StatusCode::BAD_REQUEST, "sổ phải là một object JSON");
    }
    let p = so_file(&st.layout, &design_id, &module_id);
    match tokio::task::spawn_blocking(move || ghi_file(&p, &than)).await {
        Ok(Ok(())) => Json(json!({ "ok": true })).into_response(),
        Ok(Err(e)) => loi(StatusCode::INTERNAL_SERVER_ERROR, &e),
        Err(_) => loi(StatusCode::INTERNAL_SERVER_ERROR, "không ghi được sổ"),
    }
}

fn doc_file(p: &std::path::Path) -> Result<Value, String> {
    // `store::read_json` chặn ở cỡ của cấu hình; sổ được phép lớn hơn nên đọc thẳng.
    match std::fs::read(p) {
        Ok(b) if b.len() > SO_TOI_DA => Err("sổ quá lớn".into()),
        Ok(b) => match serde_json::from_slice::<Value>(&b) {
            Ok(v) if v.is_object() => Ok(v),
            // File hỏng (tắt máy giữa lúc ghi ở bản cũ…): trả sổ trống thay vì
            // làm sân khấu kẹt ở màn chờ. File hỏng vẫn để nguyên trên đĩa.
            _ => Ok(json!({})),
        },
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(json!({})),
        Err(e) => Err(format!("đọc sổ lỗi: {e}")),
    }
}

fn ghi_file(p: &std::path::Path, v: &Value) -> Result<(), String> {
    let body = serde_json::to_vec(v).map_err(|e| e.to_string())?;
    if body.len() > SO_TOI_DA {
        return Err("sổ quá lớn".into());
    }
    if let Some(dir) = p.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    // Nhỏ hơn trần cấu hình thì dùng lại đường ghi nguyên tử chung.
    if body.len() <= crate::store::MAX_CONFIG_BYTES {
        return write_json_atomic(p, v).map_err(|e| format!("ghi sổ lỗi: {e:?}"));
    }
    let tam = p.with_extension(format!("json.{}.tmp", std::process::id()));
    std::fs::write(&tam, &body).map_err(|e| e.to_string())?;
    if p.exists() {
        let _ = std::fs::remove_file(p);
    }
    std::fs::rename(&tam, p).map_err(|e| {
        let _ = std::fs::remove_file(&tam);
        e.to_string()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn so_nam_trong_database_cua_thiet_ke() {
        let l = Layout::new("/goc");
        let p = so_file(&l, "lop-hoc-chu", "do-chu");
        assert!(p.ends_with("database/designs/lop-hoc-chu/so/do-chu.json"));
    }

    #[test]
    fn ghi_roi_doc_lai_va_file_hong_la_so_trong() {
        let d = std::env::temp_dir().join(format!("so-test-{}", std::process::id()));
        let p = d.join("so").join("m.json");
        assert_eq!(doc_file(&p).unwrap(), json!({}), "chưa có sổ là sổ trống");
        ghi_file(&p, &json!({ "a": 1 })).unwrap();
        assert_eq!(doc_file(&p).unwrap(), json!({ "a": 1 }));
        std::fs::write(&p, "không phải json").unwrap();
        assert_eq!(doc_file(&p).unwrap(), json!({}));
        std::fs::remove_dir_all(&d).ok();
    }
}
