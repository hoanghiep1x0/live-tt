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
pub mod ai_cli;
pub mod cli_goi;
pub mod kho_da_ke;
pub mod ke_truyen;
pub mod anh_truyen;
pub mod chat_tiktok;
pub mod chi_phi;
pub mod api;
pub mod bot;
pub mod designs;
pub mod events;
pub mod files;
pub mod hanh_dong;
pub mod khoi_dong;
pub mod lenh;
pub mod media;
pub mod muse;
pub mod guard;
pub mod paths;
pub mod secrets;
pub mod session;
pub mod settings;
pub mod so;
pub mod source;
pub mod state;
pub mod store;
pub mod truyen_sau;
pub mod tts;
pub mod tu_do;
pub mod voice;
pub mod xung_ho;
pub mod ws;

use std::sync::Arc;

use axum::extract::{DefaultBodyLimit, Request};
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
        // Nguồn `webview`: trang quản lý trong app đẩy tin đọc từ trang TikTok.
        .route("/api/source/day", post(api::post_source_day))
        // Khoá Euler của cầu nối TikTok: chỉ ghi, đọc chỉ biết có hay chưa.
        .route(
            "/api/source/khoa",
            get(api::get_khoa_cau_noi).put(api::put_khoa_cau_noi),
        )
        .route("/api/secrets", get(api::list_secrets))
        .route(
            "/api/secrets/:provider",
            put(api::put_secret).delete(api::delete_secret),
        )
        .route("/api/secrets/:provider/key", get(api::get_secret_key))
        .route("/api/voice", get(api::get_voice).put(api::put_voice))
        // Trang quản lý cũng gọi được, để bấm "Nghe thử" mà không phải mở sân khấu.
        .route("/api/tts", post(api::post_tts))
        // Cầu nối muse.ai: vẽ ảnh bằng tab muse.ai đã đăng nhập trong app.
        .route("/api/muse", get(muse::trang_thai))
        .route("/api/muse/:design_id/ve", post(muse::post_ve))
        .route("/api/muse/:design_id/ve-truyen", post(muse::post_ve_truyen))
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
        // Video người thật có thể vài chục MB: KHÔNG để axum chặn ở mức mặc
        // định 2MB — nó trả văn bản thường, trang đọc JSON là nổ "Unexpected
        // token 'F'", người vận hành không hiểu gì. Giới hạn thật nằm trong
        // `media::TOI_DA`, và nó trả lỗi JSON đọc được.
        .route(
            "/s/media/:design_id",
            post(media::nhan).layer(DefaultBodyLimit::max(media::TOI_DA)),
        )
        .route("/s/media/:design_id/ai", post(media::tao_anh))
        // Dọn ảnh AI vẽ không còn truyện nào dùng.
        .route("/s/media/:design_id/don", post(media::don))
        .route("/s/viet/:design_id", post(ai::viet))
        .route("/s/providers", get(api::list_secrets_public))
        // Ô "AI tạo ảnh" hỏi app có cầu nối muse.ai không (chỉ có ở app desktop).
        .route("/s/muse", get(muse::trang_thai))
        // Ô "AI viết truyện & dẫn chuyện": Codex / Claude Code đã cài, đăng nhập chưa.
        .route("/s/ai-cli", get(ai_cli::get_trang_thai))
        // Đăng nhập tài khoản Claude / Codex chạy NỀN trong máy chủ: bảng xem
        // hiện lời công cụ in ra, có ô dán mã; tải lại trang vẫn giữ phiên.
        // Kho truyện đã kể (giữ cả ảnh): xem lại, kể lại không tốn lượt nào.
        .route(
            "/s/thiet-ke/:design_id/link",
            get(api::get_link_phat).put(api::put_link_phat),
        )
        .route("/s/truyen-kho/:design_id", get(kho_da_ke::get_kho))
        .route("/s/truyen-kho/:design_id/ke-lai", post(kho_da_ke::post_ke_lai))
        .route("/s/truyen-kho/:design_id/xoa", post(kho_da_ke::post_xoa))
        .route("/s/truyen-kho/:design_id/xoa-het", post(kho_da_ke::post_xoa_het))
        // Lịch sử MC gửi / nhận qua Claude Code (session mỗi truyện).
        .route("/s/ai-cli/lich-su", get(cli_goi::get_lich_su))
        .route("/s/ai-cli/dang-nhap", get(ai_cli::get_dang_nhap))
        .route("/s/ai-cli/dang-nhap/nhap", post(ai_cli::post_nhap))
        .route("/s/ai-cli/dang-nhap/dung", post(ai_cli::post_dung))
        .route("/s/ai-cli/dang-nhap/:cong", post(ai_cli::post_dang_nhap))
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
        .route("/s/tu-do/:module_id/*rest", delete(tu_do::xoa))
        // Sổ bền của module (`so.rs`): tính năng tự ghi trong lúc chạy — lớp học
        // nhớ câu đã hỏi, bảng vàng tuần. Sân khấu là nơi chạy lõi nên ghi từ đây.
        .route(
            "/s/so/:design_id/:module_id",
            get(so::doc)
                .put(so::ghi)
                .layer(DefaultBodyLimit::max(so::SO_TOI_DA)),
        );

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
