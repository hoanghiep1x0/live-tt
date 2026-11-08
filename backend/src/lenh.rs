//! Lệnh khách gõ trong bình luận — chuyển từ `parseCommand` của bản cũ
//! (D:\Live client/src/lib/session.ts).
//!
//! Đọc ở MỘT chỗ (máy chủ) rồi gắn vào mục feed (`FeedItem::lenh`): mọi cửa sổ
//! sân khấu, OBS và module cùng thấy một kết quả, không ai tự đọc lại chữ.
//!
//! Lệnh chung, phòng tự quyết dùng hay không:
//! - `ghe` / `cho` / `treu` cần mã ghế, nên chỉ có ở thiết kế tự khai sơ đồ hàng
//!   ghế (`seatRows` trong `design.json`). Phòng không khai thì không đọc.
//! - `gui` chỉ có tác dụng khi phòng bật dải chữ; `nhay` khi phòng bật sàn nhảy.
//! - "ôm" do thiết kế kể chuyện tự đọc (cảnh an ủi), không nằm ở đây.

use serde::Serialize;

/// Sơ đồ hàng ghế một thiết kế khai: số ghế hàng A, B, … rồi các hàng sau mỗi
/// hàng `sau` ghế. Ghế đánh số liền theo hàng — đúng cách thiết kế kể chuyện
/// xếp ghế (`ghe.ts`): A1…A8 là 0…7, B1 là 8…
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SoDoGhe {
    pub hang: Vec<usize>,
    pub sau: usize,
    pub tong: usize,
}

impl SoDoGhe {
    fn so_trong_hang(&self, r: usize) -> usize {
        self.hang.get(r).copied().unwrap_or(self.sau)
    }

    /// Mã ghế `"B4"` → chỉ số. Ngoài sức chứa thì `None`.
    pub fn chi_so(&self, ma: &str) -> Option<usize> {
        let ma = ma.trim().to_uppercase();
        let chu: String = ma.chars().take_while(char::is_ascii_alphabetic).collect();
        let so: usize = ma[chu.len()..].trim_start_matches('-').trim().parse().ok()?;
        if chu.len() != 1 || so == 0 {
            return None;
        }
        let r = (chu.as_bytes()[0] - b'A') as usize;
        if so > self.so_trong_hang(r) {
            return None;
        }
        let i = (0..r).map(|x| self.so_trong_hang(x)).sum::<usize>() + so - 1;
        (i < self.tong).then_some(i)
    }

    /// Ghế `i` ở NỬA PHẢI của hàng mình không (nhìn từ khán giả ra sân khấu):
    /// nửa trái là `⌈n/2⌉` ghế đầu hàng, đúng cách thiết kế chia hai bên lối
    /// giữa. `None` khi `i` ngoài phòng.
    pub fn ben_phai(&self, i: usize) -> Option<bool> {
        if i >= self.tong {
            return None;
        }
        let (mut r, mut con) = (0, i);
        while con >= self.so_trong_hang(r) {
            con -= self.so_trong_hang(r);
            r += 1;
        }
        Some(con >= self.so_trong_hang(r).div_ceil(2))
    }

    /// Chỉ số → mã ghế `"B4"`.
    pub fn ma(&self, i: usize) -> Option<String> {
        if i >= self.tong {
            return None;
        }
        let (mut r, mut con) = (0, i);
        while con >= self.so_trong_hang(r) {
            con -= self.so_trong_hang(r);
            r += 1;
        }
        let chu = char::from(b'A' + u8::try_from(r).ok().filter(|x| *x < 26)?);
        Some(format!("{chu}{}", con + 1))
    }
}

/// Lệnh đã đọc từ chữ, chưa áp vào phiên.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum LenhTho {
    /// "ghế B4"
    Ghe(String),
    /// "chỗ của tôi" (rỗng) / "chỗ K12" / "chỗ 1234" (số thứ tự toàn rạp)
    Cho(String),
    /// "gửi: lời nhắn"
    Gui(String),
    /// "nhảy" / "lên nhảy" / "quẩy"
    Nhay,
    /// "ghét Lan" / "đánh B4" — trò đánh yêu
    Treu(String),
}

/// Kết quả gắn vào mục feed, để module và thiết kế đọc.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(tag = "loai", rename_all = "kebab-case")]
pub enum Lenh {
    /// Xin ngồi ghế `ma`. `ok`: đã ngồi; không thì `lyDo` nói vì sao.
    Ghe {
        ma: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        i: Option<usize>,
        ok: bool,
        #[serde(rename = "lyDo", skip_serializing_if = "Option::is_none")]
        ly_do: Option<String>,
    },
    /// Tìm một ghế: thiết kế làm ghế `i` sáng lên một lúc.
    Cho {
        ma: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        i: Option<usize>,
    },
    Gui { chu: String },
    Nhay,
    /// Người gõ (ở ghế `tu`) chạy tới "đánh yêu" người ở ghế `den`.
    Treu {
        dich: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        tu: Option<usize>,
        #[serde(skip_serializing_if = "Option::is_none")]
        den: Option<usize>,
    },
}

/// Bỏ dấu tiếng Việt, chữ thường — để "Ghế", "ghe", "GHẾ" cùng là một lệnh.
pub fn bo_dau(s: &str) -> String {
    const BANG: &[(&str, char)] = &[
        ("àáảãạăằắẳẵặâầấẩẫậ", 'a'),
        ("èéẻẽẹêềếểễệ", 'e'),
        ("ìíỉĩị", 'i'),
        ("òóỏõọôồốổỗộơờớởỡợ", 'o'),
        ("ùúủũụưừứửữự", 'u'),
        ("ỳýỷỹỵ", 'y'),
        ("đ", 'd'),
    ];
    s.to_lowercase()
        .chars()
        .map(|c| BANG.iter().find(|(nhom, _)| nhom.contains(c)).map_or(c, |(_, b)| *b))
        .collect()
}

/// Bỏ dấu câu, biểu tượng cảm xúc ở cuối: "nhảy đi 🕺!!" vẫn là "nhảy đi".
fn bo_duoi(s: &str) -> &str {
    s.trim_end_matches(|c: char| !c.is_alphanumeric()).trim()
}

/// Mã ghế dạng "b4", "b 4", "b-4" → "B4". Hàm thuần.
fn ma_ghe(s: &str) -> Option<String> {
    let gon: String = s.chars().filter(|c| !c.is_whitespace() && *c != '-').collect();
    let chu: String = gon.chars().take_while(char::is_ascii_alphabetic).collect();
    let so = &gon[chu.len()..];
    let hop = (1..=3).contains(&chu.len())
        && (1..=3).contains(&so.len())
        && so.chars().all(|c| c.is_ascii_digit());
    hop.then(|| format!("{}{}", chu.to_uppercase(), so.trim_start_matches('0')))
}

/// Đọc lệnh trong một bình luận. Cả câu phải là lệnh — "hôm nay ghế B4 đẹp ghê"
/// không phải lệnh. Hàm thuần.
pub fn doc(chu: &str) -> Option<LenhTho> {
    let goc = chu.trim();
    if goc.is_empty() || goc.chars().count() > 160 {
        return None;
    }
    let t = bo_dau(goc);

    // "gửi: …" — giữ nguyên chữ gốc (có dấu) của lời nhắn.
    if let Some(i) = goc.find(':') {
        if matches!(bo_dau(goc[..i].trim()).as_str(), "gui" | "goi") {
            let nhan = goc[i + 1..].trim();
            return (!nhan.is_empty()).then(|| LenhTho::Gui(nhan.chars().take(120).collect()));
        }
    }

    let t = bo_duoi(&t);
    // "ghét Lan" bỏ dấu cũng bắt đầu bằng "ghe": chỉ là lệnh ghế khi phần sau
    // đúng là một mã ghế, không thì đọc tiếp các lệnh khác.
    if let Some(ma) = t.strip_prefix("ghe").and_then(ma_ghe) {
        return Some(LenhTho::Ghe(ma));
    }
    if let Some(con) = t.strip_prefix("cho").filter(|c| c.is_empty() || c.starts_with(' ')) {
        let con = con.trim();
        if matches!(con, "toi" | "cua toi") {
            return Some(LenhTho::Cho(String::new()));
        }
        if !con.is_empty() && con.len() <= 6 && con.chars().all(|c| c.is_ascii_digit()) {
            return Some(LenhTho::Cho(con.to_string()));
        }
        return ma_ghe(con).map(LenhTho::Cho);
    }

    let nhay = t.strip_prefix("len ").unwrap_or(t);
    let nhay = ["di", "nao", "nha", "nhe", "ne"]
        .iter()
        .find_map(|d| nhay.strip_suffix(&format!(" {d}")))
        .unwrap_or(nhay);
    if matches!(nhay, "nhay" | "quay" | "quay di" | "hip hop" | "hiphop" | "hip-hop") {
        return Some(LenhTho::Nhay);
    }

    for dong in ["ghet ", "danh ", "dap ", "coc ", "veo "] {
        if t.starts_with(dong) {
            // Tên người bị trêu lấy từ chữ gốc (giữ dấu), bỏ chữ lệnh đầu câu.
            let dich = goc.split_once(char::is_whitespace).map_or("", |(_, d)| d).trim();
            let dich = dich.trim_start_matches('@').trim();
            let dich: String = dich.chars().take(40).collect();
            return (!dich.is_empty()).then_some(LenhTho::Treu(dich));
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn so_do() -> SoDoGhe {
        SoDoGhe { hang: vec![8, 10, 12, 12, 14, 14], sau: 14, tong: 84 }
    }

    #[test]
    fn doc_du_cac_lenh_cua_ban_cu() {
        assert_eq!(doc("ghế B4"), Some(LenhTho::Ghe("B4".into())));
        assert_eq!(doc("Ghe b-04"), Some(LenhTho::Ghe("B4".into())));
        assert_eq!(doc("chỗ của tôi"), Some(LenhTho::Cho(String::new())));
        assert_eq!(doc("cho toi"), Some(LenhTho::Cho(String::new())));
        assert_eq!(doc("chỗ K12"), Some(LenhTho::Cho("K12".into())));
        assert_eq!(doc("chỗ 25"), Some(LenhTho::Cho("25".into())));
        assert_eq!(doc("gửi: chúc cả nhà ngủ ngon"), Some(LenhTho::Gui("chúc cả nhà ngủ ngon".into())));
        assert_eq!(doc("lên nhảy đi 🕺!!"), Some(LenhTho::Nhay));
        assert_eq!(doc("quẩy"), Some(LenhTho::Nhay));
        assert_eq!(doc("ghét @Lan Anh"), Some(LenhTho::Treu("Lan Anh".into())));
        assert_eq!(doc("đánh B4"), Some(LenhTho::Treu("B4".into())));
    }

    #[test]
    fn cau_thuong_khong_phai_lenh() {
        for c in ["hôm nay ghế B4 đẹp ghê", "nhảy đẹp quá", "cho mình hỏi", "gửi", "ghế", "ghét", "ôm bé"] {
            assert_eq!(doc(c), None, "{c}");
        }
    }

    #[test]
    fn ma_ghe_va_chi_so_khop_cach_xep_cua_thiet_ke() {
        let s = so_do();
        assert_eq!(s.chi_so("A1"), Some(0));
        assert_eq!(s.chi_so("A8"), Some(7));
        assert_eq!(s.chi_so("B1"), Some(8));
        assert_eq!(s.chi_so("G1"), Some(70));
        assert_eq!(s.chi_so("A9"), None, "hàng A chỉ có 8 ghế");
        assert_eq!(s.chi_so("Z1"), None, "ngoài sức chứa");
        for i in [0, 7, 8, 69, 70, 83] {
            assert_eq!(s.chi_so(&s.ma(i).unwrap()), Some(i));
        }
        assert_eq!(s.ma(84), None);
    }
}
