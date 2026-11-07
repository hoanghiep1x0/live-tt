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

/// Link phát sóng của một phòng, cho BẢNG XEM THỬ ngay trên sân khấu.
///
/// Người vận hành đang đứng ở phòng, đổi link tại chỗ — không phải bỏ phòng ra
/// trang quản lý rồi quay lại. Trả cả link OBS mặc định để trang biết ô đang
/// bỏ trống thì OBS sẽ nhận link nào.
pub async fn get_link_phat(
    State(st): State<Arc<AppState>>,
    Path(design_id): Path<String>,
) -> Result<Json<Value>, AppError> {
    kiem_id(&design_id, "id thiết kế")?;
    let s = crate::settings::read(&st.layout, &design_id);
    let mac_dinh = crate::designs::obs_mac_dinh(st.port, &design_id);
    Ok(Json(json!({
        "obsUrl": s.obs_url.clone().unwrap_or_else(|| mac_dinh.clone()),
        "obsMacDinh": mac_dinh,
        "obsRieng": s.obs_url.is_some(),
        "studioUrl": s.studio_url,
        "kenhDangNghe": st.nguon().cfg.channel,
    })))
}

/// Đổi link phát sóng từ bảng xem thử. CHỈ hai ô link: bảng xem thử không phải
/// chỗ đổi tên phòng, nhận cả gói là mở đường sửa nhầm thứ khác.
///
/// Lưu link Studio của MỘT KÊNH KHÁC thì làm nốt hai việc người vận hành vừa
/// định làm, chứ không chỉ cất cái chuỗi đi:
///
/// 1. Trỏ nguồn dữ liệu sang kênh đó. Không có bước này thì lưu link xong máy
///    chủ vẫn nghe kênh cũ — đúng cái bẫy của trang quản lý, nơi phải bấm
///    thêm nút "Nối kênh" mới thật sự đổi.
/// 2. Mở phiên trắng. Buổi live mới mà 👥, tim, quà, bảng top còn mang số của
///    buổi trước thì những con số ấy đang nói dối về buổi đang chạy.
pub async fn put_link_phat(
    State(st): State<Arc<AppState>>,
    Path(design_id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    kiem_id(&design_id, "id thiết kế")?;

    let mut patch = serde_json::Map::new();
    for k in ["studioUrl", "obsUrl"] {
        if let Some(v) = body.get(k) {
            patch.insert(k.to_string(), v.clone());
        }
    }
    let doi_studio = patch.contains_key("studioUrl");
    let s = st.set_settings(&design_id, &Value::Object(patch))?;

    // Nick mới khác kênh đang nghe thì mới nối lại — lưu lại đúng link cũ
    // không được phép quật đổ buổi live đang chạy ngon lành.
    let kenh_cu = st.nguon().cfg.channel.trim().trim_start_matches('@').to_lowercase();
    let nick = s.studio_url.as_deref().and_then(crate::settings::nick_tu_link);
    // Nguồn dữ liệu là của CẢ MÁY CHỦ, chỉ một kênh một lúc. Phòng khác đang
    // phát mà ta nối kênh theo link của phòng này là cướp nguồn ngay giữa buổi
    // live của họ. Lúc đó chỉ cất link, đợi tới lượt phòng này lên sóng.
    let live = st.live();
    let duoc_noi = live.is_none() || live.as_deref() == Some(design_id.as_str());
    let nick_moi = doi_studio && nick.as_ref().is_some_and(|n| *n != kenh_cu);
    // `buoc`: người vận hành BẤM nút "Kết nối" — nối lại kể cả khi link y hệt
    // cũ. Chính là lúc cần nó nhất: cầu nối rớt, hay kênh vừa mở live lại, mà
    // link thì chẳng có gì để sửa cho nút sáng lên.
    let buoc = body.get("buoc").and_then(Value::as_bool) == Some(true);
    let doi_kenh = (nick_moi || (buoc && nick.is_some())) && duoc_noi;
    // Chỉ báo "chưa nối" khi thật sự CÓ kênh mới để nối mà không nối được —
    // lưu lại link của đúng kênh đang nghe thì không có gì phải nói.
    let phong_khac = live.filter(|l| l != &design_id && nick_moi);

    if let Some(n) = nick.clone().filter(|_| doi_kenh) {
        let cu = st.nguon().cfg;
        crate::source::mo(
            st.clone(),
            crate::source::SourceCfg {
                kind: crate::source::SourceKind::Bridge,
                channel: n.clone(),
                ..cu
            },
        );
        tracing::info!(thiet_ke = %design_id, kenh = %n, "bảng xem thử đổi link Studio: nối sang kênh mới");
    }
    // Bấm "Kết nối" là ĐẾM LẠI TỪ 0, kể cả khi link không đổi gì. Người vận
    // hành bấm nút này chính vì con số đang sai — giữ lại số cũ thì bấm xong
    // nhìn như không có gì xảy ra, mà đó đúng là thứ họ kêu.
    let da_dem_lai = doi_kenh && st.lam_moi_phien(&design_id);

    let mac_dinh = crate::designs::obs_mac_dinh(st.port, &design_id);
    Ok(Json(json!({
        "obsUrl": s.obs_url.clone().unwrap_or_else(|| mac_dinh.clone()),
        "obsMacDinh": mac_dinh,
        "obsRieng": s.obs_url.is_some(),
        "studioUrl": s.studio_url,
        "kenhDangNghe": st.nguon().cfg.channel,
        "daNoiKenh": doi_kenh,
        "kenhMoi": nick_moi,
        "daDemLai": da_dem_lai,
        // Có giá trị nghĩa là: đã cất link, nhưng CHƯA nối kênh, vì phòng này
        // không phải phòng đang phát. Trang nói thẳng ra chứ đừng để người
        // vận hành tưởng đã đổi xong.
        "phongDangPhat": phong_khac,
    })))
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

/// Khoá Euler Stream của cầu nối TikTok: chỉ báo có hay chưa, không bao giờ
/// trả giá trị (docs/07 §5).
pub async fn get_khoa_cau_noi(State(st): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "hasKey": crate::secrets::khoa_euler(&st.layout).is_some() }))
}

/// Đặt khoá Euler (`{ "key": "…" }`, rỗng là xoá). Cầu nối đọc khoá lúc bật,
/// nên đang chạy cầu nối mặc định thì mở lại nguồn để nó bật lại với khoá mới.
pub async fn put_khoa_cau_noi(
    State(st): State<Arc<AppState>>,
    Json(than): Json<Value>,
) -> Result<Json<Value>, AppError> {
    let khoa = than.get("key").and_then(Value::as_str).unwrap_or("");
    let co = crate::secrets::dat_khoa_euler(&st.layout, khoa)?;
    let cfg = st.nguon().cfg;
    if crate::source::tien_trinh::can_tu_bat(&cfg) {
        crate::source::mo(st.clone(), cfg);
    }
    Ok(Json(json!({ "hasKey": co })))
}

/// Trang TikTok trong app đẩy dữ liệu vào nguồn `webview`.
///
/// Thân là JSON theo đúng giao thức cầu nối (`source::bridge`): một tin hoặc
/// một mảng tin — sự kiện, `{type:"viewers",count}`, `{type:"status",state,message}`.
/// Không lọc tin cũ theo `ts`: trang quản lý đã bỏ tin `isHistory` lúc giải mã.
pub async fn post_source_day(
    State(st): State<Arc<AppState>>,
    body: String,
) -> Result<Json<Value>, AppError> {
    use crate::source::{bridge, SourceKind};
    let kind = st.nguon().cfg.kind;
    if kind != SourceKind::Webview {
        // Đổi nguồn rồi mà trang cũ còn đẩy tới: từ chối, không trộn hai nguồn.
        return Err(AppError::BadRequest(
            "nguồn hiện tại không phải \"Trang TikTok\" — chọn lại nguồn trên thanh trên".into(),
        ));
    }
    for x in bridge::doc_tin(&body, 0) {
        bridge::ap_tin(&st, x);
    }
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

/// Danh sách kết nối cho bảng xem thử trên sân khấu: đủ để chọn, không địa
/// chỉ, không khoá.
pub async fn list_secrets_public(State(st): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "providers": crate::secrets::list_public(&st.layout) }))
}

pub async fn put_secret(
    State(st): State<Arc<AppState>>,
    Path(provider): Path<String>,
    Json(than): Json<Value>,
) -> Result<Json<Value>, AppError> {
    let p = crate::secrets::set(&st.layout, &provider, &than)?;
    Ok(Json(json!({ "provider": p })))
}

/// Khoá của MỘT kết nối, cho form sửa: hiện sẵn dưới dạng chấm, bấm con mắt
/// là thấy lại. Chỉ gọi khi người vận hành bấm Sửa — danh sách thì vẫn không
/// bao giờ kèm khoá. `no-store` để trình duyệt không giữ lại bản nào.
pub async fn get_secret_key(
    State(st): State<Arc<AppState>>,
    Path(provider): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let Some(p) = crate::secrets::get(&st.layout, &provider) else {
        return Err(AppError::NotFound(format!("không có nhà cung cấp \"{provider}\"")));
    };
    Ok((
        [(axum::http::header::CACHE_CONTROL, "no-store")],
        Json(json!({ "key": p.key })),
    ))
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
    let phong = req.design_id.clone().filter(|id| crate::paths::valid_id(id));
    let kq = tokio::task::spawn_blocking(move || crate::tts::sinh_kem(&layout, &req))
        .await
        .map_err(|e| AppError::Internal(format!("luồng giọng đọc hỏng: {e}")))?;

    match kq {
        Ok(doc) => {
            // Sổ chi phí: giọng Edge / Google qua 9router là miễn phí; nhà khác
            // tính theo gói của họ, máy không biết giá — ghi "chưa rõ".
            if let Some(id) = &phong {
                let d = crate::chi_phi::Dung { ky_tu: doc.ky_tu, ..Default::default() };
                let usd = crate::chi_phi::giong_mien_phi(&doc.giong).then_some(0.0);
                st.ghi_chi_phi(id, crate::chi_phi::GIONG, &d, usd);
            }
            let bytes = doc.byte;
            Ok((
            [
                (axum::http::header::CONTENT_TYPE, "audio/mpeg"),
                (axum::http::header::CACHE_CONTROL, "no-store"),
            ],
            bytes,
        )
            .into_response())
        }
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
