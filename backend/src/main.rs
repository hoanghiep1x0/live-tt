//! Chạy máy chủ độc lập khi phát triển, không cần vỏ desktop.
//!
//! Vỏ desktop (`desktop/`) chạy đúng máy chủ này bên trong app, qua cùng
//! `live_backend::khoi_dong::chay`.

use std::path::Path;

use live_backend::khoi_dong;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_env("LOG_LEVEL")
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let goc = khoi_dong::goc_du_an(Path::new(env!("CARGO_MANIFEST_DIR")));
    khoi_dong::chay(goc, khoi_dong::cong_muon(), async {
        let _ = tokio::signal::ctrl_c().await;
        tracing::info!("nhận tín hiệu dừng, đang đóng");
    })
    .await;
}
