//! Sự cố đang diễn ra của một phòng: sân khấu hiện thành toast ở góc phải trên
//! của bảng xem (`ToastSuCo.tsx`). Chỉ giữ thứ phòng ĐANG mắc, hết là xoá.
//!
//! Lỗi lượt MC đi đường riêng đã có (`AppState::bao_ai`), ảnh truyện nằm trong
//! cấu hình (`anhLoi`), nên không lặp lại ở đây.

use std::path::Path;

use crate::state::AppState;
use crate::truyen_sau::MAT_KET_NOI_SAU_MS;

/// AI chưa viết được truyện, đã lấy tạm truyện trong kho.
pub const VIET_TRUYEN: &str = "viet-truyen";
/// Không chuẩn bị được truyện kế tiếp, kho cũng không có truyện dự phòng.
pub const CHUAN_BI: &str = "chuan-bi";
/// Đang nhận dữ liệu TikTok thì đứt.
pub const NGUON: &str = "nguon";
/// Nhà cung cấp giọng đọc hỏng: phòng có chữ mà không có tiếng.
pub const GIONG: &str = "giong";
/// Ổ cứng sắp đầy.
pub const O_CUNG: &str = "o-cung";

const MB: u64 = 1024 * 1024;
const GB: u64 = 1024 * MB;
/// Còn dưới ngần này là báo: công cụ AI, ảnh tạm và trình duyệt nhúng đều ghi
/// xuống ổ, cạn là chúng treo hoặc lỗi mà không nói rõ vì đâu.
pub const O_CUNG_CON_IT: u64 = GB;

fn co_chu(byte: u64) -> String {
    if byte >= GB {
        format!("{:.1} GB", byte as f64 / GB as f64)
    } else {
        format!("{} MB", byte / MB)
    }
}

/// Câu báo ổ sắp đầy, `None` là các ổ còn đủ chỗ. Hàm thuần.
pub fn loi_o_cung(ds: &[(String, u64)]) -> Option<String> {
    let it: Vec<String> = ds
        .iter()
        .filter(|(_, byte)| *byte < O_CUNG_CON_IT)
        .map(|(o, byte)| format!("Ổ {o} chỉ còn {}", co_chu(*byte)))
        .collect();
    (!it.is_empty()).then(|| format!("{}. AI, giọng đọc và ảnh có thể lỗi hoặc treo, nên dọn sớm.", it.join(", ")))
}

/// Số byte còn trống của ổ chứa `duong`.
#[cfg(windows)]
#[allow(unsafe_code)]
pub fn con_trong(duong: &str) -> Option<u64> {
    use std::os::windows::ffi::OsStrExt;

    #[link(name = "kernel32")]
    extern "system" {
        fn GetDiskFreeSpaceExW(path: *const u16, free: *mut u64, total: *mut u64, total_free: *mut u64) -> i32;
    }
    let rong: Vec<u16> = std::ffi::OsStr::new(duong).encode_wide().chain(std::iter::once(0)).collect();
    let mut trong = 0_u64;
    // SAFETY: `rong` kết thúc bằng 0, `trong` sống suốt lời gọi, hai ô còn lại
    // Windows cho phép để null.
    let ok = unsafe { GetDiskFreeSpaceExW(rong.as_ptr(), &mut trong, std::ptr::null_mut(), std::ptr::null_mut()) };
    (ok != 0).then_some(trong)
}

#[cfg(not(windows))]
pub fn con_trong(_duong: &str) -> Option<u64> {
    None
}

/// Tên ổ của một đường dẫn ("D:"), `None` nếu không phải đường dẫn Windows.
fn ten_o(duong: &Path) -> Option<String> {
    let s = duong.to_string_lossy();
    let mut c = s.chars();
    match (c.next(), c.next()) {
        (Some(o), Some(':')) if o.is_ascii_alphabetic() => Some(format!("{}:", o.to_ascii_uppercase())),
        _ => None,
    }
}

/// Canh ổ C (Temp, công cụ AI, trình duyệt nhúng) và ổ chứa dữ liệu của app.
pub fn canh_o_cung(st: &AppState, id: &str) {
    let mut cac_o = vec!["C:".to_string()];
    if let Some(o) = ten_o(&st.layout.root).filter(|o| !cac_o.contains(o)) {
        cac_o.push(o);
    }
    let ds: Vec<(String, u64)> =
        cac_o.into_iter().filter_map(|o| con_trong(&format!("{o}\\")).map(|byte| (o, byte))).collect();
    st.bao_su_co(id, O_CUNG, loi_o_cung(&ds));
}

/// Canh nguồn TikTok của phòng đang phát.
///
/// Chỉ báo khi ĐÃ nhận được dữ liệu rồi mới đứt: kênh chưa lên sóng cũng là
/// "có lỗi nguồn", báo cả lúc đó thì toast treo suốt giờ chờ. Đứt chớp nhoáng
/// rồi nối lại là chuyện thường, phải quá `MAT_KET_NOI_SAU_MS` mới báo.
#[derive(Default)]
pub struct CanhNguon {
    da_co_du_lieu: bool,
    mat_tu: Option<i64>,
}

impl CanhNguon {
    /// `co_nguon`: phòng đang phát và đã bật nguồn. `loi`: lỗi nguồn hiện tại,
    /// `None` là đang nhận dữ liệu. Trả câu cần báo, `None` là không có gì.
    pub fn nhip(&mut self, co_nguon: bool, loi: Option<&str>, now: i64) -> Option<String> {
        if !co_nguon {
            *self = Self::default();
            return None;
        }
        let Some(loi) = loi else {
            self.da_co_du_lieu = true;
            self.mat_tu = None;
            return None;
        };
        if !self.da_co_du_lieu {
            return None;
        }
        let tu = *self.mat_tu.get_or_insert(now);
        (now - tu >= MAT_KET_NOI_SAU_MS).then(|| loi.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn o_cung_con_du_cho_thi_khong_bao() {
        assert_eq!(loi_o_cung(&[("C:".into(), 2 * GB), ("D:".into(), 16 * GB)]), None);
        assert_eq!(loi_o_cung(&[]), None);
    }

    #[test]
    fn o_cung_sap_day_thi_noi_dung_o_va_so_con_lai() {
        let c = loi_o_cung(&[("C:".into(), 151 * MB), ("D:".into(), 16 * GB)]).unwrap();
        assert!(c.starts_with("Ổ C: chỉ còn 151 MB."), "{c}");
        assert!(!c.contains("D:"), "ổ còn nhiều chỗ thì không nhắc: {c}");
    }

    #[test]
    fn nhan_ten_o_tu_duong_dan() {
        assert_eq!(ten_o(Path::new(r"D:\TikTok")).as_deref(), Some("D:"));
        assert_eq!(ten_o(Path::new(r"d:\TikTok")).as_deref(), Some("D:"));
        assert_eq!(ten_o(Path::new("/mnt/D")), None);
    }

    #[test]
    fn kenh_chua_len_song_thi_khong_bao() {
        let mut c = CanhNguon::default();
        assert_eq!(c.nhip(true, Some("Kênh chưa phát live"), 0), None);
        assert_eq!(c.nhip(true, Some("Kênh chưa phát live"), 600_000), None);
    }

    #[test]
    fn dang_nhan_du_lieu_ma_dut_lau_thi_bao_noi_lai_thi_thoi() {
        let mut c = CanhNguon::default();
        assert_eq!(c.nhip(true, None, 0), None);
        assert_eq!(c.nhip(true, Some("đứt"), 1_000), None, "đứt chớp nhoáng chưa báo");
        assert_eq!(c.nhip(true, Some("đứt"), 1_000 + MAT_KET_NOI_SAU_MS).as_deref(), Some("đứt"));
        assert_eq!(c.nhip(true, None, 40_000), None);
        assert_eq!(c.nhip(true, Some("đứt"), 41_000), None, "đứt lần mới đếm lại từ đầu");
    }

    #[test]
    fn tat_nguon_thi_quen_het() {
        let mut c = CanhNguon::default();
        c.nhip(true, None, 0);
        assert_eq!(c.nhip(false, Some("đứt"), 100_000), None);
        assert_eq!(c.nhip(true, Some("đứt"), 200_000), None, "bật lại mà chưa có dữ liệu thì chưa báo");
    }
}
