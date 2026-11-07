//! Gọi AI qua Claude Code (tài khoản Claude) thay cho API tính tiền theo token.
//!
//! - Chạy `claude -p --output-format json`, lời dặn qua `--system-prompt-file`,
//!   lời nhắn qua stdin; tắt mọi công cụ, không nạp cài đặt / CLAUDE.md của máy
//!   (`--tools "" --strict-mcp-config --setting-sources ""`), chạy ở thư mục riêng
//!   ngoài dự án — MC chỉ là MC, không phải trợ lý lập trình.
//! - MC dẫn truyện: MỖI TRUYỆN MỘT SESSION. Trong một truyện, các lượt nối tiếp
//!   bằng `--resume` (AI nhớ mình đã kể gì, đã chào ai); sang truyện mới là mở
//!   session mới — ngữ cảnh không phình mãi, đỡ tốn hạn mức. Lời dặn chỉ gửi ở
//!   lượt đầu của session (Claude Code ghi lại và dùng lại cho các lượt sau).
//! - Viết truyện mới: mỗi lần một session riêng, không lưu.
//! - Lịch sử gửi / nhận giữ trong bộ nhớ (`LICH_SU`) cho bảng xem đọc lại.

use std::collections::{HashMap, VecDeque};
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use axum::Json;
use serde::Serialize;
use serde_json::Value;

use crate::ai::TraLoi;

/// Một lượt CLI chạy lâu hơn chừng này là hỏng: dừng, để lượt dự phòng lo.
const CHO_TOI_DA: Duration = Duration::from_secs(120);
/// Giữ chừng này lượt gần nhất trong lịch sử.
const LICH_SU_TOI_DA: usize = 80;
/// Cắt chữ lưu trong lịch sử cho nhẹ.
const CHU_TOI_DA: usize = 24_000;

/// Công cụ chạy một việc: Claude Code hay Codex.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cong {
    Claude,
    Codex,
}

/// Model cho phép (bí danh của Claude Code). Lạ thì về `sonnet` — không bao
/// giờ tự lên model đắt nhất.
pub fn model_cli(m: &str) -> &'static str {
    match m.trim() {
        "haiku" => "haiku",
        "opus" => "opus",
        _ => "sonnet",
    }
}

/// Mức suy luận của Codex: thấp cho việc chạy liên tục (rẻ, nhanh). Lạ thì
/// "low". Hàm thuần.
pub fn muc_codex(m: &str) -> &'static str {
    match m.trim() {
        "medium" => "medium",
        "high" => "high",
        _ => "low",
    }
}

/// Thư mục chạy CLI: riêng, ngoài dự án — session của Claude Code gắn với thư
/// mục, nên `--resume` phải chạy đúng chỗ này.
fn thu_muc() -> PathBuf {
    let d = std::env::temp_dir().join("live-studio-mc");
    let _ = std::fs::create_dir_all(&d);
    d
}

/// Một lượt trong lịch sử CLI.
#[derive(Clone, Debug, Serialize)]
pub struct MucCli {
    /// Lúc gửi (ms).
    pub luc: i64,
    pub phong: String,
    /// "mc" (MC dẫn truyện) hay "viet" (tìm truyện kế tiếp).
    pub viec: String,
    /// "claude" hay "codex".
    pub cong: String,
    pub model: String,
    /// Session của Claude Code.
    pub phien: String,
    /// Lượt mở session mới (có gửi lời dặn).
    #[serde(rename = "phienMoi")]
    pub phien_moi: bool,
    /// Truyện của session (MC).
    pub truyen: String,
    /// Lời dặn — chỉ có ở lượt mở session.
    pub dan: String,
    pub gui: String,
    pub nhan: String,
    pub ms: u64,
    #[serde(rename = "tokVao")]
    pub tok_vao: u64,
    #[serde(rename = "tokRa")]
    pub tok_ra: u64,
    #[serde(rename = "cacheDoc")]
    pub cache_doc: u64,
    #[serde(rename = "cacheGhi")]
    pub cache_ghi: u64,
    pub loi: String,
}

static LICH_SU: Mutex<VecDeque<MucCli>> = Mutex::new(VecDeque::new());
/// Session MC đang dùng của mỗi phòng: (truyện, session id).
static PHIEN_MC: Mutex<Option<HashMap<String, (String, String)>>> = Mutex::new(None);

fn cat(s: &str) -> String {
    s.chars().take(CHU_TOI_DA).collect()
}

fn ghi(m: MucCli) {
    let mut ls = LICH_SU.lock().unwrap_or_else(|e| e.into_inner());
    ls.push_back(m);
    while ls.len() > LICH_SU_TOI_DA {
        ls.pop_front();
    }
}

/// Kết quả một lần chạy `claude -p`.
#[derive(Debug, Default, PartialEq)]
pub struct KetQua {
    pub chu: String,
    pub phien: String,
    pub dung: crate::chi_phi::Dung,
    pub loi: bool,
}

/// Đọc JSON `claude -p --output-format json`. Hàm thuần.
pub fn doc_ket_qua(than: &str) -> Option<KetQua> {
    // Có bản in vài dòng trước JSON: lấy dòng JSON cuối cùng.
    let v: Value = than
        .lines()
        .rev()
        .find_map(|l| serde_json::from_str::<Value>(l.trim()).ok().filter(Value::is_object))
        .or_else(|| serde_json::from_str(than.trim()).ok())?;
    let u = v.get("usage").cloned().unwrap_or(Value::Null);
    let so = |k: &str| u.get(k).and_then(Value::as_u64).unwrap_or(0);
    Some(KetQua {
        chu: v.get("result").and_then(Value::as_str).unwrap_or_default().to_string(),
        phien: v.get("session_id").and_then(Value::as_str).unwrap_or_default().to_string(),
        dung: crate::chi_phi::Dung {
            tok_vao: so("input_tokens"),
            tok_ra: so("output_tokens"),
            cache_doc: so("cache_read_input_tokens"),
            cache_ghi: so("cache_creation_input_tokens"),
            ..crate::chi_phi::Dung::default()
        },
        loi: v.get("is_error").and_then(Value::as_bool) == Some(true),
    })
}

/// Đọc JSONL của `codex exec --json`: lời cuối của agent, id luồng, token.
/// Hàm thuần.
pub fn doc_codex_json(than: &str) -> Option<KetQua> {
    let mut k = KetQua::default();
    let mut co = false;
    for l in than.lines() {
        let Ok(v) = serde_json::from_str::<Value>(l.trim()) else { continue };
        match v.get("type").and_then(Value::as_str) {
            Some("thread.started") => {
                k.phien = v.get("thread_id").and_then(Value::as_str).unwrap_or_default().to_string();
            }
            Some("item.completed") => {
                let it = v.get("item").cloned().unwrap_or(Value::Null);
                if it.get("type").and_then(Value::as_str) == Some("agent_message") {
                    k.chu = it.get("text").and_then(Value::as_str).unwrap_or_default().to_string();
                    co = true;
                }
            }
            Some("turn.completed") => {
                let u = v.get("usage").cloned().unwrap_or(Value::Null);
                let so = |x: &str| u.get(x).and_then(Value::as_u64).unwrap_or(0);
                k.dung = crate::chi_phi::Dung {
                    tok_vao: so("input_tokens"),
                    tok_ra: so("output_tokens"),
                    cache_doc: so("cached_input_tokens"),
                    cache_ghi: so("cache_write_input_tokens"),
                    ..crate::chi_phi::Dung::default()
                };
            }
            // Lỗi của cả lượt (model không dùng được, hết hạn mức…).
            Some("error") | Some("turn.failed") => {
                k.loi = true;
                let m = v
                    .get("message")
                    .and_then(Value::as_str)
                    .or_else(|| v.pointer("/error/message").and_then(Value::as_str))
                    .unwrap_or("Codex lỗi");
                k.chu = m.to_string();
                co = true;
            }
            _ => {}
        }
    }
    co.then_some(k)
}

/// Chạy `codex exec` một lần. `dan` ghép vào đầu lời nhắn: Codex không có ô
/// lời dặn riêng cho lượt chạy không giao diện.
fn chay_codex(dan: Option<&str>, loi: &str, model: &str, muc: &str, resume: Option<&str>) -> Result<KetQua, String> {
    let dir = thu_muc();
    let mut c = if cfg!(windows) {
        let mut c = Command::new("cmd");
        c.args(["/C", "codex"]);
        c
    } else {
        Command::new("codex")
    };
    c.current_dir(&dir).arg("exec");
    // `codex exec resume` KHÔNG nhận `-s` / `-C` (chạy lại đúng thư mục của
    // phiên cũ), chỉ `codex exec` mới có. Truyền thừa là Codex bỏ cả lượt.
    match resume {
        Some(r) => c.args(["resume", "--json", "--skip-git-repo-check"]).arg(r),
        None => c.args(["--json", "--skip-git-repo-check", "-s", "read-only", "-C", "."]),
    };
    c.arg("-c").arg(format!("model_reasoning_effort=\"{muc}\""));
    if !model.trim().is_empty() {
        c.args(["-m", model.trim()]);
    }
    // Lời nhắn qua stdin (`-`): lời dặn ghép lên đầu.
    c.arg("-");
    crate::ai_cli::bo_bien_phien(&mut c);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        c.creation_flags(0x0800_0000);
    }
    c.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut con = c.spawn().map_err(|e| format!("không chạy được Codex: {e}"))?;
    if let Some(mut vao) = con.stdin.take() {
        let cho = match dan {
            Some(d) => format!("{d}\n\n---\n\n{loi}"),
            None => loi.to_string(),
        };
        let _ = vao.write_all(cho.as_bytes());
    }
    let ra = doi(con)?;
    let out = String::from_utf8_lossy(&ra.stdout).to_string();
    match doc_codex_json(&out) {
        Some(k) if !k.loi && !k.chu.trim().is_empty() => Ok(k),
        Some(k) => Err(format!("Codex báo lỗi: {}", k.chu.chars().take(300).collect::<String>())),
        None => {
            let err = String::from_utf8_lossy(&ra.stderr);
            let dau: String = format!("{out}{err}").chars().take(300).collect();
            Err(format!("Codex trả không đọc được: {dau}"))
        }
    }
}

/// Đợi tiến trình xong, có hạn: CLI treo thì dừng, đừng để MC đứng mãi.
fn doi(con: std::process::Child) -> Result<std::process::Output, String> {
    let (gui, nhan) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let _ = gui.send(con.wait_with_output());
    });
    match nhan.recv_timeout(CHO_TOI_DA) {
        Ok(r) => r.map_err(|e| format!("công cụ lỗi: {e}")),
        Err(_) => Err(format!("công cụ không trả lời sau {} giây", CHO_TOI_DA.as_secs())),
    }
}

/// Chạy `claude -p` một lần. `dan`: lời dặn (chỉ khi mở session mới).
/// `resume`: session để nối tiếp. `luu`: có lưu session không.
fn chay(dan: Option<&str>, loi: &str, model: &str, resume: Option<&str>, luu: bool, ten_dan: &str) -> Result<KetQua, String> {
    let exe = exe().ok_or("máy chưa cài Claude Code")?;
    let dir = thu_muc();
    let mut c = if exe == PathBuf::from("claude") {
        let mut c = Command::new("cmd");
        c.args(["/C", "claude"]);
        c
    } else {
        Command::new(&exe)
    };
    c.current_dir(&dir).args([
        "-p",
        "--output-format",
        "json",
        "--tools",
        "",
        "--strict-mcp-config",
        "--setting-sources",
        "",
        "--model",
        model,
    ]);
    if let Some(d) = dan {
        let f = dir.join(format!("dan-{ten_dan}.txt"));
        std::fs::write(&f, d).map_err(|e| format!("không ghi được lời dặn: {e}"))?;
        c.arg("--system-prompt-file").arg(&f);
    }
    if let Some(r) = resume {
        c.args(["--resume", r]);
    }
    if !luu {
        c.arg("--no-session-persistence");
    }
    crate::ai_cli::bo_bien_phien(&mut c);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        c.creation_flags(0x0800_0000);
    }
    c.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut con = c.spawn().map_err(|e| format!("không chạy được Claude Code: {e}"))?;
    if let Some(mut vao) = con.stdin.take() {
        let _ = vao.write_all(loi.as_bytes());
    }
    let ra = doi(con)?;
    let out = String::from_utf8_lossy(&ra.stdout).to_string();
    match doc_ket_qua(&out) {
        Some(k) if !k.loi && !k.chu.trim().is_empty() => Ok(k),
        Some(k) => Err(format!("Claude Code báo lỗi: {}", k.chu.chars().take(300).collect::<String>())),
        None => {
            let err = String::from_utf8_lossy(&ra.stderr);
            let dau: String = format!("{out}{err}").chars().take(300).collect();
            Err(format!("Claude Code trả không đọc được: {dau}"))
        }
    }
}

/// Một lượt MC dẫn truyện. `truyen`: truyện đang kể — đổi truyện là mở session
/// mới (lời dặn gửi lại ở lượt đầu); cùng truyện thì nối tiếp session cũ.
pub(crate) fn goi_mc(cong: Cong, phong: &str, truyen: &str, dan: &str, loi: &str, model: &str, muc: &str) -> Result<TraLoi, String> {
    let claude = cong == Cong::Claude;
    let model = if claude { model_cli(model).to_string() } else { model.trim().to_string() };
    let muc = muc_codex(muc);
    let cu = PHIEN_MC
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .get_or_insert_with(HashMap::new)
        .get(phong)
        .filter(|(t, _)| t == truyen)
        .map(|(_, p)| p.clone());
    let t0 = Instant::now();
    let mut moi = cu.is_none();
    let mot = |dan: Option<&str>, resume: Option<&str>| {
        if claude {
            chay(dan, loi, &model, resume, true, phong)
        } else {
            chay_codex(dan, loi, &model, muc, resume)
        }
    };
    let mut kq = mot(if moi { Some(dan) } else { None }, cu.as_deref());
    // Session cũ hỏng / mất (vd đã dọn): mở session mới, gửi lại lời dặn.
    if kq.is_err() && !moi {
        moi = true;
        kq = mot(Some(dan), None);
    }
    let ms = t0.elapsed().as_millis() as u64;
    let mut muc = MucCli {
        luc: crate::state::bay_gio_ms(),
        phong: phong.to_string(),
        viec: "mc".into(),
        cong: if claude { "claude".into() } else { "codex".into() },
        model: if model.is_empty() { format!("mặc định · {muc}") } else { model.clone() },
        phien: String::new(),
        phien_moi: moi,
        truyen: truyen.to_string(),
        dan: if moi { cat(dan) } else { String::new() },
        gui: cat(loi),
        nhan: String::new(),
        ms,
        tok_vao: 0,
        tok_ra: 0,
        cache_doc: 0,
        cache_ghi: 0,
        loi: String::new(),
    };
    match kq {
        Ok(k) => {
            if !k.phien.is_empty() {
                PHIEN_MC
                    .lock()
                    .unwrap_or_else(|e| e.into_inner())
                    .get_or_insert_with(HashMap::new)
                    .insert(phong.to_string(), (truyen.to_string(), k.phien.clone()));
            }
            muc.phien = k.phien;
            muc.nhan = cat(&k.chu);
            muc.tok_vao = k.dung.tok_vao;
            muc.tok_ra = k.dung.tok_ra;
            muc.cache_doc = k.dung.cache_doc;
            muc.cache_ghi = k.dung.cache_ghi;
            ghi(muc);
            // Tài khoản Claude: không tính tiền theo token.
            Ok(TraLoi { chu: k.chu, dung: k.dung, usd: Some(0.0) })
        }
        Err(e) => {
            muc.loi = e.clone();
            ghi(muc);
            Err(e)
        }
    }
}

/// Tìm và kể lại một truyện: một session riêng, không lưu.
pub(crate) fn goi_viet(cong: Cong, phong: &str, dan: &str, loi: &str, model: &str, muc: &str) -> Result<TraLoi, String> {
    let claude = cong == Cong::Claude;
    let model = if claude { model_cli(model).to_string() } else { model.trim().to_string() };
    let muc = muc_codex(muc);
    let t0 = Instant::now();
    let kq = if claude {
        chay(Some(dan), loi, &model, None, false, &format!("{phong}-viet"))
    } else {
        chay_codex(Some(dan), loi, &model, muc, None)
    };
    let mut muc = MucCli {
        luc: crate::state::bay_gio_ms(),
        phong: phong.to_string(),
        viec: "viet".into(),
        cong: if claude { "claude".into() } else { "codex".into() },
        model: if model.is_empty() { format!("mặc định · {muc}") } else { model.clone() },
        phien: String::new(),
        phien_moi: true,
        truyen: String::new(),
        dan: cat(dan),
        gui: cat(loi),
        nhan: String::new(),
        ms: t0.elapsed().as_millis() as u64,
        tok_vao: 0,
        tok_ra: 0,
        cache_doc: 0,
        cache_ghi: 0,
        loi: String::new(),
    };
    match kq {
        Ok(k) => {
            muc.phien = k.phien;
            muc.nhan = cat(&k.chu);
            muc.tok_vao = k.dung.tok_vao;
            muc.tok_ra = k.dung.tok_ra;
            muc.cache_doc = k.dung.cache_doc;
            muc.cache_ghi = k.dung.cache_ghi;
            ghi(muc);
            Ok(TraLoi { chu: k.chu, dung: k.dung, usd: Some(0.0) })
        }
        Err(e) => {
            muc.loi = e.clone();
            ghi(muc);
            Err(e)
        }
    }
}

/// Phòng này chạy AI qua công cụ dòng lệnh nào (`aiChu` của Kể chuyện), hay
/// `None` là qua API. Chưa đăng nhập thì lượt gọi báo lỗi rõ ràng (bảng xem
/// hiện), không lặng lẽ tiêu tiền API.
pub fn cong_cua(story: Option<&Value>) -> Option<Cong> {
    match story.and_then(|c| c.get("aiChu")).and_then(Value::as_str) {
        Some("claude") => Some(Cong::Claude),
        Some("codex") => Some(Cong::Codex),
        _ => None,
    }
}

/// Model CLI của một việc theo công cụ: Claude dùng `cliModel*`, Codex dùng
/// `codexModel*` (để trống là model mặc định của tài khoản). Hàm thuần.
pub fn model_viec(story: Option<&Value>, cong: Cong, mc: bool) -> String {
    let k = match (cong, mc) {
        (Cong::Claude, true) => "cliModel",
        (Cong::Claude, false) => "cliModelViet",
        (Cong::Codex, true) => "codexModel",
        (Cong::Codex, false) => "codexModelViet",
    };
    story.and_then(|c| c.get(k)).and_then(Value::as_str).unwrap_or_default().to_string()
}

/// Mức suy luận Codex của một việc. Hàm thuần.
pub fn muc_viec(story: Option<&Value>, mc: bool) -> String {
    let k = if mc { "codexMuc" } else { "codexMucViet" };
    story.and_then(|c| c.get(k)).and_then(Value::as_str).unwrap_or_default().to_string()
}

/// Đường dẫn Claude Code, dò một lần (dò mỗi lượt là thêm cả giây chờ).
fn exe() -> Option<PathBuf> {
    static EXE: std::sync::OnceLock<Option<PathBuf>> = std::sync::OnceLock::new();
    EXE.get_or_init(crate::ai_cli::tim_claude).clone()
}

#[derive(serde::Deserialize, Default)]
pub struct HoiLichSu {
    #[serde(default)]
    pub phong: Option<String>,
}

/// `GET /s/ai-cli/lich-su[?phong=]` — các lượt CLI gần nhất, mới trước.
pub async fn get_lich_su(axum::extract::Query(h): axum::extract::Query<HoiLichSu>) -> Json<Vec<MucCli>> {
    let ls = LICH_SU.lock().unwrap_or_else(|e| e.into_inner());
    Json(
        ls.iter()
            .rev()
            .filter(|m| h.phong.as_deref().is_none_or(|p| p == m.phong))
            .cloned()
            .collect(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn model_khong_tu_len_dat_nhat() {
        assert_eq!(model_cli("haiku"), "haiku");
        assert_eq!(model_cli("opus"), "opus");
        assert_eq!(model_cli(""), "sonnet");
        assert_eq!(model_cli("claude-opus-5"), "sonnet", "tên lạ về sonnet");
    }

    #[test]
    fn doc_codex_jsonl() {
        let than = r#"{"type":"thread.started","thread_id":"t1"}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"{\"lenh\":[]}"}}
{"type":"turn.completed","usage":{"input_tokens":16954,"cached_input_tokens":13440,"cache_write_input_tokens":0,"output_tokens":9}}"#;
        let k = doc_codex_json(than).expect("đọc được");
        assert_eq!(k.chu, "{\"lenh\":[]}");
        assert_eq!(k.phien, "t1");
        assert_eq!((k.dung.tok_vao, k.dung.tok_ra, k.dung.cache_doc), (16954, 9, 13440));
        assert!(!k.loi);
        // Model tài khoản không dùng được: lỗi rõ ràng, không coi là trả lời.
        let loi = doc_codex_json(r#"{"type":"error","message":"model không hỗ trợ"}"#).expect("có lỗi");
        assert!(loi.loi);
        assert_eq!(loi.chu, "model không hỗ trợ");
        assert!(doc_codex_json("").is_none());
        assert_eq!(muc_codex(""), "low");
        assert_eq!(muc_codex("high"), "high");
    }

    #[test]
    fn doc_ket_qua_claude_p() {
        let than = r#"{"type":"result","is_error":false,"result":"{\"lenh\":[]}","session_id":"abc","usage":{"input_tokens":4,"cache_creation_input_tokens":875,"cache_read_input_tokens":10,"output_tokens":27}}"#;
        let k = doc_ket_qua(than).expect("đọc được");
        assert_eq!(k.chu, "{\"lenh\":[]}");
        assert_eq!(k.phien, "abc");
        assert_eq!((k.dung.tok_vao, k.dung.tok_ra, k.dung.cache_doc, k.dung.cache_ghi), (4, 27, 10, 875));
        assert!(!k.loi);
        assert!(doc_ket_qua("không phải json").is_none());
        let loi = doc_ket_qua(r#"{"is_error":true,"result":"hết hạn mức"}"#).unwrap();
        assert!(loi.loi);
    }
}
