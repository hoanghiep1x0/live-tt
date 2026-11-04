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
            Self::Upstream(m) => (StatusCode::BAD_GATEWAY, json!({ "error": m })),
        };
        (ma, Json(than)).into_response()
    }
}

/// Chặn id sai ngay ở cửa, trước khi chạm đĩa.
fn kiem_id(id: &str, cho_gi: &str) -> Result<(), AppError> {
    if valid_id(id) {
        Ok(())
    } else {
        Err(AppError::BadRequest(format!(
            "{cho_gi} \"{id}\" sai định dạng"
        )))
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
        return Err(AppError::NotFound(format!(
            "không có thiết kế \"{design_id}\""
        )));
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
        return Err(AppError::NotFound(format!(
            "không có thiết kế \"{design_id}\""
        )));
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
        return Err(AppError::NotFound(format!(
            "không có thiết kế \"{design_id}\""
        )));
    }
    st.set_enabled(&design_id, &module_id, body.on)?;
    Ok(Json(json!({ "enabled": body.on })))
}

/// Bản tóm tắt phiên đang chạy, hoặc `null` khi chưa phát phòng nào.
pub async fn get_session(State(st): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "session": st.session_view() }))
}

pub async fn get_source(State(st): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "source": st.nguon() }))
}

/// Đổi nguồn sự kiện. Nguồn cũ tự dừng.
pub async fn put_source(
    State(st): State<Arc<AppState>>,
    Json(cfg): Json<crate::source::SourceCfg>,
) -> Result<Json<Value>, AppError> {
    if cfg.kind == crate::source::SourceKind::Bridge && !cfg.url.starts_with("ws://") {
        // Cầu nối chạy trên chính máy này; nhận ws:// chứ không nhận địa chỉ lạ
        // để không ai cấu hình nhầm thành một máy chủ ngoài Internet.
        return Err(AppError::BadRequest(
            "địa chỉ cầu nối phải bắt đầu bằng ws://".into(),
        ));
    }
    crate::source::mo(st.clone(), cfg);
    Ok(Json(json!({ "source": st.nguon() })))
}

/// Trang quản lý hỏi cổng và token sau khi Tauri khởi động.
pub async fn server_info(State(st): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "port": st.port, "version": env!("CARGO_PKG_VERSION") }))
}

// ---- Khoá API và giọng đọc ----

pub async fn list_secrets(State(st): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "providers": crate::secrets::list(&st.layout) }))
}

pub async fn put_secret(
    State(st): State<Arc<AppState>>,
    Path(provider): Path<String>,
    Json(than): Json<Value>,
) -> Result<Json<Value>, AppError> {
    let p = crate::secrets::set(&st.layout, &provider, &than)?;
    Ok(Json(json!({ "provider": p })))
}

pub async fn delete_secret(
    State(st): State<Arc<AppState>>,
    Path(provider): Path<String>,
) -> Result<Json<Value>, AppError> {
    let co = crate::secrets::remove(&st.layout, &provider)?;
    if !co {
        return Err(AppError::NotFound(format!("không có nhà cung cấp \"{provider}\"")));
    }
    Ok(Json(json!({ "removed": provider })))
}

/// Sinh giọng đọc. Trả thẳng bytes mp3 cho sân khấu phát.
///
/// Gọi nhà cung cấp là việc chặn luồng và có thể mất vài giây, nên đẩy sang
/// luồng riêng — không được giữ một luồng async để ngồi chờ mạng.
pub async fn post_tts(
    State(st): State<Arc<AppState>>,
    Json(req): Json<crate::tts::YeuCau>,
) -> Result<Response, AppError> {
    let layout = st.layout.clone();
    let kq = tokio::task::spawn_blocking(move || crate::tts::sinh(&layout, &req))
        .await
        .map_err(|e| AppError::Internal(format!("luồng giọng đọc hỏng: {e}")))?;

    match kq {
        Ok(bytes) => Ok((
            [
                (axum::http::header::CONTENT_TYPE, "audio/mpeg"),
                (axum::http::header::CACHE_CONTROL, "no-store"),
            ],
            bytes,
        )
            .into_response()),
        Err(crate::tts::TtsError::Invalid(m)) => Err(AppError::BadRequest(m)),
        // Nhà cung cấp từ chối: lỗi của họ hoặc của khoá, không phải của người
        // vừa bấm. 502 để trang quản lý phân biệt được với lỗi nhập liệu.
        Err(crate::tts::TtsError::Provider(m)) => Err(AppError::Upstream(m)),
    }
}

pub async fn get_voice(State(st): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "voice": crate::voice::read(&st.layout) }))
}

pub async fn put_voice(
    State(st): State<Arc<AppState>>,
    Json(cfg): Json<crate::voice::VoiceCfg>,
) -> Result<Json<Value>, AppError> {
    let c = crate::voice::write(&st.layout, cfg)?;
    // Sân khấu đang live phải nghe thấy ngay, không ai đi tải lại trang giữa buổi.
    st.broadcast(json!({ "t": "voice", "cfg": c }));
    Ok(Json(json!({ "voice": c })))
}
