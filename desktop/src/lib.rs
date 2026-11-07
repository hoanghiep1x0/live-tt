//! Vỏ desktop của Live Studio (Tauri 2).
//!
//! Một app chạy cả hai thứ:
//! - Máy chủ (`live_backend::khoi_dong::chay`) — đúng máy chủ của `cargo run`,
//!   phục vụ OBS ở `http://127.0.0.1:47830/d/<id>/` như mọi khi.
//! - Trang quản lý trong cửa sổ app, kèm trình duyệt riêng (`trinh_duyet.rs`):
//!   trang TikTok, muse.ai… đặt chồng vào hộp Trình duyệt, giữ đăng nhập.
//!
//! Cửa sổ chính là một cửa sổ trống chứa giao diện app như khung web con
//! ("app"), để các trang web đặt chồng lên đúng khung của hộp — cùng cách với
//! bản cũ (D:\Live\desktop).

mod chat_tiktok;
mod muse;
mod phong;
mod trinh_duyet;

use std::path::Path;
use std::sync::Arc;

use tauri::{webview::WebviewBuilder, LogicalPosition, WebviewUrl};

pub(crate) const CUA_SO: &str = "main";
const KHUNG_APP: &str = "app";

/// Cờ cho WebView2: ĐỪNG bóp hiệu năng khung web đang bị che hay dời ra ngoài
/// màn hình. Các tab nền của app (muse.ai vẽ ảnh, trang live TikTok) nằm ngoài
/// màn hình suốt buổi; mặc định Chromium hạ nhịp hẹn giờ và dừng vẽ cho khung
/// như vậy, nên lượt vẽ ảnh ì ra tới khi người vận hành bấm vào tab. Ba cờ này
/// giữ chúng chạy y như đang hiện.
const CO_WEBVIEW: [&str; 3] = [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
];

/// Ghép cờ vào biến môi trường WebView2 đọc lúc khởi động, giữ nguyên thứ
/// người chạy app đã đặt sẵn (vd cổng gỡ lỗi). Hàm thuần.
pub fn ghep_co(cu: &str, co: &[&str]) -> String {
    let mut ra = cu.trim().to_string();
    for c in co {
        if !ra.split_whitespace().any(|x| x == *c) {
            if !ra.is_empty() {
                ra.push(' ');
            }
            ra.push_str(c);
        }
    }
    ra
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Phải đặt TRƯỚC khi Tauri dựng khung web đầu tiên.
    let cu = std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").unwrap_or_default();
    std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", ghep_co(&cu, &CO_WEBVIEW));

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_env("LOG_LEVEL").unwrap_or_else(|_| "info".into()),
        )
        .init();

    let tabs = Arc::new(trinh_duyet::Tabs::default());
    tauri::Builder::default()
        .manage(tabs)
        .invoke_handler(tauri::generate_handler![
            trinh_duyet::tab_mo,
            trinh_duyet::tab_dong,
            trinh_duyet::tab_di,
            trinh_duyet::tab_lich_su,
            trinh_duyet::tab_hien,
            trinh_duyet::tab_an,
            trinh_duyet::tab_ds,
            phong::phong_mo,
        ])
        .setup(|app| {
            // Cầu nối muse.ai: máy chủ vẽ ảnh bằng tab muse.ai đã đăng nhập.
            live_backend::muse::dat(Arc::new(muse::Muse { app: app.handle().clone() }));
            // Cầu nối chát TikTok: MC gõ tin vào ô chat của tab trang live.
            live_backend::chat_tiktok::dat(Arc::new(chat_tiktok::ChatTiktok {
                app: app.handle().clone(),
            }));

            // Máy chủ chạy suốt đời app, trên chính runtime của Tauri.
            let goc = live_backend::khoi_dong::goc_du_an(Path::new(env!("CARGO_MANIFEST_DIR")));
            tauri::async_runtime::spawn(live_backend::khoi_dong::chay(
                goc,
                live_backend::khoi_dong::cong_muon(),
                std::future::pending(),
            ));

            let mut b = tauri::window::WindowBuilder::new(app, CUA_SO)
                .title("Live Studio")
                .inner_size(1360.0, 860.0)
                .min_inner_size(960.0, 600.0)
                .maximized(true)
                // Thanh tiêu đề tối, khớp nền tối của app.
                .theme(Some(tauri::Theme::Dark));
            if let Some(icon) = app.default_window_icon().cloned() {
                b = b.icon(icon)?;
            }
            let window = b.build()?;
            let co = window.inner_size()?.to_logical::<f64>(window.scale_factor()?);
            window.add_child(
                WebviewBuilder::new(KHUNG_APP, WebviewUrl::App("index.html".into())).auto_resize(),
                LogicalPosition::new(0.0, 0.0),
                co,
            )?;
            // Mở sẵn tab muse.ai chạy nền — trình duyệt luôn sẵn sàng vẽ ảnh.
            // Tạo khung web phải ngoài luồng chính (xem `trinh_duyet::tab_mo`).
            let h = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(3));
                muse::mo_san(&h);
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("không khởi động được Live Studio");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ghep_co_khong_de_trung_va_giu_co_cu() {
        assert_eq!(ghep_co("", &["--a"]), "--a");
        assert_eq!(ghep_co("--x=1", &["--a", "--b"]), "--x=1 --a --b");
        // Đã có sẵn thì không thêm lần nữa.
        assert_eq!(ghep_co("--a --x", &["--a"]), "--a --x");
    }
}
