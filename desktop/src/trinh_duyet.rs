//! Trình duyệt trong app — chuyển từ vỏ desktop của bản cũ (D:\Live\desktop).
//!
//! Mỗi tab là một khung web con (webview) trong cửa sổ chính:
//! - Dùng chung hồ sơ trình duyệt của app, nên đăng nhập một lần là giữ luôn,
//!   kể cả sau khi tắt app.
//! - Hiện thì đặt chồng khít vào khung trống của hộp Trình duyệt (toạ độ CSS do
//!   giao diện đo, `tab_hien`). Ẩn thì DỜI RA NGOÀI màn hình chứ không ẩn hẳn:
//!   trang vẫn được coi là đang hiển thị nên không bị trình duyệt làm chậm — app
//!   còn đọc dữ liệu từ đó.
//! - Không nằm trong `capabilities/default.json`, nên trang web ngoài không gọi
//!   được lệnh nào của app.
//! - Mở được mọi trang web http(s). An toàn vì các tab không có quyền gọi lệnh
//!   (xem trên); chỉ chặn các lược đồ khác (file:, javascript:, data:…).

use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tauri::{webview::WebviewBuilder, AppHandle, LogicalPosition, LogicalSize, Manager, Url, WebviewUrl};

use crate::CUA_SO;

#[derive(Clone, Copy, Debug, Deserialize)]
pub struct Khung {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Clone, Debug, Default, Serialize)]
pub struct TabInfo {
    id: String,
    url: String,
    title: String,
}

#[derive(Default)]
pub struct Tabs(Mutex<BTreeMap<String, TabInfo>>);

impl Tabs {
    /// Id các tab đang mở.
    pub fn ids(&self) -> Vec<String> {
        self.0.lock().expect("khoá tab hỏng").keys().cloned().collect()
    }
}

/// Id tab do giao diện đặt: chữ thường, số, gạch nối, tối đa 40 ký tự.
pub fn kiem_id(id: &str) -> Result<String, String> {
    let ok = !id.is_empty() && id.len() <= 40 && id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-');
    if ok {
        Ok(id.to_string())
    } else {
        Err(format!("Id tab không hợp lệ: {id}"))
    }
}

pub(crate) fn nhan(id: &str) -> String {
    format!("web-{id}")
}

/// Địa chỉ được mở: mọi trang http(s) có tên máy. Gõ thiếu "https://" thì tự
/// thêm. Hàm thuần.
pub fn kiem_url(raw: &str) -> Result<Url, String> {
    let t = raw.trim();
    let thap = t.to_ascii_lowercase();
    // Lược đồ khác http(s) ("file:", "javascript:"…) thì chặn, đừng ghép "https://".
    let la_luoc_do = |p: &str| thap.starts_with(p);
    if ["file:", "javascript:", "data:", "about:", "blob:", "chrome:", "edge:", "view-source:"].iter().any(|p| la_luoc_do(p))
        || (thap.contains("://") && !thap.starts_with("http://") && !thap.starts_with("https://"))
    {
        return Err(format!("Chỉ mở được trang http/https: {raw}"));
    }
    let day = if thap.starts_with("http://") || thap.starts_with("https://") { t.to_string() } else { format!("https://{t}") };
    let url = Url::parse(&day).map_err(|_| format!("Địa chỉ không hợp lệ: {raw}"))?;
    let co_may = url.host_str().is_some_and(|h| !h.is_empty());
    if matches!(url.scheme(), "http" | "https") && co_may && !t.contains(char::is_whitespace) {
        Ok(url)
    } else {
        Err(format!("Địa chỉ không hợp lệ: {raw}"))
    }
}

/// Dời trang ra ngoài cửa sổ thay vì ẩn: vẫn được coi là đang hiển thị nên
/// không bị làm chậm.
fn doi_ra_ngoai<R: tauri::Runtime>(w: &tauri::Webview<R>) {
    let _ = w.set_bounds(tauri::Rect {
        position: LogicalPosition::new(-20000.0, 0.0).into(),
        size: LogicalSize::new(1280.0, 800.0).into(),
    });
    let _ = w.show();
}

/// Mở một tab. `async`: tạo khung web trong lệnh đồng bộ (chạy trên luồng
/// chính) bị kẹt trên Windows — trang đứng ở about:blank và lệnh sau treo.
#[tauri::command]
pub async fn tab_mo(app: AppHandle, tabs: tauri::State<'_, Arc<Tabs>>, id: String, url: String) -> Result<(), String> {
    mo(&app, tabs.inner(), &id, &url)
}

/// Mở tab `id` nếu chưa có (đã có thì thôi). Dùng chung cho lệnh `tab_mo` và
/// cầu nối muse (`muse.rs`). KHÔNG gọi từ luồng chính.
pub(crate) fn mo(app: &AppHandle, tabs: &Arc<Tabs>, id: &str, url: &str) -> Result<(), String> {
    let id = kiem_id(id)?;
    let url = kiem_url(url)?;
    if app.get_webview(&nhan(&id)).is_some() {
        return Ok(());
    }
    let window = app.get_window(CUA_SO).ok_or("Cửa sổ chính chưa sẵn sàng")?;
    let ds = tabs.clone();
    let id2 = id.clone();
    let mut builder = WebviewBuilder::new(nhan(&id), WebviewUrl::External(url.clone())).on_document_title_changed(
        move |_, title| {
            if let Some(t) = ds.0.lock().expect("khoá tab hỏng").get_mut(&id2) {
                t.title = title;
            }
        },
    );
    if let Some(js) = script_nap_san(&id) {
        builder = builder.initialization_script(js);
    }
    tabs.0
        .lock()
        .expect("khoá tab hỏng")
        .insert(id.clone(), TabInfo { id: id.clone(), url: url.to_string(), ..Default::default() });
    match window.add_child(builder, LogicalPosition::new(0.0, 0.0), LogicalSize::new(1.0, 1.0)) {
        Ok(w) => {
            doi_ra_ngoai(&w);
            Ok(())
        }
        Err(e) => {
            tabs.0.lock().expect("khoá tab hỏng").remove(&id);
            Err(format!("Không mở được trang: {e}"))
        }
    }
}

#[tauri::command]
pub fn tab_dong(app: AppHandle, tabs: tauri::State<'_, Arc<Tabs>>, id: String) -> Result<(), String> {
    let id = kiem_id(&id)?;
    tabs.0.lock().expect("khoá tab hỏng").remove(&id);
    if let Some(w) = app.get_webview(&nhan(&id)) {
        w.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Đoạn mã nạp vào tab `id` trước mọi script của trang. Tab kênh
/// (`kenh-<nick>`) là trang live của CHÍNH kênh đang phát: phải nạp
/// `tat_tieng.js` — TẮT TIẾNG mọi video của trang. Thiếu nó thì trang phát
/// luồng live của kênh có tiếng: lời MC vang lại trễ vài giây, LIVE Studio thu
/// tiếng máy là dội cả vào live — người xem nghe lặp giọng. Hàm thuần.
pub fn script_nap_san(id: &str) -> Option<&'static str> {
    id.starts_with("kenh-").then_some(TAT_TIENG_JS)
}

/// Đoạn tắt tiếng trang live, nạp vào tab kênh (`script_nap_san`).
const TAT_TIENG_JS: &str = include_str!("tat_tieng.js");

/// Ô địa chỉ: đi tới một trang trong tab đang chọn.
#[tauri::command]
pub fn tab_di(app: AppHandle, id: String, url: String) -> Result<(), String> {
    let id = kiem_id(&id)?;
    let w = app.get_webview(&nhan(&id)).ok_or("Tab chưa mở")?;
    w.navigate(kiem_url(&url)?).map_err(|e| e.to_string())
}

/// Lùi / tiến / tải lại trang đang xem.
#[tauri::command]
pub fn tab_lich_su(app: AppHandle, id: String, viec: String) -> Result<(), String> {
    let id = kiem_id(&id)?;
    let w = app.get_webview(&nhan(&id)).ok_or("Tab chưa mở")?;
    let js = match viec.as_str() {
        "lui" => "history.back()",
        "toi" => "history.forward()",
        "tai-lai" => "location.reload()",
        _ => return Err("Thao tác không hợp lệ".into()),
    };
    w.eval(js).map_err(|e| e.to_string())
}

/// Hiện tab `id` đúng vào khung của hộp Trình duyệt; các tab khác dời ra ngoài.
#[tauri::command]
pub fn tab_hien(app: AppHandle, tabs: tauri::State<'_, Arc<Tabs>>, id: String, khung: Khung) -> Result<(), String> {
    let id = kiem_id(&id)?;
    let hien = app.get_webview(&nhan(&id)).ok_or("Tab chưa mở")?;
    let khac: Vec<String> = tabs.0.lock().expect("khoá tab hỏng").keys().filter(|k| **k != id).cloned().collect();
    for k in khac {
        if let Some(w) = app.get_webview(&nhan(&k)) {
            doi_ra_ngoai(&w);
        }
    }
    hien.set_bounds(tauri::Rect {
        position: LogicalPosition::new(khung.x.max(0.0), khung.y.max(0.0)).into(),
        size: LogicalSize::new(khung.width.max(1.0), khung.height.max(1.0)).into(),
    })
    .map_err(|e| e.to_string())?;
    hien.show().map_err(|e| e.to_string())
}

/// Đóng hộp Trình duyệt: mọi tab dời ra ngoài, vẫn chạy nền.
#[tauri::command]
pub fn tab_an(app: AppHandle, tabs: tauri::State<'_, Arc<Tabs>>) {
    let ds: Vec<String> = tabs.0.lock().expect("khoá tab hỏng").keys().cloned().collect();
    for k in ds {
        if let Some(w) = app.get_webview(&nhan(&k)) {
            doi_ra_ngoai(&w);
        }
    }
}

/// Các tab đang mở, kèm địa chỉ thật đang xem (người dùng có thể đã bấm sang
/// trang khác) — cho ô địa chỉ.
#[tauri::command]
pub fn tab_ds(app: AppHandle, tabs: tauri::State<'_, Arc<Tabs>>) -> Vec<TabInfo> {
    let mut ds: Vec<TabInfo> = tabs.0.lock().expect("khoá tab hỏng").values().cloned().collect();
    for t in &mut ds {
        // Trang chưa tải xong thì vỏ báo "about:blank": giữ địa chỉ đã mở.
        if let Some(Ok(u)) = app.get_webview(&nhan(&t.id)).map(|w| w.url()) {
            if u.scheme() != "about" {
                t.url = u.to_string();
            }
        }
    }
    ds
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tab_kenh_nap_capture_de_tat_tieng_trang_live() {
        let js = script_nap_san("kenh-abc").expect("tab kênh phải nạp capture.js");
        assert!(js.contains("m.muted = true"), "capture.js phải tắt tiếng video của trang");
        assert!(js.contains("AudioContext"), "tiếng Web Audio cũng phải tắt");
        // Tab thường (muse, trang khác): không đụng tới.
        assert!(script_nap_san("muse").is_none());
        assert!(script_nap_san("tab-1").is_none());
    }

    #[test]
    fn mo_moi_trang_http() {
        assert_eq!(kiem_url("muse.ai").unwrap().as_str(), "https://muse.ai/");
        assert!(kiem_url("https://www.tiktok.com/login").is_ok());
        assert_eq!(kiem_url("google.com/search?q=a").unwrap().as_str(), "https://google.com/search?q=a");
        assert!(kiem_url("http://example.org").is_ok());
        assert!(kiem_url("HTTPS://Example.com").is_ok());
        assert!(kiem_url("localhost:5173").is_ok());
        assert!(kiem_url("javascript:alert(1)").is_err());
        assert!(kiem_url("file:///C:/x").is_err());
        assert!(kiem_url("hai chữ").is_err());
        assert!(kiem_url("").is_err());
    }

    #[test]
    fn id_tab_hop_le() {
        assert!(kiem_id("tiktok-dang-nhap").is_ok());
        assert!(kiem_id("Tab 1").is_err());
        assert!(kiem_id("").is_err());
    }
}
