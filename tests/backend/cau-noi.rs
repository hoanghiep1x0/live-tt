//! Nguồn cầu nối, kiểm bằng một máy chủ giả nói đúng giao thức của bản cũ.
//!
//! Không gọi TikTok thật: thứ cần chứng minh ở đây là backend nối được, gửi lời
//! chào đúng, đọc tin đúng và áp vào phiên. Phần đọc TikTok là việc của tiến
//! trình cầu nối, đã có sẵn ở bản cũ (`D:\Live\tools\bridge`).

use std::net::{Ipv4Addr, SocketAddr};
use std::sync::Arc;
use std::time::Duration;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::response::Response;
use axum::routing::get;
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use tokio::sync::oneshot;

use live_backend::source::{SourceCfg, SourceKind};
use live_backend::{AppState, Layout};

/// Máy chủ giả: nhận lời chào, rồi đẩy một chuỗi tin như cầu nối thật.
async fn cau_noi_gia(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(|socket| async move {
        let (mut tx, mut rx) = socket.split();

        // Lời chào phải tới trước, và phải là subscribe kèm kênh.
        let chao = rx.next().await;
        let Some(Ok(Message::Text(s))) = chao else { return };
        let v: Value = serde_json::from_str(&s).unwrap_or(Value::Null);
        assert_eq!(v["type"], json!("subscribe"), "backend phải gửi subscribe trước");
        assert_eq!(v["channel"], json!("kechuyen.dem"));

        let tin = vec![
            json!({ "type": "status", "state": "dang-live", "message": "ổn" }),
            json!({ "kind": "join", "user": "an", "name": "An" }),
            json!({ "kind": "join", "user": "binh", "name": "Bình" }),
            json!({ "kind": "comment", "user": "an", "name": "An", "text": "chào cả phòng" }),
            json!({ "kind": "gift", "user": "binh", "name": "Bình",
                    "gift": "Hoa sen", "count": 3, "xuEach": 10 }),
            json!({ "type": "viewers", "count": 1234 }),
            // Tin hỏng ở giữa: không được làm mất những tin sau.
            json!({ "kind": "gi-do-la" }),
            json!({ "kind": "like", "user": "an", "name": "An", "count": 7, "total": 500 }),
        ];
        for t in tin {
            if tx.send(Message::Text(t.to_string())).await.is_err() {
                return;
            }
        }
        // Giữ kết nối mở để backend không coi là đứt rồi nối lại.
        tokio::time::sleep(Duration::from_secs(5)).await;
    })
}

/// Mở máy chủ giả ở một cổng trống, trả địa chỉ ws.
async fn mo_cau_noi_gia() -> (String, oneshot::Sender<()>) {
    let app = axum::Router::new().route("/ws/live", get(cau_noi_gia));
    let l = tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::LOCALHOST, 0)))
        .await
        .unwrap();
    let cong = l.local_addr().unwrap().port();
    let (dung_tx, dung_rx) = oneshot::channel();
    tokio::spawn(async move {
        let _ = axum::serve(l, app)
            .with_graceful_shutdown(async {
                let _ = dung_rx.await;
            })
            .await;
    });
    (format!("ws://127.0.0.1:{cong}/ws/live"), dung_tx)
}

fn dung_thiet_ke(root: &std::path::Path, id: &str) {
    let d = root.join("client").join("designs").join(id);
    std::fs::create_dir_all(d.join("dist")).unwrap();
    std::fs::write(
        d.join("design.json"),
        format!(r#"{{"id":"{id}","name":"Phòng {id}","seats":20}}"#),
    )
    .unwrap();
    std::fs::write(d.join("dist").join("index.html"), "<!doctype html>").unwrap();
}

/// Chờ tới khi điều kiện đúng, tối đa `han` — không ngủ cứng một khoảng đoán mò.
async fn cho_den<F: Fn() -> bool>(han: Duration, dieu_kien: F) -> bool {
    let het = tokio::time::Instant::now() + han;
    while tokio::time::Instant::now() < het {
        if dieu_kien() {
            return true;
        }
        tokio::time::sleep(Duration::from_millis(20)).await;
    }
    dieu_kien()
}

#[tokio::test(flavor = "multi_thread")]
async fn nhan_duoc_su_kien_that_tu_cau_noi() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::create_dir_all(dir.path().join("database")).unwrap();
    dung_thiet_ke(dir.path(), "ke-chuyen");

    let st = AppState::new(Layout::new(dir.path()), 47830, "tok".into());
    st.go_live("ke-chuyen").unwrap();

    let (url, _dung) = mo_cau_noi_gia().await;
    live_backend::source::mo(
        st.clone(),
        SourceCfg {
            kind: SourceKind::Bridge,
            url,
            channel: "kechuyen.dem".into(),
            nhip: 900,
        },
    );

    let s = st.clone();
    let xong = cho_den(Duration::from_secs(5), || {
        s.session_view().is_some_and(|v| v.totals.likes >= 500)
    })
    .await;
    assert!(xong, "không nhận được tin từ cầu nối trong 5 giây");

    let v = st.session_view().unwrap();
    assert_eq!(v.seats.len(), 2, "hai người vào phòng phải có hai chỗ");
    assert_eq!(v.totals.xu, 30, "quà 3 × 10 xu");
    assert_eq!(v.totals.comments, 1);
    assert_eq!(v.totals.likes, 500, "lấy tổng tim của TikTok");
    assert_eq!(v.totals.viewers, 1234, "số người xem lấy từ cầu nối, không phải số ghế");
    assert_eq!(v.top_givers[0].user, "binh");

    // Tin từ cầu nối là người THẬT: không được đánh dấu là nhân vật ảo, nếu
    // không module cảm ơn quà sẽ bỏ qua hết.
    let qua = v.recent_feed.iter().find(|f| f.kind == "gift").expect("thiếu mục quà");
    assert_eq!(qua.ao, None);

    live_backend::source::mo(st.clone(), SourceCfg::default());
}

#[tokio::test(flavor = "multi_thread")]
async fn cau_noi_khong_co_that_thi_bao_loi_chu_khong_sap() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::create_dir_all(dir.path().join("database")).unwrap();
    let st = AppState::new(Layout::new(dir.path()), 47830, "tok".into());

    live_backend::source::mo(
        st.clone(),
        SourceCfg {
            kind: SourceKind::Bridge,
            // Cổng này không có ai nghe.
            url: "ws://127.0.0.1:1/ws/live".into(),
            channel: "x".into(),
            nhip: 900,
        },
    );

    let s = st.clone();
    let co_loi = cho_den(Duration::from_secs(5), || s.nguon().problem.is_some()).await;
    assert!(co_loi, "phải báo được là không nối được cầu nối");
    assert_eq!(st.nguon().running, false);

    live_backend::source::mo(st.clone(), SourceCfg::default());
}

#[tokio::test(flavor = "multi_thread")]
async fn doi_nguon_thi_nguon_cu_tu_dung() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::create_dir_all(dir.path().join("database")).unwrap();
    dung_thiet_ke(dir.path(), "ke-chuyen");
    let st = AppState::new(Layout::new(dir.path()), 47830, "tok".into());
    st.go_live("ke-chuyen").unwrap();

    live_backend::source::mo(
        st.clone(),
        SourceCfg { kind: SourceKind::Mau, nhip: 50, ..SourceCfg::default() },
    );
    let s = st.clone();
    assert!(
        cho_den(Duration::from_secs(3), || s.session_view()
            .is_some_and(|v| !v.recent_feed.is_empty()))
        .await,
        "nguồn mẫu phải sinh được sự kiện"
    );

    live_backend::source::mo(st.clone(), SourceCfg::default());
    tokio::time::sleep(Duration::from_millis(300)).await;
    let truoc = st.session_view().unwrap().recent_feed.len();
    tokio::time::sleep(Duration::from_millis(400)).await;
    assert_eq!(
        st.session_view().unwrap().recent_feed.len(),
        truoc,
        "tắt nguồn rồi thì không được sinh thêm sự kiện nào"
    );
}
