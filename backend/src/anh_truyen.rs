//! AI tự làm ảnh minh hoạ cho truyện đang kể.
//!
//! Người vận hành chỉ bật "AI tự tạo ảnh" và chọn kết nối vẽ. Còn lại chạy ở
//! đây, theo từng phòng đang mở (đang phát hoặc đang xem thử):
//!
//! 1. Truyện đổi (tên hay các đoạn) → AI kể truyện (kết nối Chat) đọc cả truyện
//!    MỘT lượt, lập hồ sơ (phong cách vẽ + ngoại hình từng nhân vật), tự quyết
//!    đoạn nào cần ảnh (tối đa 10 — đoạn cùng cảnh dùng lại ảnh trước) và tự
//!    viết lời vẽ cho từng ảnh.
//! 2. Vẽ lần lượt từng ảnh còn thiếu, mỗi ảnh xong là ghi vào cấu hình — khung
//!    chiếu đổi ngay, bảng xem thấy tiến độ.
//! 3. Vẽ đủ rồi thì dọn ảnh AI của truyện cũ khỏi đĩa.
//!
//! Nhất quán: lời vẽ của AI luôn được ghép thêm phong cách và nguyên văn hồ sơ
//! của nhân vật có mặt — AI có quên tả áo cậu bé thì mã vẫn nhắc.
//!
//! Mọi thứ ghi vào cấu hình module `story` (gộp từng ô, không đè cả cục), nên
//! phần hiện ảnh ở sân khấu không cần biết ảnh tới từ đâu.

use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde_json::{json, Value};
use tokio::time::Instant;

use crate::ai::{boc_json, cho_sau_loi, goi, model_cho, than_chat, NHA_CUNG_CAP};
use crate::media::NHA_ANH;
use crate::secrets::{self, Use};
use crate::state::AppState;

const MODULE: &str = "story";
pub const MOC_TOI_DA: usize = 10;
/// Vẽ bằng muse.ai (miễn phí): mỗi đoạn một ảnh, tối đa ngần này — khớp
/// `MOC_LUU_TOI_DA` của contracts.
pub const MOC_TOI_DA_MUSE: usize = 30;
/// Vẽ xong hết thì chờ ngần này rồi mới dọn: máy chủ chỉ xoá ảnh đã cũ hơn
/// mức an toàn của `media::la_rac`.
const DON_SAU: Duration = Duration::from_secs(16 * 60);

const DAN_ANH: &str = r#"Bạn là người kể truyện kiêm đạo diễn hình ảnh cho một phòng live kể chuyện. Đọc truyện trong <truyen> rồi lập kế hoạch ảnh minh hoạ.

Việc:
1. "phongCach": một dòng phong cách vẽ hợp truyện (chất liệu, tông màu, nét vẽ), dưới 120 ký tự. Giữ cho cả truyện.
2. "nhanVat": mọi nhân vật xuất hiện trong ảnh (người, con vật, cây có vai). Mỗi người một "ten" và "ta" ngoại hình CỐ ĐỊNH, cụ thể: tuổi, dáng, tóc, màu và kiểu quần áo, một nét riêng dễ nhận. Dưới 160 ký tự.
3. "moc": BẠN quyết định đoạn nào cần ảnh, TỐI ĐA 10 ảnh cả truyện — mỗi ảnh là một lượt vẽ tốn tiền, nên chỉ vẽ khi cảnh thật sự đổi: mở đầu, bước ngoặt, cao trào, kết. Đoạn tiếp diễn cùng cảnh, cùng người thì KHÔNG vẽ, ảnh trước hiện tiếp. Truyện ngắn hay ít đổi cảnh thì 1–3 ảnh là đủ. Ít ảnh mà đúng cảnh tốt hơn nhiều ảnh na ná nhau. Mốc đầu là đoạn 1. Mỗi mốc:
   - "tu": số đoạn (đếm từ 1)
   - "nhanVat": tên những nhân vật có mặt, đúng tên trong "nhanVat"
   - "prompt": lời vẽ hoàn chỉnh cho máy vẽ ảnh: bối cảnh, hành động, bố cục, ánh sáng, cảm xúc. Tả nhân vật đúng như hồ sơ. Khung ngang. Không có chữ trong ảnh. Dưới 600 ký tự.

Không vẽ cảnh bạo lực, người lớn hay đáng sợ với trẻ em.

Trả JSON thuần, không rào ```:
{"phongCach": "...", "nhanVat": [{"ten": "...", "ta": "..."}], "moc": [{"tu": 1, "nhanVat": ["..."], "prompt": "..."}]}"#;

/// Cắt khối truyện thành từng đoạn — đúng luật `catDoan` của module story.
pub fn cat_doan(passages: &str) -> Vec<String> {
    passages
        .lines()
        .map(|d| d.split_whitespace().collect::<Vec<_>>().join(" "))
        .filter(|d| !d.is_empty())
        .collect()
}

/// Dấu của truyện: tên + các đoạn. Đổi một chữ là lập lại hồ sơ. Hàm thuần.
pub fn dau_truyen(ten: &str, doan: &[String]) -> String {
    let mut h: u32 = 0x811c_9dc5;
    for b in ten.trim().bytes().chain(std::iter::once(0)).chain(doan.join("\n").bytes()) {
        h ^= u32::from(b);
        h = h.wrapping_mul(0x0100_0193);
    }
    format!("{h:08x}")
}

/// Kế hoạch ảnh AI trả về, đã lọc.
#[derive(Debug, Default, PartialEq)]
pub struct KeHoach {
    pub phong_cach: String,
    /// (tên, ngoại hình)
    pub nhan_vat: Vec<(String, String)>,
    /// (đoạn, nhân vật có mặt, lời vẽ)
    pub moc: Vec<(usize, Vec<String>, String)>,
}

fn chu(v: Option<&Value>, tran: usize) -> String {
    v.and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or_default()
        .chars()
        .take(tran)
        .collect()
}

/// Đọc kế hoạch: mốc ngoài truyện bỏ, trùng đoạn giữ cái đầu, xếp theo đoạn,
/// tối đa `MOC_TOI_DA`, mốc đầu kéo về đoạn 1. Hàm thuần.
pub fn doc_ke_hoach(than: &str, so_doan: usize) -> Option<KeHoach> {
    let v = boc_json(than)?;
    let nhan_vat: Vec<(String, String)> = v
        .get("nhanVat")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .map(|n| (chu(n.get("ten"), 60), chu(n.get("ta"), 240)))
        .filter(|(t, a)| !t.is_empty() && !a.is_empty())
        .take(12)
        .collect();
    let mut moc: Vec<(usize, Vec<String>, String)> = Vec::new();
    for m in v.get("moc").and_then(Value::as_array).into_iter().flatten() {
        let Some(tu) = m.get("tu").and_then(Value::as_f64).map(|x| x as usize) else { continue };
        let prompt = chu(m.get("prompt"), 900);
        if tu < 1 || tu > so_doan || prompt.is_empty() || moc.iter().any(|x| x.0 == tu) {
            continue;
        }
        let co_mat = m
            .get("nhanVat")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .map(|s| s.trim().chars().take(60).collect::<String>())
            .filter(|s| !s.is_empty())
            .take(12)
            .collect();
        moc.push((tu, co_mat, prompt));
    }
    moc.sort_by_key(|m| m.0);
    moc.truncate(MOC_TOI_DA);
    if let Some(dau) = moc.first_mut() {
        dau.0 = 1;
    }
    if moc.is_empty() {
        return None;
    }
    Some(KeHoach { phong_cach: chu(v.get("phongCach"), 300), nhan_vat, moc })
}

/// Lời gửi máy vẽ: phong cách, nguyên văn hồ sơ nhân vật có mặt, rồi lời AI
/// viết. Hồ sơ lặp lại y hệt ở mọi ảnh — đó là thứ giữ cậu bé ảnh 1 và ảnh 5
/// cùng một người. Hàm thuần.
pub fn loi_ve(phong_cach: &str, ho_so: &str, co_mat: &[String], prompt: &str) -> String {
    let ten: Vec<String> = co_mat.iter().map(|t| t.to_lowercase()).collect();
    let mut ra = String::new();
    if !phong_cach.trim().is_empty() {
        ra.push_str(&format!("Phong cách: {}.\n", phong_cach.trim()));
    }
    // Không biết ai có mặt (ảnh muse vẽ bù) thì kèm cả hồ sơ.
    let ca = ten.is_empty();
    for dong in ho_so.lines() {
        if let Some((t, a)) = dong.split_once(':') {
            if (ca || ten.contains(&t.trim().to_lowercase())) && !a.trim().is_empty() {
                ra.push_str(&format!("{}: {}.\n", t.trim(), a.trim()));
            }
        }
    }
    ra.push_str(prompt.trim());
    ra.push_str("\nTranh minh hoạ khung ngang, không có chữ trong ảnh. Nhân vật giữ đúng ngoại hình đã tả.");
    ra.chars().take(1_900).collect()
}

/// Việc kế tiếp của một phòng. Hàm thuần theo cấu hình module story.
#[derive(Debug, PartialEq)]
pub enum Viec {
    /// Truyện mới hoặc đã đổi: lập hồ sơ và chọn mốc.
    LapHoSo { dau: String },
    /// Vẽ mốc thứ `i`.
    Ve { i: usize },
    /// Đủ ảnh.
    Xong { dau: String },
}

pub fn viec_ke(cfg: &Value) -> Option<Viec> {
    if cfg.get("anhTuDong").and_then(Value::as_bool) != Some(true) {
        return None;
    }
    let doan = cat_doan(cfg.get("passages").and_then(Value::as_str).unwrap_or_default());
    if doan.is_empty() {
        return None;
    }
    let ten = cfg.get("title").and_then(Value::as_str).unwrap_or_default();
    let dau = dau_truyen(ten, &doan);
    // Truyện này đã thử vẽ mà hỏng cả muse.ai lẫn API: kể không ảnh, coi như
    // xong — để vòng ảnh còn đi tiếp sang vẽ sẵn cho truyện kế.
    if cfg.get("boAnh").and_then(Value::as_bool) == Some(true) {
        return Some(Viec::Xong { dau });
    }
    if cfg.get("hoSoCua").and_then(Value::as_str) != Some(dau.as_str()) {
        return Some(Viec::LapHoSo { dau });
    }
    let moc = cfg.get("moc").and_then(Value::as_array).cloned().unwrap_or_default();
    for (i, m) in moc.iter().enumerate() {
        let tu = m.get("tu").and_then(Value::as_u64).unwrap_or(0) as usize;
        let anh = m.get("anh").and_then(Value::as_str).unwrap_or_default();
        let khop = m.get("dau").and_then(Value::as_str) == doan.get(tu.wrapping_sub(1)).map(String::as_str);
        if anh.is_empty() || !khop {
            return Some(Viec::Ve { i });
        }
    }
    Some(Viec::Xong { dau })
}

fn cfg_story(st: &AppState, id: &str) -> Option<Value> {
    st.module_state(id, MODULE).ok().filter(|m| m.enabled).map(|m| m.config)
}

/// Làm ảnh cho truyện nào: truyện đang kể, hay truyện kế tiếp (`truyenSau`,
/// `truyen_sau.rs`) — vẽ sẵn khi ảnh truyện đang kể đã đủ, hết truyện là có ảnh
/// ngay.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Nhanh {
    Hien,
    Sau,
}

/// Các ô cài đặt ảnh dùng chung cho cả truyện sau.
const CAI_DAT_ANH: [&str; 2] = ["anhTuDong", "anhMuse"];

/// Cấu hình dạng truyện của nhánh `n`: truyện sau thì là `truyenSau` kèm các ô
/// cài đặt ảnh của module — để mọi hàm dưới dùng chung một kiểu. Hàm thuần.
pub fn xem_nhanh(cfg: &Value, n: Nhanh) -> Option<Value> {
    match n {
        Nhanh::Hien => Some(cfg.clone()),
        Nhanh::Sau => {
            let mut s = cfg.get("truyenSau").filter(|s| s.is_object())?.clone();
            for k in CAI_DAT_ANH {
                if let Some(v) = cfg.get(k) {
                    s[k] = v.clone();
                }
            }
            Some(s)
        }
    }
}

fn doc(st: &AppState, id: &str, n: Nhanh) -> Option<Value> {
    cfg_story(st, id).and_then(|c| xem_nhanh(&c, n))
}

/// Ghi vài ô vào nhánh `n`: truyện đang kể thì gộp vào cấu hình module, truyện
/// sau thì gộp vào trong `truyenSau`.
fn ghi(st: &AppState, id: &str, n: Nhanh, vai: Value) -> Result<(), String> {
    let vai = match n {
        Nhanh::Hien => vai,
        Nhanh::Sau => {
            let mut s = cfg_story(st, id)
                .and_then(|c| c.get("truyenSau").cloned())
                .filter(Value::is_object)
                .unwrap_or_else(|| json!({}));
            if let (Some(o), Some(m)) = (s.as_object_mut(), vai.as_object()) {
                for (k, v) in m {
                    o.insert(k.clone(), v.clone());
                }
            }
            json!({ "truyenSau": s })
        }
    };
    st.set_config(id, MODULE, vai).map_err(|e| format!("không ghi được cấu hình: {e:?}"))
}

fn bao(st: &AppState, id: &str, n: Nhanh, loi: &str) {
    let _ = ghi(st, id, n, json!({ "anhLoi": loi }));
}

/// Nhánh `n` vẫn đang chờ lập hồ sơ cho đúng truyện `dau` — truyện chưa đổi,
/// chưa chuyển trong lúc AI làm.
fn con_cho_lap(st: &AppState, id: &str, n: Nhanh, dau: &str) -> bool {
    doc(st, id, n).is_some_and(|c| viec_ke(&c) == Some(Viec::LapHoSo { dau: dau.to_string() }))
}

/// Bật muse: đưa NGUYÊN cốt truyện cho muse.ai vẽ MỖI ĐOẠN MỘT ẢNH (miễn phí
/// nên càng nhiều càng tốt) — không cần lượt AI lập kế hoạch nào phía app. Ảnh nào thiếu
/// thì vòng sau vẽ bù từng ảnh (`Viec::Ve`, cũng qua muse).
fn ve_ca_truyen_muse(st: &AppState, id: &str, _n: Nhanh, cfg: &Value, dau: &str) -> Result<(), String> {
    let doan = cat_doan(cfg.get("passages").and_then(Value::as_str).unwrap_or_default());
    let ten = cfg.get("title").and_then(Value::as_str).unwrap_or_default().to_string();
    let can = crate::muse::doan_can_ve(doan.len(), MOC_TOI_DA_MUSE);
    let da_co: Mutex<Vec<(usize, String)>> = Mutex::new(Vec::new());
    // Cất sau MỖI lượt muse (các tab vẽ song song gọi lần lượt), vào đúng truyện
    // này dù nó đang là truyện sau hay đã lên khung giữa chừng — ảnh vẽ rồi
    // không bao giờ mất, đoạn còn thiếu là mốc trống để vẽ bù.
    let luu = |moi: &[(usize, crate::muse::AnhMuse)]| -> Result<(), String> {
        let mut da_co = da_co.lock().unwrap_or_else(|e| e.into_inner());
        for (tu, a) in moi {
            let url = crate::media::cat_anh_ai(&st.layout, id, st.media_dem(), &a.byte, a.duoi)?;
            st.ghi_chi_phi(id, crate::chi_phi::VE_ANH_MUSE, &crate::chi_phi::Dung::default(), Some(0.0));
            da_co.push((*tu, url));
        }
        let moc = dung_moc(&ten, &doan, &can, &da_co);
        let ghi_duoc = ghi_theo_dau(
            st,
            id,
            dau,
            json!({ "moc": moc, "hoSoCua": dau, "anhLoi": "" }),
        )?;
        if !ghi_duoc {
            return Err("truyện đã đổi trong lúc muse vẽ".into());
        }
        Ok(())
    };
    // Hồ sơ có sẵn chỉ dùng khi đúng là của truyện này (`hoSoTruyen`) — sửa
    // truyện bằng tay thì hồ sơ cũ không còn đúng người.
    let san = if cfg.get("hoSoTruyen").and_then(Value::as_str) == Some(dau) {
        crate::muse::ghep_ho_so(
            cfg.get("phongCach").and_then(Value::as_str).unwrap_or_default(),
            cfg.get("nhanVat").and_then(Value::as_str).unwrap_or_default(),
        )
    } else {
        String::new()
    };
    match crate::muse::ve_truyen(&ten, &doan, MOC_TOI_DA_MUSE, &san, &luu) {
        Ok((anh, ho_so)) => {
            tracing::info!(thiet_ke = %id, %ten, so_anh = anh.len(), so_doan = doan.len(), "muse.ai vẽ xong ảnh cả truyện");
            // Hồ sơ muse vừa lập: cất vào "Hồ sơ truyện" — vẽ bù từng ảnh sau
            // này vẫn đúng người.
            if san.is_empty() && !ho_so.is_empty() {
                let (phong, nv) = crate::muse::tach_ho_so(&ho_so);
                let _ = ghi_theo_dau(st, id, dau, json!({ "phongCach": phong, "nhanVat": nv, "hoSoTruyen": dau }));
            }
            // Truyện này xong ảnh: bỏ cuộc chat muse (ảnh đã cất vào kho của
            // phòng rồi). Truyện sau mở chat mới, hồ sơ nhân vật gửi lại.
            crate::muse::don_het();
            Ok(())
        }
        // Truyện đổi giữa chừng: thôi, không phải lỗi.
        Err(e) if e.starts_with("truyện đã đổi") => Ok(()),
        Err(e) => Err(e),
    }
}

/// Mốc ảnh cho các đoạn cần vẽ: đoạn có ảnh thì kèm ảnh, chưa có thì mốc trống
/// (vòng sau vẽ bù riêng đoạn đó). Xếp theo đoạn. Hàm thuần.
pub fn dung_moc(ten: &str, doan: &[String], can: &[usize], co: &[(usize, String)]) -> Vec<Value> {
    can.iter()
        .map(|&tu| {
            let d = doan.get(tu - 1).cloned().unwrap_or_default();
            let anh = co.iter().find(|x| x.0 == tu).map(|x| x.1.clone());
            json!({
                "tu": tu,
                // Lời vẽ bù nếu sau này phải vẽ riêng ảnh này.
                "ta": format!("Minh hoạ truyện \"{ten}\", cảnh: {d}"),
                "nhanVat": [],
                "anh": anh.clone().unwrap_or_default(),
                "dau": if anh.is_some() { d } else { String::new() },
            })
        })
        .collect()
}

/// Ghi vào nhánh đang giữ đúng truyện có dấu `dau` (truyện đang kể hay truyện
/// sau). Không nhánh nào còn truyện đó thì thôi, trả `false`.
pub(crate) fn ghi_theo_dau(st: &AppState, id: &str, dau: &str, vai: Value) -> Result<bool, String> {
    let Some(cfg) = cfg_story(st, id) else { return Ok(false) };
    for n in [Nhanh::Hien, Nhanh::Sau] {
        let Some(v) = xem_nhanh(&cfg, n) else { continue };
        let doan = cat_doan(v.get("passages").and_then(Value::as_str).unwrap_or_default());
        let ten = v.get("title").and_then(Value::as_str).unwrap_or_default();
        if !doan.is_empty() && dau_truyen(ten, &doan) == dau {
            ghi(st, id, n, vai)?;
            return Ok(true);
        }
    }
    Ok(false)
}

/// Lỗi một việc ảnh.
#[derive(Debug, PartialEq)]
pub enum Loi {
    /// Lỗi thường: vòng sau thử lại, lùi dần.
    Thuong(String),
    /// Bật muse mà cả muse.ai lẫn API dự phòng đều hỏng — giờ nghỉ tới khi vẽ được (tối đa 24 giờ).
    CaHai(String),
}

impl From<String> for Loi {
    fn from(e: String) -> Self {
        Loi::Thuong(e)
    }
}

impl From<&str> for Loi {
    fn from(e: &str) -> Self {
        Loi::Thuong(e.to_string())
    }
}

impl Loi {
    fn chu(&self) -> &str {
        match self {
            Loi::Thuong(e) | Loi::CaHai(e) => e,
        }
    }
}

/// muse.ai thử ngần này lần (1 + 2 lần thử lại) rồi mới chuyển sang API.
pub const MUSE_LAN: usize = 3;
/// API dự phòng thử ngần này lần.
pub const API_LAN: usize = 2;
const NGHI_THU_LAI: Duration = Duration::from_secs(5);

/// Dự phòng khi bật muse: muse.ai thử `MUSE_LAN` lần; vẫn hỏng thì chuyển sang
/// AI mặc định qua API (tính tiền) thử `API_LAN` lần; cả hai hỏng là
/// `Loi::CaHai`. `nghi` chờ giữa hai lần thử (test truyền hàm rỗng).
pub fn du_phong<T>(
    mut muse: impl FnMut() -> Result<T, String>,
    mut api: impl FnMut() -> Result<T, String>,
    nghi: impl Fn(Duration),
) -> Result<T, Loi> {
    let mut loi_muse = String::new();
    for lan in 1..=MUSE_LAN {
        match muse() {
            Ok(v) => return Ok(v),
            Err(e) => {
                tracing::warn!(lan, "muse.ai hỏng: {e}");
                loi_muse = e;
                if lan < MUSE_LAN {
                    nghi(NGHI_THU_LAI);
                }
            }
        }
    }
    tracing::warn!("muse.ai hỏng {MUSE_LAN} lần liền — chuyển sang AI mặc định qua API (tính tiền mỗi ảnh)");
    let mut loi_api = String::new();
    for lan in 1..=API_LAN {
        match api() {
            Ok(v) => return Ok(v),
            Err(e) => {
                tracing::warn!(lan, "API vẽ ảnh dự phòng hỏng: {e}");
                loi_api = e;
                if lan < API_LAN {
                    nghi(NGHI_THU_LAI);
                }
            }
        }
    }
    Err(Loi::CaHai(format!(
        "muse.ai hỏng ({loi_muse}), API dự phòng cũng hỏng ({loi_api}) — giờ nghỉ tới khi vẽ được"
    )))
}

/// Truyện mới: bật muse thì muse vẽ cả truyện, hỏng thì dự phòng bằng API (AI
/// lập kế hoạch rồi vẽ từng ảnh); tắt muse thì đi thẳng API.
fn lap_ho_so(st: &AppState, id: &str, n: Nhanh, cfg: &Value, dau: &str) -> Result<(), Loi> {
    if dung_muse(cfg) {
        return du_phong(
            || ve_ca_truyen_muse(st, id, n, cfg, dau),
            || lap_ho_so_api(st, id, n, cfg, dau),
            std::thread::sleep,
        );
    }
    Ok(lap_ho_so_api(st, id, n, cfg, dau)?)
}

/// Lập hồ sơ qua API: một lượt chat cho cả truyện.
fn lap_ho_so_api(st: &AppState, id: &str, n: Nhanh, cfg: &Value, dau: &str) -> Result<(), String> {
    let ai = st.ai_config(id);
    let (nha, p) = secrets::tim(&st.layout, &ai.provider, NHA_CUNG_CAP, Use::Chat)
        .ok_or_else(|| crate::ai::thieu_nha(&ai.provider, "Chat"))?;
    if p.key.is_empty() {
        return Err(format!("kết nối \"{nha}\" chưa có khoá"));
    }
    let doan = cat_doan(cfg.get("passages").and_then(Value::as_str).unwrap_or_default());
    let ten = cfg.get("title").and_then(Value::as_str).unwrap_or_default();
    let truyen: String = doan
        .iter()
        .enumerate()
        .map(|(i, d)| format!("{}. {d}", i + 1))
        .collect::<Vec<_>>()
        .join("\n");
    let loi = format!("<truyen>\nTên: {ten}\n{truyen}\n</truyen>");
    let than = than_chat(p.kind, &model_cho(&ai.model, &p), DAN_ANH, &loi, 3_000);
    let tra = goi(&p, &than)?;
    st.ghi_chi_phi(id, crate::chi_phi::KE_HOACH_ANH, &tra.dung, tra.usd);
    let kh = doc_ke_hoach(&tra.chu, doan.len()).ok_or("AI không trả kế hoạch ảnh đọc được")?;

    let ho_so: Vec<String> = kh.nhan_vat.iter().map(|(t, a)| format!("{t}: {a}")).collect();
    let moc: Vec<Value> = kh
        .moc
        .iter()
        .map(|(tu, co_mat, prompt)| json!({ "tu": tu, "ta": prompt, "nhanVat": co_mat, "anh": "", "dau": "" }))
        .collect();
    if !con_cho_lap(st, id, n, dau) {
        return Ok(());
    }
    tracing::info!(thiet_ke = %id, nhanh = ?n, so_anh = moc.len(), so_doan = doan.len(), "AI lập kế hoạch ảnh truyện");
    ghi(
        st,
        id,
        n,
        json!({
            "phongCach": kh.phong_cach,
            "nhanVat": ho_so.join("\n"),
            "hoSoTruyen": dau,
            "moc": moc,
            "hoSoCua": dau,
            "anhLoi": "",
        }),
    )
}

/// Bật "Tạo ảnh bằng muse.ai" chưa. Hàm thuần.
pub fn dung_muse(cfg: &Value) -> bool {
    cfg.get("anhMuse").and_then(Value::as_bool) == Some(true)
}

/// Vẽ một ảnh: bật muse thì qua muse.ai trong app, hỏng thì dự phòng bằng API;
/// tắt muse thì đi thẳng API. Trả byte và đuôi file.
fn ve(st: &AppState, id: &str, cfg: &Value, loi: &str) -> Result<(Vec<u8>, &'static str), Loi> {
    if dung_muse(cfg) {
        return du_phong(
            || {
                let anh = crate::muse::ve(loi)?;
                st.ghi_chi_phi(id, crate::chi_phi::VE_ANH_MUSE, &crate::chi_phi::Dung::default(), Some(0.0));
                Ok((anh.byte, anh.duoi))
            },
            || ve_api(st, id, loi),
            std::thread::sleep,
        );
    }
    Ok(ve_api(st, id, loi)?)
}

/// Vẽ một ảnh qua kết nối vẽ ảnh (API tính tiền) — cài đặt ảnh của phòng
/// (kết nối, model, kích thước), một chỗ chung với nút "AI vẽ ảnh".
fn ve_api(st: &AppState, id: &str, loi: &str) -> Result<(Vec<u8>, &'static str), String> {
    let ai = st.ai_config(id);
    let chon = ai.anh_provider.as_str();
    let (nha, p) = secrets::tim(&st.layout, chon, NHA_ANH, Use::Image)
        .ok_or_else(|| crate::ai::thieu_nha(chon, "Ảnh"))?;
    if p.key.is_empty() {
        return Err(format!("kết nối \"{nha}\" chưa có khoá"));
    }
    let anh = crate::media::goi_tao_anh(&p, ai.anh_model.trim(), loi, &ai.co_anh())?;
    st.ghi_chi_phi(id, crate::chi_phi::VE_ANH, &anh.dung, anh.usd);
    Ok((anh.byte, "png"))
}

/// Vẽ mốc `i` rồi ghi vào cấu hình — nếu truyện chưa đổi trong lúc vẽ.
fn ve_moc(st: &AppState, id: &str, n: Nhanh, cfg: &Value, i: usize) -> Result<(), Loi> {
    let moc = cfg.get("moc").and_then(Value::as_array).cloned().unwrap_or_default();
    let m = moc.get(i).ok_or("mốc không còn")?;
    let tu = m.get("tu").and_then(Value::as_u64).unwrap_or(1) as usize;
    let co_mat: Vec<String> = m
        .get("nhanVat")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(str::to_string)
        .collect();
    let loi = loi_ve(
        cfg.get("phongCach").and_then(Value::as_str).unwrap_or_default(),
        cfg.get("nhanVat").and_then(Value::as_str).unwrap_or_default(),
        &co_mat,
        m.get("ta").and_then(Value::as_str).unwrap_or_default(),
    );
    let (byte, duoi) = ve(st, id, cfg, &loi)?;
    let url = crate::media::cat_anh_ai(&st.layout, id, st.media_dem(), &byte, duoi)?;

    // Đọc lại: người vận hành có thể đã đổi truyện (hay truyện sau đã chuyển
    // thành truyện đang kể) trong lúc chờ vẽ.
    let moi = doc(st, id, n).unwrap_or_default();
    if moi.get("hoSoCua") != cfg.get("hoSoCua") {
        return Ok(());
    }
    let doan = cat_doan(moi.get("passages").and_then(Value::as_str).unwrap_or_default());
    let mut ds = moi.get("moc").and_then(Value::as_array).cloned().unwrap_or_default();
    if let Some(x) = ds.get_mut(i).and_then(Value::as_object_mut) {
        x.insert("anh".into(), json!(url));
        x.insert("dau".into(), json!(doan.get(tu - 1).cloned().unwrap_or_default()));
    }
    tracing::info!(thiet_ke = %id, nhanh = ?n, doan = tu, "AI vẽ xong một ảnh truyện");
    Ok(ghi(st, id, n, json!({ "moc": ds, "anhLoi": "" }))?)
}

/// Cả muse.ai lẫn API đều hỏng với truyện ĐANG KỂ. KHÔNG đóng live: đóng là
/// phòng im, màn chờ đứng đó, khách bỏ đi. Thay vào đó mở GIỜ NGHỈ ("anh"):
/// khung hiện màn chờ + "Truyện tiếp theo", MC chào khách, trò chuyện; vòng ảnh
/// vẫn tự thử lại (lùi dần). Vẽ được là `ai.rs` đóng giờ nghỉ và kể tiếp; quá
/// 24 giờ thì thôi chờ, kể không ảnh. Truyện SAU hỏng thì chưa làm gì: chuyển
/// sang rồi nó thành truyện đang kể, hỏng nữa mới nghỉ.
fn nghi_vi_anh(st: &AppState, id: &str, n: Nhanh) {
    if n != Nhanh::Hien {
        return;
    }
    let Some(cfg) = cfg_story(st, id) else { return };
    // Đang nghỉ vì ảnh rồi: giữ mốc bắt đầu, không mở lại (mỗi lần thử hỏng
    // mà mở lại là không bao giờ tới hạn 24 giờ).
    if crate::truyen_sau::giai_lao(&cfg).is_some_and(|(_, ly_do, _)| ly_do == "anh") {
        return;
    }
    let ten = cfg.get("title").and_then(Value::as_str).unwrap_or_default().to_string();
    tracing::warn!(thiet_ke = %id, %ten, "ảnh truyện: muse.ai và API đều hỏng — giờ nghỉ tới khi vẽ được");
    let so_nguoi = st
        .session_view()
        .map_or(0, |v| v.totals.viewers);
    crate::truyen_sau::dat_giai_lao(st, id, Some((&ten, "anh")), crate::state::bay_gio_ms(), so_nguoi);
}

/// Ảnh truyện đang kể đã ổn trở lại (lần vẽ gần nhất không lỗi, hay không
/// còn gì để vẽ) — hết giờ nghỉ vì ảnh. Hàm thuần.
pub fn ve_lai_duoc(cfg: &Value) -> bool {
    cfg.get("anhLoi").and_then(Value::as_str).unwrap_or_default().is_empty()
        || matches!(viec_ke(cfg), None | Some(Viec::Xong { .. }))
}

pub async fn chay(st: Arc<AppState>) {
    let mut dong_ho = tokio::time::interval(Duration::from_secs(3));
    // Một việc một lúc cho cả máy: vẽ ảnh tốn tiền, chạy song song chục phòng
    // là chục hoá đơn cùng lúc.
    let ban = Arc::new(Mutex::new(false));
    let hen: Arc<Mutex<HashMap<String, Instant>>> = Arc::new(Mutex::new(HashMap::new()));
    let loi_lien: Arc<Mutex<HashMap<String, u32>>> = Arc::new(Mutex::new(HashMap::new()));
    // Truyện đã vẽ đủ lúc nào, và truyện nào đã dọn — mỗi truyện dọn một lần.
    let mut xong_luc: HashMap<String, (String, Instant)> = HashMap::new();
    let mut da_don: HashSet<(String, String)> = HashSet::new();

    loop {
        dong_ho.tick().await;
        if *ban.lock().expect("khoá ảnh truyện hỏng") {
            continue;
        }
        let mut phong: Vec<String> = st.live().into_iter().collect();
        for (id, _) in st.cac_xem_thu() {
            if !phong.contains(&id) {
                phong.push(id);
            }
        }

        for id in phong {
            if hen.lock().expect("khoá hẹn hỏng").get(&id).is_some_and(|t| Instant::now() < *t) {
                continue;
            }
            let Some(goc) = cfg_story(&st, &id) else { continue };
            let Some(viec) = viec_ke(&goc) else { continue };
            let (n, cfg, viec) = if let Viec::Xong { dau } = viec {
                let (d, luc) = xong_luc.entry(id.clone()).or_insert((dau.clone(), Instant::now()));
                if *d != dau {
                    *d = dau.clone();
                    *luc = Instant::now();
                }
                if luc.elapsed() >= DON_SAU && da_don.insert((id.clone(), dau)) {
                    let layout = st.layout.clone();
                    let id2 = id.clone();
                    tokio::task::spawn_blocking(move || crate::media::don_dong_bo(&layout, &id2));
                }
                // Ảnh truyện đang kể đã đủ: vẽ sẵn ảnh cho truyện kế tiếp.
                let Some(sau) = xem_nhanh(&goc, Nhanh::Sau) else { continue };
                match viec_ke(&sau) {
                    Some(v @ (Viec::LapHoSo { .. } | Viec::Ve { .. })) => (Nhanh::Sau, sau, v),
                    _ => continue,
                }
            } else {
                (Nhanh::Hien, goc, viec)
            };

            *ban.lock().expect("khoá ảnh truyện hỏng") = true;
            let (st2, ban2, hen2, loi2, id2) =
                (st.clone(), ban.clone(), hen.clone(), loi_lien.clone(), id.clone());
            tokio::spawn(async move {
                let st3 = st2.clone();
                let id3 = id2.clone();
                let kq = tokio::task::spawn_blocking(move || match viec {
                    Viec::LapHoSo { dau } => lap_ho_so(&st3, &id3, n, &cfg, &dau),
                    Viec::Ve { i } => ve_moc(&st3, &id3, n, &cfg, i),
                    Viec::Xong { .. } => Ok(()),
                })
                .await
                .unwrap_or_else(|e| Err(Loi::Thuong(format!("tác vụ hỏng: {e}"))));
                if let Err(e) = kq {
                    tracing::warn!(thiet_ke = %id2, nhanh = ?n, "ảnh truyện: {}", e.chu());
                    bao(&st2, &id2, n, e.chu());
                    // Hỏng cả hai đường vẽ: giờ nghỉ tới khi vẽ được, không đóng live.
                    if matches!(e, Loi::CaHai(_)) {
                        nghi_vi_anh(&st2, &id2, n);
                    }
                    // Lỗi liên tiếp thì lùi dần, như MC: khoá hết hạn mức mà
                    // cứ vài giây gọi một lần thì chỉ đốt nhật ký.
                    let mut g = loi2.lock().expect("khoá lỗi hỏng");
                    let n = g.entry(id2.clone()).or_insert(0);
                    *n += 1;
                    hen2.lock().expect("khoá hẹn hỏng").insert(id2, Instant::now() + cho_sau_loi(*n - 1));
                } else {
                    loi2.lock().expect("khoá lỗi hỏng").remove(&id2);
                }
                *ban2.lock().expect("khoá ảnh truyện hỏng") = false;
            });
            break;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg(doan: &str) -> Value {
        json!({ "anhTuDong": true, "title": "Cây vú sữa", "passages": doan })
    }

    #[test]
    fn tat_thi_khong_lam_gi() {
        assert_eq!(viec_ke(&json!({ "passages": "a" })), None);
    }

    #[test]
    fn truyen_moi_thi_lap_ho_so_roi_ve_tung_moc_roi_xong() {
        let mut c = cfg("Một.\nHai.\nBa.");
        let Some(Viec::LapHoSo { dau }) = viec_ke(&c) else { panic!("phải lập hồ sơ") };
        c["hoSoCua"] = json!(dau);
        c["moc"] = json!([{ "tu": 1, "anh": "", "dau": "" }, { "tu": 3, "anh": "", "dau": "" }]);
        assert_eq!(viec_ke(&c), Some(Viec::Ve { i: 0 }));
        c["moc"][0]["anh"] = json!("/u/x/ai-1.png");
        c["moc"][0]["dau"] = json!("Một.");
        assert_eq!(viec_ke(&c), Some(Viec::Ve { i: 1 }));
        c["moc"][1]["anh"] = json!("/u/x/ai-2.png");
        c["moc"][1]["dau"] = json!("Ba.");
        assert!(matches!(viec_ke(&c), Some(Viec::Xong { .. })));

        // Sửa một đoạn: dấu truyện đổi, lập lại từ đầu.
        c["passages"] = json!("Một.\nHai khác.\nBa.");
        assert!(matches!(viec_ke(&c), Some(Viec::LapHoSo { .. })));
    }

    #[test]
    fn truyen_bo_anh_thi_coi_nhu_xong_de_ve_san_truyen_ke() {
        let mut c = cfg("Một.
Hai.");
        c["boAnh"] = json!(true);
        // Không lập hồ sơ, không vẽ lại — nhưng vẫn "xong" để vòng ảnh đi tiếp
        // sang vẽ sẵn cho truyện kế.
        assert!(matches!(viec_ke(&c), Some(Viec::Xong { .. })));
    }

    #[test]
    fn het_loi_anh_thi_ve_lai_duoc() {
        let mut c = cfg("Một.
Hai.");
        c["anhLoi"] = json!("muse.ai hỏng");
        assert!(!ve_lai_duoc(&c), "còn lỗi, còn việc vẽ: vẫn nghỉ");
        c["anhLoi"] = json!("");
        assert!(ve_lai_duoc(&c), "lần vẽ gần nhất ổn: hết nghỉ");
        c["anhLoi"] = json!("muse.ai hỏng");
        c["anhTuDong"] = json!(false);
        assert!(ve_lai_duoc(&c), "người vận hành tắt tự tạo ảnh: không chờ nữa");
    }

    #[test]
    fn doc_ke_hoach_loc_va_gioi_han() {
        let moc: Vec<String> = (1..=14)
            .map(|i| format!(r#"{{"tu": {i}, "nhanVat": ["Cậu bé"], "prompt": "cảnh {i}"}}"#))
            .collect();
        let than = format!(
            r#"{{"phongCach": "màu nước", "nhanVat": [{{"ten": "Cậu bé", "ta": "áo nâu"}}, {{"ten": "", "ta": "x"}}], "moc": [{}, {{"tu": 99, "prompt": "ngoài"}}]}}"#,
            moc.join(",")
        );
        let kh = doc_ke_hoach(&than, 20).unwrap();
        assert_eq!(kh.moc.len(), MOC_TOI_DA);
        assert_eq!(kh.nhan_vat, vec![("Cậu bé".to_string(), "áo nâu".to_string())]);
        assert_eq!(kh.moc[0].0, 1);
        assert!(doc_ke_hoach("rác", 5).is_none());
    }

    #[test]
    fn loi_ve_mang_nguyen_van_ho_so_nhan_vat_co_mat() {
        let ho_so = "Cậu bé: tóc đen, áo bà ba nâu\nMẹ: áo tím";
        let l = loi_ve("màu nước", ho_so, &["Cậu bé".into()], "cậu bé ôm gốc cây");
        assert!(l.contains("Cậu bé: tóc đen, áo bà ba nâu."));
        assert!(!l.contains("áo tím"));
        let ca = loi_ve("", ho_so, &[], "cảnh chung");
        assert!(ca.contains("áo tím") && ca.contains("áo bà ba nâu"), "không rõ ai có mặt thì kèm cả hồ sơ");
        assert!(l.contains("cậu bé ôm gốc cây"));
    }

    #[test]
    fn muse_hong_thi_thu_lai_roi_chuyen_api() {
        let mut muse_goi = 0;
        let mut api_goi = 0;
        let kq = du_phong(
            || -> Result<u8, String> {
                muse_goi += 1;
                Err("muse treo".into())
            },
            || {
                api_goi += 1;
                Ok(7)
            },
            |_| {},
        );
        assert_eq!(kq, Ok(7));
        assert_eq!(muse_goi, MUSE_LAN, "muse thử 1 + 2 lần");
        assert_eq!(api_goi, 1);
    }

    #[test]
    fn muse_lan_hai_duoc_thi_khong_goi_api() {
        let mut lan = 0;
        let kq = du_phong(
            || {
                lan += 1;
                if lan < 2 { Err("lỗi".into()) } else { Ok(1) }
            },
            || -> Result<u8, String> { panic!("không được gọi API") },
            |_| {},
        );
        assert_eq!(kq, Ok(1));
    }

    #[test]
    fn ca_hai_hong_thi_bao_ca_hai() {
        let mut api_goi = 0;
        let kq = du_phong(
            || -> Result<u8, String> { Err("muse".into()) },
            || -> Result<u8, String> {
                api_goi += 1;
                Err("hết hạn mức".into())
            },
            |_| {},
        );
        assert_eq!(api_goi, API_LAN);
        assert!(matches!(kq, Err(Loi::CaHai(ref e)) if e.contains("muse") && e.contains("hết hạn mức")));
    }

    #[test]
    fn nhanh_sau_mang_cai_dat_anh_cua_module() {
        let c = json!({
            "anhTuDong": true, "anhMuse": true, "title": "A", "passages": "x",
            "truyenSau": { "title": "B", "passages": "Một.\nHai." }
        });
        let s = xem_nhanh(&c, Nhanh::Sau).unwrap();
        assert_eq!(s["title"], "B");
        assert_eq!(s["anhMuse"], true);
        assert!(matches!(viec_ke(&s), Some(Viec::LapHoSo { .. })));
        assert!(xem_nhanh(&json!({}), Nhanh::Sau).is_none());
    }

    #[test]
    fn moc_muse_moi_doan_mot_moc_thieu_thi_trong() {
        let doan: Vec<String> = vec!["Một.".into(), "Hai.".into(), "Ba.".into()];
        let moc = dung_moc("T", &doan, &[1, 2, 3], &[(2, "/u/x/ai-2.webp".into())]);
        assert_eq!(moc.len(), 3);
        assert_eq!(moc[1]["anh"], "/u/x/ai-2.webp");
        assert_eq!(moc[1]["dau"], "Hai.");
        assert_eq!(moc[0]["anh"], "");
        let mut c = json!({ "anhTuDong": true, "title": "T", "passages": "Một.\nHai.\nBa.", "moc": moc });
        c["hoSoCua"] = json!(dau_truyen("T", &doan));
        assert_eq!(viec_ke(&c), Some(Viec::Ve { i: 0 }), "đoạn thiếu ảnh thì vẽ bù");
    }

    #[test]
    fn chi_dung_muse_khi_bat_cong_tac() {
        assert!(!dung_muse(&cfg("a")));
        assert!(dung_muse(&json!({ "anhMuse": true })));
    }

    #[test]
    fn cat_doan_giong_module_story() {
        assert_eq!(cat_doan("  a   b \n\n c "), vec!["a b".to_string(), "c".to_string()]);
    }
}
