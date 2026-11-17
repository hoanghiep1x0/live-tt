//! MÀN HÌNH CHÀO KẾT THÚC của phòng kể truyện.
//!
//! Người vận hành bật công tắc "Màn hình chào kết thúc" (thẻ của thiết kế,
//! khoá `ketThuc`) trước khi tắt live: sân khấu phủ màn chào kèm đồng hồ đếm
//! ngược (`Stage.tsx` của thiết kế). Phía máy chủ chỉ lo hai việc:
//! - MC nói ĐÚNG MỘT câu chào tạm biệt hợp buổi, rồi thôi gọi AI;
//! - tạm dừng truyện (giờ nghỉ `lyDo: "ket-thuc"`), để module Kể truyện không
//!   tự đọc tiếp đoạn sau khi MC im.
//!
//! Tắt công tắc là mọi thứ chạy lại như cũ. Tách riêng một tệp để không đụng
//! mã đã có; gỡ tính năng là gỡ tệp này và một chỗ gọi `ket_thuc::xu_ly` ở `ai.rs`.

use std::collections::HashSet;
use std::sync::Mutex;

use serde_json::{json, Map, Value};

use crate::state::AppState;

/// Lý do giờ nghỉ khi đang chào kết thúc.
pub const LY_DO: &str = "ket-thuc";

/// Phòng nào đã nói câu chào tạm biệt cho lần bật này.
static DA_CHAO: Mutex<Option<HashSet<String>>> = Mutex::new(None);

/// Công tắc màn chào kết thúc có đang bật trong cấu hình thiết kế không.
/// Hàm thuần.
pub fn dang(thiet_ke: &Map<String, Value>) -> bool {
    thiet_ke.get("ketThuc").and_then(Value::as_bool) == Some(true)
}

/// Câu chào tạm biệt của MC, hợp buổi. `seed` để đổi câu giữa các buổi.
/// Hàm thuần.
pub fn loi_tam_biet(buoi: &str, seed: u64) -> String {
    let dau = [
        "Buổi kể truyện hôm nay tới đây là hết rồi, cảm ơn cả nhà đã ngồi nghe cùng mình nha.",
        "Mình xin phép dừng buổi kể truyện ở đây, cảm ơn cả nhà đã ở lại với mình tới giờ này.",
        "Truyện hôm nay mình kể tới đây thôi, cảm ơn cả nhà đã nghe và trò chuyện cùng mình.",
    ];
    let cuoi = match buoi {
        "sáng" => "Chúc cả nhà một ngày thật nhiều năng lượng, hẹn gặp lại buổi sau nha!",
        "tối" => "Chúc cả nhà buổi tối thật ấm, ngủ thật ngon, hẹn gặp lại buổi sau nha!",
        "khuya" => "Khuya rồi, cả nhà ngủ ngon, mơ đẹp nha, hẹn gặp lại buổi sau!",
        _ => "Chúc cả nhà buổi chiều thật vui, hẹn gặp lại buổi sau nha!",
    };
    let i = (seed % dau.len() as u64) as usize;
    format!("{} Nhớ lưu kênh để buổi sau nghe truyện tiếp nha. {cuoi}", dau[i])
}

/// Xử lý màn chào kết thúc cho một phòng ở mỗi nhịp vòng MC. Trả `true` khi
/// màn kết đang bật — vòng MC bỏ lượt này, không kể, không gọi AI.
pub fn xu_ly(st: &AppState, id: &str, dang_phat: bool, now: i64) -> bool {
    let bat = st.design_config(id).ok().is_some_and(|c| dang(&c));
    let ly_do_nghi = st
        .module_state(id, "story")
        .ok()
        .and_then(|m| crate::truyen_sau::giai_lao(&m.config))
        .map(|(_, ly_do, _)| ly_do);
    let mut g = DA_CHAO.lock().unwrap_or_else(|e| e.into_inner());
    let da = g.get_or_insert_with(HashSet::new);

    if !bat {
        da.remove(id);
        // Vừa tắt màn kết: mở lại truyện.
        if ly_do_nghi.as_deref() == Some(LY_DO) {
            tracing::info!(thiet_ke = %id, "tắt màn chào kết thúc, kể tiếp");
            let _ = st.set_config(id, "story", json!({ "giaiLao": Value::Null }));
        }
        return false;
    }

    // Tạm dừng truyện: giờ nghỉ "ket-thuc" làm module Kể truyện thôi đọc.
    if ly_do_nghi.as_deref() != Some(LY_DO) && st.module_state(id, "story").is_ok_and(|m| m.enabled) {
        let v = json!({ "truyenSau": "", "lyDo": LY_DO, "tu": now, "batBot": false, "han": 0 });
        let _ = st.set_config(id, "story", json!({ "giaiLao": v }));
    }
    if da.insert(id.to_string()) {
        let cau = loi_tam_biet(crate::truyen_sau::khung_gio(now).0, now.unsigned_abs() / 1000);
        let giong = st.ai_config(id).giong();
        tracing::info!(thiet_ke = %id, "bật màn chào kết thúc: MC chào tạm biệt");
        if dang_phat {
            st.mc_noi(cau, giong, None, false, false, false);
        } else {
            st.mc_noi_xem_thu(id, cau, giong, None, false, false, false);
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn doc_cong_tac() {
        let mut m = Map::new();
        assert!(!dang(&m));
        m.insert("ketThuc".into(), json!(true));
        assert!(dang(&m));
        m.insert("ketThuc".into(), json!(false));
        assert!(!dang(&m));
    }

    #[test]
    fn loi_tam_biet_hop_buoi() {
        assert!(loi_tam_biet("tối", 0).contains("ngủ thật ngon"));
        assert!(loi_tam_biet("sáng", 1).contains("năng lượng"));
        assert!(loi_tam_biet("khuya", 2).contains("mơ đẹp"));
        assert!(loi_tam_biet("trưa / chiều", 0).contains("buổi chiều"));
        assert!(loi_tam_biet("tối", 0).contains("lưu kênh"));
        assert_ne!(loi_tam_biet("tối", 0), loi_tam_biet("tối", 1), "đổi câu giữa các buổi");
    }
}
