//! Trạng thái chung của máy chủ: thiết kế đang phát, cấu hình module, bus phát xuống.

use std::sync::{Arc, RwLock};

use serde::Serialize;
use serde_json::{json, Map, Value};
use tokio::sync::broadcast;

use crate::designs::{self, DesignInfo};
use crate::paths::Layout;
use crate::store::{self, StoreError};

/// Sức chứa hàng chờ phát xuống. Client chậm quá mức này thì mất bớt tin cũ,
/// chấp nhận được: tin mới quan trọng hơn tin cũ.
const BUS_CAP: usize = 256;

#[derive(Clone, Debug, Serialize)]
pub struct ModuleState {
    pub enabled: bool,
    pub config: Value,
}

pub struct AppState {
    pub layout: Layout,
    pub port: u16,
    pub token: String,
    /// Chỉ một thiết kế chạy một lúc. Đây là chỗ giữ điều đó.
    live: RwLock<Option<String>>,
    tx: broadcast::Sender<Value>,
}

/// Lý do từ chối, kèm mã HTTP để tầng trên khỏi phải đoán.
#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    BadRequest(String),
    /// Đã có thiết kế khác đang phát — phải tắt nó trước.
    Conflict { live: String },
    Internal(String),
}

impl From<StoreError> for AppError {
    fn from(e: StoreError) -> Self {
        Self::Internal(e.to_string())
    }
}

impl AppState {
    pub fn new(layout: Layout, port: u16, token: String) -> Arc<Self> {
        let (tx, _) = broadcast::channel(BUS_CAP);
        Arc::new(Self { layout, port, token, live: RwLock::new(None), tx })
    }

    pub fn subscribe(&self) -> broadcast::Receiver<Value> {
        self.tx.subscribe()
    }

    /// Phát xuống mọi thiết kế và trang quản lý đang nối.
    /// Không ai nghe cũng không sao — đó là trạng thái bình thường lúc chưa mở phòng.
    pub fn broadcast(&self, msg: Value) {
        let _ = self.tx.send(msg);
    }

    pub fn live(&self) -> Option<String> {
        self.live.read().expect("khoá live hỏng").clone()
    }

    pub fn designs(&self) -> Vec<DesignInfo> {
        designs::scan(&self.layout, self.port, self.live().as_deref())
    }

    pub fn design_exists(&self, id: &str) -> bool {
        self.layout.design_manifest(id).exists()
    }

    /// Bật phát một thiết kế. Đang có thiết kế khác thì từ chối — người dùng
    /// phải tắt cái cũ trước, đúng luật một phòng một lúc.
    pub fn go_live(&self, id: &str) -> Result<(), AppError> {
        if !self.design_exists(id) {
            return Err(AppError::NotFound(format!("không có thiết kế \"{id}\"")));
        }
        {
            let mut cur = self.live.write().expect("khoá live hỏng");
            match cur.as_deref() {
                Some(dang) if dang == id => return Ok(()),
                Some(dang) => return Err(AppError::Conflict { live: dang.to_string() }),
                None => *cur = Some(id.to_string()),
            }
        }
        self.broadcast(json!({ "t": "live", "designId": id }));
        Ok(())
    }

    pub fn stop_live(&self) {
        let da_doi = {
            let mut cur = self.live.write().expect("khoá live hỏng");
            cur.take().is_some()
        };
        if da_doi {
            self.broadcast(json!({ "t": "live", "designId": Value::Null }));
        }
    }

    // ---- Cấu hình module, lưu theo từng thiết kế ----

    fn modules_of(&self, design_id: &str) -> Result<Map<String, Value>, StoreError> {
        let doc = store::read_object(&self.layout.config_file(design_id))?;
        Ok(match doc.get("modules") {
            Some(Value::Object(m)) => m.clone(),
            _ => Map::new(),
        })
    }

    fn save_modules(&self, design_id: &str, modules: Map<String, Value>) -> Result<(), StoreError> {
        store::write_json_atomic(
            &self.layout.config_file(design_id),
            &json!({ "modules": Value::Object(modules) }),
        )
    }

    pub fn module_state(&self, design_id: &str, module_id: &str) -> Result<ModuleState, AppError> {
        let m = self.modules_of(design_id)?;
        let v = m.get(module_id);
        Ok(ModuleState {
            enabled: v.and_then(|x| x.get("enabled")).and_then(Value::as_bool).unwrap_or(false),
            config: v.and_then(|x| x.get("config")).cloned().unwrap_or_else(|| json!({})),
        })
    }

    pub fn all_modules(&self, design_id: &str) -> Result<Map<String, Value>, AppError> {
        Ok(self.modules_of(design_id)?)
    }

    /// Ghi cấu hình rồi phát xuống ngay. Thiết kế áp nóng, KHÔNG tải lại trang —
    /// phòng đang live mà tải lại là mất khán giả.
    pub fn set_config(
        &self,
        design_id: &str,
        module_id: &str,
        config: Value,
    ) -> Result<(), AppError> {
        if !config.is_object() {
            return Err(AppError::BadRequest("cấu hình phải là một object".into()));
        }
        let mut modules = self.modules_of(design_id)?;
        let entry = modules.entry(module_id.to_string()).or_insert_with(|| json!({}));
        if let Some(obj) = entry.as_object_mut() {
            obj.insert("config".into(), config.clone());
        }
        self.save_modules(design_id, modules)?;

        if self.live().as_deref() == Some(design_id) {
            self.broadcast(json!({ "t": "config", "moduleId": module_id, "config": config }));
        }
        Ok(())
    }

    pub fn set_enabled(
        &self,
        design_id: &str,
        module_id: &str,
        on: bool,
    ) -> Result<(), AppError> {
        let mut modules = self.modules_of(design_id)?;
        let entry = modules.entry(module_id.to_string()).or_insert_with(|| json!({}));
        if let Some(obj) = entry.as_object_mut() {
            obj.insert("enabled".into(), Value::Bool(on));
        }
        self.save_modules(design_id, modules.clone())?;

        if self.live().as_deref() == Some(design_id) {
            let bat: Vec<&String> = modules
                .iter()
                .filter(|(_, v)| v.get("enabled").and_then(Value::as_bool).unwrap_or(false))
                .map(|(k, _)| k)
                .collect();
            self.broadcast(json!({ "t": "modules", "enabled": bat }));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

    fn dung(root: &Path, id: &str) {
        let d = root.join("client").join("designs").join(id);
        fs::create_dir_all(d.join("dist")).unwrap();
        fs::write(d.join("design.json"), format!(r#"{{"id":"{id}","name":"{id}"}}"#)).unwrap();
        fs::write(d.join("dist").join("index.html"), "<!doctype html>").unwrap();
    }

    fn state(root: &Path) -> Arc<AppState> {
        AppState::new(Layout::new(root), 47830, "tok".into())
    }

    #[test]
    fn chi_mot_thiet_ke_phat_mot_luc() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        dung(d.path(), "hip-hop");
        let s = state(d.path());

        s.go_live("ke-chuyen").unwrap();
        assert_eq!(s.live().as_deref(), Some("ke-chuyen"));

        // Bật cái thứ hai khi chưa tắt cái đầu: phải từ chối, kèm tên cái đang chạy.
        match s.go_live("hip-hop") {
            Err(AppError::Conflict { live }) => assert_eq!(live, "ke-chuyen"),
            kq => panic!("phải báo xung đột, nhận {kq:?}"),
        }
        assert_eq!(s.live().as_deref(), Some("ke-chuyen"), "cái đang chạy không được đổi");

        s.stop_live();
        s.go_live("hip-hop").unwrap();
        assert_eq!(s.live().as_deref(), Some("hip-hop"));
    }

    #[test]
    fn bat_lai_chinh_thiet_ke_dang_phat_thi_khong_sao() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        s.go_live("ke-chuyen").unwrap();
        assert!(s.go_live("ke-chuyen").is_ok());
    }

    #[test]
    fn khong_phat_duoc_thiet_ke_khong_ton_tai() {
        let d = tempfile::tempdir().unwrap();
        let s = state(d.path());
        assert!(matches!(s.go_live("khong-co"), Err(AppError::NotFound(_))));
    }

    #[test]
    fn cau_hinh_ghi_roi_doc_lai_duoc() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        s.set_config("ke-chuyen", "gift-thanks", json!({ "minCoins": 10 })).unwrap();
        let m = s.module_state("ke-chuyen", "gift-thanks").unwrap();
        assert_eq!(m.config["minCoins"], json!(10));
        assert!(!m.enabled, "mặc định là tắt");
    }

    #[test]
    fn bat_tat_khong_lam_mat_cau_hinh() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        s.set_config("ke-chuyen", "gift-thanks", json!({ "minCoins": 10 })).unwrap();
        s.set_enabled("ke-chuyen", "gift-thanks", true).unwrap();
        let m = s.module_state("ke-chuyen", "gift-thanks").unwrap();
        assert!(m.enabled);
        assert_eq!(m.config["minCoins"], json!(10), "cấu hình phải còn nguyên");
    }

    #[test]
    fn cau_hinh_khong_phai_object_bi_tu_choi() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        assert!(matches!(
            s.set_config("ke-chuyen", "gift-thanks", json!(5)),
            Err(AppError::BadRequest(_))
        ));
    }

    #[test]
    fn moi_thiet_ke_giu_cau_hinh_rieng() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        dung(d.path(), "hip-hop");
        let s = state(d.path());
        s.set_config("ke-chuyen", "music", json!({ "vol": 20 })).unwrap();
        s.set_config("hip-hop", "music", json!({ "vol": 90 })).unwrap();
        assert_eq!(s.module_state("ke-chuyen", "music").unwrap().config["vol"], json!(20));
        assert_eq!(s.module_state("hip-hop", "music").unwrap().config["vol"], json!(90));
    }

    #[tokio::test]
    async fn doi_cau_hinh_cua_thiet_ke_dang_phat_thi_phat_xuong_ngay() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        s.go_live("ke-chuyen").unwrap();
        let mut rx = s.subscribe();

        s.set_config("ke-chuyen", "gift-thanks", json!({ "minCoins": 7 })).unwrap();

        let msg = rx.recv().await.unwrap();
        assert_eq!(msg["t"], json!("config"));
        assert_eq!(msg["moduleId"], json!("gift-thanks"));
        assert_eq!(msg["config"]["minCoins"], json!(7));
    }

    #[tokio::test]
    async fn doi_cau_hinh_thiet_ke_khong_phat_thi_khong_lam_phien() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        dung(d.path(), "hip-hop");
        let s = state(d.path());
        s.go_live("ke-chuyen").unwrap();
        let mut rx = s.subscribe();

        s.set_config("hip-hop", "music", json!({ "vol": 10 })).unwrap();

        assert!(rx.try_recv().is_err(), "không được phát cấu hình của thiết kế đang tắt");
    }
}
