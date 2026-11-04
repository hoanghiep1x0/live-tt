//! REST cho trang quản lý. Mọi route ở đây đòi token (xem `guard.rs`).

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::paths::valid_id;
use crate::state::{AppError, AppState};

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (ma, than) = match self {
            Self::NotFound(m) => (StatusCode::NOT_FOUND, json!({ "error": m })),
            Self::BadRequest(m) => (StatusCode::BAD_REQUEST, json!({ "error": m })),
            Self::Conflict { live } => (
                StatusCode::CONFLICT,
                json!({
                    "error": format!("\"{live}\" đang phát — tắt nó trước đã"),
                    "live": live,
                }),
            ),
            Self::Internal(m) => (StatusCode::INTERNAL_SERVER_ERROR, json!({ "error": m })),
        };
        (ma, Json(than)).into_response()
    }
}

/// Chặn id sai ngay ở cửa, trước khi chạm đĩa.
fn kiem_id(id: &str, cho_gi: &str) -> Result<(), AppError> {
    if valid_id(id) {
        Ok(())
    } else {
        Err(AppError::BadRequest(format!("{cho_gi} \"{id}\" sai định dạng")))
    }
}

pub async fn list_designs(State(st): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "designs": st.designs(), "live": st.live() }))
}

pub async fn get_live(State(st): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "live": st.live() }))
}

#[derive(Deserialize)]
pub struct GoLive {
    #[serde(rename = "designId")]
    design_id: String,
}

pub async fn post_live(
    State(st): State<Arc<AppState>>,
    Json(body): Json<GoLive>,
) -> Result<Json<Value>, AppError> {
    kiem_id(&body.design_id, "id thiết kế")?;
    st.go_live(&body.design_id)?;
    Ok(Json(json!({ "live": st.live() })))
}

pub async fn delete_live(State(st): State<Arc<AppState>>) -> Json<Value> {
    st.stop_live();
    Json(json!({ "live": Value::Null }))
}

pub async fn list_modules(
    State(st): State<Arc<AppState>>,
    Path(design_id): Path<String>,
) -> Result<Json<Value>, AppError> {
    kiem_id(&design_id, "id thiết kế")?;
    if !st.design_exists(&design_id) {
        return Err(AppError::NotFound(format!("không có thiết kế \"{design_id}\"")));
    }
    st.ensure_seeded(&design_id)?;
    Ok(Json(json!({ "modules": st.all_modules(&design_id)? })))
}

pub async fn get_module(
    State(st): State<Arc<AppState>>,
    Path((design_id, module_id)): Path<(String, String)>,
) -> Result<Json<Value>, AppError> {
    kiem_id(&design_id, "id thiết kế")?;
    kiem_id(&module_id, "id module")?;
    let m = st.module_state(&design_id, &module_id)?;
    Ok(Json(json!({ "enabled": m.enabled, "config": m.config })))
}

pub async fn put_config(
    State(st): State<Arc<AppState>>,
    Path((design_id, module_id)): Path<(String, String)>,
    Json(config): Json<Value>,
) -> Result<Json<Value>, AppError> {
    kiem_id(&design_id, "id thiết kế")?;
    kiem_id(&module_id, "id module")?;
    if !st.design_exists(&design_id) {
        return Err(AppError::NotFound(format!("không có thiết kế \"{design_id}\"")));
    }
    st.set_config(&design_id, &module_id, config)?;
    let m = st.module_state(&design_id, &module_id)?;
    Ok(Json(json!({ "enabled": m.enabled, "config": m.config })))
}

/// Đổi tên hoặc link Studio. Khoá vắng thì giữ nguyên, `null` thì xoá.
pub async fn put_settings(
    State(st): State<Arc<AppState>>,
    Path(design_id): Path<String>,
    Json(patch): Json<Value>,
) -> Result<Json<Value>, AppError> {
    kiem_id(&design_id, "id thiết kế")?;
    let s = st.set_settings(&design_id, &patch)?;
    Ok(Json(json!({ "settings": s })))
}

/// Xoá dữ liệu phiên. Trả về đúng những gì đã xoá, để người dùng không phải
/// đoán xem nút vừa bấm có làm gì hay không.
pub async fn post_reset(
    State(st): State<Arc<AppState>>,
    Path(design_id): Path<String>,
) -> Result<Json<Value>, AppError> {
    kiem_id(&design_id, "id thiết kế")?;
    let da_xoa = st.reset_design(&design_id)?;
    Ok(Json(json!({ "cleared": da_xoa })))
}

#[derive(Deserialize)]
pub struct SetEnabled {
    on: bool,
}

pub async fn post_enabled(
    State(st): State<Arc<AppState>>,
    Path((design_id, module_id)): Path<(String, String)>,
    Json(body): Json<SetEnabled>,
) -> Result<Json<Value>, AppError> {
    kiem_id(&design_id, "id thiết kế")?;
    kiem_id(&module_id, "id module")?;
    if !st.design_exists(&design_id) {
        return Err(AppError::NotFound(format!("không có thiết kế \"{design_id}\"")));
    }
    st.set_enabled(&design_id, &module_id, body.on)?;
    Ok(Json(json!({ "enabled": body.on })))
}

/// Trang quản lý hỏi cổng và token sau khi Tauri khởi động.
pub async fn server_info(State(st): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "port": st.port, "version": env!("CARGO_PKG_VERSION") }))
}
