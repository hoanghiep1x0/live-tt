//! Đọc dữ liệu live thẳng từ trang TikTok trong app — nguồn `webview`.
//!
//! Chuyển từ bản cũ (D:\Live\desktop, `start_poller` / `parse_drain`):
//! 1. Tab trang live của kênh (`kenh-<nick>`, mở từ nút "Kết nối Studio") được
//!    nạp sẵn `capture.js` trước mọi script của trang. Đoạn đó chép khung
//!    webcast mà chính trang nhận vào một hàng đợi nhỏ trong trang.
//! 2. Trang quản lý gọi `kenh_rut` mỗi nửa giây: vỏ eval `window.__tnLive.drain()`
//!    ở từng tab kênh, trả khung thô (base64) kèm số socket và trạng thái phòng.
//! 3. Trang quản lý giải protobuf (`client/manager/src/lib/tiktok-khung.ts`)
//!    rồi đẩy sự kiện vào máy chủ (`POST /api/source/day`).
//!
//! Vỏ không giải mã gì: schema protobuf của TikTok nằm ở thư viện npm
//! `tiktok-live-proto`, và giữ một chỗ giải mã duy nhất thì dễ sửa khi TikTok đổi.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::trinh_duyet::{nhan, Tabs};

/// Đoạn chép khung, nạp vào tab kênh bằng `initialization_script`.
pub const CAPTURE_JS: &str = include_str!("capture.js");

/// Lấy hàng đợi trong trang. Trang chưa nạp `capture.js` (đang tải, hay đã bấm
/// sang trang ngoài TikTok) thì trả một khung rỗng.
const DRAIN_JS: &str = "(window.__tnLive ? window.__tnLive.drain() : JSON.stringify({ frames: [], sockets: 0, url: location.href, live: null }))";

/// Chờ trang trả lời lượt rút tối đa chừng này.
const CHO_RUT: Duration = Duration::from_secs(2);

/// Tab trang live của một kênh: id do trang quản lý đặt, dạng `kenh-<nick>`
/// (`docOThemTab` ở `client/manager/src/lib/trang-web.ts`). Hàm thuần.
pub fn la_tab_kenh(id: &str) -> bool {
    id.starts_with("kenh-")
}

/// Một lượt rút của một tab kênh.
#[derive(Clone, Debug, Default, PartialEq, Serialize)]
pub struct KhungTab {
    pub id: String,
    /// Địa chỉ trang đang xem (người dùng có thể đã bấm sang trang khác).
    pub url: String,
    /// Khung thô: `{ k: "ws" | "fetch", b: <base64> }`.
    pub frames: Vec<Value>,
    /// Số WebSocket webcast trang đang mở. 0 = trang chưa vào được phòng.
    pub sockets: u64,
    /// Trạng thái phòng TikTok báo: 2 = đang live, 4 = đã kết thúc.
    pub live: Option<i64>,
}

/// Đọc kết quả eval. Kết quả là chuỗi JSON, có khi bị bọc thêm một lớp chuỗi;
/// không đọc được (vd `undefined`) thì `None`. Hàm thuần.
pub fn doc_rut(id: &str, raw: &str) -> Option<KhungTab> {
    let v: Value = serde_json::from_str(raw).ok()?;
    let v = match v {
        Value::String(trong) => serde_json::from_str(&trong).ok()?,
        khac => khac,
    };
    let o = v.as_object()?;
    Some(KhungTab {
        id: id.to_string(),
        url: o.get("url").and_then(Value::as_str).unwrap_or("").to_string(),
        frames: o.get("frames").and_then(Value::as_array).cloned().unwrap_or_default(),
        sockets: o.get("sockets").and_then(Value::as_u64).unwrap_or(0),
        live: o.get("live").and_then(Value::as_i64),
    })
}

/// Rút khung đã chép ở mọi tab kênh đang mở. Tab không trả lời kịp thì bỏ qua
/// lượt này (khung vẫn nằm trong hàng đợi của trang, lượt sau lấy).
#[tauri::command]
pub async fn kenh_rut(app: AppHandle, tabs: tauri::State<'_, Arc<Tabs>>) -> Result<Vec<KhungTab>, String> {
    let ids: Vec<String> = tabs.ids().into_iter().filter(|id| la_tab_kenh(id)).collect();

    // Gửi lệnh rút cho mọi tab trước rồi mới chờ: nhiều tab cũng chỉ chờ một lượt.
    let mut cho = Vec::new();
    for id in ids {
        let Some(w) = app.get_webview(&nhan(&id)) else { continue };
        let (tx, rx) = tokio::sync::oneshot::channel::<String>();
        // Callback có thể bị gọi kiểu `Fn`; oneshot chỉ gửi được một lần.
        let tx = Mutex::new(Some(tx));
        let gui = w.eval_with_callback(DRAIN_JS, move |raw| {
            if let Some(tx) = tx.lock().ok().and_then(|mut g| g.take()) {
                let _ = tx.send(raw);
            }
        });
        if gui.is_ok() {
            cho.push((id, rx));
        }
    }

    let mut ra = Vec::new();
    for (id, rx) in cho {
        if let Ok(Ok(raw)) = tokio::time::timeout(CHO_RUT, rx).await {
            if let Some(k) = doc_rut(&id, &raw) {
                ra.push(k);
            }
        }
    }
    Ok(ra)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn chi_tab_kenh_moi_duoc_chep() {
        assert!(la_tab_kenh("kenh-labeau-official"));
        assert!(!la_tab_kenh("muse"));
        assert!(!la_tab_kenh("tiktok"));
        assert!(!la_tab_kenh("xem-123"));
        assert!(!la_tab_kenh("kenh"));
    }

    #[test]
    fn doc_ket_qua_rut_ke_ca_khi_bi_boc_chuoi() {
        let trong = r#"{"frames":[{"k":"ws","b":"AQID"}],"sockets":1,"url":"https://www.tiktok.com/@a/live","live":2}"#;
        let boc = serde_json::to_string(trong).unwrap();
        let mong = KhungTab {
            id: "kenh-a".into(),
            url: "https://www.tiktok.com/@a/live".into(),
            frames: vec![json!({ "k": "ws", "b": "AQID" })],
            sockets: 1,
            live: Some(2),
        };
        assert_eq!(doc_rut("kenh-a", &boc), Some(mong.clone()));
        assert_eq!(doc_rut("kenh-a", trong), Some(mong));
    }

    #[test]
    fn trang_chua_nap_hoac_tra_rac_thi_bo() {
        assert_eq!(doc_rut("kenh-a", "undefined"), None);
        assert_eq!(doc_rut("kenh-a", ""), None);
        assert_eq!(doc_rut("kenh-a", "null"), None);
        assert_eq!(doc_rut("kenh-a", "\"không phải json\""), None);
        assert_eq!(doc_rut("kenh-a", "[1,2]"), None);
    }

    #[test]
    fn khung_rong_khi_trang_chua_co_hang_doi() {
        let k = doc_rut("kenh-a", r#"{"frames":[],"sockets":0,"url":"https://muse.ai/","live":null}"#).unwrap();
        assert!(k.frames.is_empty());
        assert_eq!(k.sockets, 0);
        assert_eq!(k.live, None);
        // Thiếu trường thì lấy mặc định, không bỏ cả lượt.
        assert_eq!(doc_rut("kenh-a", "{}").unwrap().url, "");
    }

    #[test]
    fn doan_chep_chi_chay_tren_tiktok() {
        assert!(CAPTURE_JS.contains(r"if (!/(^|\.)tiktok\.com$/i.test(location.hostname)) return;"));
        assert!(CAPTURE_JS.contains("__tnLive"));
        assert!(DRAIN_JS.contains("__tnLive.drain()"));
    }
}
