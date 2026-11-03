//! Test tích hợp qua HTTP: dựng router thật, gọi vào bằng request thật.
//!
//! Nằm ở `tests/backend/` theo quy ước của dự án (docs/01-quy-uoc.md);
//! `backend/Cargo.toml` trỏ tới đây bằng mục `[[test]]`.

use std::fs;
use std::path::Path;

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use serde_json::{json, Value};
use tower::ServiceExt;

use live_backend::{router, AppState, Layout};

const PORT: u16 = 47830;
const TOKEN: &str = "tok-thu";
const HOST: &str = "127.0.0.1:47830";

struct Moi {
    _dir: tempfile::TempDir,
    app: axum::Router,
}

fn dung_thiet_ke(root: &Path, id: &str, build: bool) {
    let d = root.join("client").join("designs").join(id);
    fs::create_dir_all(d.join("assets")).unwrap();
    fs::write(
        d.join("design.json"),
        format!(r#"{{"id":"{id}","name":"Phòng {id}","slots":["center"]}}"#),
    )
    .unwrap();
    fs::write(d.join("assets").join("ghi-chu.txt"), "nền mẫu").unwrap();
    if build {
        fs::create_dir_all(d.join("dist")).unwrap();
        fs::write(d.join("dist").join("index.html"), "<!doctype html><h1>xin chào</h1>").unwrap();
    }
}

fn moi() -> Moi {
    let dir = tempfile::tempdir().unwrap();
    fs::create_dir_all(dir.path().join("database")).unwrap();
    dung_thiet_ke(dir.path(), "ke-chuyen", true);
    dung_thiet_ke(dir.path(), "hip-hop", true);
    let st = AppState::new(Layout::new(dir.path()), PORT, TOKEN.into());
    Moi { _dir: dir, app: router(st) }
}

impl Moi {
    async fn goi(&self, req: Request<Body>) -> (StatusCode, Value, String) {
        let res = self.app.clone().oneshot(req).await.unwrap();
        let ma = res.status();
        let bytes = axum::body::to_bytes(res.into_body(), 1 << 20).await.unwrap();
        let text = String::from_utf8_lossy(&bytes).to_string();
        let json = serde_json::from_str(&text).unwrap_or(Value::Null);
        (ma, json, text)
    }

    async fn api(&self, method: &str, path: &str, body: Option<Value>) -> (StatusCode, Value) {
        let mut b = Request::builder().method(method).uri(path).header(header::HOST, HOST);
        b = b.header(header::AUTHORIZATION, format!("Bearer {TOKEN}"));
        let req = match body {
            Some(v) => b
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(v.to_string()))
                .unwrap(),
            None => b.body(Body::empty()).unwrap(),
        };
        let (ma, j, _) = self.goi(req).await;
        (ma, j)
    }

    /// Yêu cầu kiểu OBS: không token, không Origin.
    async fn obs(&self, path: &str) -> (StatusCode, String) {
        let req = Request::builder()
            .uri(path)
            .header(header::HOST, HOST)
            .body(Body::empty())
            .unwrap();
        let (ma, _, text) = self.goi(req).await;
        (ma, text)
    }
}

#[tokio::test]
async fn obs_tai_duoc_trang_thiet_ke_ma_khong_can_token() {
    let m = moi();
    let (ma, than) = m.obs("/d/ke-chuyen/").await;
    assert_eq!(ma, StatusCode::OK);
    assert!(than.contains("xin chào"), "{than}");
}

#[tokio::test]
async fn obs_tai_duoc_assets_rieng() {
    let m = moi();
    let (ma, than) = m.obs("/a/ke-chuyen/ghi-chu.txt").await;
    assert_eq!(ma, StatusCode::OK);
    assert_eq!(than, "nền mẫu");
}

#[tokio::test]
async fn api_khong_token_bi_tu_choi() {
    let m = moi();
    let req = Request::builder()
        .uri("/api/designs")
        .header(header::HOST, HOST)
        .body(Body::empty())
        .unwrap();
    let (ma, _, _) = m.goi(req).await;
    assert_eq!(ma, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn trang_web_ngoai_bi_chan_du_co_token() {
    let m = moi();
    let req = Request::builder()
        .uri("/api/designs")
        .header(header::HOST, HOST)
        .header(header::ORIGIN, "https://ke-gian.example")
        .header(header::AUTHORIZATION, format!("Bearer {TOKEN}"))
        .body(Body::empty())
        .unwrap();
    let (ma, _, _) = m.goi(req).await;
    assert_eq!(ma, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn khong_doc_duoc_file_ngoai_thu_muc_thiet_ke() {
    let m = moi();
    for duong in [
        "/a/ke-chuyen/../../../database/secrets.json",
        "/d/ke-chuyen/../../hip-hop/dist/index.html",
    ] {
        let (ma, _) = m.obs(duong).await;
        assert!(
            ma == StatusCode::FORBIDDEN || ma == StatusCode::NOT_FOUND,
            "{duong} trả {ma}"
        );
    }
}

#[tokio::test]
async fn liet_ke_thiet_ke_kem_url_obs() {
    let m = moi();
    let (ma, j) = m.api("GET", "/api/designs", None).await;
    assert_eq!(ma, StatusCode::OK);
    let ds = j["designs"].as_array().unwrap();
    assert_eq!(ds.len(), 2);
    assert_eq!(ds[0]["manifest"]["id"], json!("hip-hop"), "sắp theo id");
    assert_eq!(ds[1]["obsUrl"], json!("http://127.0.0.1:47830/d/ke-chuyen/"));
    assert_eq!(j["live"], Value::Null);
}

#[tokio::test]
async fn chi_mot_thiet_ke_phat_mot_luc() {
    let m = moi();

    let (ma, j) = m.api("POST", "/api/live", Some(json!({ "designId": "ke-chuyen" }))).await;
    assert_eq!(ma, StatusCode::OK);
    assert_eq!(j["live"], json!("ke-chuyen"));

    // Bật cái thứ hai khi chưa tắt cái đầu: từ chối, và nói rõ cái nào đang chạy.
    let (ma, j) = m.api("POST", "/api/live", Some(json!({ "designId": "hip-hop" }))).await;
    assert_eq!(ma, StatusCode::CONFLICT);
    assert_eq!(j["live"], json!("ke-chuyen"));

    let (ma, _) = m.api("DELETE", "/api/live", None).await;
    assert_eq!(ma, StatusCode::OK);

    let (ma, j) = m.api("POST", "/api/live", Some(json!({ "designId": "hip-hop" }))).await;
    assert_eq!(ma, StatusCode::OK);
    assert_eq!(j["live"], json!("hip-hop"));
}

#[tokio::test]
async fn khong_phat_duoc_thiet_ke_khong_ton_tai() {
    let m = moi();
    let (ma, _) = m.api("POST", "/api/live", Some(json!({ "designId": "khong-co" }))).await;
    assert_eq!(ma, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn id_sai_dinh_dang_bi_tu_choi_truoc_khi_cham_dia() {
    let m = moi();
    let (ma, _) = m.api("POST", "/api/live", Some(json!({ "designId": "Ke Chuyen" }))).await;
    assert_eq!(ma, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn ghi_roi_doc_lai_cau_hinh_module() {
    let m = moi();
    let (ma, j) = m
        .api(
            "PUT",
            "/api/designs/ke-chuyen/modules/gift-thanks/config",
            Some(json!({ "minCoins": 10, "combo": true })),
        )
        .await;
    assert_eq!(ma, StatusCode::OK);
    assert_eq!(j["config"]["minCoins"], json!(10));
    assert_eq!(j["enabled"], json!(false), "ghi cấu hình không tự bật module");

    let (_, j) = m.api("GET", "/api/designs/ke-chuyen/modules/gift-thanks", None).await;
    assert_eq!(j["config"]["combo"], json!(true));
}

#[tokio::test]
async fn bat_module_khong_lam_mat_cau_hinh() {
    let m = moi();
    m.api(
        "PUT",
        "/api/designs/ke-chuyen/modules/gift-thanks/config",
        Some(json!({ "minCoins": 10 })),
    )
    .await;
    let (ma, _) = m
        .api(
            "POST",
            "/api/designs/ke-chuyen/modules/gift-thanks/enabled",
            Some(json!({ "on": true })),
        )
        .await;
    assert_eq!(ma, StatusCode::OK);

    let (_, j) = m.api("GET", "/api/designs/ke-chuyen/modules/gift-thanks", None).await;
    assert_eq!(j["enabled"], json!(true));
    assert_eq!(j["config"]["minCoins"], json!(10));
}

#[tokio::test]
async fn moi_thiet_ke_giu_cau_hinh_rieng() {
    let m = moi();
    m.api("PUT", "/api/designs/ke-chuyen/modules/music/config", Some(json!({ "vol": 20 })))
        .await;
    m.api("PUT", "/api/designs/hip-hop/modules/music/config", Some(json!({ "vol": 90 })))
        .await;

    let (_, a) = m.api("GET", "/api/designs/ke-chuyen/modules/music", None).await;
    let (_, b) = m.api("GET", "/api/designs/hip-hop/modules/music", None).await;
    assert_eq!(a["config"]["vol"], json!(20));
    assert_eq!(b["config"]["vol"], json!(90));
}

#[tokio::test]
async fn cau_hinh_khong_phai_object_bi_tu_choi() {
    let m = moi();
    let (ma, _) = m
        .api("PUT", "/api/designs/ke-chuyen/modules/gift-thanks/config", Some(json!(5)))
        .await;
    assert_eq!(ma, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn khong_ghi_duoc_cau_hinh_cho_thiet_ke_khong_ton_tai() {
    let m = moi();
    let (ma, _) = m
        .api("PUT", "/api/designs/khong-co/modules/music/config", Some(json!({ "vol": 1 })))
        .await;
    assert_eq!(ma, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn thiet_ke_chua_build_van_hien_kem_ly_do() {
    let dir = tempfile::tempdir().unwrap();
    fs::create_dir_all(dir.path().join("database")).unwrap();
    dung_thiet_ke(dir.path(), "ke-chuyen", false);
    let st = AppState::new(Layout::new(dir.path()), PORT, TOKEN.into());
    let m = Moi { _dir: dir, app: router(st) };

    let (_, j) = m.api("GET", "/api/designs", None).await;
    let d = &j["designs"][0];
    assert_eq!(d["status"], json!("error"));
    assert!(d["problem"].as_str().unwrap().contains("chưa build"));
}
