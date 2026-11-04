//! Ảnh và video người vận hành tự đưa vào.
//!
//! Để ở `database/designs/<id>/media/` chứ KHÔNG để trong `client/designs/<id>/
//! assets/`: thư mục assets là của bản thiết kế, nằm trong mã nguồn và được
//! commit. File người vận hành tải lên là dữ liệu của họ — xoá cả thư mục
//! `database` là về lại máy sạch, mà mã nguồn thì không mất gì.
//!
//! Phục vụ lại ở `/u/<designId>/<tên file>`. Hai thiết kế không bao giờ đọc
//! được file của nhau: mọi đường dẫn đi qua `safe_join`.

use std::path::PathBuf;
use std::sync::Arc;

use axum::body::{Body, Bytes};
use axum::extract::{Path as AxPath, Query, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Deserialize;
use serde_json::json;

use crate::paths::{safe_join, valid_id};
use crate::state::AppState;

/// Lớn hơn ngần này thì OBS tải về cũng khựng, mà ổ đĩa thì đầy nhanh.
pub const TOI_DA: usize = 64 * 1024 * 1024;

/// Đuôi file nhận vào. Danh sách CHO PHÉP chứ không phải danh sách cấm: thêm
/// một đuôi mới là một quyết định, còn quên chặn một đuôi lạ thì thành lỗ hổng.
const DUOI: &[&str] = &[
    "png", "jpg", "jpeg", "webp", "gif", "avif", "mp4", "webm", "m4v", "mov",
];

pub fn duoi_hop_le(ext: &str) -> bool {
    let e = ext.trim().trim_start_matches('.').to_lowercase();
    DUOI.contains(&e.as_str())
}

/// Đuôi suy từ kiểu nội dung, khi người gọi không nói rõ.
pub fn duoi_tu_kieu(mime: &str) -> Option<&'static str> {
    match mime.split(';').next().unwrap_or("").trim() {
        "image/png" => Some("png"),
        "image/jpeg" => Some("jpg"),
        "image/webp" => Some("webp"),
        "image/gif" => Some("gif"),
        "image/avif" => Some("avif"),
        "video/mp4" => Some("mp4"),
        "video/webm" => Some("webm"),
        "video/quicktime" => Some("mov"),
        _ => None,
    }
}

/// Tên file mới: mốc giờ cộng một số đếm, nên không bao giờ đè lên file cũ và
/// vẫn đọc được bằng mắt là tải lên lúc nào.
pub fn ten_moi(now_ms: i64, dem: u64, ext: &str) -> String {
    format!("{now_ms}-{dem}.{}", ext.trim_start_matches('.').to_lowercase())
}

#[derive(Debug, Deserialize)]
pub struct ThamSo {
    /// Đuôi file. Thiếu thì suy từ `Content-Type`.
    #[serde(default)]
    pub ext: Option<String>,
}

fn loi(ma: StatusCode, vi_sao: &str) -> Response {
    (ma, Json(json!({ "error": vi_sao }))).into_response()
}

/// Nhận một file tải lên. Thân yêu cầu là chính nội dung file, không bọc
/// multipart: bảng xem gửi thẳng `File` từ trình duyệt, khỏi phải dựng và bóc
/// một lớp bao bì chỉ để chuyển đúng một file.
pub async fn nhan(
    State(st): State<Arc<AppState>>,
    AxPath(design_id): AxPath<String>,
    Query(q): Query<ThamSo>,
    headers: axum::http::HeaderMap,
    than: Bytes,
) -> Response {
    if !valid_id(&design_id) {
        return loi(StatusCode::BAD_REQUEST, "id thiết kế sai định dạng");
    }
    if than.is_empty() {
        return loi(StatusCode::BAD_REQUEST, "file rỗng");
    }
    if than.len() > TOI_DA {
        return loi(StatusCode::PAYLOAD_TOO_LARGE, "file quá lớn");
    }

    let kieu = headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let ext = match q.ext.as_deref() {
        Some(e) if duoi_hop_le(e) => e.trim_start_matches('.').to_lowercase(),
        Some(_) => return loi(StatusCode::BAD_REQUEST, "đuôi file không nhận"),
        None => match duoi_tu_kieu(kieu) {
            Some(e) => e.to_string(),
            None => return loi(StatusCode::BAD_REQUEST, "không đoán được loại file"),
        },
    };

    let ten = ten_moi(crate::state::bay_gio_ms(), st.media_dem(), &ext);
    let thu_muc = st.layout.media_dir(&design_id);
    if let Err(e) = tokio::fs::create_dir_all(&thu_muc).await {
        tracing::warn!("không tạo được thư mục media: {e}");
        return loi(StatusCode::INTERNAL_SERVER_ERROR, "không ghi được file");
    }
    let Some(path) = safe_join(&thu_muc, &ten) else {
        return loi(StatusCode::BAD_REQUEST, "tên file không hợp lệ");
    };
    if let Err(e) = tokio::fs::write(&path, &than).await {
        tracing::warn!("không ghi được media: {e}");
        return loi(StatusCode::INTERNAL_SERVER_ERROR, "không ghi được file");
    }

    tracing::info!(thiet_ke = %design_id, %ten, co = than.len(), "nhận file tải lên");
    Json(json!({ "url": format!("/u/{design_id}/{ten}"), "name": ten })).into_response()
}

/// Nhà cung cấp ảnh trong kho khoá. Người vận hành thêm ở trang quản lý.
pub const NHA_ANH: &str = "anh";

const MODEL_MAC_DINH: &str = "gpt-image-1";
/// Lời tả dài hơn ngần này là dán nhầm cả bài.
const MAX_TA: usize = 1_000;

#[derive(Debug, Deserialize)]
pub struct XinAnh {
    pub prompt: String,
}

/// Thân yêu cầu gửi nhà cung cấp ảnh. Hàm thuần, test được.
pub fn than_tao_anh(model: &str, ta: &str) -> serde_json::Value {
    json!({
        "model": if model.is_empty() { MODEL_MAC_DINH } else { model },
        "prompt": ta.chars().take(MAX_TA).collect::<String>(),
        "n": 1,
        "size": "1024x1024",
        "response_format": "b64_json",
    })
}

/// Bóc ảnh từ phần trả lời. Nhà nào trả base64, nhà nào trả link — nhận cả hai.
pub fn doc_anh(v: &serde_json::Value) -> Option<Anh> {
    let d = v.get("data")?.as_array()?.first()?;
    if let Some(b64) = d.get("b64_json").and_then(serde_json::Value::as_str) {
        return Some(Anh::Base64(b64.to_string()));
    }
    d.get("url")
        .and_then(serde_json::Value::as_str)
        .map(|u| Anh::Link(u.to_string()))
}

#[derive(Debug, PartialEq, Eq)]
pub enum Anh {
    Base64(String),
    Link(String),
}

/// Gọi nhà cung cấp rồi trả về đúng mấy byte ảnh. Chặn luồng.
fn goi_tao_anh(p: &crate::secrets::Provider, ta: &str) -> Result<Vec<u8>, String> {
    if p.base_url.is_empty() {
        return Err("nhà cung cấp ảnh chưa có địa chỉ".into());
    }
    let url = format!("{}/images/generations", p.base_url.trim_end_matches('/'));
    let agent = ureq::Agent::config_builder()
        .timeout_global(Some(std::time::Duration::from_secs(120)))
        .max_redirects(0)
        .build()
        .new_agent();

    let mut res = agent
        .post(&url)
        .header("Authorization", &format!("Bearer {}", p.key))
        .send_json(&than_tao_anh(&p.model, ta))
        .map_err(|e| match e {
            ureq::Error::StatusCode(ma) => format!("{url} trả mã {ma}"),
            khac => format!("không gọi được {url}: {khac}"),
        })?;
    let v: serde_json::Value = res
        .body_mut()
        .read_json()
        .map_err(|e| format!("không đọc được trả lời: {e}"))?;

    match doc_anh(&v) {
        Some(Anh::Base64(b64)) => {
            use base64::Engine;
            base64::engine::general_purpose::STANDARD
                .decode(b64.as_bytes())
                .map_err(|e| format!("ảnh base64 hỏng: {e}"))
        }
        Some(Anh::Link(link)) => {
            let mut r = agent
                .get(&link)
                .call()
                .map_err(|e| format!("không tải được ảnh: {e}"))?;
            let mut byte = Vec::new();
            use std::io::Read;
            r.body_mut()
                .as_reader()
                .take(TOI_DA as u64)
                .read_to_end(&mut byte)
                .map_err(|e| format!("không đọc được ảnh: {e}"))?;
            Ok(byte)
        }
        None => Err("nhà cung cấp không trả về ảnh nào".into()),
    }
}

/// Nhờ AI vẽ một ảnh rồi cất vào kho của thiết kế, trả về đường dẫn như file
/// tải lên. Ảnh ở lại trên đĩa: hôm sau mở lại phòng thì nó vẫn còn, không
/// phải gọi lại và trả tiền lần nữa.
pub async fn tao_anh(
    State(st): State<Arc<AppState>>,
    AxPath(design_id): AxPath<String>,
    Json(xin): Json<XinAnh>,
) -> Response {
    if !valid_id(&design_id) {
        return loi(StatusCode::BAD_REQUEST, "id thiết kế sai định dạng");
    }
    let ta = xin.prompt.trim().to_string();
    if ta.is_empty() {
        return loi(StatusCode::BAD_REQUEST, "chưa tả ảnh cần vẽ");
    }
    let Some(p) = crate::secrets::get(&st.layout, NHA_ANH) else {
        return loi(
            StatusCode::BAD_REQUEST,
            "chưa có khoá cho nhà cung cấp ảnh (tên ngắn \"anh\")",
        );
    };
    if p.key.is_empty() {
        return loi(StatusCode::BAD_REQUEST, "nhà cung cấp ảnh chưa có khoá");
    }

    let byte = match tokio::task::spawn_blocking(move || goi_tao_anh(&p, &ta)).await {
        Ok(Ok(b)) => b,
        Ok(Err(e)) => {
            tracing::warn!("vẽ ảnh: {e}");
            return loi(StatusCode::BAD_GATEWAY, "không vẽ được ảnh");
        }
        Err(e) => {
            tracing::warn!("vẽ ảnh: tác vụ hỏng: {e}");
            return loi(StatusCode::INTERNAL_SERVER_ERROR, "không vẽ được ảnh");
        }
    };
    if byte.is_empty() {
        return loi(StatusCode::BAD_GATEWAY, "nhà cung cấp trả về ảnh rỗng");
    }

    let ten = ten_moi(crate::state::bay_gio_ms(), st.media_dem(), "png");
    let thu_muc = st.layout.media_dir(&design_id);
    if tokio::fs::create_dir_all(&thu_muc).await.is_err() {
        return loi(StatusCode::INTERNAL_SERVER_ERROR, "không ghi được file");
    }
    let Some(path) = safe_join(&thu_muc, &ten) else {
        return loi(StatusCode::BAD_REQUEST, "tên file không hợp lệ");
    };
    if tokio::fs::write(&path, &byte).await.is_err() {
        return loi(StatusCode::INTERNAL_SERVER_ERROR, "không ghi được file");
    }

    tracing::info!(thiet_ke = %design_id, %ten, co = byte.len(), "AI vẽ xong một ảnh");
    Json(json!({ "url": format!("/u/{design_id}/{ten}"), "name": ten })).into_response()
}

/// Phục vụ lại file đã tải lên.
pub async fn phuc_vu(
    State(st): State<Arc<AppState>>,
    AxPath((design_id, ten)): AxPath<(String, String)>,
) -> Response {
    if !valid_id(&design_id) {
        return loi(StatusCode::BAD_REQUEST, "id thiết kế sai định dạng");
    }
    let Some(path): Option<PathBuf> = safe_join(&st.layout.media_dir(&design_id), &ten) else {
        return loi(StatusCode::FORBIDDEN, "đường dẫn không hợp lệ");
    };
    match tokio::fs::read(&path).await {
        Ok(than) => {
            let mime = mime_guess::from_path(&path).first_or_octet_stream();
            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime.as_ref())
                // File tải lên không bao giờ đổi nội dung dưới cùng một tên —
                // tên mang mốc giờ. Nên cho đệm thật lâu.
                .header(header::CACHE_CONTROL, "public, max-age=31536000, immutable")
                .body(Body::from(than))
                .expect("dựng phản hồi")
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            loi(StatusCode::NOT_FOUND, "không có file này")
        }
        Err(_) => loi(StatusCode::INTERNAL_SERVER_ERROR, "không đọc được file"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chi_nhan_duoi_trong_danh_sach() {
        assert!(duoi_hop_le("png"));
        assert!(duoi_hop_le(".MP4"));
        assert!(!duoi_hop_le("exe"));
        assert!(!duoi_hop_le("svg"), "svg chạy được script, không nhận");
        assert!(!duoi_hop_le("html"));
        assert!(!duoi_hop_le(""));
    }

    #[test]
    fn doan_duoi_tu_kieu_noi_dung() {
        assert_eq!(duoi_tu_kieu("image/png"), Some("png"));
        assert_eq!(duoi_tu_kieu("video/mp4; codecs=avc1"), Some("mp4"));
        assert_eq!(duoi_tu_kieu("application/octet-stream"), None);
        assert_eq!(duoi_tu_kieu("text/html"), None);
    }

    #[test]
    fn than_tao_anh_cat_loi_ta_qua_dai() {
        let v = than_tao_anh("", &"a".repeat(MAX_TA + 500));
        assert_eq!(v["model"], json!(MODEL_MAC_DINH));
        assert_eq!(v["prompt"].as_str().unwrap().chars().count(), MAX_TA);
        assert_eq!(than_tao_anh("dall-e-3", "cây vú sữa")["model"], json!("dall-e-3"));
    }

    #[test]
    fn doc_duoc_ca_anh_base64_lan_anh_theo_link() {
        assert_eq!(
            doc_anh(&json!({ "data": [{ "b64_json": "AAA" }] })),
            Some(Anh::Base64("AAA".into()))
        );
        assert_eq!(
            doc_anh(&json!({ "data": [{ "url": "https://x/y.png" }] })),
            Some(Anh::Link("https://x/y.png".into()))
        );
        assert_eq!(doc_anh(&json!({ "data": [] })), None);
        assert_eq!(doc_anh(&json!({ "loi": "het tien" })), None);
    }

    #[test]
    fn ten_moi_khong_dung_hang() {
        assert_eq!(ten_moi(1_700_000_000_000, 7, "PNG"), "1700000000000-7.png");
        assert_ne!(ten_moi(1, 1, "png"), ten_moi(1, 2, "png"));
    }
}
