//! Test tích hợp qua HTTP: dựng router thật, gọi vào bằng request thật.
//!
//! Nằm ở `tests/backend/` theo quy ước của dự án (docs/01-quy-uoc.md);
//! `backend/Cargo.toml` trỏ tới đây bằng mục `[[test]]`.

use std::fs;
use std::path::{Path, PathBuf};

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
    /// Gốc dự án giả, để test soi thẳng vào đĩa khi cần.
    root: PathBuf,
    st: std::sync::Arc<AppState>,
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
        fs::write(
            d.join("dist").join("index.html"),
            "<!doctype html><h1>xin chào</h1>",
        )
        .unwrap();
    }
}

fn moi() -> Moi {
    let dir = tempfile::tempdir().unwrap();
    fs::create_dir_all(dir.path().join("database")).unwrap();
    dung_thiet_ke(dir.path(), "ke-chuyen", true);
    dung_thiet_ke(dir.path(), "hip-hop", true);
    let st = AppState::new(Layout::new(dir.path()), PORT, TOKEN.into());
    let root = dir.path().to_path_buf();
    Moi {
        _dir: dir,
        root,
        st: st.clone(),
        app: router(st),
    }
}

impl Moi {
    async fn goi(&self, req: Request<Body>) -> (StatusCode, Value, String) {
        let res = self.app.clone().oneshot(req).await.unwrap();
        let ma = res.status();
        let bytes = axum::body::to_bytes(res.into_body(), 1 << 20)
            .await
            .unwrap();
        let text = String::from_utf8_lossy(&bytes).to_string();
        let json = serde_json::from_str(&text).unwrap_or(Value::Null);
        (ma, json, text)
    }

    async fn api(&self, method: &str, path: &str, body: Option<Value>) -> (StatusCode, Value) {
        let mut b = Request::builder()
            .method(method)
            .uri(path)
            .header(header::HOST, HOST);
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
    assert_eq!(
        ds[1]["obsUrl"],
        json!("http://127.0.0.1:47830/d/ke-chuyen/")
    );
    assert_eq!(j["live"], Value::Null);
}

#[tokio::test]
async fn chi_mot_thiet_ke_phat_mot_luc() {
    let m = moi();

    let (ma, j) = m
        .api(
            "POST",
            "/api/live",
            Some(json!({ "designId": "ke-chuyen" })),
        )
        .await;
    assert_eq!(ma, StatusCode::OK);
    assert_eq!(j["live"], json!("ke-chuyen"));

    // Bật cái thứ hai khi chưa tắt cái đầu: từ chối, và nói rõ cái nào đang chạy.
    let (ma, j) = m
        .api("POST", "/api/live", Some(json!({ "designId": "hip-hop" })))
        .await;
    assert_eq!(ma, StatusCode::CONFLICT);
    assert_eq!(j["live"], json!("ke-chuyen"));

    let (ma, _) = m.api("DELETE", "/api/live", None).await;
    assert_eq!(ma, StatusCode::OK);

    let (ma, j) = m
        .api("POST", "/api/live", Some(json!({ "designId": "hip-hop" })))
        .await;
    assert_eq!(ma, StatusCode::OK);
    assert_eq!(j["live"], json!("hip-hop"));
}

#[tokio::test]
async fn khong_phat_duoc_thiet_ke_khong_ton_tai() {
    let m = moi();
    let (ma, _) = m
        .api("POST", "/api/live", Some(json!({ "designId": "khong-co" })))
        .await;
    assert_eq!(ma, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn id_sai_dinh_dang_bi_tu_choi_truoc_khi_cham_dia() {
    let m = moi();
    let (ma, _) = m
        .api(
            "POST",
            "/api/live",
            Some(json!({ "designId": "Ke Chuyen" })),
        )
        .await;
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
    assert_eq!(
        j["enabled"],
        json!(false),
        "ghi cấu hình không tự bật module"
    );

    let (_, j) = m
        .api("GET", "/api/designs/ke-chuyen/modules/gift-thanks", None)
        .await;
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

    let (_, j) = m
        .api("GET", "/api/designs/ke-chuyen/modules/gift-thanks", None)
        .await;
    assert_eq!(j["enabled"], json!(true));
    assert_eq!(j["config"]["minCoins"], json!(10));
}

#[tokio::test]
async fn moi_thiet_ke_giu_cau_hinh_rieng() {
    let m = moi();
    m.api(
        "PUT",
        "/api/designs/ke-chuyen/modules/music/config",
        Some(json!({ "vol": 20 })),
    )
    .await;
    m.api(
        "PUT",
        "/api/designs/hip-hop/modules/music/config",
        Some(json!({ "vol": 90 })),
    )
    .await;

    let (_, a) = m
        .api("GET", "/api/designs/ke-chuyen/modules/music", None)
        .await;
    let (_, b) = m
        .api("GET", "/api/designs/hip-hop/modules/music", None)
        .await;
    assert_eq!(a["config"]["vol"], json!(20));
    assert_eq!(b["config"]["vol"], json!(90));
}

#[tokio::test]
async fn cau_hinh_khong_phai_object_bi_tu_choi() {
    let m = moi();
    let (ma, _) = m
        .api(
            "PUT",
            "/api/designs/ke-chuyen/modules/gift-thanks/config",
            Some(json!(5)),
        )
        .await;
    assert_eq!(ma, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn khong_ghi_duoc_cau_hinh_cho_thiet_ke_khong_ton_tai() {
    let m = moi();
    let (ma, _) = m
        .api(
            "PUT",
            "/api/designs/khong-co/modules/music/config",
            Some(json!({ "vol": 1 })),
        )
        .await;
    assert_eq!(ma, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn thiet_ke_chua_build_van_hien_kem_ly_do() {
    let dir = tempfile::tempdir().unwrap();
    fs::create_dir_all(dir.path().join("database")).unwrap();
    dung_thiet_ke(dir.path(), "ke-chuyen", false);
    let st = AppState::new(Layout::new(dir.path()), PORT, TOKEN.into());
    let root = dir.path().to_path_buf();
    let m = Moi {
        _dir: dir,
        root,
        st: st.clone(),
        app: router(st),
    };

    let (_, j) = m.api("GET", "/api/designs", None).await;
    let d = &j["designs"][0];
    assert_eq!(d["status"], json!("error"));
    assert!(d["problem"].as_str().unwrap().contains("chưa build"));
}

/// Lấy một thiết kế trong danh sách `/api/designs`.
fn tim<'a>(j: &'a Value, id: &str) -> &'a Value {
    j["designs"]
        .as_array()
        .expect("thiếu designs")
        .iter()
        .find(|d| d["manifest"]["id"] == json!(id))
        .unwrap_or_else(|| panic!("không thấy thiết kế {id}"))
}

#[tokio::test]
async fn doi_ten_hien_tren_the_ma_khong_sua_design_json() {
    let m = moi();
    let truoc = fs::read_to_string(
        m.root
            .join("client")
            .join("designs")
            .join("ke-chuyen")
            .join("design.json"),
    )
    .unwrap();

    let (ma, _) = m
        .api(
            "PUT",
            "/api/designs/ke-chuyen/settings",
            Some(json!({ "name": "Phòng đêm" })),
        )
        .await;
    assert_eq!(ma, StatusCode::OK);

    let (_, j) = m.api("GET", "/api/designs", None).await;
    let d = tim(&j, "ke-chuyen");
    assert_eq!(d["displayName"], json!("Phòng đêm"));
    assert_eq!(
        d["manifest"]["name"],
        json!("Phòng ke-chuyen"),
        "tên gốc phải còn nguyên"
    );

    let sau = fs::read_to_string(
        m.root
            .join("client")
            .join("designs")
            .join("ke-chuyen")
            .join("design.json"),
    )
    .unwrap();
    assert_eq!(truoc, sau, "không được sửa design.json của thiết kế");
}

#[tokio::test]
async fn chua_dat_ten_thi_lay_ten_trong_manifest() {
    let m = moi();
    let (_, j) = m.api("GET", "/api/designs", None).await;
    assert_eq!(tim(&j, "hip-hop")["displayName"], json!("Phòng hip-hop"));
}

#[tokio::test]
async fn link_studio_ngoai_tiktok_bi_tu_choi() {
    let m = moi();
    for xau in [
        "https://ke-gian.example/live",
        "http://livestudio.tiktok.com",
        "https://livestudio.tiktok.com@ke-gian.example/",
    ] {
        let (ma, j) = m
            .api(
                "PUT",
                "/api/designs/ke-chuyen/settings",
                Some(json!({ "studioUrl": xau })),
            )
            .await;
        assert_eq!(ma, StatusCode::BAD_REQUEST, "phải chặn {xau}");
        assert!(j["error"].is_string());
    }

    let (ma, _) = m
        .api(
            "PUT",
            "/api/designs/ke-chuyen/settings",
            Some(json!({ "studioUrl": "https://livestudio.tiktok.com/room/7" })),
        )
        .await;
    assert_eq!(ma, StatusCode::OK);

    let (_, j) = m.api("GET", "/api/designs", None).await;
    assert_eq!(
        tim(&j, "ke-chuyen")["studioUrl"],
        json!("https://livestudio.tiktok.com/room/7")
    );
}

#[tokio::test]
async fn reset_xoa_du_lieu_phien_nhung_giu_cau_hinh_module() {
    let m = moi();
    m.api(
        "PUT",
        "/api/designs/ke-chuyen/modules/gift-thanks/config",
        Some(json!({ "minCoins": 42 })),
    )
    .await;
    let phien = m
        .root
        .join("database")
        .join("designs")
        .join("ke-chuyen")
        .join("session.json");
    fs::create_dir_all(phien.parent().unwrap()).unwrap();
    fs::write(&phien, r#"{"totals":{"xu":9}}"#).unwrap();

    let (ma, j) = m.api("POST", "/api/designs/ke-chuyen/reset", None).await;
    assert_eq!(ma, StatusCode::OK);
    assert_eq!(j["cleared"], json!(["session.json"]));
    assert!(!phien.exists());

    let (_, j) = m
        .api("GET", "/api/designs/ke-chuyen/modules/gift-thanks", None)
        .await;
    assert_eq!(
        j["config"]["minCoins"],
        json!(42),
        "cấu hình module phải còn"
    );
}

#[tokio::test]
async fn reset_khi_chua_co_du_lieu_thi_noi_ro_la_khong_xoa_gi() {
    let m = moi();
    let (ma, j) = m.api("POST", "/api/designs/ke-chuyen/reset", None).await;
    assert_eq!(ma, StatusCode::OK);
    assert_eq!(j["cleared"], json!([]));
}

#[tokio::test]
async fn khong_doi_duoc_cai_dat_cua_thiet_ke_khong_ton_tai() {
    let m = moi();
    let (ma, _) = m
        .api(
            "PUT",
            "/api/designs/khong-co/settings",
            Some(json!({ "name": "X" })),
        )
        .await;
    assert_eq!(ma, StatusCode::NOT_FOUND);
    let (ma, _) = m.api("POST", "/api/designs/khong-co/reset", None).await;
    assert_eq!(ma, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn obs_tai_duoc_assets_cua_module() {
    let m = moi();
    let d = m
        .root
        .join("client")
        .join("modules")
        .join("gift-thanks")
        .join("assets");
    fs::create_dir_all(&d).unwrap();
    fs::write(d.join("qua.svg"), "<svg/>").unwrap();

    let (ma, than) = m.obs("/m/gift-thanks/qua.svg").await;
    assert_eq!(ma, StatusCode::OK);
    assert_eq!(than, "<svg/>");
}

#[tokio::test]
async fn assets_module_khong_thoat_ra_ngoai_duoc() {
    let m = moi();
    let d = m
        .root
        .join("client")
        .join("modules")
        .join("gift-thanks")
        .join("assets");
    fs::create_dir_all(&d).unwrap();

    for duong in [
        "/m/gift-thanks/../../../../database/secrets.json",
        "/m/gift-thanks/../../welcome/assets/x.svg",
    ] {
        let (ma, _) = m.obs(duong).await;
        assert!(
            ma == StatusCode::FORBIDDEN || ma == StatusCode::NOT_FOUND,
            "{duong} trả {ma}"
        );
    }
}

#[tokio::test]
async fn boi_canh_moi_nap_cau_hinh_goi_y_mot_lan() {
    let dir = tempfile::tempdir().unwrap();
    fs::create_dir_all(dir.path().join("database")).unwrap();
    let d = dir.path().join("client").join("designs").join("dam-cuoi");
    fs::create_dir_all(d.join("dist")).unwrap();
    fs::write(d.join("dist").join("index.html"), "<!doctype html>").unwrap();
    fs::write(
        d.join("design.json"),
        r#"{
            "id": "dam-cuoi",
            "name": "Đám cưới online",
            "recommends": ["gift-thanks", "welcome"],
            "defaults": {
              "gift-thanks": { "template": "Cảm ơn {ten} đã gửi lời chúc!" },
              "music": { "vol": 20 }
            }
        }"#,
    )
    .unwrap();
    let st = AppState::new(Layout::new(dir.path()), PORT, TOKEN.into());
    let root = dir.path().to_path_buf();
    let m = Moi {
        _dir: dir,
        root,
        st: st.clone(),
        app: router(st),
    };

    let (ma, j) = m.api("GET", "/api/designs/dam-cuoi/modules", None).await;
    assert_eq!(ma, StatusCode::OK);
    let mods = &j["modules"];
    assert_eq!(
        mods["gift-thanks"]["enabled"],
        json!(true),
        "module gợi ý phải bật"
    );
    assert_eq!(
        mods["gift-thanks"]["config"]["template"],
        json!("Cảm ơn {ten} đã gửi lời chúc!"),
        "câu chữ của bối cảnh phải được nạp"
    );
    assert_eq!(mods["welcome"]["enabled"], json!(true));
    assert_eq!(mods["music"]["config"]["vol"], json!(20));
    assert!(
        mods["music"].get("enabled").is_none() || mods["music"]["enabled"] == json!(false),
        "có cấu hình gợi ý nhưng không nằm trong recommends thì không tự bật"
    );

    // Người vận hành sửa rồi: nạp lại KHÔNG được ghi đè.
    m.api(
        "PUT",
        "/api/designs/dam-cuoi/modules/gift-thanks/config",
        Some(json!({ "template": "Câu của tôi" })),
    )
    .await;
    let (_, j) = m.api("GET", "/api/designs/dam-cuoi/modules", None).await;
    assert_eq!(
        j["modules"]["gift-thanks"]["config"]["template"],
        json!("Câu của tôi")
    );
}

#[tokio::test]
async fn thiet_ke_khong_khai_goi_y_thi_khong_nap_gi() {
    let m = moi();
    let (_, j) = m.api("GET", "/api/designs/ke-chuyen/modules", None).await;
    assert_eq!(j["modules"], json!({}));
}

#[tokio::test]
async fn chua_phat_thi_chua_co_phien() {
    let m = moi();
    let (ma, j) = m.api("GET", "/api/session", None).await;
    assert_eq!(ma, StatusCode::OK);
    assert_eq!(j["session"], Value::Null);
}

#[tokio::test]
async fn bat_phat_thi_mo_phien_moi() {
    let m = moi();
    m.api(
        "POST",
        "/api/live",
        Some(json!({ "designId": "ke-chuyen" })),
    )
    .await;

    let (_, j) = m.api("GET", "/api/session", None).await;
    let s = &j["session"];
    assert_eq!(s["designId"], json!("ke-chuyen"));
    assert_eq!(s["totals"]["viewers"], json!(0));
    assert_eq!(s["seats"], json!([]));
    assert!(s["startedAt"].is_number());

    // Tắt phát thì phiên đóng lại.
    m.api("DELETE", "/api/live", None).await;
    let (_, j) = m.api("GET", "/api/session", None).await;
    assert_eq!(j["session"], Value::Null);
}

#[tokio::test]
async fn nguon_mac_dinh_la_tat() {
    let m = moi();
    let (ma, j) = m.api("GET", "/api/source", None).await;
    assert_eq!(ma, StatusCode::OK);
    assert_eq!(j["source"]["kind"], json!("tat"));
    assert_eq!(j["source"]["running"], json!(false));
}

#[tokio::test]
async fn doi_duoc_sang_nguon_gia_lap() {
    let m = moi();
    let (ma, j) = m
        .api(
            "PUT",
            "/api/source",
            Some(json!({ "kind": "mau", "nhip": 200 })),
        )
        .await;
    assert_eq!(ma, StatusCode::OK);
    assert_eq!(j["source"]["kind"], json!("mau"));
    assert_eq!(j["source"]["running"], json!(true));

    let (_, j) = m
        .api("PUT", "/api/source", Some(json!({ "kind": "tat" })))
        .await;
    assert_eq!(j["source"]["running"], json!(false));
}

#[tokio::test]
async fn dia_chi_cau_noi_la_bi_tu_choi() {
    let m = moi();
    for u in ["https://ke-gian.example/ws", "ws-khong-dung"] {
        let (ma, _) = m
            .api(
                "PUT",
                "/api/source",
                Some(json!({ "kind": "bridge", "url": u })),
            )
            .await;
        assert_eq!(ma, StatusCode::BAD_REQUEST, "phải chặn {u}");
    }
}

#[tokio::test]
async fn nguon_gia_lap_lam_phong_song_len() {
    let m = moi();
    m.api(
        "POST",
        "/api/live",
        Some(json!({ "designId": "ke-chuyen" })),
    )
    .await;
    m.api(
        "PUT",
        "/api/source",
        Some(json!({ "kind": "mau", "nhip": 50 })),
    )
    .await;

    // Chờ nguồn sinh một ít sự kiện.
    tokio::time::sleep(std::time::Duration::from_millis(700)).await;

    let (_, j) = m.api("GET", "/api/session", None).await;
    let s = &j["session"];
    let ghe = s["seats"].as_array().expect("thiếu seats");
    assert!(!ghe.is_empty(), "phải có người ngồi vào ghế: {s}");
    assert!(
        s["recentFeed"].as_array().unwrap().len() > 1,
        "phải có mục feed"
    );

    m.api("PUT", "/api/source", Some(json!({ "kind": "tat" })))
        .await;
}

#[tokio::test]
async fn san_khau_mo_giua_chung_van_biet_du_trang_thai() {
    let m = moi();
    m.api(
        "POST",
        "/api/live",
        Some(json!({ "designId": "ke-chuyen" })),
    )
    .await;
    m.api(
        "PUT",
        "/api/designs/ke-chuyen/modules/chat-bubbles/config",
        Some(json!({ "max": 4 })),
    )
    .await;
    m.api(
        "POST",
        "/api/designs/ke-chuyen/modules/chat-bubbles/enabled",
        Some(json!({ "on": true })),
    )
    .await;

    // Đúng những gì một sân khấu vừa nối sẽ nhận được.
    let chao = m.st.chao_ws();
    let loai: Vec<&str> = chao.iter().filter_map(|x| x["t"].as_str()).collect();
    assert!(
        loai.contains(&"live"),
        "phải biết phòng nào đang phát: {loai:?}"
    );
    assert!(
        loai.contains(&"modules"),
        "phải biết module nào đang bật: {loai:?}"
    );
    assert!(
        loai.contains(&"session"),
        "phải biết phiên đang thế nào: {loai:?}"
    );

    let mods = chao.iter().find(|x| x["t"] == json!("modules")).unwrap();
    assert_eq!(mods["enabled"], json!(["chat-bubbles"]));

    let cfg = chao
        .iter()
        .find(|x| x["t"] == json!("config") && x["moduleId"] == json!("chat-bubbles"))
        .expect("phải gửi cả cấu hình, nếu không module chạy bằng mặc định");
    assert_eq!(cfg["config"]["max"], json!(4));
}

#[tokio::test]
async fn chua_phat_thi_loi_chao_chi_noi_la_chua_phat() {
    let m = moi();
    let chao = m.st.chao_ws();
    assert_eq!(chao.len(), 1);
    assert_eq!(chao[0], json!({ "t": "live", "designId": Value::Null }));
}
