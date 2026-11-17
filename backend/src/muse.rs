//! Cầu nối muse.ai — vẽ ảnh bằng trang muse.ai đã đăng nhập sẵn trong app,
//! thay cho API vẽ ảnh tính tiền từng ảnh.
//!
//! Máy chủ không tự lái được trình duyệt: phần đó nằm ở vỏ desktop
//! (`desktop/src/muse.rs`), nơi có tab muse.ai. Vỏ cắm vào đây lúc khởi động
//! (`dat`), máy chủ gọi như gọi một API:
//! - `ve_truyen`: đưa NGUYÊN cốt truyện, muse vẽ mỗi đoạn một ảnh liền một
//!   mạch (thiếu thì hỏi bù đúng đoạn thiếu) — không tốn lượt AI lập kế hoạch nào phía app,
//!   và nhân vật giữ nhất quán vì cùng một trả lời.
//! - `ve`: một ảnh lẻ (vẽ bù ảnh còn thiếu, hay nút vẽ một ảnh).
//!
//! Chạy bằng `cargo run` (không có vỏ) thì báo lỗi rõ ràng.
//! Một lượt một lúc: trang muse là một khung chat, hai lượt chồng nhau là điền
//! đè ô nhập của nhau.

use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use axum::extract::{Path as AxPath, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Deserialize;
use serde_json::json;

use crate::paths::valid_id;
use crate::state::AppState;

/// Ảnh muse trả về.
#[derive(Debug, Clone, PartialEq)]
pub struct AnhMuse {
    pub byte: Vec<u8>,
    /// Đuôi file theo kiểu ảnh (muse thường trả webp).
    pub duoi: &'static str,
}

/// Một mảnh trong trả lời của muse, đúng thứ tự trên trang: chữ hoặc ảnh.
#[derive(Debug, Clone, PartialEq)]
pub enum Manh {
    Chu(String),
    Anh(AnhMuse),
}

/// Phần vỏ desktop làm: gửi `loi` lên tab muse.ai thứ `kenh` (0 là tab
/// "muse", 1 là "muse-2"…; tab chưa có thì tự mở) — `chat_moi` thì mở cuộc chat
/// mới, không thì gửi tiếp trong cuộc chat đang mở của tab đó (muse thấy các
/// ảnh vừa vẽ, giữ nhân vật y hệt) — chờ muse trả lời xong (tối đa
/// `cho_toi_da`), đọc lại phần trả lời MỚI theo thứ tự. Gọi chặn.
pub trait CauNoiMuse: Send + Sync {
    fn gui(&self, kenh: usize, loi: &str, cho_toi_da: Duration, chat_moi: bool) -> Result<Vec<Manh>, String>;

    /// Bỏ cuộc chat của tab `kenh`: xoá cuộc chat trên muse.ai nếu bấm được
    /// nút xoá của trang, không thì về trang chat mới. Gọi khi một truyện đã
    /// vẽ xong ảnh — cuộc chat đó chứa cả chục ảnh, giữ lại chỉ nặng tài
    /// khoản và làm lượt sau phải cuộn qua đống cũ.
    fn don(&self, kenh: usize) -> Result<(), String>;
}

static CAU_NOI: OnceLock<Arc<dyn CauNoiMuse>> = OnceLock::new();
/// Vẽ song song tối đa ngần này tab muse.ai. Mỗi tab một lượt một lúc: tab là
/// một khung chat, hai lượt chồng nhau là điền đè ô nhập của nhau. Không để
/// nhiều hơn: dồn nhiều yêu cầu một lúc là muse.ai treo.
pub const SO_KENH: usize = 2;
static KENH: [Mutex<()>; SO_KENH] = [Mutex::new(()), Mutex::new(())];
/// muse chỉ vẽ chừng 4 ảnh mỗi trả lời: mỗi phần giao một tab là ngần này đoạn.
pub const DOAN_MOI_PHAN: usize = 4;
/// Hai lần gửi lên muse.ai, tính chung mọi tab, cách nhau ít nhất ngần này.
pub const CACH_GUI: Duration = Duration::from_secs(30);
/// Mốc sớm nhất được gửi lượt kế tiếp.
static LUOT_KE: Mutex<Option<Instant>> = Mutex::new(None);

/// Một ảnh lẻ muse vẽ chừng nửa phút; cả truyện vài phút.
const CHO_MOT_ANH: Duration = Duration::from_secs(4 * 60);
const CHO_CA_TRUYEN: Duration = Duration::from_secs(15 * 60);

/// Vỏ desktop cắm cầu nối vào. Gọi một lần lúc khởi động.
pub fn dat(c: Arc<dyn CauNoiMuse>) {
    let _ = CAU_NOI.set(c);
}

/// Có cầu nối không (đang chạy trong app desktop).
pub fn co() -> bool {
    CAU_NOI.get().is_some()
}

fn cau_noi() -> Result<&'static Arc<dyn CauNoiMuse>, String> {
    CAU_NOI
        .get()
        .ok_or_else(|| "Tạo ảnh bằng muse.ai chỉ chạy trong app desktop (npm run app)".to_string())
}

/// Xếp một lượt gửi vào hàng: trả (phải chờ bao lâu, mốc cho lượt sau đó). Hàm
/// thuần.
pub fn xep_luot(ke: Option<Instant>, now: Instant, cach: Duration) -> (Duration, Instant) {
    let duoc = ke.map_or(now, |m| m.max(now));
    (duoc - now, duoc + cach)
}

/// Chờ tới lượt gửi (`CACH_GUI`). Giữ chỗ xong mới ngủ, ngoài khoá, nên các tab
/// cùng xin một lúc được xếp lần lượt. Gọi SAU khi đã giữ tab: giữ chỗ trước
/// thì tab bận vài phút làm chỗ đã xếp mất ý nghĩa.
fn cho_toi_luot() {
    let cho = {
        let mut ke = LUOT_KE.lock().unwrap_or_else(|e| e.into_inner());
        let (cho, sau) = xep_luot(*ke, Instant::now(), CACH_GUI);
        *ke = Some(sau);
        cho
    };
    if !cho.is_zero() {
        tracing::info!(giay = cho.as_secs(), "muse.ai: giãn cách, chờ tới lượt gửi");
        std::thread::sleep(cho);
    }
}

/// Gửi lên đúng tab `kenh`.
fn gui(kenh: usize, loi: &str, cho: Duration, chat_moi: bool) -> Result<Vec<Manh>, String> {
    let c = cau_noi()?;
    let _luot = KENH[kenh % SO_KENH].lock().unwrap_or_else(|e| e.into_inner());
    cho_toi_luot();
    c.gui(kenh % SO_KENH, loi, cho, chat_moi)
}

/// Gửi lên tab nào đang rảnh (ảnh lẻ); bận hết thì chờ tab đầu.
/// Gửi vào tab nào rảnh. Trả kèm số kênh để người gọi DỌN cuộc chat sau khi
/// xong — mỗi lần vẽ lẻ là một cuộc chat mới, không dọn thì tài khoản muse.ai
/// đầy dần những cuộc chat một ảnh.
fn gui_ranh(loi: &str, cho: Duration) -> Result<(usize, Vec<Manh>), String> {
    let c = cau_noi()?;
    for (k, khoa) in KENH.iter().enumerate() {
        if let Ok(_luot) = khoa.try_lock() {
            cho_toi_luot();
            return c.gui(k, loi, cho, true).map(|m| (k, m));
        }
    }
    let _luot = KENH[0].lock().unwrap_or_else(|e| e.into_inner());
    cho_toi_luot();
    c.gui(0, loi, cho, true).map(|m| (0, m))
}

/// Bỏ cuộc chat của một tab. Lỗi thì chỉ ghi log — dọn không được cũng không
/// được làm hỏng việc vẽ.
fn don_kenh(kenh: usize) {
    let Ok(c) = cau_noi() else { return };
    let _luot = KENH[kenh % SO_KENH].lock().unwrap_or_else(|e| e.into_inner());
    if let Err(e) = c.don(kenh % SO_KENH) {
        tracing::warn!(kenh, "muse.ai: không bỏ được cuộc chat: {e}");
    }
}

/// Câu muse nói khi không vẽ — để báo lỗi cho người vận hành hiểu. Hàm thuần.
fn chu_cua(manh: &[Manh]) -> String {
    let chu: Vec<&str> = manh
        .iter()
        .filter_map(|m| match m {
            Manh::Chu(c) => Some(c.trim()),
            Manh::Anh(_) => None,
        })
        .filter(|c| !c.is_empty())
        .collect();
    chu.join(" ").chars().take(240).collect()
}

/// Lời gửi muse cho một ảnh lẻ: mở đầu bằng lệnh vẽ để muse vẽ ngay chứ không
/// hỏi lại. Hàm thuần.
pub fn loi_gui(loi_ve: &str) -> String {
    format!(
        "Tạo 1 ảnh theo mô tả dưới đây. Chỉ vẽ, không hỏi lại, không cần giải thích.\n\n{}",
        loi_ve.trim()
    )
}

/// Vẽ một ảnh qua muse.ai.
pub fn ve(loi_ve: &str) -> Result<AnhMuse, String> {
    let (kenh, manh) = gui_ranh(&loi_gui(loi_ve), CHO_MOT_ANH)?;
    // Vẽ lẻ xong là bỏ cuộc chat ngay: nó chỉ có đúng một ảnh, giữ lại vô ích.
    don_kenh(kenh);
    let chu = chu_cua(&manh);
    manh.into_iter()
        .find_map(|m| match m {
            Manh::Anh(a) if !a.byte.is_empty() => Some(a),
            _ => None,
        })
        .ok_or_else(|| format!("muse.ai không trả ảnh: {chu}"))
}

/// Lời gửi muse: có NGUYÊN cốt truyện, hồ sơ nhân vật chung (`ho_so`, để các
/// tab vẽ song song ra cùng một người) và phần đoạn được giao (`can_ve`) — mỗi
/// đoạn đúng một ảnh, ghi "Đoạn N:" trước mỗi ảnh. Hàm thuần.
pub fn loi_ca_truyen(ten: &str, doan: &[String], can_ve: &[usize], ho_so: &str) -> String {
    let ds = can_ve.iter().map(usize::to_string).collect::<Vec<_>>().join(", ");
    let bu = can_ve.len() < doan.len();
    let ho_so = ho_so.trim();
    let mut s = format!(
        "Vẽ tranh minh hoạ cho truyện dưới đây (kể trong phòng live cho cả nhà xem).\n\
         - Phần việc: {} — mỗi đoạn đúng MỘT ảnh, tổng cộng {} ảnh, cho các đoạn: {ds}.{}\n\
         - Vẽ LẦN LƯỢT theo thứ tự, liền một mạch tới ảnh cuối cùng; không dừng giữa chừng, không hỏi lại, không gộp hai đoạn vào một ảnh.\n\
         - Mỗi ảnh là MỘT bức tranh RIÊNG cho MỘT đoạn. TUYỆT ĐỐI không ghép nhiều đoạn, nhiều cảnh vào một ảnh; không chia ô, không lưới, không kiểu truyện tranh nhiều khung.\n\
         - Ngay TRƯỚC mỗi ảnh, viết đúng một dòng \"Đoạn <số>:\" (số của đoạn ảnh đó minh hoạ).\n\
         - Mọi ảnh cùng một phong cách vẽ; mỗi nhân vật giữ nguyên ngoại hình, quần áo từ ảnh đầu đến ảnh cuối.\n\
         - Khung ngang, không có chữ trong ảnh. Không vẽ cảnh bạo lực hay đáng sợ với trẻ em.\n\n\
         Tên truyện: {}\n",
        if bu { "CHỈ vẽ các đoạn được giao" } else { "vẽ cho MỖI đoạn của truyện" },
        can_ve.len(),
        if bu { " Các đoạn khác đã có người vẽ — đừng vẽ." } else { "" },
        ten.trim()
    );
    if !ho_so.is_empty() {
        s.push_str(&format!(
            "Hồ sơ nhân vật và phong cách — PHẢI vẽ đúng y hệt (mặt, tóc, quần áo, màu áo):\n{ho_so}\n\n"
        ));
    }
    s.push_str("Cốt truyện:\n");
    for (i, d) in doan.iter().enumerate() {
        s.push_str(&format!("{}. {}\n", i + 1, d.trim()));
    }
    s
}

/// Lời xin hồ sơ nhân vật — CHƯA vẽ, chỉ trả chữ — để mọi tab vẽ cùng một
/// người. Hàm thuần.
pub fn loi_ho_so(ten: &str, doan: &[String]) -> String {
    let mut s = format!(
        "Đọc truyện dưới đây. CHƯA VẼ GÌ CẢ, chỉ trả lời bằng chữ, thật gọn:\n\
         - Dòng đầu: \"Phong cách: …\" — một phong cách vẽ tranh minh hoạ hợp truyện (chất liệu, tông màu, nét vẽ).\n\
         - Mỗi nhân vật một dòng \"Tên: …\" — ngoại hình CỐ ĐỊNH: tuổi, dáng, mặt, tóc, quần áo và MÀU áo, một nét riêng dễ nhận.\n\n\
         Tên truyện: {}\n",
        ten.trim()
    );
    for (i, d) in doan.iter().enumerate() {
        s.push_str(&format!("{}. {}\n", i + 1, d.trim()));
    }
    s
}

/// Hồ sơ từ trả lời của muse: các dòng chữ, gọn lại. Hàm thuần.
pub fn doc_ho_so(manh: &[Manh]) -> String {
    let chu: Vec<String> = manh
        .iter()
        .filter_map(|m| match m {
            Manh::Chu(c) => Some(c.split_whitespace().collect::<Vec<_>>().join(" ")),
            Manh::Anh(_) => None,
        })
        .filter(|c| !c.is_empty())
        .collect();
    chu.join("\n").chars().take(1_500).collect()
}

/// Chia các đoạn cần vẽ thành phần, mỗi phần tối đa `co` đoạn liền nhau. Hàm thuần.
pub fn chia_phan(can: &[usize], co: usize) -> Vec<Vec<usize>> {
    can.chunks(co.max(1)).map(<[usize]>::to_vec).collect()
}

/// Giao phần cho `so_kenh` tab: tab k nhận phần k, k + số tab, … Hàm thuần.
pub fn giao_kenh(phan: &[Vec<usize>], so_kenh: usize) -> Vec<Vec<Vec<usize>>> {
    let n = so_kenh.max(1).min(phan.len().max(1));
    let mut ra: Vec<Vec<Vec<usize>>> = vec![Vec::new(); n];
    for (i, p) in phan.iter().enumerate() {
        ra[i % n].push(p.clone());
    }
    ra
}

/// Số đoạn trong một dòng "Đoạn 3:" / "đoạn 12 -". Hàm thuần.
fn so_doan_trong(chu: &str) -> Option<usize> {
    let thuong = chu.to_lowercase();
    let i = thuong
        .rfind("đoạn")
        .map(|i| i + "đoạn".len())
        .or_else(|| thuong.rfind("doan").map(|i| i + "doan".len()))?;
    let so: String = thuong[i..].trim_start().chars().take_while(char::is_ascii_digit).collect();
    so.parse().ok()
}

/// Gán ảnh muse trả về vào các đoạn đang cần (`can_ve`, tăng dần): theo dòng
/// "Đoạn N:" đứng trước ảnh; ảnh không nhãn, nhãn ngoài danh sách hay trùng
/// thì lấy đoạn cần vẽ kế tiếp sau đoạn vừa gán (muse vẽ theo thứ tự). Hàm thuần.
pub fn gan_doan(manh: Vec<Manh>, can_ve: &[usize]) -> Vec<(usize, AnhMuse)> {
    let mut nhan: Option<usize> = None;
    let mut ra: Vec<(usize, AnhMuse)> = Vec::new();
    let mut cuoi = 0usize;
    for m in manh {
        match m {
            Manh::Chu(c) => {
                if let Some(n) = so_doan_trong(&c) {
                    nhan = Some(n);
                }
            }
            Manh::Anh(a) if !a.byte.is_empty() => {
                let trong = |d: &usize, ra: &Vec<(usize, AnhMuse)>| can_ve.contains(d) && !ra.iter().any(|x| x.0 == *d);
                let tu = nhan
                    .take()
                    .filter(|n| trong(n, &ra))
                    .or_else(|| can_ve.iter().copied().find(|d| *d > cuoi && trong(d, &ra)))
                    .or_else(|| can_ve.iter().copied().find(|d| trong(d, &ra)));
                if let Some(tu) = tu {
                    cuoi = tu;
                    ra.push((tu, a));
                }
            }
            Manh::Anh(_) => {}
        }
    }
    ra.sort_by_key(|x| x.0);
    ra
}

/// Các đoạn cần ảnh: mỗi đoạn một ảnh; truyện dài hơn `toi_da` đoạn thì chia
/// đều, luôn có đoạn 1. Hàm thuần.
pub fn doan_can_ve(so_doan: usize, toi_da: usize) -> Vec<usize> {
    if so_doan <= toi_da {
        return (1..=so_doan).collect();
    }
    let mut ds: Vec<usize> = (0..toi_da).map(|k| 1 + k * so_doan / toi_da).collect();
    ds.dedup();
    ds
}

/// Các đoạn trong `can` chưa có ảnh. Hàm thuần.
pub fn con_thieu(can: &[usize], co: &[(usize, AnhMuse)]) -> Vec<usize> {
    can.iter().copied().filter(|d| !co.iter().any(|x| x.0 == *d)).collect()
}

/// Lời xin vẽ tiếp trong CÙNG cuộc chat: muse thấy các ảnh vừa vẽ nên giữ
/// nhân vật, phong cách y hệt. Hàm thuần.
pub fn loi_ve_tiep(can_ve: &[usize]) -> String {
    let ds = can_ve.iter().map(usize::to_string).collect::<Vec<_>>().join(", ");
    format!(
        "Vẽ tiếp cho các đoạn còn thiếu: {ds} — mỗi đoạn đúng MỘT ảnh RIÊNG, tổng cộng {} ảnh tách rời, liền một mạch không hỏi lại. \
         Không ghép nhiều đoạn vào một ảnh, không chia ô hay lưới. \
         Giữ ĐÚNG nhân vật (mặt, tóc, quần áo, màu áo) và phong cách như các ảnh ở trên. \
         Ngay trước mỗi ảnh viết một dòng \"Đoạn <số>:\".",
        can_ve.len()
    )
}

/// Ảnh mới của một lượt, gửi cho người gọi cất ngay. Gọi từ nhiều tab cùng lúc.
pub type MoiLuot<'a> = &'a (dyn Fn(&[(usize, AnhMuse)]) -> Result<(), String> + Sync);

/// Một tab vẽ các phần được giao, lần lượt trong CÙNG một cuộc chat (nhân vật
/// không đổi giữa các phần). Phần nào thiếu đoạn thì hỏi bù; trả lời trống hai
/// lần liền thì mở chat mới với cả truyện. Trả ảnh đã có và câu chữ cuối.
fn ve_kenh(
    kenh: usize,
    ten: &str,
    doan: &[String],
    ho_so: &str,
    cac_phan: &[Vec<usize>],
    da_mo_chat: bool,
    moi_luot: MoiLuot<'_>,
) -> (Vec<(usize, AnhMuse)>, String) {
    let mut co: Vec<(usize, AnhMuse)> = Vec::new();
    let mut chu = String::new();
    // Tab đầu đã mở chat lúc xin hồ sơ: muse đã đọc truyện, gửi tiếp luôn.
    let mut co_chat = da_mo_chat;
    for phan in cac_phan {
        let mut trong_lien = 0;
        for lan in 0..3 {
            let thieu = con_thieu(phan, &co);
            if thieu.is_empty() {
                break;
            }
            let (loi, moi_chat) = if !co_chat || trong_lien > 0 {
                (loi_ca_truyen(ten, doan, &thieu, ho_so), true)
            } else if lan == 0 && thieu.len() == phan.len() {
                // Phần mới trong chat đang mở: kèm luôn cốt truyện cho chắc.
                (loi_ca_truyen(ten, doan, &thieu, ho_so), false)
            } else {
                (loi_ve_tiep(&thieu), false)
            };
            let manh = match gui(kenh, &loi, CHO_CA_TRUYEN, moi_chat) {
                Ok(m) => m,
                Err(e) => {
                    tracing::warn!(kenh, ?thieu, "muse.ai: tab hỏng: {e}");
                    chu = e;
                    break;
                }
            };
            co_chat = true;
            chu = chu_cua(&manh);
            let moi = gan_doan(manh, &thieu);
            tracing::info!(kenh, xin = ?thieu, duoc = moi.len(), "muse.ai: một lượt vẽ");
            if moi.is_empty() {
                trong_lien += 1;
                if trong_lien >= 2 {
                    break;
                }
                continue;
            }
            trong_lien = 0;
            if let Err(e) = moi_luot(&moi) {
                chu = e;
                return (co, chu);
            }
            co.extend(moi);
        }
    }
    (co, chu)
}

/// Bỏ cuộc chat của mọi tab muse: gọi khi truyện đã đủ ảnh. Lỗi thì chỉ ghi
/// log — dọn không được cũng không được làm hỏng truyện đang kể.
pub fn don_het() {
    for k in 0..SO_KENH {
        don_kenh(k);
    }
}

/// Vẽ cả truyện qua muse — mỗi đoạn một ảnh (tối đa `toi_da`), SONG SONG:
/// 1. Tab đầu đọc truyện, viết hồ sơ nhân vật + phong cách (chỉ chữ, vài giây).
/// 2. Chia các đoạn thành phần 4 đoạn, giao cho tối đa `SO_KENH` tab vẽ cùng
///    lúc; mỗi tab nhận nguyên cốt truyện, hồ sơ chung và phần đoạn của mình.
/// 3. Phần nào thiếu thì tab đó hỏi bù trong cùng chat.
///
/// `moi_luot` nhận ảnh mới của TỪNG lượt — người gọi cất ngay (truyện có thể
/// đã lên khung giữa chừng). Còn thiếu đoạn nào thì người gọi vẽ bù riêng.
///
/// `ho_so_san`: hồ sơ đã có (AI viết truyện viết kèm, hay lần vẽ trước) thì
/// bỏ bước 1, các tab vẽ ngay. Trả ảnh và hồ sơ đã dùng (để người gọi cất).
pub fn ve_truyen(
    ten: &str,
    doan: &[String],
    toi_da: usize,
    ho_so_san: &str,
    moi_luot: MoiLuot<'_>,
) -> Result<(Vec<(usize, AnhMuse)>, String), String> {
    cau_noi()?;
    let can = doan_can_ve(doan.len(), toi_da);
    let (ho_so, tab_dau_da_mo) = if ho_so_san.trim().is_empty() {
        match gui(0, &loi_ho_so(ten, doan), CHO_MOT_ANH, true) {
            Ok(m) => (doc_ho_so(&m), true),
            Err(e) => {
                tracing::warn!("muse.ai: chưa lấy được hồ sơ nhân vật: {e}");
                (String::new(), false)
            }
        }
    } else {
        (ho_so_san.trim().to_string(), false)
    };
    let co_ho_so = !ho_so.is_empty();
    let giao = giao_kenh(&chia_phan(&can, DOAN_MOI_PHAN), SO_KENH);
    tracing::info!(so_tab = giao.len(), so_doan = can.len(), co_ho_so, "muse.ai: vẽ song song");
    let ket_qua: Vec<(Vec<(usize, AnhMuse)>, String)> = std::thread::scope(|s| {
        let viec: Vec<_> = giao
            .iter()
            .enumerate()
            .map(|(k, phan)| {
                let ho_so = ho_so.as_str();
                s.spawn(move || ve_kenh(k, ten, doan, ho_so, phan, k == 0 && tab_dau_da_mo && co_ho_so, moi_luot))
            })
            .collect();
        viec.into_iter()
            .map(|v| v.join().unwrap_or_else(|_| (Vec::new(), "tab muse.ai hỏng".into())))
            .collect()
    });
    let mut co: Vec<(usize, AnhMuse)> = Vec::new();
    let mut chu = String::new();
    for (anh, c) in ket_qua {
        co.extend(anh);
        if !c.is_empty() {
            chu = c;
        }
    }
    co.sort_by_key(|x| x.0);
    co.dedup_by_key(|x| x.0);
    let thieu = con_thieu(&can, &co);
    if !thieu.is_empty() {
        tracing::warn!(?thieu, "muse.ai còn thiếu ảnh — sẽ vẽ bù từng đoạn");
    }
    if co.is_empty() {
        return Err(format!("muse.ai không trả ảnh: {chu}"));
    }
    Ok((co, ho_so))
}

/// Tách hồ sơ chữ thành (phong cách, các dòng "Tên: ngoại hình") — bỏ dấu
/// markdown, gạch đầu dòng. Hàm thuần.
pub fn tach_ho_so(ho_so: &str) -> (String, String) {
    let mut phong = String::new();
    let mut nv: Vec<String> = Vec::new();
    for dong in ho_so.lines() {
        let d = dong.replace(['*', '#', '_'], "");
        let d = d.trim().trim_start_matches(['-', '•', '–']).trim();
        let Some((t, a)) = d.split_once(':') else { continue };
        let (t, a) = (t.trim(), a.trim());
        if t.is_empty() || a.is_empty() || t.chars().count() > 40 {
            continue;
        }
        if t.to_lowercase().starts_with("phong cách") {
            phong = a.chars().take(300).collect();
        } else {
            nv.push(format!("{t}: {}", a.chars().take(240).collect::<String>()));
        }
    }
    (phong, nv.join("\n"))
}

/// Ghép lại hồ sơ chữ từ hai ô cấu hình. Hàm thuần.
pub fn ghep_ho_so(phong: &str, nhan_vat: &str) -> String {
    let mut s = String::new();
    if !phong.trim().is_empty() {
        s.push_str(&format!("Phong cách: {}\n", phong.trim()));
    }
    s.push_str(nhan_vat.trim());
    s.trim().to_string()
}

/// Đuôi file theo kiểu ảnh muse báo (`image/webp`…). Hàm thuần.
pub fn duoi_cua(mime: &str) -> Option<&'static str> {
    match crate::media::duoi_tu_kieu(mime)? {
        d @ ("png" | "jpg" | "webp" | "gif" | "avif") => Some(d),
        _ => None,
    }
}

/// `GET /api/muse` — app có cầu nối muse không.
pub async fn trang_thai() -> Json<serde_json::Value> {
    Json(json!({ "co": co() }))
}

#[derive(Deserialize)]
pub struct XinVe {
    pub prompt: String,
}

/// `POST /api/muse/:design_id/ve` — vẽ một ảnh qua muse.ai, cất vào kho ảnh
/// của thiết kế, trả `{url}`. Cùng lối ra với `/s/media/:id/ai`, chỉ khác
/// chỗ vẽ.
pub async fn post_ve(
    State(st): State<Arc<AppState>>,
    AxPath(design_id): AxPath<String>,
    Json(xin): Json<XinVe>,
) -> Response {
    let loi = |ma: StatusCode, vi_sao: String| (ma, Json(json!({ "error": vi_sao }))).into_response();
    if !valid_id(&design_id) {
        return loi(StatusCode::BAD_REQUEST, "id thiết kế sai định dạng".into());
    }
    let ta = xin.prompt.trim().to_string();
    if ta.is_empty() {
        return loi(StatusCode::BAD_REQUEST, "chưa tả ảnh cần vẽ".into());
    }
    let st2 = st.clone();
    let id = design_id.clone();
    let kq = tokio::task::spawn_blocking(move || {
        let anh = ve(&ta)?;
        st2.ghi_chi_phi(&id, crate::chi_phi::VE_ANH_MUSE, &crate::chi_phi::Dung::default(), Some(0.0));
        crate::media::cat_anh_ai(&st2.layout, &id, st2.media_dem(), &anh.byte, anh.duoi)
    })
    .await
    .unwrap_or_else(|e| Err(format!("tác vụ hỏng: {e}")));
    match kq {
        Ok(url) => Json(json!({ "url": url })).into_response(),
        Err(e) => {
            tracing::warn!(thiet_ke = %design_id, "muse.ai: {e}");
            loi(StatusCode::BAD_GATEWAY, e)
        }
    }
}

#[derive(Deserialize)]
pub struct XinVeTruyen {
    pub ten: String,
    pub doan: Vec<String>,
}

/// `POST /api/muse/:design_id/ve-truyen` — đưa nguyên cốt truyện, muse vẽ một
/// mạch đủ ảnh. Trả `{anh: [{tu, url}]}` (`tu`: số đoạn, đếm từ 1).
pub async fn post_ve_truyen(
    State(st): State<Arc<AppState>>,
    AxPath(design_id): AxPath<String>,
    Json(xin): Json<XinVeTruyen>,
) -> Response {
    let loi = |ma: StatusCode, vi_sao: String| (ma, Json(json!({ "error": vi_sao }))).into_response();
    if !valid_id(&design_id) {
        return loi(StatusCode::BAD_REQUEST, "id thiết kế sai định dạng".into());
    }
    let doan: Vec<String> = xin.doan.iter().map(|d| d.trim().to_string()).filter(|d| !d.is_empty()).collect();
    if doan.is_empty() {
        return loi(StatusCode::BAD_REQUEST, "truyện chưa có đoạn nào".into());
    }
    let st2 = st.clone();
    let id = design_id.clone();
    let kq = tokio::task::spawn_blocking(move || {
        let mut ra = Vec::new();
        for (tu, a) in ve_truyen(&xin.ten, &doan, crate::anh_truyen::MOC_TOI_DA_MUSE, "", &|_| Ok(()))?.0 {
            st2.ghi_chi_phi(&id, crate::chi_phi::VE_ANH_MUSE, &crate::chi_phi::Dung::default(), Some(0.0));
            let url = crate::media::cat_anh_ai(&st2.layout, &id, st2.media_dem(), &a.byte, a.duoi)?;
            ra.push(json!({ "tu": tu, "url": url }));
        }
        Ok::<_, String>(ra)
    })
    .await
    .unwrap_or_else(|e| Err(format!("tác vụ hỏng: {e}")));
    match kq {
        Ok(anh) => Json(json!({ "anh": anh })).into_response(),
        Err(e) => {
            tracing::warn!(thiet_ke = %design_id, "muse.ai: {e}");
            loi(StatusCode::BAD_GATEWAY, e)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cac_tab_xin_cung_luc_duoc_xep_cach_nhau() {
        let t0 = Instant::now();
        let c = Duration::from_secs(30);
        // Lượt đầu gửi ngay.
        let (cho, ke) = xep_luot(None, t0, c);
        assert_eq!(cho, Duration::ZERO);
        // Các tab khác xin cùng lúc: xếp lần lượt, không gửi dồn.
        let (cho, ke) = xep_luot(Some(ke), t0, c);
        assert_eq!(cho, c);
        let (cho, ke) = xep_luot(Some(ke), t0, c);
        assert_eq!(cho, c * 2);
        // Đã qua mốc từ lâu: gửi ngay, không chờ bù, lượt sau tính từ lúc này.
        let sau = ke + Duration::from_secs(5);
        let (cho, ke) = xep_luot(Some(ke), sau, c);
        assert_eq!(cho, Duration::ZERO);
        assert_eq!(ke, sau + c);
    }

    fn anh(n: u8) -> AnhMuse {
        AnhMuse { byte: vec![n], duoi: "webp" }
    }

    #[test]
    fn loi_gui_mo_dau_bang_lenh_ve() {
        let l = loi_gui("  cậu bé dưới gốc cây  ");
        assert!(l.starts_with("Tạo 1 ảnh"));
        assert!(l.ends_with("cậu bé dưới gốc cây"));
    }

    #[test]
    fn gan_anh_theo_nhan_doan() {
        let manh = vec![
            Manh::Chu("Đoạn 1:".into()),
            Manh::Anh(anh(1)),
            Manh::Chu("Đoạn 5: cao trào".into()),
            Manh::Anh(anh(2)),
            Manh::Chu("đoạn 9".into()),
            Manh::Anh(anh(3)),
        ];
        let g = gan_doan(manh, &(1..=10).collect::<Vec<_>>());
        assert_eq!(g.iter().map(|x| x.0).collect::<Vec<_>>(), vec![1, 5, 9]);
        assert_eq!(g[1].1, anh(2));
    }

    #[test]
    fn anh_khong_nhan_lay_doan_can_ve_ke_tiep() {
        let manh = vec![
            Manh::Chu("Đoạn 2:".into()),
            Manh::Anh(anh(1)),
            Manh::Anh(anh(2)),
            Manh::Chu("Đoạn 99:".into()),
            Manh::Anh(anh(3)),
        ];
        let g = gan_doan(manh, &[2, 4, 7]);
        assert_eq!(g.iter().map(|x| x.0).collect::<Vec<_>>(), vec![2, 4, 7]);
    }

    #[test]
    fn moi_doan_mot_anh_truyen_dai_thi_chia_deu() {
        assert_eq!(doan_can_ve(11, 30), (1..=11).collect::<Vec<_>>());
        let ds = doan_can_ve(40, 10);
        assert_eq!(ds.len(), 10);
        assert_eq!(ds[0], 1);
    }

    #[test]
    fn loi_ca_truyen_co_cot_truyen_ho_so_va_phan_duoc_giao() {
        let doan: Vec<String> = vec!["Một.".into(), "Hai.".into(), "Ba.".into()];
        let l = loi_ca_truyen("Cây vú sữa", &doan, &[1, 2, 3], "");
        assert!(l.contains("cho MỖI đoạn"));
        assert!(l.contains("tổng cộng 3 ảnh, cho các đoạn: 1, 2, 3"));
        assert!(l.contains("1. Một.\n2. Hai.\n3. Ba."));
        let phan = loi_ca_truyen("Cây vú sữa", &doan, &[3], "Cậu bé: áo nâu");
        assert!(phan.contains("CHỈ vẽ các đoạn được giao") && phan.contains("cho các đoạn: 3"));
        assert!(phan.contains("Cậu bé: áo nâu"), "kèm hồ sơ chung");
        assert!(phan.contains("1. Một."), "vẫn kèm nguyên cốt truyện");
    }

    #[test]
    fn chia_phan_va_giao_tab_song_song() {
        let can: Vec<usize> = (1..=11).collect();
        let phan = chia_phan(&can, 4);
        assert_eq!(phan, vec![vec![1, 2, 3, 4], vec![5, 6, 7, 8], vec![9, 10, 11]]);
        let giao = giao_kenh(&phan, 3);
        assert_eq!(giao.len(), 3);
        assert_eq!(giao[2], vec![vec![9, 10, 11]]);
        // Nhiều phần hơn số tab: tab quay vòng nhận thêm phần.
        let giao = giao_kenh(&chia_phan(&(1..=20).collect::<Vec<_>>(), 4), 3);
        assert_eq!(giao[0].len(), 2);
        assert_eq!(giao_kenh(&chia_phan(&[1, 2], 4), 3).len(), 1, "truyện ngắn: một tab");
    }

    #[test]
    fn tach_va_ghep_ho_so() {
        let (p, nv) = tach_ho_so("**Phong cách:** màu nước ấm\n- **Thỏ:** trắng, áo gile xanh\nRùa: mai nâu, khăn đỏ\nlinh tinh");
        assert_eq!(p, "màu nước ấm");
        assert_eq!(nv, "Thỏ: trắng, áo gile xanh\nRùa: mai nâu, khăn đỏ");
        assert_eq!(ghep_ho_so(&p, &nv), "Phong cách: màu nước ấm\nThỏ: trắng, áo gile xanh\nRùa: mai nâu, khăn đỏ");
        assert_eq!(ghep_ho_so("", ""), "");
    }

    #[test]
    fn ho_so_chi_lay_chu() {
        let h = doc_ho_so(&[Manh::Chu("Phong cách:  màu nước".into()), Manh::Anh(anh(1)), Manh::Chu("Cậu bé: áo nâu".into())]);
        assert_eq!(h, "Phong cách: màu nước\nCậu bé: áo nâu");
    }

    #[test]
    fn loi_ve_tiep_xin_dung_doan_thieu_giu_nhan_vat() {
        let l = loi_ve_tiep(&[5, 6, 7]);
        assert!(l.contains("5, 6, 7") && l.contains("tổng cộng 3 ảnh") && l.contains("Giữ ĐÚNG nhân vật"));
    }

    #[test]
    fn loi_xin_cam_ghep_anh() {
        let l = loi_ca_truyen("T", &["a".into(), "b".into()], &[1, 2], "");
        assert!(l.contains("không ghép nhiều đoạn") || l.contains("không ghép nhiều đoạn, nhiều cảnh"));
        assert!(loi_ve_tiep(&[2]).contains("Không ghép"));
        assert_eq!(con_thieu(&[1, 2, 3], &[(2, anh(1))]), vec![1, 3]);
    }

    #[test]
    fn chi_nhan_kieu_anh() {
        assert_eq!(duoi_cua("image/webp"), Some("webp"));
        assert_eq!(duoi_cua("image/jpeg"), Some("jpg"));
        assert_eq!(duoi_cua("video/mp4"), None);
        assert_eq!(duoi_cua("text/html"), None);
    }
}
