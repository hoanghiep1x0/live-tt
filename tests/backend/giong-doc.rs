//! Khoá API và giọng đọc, kiểm bằng một nhà cung cấp giả.
//!
//! Không gọi nhà cung cấp thật: thứ cần chứng minh là backend gắn đúng khoá,
//! dựng đúng request, trả đúng bytes, và **không bao giờ để khoá lọt ra ngoài**.

use std::net::{Ipv4Addr, SocketAddr};
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::extract::State;
use axum::http::{header, HeaderMap, Request, StatusCode};
use axum::routing::post;
use axum::Json;
use serde_json::{json, Value};
use tokio::sync::oneshot;
use tower::ServiceExt;

use live_backend::{router, AppState, Layout};

const TOKEN: &str = "tok-thu";
const HOST: &str = "127.0.0.1:47830";
/// Bytes giả làm mp3; chỉ cần khác rỗng và nhận lại đúng y như vậy.
const MP3_GIA: &[u8] = b"ID3-gia-lap-mp3";

#[derive(Clone, Default)]
struct DaNhan {
    auth: Arc<Mutex<Option<String>>>,
    body: Arc<Mutex<Option<Value>>>,
}

async fn nha_cung_cap_gia(
    State(ghi): State<DaNhan>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> axum::response::Response {
    *ghi.auth.lock().unwrap() = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .map(str::to_string);
    *ghi.body.lock().unwrap() = Some(body);
    ([(header::CONTENT_TYPE, "audio/mpeg")], MP3_GIA).into_response_axum()
}

/// Nhà cung cấp luôn từ chối, để kiểm phần dịch lỗi.
async fn nha_cung_cap_tu_choi() -> (StatusCode, &'static str) {
    (StatusCode::UNAUTHORIZED, "nope")
}

trait IntoResp {
    fn into_response_axum(self) -> axum::response::Response;
}
impl<T: axum::response::IntoResponse> IntoResp for T {
    fn into_response_axum(self) -> axum::response::Response {
        self.into_response()
    }
}

async fn mo_nha_gia() -> (String, DaNhan, oneshot::Sender<()>) {
    let ghi = DaNhan::default();
    let app = axum::Router::new()
        .route("/v1/audio/speech", post(nha_cung_cap_gia))
        .route("/tu-choi/audio/speech", post(nha_cung_cap_tu_choi))
        .with_state(ghi.clone());
    let l = tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::LOCALHOST, 0)))
        .await
        .unwrap();
    let cong = l.local_addr().unwrap().port();
    let (tx, rx) = oneshot::channel();
    tokio::spawn(async move {
        let _ = axum::serve(l, app)
            .with_graceful_shutdown(async {
                let _ = rx.await;
            })
            .await;
    });
    (format!("http://127.0.0.1:{cong}"), ghi, tx)
}

struct Moi {
    _dir: tempfile::TempDir,
    app: axum::Router,
}

fn moi() -> Moi {
    let dir = tempfile::tempdir().unwrap();
    std::fs::create_dir_all(dir.path().join("database")).unwrap();
    let st = AppState::new(Layout::new(dir.path()), 47830, TOKEN.into());
    Moi { _dir: dir, app: router(st) }
}

impl Moi {
    async fn api(&self, method: &str, path: &str, body: Option<Value>) -> (StatusCode, Value, Vec<u8>) {
        let b = Request::builder()
            .method(method)
            .uri(path)
            .header(header::HOST, HOST)
            .header(header::AUTHORIZATION, format!("Bearer {TOKEN}"));
        let req = match body {
            Some(v) => b
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(v.to_string()))
                .unwrap(),
            None => b.body(Body::empty()).unwrap(),
        };
        let res = self.app.clone().oneshot(req).await.unwrap();
        let ma = res.status();
        let bytes = axum::body::to_bytes(res.into_body(), 1 << 20).await.unwrap();
        let j = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
        (ma, j, bytes.to_vec())
    }
}

#[tokio::test(flavor = "multi_thread")]
async fn chua_dat_khoa_thi_danh_sach_rong() {
    let m = moi();
    let (ma, j, _) = m.api("GET", "/api/secrets", None).await;
    assert_eq!(ma, StatusCode::OK);
    assert_eq!(j["providers"], json!([]));
}

#[tokio::test(flavor = "multi_thread")]
async fn dat_khoa_roi_nhung_khong_bao_gio_tra_khoa_ra() {
    let m = moi();
    let (ma, j, _) = m
        .api(
            "PUT",
            "/api/secrets/vieneu",
            Some(json!({ "kind": "openai", "baseUrl": "https://api.vieneu.io/api/v1",
                         "key": "sk-rat-bi-mat" })),
        )
        .await;
    assert_eq!(ma, StatusCode::OK);
    assert_eq!(j["provider"]["hasKey"], json!(true));

    let (_, _, raw) = m.api("GET", "/api/secrets", None).await;
    let text = String::from_utf8_lossy(&raw);
    assert!(!text.contains("sk-rat-bi-mat"), "khoá lọt ra REST: {text}");
    assert!(text.contains("\"hasKey\":true"));
}

#[tokio::test(flavor = "multi_thread")]
async fn xoa_duoc_nha_cung_cap() {
    let m = moi();
    m.api("PUT", "/api/secrets/vieneu", Some(json!({ "kind": "openai", "key": "k" })))
        .await;
    let (ma, _, _) = m.api("DELETE", "/api/secrets/vieneu", None).await;
    assert_eq!(ma, StatusCode::OK);
    let (ma, _, _) = m.api("DELETE", "/api/secrets/vieneu", None).await;
    assert_eq!(ma, StatusCode::NOT_FOUND, "xoá cái không có thì báo không có");
}

#[tokio::test(flavor = "multi_thread")]
async fn sinh_giong_tra_ve_bytes_va_gan_dung_khoa() {
    let m = moi();
    let (goc, ghi, _dung) = mo_nha_gia().await;

    m.api(
        "PUT",
        "/api/secrets/thu",
        Some(json!({ "kind": "openai", "baseUrl": format!("{goc}/v1"),
                     "key": "sk-rat-bi-mat", "model": "thu-v1" })),
    )
    .await;

    let (ma, _, bytes) = m
        .api(
            "POST",
            "/api/tts",
            Some(json!({ "provider": "thu", "voice": "Anh Khôi",
                         "text": "Xin chào cả phòng", "speed": 1.1 })),
        )
        .await;

    assert_eq!(ma, StatusCode::OK);
    assert_eq!(bytes, MP3_GIA, "phải trả đúng bytes nhà cung cấp gửi về");

    assert_eq!(
        ghi.auth.lock().unwrap().clone(),
        Some("Bearer sk-rat-bi-mat".to_string()),
        "backend phải tự gắn khoá"
    );
    let body = ghi.body.lock().unwrap().clone().expect("nhà cung cấp phải nhận được body");
    assert_eq!(body["input"], json!("Xin chào cả phòng"));
    assert_eq!(body["voice"], json!("Anh Khôi"));
    assert_eq!(body["response_format"], json!("mp3"));
    assert_eq!(body["model"], json!("thu-v1"));
    assert_eq!(body["speed"], json!(1.1));
}

#[tokio::test(flavor = "multi_thread")]
async fn nha_cung_cap_tu_choi_thi_dich_ra_tieng_nguoi() {
    let m = moi();
    let (goc, _ghi, _dung) = mo_nha_gia().await;
    m.api(
        "PUT",
        "/api/secrets/thu",
        Some(json!({ "kind": "openai", "baseUrl": format!("{goc}/tu-choi"), "key": "sk-sai" })),
    )
    .await;

    let (ma, j, _) = m
        .api(
            "POST",
            "/api/tts",
            Some(json!({ "provider": "thu", "voice": "An", "text": "chào" })),
        )
        .await;

    // Lỗi của nhà cung cấp, không phải lỗi của người vừa bấm.
    assert_eq!(ma, StatusCode::BAD_GATEWAY);
    let msg = j["error"].as_str().unwrap_or("");
    assert!(msg.contains("Khoá"), "phải nói rõ là khoá sai: {msg}");
}

#[tokio::test(flavor = "multi_thread")]
async fn chua_cau_hinh_thi_bao_loi_nhap_lieu() {
    let m = moi();
    let (ma, j, _) = m
        .api(
            "POST",
            "/api/tts",
            Some(json!({ "provider": "chua-co", "voice": "An", "text": "chào" })),
        )
        .await;
    assert_eq!(ma, StatusCode::BAD_REQUEST);
    assert!(j["error"].as_str().unwrap_or("").contains("chưa cấu hình"));
}

#[tokio::test(flavor = "multi_thread")]
async fn dia_chi_nha_cung_cap_la_bi_tu_choi() {
    let m = moi();
    let (ma, _, _) = m
        .api(
            "PUT",
            "/api/secrets/thu",
            Some(json!({ "kind": "openai", "baseUrl": "http://api.ke-gian.example/v1",
                         "key": "k" })),
        )
        .await;
    assert_eq!(ma, StatusCode::BAD_REQUEST, "http:// chỉ cho máy này");
}
