//! Backend tự bật cầu nối TikTok (`backend/cau-noi`, tiến trình con `node`).
//!
//! Người vận hành không phải mở cửa sổ lệnh nào trước buổi live: chọn nguồn
//! `bridge` (hay bấm "Kết nối Studio") là backend tự bật, tự giám sát, tự tắt
//! cầu nối. Xem docs/07-cau-noi-tiktok.md §4.
//!
//! Tách bạch với `bridge.rs`: file đó là **client** WebSocket đọc tin, file
//! này chỉ lo **tiến trình**. Hai tác vụ chạy song song, không gọi nhau; nhờ
//! vậy trỏ `url` sang cầu nối của riêng mình thì `bridge.rs` vẫn chạy y như cũ
//! và file này đứng ngoài.
//!
//! | Việc | Cách |
//! |---|---|
//! | Khi nào bật | Nguồn `bridge` **và** `url` là địa chỉ mặc định (`quyet_dinh`) |
//! | Đã có cầu nối sống ở cổng 8787 (vd bản D:\Live) | Dùng lại, không bật thêm |
//! | Cầu nối chết | Bật lại, chờ giãn dần 2 → 30 giây |
//! | Đổi nguồn | Thế hệ nguồn đổi → giết tiến trình con |
//! | Tắt app | `kill_on_drop`, cộng stdin đóng → cầu nối tự tắt (`CAU_NOI_THEO_CHA`) |

use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use std::time::{Duration, Instant};

use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};

use crate::source::{bridge_url_mac_dinh, SourceCfg, SourceKind};
use crate::state::AppState;

/// Cổng của cầu nối mặc định — khớp `bridge_url_mac_dinh`.
pub const CONG: u16 = 8787;
/// Node chạy thẳng TypeScript (bỏ kiểu) từ bản này.
const NODE_TOI_THIEU: (u64, u64) = (23, 6);

const CHO_DAU: Duration = Duration::from_secs(2);
const CHO_TRAN: Duration = Duration::from_secs(30);
/// Cầu nối chạy được lâu chừng này rồi mới chết thì coi là ổn định — lần bật
/// lại sau chờ ngắn lại từ đầu.
const ON_DINH: Duration = Duration::from_secs(60);
/// Đang dùng lại cầu nối của người khác: cứ ngần này hỏi lại xem nó còn sống.
const NHIP_DUNG_LAI: Duration = Duration::from_secs(5);
/// Cầu nối thoát với mã này là cổng đang bị tiến trình khác giữ (`server.ts`).
const MA_CONG_BAN: i32 = 3;

#[derive(Debug, PartialEq, Eq)]
pub enum QuyetDinh {
    /// Không phải việc của backend: nguồn khác, hoặc người dùng trỏ `url` sang
    /// cầu nối của riêng họ.
    KhongBat,
    /// Đã có cầu nối sống ở cổng mặc định — dùng lại, tránh hai tiến trình
    /// tranh một cổng.
    DungLai,
    BatMoi,
}

/// Nguồn này có thuộc diện backend tự bật cầu nối không. Hàm thuần.
pub fn can_tu_bat(cfg: &SourceCfg) -> bool {
    cfg.kind == SourceKind::Bridge && cfg.url.trim() == bridge_url_mac_dinh()
}

/// Bật mới, dùng lại hay không đụng tới. Hàm thuần.
pub fn quyet_dinh(cfg: &SourceCfg, co_cau_noi_song: bool) -> QuyetDinh {
    if !can_tu_bat(cfg) {
        QuyetDinh::KhongBat
    } else if co_cau_noi_song {
        QuyetDinh::DungLai
    } else {
        QuyetDinh::BatMoi
    }
}

pub const LOI_THIEU_NODE: &str = "Cần cài Node.js 23.6 trở lên để lấy dữ liệu live";

/// Đọc kết quả `node --version` (`None`: không chạy được `node`). Hàm thuần.
pub fn kiem_node(ra: Option<&str>) -> Result<(), String> {
    let Some(ra) = ra else {
        return Err(LOI_THIEU_NODE.into());
    };
    let so: Vec<u64> = ra
        .trim()
        .trim_start_matches('v')
        .split('.')
        .map(|x| x.parse().unwrap_or(0))
        .collect();
    let ban = (so.first().copied().unwrap_or(0), so.get(1).copied().unwrap_or(0));
    if ban >= NODE_TOI_THIEU {
        Ok(())
    } else {
        Err(format!("{LOI_THIEU_NODE} (máy này có Node {})", ra.trim()))
    }
}

/// Phản hồi thô của `GET /status` có phải của một cầu nối đang sống không: mã
/// 200 và thân có danh sách kênh (cả bản này lẫn bản D:\Live đều trả
/// `channels`). Cổng 8787 bị một chương trình khác chiếm thì không tính. Hàm thuần.
pub fn la_cau_noi_song(phan_hoi: &str) -> bool {
    let dong_dau = phan_hoi.lines().next().unwrap_or("");
    dong_dau.starts_with("HTTP/") && dong_dau.split_whitespace().nth(1) == Some("200") && phan_hoi.contains("\"channels\"")
}

/// Mã cầu nối và thư viện có đủ chưa. Trả thư mục `backend/cau-noi`.
pub fn kiem_ma_nguon(goc: &Path) -> Result<PathBuf, String> {
    let thu_muc = goc.join("backend").join("cau-noi");
    if !thu_muc.join("src").join("server.ts").is_file() {
        return Err(format!("Thiếu mã cầu nối ở {}", thu_muc.display()));
    }
    // npm workspace đặt thư viện ở gốc dự án; cài riêng trong gói thì ở đó.
    let co_thu_vien = [goc.join("node_modules"), thu_muc.join("node_modules")]
        .iter()
        .any(|nm| nm.join("tiktok-live-connector").join("package.json").is_file());
    if !co_thu_vien {
        return Err("Chưa cài thư viện cầu nối — chạy `npm install` ở gốc dự án".into());
    }
    Ok(thu_muc)
}

/// Câu báo khi tiến trình con thoát. Hàm thuần.
pub fn loi_khi_thoat(ma: Option<i32>) -> String {
    match ma {
        Some(MA_CONG_BAN) => format!(
            "Cổng {CONG} đang bị chương trình khác giữ — tắt chương trình đó để lấy dữ liệu live"
        ),
        Some(m) => format!("Cầu nối TikTok vừa dừng (mã {m}) — đang bật lại…"),
        None => "Cầu nối TikTok vừa dừng — đang bật lại…".into(),
    }
}

/// Giữ cầu nối sống suốt thế hệ nguồn `the_he`. Gọi cùng lúc với
/// `bridge::chay`; nguồn không thuộc diện tự bật thì thoát ngay.
pub async fn giu(st: Arc<AppState>, cfg: SourceCfg, the_he: u64) {
    if !can_tu_bat(&cfg) {
        return;
    }
    let mut cho = CHO_DAU;
    loop {
        if st.the_he_nguon() != the_he {
            return;
        }
        match quyet_dinh(&cfg, hoi_status().await) {
            QuyetDinh::KhongBat => return,
            QuyetDinh::DungLai => {
                st.dat_loi_tien_trinh(None);
                if !ngu(&st, the_he, NHIP_DUNG_LAI).await {
                    return;
                }
                continue;
            }
            QuyetDinh::BatMoi => {}
        }

        match bat(&st).await {
            Ok(con) => {
                st.dat_loi_tien_trinh(None);
                let luc_bat = Instant::now();
                match theo_doi(&st, the_he, con).await {
                    None => return, // đã đổi nguồn, tiến trình đã tắt
                    Some(ma) => {
                        tracing::warn!(?ma, "cầu nối TikTok thoát");
                        st.dat_loi_tien_trinh(Some(loi_khi_thoat(ma)));
                        if luc_bat.elapsed() >= ON_DINH {
                            cho = CHO_DAU;
                        }
                    }
                }
            }
            Err(loi) => {
                tracing::warn!(%loi, "không bật được cầu nối TikTok");
                st.dat_loi_tien_trinh(Some(loi));
            }
        }

        if !ngu(&st, the_he, cho).await {
            return;
        }
        cho = (cho * 2).min(CHO_TRAN);
    }
}

/// Ngủ nhưng vẫn để ý đổi nguồn. `false`: nguồn đã đổi, thôi.
async fn ngu(st: &AppState, the_he: u64, bao_lau: Duration) -> bool {
    let het = Instant::now() + bao_lau;
    while Instant::now() < het {
        if st.the_he_nguon() != the_he {
            return false;
        }
        tokio::time::sleep(Duration::from_millis(250)).await;
    }
    st.the_he_nguon() == the_he
}

/// Hỏi `GET /status` của cổng mặc định. Viết tay vài dòng HTTP thay vì kéo
/// thêm một thư viện client bất đồng bộ — chỉ cần biết sống hay chết.
async fn hoi_status() -> bool {
    let hoi = async {
        let mut s = tokio::net::TcpStream::connect(("127.0.0.1", CONG)).await.ok()?;
        s.write_all(b"GET /status HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n")
            .await
            .ok()?;
        let mut buf = Vec::new();
        s.take(64 * 1024).read_to_end(&mut buf).await.ok()?;
        Some(String::from_utf8_lossy(&buf).to_string())
    };
    match tokio::time::timeout(Duration::from_millis(1500), hoi).await {
        Ok(Some(phan_hoi)) => la_cau_noi_song(&phan_hoi),
        _ => false,
    }
}

fn lenh(chuong_trinh: &str) -> Command {
    let mut c = Command::new(chuong_trinh);
    // Không hiện cửa sổ đen trên Windows.
    #[cfg(windows)]
    c.creation_flags(0x0800_0000);
    c
}

async fn phien_ban_node() -> Option<String> {
    let mut c = lenh("node");
    c.arg("--version").stdin(Stdio::null()).stderr(Stdio::null());
    let ra = tokio::time::timeout(Duration::from_secs(10), c.output()).await.ok()?.ok()?;
    ra.status.success().then(|| String::from_utf8_lossy(&ra.stdout).to_string())
}

/// Kiểm Node, mã, thư viện rồi bật `node src/server.ts`.
async fn bat(st: &AppState) -> Result<Child, String> {
    kiem_node(phien_ban_node().await.as_deref())?;
    let thu_muc = kiem_ma_nguon(&st.layout.root)?;

    let mut c = lenh("node");
    c.arg(Path::new("src").join("server.ts"))
        .current_dir(&thu_muc)
        .env("PORT", CONG.to_string())
        .env("HOST", "127.0.0.1")
        .env("CAU_NOI_THEO_CHA", "1")
        .env_remove("EULER_API_KEY")
        // stdin giữ ở đây: backend chết là ống đóng, cầu nối tự tắt.
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    if let Some(k) = crate::secrets::khoa_euler(&st.layout) {
        c.env("EULER_API_KEY", k);
    }
    let mut con = c.spawn().map_err(|e| format!("{LOI_THIEU_NODE} (không chạy được node: {e})"))?;
    tracing::info!(pid = ?con.id(), "đã bật cầu nối TikTok");

    if let Some(ra) = con.stdout.take() {
        tokio::spawn(async move {
            let mut dong = BufReader::new(ra).lines();
            while let Ok(Some(d)) = dong.next_line().await {
                tracing::info!(target: "cau_noi", "{d}");
            }
        });
    }
    if let Some(ra) = con.stderr.take() {
        tokio::spawn(async move {
            let mut dong = BufReader::new(ra).lines();
            while let Ok(Some(d)) = dong.next_line().await {
                tracing::warn!(target: "cau_noi", "{d}");
            }
        });
    }
    Ok(con)
}

/// Chờ tiến trình con. `None`: nguồn đã đổi, đã tắt nó. `Some(mã)`: nó tự thoát.
async fn theo_doi(st: &AppState, the_he: u64, mut con: Child) -> Option<Option<i32>> {
    // Giữ đầu ống stdin tới khi xong việc với tiến trình này.
    let _vao = con.stdin.take();
    loop {
        tokio::select! {
            kq = con.wait() => {
                return Some(kq.ok().and_then(|s| s.code()));
            }
            _ = tokio::time::sleep(Duration::from_millis(500)) => {
                if st.the_he_nguon() != the_he {
                    tracing::info!("đổi nguồn: tắt cầu nối TikTok");
                    let _ = con.kill().await;
                    return None;
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg(kind: SourceKind, url: &str) -> SourceCfg {
        SourceCfg {
            kind,
            url: url.into(),
            channel: "kenh".into(),
            nhip: 900,
        }
    }

    #[test]
    fn chi_tu_bat_khi_la_cau_noi_mac_dinh() {
        let mac_dinh = bridge_url_mac_dinh();
        assert_eq!(quyet_dinh(&cfg(SourceKind::Bridge, &mac_dinh), false), QuyetDinh::BatMoi);
        assert_eq!(
            quyet_dinh(&cfg(SourceKind::Bridge, &mac_dinh), true),
            QuyetDinh::DungLai,
            "đã có cầu nối sống thì dùng lại, không bật thêm"
        );
        assert_eq!(
            quyet_dinh(&cfg(SourceKind::Bridge, "ws://127.0.0.1:9999/ws/live"), false),
            QuyetDinh::KhongBat,
            "người dùng trỏ sang cầu nối riêng thì backend không bật gì"
        );
        for k in [SourceKind::Tat, SourceKind::Mau, SourceKind::Webview] {
            assert_eq!(quyet_dinh(&cfg(k, &mac_dinh), false), QuyetDinh::KhongBat);
        }
    }

    #[test]
    fn kiem_phien_ban_node() {
        assert!(kiem_node(Some("v24.19.0\n")).is_ok());
        assert!(kiem_node(Some("v23.6.0")).is_ok());
        assert!(kiem_node(Some("v30.0.1")).is_ok());
        let cu = kiem_node(Some("v22.11.0")).unwrap_err();
        assert!(cu.contains("23.6") && cu.contains("v22.11.0"), "{cu}");
        assert!(kiem_node(Some("v23.5.9")).is_err());
        assert_eq!(kiem_node(None).unwrap_err(), LOI_THIEU_NODE, "không có node");
        assert!(kiem_node(Some("rác")).is_err());
    }

    #[test]
    fn nhan_ra_cau_noi_dang_song() {
        let song = "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\n\r\n{\"ten\":\"cau-noi\",\"channels\":[]}";
        assert!(la_cau_noi_song(song));
        // Bản D:\Live cũng trả `channels`.
        assert!(la_cau_noi_song("HTTP/1.1 200 OK\r\n\r\n{\"mock\":false,\"channels\":[]}"));
        assert!(!la_cau_noi_song("HTTP/1.1 404 Not Found\r\n\r\n{\"channels\":[]}"));
        assert!(!la_cau_noi_song("HTTP/1.1 200 OK\r\n\r\n<html>chương trình khác</html>"));
        assert!(!la_cau_noi_song(""));
    }

    #[test]
    fn thieu_ma_hay_thu_vien_thi_noi_ro() {
        let d = tempfile::tempdir().unwrap();
        assert!(kiem_ma_nguon(d.path()).unwrap_err().contains("Thiếu mã cầu nối"));

        let src = d.path().join("backend").join("cau-noi").join("src");
        std::fs::create_dir_all(&src).unwrap();
        std::fs::write(src.join("server.ts"), "").unwrap();
        assert!(kiem_ma_nguon(d.path()).unwrap_err().contains("npm install"));

        let tv = d.path().join("node_modules").join("tiktok-live-connector");
        std::fs::create_dir_all(&tv).unwrap();
        std::fs::write(tv.join("package.json"), "{}").unwrap();
        assert_eq!(kiem_ma_nguon(d.path()).unwrap(), d.path().join("backend").join("cau-noi"));
    }

    #[test]
    fn loi_khi_cau_noi_thoat() {
        assert!(loi_khi_thoat(Some(MA_CONG_BAN)).contains("8787"));
        assert!(loi_khi_thoat(Some(1)).contains("bật lại"));
        assert!(loi_khi_thoat(None).contains("bật lại"));
    }
}
