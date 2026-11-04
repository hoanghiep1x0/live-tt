//! Chạy máy chủ độc lập khi phát triển, không cần dựng Tauri.
//!
//! Bản đóng gói sẽ nhúng cùng router này vào vỏ Tauri.

use std::net::{Ipv4Addr, SocketAddr};
use std::path::PathBuf;

use live_backend::{guard, router, store, AppState, Layout};

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

    let cong_file = root.join(".tmp").join("agent-port.json");
    cong_bao(&cong_file, cong, &token);

    tracing::info!(%cong, goc = %root.display(), "máy chủ đã mở");
    tracing::info!("cổng và token: {}", cong_file.display());
    tracing::info!("thiết kế cho OBS: http://127.0.0.1:{cong}/d/<id>/");

    // Nhịp phiên: trả ghế của người đã vắng lâu, rồi phát bản phiên xuống.
    // Tách khỏi luồng sự kiện vì phòng đông thì mỗi giây hàng chục sự kiện, gửi
    // kèm cả bảng top và danh sách ghế mỗi lần là tự làm nghẽn.
    let nhip = st.clone();
    tokio::spawn(async move {
        let mut dong_ho = tokio::time::interval(std::time::Duration::from_millis(500));
        loop {
            dong_ho.tick().await;
            nhip.nhip_phien();
        }
    });

    // Nhân vật ảo: giữ đám đông minh hoạ ở đúng số người vận hành đặt. Tác vụ
    // sống suốt đời máy chủ, tự im khi chưa phát phòng nào hoặc đang tắt.
    tokio::spawn(live_backend::bot::chay(st.clone()));

    let kq = axum::serve(listener, router(st))
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
            tracing::info!("nhận tín hiệu dừng, đang đóng");
        })
        .await;

    // Xoá trước khi thoát: file còn lại sẽ chỉ về một cổng đã chết, và trang
    // quản lý sẽ đi gõ cửa nhầm chỗ.
    let _ = std::fs::remove_file(&cong_file);
    kq.expect("máy chủ dừng bất thường");
}

/// Công bố cổng và token ra file, theo docs/05-backend.md §2.
///
/// Đây là đường duy nhất để trang quản lý biết token mà token không phải nằm
/// trong mã trang: dev server đọc file này rồi tự gắn header.
fn cong_bao(path: &std::path::Path, cong: u16, token: &str) {
    let than = serde_json::json!({ "port": cong, "token": token, "pid": std::process::id() });
    if let Err(e) = store::write_json_atomic(path, &than) {
        // Không mở được file công bố thì vẫn phục vụ được OBS, chỉ là trang quản
        // lý phải tự lấy token — nên cảnh báo chứ không sập.
        tracing::warn!(?e, path = %path.display(), "không ghi được file công bố cổng");
    }
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
