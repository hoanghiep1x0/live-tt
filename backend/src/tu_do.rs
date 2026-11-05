//! Tủ đồ của module: `assets/tu-do/<thân>/<nguồn>/<ô>/<món>/` (docs/phong/san-bar/nhan-vat/09-tu-do.md).
//! Thân = nhân vật mà món được ôm theo: đồ của thân này không mặc vừa thân khác, nên tách thư mục từ gốc.
//!
//! Danh mục KHÔNG có file danh sách nào — quét thư mục mỗi lần hỏi. Nhờ vậy thêm món là chép thư mục vào, xoá một món,
//! một ô, một nguồn hay cả đồ của một thân là xoá đúng thư mục đó, không có chỗ thứ hai phải sửa theo.

use std::path::Path;
use std::sync::Arc;

use axum::extract::{Path as AxPath, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::{json, Value};

use crate::paths::{safe_join, valid_id};
use crate::state::AppState;

fn loi(ma: StatusCode, vi_sao: &str) -> Response {
    (ma, Json(json!({ "error": vi_sao }))).into_response()
}

/// Tên một tầng (thân, nguồn, ô, món): chữ thường, số, gạch ngang. Dài hơn id module vì tên món lấy từ tên file đồ.
fn ten_tang(s: &str) -> bool {
    (1..=80).contains(&s.len())
        && s.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        && !s.starts_with('-')
}

fn thu_muc_con(p: &Path) -> Vec<(String, std::path::PathBuf)> {
    let mut ra: Vec<_> = std::fs::read_dir(p)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|e| e.path().is_dir())
        .filter_map(|e| {
            let ten = e.file_name().to_string_lossy().into_owned();
            ten_tang(&ten).then(|| (ten, e.path()))
        })
        .collect();
    ra.sort();
    ra
}

/// Mọi món trong tủ: nội dung `mon.json` của từng món, thêm `duong` (đường tương đối trong assets của module).
/// Thư mục sai tên hay thiếu / hỏng `mon.json` thì bỏ qua — một món hỏng không làm mất cả tủ.
pub fn quet(goc: &Path) -> Vec<Value> {
    let mut ra = Vec::new();
    for (than, p0) in thu_muc_con(goc) {
        for (nguon, p1) in thu_muc_con(&p0) {
            for (o, p2) in thu_muc_con(&p1) {
                for (mon, p3) in thu_muc_con(&p2) {
                    let Ok(chu) = std::fs::read_to_string(p3.join("mon.json")) else { continue };
                    let Ok(Value::Object(mut v)) = serde_json::from_str::<Value>(&chu) else { continue };
                    // Thư mục là sự thật: nhãn trong mon.json lệch chỗ đặt thì theo thư mục.
                    v.insert("duong".into(), json!(format!("tu-do/{than}/{nguon}/{o}/{mon}/")));
                    v.insert("than".into(), json!(than));
                    v.insert("nguon".into(), json!(nguon));
                    v.insert("o".into(), json!(o));
                    v.insert("id".into(), json!(mon));
                    ra.push(Value::Object(v));
                }
            }
        }
    }
    ra
}

pub async fn liet_ke(State(st): State<Arc<AppState>>, AxPath(module_id): AxPath<String>) -> Response {
    if !valid_id(&module_id) {
        return loi(StatusCode::BAD_REQUEST, "id module sai định dạng");
    }
    let goc = st.layout.module_assets(&module_id).join("tu-do");
    match tokio::task::spawn_blocking(move || quet(&goc)).await {
        Ok(ds) => Json(ds).into_response(),
        Err(_) => loi(StatusCode::INTERNAL_SERVER_ERROR, "không đọc được tủ đồ"),
    }
}

/// Xoá một món (`thân/nguồn/ô/món`), cả một ô, cả một nguồn hoặc mọi đồ của một thân (`thân`).
pub async fn xoa(
    State(st): State<Arc<AppState>>,
    AxPath((module_id, rest)): AxPath<(String, String)>,
) -> Response {
    if !valid_id(&module_id) {
        return loi(StatusCode::BAD_REQUEST, "id module sai định dạng");
    }
    let tang: Vec<&str> = rest.split('/').filter(|s| !s.is_empty()).collect();
    if tang.is_empty() || tang.len() > 4 || !tang.iter().all(|t| ten_tang(t)) {
        return loi(StatusCode::BAD_REQUEST, "đường xoá phải là thân[/nguồn[/ô[/món]]]");
    }
    let goc = st.layout.module_assets(&module_id).join("tu-do");
    let Some(dich) = safe_join(&goc, &tang.join("/")) else {
        return loi(StatusCode::BAD_REQUEST, "đường dẫn không hợp lệ");
    };
    if !dich.is_dir() {
        return loi(StatusCode::NOT_FOUND, "không có mục này trong tủ đồ");
    }
    match tokio::fs::remove_dir_all(&dich).await {
        Ok(()) => Json(json!({ "ok": true, "xoa": tang.join("/") })).into_response(),
        Err(e) => loi(StatusCode::INTERNAL_SERVER_ERROR, &format!("xoá không được: {e}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ten_tang_chan_loi_thoat() {
        assert!(ten_tang("makehuman-cc0"));
        assert!(ten_tang("toigo-bodice-dress-with-lace-ruffle-skirt"));
        assert!(!ten_tang(".."));
        assert!(!ten_tang("a/b"));
        assert!(!ten_tang("A"));
        assert!(!ten_tang(""));
        assert!(!ten_tang("-x"));
    }

    #[test]
    fn quet_bo_qua_mon_hong() {
        let d = std::env::temp_dir().join(format!("tu-do-test-{}", std::process::id()));
        let tot = d.join("model-1/nguon-a/ao/mon-1");
        let hong = d.join("model-1/nguon-a/ao/mon-2");
        std::fs::create_dir_all(&tot).unwrap();
        std::fs::create_dir_all(&hong).unwrap();
        std::fs::write(tot.join("mon.json"), r#"{"ten":"Áo","che":["nguc"]}"#).unwrap();
        std::fs::write(hong.join("mon.json"), "không phải json").unwrap();
        let ds = quet(&d);
        std::fs::remove_dir_all(&d).ok();
        assert_eq!(ds.len(), 1);
        assert_eq!(ds[0]["duong"], "tu-do/model-1/nguon-a/ao/mon-1/");
        assert_eq!(ds[0]["than"], "model-1");
        assert_eq!(ds[0]["o"], "ao");
        assert_eq!(ds[0]["ten"], "Áo");
    }
}
