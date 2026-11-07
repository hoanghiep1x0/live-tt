//! AI qua công cụ dòng lệnh đã đăng nhập tài khoản — Codex (tài khoản ChatGPT)
//! và Claude Code (tài khoản Claude) — thay cho API tính tiền theo token.
//!
//! Hai công cụ đều có chế độ chạy không giao diện cho script gọi (`codex exec`,
//! `claude -p`). Bước này mới có phần dò: máy có cài không, đã đăng nhập chưa —
//! cho ô "AI viết truyện & dẫn chuyện" của module Kể chuyện hiện đúng trạng
//! thái. Phần gọi thật (thay cho API) sẽ đấu nối sau; tới lúc đó mọi việc vẫn
//! đi qua API như cũ.

use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use axum::Json;
use serde::Serialize;
use serde_json::Value;

/// Trạng thái một công cụ.
#[derive(Clone, Debug, Default, Serialize, PartialEq)]
pub struct TrangThai {
    /// Máy có cài.
    pub co: bool,
    /// Đã đăng nhập bằng TÀI KHOẢN (không phải khoá API).
    #[serde(rename = "dangNhap")]
    pub dang_nhap: bool,
    /// Một dòng giải thích cho người vận hành.
    #[serde(rename = "chiTiet")]
    pub chi_tiet: String,
    /// Câu lệnh mở công cụ trên máy này (hộp "Hướng dẫn" của bảng xem).
    pub lenh: String,
}

#[derive(Clone, Debug, Default, Serialize, PartialEq)]
pub struct TrangThaiCli {
    pub codex: TrangThai,
    pub claude: TrangThai,
}

/// Lệnh chạy một công cụ cài qua npm. Windows: phải qua `cmd /C` vì npm cài
/// `codex.cmd`, không phải `.exe`.
fn lenh(ten: &str) -> Command {
    if cfg!(windows) {
        let mut c = Command::new("cmd");
        c.args(["/C", ten]);
        c
    } else {
        Command::new(ten)
    }
}

/// Chạy lệnh, lấy stdout + stderr. Lỗi chạy thì `None`.
fn chay(mut c: Command) -> Option<String> {
    let ra = c.stdin(Stdio::null()).output().ok()?;
    let mut s = String::from_utf8_lossy(&ra.stdout).to_string();
    s.push_str(&String::from_utf8_lossy(&ra.stderr));
    Some(s)
}

/// Đọc `codex login status`. Hàm thuần.
pub fn doc_codex(ra: Option<&str>) -> TrangThai {
    let Some(ra) = ra else {
        return TrangThai { chi_tiet: "Chưa cài Codex (npm i -g @openai/codex)".into(), ..Default::default() };
    };
    let t = ra.to_lowercase();
    if t.contains("not recognized") || t.contains("not found") || t.contains("không được nhận") {
        return TrangThai { chi_tiet: "Chưa cài Codex (npm i -g @openai/codex)".into(), ..Default::default() };
    }
    if t.contains("logged in using chatgpt") {
        return TrangThai { co: true, dang_nhap: true, chi_tiet: "Đã đăng nhập tài khoản ChatGPT".into(), ..Default::default() };
    }
    if t.contains("logged in") {
        return TrangThai { co: true, dang_nhap: false, chi_tiet: "Đang dùng khoá API, chưa phải tài khoản ChatGPT".into(), ..Default::default() };
    }
    TrangThai { co: true, dang_nhap: false, chi_tiet: "Chưa đăng nhập — chạy: codex login".into(), ..Default::default() }
}

/// Đọc `claude auth status` (JSON). Hàm thuần.
pub fn doc_claude(ra: Option<&str>) -> TrangThai {
    let Some(ra) = ra else {
        return TrangThai { chi_tiet: "Chưa tìm thấy Claude Code".into(), ..Default::default() };
    };
    let v: Value = ra.find('{').and_then(|i| serde_json::from_str(&ra[i..]).ok()).unwrap_or(Value::Null);
    let vao = v.get("loggedIn").and_then(Value::as_bool) == Some(true);
    let cach = v.get("authMethod").and_then(Value::as_str).unwrap_or_default();
    match (vao, cach) {
        (true, "api_key") => TrangThai {
            co: true,
            dang_nhap: false,
            chi_tiet: "Đang dùng khoá API, chưa phải tài khoản Claude — chạy claude rồi gõ /login".into(),
            ..Default::default()
        },
        (true, _) => TrangThai { co: true, dang_nhap: true, chi_tiet: "Đã đăng nhập tài khoản Claude".into(), ..Default::default() },
        _ => TrangThai { co: true, dang_nhap: false, chi_tiet: "Chưa đăng nhập — chạy claude rồi gõ /login".into(), ..Default::default() },
    }
}

/// Tìm file chạy Claude Code: trên PATH, không thì bản đi kèm app Claude
/// desktop (`%LOCALAPPDATA%\Claude-Data\…\claude-code\<bản>\…\claude.exe`,
/// lấy bản mới nhất).
pub fn tim_claude() -> Option<PathBuf> {
    if chay({
        let mut c = lenh("claude");
        c.arg("--version");
        c
    })
    .is_some_and(|s| s.contains("Claude Code"))
    {
        return Some(PathBuf::from("claude"));
    }
    let goc = PathBuf::from(std::env::var_os("LOCALAPPDATA")?).join("Claude-Data");
    let mut thay: Vec<(std::time::SystemTime, PathBuf)> = Vec::new();
    for app in std::fs::read_dir(goc).ok()?.flatten() {
        let Ok(ban) = std::fs::read_dir(app.path().join("claude-code")) else { continue };
        for b in ban.flatten() {
            for con in std::fs::read_dir(b.path()).into_iter().flatten().flatten() {
                let exe = con.path().join("claude.exe");
                if let Ok(md) = exe.metadata() {
                    thay.push((md.modified().unwrap_or(std::time::UNIX_EPOCH), exe));
                }
            }
        }
    }
    thay.sort_by_key(|x| x.0);
    thay.pop().map(|x| x.1)
}

/// Bỏ các biến `ANTHROPIC_*` / `CLAUDE_*` của tiến trình cha (vd app đang
/// được mở từ một phiên Claude Code, hay có khoá API trong môi trường): Claude
/// Code phải chạy bằng đăng nhập TÀI KHOẢN đã lưu trên máy, không mượn quyền
/// của ai khác.
pub fn bo_bien_phien(c: &mut Command) {
    for (k, _) in std::env::vars_os() {
        let k = k.to_string_lossy().to_string();
        if k.starts_with("ANTHROPIC_") || k.starts_with("CLAUDE") {
            c.env_remove(k);
        }
    }
}

fn do_trang_thai() -> TrangThaiCli {
    let mut codex = doc_codex(
        chay({
            let mut c = lenh("codex");
            c.args(["login", "status"]);
            c
        })
        .as_deref(),
    );
    codex.lenh = "codex".into();
    let claude = match tim_claude() {
        None => doc_claude(None),
        Some(p) => {
            let mut c = if p == PathBuf::from("claude") { lenh("claude") } else { Command::new(&p) };
            c.args(["auth", "status"]);
            bo_bien_phien(&mut c);
            let mut t = doc_claude(chay(c).as_deref());
            t.lenh = if p == PathBuf::from("claude") { "claude".into() } else { format!("& \"{}\"", p.display()) };
            t
        }
    };
    TrangThaiCli { codex, claude }
}

/// Dò mất vài giây: giữ kết quả 30 giây.
static DEM: Mutex<Option<(Instant, TrangThaiCli)>> = Mutex::new(None);
const GIU: Duration = Duration::from_secs(30);

/// `moi`: bỏ kết quả đã giữ, dò lại ngay (nút "Kiểm tra").
pub fn trang_thai(moi: bool) -> TrangThaiCli {
    if let Some((luc, t)) = DEM.lock().unwrap_or_else(|e| e.into_inner()).as_ref() {
        if !moi && luc.elapsed() < GIU {
            return t.clone();
        }
    }
    let t = do_trang_thai();
    *DEM.lock().unwrap_or_else(|e| e.into_inner()) = Some((Instant::now(), t.clone()));
    t
}

/// Lệnh đăng nhập TÀI KHOẢN của một công cụ (chương trình + tham số). Claude:
/// `auth login --claudeai` — gói Claude, không phải Anthropic Console / khoá
/// API. Codex: `codex login` (tài khoản ChatGPT). `None`: công cụ lạ, hay máy
/// chưa cài Claude Code.
pub fn lenh_dang_nhap(cong: &str, claude: Option<PathBuf>) -> Option<Vec<String>> {
    match cong {
        "codex" => Some(vec!["codex".into(), "login".into()]),
        "claude" => {
            let p = claude?;
            Some(vec![p.display().to_string(), "auth".into(), "login".into(), "--claudeai".into()])
        }
        _ => None,
    }
}

// ---- Phiên đăng nhập chạy nền ----
//
// Lệnh đăng nhập chạy NGAY TRONG máy chủ của app (không mở cửa sổ dòng lệnh
// riêng): bảng xem hiện lời nó in ra và có ô dán mã. Phiên nằm ở máy chủ nên
// đóng hộp, tải lại trang (F5) vẫn còn — mở lại là thấy đúng chỗ đang dở.
// Mỗi lúc một phiên; quá `PHIEN_TOI_DA` thì tự dừng.

const PHIEN_TOI_DA: Duration = Duration::from_secs(600);
/// Giữ chừng này ký tự cuối của lời công cụ in ra.
const RA_TOI_DA: usize = 12_000;

struct PhienDangNhap {
    cong: String,
    con: std::process::Child,
    vao: Option<std::process::ChildStdin>,
    ra: std::sync::Arc<Mutex<String>>,
    luc: Instant,
    ma: Option<i32>,
}

static PHIEN: Mutex<Option<PhienDangNhap>> = Mutex::new(None);

/// Trạng thái phiên cho bảng xem.
#[derive(Clone, Debug, Default, Serialize, PartialEq)]
pub struct XemPhien {
    /// Công cụ của phiên ("claude" / "codex"), rỗng là chưa có phiên nào.
    pub cong: String,
    /// Còn đang chạy (chờ đăng nhập / chờ dán mã).
    pub chay: bool,
    /// Lời công cụ in ra (đã bỏ mã màu).
    pub ra: String,
    /// Mã thoát khi đã xong (0 là xong êm).
    pub ma: Option<i32>,
    /// Link đăng nhập công cụ in ra — để có nút mở nếu trình duyệt không tự mở.
    pub link: String,
}

/// Bỏ mã màu / điều khiển của terminal (`ESC[…m`). Hàm thuần.
pub fn bo_ma_mau(s: &str) -> String {
    let mut ra = String::with_capacity(s.len());
    let mut it = s.chars().peekable();
    while let Some(c) = it.next() {
        if c == '\u{1b}' {
            if it.peek() == Some(&'[') {
                it.next();
                for d in it.by_ref() {
                    if d.is_ascii_alphabetic() {
                        break;
                    }
                }
            }
            continue;
        }
        if c == '\r' {
            continue;
        }
        ra.push(c);
    }
    ra
}

/// Link https đầu tiên trong lời in ra. Hàm thuần.
pub fn link_dau(s: &str) -> String {
    s.split_whitespace().find(|w| w.starts_with("https://")).unwrap_or_default().to_string()
}

fn doc_vao(nguon: impl std::io::Read + Send + 'static, ra: std::sync::Arc<Mutex<String>>) {
    std::thread::spawn(move || {
        let mut nguon = nguon;
        let mut buf = [0u8; 4096];
        while let Ok(n) = nguon.read(&mut buf) {
            if n == 0 {
                break;
            }
            let mut r = ra.lock().unwrap_or_else(|e| e.into_inner());
            r.push_str(&bo_ma_mau(&String::from_utf8_lossy(&buf[..n])));
            if r.chars().count() > RA_TOI_DA {
                let bo = r.chars().count() - RA_TOI_DA;
                *r = r.chars().skip(bo).collect();
            }
        }
    });
}

fn xem_phien(p: &mut Option<PhienDangNhap>) -> XemPhien {
    let Some(ph) = p.as_mut() else { return XemPhien::default() };
    if ph.ma.is_none() {
        match ph.con.try_wait() {
            Ok(Some(st)) => {
                ph.ma = Some(st.code().unwrap_or(-1));
                ph.vao = None;
                // Đăng nhập vừa xong: lần dò kế phải thấy ngay.
                *DEM.lock().unwrap_or_else(|e| e.into_inner()) = None;
            }
            Ok(None) if ph.luc.elapsed() > PHIEN_TOI_DA => {
                let _ = ph.con.kill();
                ph.ma = Some(-1);
                ph.vao = None;
                ph.ra.lock().unwrap_or_else(|e| e.into_inner()).push_str("\n(Quá 10 phút — đã dừng. Bấm bắt đầu lại.)");
            }
            _ => {}
        }
    }
    let ra = ph.ra.lock().unwrap_or_else(|e| e.into_inner()).clone();
    XemPhien { cong: ph.cong.clone(), chay: ph.ma.is_none(), link: link_dau(&ra), ra, ma: ph.ma }
}

fn bat_phien(cong: &str) -> Result<XemPhien, String> {
    let claude = if cong == "claude" { tim_claude() } else { None };
    let ds = lenh_dang_nhap(cong, claude).ok_or_else(|| {
        if cong == "claude" { "máy chưa cài Claude Code".to_string() } else { format!("không có công cụ \"{cong}\"") }
    })?;
    let mut khoa = PHIEN.lock().unwrap_or_else(|e| e.into_inner());
    // Đang chạy đúng công cụ này: giữ phiên, không mở thêm.
    if let Some(ph) = khoa.as_mut() {
        if ph.cong == cong && ph.ma.is_none() && ph.con.try_wait().ok().flatten().is_none() {
            return Ok(xem_phien(&mut khoa));
        }
        let _ = ph.con.kill();
    }
    // `codex` cài qua npm là `codex.cmd`: phải qua `cmd /C`.
    let mut c = if ds[0] == "codex" { lenh("codex") } else { Command::new(&ds[0]) };
    c.args(&ds[1..]);
    bo_bien_phien(&mut c);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // Không bật cửa sổ console: lời in ra hiện trong bảng xem.
        c.creation_flags(0x0800_0000);
    }
    c.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut con = c.spawn().map_err(|e| format!("không chạy được lệnh đăng nhập: {e}"))?;
    let ra = std::sync::Arc::new(Mutex::new(String::new()));
    if let Some(o) = con.stdout.take() {
        doc_vao(o, ra.clone());
    }
    if let Some(o) = con.stderr.take() {
        doc_vao(o, ra.clone());
    }
    let vao = con.stdin.take();
    *khoa = Some(PhienDangNhap { cong: cong.to_string(), con, vao, ra, luc: Instant::now(), ma: None });
    Ok(xem_phien(&mut khoa))
}

fn tra<T: Serialize>(kq: Result<T, String>) -> axum::response::Response {
    use axum::http::StatusCode;
    use axum::response::IntoResponse;
    match kq {
        Ok(v) => Json(v).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": e }))).into_response(),
    }
}

/// `POST /s/ai-cli/dang-nhap/:cong` — bắt đầu (hay giữ) phiên đăng nhập chạy nền.
/// Lệnh cố định trong mã, chỉ chọn giữa hai công cụ: không chạy được gì khác.
pub async fn post_dang_nhap(axum::extract::Path(cong): axum::extract::Path<String>) -> axum::response::Response {
    tra(tokio::task::spawn_blocking(move || bat_phien(&cong)).await.unwrap_or_else(|e| Err(e.to_string())))
}

/// `GET /s/ai-cli/dang-nhap` — phiên đăng nhập hiện tại (nếu có).
pub async fn get_dang_nhap() -> Json<XemPhien> {
    Json(xem_phien(&mut PHIEN.lock().unwrap_or_else(|e| e.into_inner())))
}

#[derive(serde::Deserialize)]
pub struct NhapVao {
    pub chu: String,
}

/// `POST /s/ai-cli/dang-nhap/nhap` — gửi một dòng (mã đăng nhập dán vào) cho
/// công cụ đang chờ.
pub async fn post_nhap(Json(n): Json<NhapVao>) -> axum::response::Response {
    use std::io::Write;
    let mut khoa = PHIEN.lock().unwrap_or_else(|e| e.into_inner());
    let kq = match khoa.as_mut().and_then(|p| p.vao.as_mut()) {
        None => Err("không có phiên đăng nhập nào đang chờ".to_string()),
        Some(v) => {
            let chu: String = n.chu.trim().chars().filter(|c| !c.is_control()).take(2_000).collect();
            writeln!(v, "{chu}").and_then(|()| v.flush()).map_err(|e| format!("không gửi được: {e}"))
        }
    };
    let kq = kq.map(|()| xem_phien(&mut khoa));
    tra(kq)
}

/// `POST /s/ai-cli/dang-nhap/dung` — dừng phiên đang chạy.
pub async fn post_dung() -> Json<XemPhien> {
    let mut khoa = PHIEN.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(p) = khoa.as_mut() {
        if p.ma.is_none() {
            let _ = p.con.kill();
            let _ = p.con.wait();
            p.ma = Some(-1);
            p.vao = None;
        }
    }
    Json(xem_phien(&mut khoa))
}

#[derive(serde::Deserialize, Default)]
pub struct HoiTrangThai {
    #[serde(default)]
    pub moi: Option<u8>,
}

/// `GET /s/ai-cli[?moi=1]` — Codex, Claude Code đã cài và đăng nhập chưa.
pub async fn get_trang_thai(axum::extract::Query(h): axum::extract::Query<HoiTrangThai>) -> Json<TrangThaiCli> {
    let moi = h.moi == Some(1);
    Json(tokio::task::spawn_blocking(move || trang_thai(moi)).await.unwrap_or_default())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loi_in_ra_bo_ma_mau_va_tim_link() {
        assert_eq!(bo_ma_mau("\u{1b}[32mXong\u{1b}[0m\r\n"), "Xong\n");
        assert_eq!(link_dau("visit: https://claude.com/x?a=1 now"), "https://claude.com/x?a=1");
        assert_eq!(link_dau("không có link"), "");
    }

    #[test]
    fn lenh_dang_nhap_co_dinh_va_dung_tai_khoan() {
        assert_eq!(lenh_dang_nhap("codex", None), Some(vec!["codex".to_string(), "login".to_string()]));
        let c = lenh_dang_nhap("claude", Some(PathBuf::from("C:/x/claude.exe"))).expect("có lệnh");
        assert_eq!(&c[1..], ["auth", "login", "--claudeai"]);
        assert_eq!(lenh_dang_nhap("claude", None), None, "chưa cài thì không có lệnh");
        assert_eq!(lenh_dang_nhap("rm -rf", None), None, "chỉ hai công cụ");
    }

    #[test]
    fn doc_trang_thai_codex() {
        assert!(doc_codex(Some("Logged in using ChatGPT")).dang_nhap);
        let k = doc_codex(Some("Logged in using an API key"));
        assert!(k.co && !k.dang_nhap);
        assert!(!doc_codex(Some("Not logged in")).dang_nhap);
        assert!(!doc_codex(Some("'codex' is not recognized as an internal or external command")).co);
        assert!(!doc_codex(None).co);
    }

    #[test]
    fn doc_trang_thai_claude() {
        assert!(doc_claude(Some(r#"{"loggedIn": true, "authMethod": "claude.ai"}"#)).dang_nhap);
        let k = doc_claude(Some(r#"{"loggedIn": true, "authMethod": "api_key"}"#));
        assert!(k.co && !k.dang_nhap, "khoá API không phải tài khoản");
        assert!(!doc_claude(Some(r#"{"loggedIn": false}"#)).dang_nhap);
        assert!(!doc_claude(None).co);
    }
}
