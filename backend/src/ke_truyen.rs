//! MC tự kể truyện từng đoạn, như bản cũ.
//!
//! Bản cũ cuốn vì chính MC kể: mỗi lượt một nhịp, bằng lời có cảm xúc, lời
//! thoại nhân vật đọc bằng giọng riêng, xen chào và đáp khách. Ở đây máy chủ
//! giữ "đang kể tới đoạn nào" của từng phòng; mỗi lượt MC nhận đúng ĐOẠN KẾ
//! TIẾP và diễn lại nó bằng lời của mình (lệnh `ke`). Số đoạn do máy chủ giữ
//! chứ không để AI tự đếm — AI đếm thì có lúc nhảy cóc, có lúc kể lại.
//!
//! Câu kể đi xuống sân khấu là một mục `host` có `ke` = chỉ số đoạn: module Kể
//! truyện bắt nó để chuyển đoạn và hiện lời kể làm phụ đề trong khung truyện.

use std::time::Duration;

use serde_json::{json, Value};

/// Tiến độ kể ở một phòng.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct TienDo {
    /// Dấu truyện (`anh_truyen::dau_truyen`). Đổi truyện là kể lại từ đầu.
    pub dau: String,
    /// Đoạn kế tiếp cần kể (đếm từ 0).
    pub tiep: usize,
    /// Vừa kể xong đoạn cuối — lượt sau MC khép truyện thay vì kể tiếp.
    pub vua_xong: bool,
    /// Lúc kể xong đoạn cuối (ms), 0 là chưa — để chờ ảnh truyện sau có hạn.
    pub xong_luc: i64,
    /// MC đã nói câu chuyển tiếp ("Chờ xíu xíu…") — lượt sau, sau nhịp nghỉ,
    /// mới đổi truyện. Khung giữ truyện cũ trong lúc MC báo chuyển.
    pub da_bao: bool,
    /// Đã có lượt nghỉ giữa hai truyện (MC chào, đáp khách) sau câu chuyển tiếp.
    pub da_nghi: bool,
    /// Lúc MC báo chuyển (ms) — mốc tính giờ nghỉ giữa hai truyện
    /// (`truyen_sau::het_giai_lao`).
    pub bao_luc: i64,
}

/// Nghỉ sau đoạn cuối, trước câu chuyển tiếp.
pub const NGHI_HET_TRUYEN: Duration = Duration::from_secs(4);
/// Nghỉ sau câu chuyển tiếp, trước lượt nghỉ chào khách.
pub const NGHI_SAU_BAO_CHUYEN: Duration = Duration::from_secs(3);
/// Nghỉ sau lượt chào khách giữa hai truyện, trước khi mở truyện mới.
pub const NGHI_TRUOC_TRUYEN_MOI: Duration = Duration::from_secs(3);

impl TienDo {
    /// Tiến độ của truyện `dau`: giữ nguyên nếu vẫn truyện đó, không thì từ đầu.
    pub fn cua(cu: Option<&TienDo>, dau: &str) -> TienDo {
        match cu {
            Some(t) if t.dau == dau => t.clone(),
            _ => TienDo { dau: dau.to_string(), ..TienDo::default() },
        }
    }

    /// MC vừa kể đoạn `i`. Hết truyện thì `lap` quyết kể lại từ đầu hay thôi.
    pub fn da_ke(&mut self, i: usize, so_doan: usize, lap: bool) {
        self.tiep = i + 1;
        self.vua_xong = false;
        if self.tiep >= so_doan {
            self.tiep = if lap { 0 } else { so_doan };
            self.vua_xong = true;
        }
    }

    /// Sân khấu vừa TỰ ĐỌC đoạn `i` (MC vắng quá lâu, `CHO_MC_MS` ở module
    /// Kể truyện): coi như đoạn đó đã kể, lượt sau MC kể tiếp từ đoạn sau.
    ///
    /// Không ghi thì máy chủ vẫn tưởng MC đang ở đoạn cũ: MC quay lại là kể
    /// lại đúng mấy đoạn phòng vừa đọc, khung truyện lùi về theo — người xem
    /// nghe một đoạn hai lần. Chỉ đi TỚI: đoạn đã qua (báo trễ, hai cửa sổ
    /// cùng báo) hay truyện đã xong thì thôi. Trả `true` khi tiến độ đổi.
    pub fn tu_doc(&mut self, i: usize, so_doan: usize, lap: bool, now: i64) -> bool {
        if self.vua_xong || i < self.tiep || i >= so_doan {
            return false;
        }
        self.da_ke(i, so_doan, lap);
        if self.vua_xong {
            self.xong_luc = now;
        }
        true
    }
}

/// Phần "kể tới đâu" đưa cho MC trong bản chụp. Hàm thuần.
pub fn boi_canh(td: &TienDo, cac_doan: &[String]) -> Value {
    let tiep = cac_doan.get(td.tiep).map(|chu| json!({ "so": td.tiep + 1, "chu": chu }));
    let vua_ke = td
        .tiep
        .checked_sub(1)
        .and_then(|i| cac_doan.get(i))
        .filter(|_| !td.vua_xong);
    json!({
        "soDoan": cac_doan.len(),
        "keTiep": tiep,
        "doanVuaKe": vua_ke,
        "daKeXong": td.vua_xong,
    })
}

/// Phần chuyển truyện của bối cảnh kể, như bản cũ. Hàm thuần.
/// - `sau`: tên truyện kế tiếp đã sẵn. Vừa kể hết (`daKeXong`) thì thêm
///   `chuyenTiep` — MC nói câu chuyển tiếp của bản cũ thay cho câu khép truyện.
/// - `truoc`: truyện vừa kể xong trước truyện này. Đang ở đoạn đầu thì thêm
///   `moDau` — MC mở bằng "MC kể thêm truyện…".
/// - `mc_sang_tac`: truyện đang kể là truyện MC tự sáng tác (không gán là cổ tích).
/// - `cho`: kể xong rồi, truyện sau có chữ nhưng ảnh chưa đủ — thêm
///   `choTruyenSau`: MC trò truyện lấp chỗ chờ, không để phòng im.
pub fn them_chuyen(
    b: &mut Value,
    td: &TienDo,
    sau: Option<&str>,
    truoc: Option<&str>,
    mc_sang_tac: bool,
    cho: Option<&str>,
    thu_tu: usize,
) {
    // `sau`: người gọi chỉ đưa khi lượt này là lượt báo chuyển tiếp.
    if let Some(t) = sau {
        // `thu_tu` (số truyện đã kể) xoay vòng kho câu chuyển tiếp — mỗi lần
        // đổi truyện một lời khác, đừng để người xem nghe mãi một câu.
        b["chuyenTiep"] =
            json!({ "truyenSau": t, "cau": crate::truyen_sau::cau_chuyen_tiep_thu(thu_tu) });
    }
    if !td.vua_xong && td.tiep == 0 {
        b["moDau"] = json!({ "truyenTruoc": truoc, "chuyenMcKe": mc_sang_tac });
    }
    if let Some(t) = cho {
        b["choTruyenSau"] = json!({ "truyenSau": t });
    }
}

/// Các từ đệm cuối câu thay nhau cho chữ "nha" — cùng nghĩa, cùng chỗ đứng.
///
/// "được chứ" KHÔNG nằm đây: nó biến câu kể thành câu hỏi, thả bừa vào giữa
/// lời kể là sai nghĩa. Bốn từ này đều đặt lọt y chỗ của "nha".
pub const TU_DEM: [&str; 4] = ["nha", "nhé", "nghen", "nhá"];
/// Ngần này lượt trong vòng xoay là BỎ HẲN từ đệm, không thay từ khác.
///
/// Đổi "nha" sang "nhé" thôi thì chưa đủ: câu nào cũng có một từ đệm ở cuối
/// vẫn nghe ra cái máy, chỉ là đổi chữ. Thỉnh thoảng cắt hẳn thì câu mới có
/// nhịp như người nói.
pub const SO_LUOT_BO: usize = 3;

/// Một chữ ở vị trí `i` trong `s` có đứng RIÊNG thành từ không (hai bên không
/// phải chữ cái) — để "nha" không trúng trong "nhanh", "nhà", "nhau". Hàm thuần.
fn dung_rieng(s: &str, i: usize, dai: usize) -> bool {
    let truoc = s[..i].chars().next_back();
    let sau = s[i + dai..].chars().next();
    let la_chu = |c: Option<char>| c.is_some_and(char::is_alphanumeric);
    !la_chu(truoc) && !la_chu(sau)
}

/// Bớt chữ "nha": GIỮ nhiều nhất một từ đệm trong câu, và đổi nó sang một từ
/// khác theo `thu_tu`.
///
/// Vì sao làm bằng mã chứ không dặn AI: dặn thì nó nhớ được vài lượt rồi quên,
/// mà "nha" đi cuối gần như mọi câu nên người xem nghe ra ngay. Một lượt MC
/// hay có hai ba chữ "nha" liền nhau — chỗ thừa bỏ hẳn, chỗ còn lại đổi từ.
///
/// Hàm thuần.
/// Hai thẻ MC NÓI VỚI KHÁCH phải cách nhau ít nhất ngần này (ms), co theo độ
/// đông của phòng.
///
/// Vì sao phải co: MC được gọi sớm mỗi khi có khách đang chờ được đáp. Phòng
/// vắng thì thỉnh thoảng mới có người chat, nên lượt MC thưa và mỗi thẻ là một
/// điểm nhấn. Phòng hai mươi nghìn người thì lúc nào cũng có người chat, nên
/// lượt MC bị kéo lên liên tục — đo thật: phòng 135 người ra 1,3 thẻ/phút, còn
/// phòng 21.000 người ra 4,6 thẻ/phút, thẻ nọ nối thẻ kia đè mất mạch truyện.
///
/// Phòng đông thì dù có đáp cũng chỉ đáp được vài người trong số hàng nghìn;
/// thà đáp thưa mà truyện liền mạch. Phòng vắng KHÔNG chặn gì: ở đó mỗi lời
/// đáp là thứ giữ người xem ở lại.
///
/// Hàm thuần.
pub fn cach_the_mc(so_nguoi: u64) -> i64 {
    match so_nguoi {
        0..=99 => 0,
        100..=999 => 20_000,
        1_000..=9_999 => 35_000,
        _ => 50_000,
    }
}

/// Câu này là MC NÓI VỚI KHÁCH (chào, đáp) chứ không phải lời dẫn truyện.
///
/// Lời dẫn — mở truyện, khép truyện, chuyển tiếp — KHÔNG bao giờ bị chặn: bỏ
/// câu "Mình kể thêm truyện …" là người xem không biết đang nghe truyện gì.
///
/// AI ghi `viec` cho mỗi câu ("dan" / "chao" / "dap"). Lỡ nó quên ghi thì xét
/// cách gọi: câu gọi tên ai đó ("Lan ơi…") hay mở bằng "Chào" là nói với khách.
///
/// Hàm thuần.
pub fn la_noi_voi_khach(chu: &str, viec: Option<&str>) -> bool {
    match viec {
        Some("chao") | Some("dap") => true,
        Some("dan") => false,
        _ => {
            let t = chu.to_lowercase();
            t.contains(" ơi") || t.starts_with("chào ")
        }
    }
}

/// Cả GIỜ NGHỈ giữa hai truyện, MC chỉ được nói ngần này câu lên thẻ giữa màn.
///
/// Trong giờ nghỉ, máy chủ ép gọi MC mỗi ≤20 giây để chuyển truyện đúng lúc ảnh
/// xong (xem `hen.min(20s)` ở `ai.rs`). Lượt nào cũng kèm một câu, nên giờ nghỉ
/// 60–90 giây thành 3–6 cái thẻ liên tiếp — đúng thứ chủ phòng kêu. Lượt vẫn
/// chạy đều để truyện lên đúng giờ; chỉ CÂU NÓI bị chặn.
///
/// Câu đáp một người cụ thể (`viec = "dap"`) KHÔNG tính vào đây: khách hỏi vào
/// phòng mà im lặng thì tệ hơn hẳn một cái thẻ thừa.
pub const CAU_MOI_GIO_NGHI: usize = 2;

/// Hai câu MC HỎI Ý KIẾN CẢ PHÒNG phải cách nhau ít nhất ngần này.
///
/// Chủ phòng nhắc ba lần rằng thẻ MC hỏi "cả nhà thấy thế nào" hiện dày quá.
/// Dặn trong lời nhắc thì AI nhớ vài lượt rồi quên, nên chặn bằng mã: lượt nào
/// hỏi sớm hơn mốc này thì câu hỏi bị bỏ, lời kể vẫn chạy như thường.
pub const HOI_PHONG_CACH_MS: i64 = 7 * 60_000;

/// MC gọi cả phòng bằng mấy chữ này. Có một trong số đó là câu nói với ĐÁM
/// ĐÔNG, không phải với một người.
const GOI_CA_PHONG: [&str; 5] = ["cả nhà", "cả phòng", "cả rạp", "các bạn", "mọi người"];

/// Câu này có phải là câu hỏi ném ra CẢ PHÒNG không.
///
/// Hai điều kiện: có dấu hỏi Ở BẤT KỲ ĐÂU trong câu, và câu ấy gọi cả phòng.
///
/// Vì sao không xét `viec`: lời nhắc định nghĩa `"dap"` là "trò truyện, đáp
/// bình luận", nên AI gắn `"dap"` cho cả câu hỏi ném ra đám đông — đo trên
/// phòng live thấy miễn trừ theo `viec` để lọt hết. Cách gọi mới là thứ phân
/// biệt được: "Cả nhà thấy cô út có thương mẹ không nè?" là hỏi cả phòng, còn
/// "Chị Sen tối nào cũng ghé nghe truyện hả?" là đáp một người — câu sau không
/// bao giờ bị chặn, vì khách nhắn vào phòng mà không ai đáp thì tệ hơn hẳn.
///
/// Câu chào (`viec = "chao"`) cũng không tính.
///
/// Hàm thuần.
pub fn hoi_ca_phong(chu: &str, viec: Option<&str>) -> bool {
    if viec == Some("chao") || !chu.contains('?') {
        return false;
    }
    let thuong = chu.to_lowercase();
    GOI_CA_PHONG.iter().any(|t| thuong.contains(t))
}

pub fn bot_tu_dem(chu: &str, thu_tu: usize) -> String {
    let thap = chu.to_lowercase();
    // Mọi từ đệm đứng riêng — KHÔNG chỉ "nha". Bản đầu chỉ bắt "nha", nên AI
    // chuyển sang viết "nhé" và chỗ lặp y nguyên, chỉ đổi chữ. Đo trên phòng
    // 900 người: ba câu MC liền nhau đều kết bằng "nhé".
    let mut vi: Vec<(usize, usize)> = Vec::new();
    for tu_dem in TU_DEM {
        let dai = tu_dem.len();
        let mut tu = 0usize;
        while let Some(k) = thap[tu..].find(tu_dem) {
            let i = tu + k;
            if dung_rieng(&thap, i, dai) {
                vi.push((i, dai));
            }
            tu = i + dai;
        }
    }
    // Sửa từ CUỐI lên đầu thì chỉ số của những chỗ trước nó không xê dịch.
    vi.sort_unstable();
    if vi.is_empty() {
        return chu.to_string();
    }
    let mut ra = chu.to_string();
    for (n, &(i, dai)) in vi.iter().enumerate().rev() {
        if n == 0 {
            // Từ đệm đầu tiên: đổi sang từ khác, hoặc BỎ HẲN nếu lượt này rơi
            // vào mấy ô "bỏ" trong vòng xoay.
            let vong = TU_DEM.len() + SO_LUOT_BO;
            let k = thu_tu % vong;
            if k < TU_DEM.len() {
                ra.replace_range(i..i + dai, TU_DEM[k]);
            } else {
                let dau = ra[..i].trim_end().len();
                ra.replace_range(dau..i + dai, "");
            }
        } else {
            // Những từ sau: bỏ hẳn, kèm khoảng trắng đứng trước nó.
            let dau = ra[..i].trim_end().len();
            ra.replace_range(dau..i + dai, "");
        }
    }
    ra
}

/// Nhiều nhất ngần này câu MC nói với khách trong MỘT lượt.
pub const CAU_TOI_DA: usize = 3;
/// Trọng số cho 1 / 2 / 3 câu nói với khách trong một lượt. Cộng lại không
/// tròn 100 — chia theo tỉ lệ, không coi là phần trăm.
///
/// Đi qua ba lần: 70 → 80 → 88 cho một câu. Lý do lần cuối: ở mức 80 thì cứ
/// khoảng bốn lượt lại có một lượt ra HAI thẻ sát nhau — đủ để chủ app thấy
/// khó chịu. Ở 88 thì gần chín phần mười số lượt chỉ còn đúng một thẻ.
pub const TRONG_SO_CAU: [u32; CAU_TOI_DA] = [88, 10, 2];

/// Lượt này cho MC nói mấy câu với khách: 1, 2 hay 3 theo `TRONG_SO_CAU`.
///
/// Mỗi câu với khách là một lần khung truyện phải nhường chỗ, nên ba câu liền
/// là mạch truyện đứt hẳn một quãng. Phần lớn lượt chỉ một câu.
///
/// `seed` lấy từ mốc thời gian của lượt nên hàm vẫn THUẦN. Hàm thuần.
pub fn so_cau_voi_khach(seed: u64) -> usize {
    let tong: u32 = TRONG_SO_CAU.iter().sum();
    // Băm cho tản đều: mốc ms liền nhau mà chia thẳng thì ra mấy giá trị sát nhau.
    let bam = seed.wrapping_mul(6_364_136_223_846_793_005).rotate_left(29);
    let mut r = (bam % u64::from(tong)) as u32;
    for (i, w) in TRONG_SO_CAU.iter().enumerate() {
        if r < *w {
            return i + 1;
        }
        r -= *w;
    }
    1
}

/// MC tự xưng "mình", không bao giờ "MC": đổi mọi chữ "MC" đứng riêng thành
/// "mình" — đầu câu thì "Mình". Hàm thuần.
pub fn xung_minh(s: &str) -> String {
    let cs: Vec<char> = s.chars().collect();
    let mut ra = String::with_capacity(s.len());
    let mut i = 0;
    while i < cs.len() {
        let rieng = cs[i] == 'M'
            && cs.get(i + 1) == Some(&'C')
            && (i == 0 || !cs[i - 1].is_alphanumeric())
            && cs.get(i + 2).is_none_or(|c| !c.is_alphanumeric());
        if rieng {
            // Đầu câu: chưa có chữ nào, hay ngay sau dấu kết câu.
            let truoc = cs[..i].iter().rev().find(|c| !c.is_whitespace());
            let dau_cau = truoc.is_none_or(|c| matches!(c, '.' | '!' | '?' | '…' | ':' | '"' | '“' | '\n'));
            ra.push_str(if dau_cau { "Mình" } else { "mình" });
            i += 2;
        } else {
            ra.push(cs[i]);
            i += 1;
        }
    }
    ra
}

/// Tách lời dẫn của MC lỡ lẫn vào đầu lời kể: câu đầu mở bằng "MC kể…",
/// "Chờ xíu…", "Cả nhà ơi…" thì tách ra (nói riêng bằng "noi"), phần còn lại là
/// lời kể hiện trong khung truyện. Hàm thuần.
pub fn tach_loi_dan(ke: &str) -> (Option<String>, String) {
    let t = ke.trim();
    let thuong = t.to_lowercase();
    let la_dan = [
        "mc kể", "mc xin kể", "mc sẽ kể", "giờ mc kể", "bây giờ mc", "tiếp theo mc",
        "mình kể", "mình xin kể", "mình sẽ kể", "giờ mình kể", "bây giờ mình", "tiếp theo mình",
        "chờ xíu", "cả nhà ơi",
    ]
        .iter()
        .any(|d| thuong.starts_with(d));
    if !la_dan {
        return (None, t.to_string());
    }
    // Hết câu đầu: dấu . ! … ? theo sau là khoảng trắng.
    let mut cat = None;
    let cs: Vec<(usize, char)> = t.char_indices().collect();
    for (k, (i, ch)) in cs.iter().enumerate() {
        if matches!(ch, '.' | '!' | '?' | '…') && cs.get(k + 1).is_some_and(|(_, n)| n.is_whitespace()) {
            cat = Some(i + ch.len_utf8());
            break;
        }
    }
    match cat {
        Some(i) if !t[i..].trim().is_empty() => (Some(t[..i].trim().to_string()), t[i..].trim().to_string()),
        _ => (None, t.to_string()),
    }
}

/// Cách kể của module Kể truyện (ô `cachKe`): "mc-day-du" (mặc định — MC, AI
/// diễn từng đoạn) hay "tu-doc". Cấu hình cũ: suy từ `nguoiKe`; "mc-tiet-kiem"
/// (chế độ lời kể viết sẵn, đã bỏ) coi như MC. Hàm thuần.
pub fn cach_ke(cfg: &Value) -> &'static str {
    let tu_doc = match cfg.get("cachKe").and_then(Value::as_str) {
        Some("tu-doc") => true,
        Some(_) => false,
        None => cfg.get("nguoiKe").and_then(Value::as_str) == Some("tu-doc"),
    };
    if tu_doc { "tu-doc" } else { "mc-day-du" }
}

/// MC có kể truyện không. Hàm thuần.
pub fn mc_ke(cfg: &Value) -> bool {
    cach_ke(cfg) != "tu-doc"
}

/// Sân khấu phòng `id` báo đã tự đọc đoạn `i` của truyện `ten` (tin `tu-doc`
/// qua `/ws`). Chỉ nhận khi MC đang kể (`mc_ke`) và đúng truyện đang ở khung
/// — truyện đã đổi thì tin cũ, bỏ. Trả `true` khi tiến độ đổi.
pub fn bao_tu_doc(st: &crate::state::AppState, id: &str, ten: &str, i: usize) -> bool {
    let Ok(m) = st.module_state(id, "story") else { return false };
    if !m.enabled || !mc_ke(&m.config) {
        return false;
    }
    let tieu_de = m.config.get("title").and_then(Value::as_str).unwrap_or_default();
    if tieu_de.trim() != ten.trim() {
        return false;
    }
    let cac_doan =
        crate::anh_truyen::cat_doan(m.config.get("passages").and_then(Value::as_str).unwrap_or_default());
    let dau = crate::anh_truyen::dau_truyen(tieu_de, &cac_doan);
    let mut td = st.tien_do_ke(id, &dau);
    // MC kể thì "Tự chuyển truyện mới" luôn bật (`truyen_sau::tu_chuyen`):
    // hết truyện là sang truyện sau, không vòng lại.
    if !td.tu_doc(i, cac_doan.len(), false, crate::state::bay_gio_ms()) {
        return false;
    }
    tracing::info!(thiet_ke = %id, doan = i + 1, "sân khấu tự đọc thay MC — MC kể tiếp từ đoạn sau");
    st.ghi_tien_do_ke(id, td);
    true
}

/// Lúc máy chủ mở: phòng chưa có ô `cachKe`, hay còn "mc-tiet-kiem" (chế độ đã
/// bỏ), thì ghi cách kể chuẩn — sân khấu và máy chủ đọc cùng một ô.
pub fn chuyen_cau_hinh_cu(st: &crate::state::AppState) {
    for d in st.designs() {
        let id = d.manifest.id.clone();
        let Ok(m) = st.module_state(&id, "story") else { continue };
        // Phòng không có cấu hình Kể truyện (sàn bar…): không đụng tới — ghi
        // vào là tự dưng tạo cấu hình một tính năng phòng đó không dùng.
        if m.config.as_object().is_none_or(serde_json::Map::is_empty) {
            continue;
        }
        let co = m.config.get("cachKe").and_then(Value::as_str);
        if matches!(co, Some("mc-day-du" | "tu-doc")) {
            continue;
        }
        let cach = cach_ke(&m.config);
        match st.set_config(&id, "story", json!({ "cachKe": cach })) {
            Ok(()) => tracing::info!(thiet_ke = %id, %cach, "chuẩn hoá cách kể"),
            Err(e) => tracing::warn!(thiet_ke = %id, ?e, "không chuẩn hoá được cách kể"),
        }
    }
}

/// Lúc máy chủ mở: phòng có Kể truyện mà chưa từng phân vai giọng thì giao
/// mọi việc cho một giọng nữ của dàn (và giọng dẫn truyện nếu còn trống) — quên
/// chỉnh vẫn có giọng đọc. Một lần (`daDat`): người vận hành chỉnh rồi thì giữ.
pub fn dat_vai_giong_mac_dinh(st: &crate::state::AppState) {
    let Some(nu) = crate::voice::giong_nu(&crate::voice::read(&st.layout)) else { return };
    for d in st.designs() {
        let id = d.manifest.id.clone();
        let Ok(m) = st.module_state(&id, "story") else { continue };
        if m.config.as_object().is_none_or(serde_json::Map::is_empty) {
            continue;
        }
        let ai = st.ai_config(&id);
        if ai.vai_giong.da_dat {
            continue;
        }
        let mut va = json!({ "vaiGiong": ai.vai_giong.mac_dinh(&nu) });
        if ai.voice_id.trim().is_empty() {
            va["voiceId"] = json!(nu);
        }
        match st.set_ai_config(&id, va) {
            Ok(()) => tracing::info!(thiet_ke = %id, %nu, "đặt giọng nữ mặc định cho mọi việc"),
            Err(e) => tracing::warn!(thiet_ke = %id, ?e, "không đặt được giọng mặc định"),
        }
    }
}

/// Lên sóng buổi mới: nếu khung đang giữ một truyện ĐÃ KỂ ở phòng này thì bỏ
/// nó đi, để màn chờ (đồng hồ, lời chào) lên trước — TikTok coi việc mở màn
/// bằng đúng nội dung buổi trước là phát lại. Truyện mới do `truyen_sau.rs`
/// chuẩn bị, MC mở ngay sau đó. Truyện người vận hành tự đặt (chưa kể bao giờ)
/// thì giữ nguyên.
pub fn don_truyen_cu(st: &crate::state::AppState, id: &str) {
    let Ok(m) = st.module_state(id, "story") else { return };
    if !m.enabled {
        return;
    }
    let cfg = m.config;
    let ten = cfg.get("title").and_then(Value::as_str).unwrap_or_default().trim().to_string();
    if ten.is_empty() {
        return;
    }
    // MC tắt (phòng tự đọc) thì không dọn: không ai chuẩn bị truyện mới, dọn
    // xong là khung trống mãi.
    if !mc_ke(&cfg) {
        return;
    }
    let gon = |t: &str| t.trim().to_lowercase();
    let so = crate::truyen_sau::da_ke(&cfg);
    // Truyện này đã kể rồi, HOẶC phòng từng kể buổi trước (truyện đang nằm
    // trên khung là của buổi đó, kể dở cũng vậy).
    let cu = !so.is_empty()
        || so.iter().any(|t| gon(t) == gon(&ten))
        || crate::kho_da_ke::ten_trong_kho(&crate::kho_da_ke::doc(&st.layout, id))
            .iter()
            .any(|t| gon(t) == gon(&ten));
    if !cu {
        return;
    }
    // Cất kèm ảnh trước khi bỏ: kho giữ bản đầy đủ để kể lại sau này.
    crate::kho_da_ke::luu(st, id, &cfg);
    let kq = st.set_config(
        id,
        "story",
        json!({ "title": "", "passages": "", "moc": [], "hoSoCua": "", "hoSoTruyen": "", "anhLoi": "" }),
    );
    match kq {
        Ok(()) => tracing::info!(thiet_ke = %id, %ten, "buổi live mới: bỏ truyện của buổi trước, mở bằng màn chờ"),
        Err(e) => tracing::warn!(thiet_ke = %id, ?e, "không dọn được truyện cũ"),
    }
}

/// Đọc hết chừng này chữ mất bao lâu, cộng một hơi nghỉ — để lượt sau tới
/// đúng lúc MC đọc xong, mạch truyện liền mà không đè tiếng. Giọng đọc tiếng
/// Việt chừng 14 ký tự một giây ở tốc độ thường. Hàm thuần.
/// Hẹn lượt MC kế tiếp sau một lượt CÓ kể, để mạch truyện liền: đọc hết lời
/// kể, nghỉ một nhịp, đọc lời chào (nếu có) — TRỪ đi thời gian AI nghĩ lượt
/// sau (`tre`, đo ở lượt vừa rồi), để đoạn kế tới đúng lúc đoạn này vừa dứt
/// chứ không phải chờ thêm. Tới sớm cũng không sao: sân khấu xếp đoạn kế sau
/// đoạn đang đọc. Hàm thuần.
/// Nghỉ giữa hai đoạn kể: 3–5 giây, bốc theo mốc.
///
/// Chủ phòng chốt: phải có một quãng hở sau mỗi đoạn để lời chào khách vừa vào
/// chen vào. Trước đây lời chào có làn giọng riêng chạy SONG SONG với lời kể —
/// nghe ra hai người nói cùng lúc, nên bỏ. Giờ nó xếp vào hàng đọc chính, và
/// quãng hở này là chỗ dành cho nó. Không có ai để chào thì quãng hở cũng là
/// một nhịp thở giữa hai đoạn, nghe dễ chịu hơn kể một mạch.
///
/// Bốc ngẫu nhiên để không thành máy đếm nhịp; `seed` lấy từ đồng hồ nên hàm
/// vẫn THUẦN.
pub const NGHI_DOAN_NGAN_MS: u64 = 3_000;
pub const NGHI_DOAN_DAI_MS: u64 = 5_000;

pub fn nghi_giua_doan(seed: u64) -> Duration {
    let khoang = NGHI_DOAN_DAI_MS - NGHI_DOAN_NGAN_MS;
    let bam = seed.wrapping_mul(6_364_136_223_846_793_005).rotate_left(29);
    Duration::from_millis(NGHI_DOAN_NGAN_MS + bam % (khoang + 1))
}

pub fn hen_luot_ke(so_chu_ke: usize, so_chu_noi: usize, tre: Duration) -> Duration {
    let doc = |n: usize| Duration::from_millis((n as u64) * 1_000 / 14);
    let nghi = if so_chu_noi > 0 { Duration::from_millis(1_200) } else { Duration::ZERO };
    let ca = doc(so_chu_ke) + nghi + doc(so_chu_noi);
    ca.saturating_sub(tre.min(Duration::from_secs(12))).max(Duration::from_secs(2))
}

pub fn thoi_gian_doc(so_chu: usize) -> Duration {
    let giay = (so_chu as u64).div_ceil(14) + 3;
    Duration::from_secs(giay.clamp(8, 45))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn so_cau_voi_khach_theo_dung_trong_so() {
        // Luôn trong khoảng 1..=3, không bao giờ 0 hay quá trần.
        for seed in [0u64, 1, 7, 977, 1_794_000_000_000, u64::MAX] {
            let n = so_cau_voi_khach(seed);
            assert!((1..=CAU_TOI_DA).contains(&n), "seed {seed} ra {n}");
        }
        // Đếm trên nhiều mốc: một câu phải là phần lớn, ba câu phải hiếm nhất.
        let mut dem = [0usize; CAU_TOI_DA];
        for i in 0..6_000u64 {
            dem[so_cau_voi_khach(1_794_000_000_000 + i * 977) - 1] += 1;
        }
        assert!(dem[0] > dem[1], "một câu phải nhiều hơn hai câu: {dem:?}");
        assert!(dem[1] > dem[2], "hai câu phải nhiều hơn ba câu: {dem:?}");
        assert!(dem[0] * 100 / 6_000 > 45, "một câu phải chiếm phần lớn: {dem:?}");
        assert!(dem.iter().all(|&x| x > 0), "kiểu nào cũng phải có lúc ra: {dem:?}");
    }

    #[test]
    fn doi_chu_nha_sang_tu_khac_va_bo_cho_lap() {
        // Một chữ: giữ lại, đổi từ theo thứ tự.
        assert_eq!(bot_tu_dem("Chào Vy nha", 0), "Chào Vy nha");
        assert_eq!(bot_tu_dem("Chào Vy nha", 1), "Chào Vy nhé");
        assert_eq!(bot_tu_dem("Chào Vy nha", 2), "Chào Vy nghen");
        // Vòng xoay có cả mấy ô BỎ HẲN từ đệm, nên hết vòng là `TU_DEM + SO_LUOT_BO`.
        let vong = TU_DEM.len() + SO_LUOT_BO;
        assert_eq!(bot_tu_dem("Chào Vy nha", vong), "Chào Vy nha", "hết vòng quay lại");
        // Mấy ô cuối vòng cắt hẳn từ đệm — câu mới có nhịp như người nói.
        assert_eq!(bot_tu_dem("Chào Vy nha", TU_DEM.len()), "Chào Vy");
        let co_tu_dem = (0..vong)
            .filter(|i| TU_DEM.iter().any(|t| bot_tu_dem("Chào Vy nha", *i).ends_with(t)))
            .count();
        assert_eq!(co_tu_dem, TU_DEM.len(), "đúng {} lượt có từ đệm", TU_DEM.len());

        // Hai ba chữ trong một lượt: giữ chữ ĐẦU, bỏ hẳn mấy chữ sau.
        assert_eq!(bot_tu_dem("Ngồi nghe nha, vui lắm nha", 1), "Ngồi nghe nhé, vui lắm");
        assert_eq!(bot_tu_dem("A nha B nha C nha", 0), "A nha B C");
    }

    #[test]
    fn gian_cach_the_mc_co_theo_do_dong() {
        // Phòng vắng KHÔNG chặn gì: ở đó mỗi lời đáp là thứ giữ người xem.
        assert_eq!(cach_the_mc(0), 0);
        assert_eq!(cach_the_mc(99), 0);
        // Càng đông càng thưa, không bao giờ ngược lại.
        let moc = [100u64, 999, 1_000, 9_999, 10_000, 21_000, u64::MAX];
        let ds: Vec<i64> = moc.iter().map(|n| cach_the_mc(*n)).collect();
        for (i, c) in ds.iter().enumerate().skip(1) {
            assert!(*c >= ds[i - 1], "{moc:?} ra {ds:?}");
        }
        // Đo thật: phòng 21.000 người ra 4,6 thẻ/phút (cách nhau ~13 giây).
        // Giãn cách phải thưa hơn thế hẳn thì mới đỡ đè mạch truyện.
        assert!(cach_the_mc(21_000) >= 40_000, "phòng 21.000 người: {:?}", cach_the_mc(21_000));
    }

    #[test]
    fn loi_dan_truyen_khong_bao_gio_bi_chan() {
        // Bỏ câu "Mình kể thêm truyện …" là người xem không biết đang nghe gì.
        assert!(!la_noi_voi_khach("Mình kể thêm truyện Thạch Sanh cho cả nhà nghe nhé.", Some("dan")));
        assert!(!la_noi_voi_khach("Mình kể thêm truyện Thạch Sanh cho cả nhà nghe nhé.", None));
        assert!(!la_noi_voi_khach("Trầu cau thắm thiết thật.", None));
        // Chào và đáp thì có.
        assert!(la_noi_voi_khach("Chào Vy vào phòng", Some("chao")));
        assert!(la_noi_voi_khach("pinky ơi, mình chào bạn nhé", Some("dap")));
        // AI quên ghi việc: xét cách gọi.
        assert!(la_noi_voi_khach("Khánh Hân, Thanhnghia ơi, mình chào hai bạn nhé", None));
        assert!(la_noi_voi_khach("Chào hangvokhachvi, mình chào bạn nhé", None));
    }

    #[test]
    fn chi_chan_cau_hoi_nem_ra_ca_phong() {
        // Mấy câu THẬT lấy từ phòng live, đúng thứ chủ phòng kêu hiện dày.
        assert!(hoi_ca_phong(
            "Cả nhà thấy cô út có thương mẹ không nè? Ai thích cô út thả tim nhé.",
            Some("dap")
        ));
        assert!(hoi_ca_phong("Các bạn thấy mẹo hát của dê con thế nào?", Some("dap")));
        // Đáp một người cụ thể thì KHÔNG chặn, dù có dấu hỏi: khách nhắn vào
        // phòng mà không ai đáp còn tệ hơn.
        assert!(!hoi_ca_phong("Chị Sen tối nào cũng ghé nghe truyện hả?", Some("dap")));
        assert!(!hoi_ca_phong("Trúc ơi, bạn thấy đoạn này sao?", Some("dap")));
        // Chủ phòng kêu thẻ MC hỏi "cả nhà thấy thế nào" hiện dày quá, nên câu
        // hỏi chung bị đếm nhịp. Nhận ra được cả khi cuối câu có biểu tượng.
        assert!(hoi_ca_phong("Cả nhà thấy truyện này thế nào?", None));
        assert!(hoi_ca_phong("Cả nhà đoán thử xem sao? 😊", Some("noi")));
        assert!(!hoi_ca_phong("Bạn đoán thử xem sao?", Some("noi")), "không gọi cả phòng");
        // Dấu hỏi nằm GIỮA câu cũng là câu hỏi — đây là kiểu MC hay viết nhất,
        // đo trên phòng live thấy bản chỉ xét cuối câu để lọt gần hết.
        assert!(hoi_ca_phong(
            "Thầy đồ nói liều ghê ha, cả nhà thấy buồn cười không nè? Lát nữa mình kể tiếp.",
            Some("noi")
        ));
        // Câu kể thường thì không phải câu hỏi.
        assert!(!hoi_ca_phong("Mình kể tiếp nhé.", None));
        assert!(!hoi_ca_phong("Chờ xíu xíu thôi!", Some("noi")));
        // Chào và ĐÁP một người cụ thể thì KHÔNG chặn, dù có dấu hỏi: khách
        // nói vào phòng mà không ai đáp còn tệ hơn một câu hỏi thừa.
        assert!(!hoi_ca_phong("Lan ơi, bạn thấy đoạn này sao?", Some("dap")));
        assert!(!hoi_ca_phong("Chào cả nhà, cả nhà khoẻ không?", Some("chao")), "câu chào thì thôi");
    }

    #[test]
    fn nhip_hoi_phong_thua_han_mot_truyen() {
        // Một truyện chạy chừng ba phút; nhịp hỏi phải THƯA hơn thế, không thì
        // truyện nào cũng bị cắt ngang bằng một câu hỏi.
        assert!(
            HOI_PHONG_CACH_MS >= 5 * 60_000,
            "nhịp hỏi cả phòng phải thưa hơn một truyện, đang là {HOI_PHONG_CACH_MS}ms"
        );
    }

    #[test]
    fn khong_dung_vao_chu_khac_co_chua_nha() {
        // "nhà", "nhanh", "nhau" KHÔNG phải từ đệm — đụng vào là hỏng nghĩa.
        for x in ["Về nhà thôi", "Chạy nhanh lên", "Ngồi cùng nhau", "Nhà nhanh nhau"] {
            assert_eq!(bot_tu_dem(x, 1), x, "không được sửa: {x}");
        }
        // Không có từ đệm nào thì để yên.
        assert_eq!(bot_tu_dem("", 0), "");
        assert_eq!(bot_tu_dem("Ngày xưa có một ông lão.", 3), "Ngày xưa có một ông lão.");
    }

    #[test]
    fn giu_dau_cau_va_chu_hoa_quanh_tu_dem() {
        assert_eq!(bot_tu_dem("Nghe cùng mình nha!", 1), "Nghe cùng mình nhé!");
        assert_eq!(bot_tu_dem("Nghe nha 😊", 1), "Nghe nhé 😊");
        // Chữ "nha" viết hoa cũng là từ đệm.
        assert_eq!(bot_tu_dem("Nghe Nha", 1), "Nghe nhé");
    }

    use super::*;

    fn doan() -> Vec<String> {
        vec!["Một.".into(), "Hai.".into(), "Ba.".into()]
    }

    #[test]
    fn ke_lan_luot_tung_doan_roi_vong_lai() {
        let mut td = TienDo::cua(None, "d1");
        assert_eq!(boi_canh(&td, &doan())["keTiep"]["so"], json!(1));
        td.da_ke(0, 3, true);
        td.da_ke(1, 3, true);
        let b = boi_canh(&td, &doan());
        assert_eq!(b["keTiep"]["chu"], json!("Ba."));
        assert_eq!(b["doanVuaKe"], json!("Hai."));
        td.da_ke(2, 3, true);
        let b = boi_canh(&td, &doan());
        assert_eq!(b["daKeXong"], json!(true), "vừa xong thì MC khép truyện");
        assert_eq!(b["keTiep"]["so"], json!(1), "có lặp thì lượt sau kể lại từ đầu");
    }

    #[test]
    fn san_khau_tu_doc_thi_mc_ke_tiep_tu_doan_sau() {
        let mut td = TienDo::cua(None, "d1");
        td.da_ke(0, 3, false);
        // MC vắng, sân khấu tự đọc đoạn 2: lượt sau MC kể đoạn 3, không kể lại đoạn 2.
        assert!(td.tu_doc(1, 3, false, 5));
        assert_eq!(boi_canh(&td, &doan())["keTiep"]["so"], json!(3));
        // Báo trễ / cửa sổ khác báo lại đoạn cũ: không lùi.
        assert!(!td.tu_doc(0, 3, false, 6));
        assert!(!td.tu_doc(1, 3, false, 6));
        assert_eq!(td.tiep, 2);
        // Tự đọc tới đoạn cuối: truyện xong, ghi mốc xong để chờ truyện sau.
        assert!(td.tu_doc(2, 3, false, 9));
        assert!(td.vua_xong);
        assert_eq!(td.xong_luc, 9);
        // Đã xong thì báo gì cũng thôi; số đoạn lạ cũng bỏ.
        assert!(!td.tu_doc(2, 3, false, 10));
        assert!(!TienDo::cua(None, "d1").tu_doc(7, 3, false, 1));
    }

    #[test]
    fn khong_lap_thi_het_truyen_la_thoi() {
        let mut td = TienDo::cua(None, "d1");
        td.da_ke(2, 3, false);
        assert!(boi_canh(&td, &doan())["keTiep"].is_null());
    }

    #[test]
    fn doi_truyen_thi_ke_lai_tu_dau() {
        let mut td = TienDo::cua(None, "d1");
        td.da_ke(1, 3, true);
        assert_eq!(TienDo::cua(Some(&td), "d1").tiep, 2);
        assert_eq!(TienDo::cua(Some(&td), "d2").tiep, 0);
    }

    #[test]
    fn thoi_gian_doc_theo_do_dai_cau() {
        assert_eq!(thoi_gian_doc(0), Duration::from_secs(8));
        assert_eq!(thoi_gian_doc(140), Duration::from_secs(13));
        assert_eq!(thoi_gian_doc(5_000), Duration::from_secs(45));
    }

    #[test]
    fn chuyen_truyen_nhu_ban_cu() {
        let mut td = TienDo::cua(None, "d");
        let mut b = boi_canh(&td, &doan());
        them_chuyen(&mut b, &td, None, Some("Trước"), false, None, 0);
        assert_eq!(b["moDau"]["truyenTruoc"], json!("Trước"), "đoạn đầu: mở bằng MC kể thêm truyện");
        assert!(b.get("chuyenTiep").is_none());

        for i in 0..3 {
            td.da_ke(i, 3, false);
        }
        let mut b = boi_canh(&td, &doan());
        them_chuyen(&mut b, &td, Some("Sau"), None, false, None, 0);
        assert_eq!(b["chuyenTiep"]["truyenSau"], json!("Sau"));
        assert!(b["chuyenTiep"]["cau"].as_str().unwrap().starts_with("Chờ xíu xíu"));

        // Truyện sau chưa sẵn: khép truyện như thường.
        let mut b = boi_canh(&td, &doan());
        them_chuyen(&mut b, &td, None, None, false, Some("Sau"), 0);
        assert!(b.get("chuyenTiep").is_none());
        assert_eq!(b["choTruyenSau"]["truyenSau"], json!("Sau"), "ảnh chưa đủ: MC lấp chỗ chờ");
    }


    #[test]
    fn tach_loi_dan_mc_khoi_loi_ke() {
        let (d, k) = tach_loi_dan(
            "MC kể thêm truyện Ông Ba đếm vịt nha. Ngày xưa, ở đầu làng có ông Ba nuôi một đàn vịt.",
        );
        assert_eq!(d.as_deref(), Some("MC kể thêm truyện Ông Ba đếm vịt nha."));
        assert_eq!(k, "Ngày xưa, ở đầu làng có ông Ba nuôi một đàn vịt.");
        let (d, k) = tach_loi_dan("Ngày xưa có cậu bé. MC kể tiếp nha.");
        assert!(d.is_none());
        assert!(k.starts_with("Ngày xưa"));
        // Chỉ có câu dẫn, không có lời kể: giữ nguyên, không làm mất đoạn.
        assert!(tach_loi_dan("MC kể thêm truyện X nha.").0.is_none());
    }


    #[test]
    fn nghi_giua_hai_doan_ke_luon_trong_3_5_giay() {
        // Quãng hở sau mỗi đoạn, để lời chào khách vừa vào chen vào.
        for seed in [0u64, 1, 7, 977, 1_794_000_000_000, u64::MAX] {
            let d = nghi_giua_doan(seed);
            assert!(
                (Duration::from_secs(3)..=Duration::from_secs(5)).contains(&d),
                "seed {seed} ra {d:?}"
            );
        }
        // Không phải lần nào cũng đúng một con số.
        let ds: Vec<Duration> =
            (0..40).map(|i| nghi_giua_doan(1_794_000_000_000 + i * 977)).collect();
        let mut rieng = ds.clone();
        rieng.sort_unstable();
        rieng.dedup();
        assert!(rieng.len() > 5, "nghỉ đúng một con số thì thành máy đếm nhịp: {rieng:?}");
    }

    #[test]
    fn hen_luot_ke_tru_thoi_gian_ai_nghi() {
        // 140 chữ ≈ 10 giây đọc; AI nghĩ 6 giây → gọi lượt sau sau 4 giây.
        assert_eq!(hen_luot_ke(140, 0, Duration::from_secs(6)), Duration::from_secs(4));
        // Có câu chào: cộng nhịp nghỉ và thời gian đọc câu chào.
        assert_eq!(hen_luot_ke(140, 70, Duration::from_secs(6)), Duration::from_millis(10_200));
        // Không bao giờ dưới 2 giây.
        assert_eq!(hen_luot_ke(10, 0, Duration::from_secs(30)), Duration::from_secs(2));
    }


    #[test]
    fn mc_xung_minh() {
        assert_eq!(xung_minh("MC kể thêm truyện Tấm Cám nha"), "Mình kể thêm truyện Tấm Cám nha");
        assert_eq!(xung_minh("Hay thì thả tim cho MC nha. MC cảm ơn!"), "Hay thì thả tim cho mình nha. Mình cảm ơn!");
        assert_eq!(xung_minh("Truyện MC kể nha ❤"), "Truyện mình kể nha ❤");
        // Không đụng chữ khác có "MC" bên trong.
        assert_eq!(xung_minh("MCX và DMC"), "MCX và DMC");
    }


    #[test]
    fn cach_ke_mac_dinh_mc_doc_duoc_cau_hinh_cu() {
        assert_eq!(cach_ke(&json!({})), "mc-day-du");
        assert_eq!(cach_ke(&json!({ "cachKe": "mc-tiet-kiem" })), "mc-day-du", "chế độ đã bỏ coi như MC");
        assert_eq!(cach_ke(&json!({ "cachKe": "tu-doc" })), "tu-doc");
        assert_eq!(cach_ke(&json!({ "nguoiKe": "tu-doc" })), "tu-doc");
        assert!(!mc_ke(&json!({ "cachKe": "tu-doc" })));
    }

}
