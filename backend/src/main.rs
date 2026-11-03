//! Chạy máy chủ độc lập khi phát triển, không cần dựng Tauri.
//!
//! Bản đóng gói sẽ nhúng cùng router này vào vỏ Tauri.

use std::net::{Ipv4Addr, SocketAddr};
use std::path::PathBuf;

use live_backend::{guard, router, AppState, Layout};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_env("LOG_LEVEL")
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let root = goc_du_an();
    let cong_muon: u16 = std::env::var("LIVE_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(47830);

    // Chỉ nghe máy này. Không bao giờ 0.0.0.0 — máy khác trong mạng LAN
    // không được chạm vào phòng live.
    let (listener, cong) = mo_cong(cong_muon).await;

    let token = guard::sinh_token();
    let st = AppState::new(Layout::new(&root), cong, token.clone());

    tracing::info!(%cong, goc = %root.display(), "máy chủ đã mở");
    tracing::info!("token: {token}");
    tracing::info!("thiết kế cho OBS: http://127.0.0.1:{cong}/d/<id>/");

    axum::serve(listener, router(st)).await.expect("máy chủ dừng bất thường");
}

/// Cổng bận thì lấy cổng trống kế tiếp, thử tối đa 20 lần.
async fn mo_cong(muon: u16) -> (tokio::net::TcpListener, u16) {
    for cong in muon..muon.saturating_add(20) {
        let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, cong));
        if let Ok(l) = tokio::net::TcpListener::bind(addr).await {
            return (l, cong);
        }
        tracing::warn!(%cong, "cổng bận, thử cổng kế tiếp");
    }
    panic!("không mở được cổng nào từ {muon} tới {}", muon + 20);
}

/// Tìm gốc dự án: đi ngược lên tới thư mục có cả `client/` và `database/`.
/// Nhờ vậy chạy được từ bất kỳ thư mục nào, không giả định thư mục hiện tại.
fn goc_du_an() -> PathBuf {
    if let Ok(p) = std::env::var("LIVE_ROOT") {
        return PathBuf::from(p);
    }
    let mut d = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    loop {
        if d.join("client").is_dir() && d.join("database").is_dir() {
            return d;
        }
        if !d.pop() {
            return PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        }
    }
}
