//! Nguồn sự kiện phòng live.
//!
//! Bốn lựa chọn, chọn trong trang quản lý. Nguồn nào cũng trả đúng `LiveEvent`,
//! nên phần còn lại của hệ thống không biết sự kiện đến từ đâu:
//!
//! | Nguồn | Việc | Trạng thái |
//! |---|---|---|
//! | `tat` | Không nhận sự kiện nào | xong |
//! | `mau` | Giả lập, để dựng phòng và xem thử khi chưa lên sóng | xong |
//! | `bridge` | Nối tới cầu nối TikTok qua WebSocket; cầu nối mặc định do backend tự bật (`tien_trinh`) | xong |
//! | `webview` | Trang TikTok trong app desktop tự đọc khung webcast | không dùng (docs/07 §1) |
//!
//! Dữ liệu live lấy **một chỗ** ở đây cho mọi thiết kế: thiết kế và module chỉ
//! đọc `FeedItem` / `SessionView` qua WebSocket, không bao giờ tự nối TikTok.
//! Thêm thiết kế mới không phải đụng tới nguồn, đổi cách lấy dữ liệu không phải
//! đụng tới thiết kế.
//!
//! `webview` không chạy tác vụ nào ở đây: vỏ desktop chép khung webcast từ tab
//! trang live của kênh, trang quản lý giải protobuf bằng `tiktok-live-proto`
//! (`client/manager/src/lib/tiktok-khung.ts`) rồi đẩy kết quả vào
//! `POST /api/source/day`, theo đúng giao thức của cầu nối (`bridge::doc_tin`).

pub mod bridge;
pub mod mau;
pub mod tien_trinh;

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
    /// Trang TikTok trong app desktop đẩy sự kiện vào `POST /api/source/day`.
    Webview,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SourceCfg {
    pub kind: SourceKind,
    /// Địa chỉ cầu nối. Mặc định là cầu nối backend tự bật (`backend/cau-noi`,
    /// cổng 8787); trỏ sang địa chỉ khác thì backend không bật gì.
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
        SourceKind::Bridge if cfg.channel.trim().is_empty() => {
            // Chưa có kênh thì không có gì để nghe — không bật cầu nối suông.
            st.dat_loi_nguon(Some(CHUA_CO_KENH.into()));
        }
        SourceKind::Bridge => {
            // Hai tác vụ độc lập: một giữ tiến trình cầu nối (chỉ khi là cầu nối
            // mặc định), một là client đọc tin. Client cứ nối lại tới khi cầu
            // nối lên — không cần chờ nhau.
            // Chưa nối được gì thì chưa xanh: trả lời PUT ngay bây giờ phải là
            // "đang nối…", không phải "đang chạy".
            st.dat_loi_nguon(Some(bridge::DANG_NOI.into()));
            tokio::spawn(tien_trinh::giu(st.clone(), cfg.clone(), the_he));
            tokio::spawn(bridge::chay(st, cfg, the_he));
        }
        SourceKind::Webview => {
            // Không có gì để chạy: trang quản lý trong app tự đẩy dữ liệu tới.
            // Chưa nhận được tin nào thì chưa sáng xanh.
            st.dat_loi_nguon(Some(CHO_WEBVIEW.into()));
        }
    }
}

/// Lời báo của nguồn `bridge` khi chưa biết nghe kênh nào.
pub const CHUA_CO_KENH: &str = "Chưa có kênh TikTok — dán link live của phòng rồi bấm \"Kết nối Studio\"";

/// Lời báo của nguồn `webview` lúc chưa có tin nào từ trang TikTok.
pub const CHO_WEBVIEW: &str = "Chờ trang TikTok trong app gửi dữ liệu…";

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
    fn nguon_webview_doc_ghi_dung_ten() {
        let c: SourceCfg =
            serde_json::from_value(json!({ "kind": "webview", "channel": "labeau_official" })).unwrap();
        assert_eq!(c.kind, SourceKind::Webview);
        assert_eq!(serde_json::to_value(c.kind).unwrap(), json!("webview"));
    }

    #[test]
    fn loai_la_bi_tu_choi() {
        let kq: Result<SourceCfg, _> = serde_json::from_value(json!({ "kind": "tiktok-xin" }));
        assert!(kq.is_err());
    }
}
