//! MC gửi tin vào KHUNG CHAT của phòng live TikTok.
//!
//! Khác hẳn mọi thứ MC nói từ trước tới nay: lời trên sân khấu chỉ người đang
//! xem màn hình OBS mới thấy, còn tin ở đây đi thẳng vào khung chat của phòng,
//! ai mở TikTok cũng đọc được và nó mang tên tài khoản của chủ phòng.
//!
//! Vì vậy có HAI cái phanh, và cả hai đều cố ý chặt:
//!
//! 1. **Hạn nhịp** (`ai::duoc_chat`): mỗi 15 phút nhiều nhất `chatMoi15` tin,
//!    hai tin cách nhau ít nhất 3 phút. TikTok hạn chế tài khoản chát dày —
//!    mất tài khoản live là mất tất cả, không đáng để tiết kiệm vài giây.
//! 2. **Mặc định TẮT** (`AiCfg::chat_tiktok`). Người vận hành phải tự bật, vì
//!    đây là nói thay họ bằng chính tên họ.
//!
//! Phần gõ chữ vào ô chat nằm ở vỏ desktop (`desktop/src/chat_tiktok.rs`) —
//! nó mới có tab trang live đã đăng nhập. Máy chủ chỉ quyết ĐỊNH gửi gì, gửi
//! lúc nào; đúng cách `muse.rs` chia việc.

use std::sync::{Arc, Mutex, OnceLock};

use serde_json::Value;

use crate::state::AppState;

/// Phần vỏ desktop làm: gõ `loi` vào ô chat của tab trang live kênh `nick`
/// rồi gửi. Gọi chặn, vài giây là xong.
pub trait CauNoiChat: Send + Sync {
    fn gui(&self, nick: &str, loi: &str) -> Result<(), String>;
}

static CAU_NOI: OnceLock<Arc<dyn CauNoiChat>> = OnceLock::new();

/// Vỏ desktop cắm cầu nối vào. Gọi một lần lúc khởi động.
pub fn dat(c: Arc<dyn CauNoiChat>) {
    let _ = CAU_NOI.set(c);
}

/// Có đường gửi không (đang chạy trong app desktop).
pub fn co() -> bool {
    CAU_NOI.get().is_some()
}

/// Mốc các tin đã gửi trong buổi, để `ai::duoc_chat` xét hạn nhịp.
static LICH: Mutex<Vec<i64>> = Mutex::new(Vec::new());

/// Tin chát dài hơn mức này thì cắt (khung chat TikTok vốn ngắn).
use crate::ai::CHAT_MAX_CHU;

/// Câu chào khách mới vào, lấy từ `crowd.greet` của chính phòng đó —
/// giọng chào là của từng phòng, không viết cứng ở đây.
///
/// `{ten}` trong mẫu được thay bằng tên khách. Xoay vòng theo `thu_tu` chứ
/// không bốc ngẫu nhiên: ngẫu nhiên vẫn trùng liền hai lượt, mà chào trùng
/// câu hai người liên tiếp thì lộ ngay là máy. Hàm thuần.
pub fn cau_chao(mau: &[String], ten: &str, thu_tu: usize) -> Option<String> {
    let ten = ten.trim();
    if ten.is_empty() || mau.is_empty() {
        return None;
    }
    let c = mau[thu_tu % mau.len()].replace("{ten}", ten);
    let c = c.trim();
    if c.is_empty() {
        return None;
    }
    Some(cat(c))
}

/// Cắt cho vừa khung chat TikTok, cắt ở khoảng trắng để không đứt giữa chữ.
/// Hàm thuần.
pub fn cat(s: &str) -> String {
    if s.chars().count() <= CHAT_MAX_CHU {
        return s.to_string();
    }
    let giu: String = s.chars().take(CHAT_MAX_CHU).collect();
    match giu.rsplit_once(' ') {
        Some((dau, _)) if dau.chars().count() >= CHAT_MAX_CHU / 2 => dau.trim_end().to_string(),
        _ => giu.trim_end().to_string(),
    }
}

/// Tên khách vừa vào mà CHƯA được chát chào, lấy từ bản chụp MC (`vuaVao`).
/// Hàm thuần.
pub fn khach_moi(chup: &Value) -> Vec<String> {
    chup.get("vuaVao")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|x| x.get("name").and_then(Value::as_str).or_else(|| x.as_str()))
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

/// Thử chát chào một khách vừa vào. Trả `true` khi đã gửi thật.
///
/// Im lặng bỏ qua ở mọi cửa chưa mở — chưa bật, không chạy trong app desktop,
/// chưa tới nhịp, phòng chưa có câu chào, không có ai mới. Không chỗ nào trong
/// số đó là lỗi đáng báo động: chát chào là thứ CÓ THÌ TỐT, không được phép
/// làm hỏng lượt MC.
pub fn chao_khach(st: &AppState, design_id: &str, chup: &Value, now: i64) -> bool {
    let cfg = st.ai_config(design_id);
    if !cfg.chat_tiktok || !co() {
        return false;
    }
    let nick = st.nguon().cfg.channel.trim().trim_start_matches('@').to_lowercase();
    if nick.is_empty() {
        return false;
    }

    let ten = khach_moi(chup);
    let Some(ten) = ten.first() else { return false };

    // Giữ khoá suốt lượt gửi: hai lượt MC chồng nhau mà cùng thấy "còn nhịp"
    // thì gửi hai tin liền tay, đúng kiểu TikTok khoá tài khoản.
    let mut lich = LICH.lock().unwrap_or_else(|e| e.into_inner());
    if !crate::ai::duoc_chat(&lich, now, cfg.chat_moi_15) {
        return false;
    }

    let (mau, _) = st.crowd_dap(design_id);
    let Some(loi) = cau_chao(&mau, ten, lich.len()) else { return false };

    let Some(c) = CAU_NOI.get() else { return false };
    // Ghi mốc TRƯỚC khi gửi: gửi xong mới ghi thì lượt gửi mất vài giây là cửa
    // sổ hạn nhịp còn mở, lượt MC kế tiếp lọt qua và chát tin thứ hai.
    lich.push(now);
    let cat_bot = lich.len().saturating_sub(64);
    lich.drain(..cat_bot);
    drop(lich);

    match c.gui(&nick, &loi) {
        Ok(()) => {
            tracing::info!(thiet_ke = %design_id, kenh = %nick, %loi, "đã chát chào khách vào phòng");
            true
        }
        Err(e) => {
            // KHÔNG trả lại mốc vừa ghi: gửi hỏng thường là trang chưa sẵn
            // sàng hay chưa đăng nhập, thử lại ngay lập tức chỉ hỏng tiếp.
            tracing::warn!(thiet_ke = %design_id, kenh = %nick, loi = %e, "không chát được vào khung chat TikTok");
            false
        }
    }
}

/// Quên lịch chát của buổi trước. Gọi lúc lên sóng.
pub fn quen_lich() {
    LICH.lock().unwrap_or_else(|e| e.into_inner()).clear();
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn mau() -> Vec<String> {
        ["Chào {ten} 👋", "Chào mừng {ten} vào phòng 🙏", "{ten} vào rồi kìa, chào bạn nha"]
            .iter()
            .map(|s| (*s).to_string())
            .collect()
    }

    #[test]
    fn cau_chao_thay_ten_va_xoay_vong() {
        let m = mau();
        assert_eq!(cau_chao(&m, "Vy", 0).unwrap(), "Chào Vy 👋");
        assert_eq!(cau_chao(&m, "Vy", 1).unwrap(), "Chào mừng Vy vào phòng 🙏");
        assert_eq!(cau_chao(&m, "Vy", 2).unwrap(), "Vy vào rồi kìa, chào bạn nha");
        // Hết vòng thì quay lại câu đầu.
        assert_eq!(cau_chao(&m, "Vy", 3).unwrap(), "Chào Vy 👋");
    }

    #[test]
    fn khong_co_ten_hay_khong_co_mau_thi_khong_chat_bua() {
        assert_eq!(cau_chao(&mau(), "", 0), None);
        assert_eq!(cau_chao(&mau(), "   ", 0), None);
        assert_eq!(cau_chao(&[], "Vy", 0), None, "phòng chưa khai câu chào thì im");
        assert_eq!(cau_chao(&["   ".to_string()], "Vy", 0), None);
    }

    #[test]
    fn tin_dai_bi_cat_o_khoang_trang() {
        let dai = "a ".repeat(200);
        let ra = cat(&dai);
        assert!(ra.chars().count() <= CHAT_MAX_CHU);
        assert!(!ra.ends_with(' '));
        // Một chữ dài liền tù tì thì vẫn phải cắt, không được tràn.
        let lien = "x".repeat(400);
        assert_eq!(cat(&lien).chars().count(), CHAT_MAX_CHU);
        // Ngắn thì giữ nguyên.
        assert_eq!(cat("Chào Vy"), "Chào Vy");
    }

    #[test]
    fn doc_ten_khach_vua_vao_tu_ban_chup() {
        let chup = json!({ "vuaVao": [{ "name": "Vy" }, { "name": "  Lan " }, { "name": "" }] });
        assert_eq!(khach_moi(&chup), ["Vy", "Lan"]);
        assert!(khach_moi(&json!({})).is_empty());
        assert!(khach_moi(&json!({ "vuaVao": [] })).is_empty());
    }
}
