//! Nút bấm của module (`ModuleUi.actions`): "Nhảy ngay", "Quay"…
//!
//! Bấm là việc tức thời, không phải cấu hình: backend không lưu gì, chỉ chuyển
//! xuống sân khấu thành tin `action`, lõi module tự xử trong `onAction`. Backend
//! không biết module nào có nút gì — whitelist ở đây là hình dạng (id hợp lệ),
//! còn `op` lạ thì lõi module bỏ qua.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::extract::{Path, State};
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::paths::valid_id;
use crate::state::{AppError, AppState};

/// Số của lần bấm cuối. Sân khấu chạy mỗi số đúng một lần, nên số phải tăng
/// mãi — kể cả qua lần bật lại backend, khi sân khấu vẫn mở và còn nhớ số cũ.
/// Lấy theo mili giây đồng hồ, bấm dồn trong cùng một mili giây thì cộng một.
static SO_CUOI: AtomicU64 = AtomicU64::new(0);

fn so_moi() -> u64 {
    let bay_gio = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    let cu = SO_CUOI
        .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |cu| Some(bay_gio.max(cu + 1)))
        .unwrap_or(0);
    bay_gio.max(cu + 1)
}

/// Bấm nút `action` của module `module_id` trên thiết kế `design_id`.
///
/// Thiết kế đang phát: phát cho mọi client, trả về tin đã phát. Chưa phát (bảng
/// xem thử): không phát cho ai, trả tin gắn `designId` để chỉ trang đó chạy.
pub fn bam(st: &AppState, design_id: &str, module_id: &str, action: &str) -> Result<Value, AppError> {
    if !valid_id(module_id) || !valid_id(action) {
        return Err(AppError::BadRequest(format!(
            "nút \"{action}\" của module \"{module_id}\" sai định dạng"
        )));
    }
    if !st.design_exists(design_id) {
        return Err(AppError::NotFound(format!("không có thiết kế \"{design_id}\"")));
    }
    let mut tin = json!({ "t": "action", "moduleId": module_id, "op": action, "id": so_moi() });
    if st.live().as_deref() == Some(design_id) {
        st.broadcast(tin.clone());
    } else {
        tin["designId"] = json!(design_id);
    }
    Ok(tin)
}

#[derive(Deserialize)]
pub struct Bam {
    action: String,
}

/// `POST /api/designs/<id>/modules/<module>/action` — nút trên thẻ ở trang quản lý.
pub async fn post_action(
    State(st): State<Arc<AppState>>,
    Path((design_id, module_id)): Path<(String, String)>,
    Json(body): Json<Bam>,
) -> Result<Json<Value>, AppError> {
    if !valid_id(&design_id) {
        return Err(AppError::BadRequest(format!("id thiết kế \"{design_id}\" sai định dạng")));
    }
    Ok(Json(bam(&st, &design_id, &module_id, &body.action)?))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::paths::Layout;

    fn st_co(id: &str) -> Arc<AppState> {
        let p = tempfile::tempdir().unwrap().keep();
        let d = p.join("client").join("designs").join(id);
        std::fs::create_dir_all(d.join("dist")).unwrap();
        std::fs::write(d.join("design.json"), format!(r#"{{"id":"{id}","name":"x","slots":[]}}"#)).unwrap();
        AppState::new(Layout::new(p), 47830, "tok".into())
    }

    #[test]
    fn so_lan_bam_tang_mai() {
        let a = so_moi();
        let b = so_moi();
        assert!(b > a);
    }

    #[test]
    fn chua_phat_thi_tra_rieng_cho_trang_xem_thu() {
        let s = st_co("san-bar-hop-dem");
        let mut rx = s.subscribe();
        let tin = bam(&s, "san-bar-hop-dem", "vu-cong-3d", "nhay").unwrap();
        assert_eq!(tin["t"], json!("action"));
        assert_eq!(tin["op"], json!("nhay"));
        assert_eq!(tin["designId"], json!("san-bar-hop-dem"));
        assert!(rx.try_recv().is_err(), "chưa phát thì không phát cho ai");
    }

    #[test]
    fn dang_phat_thi_phat_cho_moi_client() {
        let s = st_co("san-bar-hop-dem");
        s.go_live("san-bar-hop-dem").unwrap();
        let mut rx = s.subscribe();
        let tin = bam(&s, "san-bar-hop-dem", "vu-cong-3d", "nhay").unwrap();
        assert!(tin.get("designId").is_none());
        let da_phat = std::iter::from_fn(|| rx.try_recv().ok()).find(|m| m["t"] == json!("action"));
        assert_eq!(da_phat.map(|m| m["op"].clone()), Some(json!("nhay")));
    }

    #[test]
    fn id_hong_hoac_thiet_ke_khong_co_thi_tu_choi() {
        let s = st_co("san-bar-hop-dem");
        assert!(bam(&s, "san-bar-hop-dem", "../x", "nhay").is_err());
        assert!(bam(&s, "san-bar-hop-dem", "vu-cong-3d", "Nhay Ngay").is_err());
        assert!(bam(&s, "khong-co", "vu-cong-3d", "nhay").is_err());
    }
}
