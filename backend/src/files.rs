//! Phục vụ file của thiết kế: bản build cho OBS và assets riêng.
//!
//! Hai thiết kế khác nhau không bao giờ đọc được file của nhau — mọi đường dẫn
//! đi qua `safe_join` ở `paths.rs`.

use std::path::{Path, PathBuf};
use std::sync::Arc;

use axum::body::Body;
use axum::extract::{Path as AxPath, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};

use crate::paths::{safe_join, valid_id};
use crate::state::AppState;

/// Nơi lấy file: bản build hay thư mục assets.
#[derive(Clone, Copy)]
pub enum Kind {
    Dist,
    Assets,
}

pub async fn serve_root(
    State(st): State<Arc<AppState>>,
    AxPath(id): AxPath<String>,
) -> Response {
    serve(&st, Kind::Dist, &id, "index.html").await
}

pub async fn serve_dist(
    State(st): State<Arc<AppState>>,
    AxPath((id, rest)): AxPath<(String, String)>,
) -> Response {
    serve(&st, Kind::Dist, &id, &rest).await
}

pub async fn serve_assets(
    State(st): State<Arc<AppState>>,
    AxPath((id, rest)): AxPath<(String, String)>,
) -> Response {
    serve(&st, Kind::Assets, &id, &rest).await
}

async fn serve(st: &AppState, kind: Kind, id: &str, rest: &str) -> Response {
    if !valid_id(id) {
        return loi(StatusCode::BAD_REQUEST, "id thiết kế sai định dạng");
    }
    let base = match kind {
        Kind::Dist => st.layout.design_dist(id),
        Kind::Assets => st.layout.design_assets(id),
    };

    // Đường dẫn thư mục ("" hoặc kết thúc bằng "/") thì lấy index.html.
    let rel = if rest.is_empty() || rest.ends_with('/') {
        format!("{rest}index.html")
    } else {
        rest.to_string()
    };

    let Some(path) = safe_join(&base, &rel) else {
        return loi(StatusCode::FORBIDDEN, "đường dẫn không hợp lệ");
    };

    match tokio::fs::read(&path).await {
        Ok(body) => {
            let mime = mime_guess::from_path(&path).first_or_octet_stream();
            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime.as_ref())
                .header(header::CACHE_CONTROL, cache_cho(&path))
                .body(Body::from(body))
                .expect("dựng phản hồi")
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            loi(StatusCode::NOT_FOUND, "không có file này")
        }
        Err(_) => loi(StatusCode::INTERNAL_SERVER_ERROR, "không đọc được file"),
    }
}

/// HTML không được cache: sửa thiết kế rồi tải lại OBS phải thấy bản mới ngay.
/// Assets có tên băm thì cache lâu cũng được, nhưng chưa có bước băm tên nên để ngắn.
fn cache_cho(path: &Path) -> &'static str {
    match path.extension().and_then(|s| s.to_str()) {
        Some("html") => "no-store",
        _ => "public, max-age=60",
    }
}

fn loi(ma: StatusCode, msg: &str) -> Response {
    (ma, msg.to_string()).into_response()
}

/// Dùng trong test: kiểm đường dẫn được ghép ra có nằm trong thư mục thiết kế không.
pub fn resolve_for_test(base: &Path, rest: &str) -> Option<PathBuf> {
    let rel = if rest.is_empty() || rest.ends_with('/') {
        format!("{rest}index.html")
    } else {
        rest.to_string()
    };
    safe_join(base, &rel)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> PathBuf {
        PathBuf::from("/goc/client/designs/ke-chuyen/dist")
    }

    #[test]
    fn duong_dan_thu_muc_lay_index_html() {
        assert!(resolve_for_test(&base(), "").unwrap().ends_with("index.html"));
        assert!(resolve_for_test(&base(), "ve/").unwrap().ends_with("index.html"));
    }

    #[test]
    fn khong_doc_duoc_file_cua_thiet_ke_khac() {
        assert!(resolve_for_test(&base(), "../../hip-hop/dist/index.html").is_none());
        assert!(resolve_for_test(&base(), "..\\..\\hip-hop\\dist\\index.html").is_none());
    }

    #[test]
    fn khong_doc_duoc_khoa_api() {
        assert!(resolve_for_test(&base(), "../../../../database/secrets.json").is_none());
    }

    #[test]
    fn html_khong_duoc_cache() {
        assert_eq!(cache_cho(Path::new("a/index.html")), "no-store");
        assert_ne!(cache_cho(Path::new("a/bg.png")), "no-store");
    }
}
