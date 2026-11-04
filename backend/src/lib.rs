//! Máy chủ nội bộ của Live Studio.
//!
//! Chỉ nghe 127.0.0.1. Phục vụ ba thứ:
//! - `/d/<id>/…`   bản build của thiết kế — URL cho OBS Browser Source
//! - `/a/<id>/…`   assets riêng của thiết kế
//! - `/m/<id>/…`   assets riêng của module, dùng được ở mọi thiết kế
//! - `/api/…`      REST cho trang quản lý, đòi token
//! - `/ws`         bus phát sự kiện và cấu hình xuống

pub mod api;
pub mod designs;
pub mod files;
pub mod guard;
pub mod paths;
pub mod settings;
pub mod state;
pub mod store;
pub mod ws;

use std::sync::Arc;

use axum::extract::Request;
use axum::http::{header, StatusCode};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post, put};
use axum::Router;

pub use paths::Layout;
pub use state::AppState;

/// Dựng router đầy đủ, đã gắn lớp chặn ở cửa.
pub fn router(st: Arc<AppState>) -> Router {
    let api = Router::new()
        .route("/api/info", get(api::server_info))
        .route("/api/designs", get(api::list_designs))
        .route(
            "/api/live",
            get(api::get_live).post(api::post_live).delete(api::delete_live),
        )
        .route("/api/designs/:design_id/settings", put(api::put_settings))
        .route("/api/designs/:design_id/reset", post(api::post_reset))
        .route("/api/designs/:design_id/modules", get(api::list_modules))
        .route("/api/designs/:design_id/modules/:module_id", get(api::get_module))
        .route("/api/designs/:design_id/modules/:module_id/config", put(api::put_config))
        .route("/api/designs/:design_id/modules/:module_id/enabled", post(api::post_enabled));

    let files = Router::new()
        .route("/d/:id/", get(files::serve_root))
        .route("/d/:id/*rest", get(files::serve_dist))
        .route("/a/:id/*rest", get(files::serve_assets))
        .route("/m/:id/*rest", get(files::serve_module_assets));

    // Lớp chặn giữ sẵn trạng thái trong closure thay vì `from_fn_with_state`:
    // cùng kết quả, nhưng không kéo theo suy luận kiểu rắc rối.
    let canh = st.clone();
    api.merge(files)
        .route("/ws", get(ws::upgrade))
        .with_state(st)
        .layer(middleware::from_fn(move |req: Request, next: Next| {
            let st = canh.clone();
            async move {
                // Quyết định xong rồi mới mượn tiếp `req`, để không giữ tham chiếu
                // nào ngang qua `await`.
                let quyet = {
                    let h = req.headers();
                    let lay = |ten: header::HeaderName| {
                        h.get(ten).and_then(|v| v.to_str().ok()).map(str::to_string)
                    };
                    guard::check(
                        req.uri().path(),
                        lay(header::HOST).as_deref(),
                        lay(header::ORIGIN).as_deref(),
                        lay(header::AUTHORIZATION).as_deref(),
                        st.port,
                        &st.token,
                    )
                };
                match quyet {
                    guard::Verdict::Allow => next.run(req).await,
                    guard::Verdict::Deny(ly_do) => tu_choi(req.uri().path(), ly_do),
                }
            }
        }))
}

/// Trả lời khi bị chặn. Nói rõ lý do: người vận hành cần sửa được, không phải đoán.
fn tu_choi(path: &str, ly_do: &'static str) -> Response {
    tracing::warn!(path, ly_do, "chặn yêu cầu");
    let ma = if ly_do.contains("token") {
        StatusCode::UNAUTHORIZED
    } else {
        StatusCode::FORBIDDEN
    };
    (ma, axum::Json(serde_json::json!({ "error": ly_do }))).into_response()
}
