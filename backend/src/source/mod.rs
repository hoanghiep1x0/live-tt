//! Nguồn sự kiện phòng live.
//!
//! Ba nguồn, chọn trong trang quản lý. Cả ba đều trả đúng `LiveEvent`, nên phần
//! còn lại của hệ thống không biết sự kiện đến từ đâu:
//!
//! | Nguồn | Việc | Trạng thái |
//! |---|---|---|
//! | `mau` | Giả lập, để dựng phòng và xem thử khi chưa lên sóng | xong |
//! | `bridge` | Nối tới tiến trình đọc TikTok ngoài qua WebSocket | xong |
//! | `webview` | Tự đọc khung webcast trong webview TikTok | chưa — cần vỏ Tauri |
//!
//! Vì sao `webview` chưa làm: bản cũ giải protobuf của TikTok bằng thư viện npm
//! `tiktok-live-proto` chạy trong trình duyệt, không phải bằng Rust. Chuyển sang
//! Rust cần schema protobuf riêng, và không có phiên live thật thì không kiểm
//! chứng được. Làm cùng lúc dựng vỏ Tauri.

pub mod bridge;
pub mod mau;

use std::sync::Arc;

use serde::{Deserialize, Serialize};

use crate::state::AppState;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum SourceKind {
    #[default]
    Tat,
    Mau,
    Bridge,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SourceCfg {
    pub kind: SourceKind,
    /// Địa chỉ cầu nối. Mặc định khớp bản cũ (`tools/bridge`, cổng 8787).
    #[serde(default = "bridge_url_mac_dinh")]
    pub url: String,
    /// Kênh TikTok cần theo dõi, ví dụ `kechuyen.dem`.
    #[serde(default)]
    pub channel: String,
    /// Nhịp sinh sự kiện của nguồn giả lập, mili-giây.
    #[serde(default = "nhip_mac_dinh")]
    pub nhip: u64,
}

pub fn bridge_url_mac_dinh() -> String {
    "ws://127.0.0.1:8787/ws/live".to_string()
}

fn nhip_mac_dinh() -> u64 {
    900
}

impl Default for SourceCfg {
    fn default() -> Self {
        Self {
            kind: SourceKind::Tat,
            url: bridge_url_mac_dinh(),
            channel: String::new(),
            nhip: nhip_mac_dinh(),
        }
    }
}

/// Trạng thái nguồn, hiện trên trang quản lý.
#[derive(Clone, Debug, Serialize)]
pub struct SourceStatus {
    #[serde(flatten)]
    pub cfg: SourceCfg,
    /// Nguồn có đang chạy không, và nếu không thì vì sao.
    pub running: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub problem: Option<String>,
}

/// Mở nguồn theo cấu hình. Nguồn cũ tự dừng nhờ số thế hệ đã đổi.
///
/// Không dùng cờ huỷ riêng: mỗi lần đổi nguồn là tăng một số đếm, tác vụ cũ thấy
/// số của mình không còn là số hiện tại thì tự thoát. Ít thứ phải đồng bộ hơn,
/// và không có đường nào để sót một tác vụ chạy ngầm mãi.
pub fn mo(st: Arc<AppState>, cfg: SourceCfg) {
    let the_he = st.doi_nguon(cfg.clone());
    match cfg.kind {
        SourceKind::Tat => {}
        SourceKind::Mau => {
            tokio::spawn(mau::chay(st, cfg, the_he));
        }
        SourceKind::Bridge => {
            tokio::spawn(bridge::chay(st, cfg, the_he));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn cau_hinh_mac_dinh_la_tat() {
        let c = SourceCfg::default();
        assert_eq!(c.kind, SourceKind::Tat);
        assert_eq!(c.url, "ws://127.0.0.1:8787/ws/live");
    }

    #[test]
    fn doc_duoc_cau_hinh_chi_khai_loai() {
        let c: SourceCfg = serde_json::from_value(json!({ "kind": "mau" })).unwrap();
        assert_eq!(c.kind, SourceKind::Mau);
        assert_eq!(c.nhip, 900, "khoá vắng thì lấy mặc định");
    }

    #[test]
    fn loai_la_bi_tu_choi() {
        let kq: Result<SourceCfg, _> = serde_json::from_value(json!({ "kind": "tiktok-xin" }));
        assert!(kq.is_err());
    }
}
