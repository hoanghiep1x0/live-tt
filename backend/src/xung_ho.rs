//! Cách MC gọi người nghe — và có HAI LỐI, cố ý dùng cả hai.
//!
//! **Lối đám đông**: "cả nhà", "cả phòng", "mọi người". MC đứng trước phòng
//! nói với tất cả. Ấm, đông vui, hợp lúc chào, lúc mời thả tim.
//!
//! **Lối một người**: "bạn", và các câu rủ "nghe cùng mình", "chúng mình nghe
//! tiếp nào". MC nói với MỘT người đang ngồi xem — mà thật ra ai xem live cũng
//! đang ngồi một mình với cái điện thoại. Nghe như có người ngồi cạnh kể cho
//! mình nghe, chứ không phải loa phát thanh nói trước đám đông.
//!
//! Một buổi live chạy hàng giờ. Chỉ một lối, lặp mãi, thì chừng mười lượt là
//! người xem nghe ra máy đọc — chính cái đều đặn ấy tố cáo chứ không phải nội
//! dung. Đổi qua đổi lại hai lối là cách rẻ nhất làm giọng phòng bớt máy.
//!
//! LƯU Ý về "mình": MC luôn tự xưng "mình" (lời nhắc ở `ai.rs`), nên "mình"
//! KHÔNG phải từ gọi người nghe — "Chào mình" là vô nghĩa. Lối một người đi
//! bằng "bạn" ở chỗ gọi tên, còn "cùng mình" / "chúng mình" là câu RỦ, có hình
//! dạng ngữ pháp khác, nằm trong câu mẫu chứ không thay vào chỗ gọi.

/// Gọi cả phòng.
pub const DAM_DONG: [&str; 3] = ["cả nhà", "cả phòng", "mọi người"];
/// Gọi một người đang ngồi xem.
pub const MOT_NGUOI: [&str; 2] = ["bạn", "các bạn"];

/// Thứ tự dùng thật: XEN KẼ hai lối, không dồn một lối mấy lượt liền.
pub const CACH_GOI: [&str; 5] = ["cả nhà", "bạn", "cả phòng", "các bạn", "mọi người"];

/// Chỗ đi CÙNG ai: "nghe trọn câu chuyện cùng …". Ở chỗ này thì "tớ",
/// "mình", "chúng mình" đều đặt lọt — đây là ngôi thứ nhất, hợp lệ sau chữ
/// "cùng"; cái không lọt là chỗ GỌI người nghe ("Chào tớ" mới vô nghĩa).
pub const CUNG: [&str; 4] = ["mình", "tớ", "chúng mình", "cả nhà"];

/// Chỗ trống trong câu mẫu, thay bằng một cách gọi người nghe.
pub const O_TRONG: &str = "{nha}";
/// Chỗ trống sau chữ "cùng".
pub const O_CUNG: &str = "{cung}";

/// Cách gọi thứ `thu_tu`, xoay vòng. Hàm thuần.
///
/// Xoay vòng chứ không bốc ngẫu nhiên: ngẫu nhiên vẫn trùng liền hai lượt, mà
/// hai câu liền nhau cùng một từ thì công toi.
pub fn cach_goi(thu_tu: usize) -> &'static str {
    CACH_GOI[thu_tu % CACH_GOI.len()]
}

/// Lượt này đang gọi một người (`true`) hay cả phòng (`false`). Hàm thuần.
pub fn la_mot_nguoi(thu_tu: usize) -> bool {
    MOT_NGUOI.contains(&cach_goi(thu_tu))
}

/// Người đi cùng thứ `thu_tu`, xoay vòng. Hàm thuần.
pub fn di_cung(thu_tu: usize) -> &'static str {
    CUNG[thu_tu % CUNG.len()]
}

/// Điền mọi chỗ trống trong `mau`. Hàm thuần.
///
/// Hai vòng xoay LỆCH ĐỘ DÀI nhau (5 cách gọi, 4 người đi cùng) nên chúng
/// không bước song song: phải 20 lượt mới gặp lại đúng một cặp.
pub fn thay(mau: &str, thu_tu: usize) -> String {
    let mut ra = mau.to_string();
    if ra.contains(O_TRONG) {
        ra = ra.replace(O_TRONG, cach_goi(thu_tu));
    }
    if ra.contains(O_CUNG) {
        ra = ra.replace(O_CUNG, di_cung(thu_tu));
    }
    // Chỗ trống đứng đầu câu thì chữ thay vào là chữ thường ("cả phòng ngồi
    // xuống đây…"). Viết hoa lại — câu mẫu nào cũng mở đầu bằng chữ hoa.
    hoa_dau(&ra)
}

/// Viết hoa chữ cái đầu. Hàm thuần.
pub fn hoa_dau(s: &str) -> String {
    let mut c = s.chars();
    match c.next() {
        None => String::new(),
        Some(d) => d.to_uppercase().collect::<String>() + c.as_str(),
    }
}

/// Danh sách cho lời nhắc AI: `"cả nhà" / "cả phòng" / "mọi người"`.
pub fn ds_dam_dong() -> String {
    noi(&DAM_DONG)
}

/// Danh sách cho lời nhắc AI: `"bạn" / "các bạn"`.
pub fn ds_mot_nguoi() -> String {
    noi(&MOT_NGUOI)
}

/// Danh sách cho lời nhắc AI: `"mình" / "tớ" / "chúng mình" / "cả nhà"`.
pub fn ds_cung() -> String {
    noi(&CUNG)
}

fn noi(ds: &[&str]) -> String {
    ds.iter().map(|c| format!("\"{c}\"")).collect::<Vec<_>>().join(" / ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn xoay_vong_het_danh_sach_moi_lap_lai() {
        let n = CACH_GOI.len();
        let vong: Vec<&str> = (0..n).map(cach_goi).collect();
        let mut rieng = vong.clone();
        rieng.sort_unstable();
        rieng.dedup();
        assert_eq!(rieng.len(), n, "trong một vòng không từ nào lặp");
        assert_eq!(cach_goi(n), cach_goi(0));
        assert_eq!(cach_goi(n + 2), cach_goi(2));
    }

    #[test]
    fn hai_loi_xen_ke_chu_khong_don_mot_loi() {
        // Dùng cả hai lối, và không bao giờ ba lượt liền cùng một lối — dồn
        // một lối mấy lượt thì mất hẳn cái được của việc đổi.
        let loi: Vec<bool> = (0..CACH_GOI.len()).map(la_mot_nguoi).collect();
        assert!(loi.contains(&true), "phải có lối gọi một người");
        assert!(loi.contains(&false), "phải có lối gọi cả phòng");
        for i in 0..CACH_GOI.len() {
            let ba = [loi[i], loi[(i + 1) % loi.len()], loi[(i + 2) % loi.len()]];
            assert!(ba.contains(&true) && ba.contains(&false), "ba lượt liền cùng một lối ở {i}");
        }
    }

    #[test]
    fn nguoi_di_cung_xoay_vong_va_lech_do_dai_voi_cach_goi() {
        let n = CUNG.len();
        let vong: Vec<&str> = (0..n).map(di_cung).collect();
        let mut rieng = vong.clone();
        rieng.sort_unstable();
        rieng.dedup();
        assert_eq!(rieng.len(), n);
        assert_eq!(di_cung(n), di_cung(0));
        // Lệch độ dài thì hai vòng mới nhân lên; bằng nhau là bước song song.
        assert_ne!(CUNG.len(), CACH_GOI.len(), "hai vòng phải lệch độ dài");
        let cap: std::collections::BTreeSet<(usize, usize)> =
            (0..CUNG.len() * CACH_GOI.len()).map(|i| (i % CACH_GOI.len(), i % CUNG.len())).collect();
        assert_eq!(cap.len(), CUNG.len() * CACH_GOI.len(), "đủ mọi cặp");
    }

    #[test]
    fn thay_ca_hai_cho_trong() {
        let mau = "Đừng đi đâu nha, {nha} ở lại nghe trọn câu chuyện cùng {cung}";
        assert_eq!(thay(mau, 0), "Đừng đi đâu nha, cả nhà ở lại nghe trọn câu chuyện cùng mình");
        assert_eq!(thay(mau, 1), "Đừng đi đâu nha, bạn ở lại nghe trọn câu chuyện cùng tớ");
        assert_eq!(thay(mau, 2), "Đừng đi đâu nha, cả phòng ở lại nghe trọn câu chuyện cùng chúng mình");
        assert!(!thay(mau, 7).contains('{'), "không được sót chỗ trống");
    }

    #[test]
    fn thay_o_trong_trong_cau_mau() {
        assert_eq!(thay("Chào {nha}", 0), "Chào cả nhà");
        assert_eq!(thay("Chào {nha}", 1), "Chào bạn");
        // Chỗ trống đứng đầu câu phải được viết hoa lại.
        assert_eq!(thay("{nha} ơi, nghe tiếp nha {nha}", 2), "Cả phòng ơi, nghe tiếp nha cả phòng");
        assert_eq!(hoa_dau("đi"), "Đi");
        assert_eq!(hoa_dau(""), "");
        // Câu không có chỗ trống thì để yên, không chèn bừa.
        assert_eq!(thay("Chào cả nhà", 3), "Chào cả nhà");
        assert_eq!(thay("", 0), "");
    }

    #[test]
    fn moi_cach_goi_deu_la_tu_goi_nguoi_nghe() {
        for c in CACH_GOI {
            assert!(!c.is_empty() && !c.contains('{'));
            assert!(DAM_DONG.contains(&c) || MOT_NGUOI.contains(&c), "{c} không thuộc lối nào");
            // "mình" / "tớ" là MC TỰ XƯNG, lọt vào đây là ra "Chào mình".
            // "chúng mình" là câu rủ, có hình dạng khác, nằm trong câu mẫu.
            assert!(
                c != "mình" && c != "tớ" && c != "chúng mình",
                "{c} là từ tự xưng hoặc câu rủ, không thay vào chỗ gọi được"
            );
        }
    }
}
