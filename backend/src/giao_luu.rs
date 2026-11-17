//! NHỊP GIAO LƯU của phòng kể truyện.
//!
//! Cứ sau `giaoLuuSau` truyện (mặc định 2), giờ nghỉ đổi truyện dài thành một
//! quãng giao lưu `giaoLuuGiay` giây (mặc định 90): MC chào TỪNG khách mới vào,
//! bắt chuyện, trò chuyện sôi nổi — điểm nhấn để người vô tình ghé vào thấy
//! phòng có người, không bỏ đi. Ngoài nhịp này mọi thứ giữ như cũ.
//!
//! Tách riêng một tệp để không đụng mã đã có: giờ nghỉ giao lưu vẫn là giờ
//! nghỉ đổi truyện bình thường (`lyDo: "chuyen"`), chỉ có thêm cờ `giaoLuu` và
//! giờ chờ dài hơn — mọi chỗ cũ đọc giờ nghỉ vẫn chạy y như trước. Muốn bỏ
//! tính năng: đặt `giaoLuuSau` = 0, hoặc gỡ các chỗ gọi `giao_luu::` ở `ai.rs`.
//!
//! Lời dặn cách nói của nhịp này đi kèm TỪNG LƯỢT (`loi_dan_luot`), ngoài thẻ
//! dữ liệu phòng — không sửa lời dặn gốc, và vẫn có hiệu lực khi MC chạy qua
//! Claude Code (lời dặn hệ thống ở đó chỉ gửi lúc mở phiên).

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

use serde_json::{json, Value};

use crate::state::AppState;

/// Sau mặc định ngần này truyện thì giao lưu một lần.
pub const SAU_MAC_DINH: u64 = 2;
/// Quãng giao lưu mặc định (giây).
pub const GIAY_MAC_DINH: i64 = 90;
/// Trong nhịp giao lưu, lượt MC cách nhau tối đa ngần này — phòng phải liên
/// tục có tiếng, khách mới vào là được chào ngay.
pub const HEN_TOI_DA: Duration = Duration::from_secs(10);
/// Mỗi lượt trong nhịp giao lưu được nói tối đa ngần này câu với khách.
pub const CAU_MOI_LUOT: usize = 2;
/// Cả nhịp giao lưu được nói tối đa ngần này câu (chặn phòng thành cái loa).
pub const CAU_MOI_NHIP: usize = 14;
/// Khách vào trước khi nhịp mở quá ngần này thì sân khấu đã chào rồi — MC
/// không chào lại họ.
const VAO_TRUOC_MS: i64 = 15_000;

/// Sau mấy truyện thì giao lưu (0 = tắt). Đọc mỗi lượt nên đổi là có hiệu
/// lực ngay. Hàm thuần.
pub fn sau_may_truyen(cfg: &Value) -> u64 {
    // Công tắc trên thẻ "Nhịp giao lưu": chưa có ô này thì coi như đang bật.
    if cfg.get("giaoLuuBat").and_then(Value::as_bool) == Some(false) {
        return 0;
    }
    cfg.get("giaoLuuSau").and_then(Value::as_u64).unwrap_or(SAU_MAC_DINH).min(10)
}

/// Quãng giao lưu (ms). Hàm thuần.
pub fn thoi_luong_ms(cfg: &Value) -> i64 {
    cfg.get("giaoLuuGiay").and_then(Value::as_i64).unwrap_or(GIAY_MAC_DINH).clamp(30, 180) * 1000
}

/// Kể xong truyện thứ `da_xong` (đếm từ 1, trong buổi này) thì có tới lượt
/// giao lưu không. Hàm thuần.
pub fn den_luot(da_xong: u64, n: u64) -> bool {
    n > 0 && da_xong > 0 && da_xong % n == 0
}

/// Số truyện đã kể xong trong buổi này, theo phòng. Đếm riêng ở đây chứ không
/// dựa vào sổ `daKe` (sổ ấy giữ cả các buổi trước).
static DA_XONG: Mutex<Option<HashMap<String, u64>>> = Mutex::new(None);

/// Ghi thêm một truyện vừa kể xong; trả số truyện đã xong trong buổi.
pub fn xong_mot_truyen(id: &str) -> u64 {
    let mut g = DA_XONG.lock().unwrap_or_else(|e| e.into_inner());
    let m = g.get_or_insert_with(HashMap::new);
    let n = m.entry(id.to_string()).or_insert(0);
    *n += 1;
    *n
}

/// Giờ nghỉ đang mở có phải nhịp giao lưu không. Hàm thuần.
pub fn dang(cfg: &Value) -> bool {
    cfg.pointer("/giaiLao/giaoLuu").and_then(Value::as_bool) == Some(true)
}

/// Nhịp giao lưu mở từ `tu`, dài `han` đã hết chưa. Hàm thuần.
pub fn het(tu: i64, now: i64, han: i64) -> bool {
    now - tu >= han.max(30_000)
}

/// Lượt này có thể là lượt cuối của nhịp — mời ở lại nghe truyện kế. Hàm thuần.
pub fn sap_het(tu: i64, now: i64, han: i64) -> bool {
    het(tu, now + 15_000, han)
}

/// Mở nhịp giao lưu: một giờ nghỉ đổi truyện có cờ `giaoLuu` và giờ chờ dài.
pub fn mo(st: &AppState, id: &str, ten_sau: &str, now: i64, han: i64) {
    tracing::info!(thiet_ke = %id, giay = han / 1000, "mở nhịp giao lưu");
    let v = json!({ "truyenSau": ten_sau, "lyDo": "chuyen", "tu": now, "batBot": false, "han": han, "giaoLuu": true });
    if let Err(e) = st.set_config(id, "story", json!({ "giaiLao": v })) {
        tracing::warn!(thiet_ke = %id, ?e, "không mở được nhịp giao lưu");
    }
}

/// Chỉ giữ trong `vuaVao` những người vào SAU khi nhịp mở (trừ hao vài giây):
/// người vào trước đó đã được sân khấu chào rồi. Hàm thuần.
pub fn loc_vua_vao(chup: &mut Value, tu: i64, now: i64) {
    let mo_tu_giay = (now - tu + VAO_TRUOC_MS).max(0) / 1000;
    if let Some(ds) = chup.get_mut("vuaVao").and_then(Value::as_array_mut) {
        ds.retain(|x| x.get("giayTruoc").and_then(Value::as_i64).is_some_and(|g| g <= mo_tu_giay));
    }
    let co = chup.get("vuaVao").and_then(Value::as_array).is_some_and(|a| !a.is_empty());
    chup["choChao"] = Value::Bool(co);
}

/// Phần "nhịp giao lưu" đưa cho MC trong tin phòng. Hàm thuần.
pub fn boi_canh(tu: i64, now: i64, han: i64) -> Value {
    json!({
        "daGiay": (now - tu).max(0) / 1000,
        "conGiay": (tu + han - now).max(0) / 1000,
        "sapHet": sap_het(tu, now, han),
    })
}

/// Lời dặn riêng của nhịp giao lưu, gửi kèm từng lượt (ngoài thẻ dữ liệu).
const CACH_NOI: &str = r#"ĐANG LÀ NHỊP GIAO LƯU ("giaoLuu" trong tin phòng) — khác giờ nghỉ thường, đây là lúc làm phòng SÔI ĐỘNG:
- Khách mới trong "vuaVao": CHÀO NGAY từng người, gọi đúng tên, giọng hồ hởi như gặp người quen, mỗi người một kiểu khác nhau (vd "Ơ Vy vào rồi kìa, chào Vy nha!", "Chào Hùng, Hùng ngồi xuống đây nghe truyện với cả nhà nè"). Chào xong bắt chuyện luôn một câu dễ trả lời: đang nghe ở đâu, giờ này đang làm gì, thích truyện gì, nghe rõ thì gõ số 1. Nhiều người cùng vào thì gom tên vào một câu chào thật vui.
- Khách đang chát ("dangCho"): đáp nhanh, vui, gọi tên, nối người này với người kia cho phòng như một nhóm bạn (vd "Lan ở Hà Nội, Mai cũng Hà Nội luôn kìa").
- Không có ai mới, không ai chát: tự tạo không khí — một câu đố vui ngắn thật dễ, rủ cả nhà gõ tên truyện muốn nghe, rủ thả tim, nhá trước truyện sắp kể cho tò mò. Mỗi lượt một trò, không lặp lại câu trong "mcVuaNoi".
- Năng lượng cao mà vẫn ấm: câu ngắn (dưới 100 ký tự), tươi, có cảm thán vừa phải; không la hét, không dồn dập quá, không xin quà, không giảng.
- Tối đa 2 câu "noi" mỗi lượt, KHÔNG "ke". "henGiay" 8–12.
- "giaoLuu.sapHet" là true: câu cuối mời mọi người ở lại, sắp vào truyện mới (nói tên "nghiGiuaTruyen.truyenSau"), chưa kể trước nội dung.
"#;

/// Lời dặn kèm lượt này nếu tin phòng đang có nhịp giao lưu. `None` ngoài nhịp.
pub fn loi_dan_luot(chup: &Value) -> Option<&'static str> {
    chup.get("giaoLuu").filter(|g| g.is_object()).map(|_| CACH_NOI)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn toi_luot_sau_moi_n_truyen() {
        assert!(!den_luot(1, 2));
        assert!(den_luot(2, 2));
        assert!(!den_luot(3, 2));
        assert!(den_luot(4, 2));
        assert!(den_luot(3, 1));
        assert!(!den_luot(2, 0), "0 là tắt");
        assert!(!den_luot(0, 2));
    }

    #[test]
    fn doc_cai_dat_va_kep_khoang() {
        assert_eq!(sau_may_truyen(&json!({})), 2);
        assert_eq!(sau_may_truyen(&json!({ "giaoLuuSau": 3 })), 3);
        assert_eq!(sau_may_truyen(&json!({ "giaoLuuSau": 0 })), 0);
        // Công tắc tắt thì thôi giao lưu, số đã đặt vẫn nằm yên trong cấu hình.
        assert_eq!(sau_may_truyen(&json!({ "giaoLuuSau": 3, "giaoLuuBat": false })), 0);
        assert_eq!(sau_may_truyen(&json!({ "giaoLuuSau": 3, "giaoLuuBat": true })), 3);
        assert_eq!(thoi_luong_ms(&json!({})), 90_000);
        assert_eq!(thoi_luong_ms(&json!({ "giaoLuuGiay": 5 })), 30_000);
        assert_eq!(thoi_luong_ms(&json!({ "giaoLuuGiay": 999 })), 180_000);
    }

    #[test]
    fn het_nhip_va_co_giao_luu() {
        assert!(!het(0, 59_000, 60_000));
        assert!(het(0, 60_000, 60_000));
        assert!(sap_het(0, 50_000, 60_000));
        assert!(dang(&json!({ "giaiLao": { "lyDo": "chuyen", "giaoLuu": true } })));
        assert!(!dang(&json!({ "giaiLao": { "lyDo": "chuyen" } })));
        assert!(!dang(&json!({ "giaiLao": null })));
    }

    #[test]
    fn chi_chao_nguoi_vao_sau_khi_nhip_mo() {
        // Nhịp mở 30 giây trước; người vào 10 giây trước thì chào, người vào
        // 80 giây trước thì sân khấu đã chào rồi.
        let mut c = json!({ "vuaVao": [
            { "ten": "Vy", "giayTruoc": 10 },
            { "ten": "Cũ", "giayTruoc": 80 },
        ], "choChao": false });
        loc_vua_vao(&mut c, 70_000, 100_000);
        let ten: Vec<&str> = c["vuaVao"].as_array().unwrap().iter().filter_map(|x| x["ten"].as_str()).collect();
        assert_eq!(ten, vec!["Vy"]);
        assert_eq!(c["choChao"], json!(true), "có người mới thì lượt này là lượt chào");
        let mut rong = json!({ "vuaVao": [], "choChao": true });
        loc_vua_vao(&mut rong, 0, 1_000);
        assert_eq!(rong["choChao"], json!(false));
    }

    #[test]
    fn loi_dan_chi_kem_trong_nhip() {
        assert!(loi_dan_luot(&json!({ "giaoLuu": { "conGiay": 40 } })).is_some());
        assert!(loi_dan_luot(&json!({})).is_none());
    }
}
