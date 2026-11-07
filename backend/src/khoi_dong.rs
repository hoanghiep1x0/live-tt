//! Khởi động máy chủ — dùng chung cho hai cách chạy:
//! - `main.rs`: chạy độc lập khi phát triển (`cargo run`).
//! - Vỏ desktop (`desktop/`): app Tauri chạy đúng máy chủ này bên trong.
//!
//! Một chỗ duy nhất dựng trạng thái, mở cổng, công bố token và bật các vòng nền
//! (nhịp phiên, nhân vật ảo, MC, ảnh truyện) — hai cách chạy không thể lệch nhau.

use std::future::Future;
use std::net::{Ipv4Addr, SocketAddr};
use std::path::{Path, PathBuf};

use crate::{guard, router, store, AppState, Layout};

/// Chạy máy chủ tới khi `tat` xong. Trả về khi máy chủ đã đóng.
///
/// `goc`: gốc dự án (có `client/` và `database/`). `cong_muon`: cổng muốn mở;
/// bận thì lấy cổng trống kế tiếp.
pub async fn chay(goc: PathBuf, cong_muon: u16, tat: impl Future<Output = ()> + Send + 'static) {
    // Chỉ nghe máy này. Không bao giờ 0.0.0.0 — máy khác trong mạng LAN
    // không được chạm vào phòng live.
    let (listener, cong) = mo_cong(cong_muon).await;

    let token = guard::sinh_token();
    let st = AppState::new(Layout::new(&goc), cong, token.clone());

    let cong_file = goc.join(".tmp").join("agent-port.json");
    cong_bao(&cong_file, cong, &token);

    tracing::info!(%cong, goc = %goc.display(), "máy chủ đã mở");
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
    tokio::spawn(crate::bot::chay(st.clone()));
    tokio::spawn(crate::bot::chay_xem_thu(st.clone()));

    // MC do AI dẫn. Cũng sống suốt đời máy chủ, tự im khi tắt hoặc chưa có khoá.
    tokio::spawn(crate::ai::chay(st.clone()));
    // AI tự làm ảnh minh hoạ cho truyện đang kể, khi người vận hành bật.
    tokio::spawn(crate::anh_truyen::chay(st.clone()));
    // Truyện kế tiếp: chuẩn bị sẵn trong lúc đang kể, hết truyện là chuyển ngay.
    tokio::spawn(crate::truyen_sau::chay(st.clone()));
    // Cấu hình Kể chuyện cũ lên một ô "cách kể".
    crate::ke_truyen::chuyen_cau_hinh_cu(&st);
    crate::ke_truyen::dat_vai_giong_mac_dinh(&st);

    // Mở lại đúng chỗ đã dừng: nguồn sự kiện và phòng đang phát của lần trước.
    // App dựng lại giữa buổi live mà phòng tắt sóng là mất khán giả.
    let phong_cu = st.doc_nguon_da_nho();
    let nguon_cu = st.nguon().cfg;
    if nguon_cu.kind != crate::source::SourceKind::Tat {
        tracing::info!(kind = ?nguon_cu.kind, channel = %nguon_cu.channel, "mở lại nguồn sự kiện của lần trước");
        crate::source::mo(st.clone(), nguon_cu);
    }
    if let Some(id) = phong_cu {
        match st.go_live(&id) {
            Ok(()) => tracing::info!(thiet_ke = %id, "phát tiếp phòng của lần trước"),
            Err(e) => tracing::warn!(thiet_ke = %id, ?e, "không phát tiếp được phòng cũ"),
        }
    }

    let kq = axum::serve(listener, router(st)).with_graceful_shutdown(tat).await;

    // Xoá trước khi thoát: file còn lại sẽ chỉ về một cổng đã chết, và trang
    // quản lý sẽ đi gõ cửa nhầm chỗ.
    let _ = std::fs::remove_file(&cong_file);
    if let Err(e) = kq {
        tracing::error!(?e, "máy chủ dừng bất thường");
    }
}

/// Công bố cổng và token ra file, theo docs/05-backend.md §2.
///
/// Đây là đường duy nhất để trang quản lý biết token mà token không phải nằm
/// trong mã trang: dev server đọc file này rồi tự gắn header.
fn cong_bao(path: &Path, cong: u16, token: &str) {
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

/// Tìm gốc dự án: biến `LIVE_ROOT` nếu có, không thì đi ngược lên từ `tu` tới
/// thư mục có cả `client/` và `database/`. Nhờ vậy chạy được từ bất kỳ thư mục
/// nào, không giả định thư mục hiện tại.
pub fn goc_du_an(tu: &Path) -> PathBuf {
    if let Ok(p) = std::env::var("LIVE_ROOT") {
        return PathBuf::from(p);
    }
    let mut d = tu.to_path_buf();
    loop {
        if d.join("client").is_dir() && d.join("database").is_dir() {
            return d;
        }
        if !d.pop() {
            return tu.to_path_buf();
        }
    }
}

/// Cổng muốn mở: biến `LIVE_PORT` nếu có, không thì 47830.
pub fn cong_muon() -> u16 {
    std::env::var("LIVE_PORT").ok().and_then(|s| s.parse().ok()).unwrap_or(47830)
}
