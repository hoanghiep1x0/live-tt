//! Ảnh và video người vận hành tự đưa vào.
//!
//! Để ở `database/designs/<id>/media/` chứ KHÔNG để trong `client/designs/<id>/
//! assets/`: thư mục assets là của bản thiết kế, nằm trong mã nguồn và được
//! commit. File người vận hành tải lên là dữ liệu của họ — xoá cả thư mục
//! `database` là về lại máy sạch, mà mã nguồn thì không mất gì.
//!
//! Phục vụ lại ở `/u/<designId>/<tên file>`. Hai thiết kế không bao giờ đọc
//! được file của nhau: mọi đường dẫn đi qua `safe_join`.

use std::collections::HashMap;
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
pub const TOI_DA: usize = 1024 * 1024 * 1024;

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

/// Nhà cung cấp ảnh mặc định trong kho khoá, khi cấu hình phòng để trống.
/// Người vận hành trỏ sang nhà nào cũng được, miễn nhà đó nói tiếng OpenAI
/// (`POST {base}/images/generations`).
pub const NHA_ANH: &str = "anh";

const MODEL_MAC_DINH: &str = "gpt-image-1";
/// Lời tả dài hơn ngần này là dán nhầm cả bài.
const MAX_TA: usize = 2_000;

#[derive(Debug, Deserialize)]
pub struct XinAnh {
    pub prompt: String,
}

/// Thân yêu cầu gửi nhà cung cấp ảnh. Hàm thuần, test được.
pub fn than_tao_anh(model: &str, ta: &str, co: &str) -> serde_json::Value {
    json!({
        "model": if model.is_empty() { MODEL_MAC_DINH } else { model },
        "prompt": ta.chars().take(MAX_TA).collect::<String>(),
        "n": 1,
        "size": co,
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

/// Địa chỉ vẽ ảnh từ địa chỉ của kết nối. Người vận hành hay dán nguyên đường
/// dẫn trong tài liệu của nhà (`…/v1/images` hoặc `…/v1/images/generations`)
/// thay vì địa chỉ gốc `…/v1` — nối thêm nữa là thành `/images/images/…`, nhà
/// trả 404. Nhận cả ba kiểu. Hàm thuần.
pub fn dia_chi_ve(base: &str) -> String {
    let b = base.trim().trim_end_matches('/');
    let b = b.strip_suffix("/images/generations").unwrap_or(b);
    let b = b.strip_suffix("/images").unwrap_or(b);
    format!("{b}/images/generations")
}

/// Một ảnh vừa vẽ, kèm lượt vẽ đó tốn bao nhiêu (`chi_phi.rs`).
pub(crate) struct AnhVe {
    pub byte: Vec<u8>,
    pub dung: crate::chi_phi::Dung,
    /// `None`: không biết giá.
    pub usd: Option<f64>,
}

/// Tiền một lượt vẽ theo bảng giá OpenRouter của model đó (các trường là chuỗi
/// USD): `image` cho mỗi ảnh, `image_output`/`image_token` cho mỗi token ảnh
/// ra, `prompt` cho mỗi token vào. Bảng có giá theo token mà trả lời không có
/// số token thì `None` — thà ghi "chưa rõ giá" còn hơn báo thiếu. Hàm thuần.
pub fn usd_anh(gia: &serde_json::Value, d: &crate::chi_phi::Dung) -> Option<f64> {
    let g = |k: &str| {
        gia.get(k)
            .and_then(|x| x.as_str().and_then(|s| s.parse::<f64>().ok()).or_else(|| x.as_f64()))
            .unwrap_or(0.0)
    };
    let moi_anh = g("image");
    let tok_ra = g("image_output").max(g("image_token"));
    let tok_vao = g("prompt");
    let can_token = tok_ra > 0.0 || tok_vao > 0.0;
    if can_token && d.tok_ra == 0 && d.tok_vao == 0 {
        return None;
    }
    if moi_anh == 0.0 && !can_token {
        return None;
    }
    Some(moi_anh + tok_ra * d.tok_ra as f64 + tok_vao * d.tok_vao as f64)
}

/// Bảng giá model vẽ của OpenRouter, tải một lần mỗi giờ từ danh sách model
/// công khai (không cần khoá). Chặn luồng.
fn gia_openrouter(model: &str) -> Option<serde_json::Value> {
    use std::sync::{Mutex, OnceLock};
    use std::time::{Duration, Instant};
    static BANG: OnceLock<Mutex<Option<(Instant, HashMap<String, serde_json::Value>)>>> = OnceLock::new();
    let khoa = BANG.get_or_init(|| Mutex::new(None));
    let mut g = khoa.lock().ok()?;
    let cu = g.as_ref().is_some_and(|(luc, _)| luc.elapsed() < Duration::from_secs(3600));
    if !cu {
        let v: serde_json::Value = ureq::get("https://openrouter.ai/api/v1/models?output_modalities=image")
            .call()
            .ok()?
            .body_mut()
            .with_config()
            .limit(8 * 1024 * 1024)
            .read_json()
            .ok()?;
        let bang = v
            .get("data")
            .and_then(serde_json::Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|m| Some((m.get("id")?.as_str()?.to_string(), m.get("pricing")?.clone())))
            .collect();
        *g = Some((Instant::now(), bang));
    }
    g.as_ref()?.1.get(model).cloned()
}

/// Gọi nhà cung cấp rồi trả về đúng mấy byte ảnh. Chặn luồng.
pub(crate) fn goi_tao_anh(
    p: &crate::secrets::Provider,
    model: &str,
    ta: &str,
    co: &str,
) -> Result<AnhVe, String> {
    if p.base_url.is_empty() {
        return Err("nhà cung cấp ảnh chưa có địa chỉ".into());
    }
    let url = dia_chi_ve(&p.base_url);
    let model_that = if model.is_empty() { p.model_cho(crate::secrets::Use::Image) } else { model };
    let agent = ureq::Agent::config_builder()
        .timeout_global(Some(std::time::Duration::from_secs(120)))
        .max_redirects(0)
        .build()
        .new_agent();

    // Không biến mã lỗi thành Err: nhà nói vì sao hỏng (sai model, hết tiền…)
    // ngay trong thân trả lời, và người vận hành cần đọc đúng câu đó.
    let mut res = agent
        .post(&url)
        .config()
        .http_status_as_error(false)
        .build()
        .header("Authorization", &format!("Bearer {}", p.key))
        .send_json(&than_tao_anh(model_that, ta, co))
        .map_err(|e| format!("không gọi được {url}: {e}"))?;
    let ma = res.status();
    let than = res
        .body_mut()
        .with_config()
        .limit(TOI_DA as u64 * 2)
        .read_to_string()
        .map_err(|e| format!("{url} trả mã {ma}, không đọc được trả lời: {e}"))?;
    if !ma.is_success() {
        return Err(format!("nhà cung cấp ảnh trả mã {ma}: {}", crate::ai::loi_nha(&than)));
    }
    let v: serde_json::Value =
        serde_json::from_str(&than).map_err(|e| format!("không đọc được trả lời: {e}"))?;

    // Ghi lại nhà trả gì ngoài ảnh (usage, cost…) — bỏ phần ảnh base64.
    let mut gon = v.clone();
    if let Some(ds) = gon.get_mut("data").and_then(serde_json::Value::as_array_mut) {
        for d in ds.iter_mut().filter_map(serde_json::Value::as_object_mut) {
            for k in ["b64_json", "url"] {
                if d.get(k).and_then(serde_json::Value::as_str).is_some_and(|x| x.len() > 200) {
                    d.insert(k.into(), json!("…"));
                }
            }
        }
    }
    tracing::info!(model = %model_that, tra_loi = %gon.to_string().chars().take(600).collect::<String>(), "vẽ ảnh: nhà trả");

    let dung = crate::chi_phi::dung_tu(&v);
    let usd = dung.usd.or_else(|| {
        if url.contains("openrouter.ai") {
            gia_openrouter(model_that).and_then(|g| usd_anh(&g, &dung))
        } else {
            None
        }
    });
    let byte = match doc_anh(&v) {
        Some(Anh::Base64(b64)) => {
            use base64::Engine;
            base64::engine::general_purpose::STANDARD
                .decode(b64.as_bytes())
                .map_err(|e| format!("ảnh base64 hỏng: {e}"))
        }
        // Có nhà trả ảnh dạng `data:image/png;base64,…` trong ô url.
        Some(Anh::Link(link)) if link.starts_with("data:") => {
            use base64::Engine;
            let b64 = link.split_once(',').map_or("", |(_, b)| b);
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
    }?;
    Ok(AnhVe { byte, dung, usd })
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
    let cfg = st.ai_config(&design_id);
    if !cfg.anh_enabled {
        return loi(StatusCode::BAD_REQUEST, "nhờ AI vẽ ảnh đang tắt ở phòng này");
    }
    let Some((nha, p)) =
        crate::secrets::tim(&st.layout, &cfg.anh_provider, NHA_ANH, crate::secrets::Use::Image)
    else {
        return loi(StatusCode::BAD_REQUEST, &crate::ai::thieu_nha(&cfg.anh_provider, "Ảnh"));
    };
    if p.key.is_empty() {
        return loi(
            StatusCode::BAD_REQUEST,
            &format!("nhà cung cấp ảnh \"{nha}\" chưa có khoá"),
        );
    }

    let model = cfg.anh_model.trim().to_string();
    let co = cfg.co_anh();
    let byte = match tokio::task::spawn_blocking(move || goi_tao_anh(&p, &model, &ta, &co)).await {
        Ok(Ok(anh)) => {
            st.ghi_chi_phi(&design_id, crate::chi_phi::VE_ANH, &anh.dung, anh.usd);
            anh.byte
        }
        Ok(Err(e)) => {
            tracing::warn!("vẽ ảnh: {e}");
            // Câu lỗi chỉ có địa chỉ và lời nhà cung cấp, không bao giờ có khoá.
            return loi(StatusCode::BAD_GATEWAY, &format!("không vẽ được ảnh: {e}"));
        }
        Err(e) => {
            tracing::warn!("vẽ ảnh: tác vụ hỏng: {e}");
            return loi(StatusCode::INTERNAL_SERVER_ERROR, "không vẽ được ảnh");
        }
    };
    if byte.is_empty() {
        return loi(StatusCode::BAD_GATEWAY, "nhà cung cấp trả về ảnh rỗng");
    }

    // Đầu `ai-`: chỉ ảnh AI vẽ mới bị dọn tự động. File người vận hành tự tải
    // lên là của họ, máy không tự xoá.
    let ten = format!("{DAU_AI}{}", ten_moi(crate::state::bay_gio_ms(), st.media_dem(), "png"));
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

/// Cất ảnh AI vẽ vào kho của thiết kế, trả về đường dẫn `/u/…`. Chặn luồng —
/// cho vòng ảnh truyện chạy nền (`anh_truyen`).
pub(crate) fn cat_anh_ai(
    layout: &crate::paths::Layout,
    design_id: &str,
    dem: u64,
    byte: &[u8],
    duoi: &str,
) -> Result<String, String> {
    if byte.is_empty() {
        return Err("nhà cung cấp trả về ảnh rỗng".into());
    }
    if !duoi_hop_le(duoi) {
        return Err(format!("kiểu ảnh không nhận: {duoi}"));
    }
    let ten = format!("{DAU_AI}{}", ten_moi(crate::state::bay_gio_ms(), dem, duoi));
    let thu_muc = layout.media_dir(design_id);
    std::fs::create_dir_all(&thu_muc).map_err(|e| format!("không tạo được thư mục ảnh: {e}"))?;
    let path = safe_join(&thu_muc, &ten).ok_or("tên file không hợp lệ")?;
    std::fs::write(&path, byte).map_err(|e| format!("không ghi được ảnh: {e}"))?;
    Ok(format!("/u/{design_id}/{ten}"))
}

/// Tên ảnh AI vẽ bắt đầu bằng đây — dấu để dọn.
pub const DAU_AI: &str = "ai-";
/// Ảnh mới vẽ chưa kịp vào cấu hình (người vận hành còn đang xem) thì chưa
/// dọn: ngần này là đủ để bấm lưu.
const AN_TOAN_MS: u128 = 15 * 60 * 1000;

/// Ảnh AI vẽ nào là rác: không file cấu hình nào của thiết kế còn nhắc tên nó,
/// và đã nằm đó quá `AN_TOAN_MS`. Hàm thuần — `tuoi_ms` do nơi gọi đo.
pub fn la_rac(ten: &str, tuoi_ms: u128, tham_chieu: &str) -> bool {
    ten.starts_with(DAU_AI) && tuoi_ms >= AN_TOAN_MS && !tham_chieu.contains(ten)
}

/// Dọn ảnh AI vẽ không còn truyện nào dùng — xong một truyện, đổi truyện,
/// vẽ lại một cảnh thì ảnh cũ thành rác trên đĩa. Chỉ xoá ảnh AI (`ai-…`),
/// và chỉ khi mọi file `.json` của thiết kế đều không nhắc tới nó.
pub async fn don(State(st): State<Arc<AppState>>, AxPath(design_id): AxPath<String>) -> Response {
    if !valid_id(&design_id) {
        return loi(StatusCode::BAD_REQUEST, "id thiết kế sai định dạng");
    }
    let layout = st.layout.clone();
    let kq = tokio::task::spawn_blocking(move || don_dong_bo(&layout, &design_id)).await;
    match kq {
        Ok(Ok((xoa, giai_phong))) => Json(json!({ "xoa": xoa, "byte": giai_phong })).into_response(),
        Ok(Err(e)) => {
            tracing::warn!("dọn ảnh: {e}");
            loi(StatusCode::INTERNAL_SERVER_ERROR, "không dọn được ảnh cũ")
        }
        Err(e) => {
            tracing::warn!("dọn ảnh: tác vụ hỏng: {e}");
            loi(StatusCode::INTERNAL_SERVER_ERROR, "không dọn được ảnh cũ")
        }
    }
}

pub(crate) fn don_dong_bo(layout: &crate::paths::Layout, design_id: &str) -> std::io::Result<(usize, u64)> {
    let thu_muc = layout.media_dir(design_id);
    let Some(goc) = thu_muc.parent() else { return Ok((0, 0)) };
    // Mọi thứ cấu hình của thiết kế (module, thiết kế, phiên…) gộp làm một
    // khối chữ: tên ảnh còn nằm ở đâu đó là còn dùng.
    let mut tham_chieu = String::new();
    for e in std::fs::read_dir(goc)?.flatten() {
        let p = e.path();
        if p.extension().and_then(|x| x.to_str()) == Some("json") {
            tham_chieu.push_str(&std::fs::read_to_string(&p).unwrap_or_default());
        }
    }
    let Ok(ds) = std::fs::read_dir(&thu_muc) else { return Ok((0, 0)) };
    let bay_gio = std::time::SystemTime::now();
    let (mut xoa, mut byte) = (0, 0);
    for e in ds.flatten() {
        let ten = e.file_name().to_string_lossy().to_string();
        let Ok(md) = e.metadata() else { continue };
        let tuoi = md
            .modified()
            .ok()
            .and_then(|t| bay_gio.duration_since(t).ok())
            .map_or(0, |d| d.as_millis());
        if md.is_file() && la_rac(&ten, tuoi, &tham_chieu) && std::fs::remove_file(e.path()).is_ok() {
            xoa += 1;
            byte += md.len();
        }
    }
    if xoa > 0 {
        tracing::info!(thiet_ke = %design_id, xoa, byte, "dọn ảnh AI không còn dùng");
    }
    Ok((xoa, byte))
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
        let v = than_tao_anh("", &"a".repeat(MAX_TA + 500), "1024x1024");
        assert_eq!(v["model"], json!(MODEL_MAC_DINH));
        assert_eq!(v["prompt"].as_str().unwrap().chars().count(), MAX_TA);
        assert_eq!(than_tao_anh("dall-e-3", "cây vú sữa", "1024x1024")["model"], json!("dall-e-3"));
        assert_eq!(than_tao_anh("", "x", "1792x1024")["size"], json!("1792x1024"));
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
    fn dia_chi_ve_nhan_ca_duong_dan_dan_thua() {
        for b in [
            "https://openrouter.ai/api/v1",
            "https://openrouter.ai/api/v1/",
            "https://openrouter.ai/api/v1/images",
            "https://openrouter.ai/api/v1/images/generations",
        ] {
            assert_eq!(dia_chi_ve(b), "https://openrouter.ai/api/v1/images/generations", "{b}");
        }
    }

    #[test]
    fn chi_don_anh_ai_cu_khong_con_ai_nhac() {
        let cfg = r#"{"story":{"moc":[{"anh":"/u/ke-chuyen/ai-1-1.png"}]}}"#;
        let lau = AN_TOAN_MS + 1;
        assert!(!la_rac("ai-1-1.png", lau, cfg), "còn dùng");
        assert!(la_rac("ai-2-2.png", lau, cfg), "truyện cũ");
        assert!(!la_rac("ai-3-3.png", 1_000, cfg), "vừa vẽ, chưa kịp lưu");
        assert!(!la_rac("17-1.png", lau, cfg), "file tự tải lên không bao giờ tự xoá");
    }

    #[test]
    fn gia_anh_theo_bang_openrouter() {
        use crate::chi_phi::Dung;
        let qwen = json!({ "image": "0.003", "image_token": "0.00000718562874251497", "prompt": "0" });
        let co_token = Dung { tok_ra: 1000, ..Dung::default() };
        let x = usd_anh(&qwen, &co_token).unwrap();
        assert!((x - (0.003 + 0.007_185_628_742_5)).abs() < 1e-9);
        assert_eq!(usd_anh(&qwen, &Dung::default()), None, "bảng tính theo token mà không có số token");
        assert_eq!(usd_anh(&json!({ "image": "0.04" }), &Dung::default()), Some(0.04));
        assert_eq!(usd_anh(&json!({}), &co_token), None);
    }

    #[test]
    fn ten_moi_khong_dung_hang() {
        assert_eq!(ten_moi(1_700_000_000_000, 7, "PNG"), "1700000000000-7.png");
        assert_ne!(ten_moi(1, 1, "png"), ten_moi(1, 2, "png"));
    }
}
