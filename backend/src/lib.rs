//! Máy chủ nội bộ của Live Studio.
//!
//! Chỉ nghe 127.0.0.1. Phục vụ ba thứ:
//! - `/d/<id>/…`   bản build của thiết kế — URL cho OBS Browser Source
//! - `/a/<id>/…`   assets riêng của thiết kế
//! - `/m/<id>/…`   assets riêng của module, dùng được ở mọi thiết kế
//! - `/api/…`      REST cho trang quản lý, đòi token
//! - `/s/…`        lối cho sân khấu: giọng đọc, không đòi token
//! - `/ws`         bus phát sự kiện và cấu hình xuống

pub mod ai;
pub mod api;
pub mod bot;
pub mod designs;
pub mod events;
pub mod files;
pub mod hanh_dong;
pub mod media;
pub mod guard;
pub mod paths;
pub mod secrets;
pub mod session;
pub mod settings;
pub mod source;
pub mod state;
pub mod store;
pub mod tts;
pub mod tu_do;
pub mod voice;
pub mod ws;

use std::sync::Arc;

use axum::extract::Request;
use axum::http::{header, StatusCode};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::{delete, get, post, put};
use axum::Router;

pub use paths::Layout;
pub use state::AppState;

/// Dựng router đầy đủ, đã gắn lớp chặn ở cửa.
pub fn router(st: Arc<AppState>) -> Router {
    let api = Router::new()
        .route("/api/info", get(api::server_info))
        .route("/api/designs", get(api::list_designs))
        .route("/api/session", get(api::get_session))
        .route("/api/source", get(api::get_source).put(api::put_source))
        .route("/api/secrets", get(api::list_secrets))
        .route(
            "/api/secrets/:provider",
            put(api::put_secret).delete(api::delete_secret),
        )
        .route("/api/secrets/:provider/key", get(api::get_secret_key))
        .route("/api/voice", get(api::get_voice).put(api::put_voice))
        // Trang quản lý cũng gọi được, để bấm "Nghe thử" mà không phải mở sân khấu.
        .route("/api/tts", post(api::post_tts))
        .route(
            "/api/live",
            get(api::get_live)
                .post(api::post_live)
                .delete(api::delete_live),
        )
        .route("/api/designs/:design_id/settings", put(api::put_settings))
        .route("/api/designs/:design_id/reset", post(api::post_reset))
        .route("/api/designs/:design_id/modules", get(api::list_modules))
        .route(
            "/api/designs/:design_id/modules/:module_id",
            get(api::get_module),
        )
        .route(
            "/api/designs/:design_id/modules/:module_id/config",
            put(api::put_config),
        )
        .route(
            "/api/designs/:design_id/modules/:module_id/enabled",
            post(api::post_enabled),
        )
        .route(
            "/api/designs/:design_id/modules/:module_id/action",
            post(hanh_dong::post_action),
        );

    // Lối cho SÂN KHẤU: không đòi token, vì sân khấu chạy trong OBS và không có
    // chỗ nào giữ token. Vẫn qua lớp chặn Host và Origin như mọi thứ khác, nên
    // một trang web ngoài không gọi vào được.
    let stage = Router::new()
        // Ghi được từ sân khấu, cùng lối với `PUT /s/secrets/:id`: ngăn xem thử
        // phải sửa được dàn giọng — giọng nào đọc bằng kết nối nào — mà trang
        // này không giữ token. Dàn giọng không chứa khoá.
        .route("/s/voice", get(api::get_voice).put(api::put_voice))
        .route("/s/tts", post(api::post_tts))
        // Bảng xem thử nằm ngay trong trang sân khấu, mà trang đó không giữ
        // token. Vẫn qua lớp chặn Host và Origin như mọi thứ khác.
        .route("/s/media/:design_id", post(media::nhan))
        .route("/s/media/:design_id/ai", post(media::tao_anh))
        .route("/s/viet/:design_id", post(ai::viet))
        .route("/s/providers", get(api::list_secrets_public))
        // Cắm khoá ngay từ bảng xem thử, khỏi phải mở trang quản lý. Người
        // vận hành yêu cầu, và đây là đánh đổi có thật — ghi rõ ở đây để lần
        // sau đọc lại còn biết đã cân nhắc gì (docs/05-backend.md §5).
        //
        // Danh sách (`list_secrets_public`) vẫn không bao giờ kèm khoá. Đọc
        // khoá của MỘT kết nối thì được, qua `/s/secrets/:id/key` — người vận
        // hành muốn form sửa hiện sẵn khoá dạng chấm và bấm con mắt là thấy
        // lại (trước đây lối này chỉ ghi). Đánh đổi: thứ gì gọi được `/s/`
        // trên máy này cũng ĐỌC và GHI ĐÈ được khoá — mà nó vốn đã đọc được
        // file kho trên đĩa, nên thêm rủi ro không đáng kể. Cùng mức tin cậy với
        // `/s/viet` và `/s/media` — hai lối đã tiêu được tiền API — và lớp
        // chặn Host + Origin vẫn nguyên, nên một trang web ngoài không gọi
        // vào được. XOÁ kết nối thì vẫn phải sang trang quản lý: xoá nhầm
        // giữa lúc live là tắt tính năng mà không ai thấy.
        .route("/s/secrets/:provider", put(api::put_secret))
        .route("/s/secrets/:provider/key", get(api::get_secret_key))
        // Tủ đồ của module (assets/tu-do/<nguồn>/<ô>/<món>/): sân khấu cần danh mục để mặc đồ. XOÁ cũng mở ở đây,
        // khác hẳn khoá AI ở trên: người vận hành yêu cầu dọn tủ ngay từ bảng xem, và xoá nhầm chỉ mất một món đồ
        // (chép lại từ D:\Assets là xong), không tắt tính năng nào giữa lúc live. Bảng xem vẫn hỏi lại trước khi xoá.
        .route("/s/tu-do/:module_id", get(tu_do::liet_ke))
        .route("/s/tu-do/:module_id/*rest", delete(tu_do::xoa));

    let files = Router::new()
        .route("/d/:id/", get(files::serve_root))
        .route("/d/:id/*rest", get(files::serve_dist))
        .route("/a/:id/*rest", get(files::serve_assets))
        .route("/m/:id/*rest", get(files::serve_module_assets))
        .route("/u/:design_id/:ten", get(media::phuc_vu));

    // Lớp chặn giữ sẵn trạng thái trong closure thay vì `from_fn_with_state`:
    // cùng kết quả, nhưng không kéo theo suy luận kiểu rắc rối.
    let canh = st.clone();
    api.merge(stage)
        .merge(files)
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
