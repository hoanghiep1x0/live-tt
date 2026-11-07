//! Truyện kế tiếp — chuẩn bị sẵn trong lúc đang kể, như bản cũ.
//!
//! Bản cũ chuyển truyện mượt vì truyện sau luôn có sẵn: MC kể xong nhịp cuối
//! thì nói câu chuyển tiếp ("Chờ xíu xíu, chuyển tiếp truyện khác hay hay nè cả
//! nhà ơi 😊"), lượt sau mở ngay truyện mới bằng "MC kể thêm truyện…". Truyện
//! lấy từ kho truyện viết tay (`kho_chuyen.json`, chuyển từ bản cũ), hết kho thì
//! AI viết đúng giọng kho; xoay vòng thể loại, hợp giờ trong ngày, không bao
//! giờ kể lại truyện đã kể ở phòng.
//!
//! Ở đây (bật "Tự chuyển truyện mới" của module Kể truyện):
//! 1. Vòng nền (`chay`): phòng đang mở mà `truyenSau` còn trống → lấy một truyện
//!    trong kho, không thì nhờ AI viết, ghi vào `truyenSau`. Ảnh của truyện sau
//!    do `anh_truyen` vẽ sẵn ngay khi ảnh truyện đang kể đã đủ.
//! 2. Hết truyện (`chuyen_sang`, MC gọi): truyện sau thành truyện đang kể — kèm
//!    luôn ảnh đã vẽ — truyện cũ vào sổ `daKe`, `truyenSau` để trống cho vòng
//!    nền chuẩn bị truyện kế nữa.

use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use serde::Deserialize;
use serde_json::{json, Value};
use tokio::time::Instant;

use crate::ai::{boc_json, cho_sau_loi, goi, model_cho, than_chat, NHA_CUNG_CAP};
use crate::secrets::{self, Use};
use crate::state::AppState;

const MODULE: &str = "story";
/// Sổ truyện đã kể giữ tối đa ngần này tên.
///
/// Phải đủ chứa trọn một ngày phát: mỗi truyện chừng ba phút, một ngày kín là
/// gần năm trăm truyện. Sổ ngắn hơn thì tên rụng khỏi sổ và truyện được kể lại
/// ngay trong ngày — đúng thứ `KHONG_KE_LAI_MS` muốn chặn.
const SO_TOI_DA: usize = 600;
/// Truyện đã kể trong vòng ngần này thì KHÔNG kể lại — người xem ở trong phòng
/// cả buổi, nghe lại đúng truyện vừa nghe là họ ra.
pub const KHONG_KE_LAI_MS: i64 = 24 * 60 * 60 * 1000;

#[derive(Debug, Clone, Deserialize)]
pub struct TruyenKho {
    pub ma: String,
    pub ten: String,
    pub loai: String,
    #[serde(rename = "tuSangTac", default)]
    pub tu_sang_tac: bool,
    pub doan: Vec<String>,
}

#[derive(Deserialize)]
struct Kho {
    #[serde(rename = "chuyenTiep")]
    chuyen_tiep: Vec<String>,
    truyen: Vec<TruyenKho>,
}

fn kho() -> &'static Kho {
    static KHO: OnceLock<Kho> = OnceLock::new();
    KHO.get_or_init(|| serde_json::from_str(include_str!("kho_chuyen.json")).expect("kho_chuyen.json hỏng"))
}

/// Kho truyện viết tay (chuyển từ bản cũ).
pub fn kho_truyen() -> &'static [TruyenKho] {
    &kho().truyen
}

/// Câu chuyển tiếp, XOAY VÒNG qua cả kho câu.
///
/// Một câu duy nhất thì buổi live nào người xem cũng nghe đúng một lời ấy mỗi
/// lần đổi truyện — nghe vài lượt là biết máy đọc. Xoay theo `thu_tu` (số
/// truyện đã kể trong buổi) chứ không bốc ngẫu nhiên: ngẫu nhiên vẫn trùng
/// liền hai lượt, xoay vòng thì chắc chắn hết lượt kho mới quay lại câu cũ.
pub fn cau_chuyen_tiep_thu(thu_tu: usize) -> String {
    let ds = &kho().chuyen_tiep;
    if ds.is_empty() {
        return String::new();
    }
    // Hai vòng xoay LỆCH NHAU: 10 câu × 5 cách gọi khán giả. Cùng một câu mẫu
    // mà lần sau đã khác từ gọi, nên phải qua 50 lượt đổi truyện mới gặp lại
    // đúng một lời — dài hơn hẳn một buổi live.
    crate::xung_ho::thay(&ds[thu_tu % ds.len()], thu_tu)
}

/// Số câu chuyển tiếp đang có.
pub fn so_cau_chuyen_tiep() -> usize {
    kho().chuyen_tiep.len()
}

/// 10 thể loại xoay vòng, đúng thứ tự bản cũ.
pub const THE_LOAI: [&str; 10] = [
    "cổ tích Việt Nam",
    "nhân quả",
    "ngụ ngôn",
    "cha mẹ",
    "truyện cười",
    "truyện hài trẻ con có tương tác",
    "thiện – ác",
    "tình cảm gia đình",
    "truyện cảm động",
    "nhân cách – tri thức",
];
/// Truyện QUEN THUỘC theo thể loại — máy chủ chọn sẵn tên, AI chỉ kể lại đúng
/// truyện đó. Bản cũ kể hay vì MC kể truyện người nghe đã biết và yêu (Tấm Cám,
/// Thỏ và Rùa, Trạng Quỳnh…); để AI tự chọn thì nó hay "không nhớ chắc" rồi bịa
/// truyện lạ. Hết danh mục mới cho AI tự sáng tác.
pub const DANH_MUC: [(&str, &[&str]); 10] = [
    (
        "cổ tích Việt Nam",
        &[
            "Tấm Cám",
            "Thánh Gióng",
            "Sơn Tinh Thủy Tinh",
            "Con Rồng cháu Tiên",
            "Sự tích Hồ Gươm",
            "Sự tích dưa hấu",
            "Sự tích chú Cuội cung trăng",
            "Chử Đồng Tử và Tiên Dung",
            "Sự tích con dã tràng",
            "Nàng tiên ốc",
            "Sự tích cây nêu ngày Tết",
            "Cóc kiện trời",
            "Sự tích Hồ Ba Bể",
        ],
    ),
    (
        "nhân quả",
        &[
            "Ăn khế trả vàng",
            "Ba lưỡi rìu",
            "Con ngỗng đẻ trứng vàng",
            "Bà tiên và hai cô gái",
            "Cậu bé chăn cừu nói dối",
            "Con cáo và con cò",
            "Người cha và kho báu trong vườn nho",
            "Ông lão đánh cá và con cá vàng",
        ],
    ),
    (
        "ngụ ngôn",
        &[
            "Thỏ và Rùa",
            "Ếch ngồi đáy giếng",
            "Đẽo cày giữa đường",
            "Thầy bói xem voi",
            "Kiến và Châu Chấu",
            "Sư tử và chuột nhắt",
            "Con quạ và con cáo",
            "Chuột thành phố và chuột đồng quê",
            "Hai con dê qua cầu hẹp",
            "Chân, Tay, Tai, Mắt, Miệng",
            "Rùa và hai con ngỗng",
            "Vẽ rắn thêm chân",
            "Ôm cây đợi thỏ",
            "Lừa đội lốt sư tử",
            "Cáo và chùm nho",
            "Quạ và bình nước",
            "Cáo mượn oai hổ",
        ],
    ),
    (
        "cha mẹ",
        &[
            "Sự tích cây vú sữa",
            "Mạnh mẫu ba lần dời nhà",
            "Hoàng Hương quạt nồng ấp lạnh",
            "Lão Lai mặc áo hoa múa vui cha mẹ",
            "Tử Lộ đội gạo nuôi cha mẹ",
            "Diêm Tử lấy sữa nai cho cha mẹ",
            "Sự tích hoa cúc trắng",
        ],
    ),
    (
        "truyện cười",
        &[
            "Lợn cưới áo mới",
            "Tam đại con gà",
            "Treo biển",
            "Mua kính",
            "Con rắn vuông",
            "Trạng Quỳnh và món mầm đá",
            "Thằng Bờm có cái quạt mo",
            "Thầy bói xem voi",
        ],
    ),
    (
        "truyện hài trẻ con có tương tác",
        &[
            "Củ cải khổng lồ",
            "Ba chú heo con",
            "Cô bé tóc vàng và ba chú gấu",
            "Chiếc bánh mì tròn Kolobok",
            "Cô gà mái đỏ và hạt lúa mì",
            "Gà con và bầu trời sập",
            "Chú bé bánh gừng",
            "Mèo đi hia",
        ],
    ),
    (
        "thiện – ác",
        &[
            "Thạch Sanh",
            "Cây tre trăm đốt",
            "Cô bé Lọ Lem",
            "Nàng Bạch Tuyết và bảy chú lùn",
            "Cô bé quàng khăn đỏ",
            "Người đẹp và quái vật",
            "Tấm Cám",
        ],
    ),
    (
        "tình cảm gia đình",
        &[
            "Sự tích trầu cau",
            "Sự tích bánh chưng bánh giầy",
            "Câu truyện bó đũa",
            "Hai anh em chia lúa",
            "Sự tích hòn Vọng Phu",
            "Sự tích ông Công ông Táo",
        ],
    ),
    (
        "truyện cảm động",
        &[
            "Cô bé bán diêm",
            "Chú lính chì dũng cảm",
            "Hoàng tử hạnh phúc",
            "Chiếc lá cuối cùng",
            "Chú vịt con xấu xí",
            "Nàng tiên cá",
            "Chú chó Hachiko",
        ],
    ),
    (
        "nhân cách – tri thức",
        &[
            "Nguyễn Hiền - Cậu bé chăn trâu đỗ Trạng",
            "Mạc Đĩnh Chi và bài phú hoa sen giếng ngọc",
            "Lương Thế Vinh cân voi",
            "Cao Bá Quát luyện chữ",
            "Có công mài sắt, có ngày nên kim",
            "Tư Mã Quang đập vỡ chum cứu bạn",
            "Khổng Dung nhường lê",
            "Chu Văn An - người thầy muôn đời",
        ],
    ),
];

/// Tên truyện quen thuộc kế tiếp chưa kể: đúng thể loại `loai` trước; thể loại
/// đó hết thì lấy ở thể loại khác (vẫn là truyện quen, hơn là bịa). Trả cả thể
/// loại của truyện. So tên đã chuẩn hoá, coi trùng cả khi tên này chứa tên kia
/// ("Anh thợ đẽo cày giữa đường" ~ "Đẽo cày giữa đường"). Hàm thuần.
pub fn chon_danh_muc(loai: &str, cam: &[String]) -> Option<(&'static str, &'static str)> {
    let da: Vec<String> = cam.iter().map(|t| chuan(t)).filter(|t| !t.is_empty()).collect();
    let chua_ke = |ten: &str| {
        let t = chuan(ten);
        !da.iter().any(|d| *d == t || d.contains(&t) || t.contains(d.as_str()))
    };
    let dau = DANH_MUC.iter().position(|(l, _)| *l == loai).unwrap_or(0);
    (0..DANH_MUC.len())
        .map(|i| DANH_MUC[(dau + i) % DANH_MUC.len()])
        .find_map(|(l, ds)| ds.iter().find(|t| chua_ke(t)).map(|t| (*t, l)))
}

/// Nhóm ưu tiên, xen vào sau mỗi thể loại: nhân quả → cha mẹ → thiện ác.
pub const UU_TIEN: [&str; 3] = ["nhân quả", "cha mẹ", "thiện – ác"];

/// Thể loại của truyện thứ `n` (đếm từ 0) trong phòng: mỗi thể loại 2 truyện
/// rồi xen 1 truyện nhóm ưu tiên, như bản cũ ("sau mỗi thể loại KHÁC").
///
/// Ba thể loại ưu tiên cũng nằm trong vòng xoay chính, nên truyện xen phải
/// khác thể loại của khối TRƯỚC nó lẫn khối SAU nó — không thì ra ba truyện
/// cùng thể loại liền nhau. Hàm thuần.
pub fn the_loai_thu(n: usize) -> &'static str {
    let khoi = n / 3;
    let goc = THE_LOAI[khoi % THE_LOAI.len()];
    if n % 3 < 2 {
        return goc;
    }
    let sau = THE_LOAI[(khoi + 1) % THE_LOAI.len()];
    (0..UU_TIEN.len())
        .map(|i| UU_TIEN[(khoi + i) % UU_TIEN.len()])
        .find(|l| *l != goc && *l != sau)
        .unwrap_or(goc)
}

/// Khung giờ Việt Nam (UTC+7) và giọng truyện hợp giờ — như bản cũ. Hàm thuần.
pub fn khung_gio(now_ms: i64) -> (&'static str, &'static str) {
    let gio = (now_ms.div_euclid(3_600_000) + 7).rem_euclid(24);
    match gio {
        5..=10 => ("sáng", "vui, nhẹ, ngắn"),
        11..=17 => ("trưa / chiều", "vui, dí dỏm"),
        18..=21 => ("tối", "ấm áp, tình thân, cảm động"),
        _ => ("khuya", "chậm, êm, dễ nghe trước khi ngủ, không có đoạn căng thẳng"),
    }
}

fn chuan(ten: &str) -> String {
    ten.trim().to_lowercase().split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Hết truyện có tự sang truyện mới không: MC kể thì luôn có (như bản cũ).
/// Hàm thuần. Chỉ khi MC kể: tự đọc thì không chuyển truyện, nên cũng không chuẩn bị
/// truyện sau hay vẽ ảnh cho nó (tốn công vô ích).
pub fn tu_chuyen(cfg: &Value) -> bool {
    crate::ke_truyen::mc_ke(cfg)
}

/// Sổ truyện đã kể: tên các truyện. Hàm thuần.
pub fn da_ke(cfg: &Value) -> Vec<String> {
    cfg.get("daKe")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|x| x.get("ten").and_then(Value::as_str).or_else(|| x.as_str()))
        .map(str::to_string)
        .collect()
}

/// Tên những truyện đã kể trong vòng `KHONG_KE_LAI_MS`.
///
/// Mục cũ không ghi `luc` (sổ ghi trước khi có ô này) thì coi như đã kể lâu
/// rồi: không chặn thêm, vì đoán bừa là chặn oan cả sổ. Hàm thuần.
pub fn ke_gan_day(cfg: &Value, now: i64) -> Vec<String> {
    cfg.get("daKe")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter(|x| x.get("luc").and_then(Value::as_i64).is_some_and(|l| now - l < KHONG_KE_LAI_MS))
        .filter_map(|x| x.get("ten").and_then(Value::as_str))
        .map(str::to_string)
        .collect()
}

/// Giờ nghỉ (khung hiện màn chờ "Chào cả nhà" + đồng hồ và dải "Truyện tiếp
/// theo" — module Kể truyện vẽ, đọc ô `giaiLao`). Hai loại:
/// - đổi truyện ("chuyen"): co giãn theo độ sôi động của phòng — ít nhất
///   `GIAI_LAO_TOI_THIEU_MS`; phòng vắng (không ai chờ được chào / đáp) đủ tối
///   thiểu là vào truyện; phòng sôi động nghỉ thêm cho MC chào, trò chuyện, tối
///   đa `GIAI_LAO_CHUYEN_MS` rồi vẫn vào truyện;
/// - sự cố ("anh": không vẽ được ảnh): nghỉ tới khi vẽ lại được, tối đa
///   `GIAI_LAO_SU_CO_MS`. MC vẫn trò chuyện, phòng không bao giờ im hay đóng
///   live. (Mất nguồn dữ liệu thì KHÔNG nghỉ: truyện kể tiếp, chỉ bật nhân vật
///   minh hoạ — `ai::canh_mat_nguon`.)
pub const GIAI_LAO_TOI_THIEU_MS: i64 = 40_000;
pub const GIAI_LAO_CHUYEN_MS: i64 = 90_000;
pub const GIAI_LAO_SU_CO_MS: i64 = 24 * 60 * 60 * 1000;
/// Còn ngần này nữa là hết giờ nghỉ đổi truyện thì báo MC "sắp hết".
const SAP_HET_MS: i64 = 20_000;
/// Nguồn dữ liệu đứt quá ngần này mới bật nhân vật minh hoạ — nối lại chớp nhoáng thì thôi.
pub const MAT_KET_NOI_SAU_MS: i64 = 20_000;

/// Khung giữ ĐOẠN CUỐI (kèm ảnh của đoạn, nếu có) thêm ngần này rồi mới nhường
/// chỗ cho màn chờ.
///
/// Kể xong câu cuối mà khung tắt ngay thì câu kết chưa kịp đọng lại — người
/// xem đang nghe dở đã thấy đồng hồ. Giữ vài giây cho hết câu, rồi mới chuyển.
/// Giờ nghỉ KHÔNG dài thêm vì ngần này: nó nằm trong giờ nghỉ, chỉ là mấy giây
/// đầu dành cho khung cũ thay vì màn chờ.
pub const GIU_DOAN_CUOI_MS: i64 = 5_000;

/// Giờ chờ của MỘT lần đổi truyện, tính theo số người đang xem.
///
/// Phòng vắng thì chờ ngắn: không có ai để chào, kéo dài chỉ tổ im. Phòng đông
/// thì chờ dài hơn, vì giờ nghỉ chính là lúc MC chào khách mới và đáp bình
/// luận — cắt ngắn là cắt mất phần sống nhất của phòng.
///
/// Có pha ngẫu nhiên: nghỉ đúng một con số tròn mỗi lần thì buổi live thành
/// cái máy đếm nhịp, người xem đoán trước được. `seed` lấy từ mốc mở giờ nghỉ
/// nên hàm vẫn THUẦN — cùng mốc, cùng số người thì mọi cửa sổ ra cùng kết quả,
/// không có chuyện hai màn hình đếm lệch nhau.
///
/// Không bao giờ quá `GIAI_LAO_CHUYEN_MS` — trần cũ giữ nguyên.
pub fn han_giai_lao(so_nguoi: u64, seed: i64) -> i64 {
    let (ngan, dai) = match so_nguoi {
        0 => (15_000, 25_000),
        1..=9 => (25_000, 40_000),
        10..=99 => (35_000, 55_000),
        _ => (45_000, 75_000),
    };
    let khoang = dai - ngan;
    // Băm mốc thời gian cho tản đều: mốc ms liền nhau mà chia thẳng thì ra
    // mấy giá trị sát nhau.
    let bam = (seed as u64).wrapping_mul(6_364_136_223_846_793_005).rotate_left(29);
    let ra = ngan + (bam % (khoang as u64 + 1)) as i64;
    ra.min(GIAI_LAO_CHUYEN_MS)
}

/// Giờ nghỉ đổi truyện mở từ `tu` đã hết chưa. `soi_dong`: còn người chờ được
/// chào hay được đáp; `han`: giờ chờ đã chọn cho lần này (`han_giai_lao`),
/// không có thì về mốc cũ. Hàm thuần.
pub fn het_giai_lao(tu: i64, now: i64, soi_dong: bool, han: i64) -> bool {
    let da = now - tu;
    let han = if han > 0 { han.min(GIAI_LAO_CHUYEN_MS) } else { GIAI_LAO_TOI_THIEU_MS };
    da >= GIAI_LAO_CHUYEN_MS || (da >= han && !soi_dong)
}

/// Lượt MC này có thể là lượt cuối của giờ nghỉ đổi truyện — nhá trước truyện kế.
/// Hàm thuần.
pub fn sap_het_giai_lao(tu: i64, now: i64, soi_dong: bool, han: i64) -> bool {
    het_giai_lao(tu, now + SAP_HET_MS, soi_dong, han)
}

/// Giờ chờ đã chọn cho giờ nghỉ đang mở (ms). 0 là bản cũ chưa ghi ô này.
pub fn han_cua(cfg: &Value) -> i64 {
    cfg.pointer("/giaiLao/han").and_then(Value::as_i64).unwrap_or(0)
}

/// Giờ nghỉ sự cố đã quá hạn chót chưa. Hàm thuần.
pub fn qua_han_su_co(tu: i64, now: i64) -> bool {
    now - tu >= GIAI_LAO_SU_CO_MS
}

/// Giờ nghỉ đang có trong cấu hình Kể truyện: (tên truyện sắp kể, lý do, lúc
/// bắt đầu). Lý do: "chuyen" — giữa hai truyện; "anh" — không vẽ được ảnh;
/// "ket-noi" — mất nguồn dữ liệu TikTok. Hàm thuần.
pub fn giai_lao(cfg: &Value) -> Option<(String, String, i64)> {
    let g = cfg.get("giaiLao").filter(|g| g.is_object())?;
    Some((
        g.get("truyenSau").and_then(Value::as_str).unwrap_or_default().to_string(),
        g.get("lyDo").and_then(Value::as_str).unwrap_or("chuyen").to_string(),
        g.get("tu").and_then(Value::as_i64).unwrap_or(0),
    ))
}

/// Giờ nghỉ này có phải đã tự bật nhân vật minh hoạ không. Hàm thuần.
pub fn giai_lao_da_bat_bot(cfg: &Value) -> bool {
    cfg.pointer("/giaiLao/batBot").and_then(Value::as_bool) == Some(true)
}

/// Giờ nghỉ SỰ CỐ ("anh", "ket-noi") thì tự bật nhân vật minh hoạ cho phòng
/// đỡ vắng; giờ nghỉ đổi truyện thì không. Hàm thuần.
pub fn su_co_bat_bot(ly_do: &str) -> bool {
    ly_do != "chuyen"
}

/// Mở (`Some`) hay đóng (`None`) giờ nghỉ của phòng: (tên truyện sắp kể, lý do).
///
/// Giờ nghỉ sự cố tự bật nhân vật minh hoạ (bot) nếu người vận hành chưa bật,
/// và ghi nhớ `batBot` — đóng giờ nghỉ thì chỉ tắt lại cái chính nó đã bật.
/// Nhân vật minh hoạ ngồi ghế là thiết kế tự ghi dòng minh bạch "có nhân vật
/// minh họa" ở chân màn — không bao giờ giả làm khách thật.
pub fn dat_giai_lao(st: &AppState, id: &str, gl: Option<(&str, &str)>, now: i64, so_nguoi: u64) {
    let v = match gl {
        Some((ten, ly_do)) => {
            // Giờ nghỉ trước (chưa đóng) đã bật bot thì giữ cờ — mất cờ là bot
            // không bao giờ được tắt lại.
            let da_bat = cau_hinh_ke(st, id).is_some_and(|c| giai_lao_da_bat_bot(&c));
            let bat_bot = da_bat
                || (su_co_bat_bot(ly_do) && !st.bot_config(id).enabled && bat_bot(st, id, true));
            // Giờ chờ chốt MỘT LẦN lúc mở giờ nghỉ, rồi ghi vào cấu hình: sân
            // khấu đếm ngược theo đúng con số này, không tự tính lại mỗi nhịp
            // (số người đổi liên tục, tính lại là đồng hồ nhảy cóc).
            let han = han_giai_lao(so_nguoi, now);
            tracing::info!(thiet_ke = %id, %ly_do, so_nguoi, giay = han / 1000, "mở giờ nghỉ");
            json!({ "truyenSau": ten, "lyDo": ly_do, "tu": now, "batBot": bat_bot, "han": han })
        }
        None => {
            tat_bot_da_bat(st, id);
            Value::Null
        }
    };
    if let Err(e) = st.set_config(id, MODULE, json!({ "giaiLao": v })) {
        tracing::warn!(thiet_ke = %id, ?e, "không ghi được giờ nghỉ");
    }
}

/// Giờ nghỉ hiện tại đã tự bật nhân vật minh hoạ thì tắt lại. Gọi trước khi
/// xoá ô `giaiLao` (đóng giờ nghỉ, đổi truyện).
pub fn tat_bot_da_bat(st: &AppState, id: &str) {
    if cau_hinh_ke(st, id).is_some_and(|c| giai_lao_da_bat_bot(&c)) {
        bat_bot(st, id, false);
    }
}

/// Cấu hình Kể truyện kể cả khi module đang TẮT — cờ "giờ nghỉ đã bật bot"
/// vẫn phải đọc được, người vận hành tắt Kể truyện giữa giờ nghỉ thì bot vẫn
/// được tắt lại.
fn cau_hinh_ke(st: &AppState, id: &str) -> Option<Value> {
    st.module_state(id, MODULE).ok().map(|m| m.config)
}

fn bat_bot(st: &AppState, id: &str, bat: bool) -> bool {
    match st.set_bot_config(id, json!({ "enabled": bat })) {
        Ok(()) => {
            tracing::info!(thiet_ke = %id, bat, "giờ nghỉ sự cố: nhân vật minh hoạ");
            true
        }
        Err(e) => {
            tracing::warn!(thiet_ke = %id, ?e, "không đổi được nhân vật minh hoạ");
            false
        }
    }
}

/// Truyện sau đã sẵn (có tên và đoạn) thì trả tên. Hàm thuần.
pub fn san_sang(cfg: &Value) -> Option<String> {
    let s = cfg.get("truyenSau")?;
    let ten = s.get("title").and_then(Value::as_str).unwrap_or_default().trim();
    let co_doan = !crate::anh_truyen::cat_doan(s.get("passages").and_then(Value::as_str).unwrap_or_default()).is_empty();
    (co_doan && !ten.is_empty()).then(|| ten.to_string())
}

/// Khung ĐANG TRỐNG (chưa có truyện nào): buổi live vừa mở và truyện cũ đã bị
/// dọn (`ke_truyen::don_truyen_cu`). Hàm thuần.
pub fn khung_trong(cfg: &Value) -> bool {
    cfg.get("title").and_then(Value::as_str).unwrap_or_default().trim().is_empty()
        || crate::anh_truyen::cat_doan(cfg.get("passages").and_then(Value::as_str).unwrap_or_default()).is_empty()
}

/// Được chuyển sang truyện sau chưa: chỉ cần truyện sau đã có tên và đoạn.
///
/// Trước đây còn chờ ảnh truyện sau vẽ xong (tối đa 90 giây). Bỏ chờ: cứ kể
/// bình thường, đoạn nào đã có ảnh thì khung hiện ảnh, đoạn nào chưa vẽ tới thì
/// kể không ảnh — `anh_truyen` ghi từng ảnh vào cấu hình ngay khi vẽ xong và
/// `anhChoDoan` nhặt mốc mới nhất đã vẽ, nên ảnh hiện dần ngay giữa lúc kể,
/// không cần đợi đủ bộ. Chờ cho đủ thì khung đứng ở màn chờ cả phút rưỡi, mà
/// phòng đứng im là TikTok phạt. Hàm thuần.
pub fn duoc_chuyen(cfg: &Value) -> bool {
    san_sang(cfg).is_some()
}

/// Truyện trong kho hợp thể loại `loai`, chưa kể, khác truyện đang kể. Kho hết
/// truyện đúng thể loại thì `None` — để AI viết đúng thể loại, giữ vòng xoay.
/// Hàm thuần.
pub fn chon_tu_kho<'a>(kho: &'a [TruyenKho], da_ke: &[String], hien: &str, loai: &str) -> Option<&'a TruyenKho> {
    let da: Vec<String> = da_ke.iter().map(|t| chuan(t)).chain(std::iter::once(chuan(hien))).collect();
    kho.iter().find(|t| t.loai == loai && !da.contains(&chuan(&t.ten)))
}

const DAN_VIET: &str = r#"Bạn là MC của một phòng live kể truyện trên TikTok, kể cho cả nhà nghe (có cả trẻ con). Viết MỘT truyện để kể tiếp trong phòng.

Luật:
- Thể loại: đúng như trong <the_loai>.
- Hợp khung giờ trong <gio>.
- CHỈ kể truyện CÓ THẬT, truyện quen thuộc người nghe đã biết (cổ tích, ngụ ngôn, truyện cười dân gian, gương danh nhân, truyện thiếu nhi kinh điển Việt Nam và thế giới). TUYỆT ĐỐI không tự nghĩ ra truyện mới, không ghép truyện, không đổi tên truyện có sẵn thành tên khác.
- Có <truyen_can_ke>: kể lại ĐÚNG truyện đó bằng lời của mình — giữ trọn cốt truyện gốc, các tình tiết đắt giá và câu nói nổi tiếng mà người nghe chờ đợi; không bịa chi tiết sai, không đổi kết. Chi tiết dữ trong bản gốc thì kể nhẹ đi cho hợp trẻ con, nhưng không bỏ ý. "ten" giữ nguyên tên trong <truyen_can_ke>.
- Không có <truyen_can_ke>: tự chọn MỘT truyện có thật khác hợp <the_loai>, chưa có trong <da_ke> — tên truyện phải là tên thật của truyện đó. Không nhớ chắc truyện nào thì chọn truyện khác mà bạn nhớ rõ, đừng bịa.
- "tuSangTac" luôn là false.
- TUYỆT ĐỐI không trùng truyện nào trong <da_ke> (kể cả đổi tên).
- Kể ĐỦ cốt truyện, ĐÚNG THỨ TỰ TRƯỚC SAU: đoạn 1 là mở đầu, đoạn cuối là kết. Không kể ngược, không nhảy cóc, không hồi tưởng, không đảo chỗ hai đoạn. Đọc lần lượt từ đoạn 1 tới đoạn cuối phải ra đúng cốt truyện gốc.
- Cần bao nhiêu đoạn thì viết bấy nhiêu, 8–20 đoạn. Truyện dài nhiều biến cố (Tấm Cám, Thạch Sanh, Sọ Dừa…) thì dùng NHIỀU đoạn: mỗi biến cố một đoạn riêng. TUYỆT ĐỐI không nén hai ba biến cố vào một đoạn, không lược bớt mắt xích cho đủ số — thà dài hơn còn hơn kể thiếu thành sai truyện. Truyện ngắn thì 8 đoạn là đủ, không kéo dài lê thê.
- Mỗi đoạn MỘT câu, dưới 110 ký tự, nối tiếp thành một mạch. Đoạn đầu mở bằng một câu gợi tò mò; giữa truyện có lúc gay cấn hoặc bất ngờ; kết có hậu hoặc lắng đọng. Giọng ấm, có hình ảnh, cảm xúc; lời thoại nhân vật trong ngoặc kép ở chỗ hợp. Thỉnh thoảng một chút hài nhẹ hoặc một khoảnh khắc lắng đọng — xen kẽ, không lố.
- Các đoạn CHỈ là nội dung truyện — chúng hiện nguyên văn trong khung truyện trên màn. TUYỆT ĐỐI không có trong đoạn: lời người dẫn nói với khán giả ("cả nhà ơi", "các bạn nhỏ ơi", "tối nay ai có anh chị em nhớ nhắn…", "nghe hay thì thả tim"), lời chào, lời mời, câu hỏi khán giả, hay bất cứ câu nào nói với NGƯỜI XEM thay vì kể truyện. Đoạn cuối là câu KẾT CỦA TRUYỆN, không phải lời nhắn tới người nghe — lời nhắn đó để MC tự nói ngoài truyện.
- Thể loại "có tương tác": giữa truyện có đúng một đoạn MC đố vui khách đoán (dễ, hợp trẻ con).
- Ý nghĩa chỉ chạm nhẹ ở cuối, KHÔNG giảng đạo lý.
- Không rùng rợn, bạo lực, người lớn, chính trị, tôn giáo gây tranh cãi, truyện về người có thật đời thường.

Đây là truyện mẫu đúng giọng cần viết:
<vi_du>
{VI_DU}
</vi_du>

Kèm hồ sơ để vẽ tranh minh hoạ nhất quán:
- "phongCach": một dòng phong cách vẽ hợp truyện (chất liệu, tông màu, nét vẽ), dưới 120 ký tự.
- "nhanVat": mỗi nhân vật có mặt một mục, "ta" là ngoại hình CỐ ĐỊNH: tuổi, dáng, mặt, tóc, quần áo và MÀU áo, một nét riêng dễ nhận — dưới 160 ký tự.

Trả JSON thuần, không rào ```:
{"ten": "...", "tuSangTac": false, "doan": ["...", "..."], "phongCach": "...", "nhanVat": [{"ten": "...", "ta": "..."}]}"#;

/// Truyện AI viết, đã lọc. Hàm thuần.
#[derive(Debug, PartialEq)]
pub struct TruyenMoi {
    pub ten: String,
    pub tu_sang_tac: bool,
    pub doan: Vec<String>,
    pub phong_cach: String,
    /// Các dòng "Tên: ngoại hình".
    pub nhan_vat: String,
}

/// Đọc truyện AI trả: tên không trống, không trùng sổ; 4–16 đoạn, mỗi đoạn
/// gọn một dòng. Hàm thuần.
pub fn doc_truyen(than: &str, da_ke: &[String]) -> Option<TruyenMoi> {
    let v = boc_json(than)?;
    let ten: String = v.get("ten").and_then(Value::as_str)?.trim().chars().take(80).collect();
    if ten.is_empty() || da_ke.iter().any(|t| chuan(t) == chuan(&ten)) {
        return None;
    }
    let doan: Vec<String> = v
        .get("doan")
        .and_then(Value::as_array)?
        .iter()
        .filter_map(Value::as_str)
        .map(|d| d.split_whitespace().collect::<Vec<_>>().join(" "))
        .map(|d| d.trim_start_matches("📖").trim().chars().take(180).collect::<String>())
        .filter(|d| !d.is_empty())
        .take(24)
        .collect();
    if doan.len() < 4 {
        return None;
    }
    let phong_cach: String = v.get("phongCach").and_then(Value::as_str).unwrap_or_default().trim().chars().take(300).collect();
    let nhan_vat: Vec<String> = v
        .get("nhanVat")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|n| {
            let t = n.get("ten").and_then(Value::as_str)?.trim();
            let a = n.get("ta").and_then(Value::as_str)?.trim();
            (!t.is_empty() && !a.is_empty()).then(|| format!("{t}: {}", a.chars().take(240).collect::<String>()))
        })
        .take(12)
        .collect();
    Some(TruyenMoi {
        ten,
        tu_sang_tac: v.get("tuSangTac").and_then(Value::as_bool) == Some(true),
        doan,
        phong_cach,
        nhan_vat: nhan_vat.join("\n"),
    })
}

fn cfg_story(st: &AppState, id: &str) -> Option<Value> {
    st.module_state(id, MODULE).ok().filter(|m| m.enabled).map(|m| m.config)
}

/// Chuẩn bị truyện sau cho một phòng: kho trước, không thì AI viết.
fn chuan_bi(st: &AppState, id: &str, cfg: &Value) -> Result<(), String> {
    let mut so = da_ke(cfg);
    // Truyện kể trong vòng một ngày: cấm tuyệt đối, kể cả ở đường dự phòng.
    let gan_day = ke_gan_day(cfg, crate::state::bay_gio_ms());
    // Kho truyện đã kể (giữ lâu dài) cũng là truyện không kể lại.
    for t in crate::kho_da_ke::ten_trong_kho(&crate::kho_da_ke::doc(&st.layout, id)) {
        if !so.iter().any(|x| chuan(x) == chuan(&t)) {
            so.push(t);
        }
    }
    let hien = cfg.get("title").and_then(Value::as_str).unwrap_or_default();
    // Truyện đang kể là truyện thứ `so.len()`; truyện sau là thứ kế tiếp.
    let loai = the_loai_thu(so.len() + 1);
    let mut cam = so.clone();
    cam.push(hien.to_string());

    let tu_kho = |t: &TruyenKho| {
        (
            t.ten.clone(),
            t.loai.clone(),
            t.doan.clone(),
            if t.tu_sang_tac { "kho · truyện MC kể" } else { "kho" },
            String::new(),
            String::new(),
        )
    };
    let (ten, loai_ghi, doan, nguon, phong_cach, nhan_vat) = if let Some(t) = chon_tu_kho(kho_truyen(), &so, hien, loai) {
        tu_kho(t)
    } else {
        // Truyện quen thuộc chưa kể trước; hết danh mục mới để AI sáng tác.
        let (ke_lai, loai_viet) = match chon_danh_muc(loai, &cam) {
            Some((ten, l)) => (Some(ten), l),
            None => (None, loai),
        };
        match viet_bang_ai(st, id, loai_viet, ke_lai, &cam) {
            Ok(v) => v,
            // AI không viết được: lấy truyện trong kho (chưa kể thì trước,
            // không thì truyện kể lâu nhất) — phòng không bao giờ đứng chờ.
            Err(e) => {
                let t = du_phong_kho(kho_truyen(), &so, hien, &gan_day).ok_or(e.clone())?;
                tracing::warn!(thiet_ke = %id, ten = %t.ten, "AI chưa viết được truyện ({e}) — lấy truyện trong kho");
                tu_kho(t)
            }
        }
    };

    // Đọc lại: người vận hành có thể đã tự đặt truyện sau trong lúc chờ.
    if cfg_story(st, id).is_some_and(|c| san_sang(&c).is_some()) {
        return Ok(());
    }
    ghi_truyen_sau(st, id, ten, loai_ghi, doan, nguon, phong_cach, nhan_vat)
}

type TruyenViet = (String, String, Vec<String>, &'static str, String, String);

/// Nhờ AI kể lại truyện quen thuộc `ke_lai` (thể loại `loai`) — không có thì
/// tự sáng tác một truyện thể loại đó, không trùng `cam`.
fn viet_bang_ai(
    st: &AppState,
    id: &str,
    loai: &str,
    ke_lai: Option<&str>,
    cam: &[String],
) -> Result<TruyenViet, String> {
    {
        let vi_du = kho_truyen()
            .first()
            .map(|t| format!("Tên: {}\n{}", t.ten, t.doan.join("\n")))
            .unwrap_or_default();
        let dan = DAN_VIET.replace("{VI_DU}", &vi_du);
        let (khung, giong) = khung_gio(crate::state::bay_gio_ms());
        // Gửi ĐỦ sổ cấm, không cắt còn 60 cái gần đây.
        //
        // Mã từ chối truyện trùng theo CẢ sổ (`doc_truyen(..., cam)`), nên hỏi
        // AI bằng một danh sách ngắn hơn là tự dựng bẫy: AI không thể biết
        // truyện nằm ngoài 60 cái cuối là cấm, nó viết đúng vào đó, mã loại,
        // rồi phòng rơi xuống `du_phong_kho` và kể lại truyện cũ. Đúng vết đã
        // thấy trong nhật ký: "AI viết trùng truyện đã kể: Cây tre trăm đốt".
        // Tên truyện ngắn — cả sổ cũng chỉ vài nghìn ký tự.
        let gan: Vec<&String> = cam.iter().rev().take(SO_TOI_DA).collect();
        let can_ke = ke_lai.map(|t| format!("<truyen_can_ke>{t}</truyen_can_ke>\n")).unwrap_or_default();
        let loi = format!(
            "{can_ke}<the_loai>{loai}</the_loai>\n<gio>{khung}: truyện {giong}</gio>\n<da_ke>\n{}\n</da_ke>",
            gan.iter().map(|t| format!("- {t}")).collect::<Vec<_>>().join("\n")
        );
        // Truyện + hồ sơ tiếng Việt khá nhiều token: chừa rộng, cụt giữa chừng
        // là JSON hỏng.
        let story = cfg_story(st, id);
        let tra = if let Some(cong) = crate::cli_goi::cong_cua(story.as_ref()) {
            // Tài khoản Claude / ChatGPT qua CLI: một session riêng cho truyện này.
            crate::cli_goi::goi_viet(
                cong,
                id,
                &dan,
                &loi,
                &crate::cli_goi::model_viec(story.as_ref(), cong, false),
                &crate::cli_goi::muc_viec(story.as_ref(), false),
            )?
        } else {
            let ai = st.ai_config(id);
            let (nha, p) = secrets::tim(&st.layout, &ai.provider, NHA_CUNG_CAP, Use::Chat)
                .ok_or_else(|| crate::ai::thieu_nha(&ai.provider, "Chat"))?;
            if p.key.is_empty() {
                return Err(format!("kết nối \"{nha}\" chưa có khoá"));
            }
            let than = than_chat(p.kind, &model_cho(&ai.model, &p), &dan, &loi, 6_000);
            goi(&p, &than)?
        };
        st.ghi_chi_phi(id, crate::chi_phi::VIET, &tra.dung, tra.usd);
        // Kể lại truyện có tên sẵn: tên của danh mục là chuẩn (AI hay thêm thắt).
        let t = doc_truyen(&tra.chu, if ke_lai.is_some() { &[] } else { cam })
            .map(|mut t| {
                if let Some(ten) = ke_lai {
                    t.ten = ten.to_string();
                    t.tu_sang_tac = false;
                }
                t
            })
            .ok_or_else(|| {
            let dau: String = tra.chu.chars().take(160).collect();
            let trung = crate::ai::boc_json(&tra.chu)
                .and_then(|v| v.get("ten").and_then(Value::as_str).map(str::to_string))
                .filter(|ten| cam.iter().any(|c| chuan(c) == chuan(ten)));
            match trung {
                Some(ten) => format!("AI viết trùng truyện đã kể: {ten}"),
                None => format!("AI trả không đọc được ({} ký tự): {dau}", tra.chu.chars().count()),
            }
        })?;
        // Chỉ kể truyện có thật: AI vẫn đánh dấu tự sáng tác thì cũng không
        // gán là "truyện MC kể" — nguồn ghi đúng việc nó làm.
        let nguon = "AI · kể lại truyện quen";
        Ok((t.ten, loai.to_string(), t.doan, nguon, t.phong_cach, t.nhan_vat))
    }
}

/// Truyện kho dự phòng khi AI không viết được: truyện chưa kể (bất kể thể
/// loại) trước; kể hết rồi thì truyện kể LÂU NHẤT, khác truyện đang kể. Hàm thuần.
pub fn du_phong_kho<'a>(
    kho: &'a [TruyenKho],
    da_ke: &[String],
    hien: &str,
    gan_day: &[String],
) -> Option<&'a TruyenKho> {
    let da: Vec<String> = da_ke.iter().map(|t| chuan(t)).collect();
    let moi: Vec<String> = gan_day.iter().map(|t| chuan(t)).collect();
    let cu_nhat = |ds: &mut dyn Iterator<Item = &'a TruyenKho>| -> Option<&'a TruyenKho> {
        ds.min_by_key(|t| da.iter().position(|d| *d == chuan(&t.ten)).map_or(0, |i| i + 1))
    };
    let khac_hien = |t: &&TruyenKho| chuan(&t.ten) != chuan(hien);
    // Truyện kể trong ngày hôm nay thì bỏ qua, dù đây đã là đường dự phòng.
    cu_nhat(&mut kho.iter().filter(khac_hien).filter(|t| !moi.contains(&chuan(&t.ten))))
        // Cả kho đều đã kể trong ngày: đành lấy truyện kể lâu nhất. Thà nghe
        // lại một truyện còn hơn phòng đứng im không có gì kể.
        .or_else(|| cu_nhat(&mut kho.iter().filter(khac_hien)))
}

#[allow(clippy::too_many_arguments)]
fn ghi_truyen_sau(
    st: &AppState,
    id: &str,
    ten: String,
    loai_ghi: String,
    doan: Vec<String>,
    nguon: &str,
    phong_cach: String,
    nhan_vat: String,
) -> Result<(), String> {
    tracing::info!(thiet_ke = %id, %ten, %loai_ghi, %nguon, so_doan = doan.len(), co_ho_so = !nhan_vat.is_empty(), "đã chuẩn bị truyện kế tiếp");
    // Hồ sơ AI viết kèm thuộc về đúng truyện này (dấu như `anh_truyen`).
    let ho_so_cua = if nhan_vat.is_empty() { String::new() } else { crate::anh_truyen::dau_truyen(&ten, &doan) };
    st.set_config(
        id,
        MODULE,
        json!({ "truyenSau": {
            "title": ten,
            "passages": doan.join("\n"),
            "loai": loai_ghi,
            "nguon": nguon,
            "moc": [],
            "hoSoCua": "",
            "phongCach": phong_cach,
            "nhanVat": nhan_vat,
            "hoSoTruyen": ho_so_cua,
            "anhLoi": "",
        }}),
    )
    .map_err(|e| format!("không ghi được cấu hình: {e:?}"))
}

/// Sổ đã kể sau khi thêm truyện `ten`, kèm giờ kể để biết truyện nào còn trong
/// hạn `KHONG_KE_LAI_MS`. Hàm thuần.
pub fn so_them(cfg: &Value, ten: &str, loai: &str, now: i64) -> Value {
    let mut ds: Vec<Value> = cfg.get("daKe").and_then(Value::as_array).cloned().unwrap_or_default();
    if !ten.trim().is_empty() {
        // Truyện đã có trong sổ (đường dự phòng vẫn lấy truyện cũ những lúc AI
        // chưa viết được): BỎ mục cũ rồi ghi lại ở CUỐI sổ với giờ mới.
        //
        // Để nguyên mục cũ thì nó mãi nằm đầu sổ, mà "đầu sổ" nghĩa là kể lâu
        // nhất — nên lần dự phòng sau lại chọn đúng truyện ấy, phòng kể đi kể
        // lại một truyện cả buổi. Ghi lại giờ cũng là thứ làm luật
        // `KHONG_KE_LAI_MS` có hiệu lực với truyện kể lại.
        ds.retain(|x| {
            chuan(x.get("ten").and_then(Value::as_str).unwrap_or_default()) != chuan(ten)
        });
        ds.push(json!({ "ten": ten.trim(), "loai": loai, "luc": now }));
    }
    let bo = ds.len().saturating_sub(SO_TOI_DA);
    Value::Array(ds.split_off(bo))
}

/// Hết truyện: truyện sau thành truyện đang kể, kèm ảnh đã vẽ sẵn; truyện cũ
/// vào sổ. Chỉ chuyển khi `duoc_chuyen` (truyện sau đã có chữ). Trả `true` nếu
/// đã chuyển.
pub fn chuyen_sang(st: &AppState, id: &str, now: i64) -> bool {
    let Some(cfg) = cfg_story(st, id) else { return false };
    if !tu_chuyen(&cfg) || !duoc_chuyen(&cfg) {
        return false;
    }
    // Cất truyện vừa kể (kèm ảnh đã vẽ) vào kho trước khi thay: tuần sau mở
    // lại là kể được ngay, không phải tìm truyện hay vẽ lại ảnh.
    crate::kho_da_ke::luu(st, id, &cfg);
    let sau = cfg.get("truyenSau").cloned().unwrap_or_default();
    let lay = |k: &str| sau.get(k).cloned().unwrap_or(json!(""));
    let ten_cu = cfg.get("title").and_then(Value::as_str).unwrap_or_default();
    let loai_cu = cfg.get("loai").and_then(Value::as_str).unwrap_or_default();
    // Truyện mới xoá ô giờ nghỉ: giờ nghỉ sự cố nào đã bật bot thì tắt lại trước.
    tat_bot_da_bat(st, id);
    let kq = st.set_config(
        id,
        MODULE,
        json!({
            "title": lay("title"),
            "passages": lay("passages"),
            "loai": lay("loai"),
            "nguon": lay("nguon"),
            "moc": sau.get("moc").cloned().unwrap_or(json!([])),
            "hoSoCua": lay("hoSoCua"),
            "phongCach": lay("phongCach"),
            "nhanVat": lay("nhanVat"),
            "hoSoTruyen": lay("hoSoTruyen"),
            "anhLoi": "",
            "truyenSau": {},
            "daKe": so_them(&cfg, ten_cu, loai_cu, now),
            // Truyện mới lên: hết giờ nghỉ.
            "giaiLao": Value::Null,
            // Truyện sau đã bị đánh dấu không vẽ được ảnh thì mang cờ đó theo.
            "boAnh": sau.get("boAnh").and_then(Value::as_bool).unwrap_or(false),
            // Mốc truyện bắt đầu: khung đếm giờ từ đây (OBS tải lại vẫn đúng).
            "batDau": now,
        }),
    );
    match kq {
        Ok(()) => {
            tracing::info!(thiet_ke = %id, tu = %ten_cu, sang = %lay("title"), "chuyển sang truyện kế tiếp");
            true
        }
        Err(e) => {
            tracing::warn!(thiet_ke = %id, ?e, "không chuyển được truyện");
            false
        }
    }
}

pub async fn chay(st: Arc<AppState>) {
    let mut dong_ho = tokio::time::interval(Duration::from_secs(5));
    let ban = Arc::new(Mutex::new(false));
    let hen: Arc<Mutex<HashMap<String, Instant>>> = Arc::new(Mutex::new(HashMap::new()));
    let loi_lien: Arc<Mutex<HashMap<String, u32>>> = Arc::new(Mutex::new(HashMap::new()));
    loop {
        dong_ho.tick().await;
        if *ban.lock().expect("khoá truyện sau hỏng") {
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
            let Some(cfg) = cfg_story(&st, &id) else { continue };
            let co_truyen = !crate::anh_truyen::cat_doan(cfg.get("passages").and_then(Value::as_str).unwrap_or_default()).is_empty();
            if !tu_chuyen(&cfg) || !co_truyen || san_sang(&cfg).is_some() {
                continue;
            }
            *ban.lock().expect("khoá truyện sau hỏng") = true;
            let (st2, ban2, hen2, loi2, id2) = (st.clone(), ban.clone(), hen.clone(), loi_lien.clone(), id.clone());
            tokio::spawn(async move {
                let st3 = st2.clone();
                let id3 = id2.clone();
                let kq = tokio::task::spawn_blocking(move || chuan_bi(&st3, &id3, &cfg))
                    .await
                    .unwrap_or_else(|e| Err(format!("tác vụ hỏng: {e}")));
                if let Err(e) = kq {
                    tracing::warn!(thiet_ke = %id2, "truyện kế tiếp: {e}");
                    let mut g = loi2.lock().expect("khoá lỗi hỏng");
                    let n = g.entry(id2.clone()).or_insert(0);
                    *n += 1;
                    hen2.lock().expect("khoá hẹn hỏng").insert(id2, Instant::now() + cho_sau_loi(*n - 1));
                } else {
                    loi2.lock().expect("khoá lỗi hỏng").remove(&id2);
                }
                *ban2.lock().expect("khoá truyện sau hỏng") = false;
            });
            break;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kho_ban_cu_doc_duoc_va_du_8_truyen() {
        assert_eq!(kho_truyen().len(), 8);
        assert!(kho_truyen().iter().all(|t| t.doan.len() >= 8 && THE_LOAI.contains(&t.loai.as_str())));
        assert!(cau_chuyen_tiep_thu(0).starts_with("Chờ xíu xíu"));
        assert!(!cau_chuyen_tiep_thu(0).contains("{nha}"), "chỗ trống phải được thay");
        // Câu mở "MC kể thêm truyện…" là việc của MC, không nằm trong đoạn.
        assert!(kho_truyen().iter().all(|t| !t.doan[0].starts_with("MC kể") && !t.doan[0].starts_with("📖")));
        assert!(kho_truyen().iter().all(|t| t.doan.iter().all(|d| !d.contains("MC"))), "lời truyện không xưng MC");
    }

    #[test]
    fn gio_cho_co_theo_so_nguoi_va_khong_bao_gio_qua_tran() {
        // Phòng vắng chờ ngắn, phòng đông chờ dài — nhưng không bao giờ quá trần.
        for (nguoi, ngan, dai) in [(0u64, 15_000, 25_000), (5, 25_000, 40_000), (50, 35_000, 55_000), (5_000, 45_000, 75_000)] {
            for seed in [0_i64, 1, 977, 1_794_000_000_000, i64::MAX] {
                let h = han_giai_lao(nguoi, seed);
                assert!((ngan..=dai).contains(&h), "{nguoi} người, seed {seed} ra {h}");
                assert!(h <= GIAI_LAO_CHUYEN_MS, "không được quá trần cũ");
            }
        }
        // Phòng đông chờ lâu hơn phòng vắng, không có chuyện ngược lại.
        assert!(han_giai_lao(0, 7) < han_giai_lao(5_000, 7));
    }

    #[test]
    fn gio_cho_cung_moc_thi_moi_man_hinh_ra_cung_mot_so() {
        // Hàm thuần: hai cửa sổ cùng xem một phòng phải đếm giống hệt nhau.
        assert_eq!(han_giai_lao(12, 1_794_000_000_000), han_giai_lao(12, 1_794_000_000_000));
        // Mốc khác nhau thì rải ra, không phải lần nào cũng đúng một con số.
        let ds: Vec<i64> = (0..40).map(|i| han_giai_lao(12, 1_794_000_000_000 + i * 977)).collect();
        let mut rieng = ds.clone();
        rieng.sort_unstable();
        rieng.dedup();
        assert!(rieng.len() > 10, "nghỉ đúng một con số tròn thì người xem đoán được: {rieng:?}");
    }

    #[test]
    fn het_gio_nghi_theo_han_da_chot_chu_khong_phai_moc_cu() {
        // Chốt 20 giây thì 20 giây là vào truyện, không phải chờ đủ 40.
        assert!(het_giai_lao(0, 20_000, false, 20_000));
        assert!(!het_giai_lao(0, 19_999, false, 20_000));
        // Còn người chờ được chào thì vẫn nghỉ thêm, tối đa trần cũ.
        assert!(!het_giai_lao(0, 20_000, true, 20_000));
        assert!(het_giai_lao(0, GIAI_LAO_CHUYEN_MS, true, 20_000));
        // Hạn quá trần thì cắt về trần.
        assert!(het_giai_lao(0, GIAI_LAO_CHUYEN_MS, false, 10 * GIAI_LAO_CHUYEN_MS));
        // Bản cũ chưa ghi ô `han` (0) thì giữ nguyên mốc 40 giây.
        assert!(!het_giai_lao(0, GIAI_LAO_TOI_THIEU_MS - 1, false, 0));
        assert!(het_giai_lao(0, GIAI_LAO_TOI_THIEU_MS, false, 0));
    }

    #[test]
    fn cau_chuyen_tiep_xoay_vong_het_kho_moi_lap_lai() {
        let n = so_cau_chuyen_tiep();
        assert!(n >= 5, "ít câu quá thì nghe vài lượt là biết máy đọc, có {n}");
        let vong: Vec<String> = (0..n).map(cau_chuyen_tiep_thu).collect();
        let mut rieng = vong.clone();
        rieng.sort_unstable();
        rieng.dedup();
        assert_eq!(rieng.len(), n, "trong một vòng không câu nào lặp");
        assert!(vong.iter().all(|c| !c.trim().is_empty()));
        // Hết vòng CÂU MẪU thì quay lại câu mẫu đầu, nhưng từ xưng hô đã
        // khác — ba vòng (câu, cách gọi, người đi cùng) lệch độ dài nhau nên
        // phải hết bội chung mới lặp lại y hệt một lời.
        // Số câu mẫu KHÔNG được chia hết cho số cách gọi hay số từ đi cùng —
        // chia hết là hai vòng bước song song, thêm bao nhiêu từ cũng vô ích.
        assert_ne!(n % crate::xung_ho::CACH_GOI.len(), 0, "{n} câu chia hết cho số cách gọi");
        assert_ne!(n % crate::xung_ho::CUNG.len(), 0, "{n} câu chia hết cho số từ đi cùng");
        let vong_day = n * crate::xung_ho::CACH_GOI.len() * crate::xung_ho::CUNG.len();
        assert_eq!(cau_chuyen_tiep_thu(vong_day), cau_chuyen_tiep_thu(0));
        assert_ne!(
            cau_chuyen_tiep_thu(n),
            cau_chuyen_tiep_thu(0),
            "hết vòng câu mẫu mà lời y hệt thì ba vòng đang bước song song"
        );
        // Không bao giờ sót chỗ trống chưa điền.
        for i in 0..vong_day {
            let c = cau_chuyen_tiep_thu(i);
            assert!(!c.contains('{') && !c.contains('}'), "lượt {i} còn chỗ trống: {c}");
        }
    }

    #[test]
    fn xoay_vong_the_loai_moi_loai_hai_truyen_xen_uu_tien() {
        let ds: Vec<&str> = (0..9).map(the_loai_thu).collect();
        assert_eq!(
            ds,
            vec![
                // Truyện xen (ô thứ ba mỗi khối) tránh thể loại của khối trước
                // lẫn khối sau: khối sau là "nhân quả" nên xen "cha mẹ".
                "cổ tích Việt Nam", "cổ tích Việt Nam", "cha mẹ",
                "nhân quả", "nhân quả", "cha mẹ",
                "ngụ ngôn", "ngụ ngôn", "thiện – ác",
            ]
        );
        // Không bao giờ có BA truyện cùng thể loại liền nhau trong cả vòng xoay.
        let dai: Vec<&str> = (0..120).map(the_loai_thu).collect();
        for w in dai.windows(3) {
            assert!(!(w[0] == w[1] && w[1] == w[2]), "ba truyện {} liền nhau", w[0]);
        }
        // Mỗi khối ba truyện có đúng một truyện thuộc nhóm ưu tiên xen vào.
        for k in dai.chunks(3) {
            assert!(UU_TIEN.contains(&k[2]), "truyện xen phải thuộc nhóm ưu tiên: {}", k[2]);
        }
        // Cả 10 thể loại đều tới lượt, không kẹt ở vài thể loại.
        for l in THE_LOAI {
            assert!(dai.contains(&l), "thể loại {l} không bao giờ tới lượt");
        }
        // Cả ba thể loại ưu tiên đều được xen.
        for l in UU_TIEN {
            assert!(dai.chunks(3).any(|k| k[2] == l), "không bao giờ xen {l}");
        }
    }

    #[test]
    fn doc_gio_nghi_va_so_giay_con_lai() {
        assert_eq!(giai_lao(&json!({ "title": "x" })), None);
        assert_eq!(giai_lao(&json!({ "giaiLao": null })), None);
        assert_eq!(
            giai_lao(&json!({ "giaiLao": { "truyenSau": "Tấm Cám", "lyDo": "anh", "tu": 1_000 } })),
            Some(("Tấm Cám".to_string(), "anh".to_string(), 1_000))
        );
        // Thiếu lý do: là giờ nghỉ giữa hai truyện.
        assert_eq!(giai_lao(&json!({ "giaiLao": { "truyenSau": "A" } })).unwrap().1, "chuyen");
        // Phòng vắng: đủ tối thiểu là vào truyện.
        assert!(!het_giai_lao(0, GIAI_LAO_TOI_THIEU_MS - 1, false, 0));
        assert!(het_giai_lao(0, GIAI_LAO_TOI_THIEU_MS, false, 0));
        // Phòng sôi động: nghỉ thêm, tới 90 giây thì vẫn vào truyện.
        assert!(!het_giai_lao(0, GIAI_LAO_TOI_THIEU_MS + 10_000, true, 0));
        assert!(het_giai_lao(0, GIAI_LAO_CHUYEN_MS, true, 0));
        // Báo "sắp hết" trước một nhịp.
        assert!(sap_het_giai_lao(0, GIAI_LAO_TOI_THIEU_MS - 15_000, false, 0));
        assert!(!sap_het_giai_lao(0, GIAI_LAO_TOI_THIEU_MS - 15_000, true, 0));
        assert!(sap_het_giai_lao(0, GIAI_LAO_CHUYEN_MS - 15_000, true, 0));
        // Sự cố: tối đa 24 giờ.
        assert!(!qua_han_su_co(0, GIAI_LAO_SU_CO_MS - 1));
        assert!(qua_han_su_co(0, GIAI_LAO_SU_CO_MS));
    }

    fn phong_thu() -> (tempfile::TempDir, std::sync::Arc<AppState>) {
        let tmp = tempfile::tempdir().unwrap();
        let d = tmp.path().join("client").join("designs").join("ke-chuyen");
        std::fs::create_dir_all(d.join("dist")).unwrap();
        std::fs::write(d.join("design.json"), r#"{"id":"ke-chuyen","name":"ke-chuyen"}"#).unwrap();
        std::fs::write(d.join("dist").join("index.html"), "<!doctype html>").unwrap();
        let st = AppState::new(crate::paths::Layout::new(tmp.path()), 47830, "tok".into());
        st.set_config("ke-chuyen", MODULE, json!({ "title": "Cây khế", "passages": "Một." })).unwrap();
        (tmp, st)
    }

    #[test]
    fn gio_nghi_su_co_tu_bat_roi_tu_tat_nhan_vat_minh_hoa() {
        let (_tmp, st) = phong_thu();
        assert!(!st.bot_config("ke-chuyen").enabled);

        // Mất nguồn: bật nhân vật minh hoạ, nhớ là mình bật.
        dat_giai_lao(&st, "ke-chuyen", Some(("Cây khế", "ket-noi")), 1_000, 0);
        assert!(st.bot_config("ke-chuyen").enabled);
        // Mở lại giờ nghỉ (vd chuyển sang lỗi ảnh) vẫn giữ cờ — không thì không bao giờ tắt.
        dat_giai_lao(&st, "ke-chuyen", Some(("Cây khế", "anh")), 2_000, 0);
        assert!(cau_hinh_ke(&st, "ke-chuyen").is_some_and(|c| giai_lao_da_bat_bot(&c)));

        // Hết sự cố: tắt lại đúng cái mình đã bật.
        dat_giai_lao(&st, "ke-chuyen", None, 3_000, 0);
        assert!(!st.bot_config("ke-chuyen").enabled);
    }

    #[test]
    fn nguoi_van_hanh_da_bat_bot_thi_het_su_co_khong_tat() {
        let (_tmp, st) = phong_thu();
        st.set_bot_config("ke-chuyen", json!({ "enabled": true })).unwrap();
        dat_giai_lao(&st, "ke-chuyen", Some(("Cây khế", "anh")), 1_000, 0);
        dat_giai_lao(&st, "ke-chuyen", None, 2_000, 0);
        assert!(st.bot_config("ke-chuyen").enabled, "bot của người vận hành phải giữ nguyên");
    }

    #[test]
    fn gio_nghi_doi_truyen_khong_bat_bot() {
        let (_tmp, st) = phong_thu();
        dat_giai_lao(&st, "ke-chuyen", Some(("Cây khế", "chuyen")), 1_000, 0);
        assert!(!st.bot_config("ke-chuyen").enabled);
    }

    #[test]
    fn chi_gio_nghi_su_co_moi_bat_bot() {
        assert!(su_co_bat_bot("anh"));
        assert!(su_co_bat_bot("ket-noi"));
        assert!(!su_co_bat_bot("chuyen"));
        assert!(giai_lao_da_bat_bot(&json!({ "giaiLao": { "lyDo": "anh", "batBot": true } })));
        assert!(!giai_lao_da_bat_bot(&json!({ "giaiLao": { "lyDo": "anh", "batBot": false } })));
        assert!(!giai_lao_da_bat_bot(&json!({ "giaiLao": null })));
    }

    #[test]
    fn khung_gio_theo_gio_viet_nam() {
        // 01:00 UTC = 08:00 VN.
        assert_eq!(khung_gio(3_600_000).0, "sáng");
        // 13:00 UTC = 20:00 VN.
        assert_eq!(khung_gio(13 * 3_600_000).0, "tối");
        // 17:00 UTC = 00:00 VN.
        assert_eq!(khung_gio(17 * 3_600_000).0, "khuya");
    }

    #[test]
    fn kho_khong_lay_truyen_da_ke_hay_dang_ke() {
        let kho = kho_truyen();
        let t = chon_tu_kho(kho, &[], "Sự tích cây vú sữa", "cha mẹ").unwrap();
        assert_eq!(t.ma, "cha-va-chiec-xe", "vú sữa đang kể nên lấy truyện cha mẹ khác");
        assert!(chon_tu_kho(kho, &["Chiếc xe đạp cũ của cha".into()], "sự tích  cây vú sữa", "cha mẹ").is_none());
    }

    #[test]
    fn du_phong_kho_chua_ke_truoc_roi_ke_lau_nhat() {
        let kho = kho_truyen();
        let ten: Vec<String> = kho.iter().map(|t| t.ten.clone()).collect();
        // Còn truyện chưa kể: lấy truyện chưa kể.
        let t = du_phong_kho(kho, &ten[..3], &ten[3], &[]).unwrap();
        assert!(!ten[..4].contains(&t.ten));
        // Kể hết rồi: truyện kể lâu nhất (đầu sổ), khác truyện đang kể.
        let t = du_phong_kho(kho, &ten, &ten[0], &[]).unwrap();
        assert_eq!(t.ten, ten[1]);
    }

    #[test]
    fn doc_truyen_loc_trung_va_ngan() {
        let than = r#"{"ten": "Thỏ và Rùa", "doan": ["📖 Một.", "Hai.", "Ba.", "Bốn.", ""], "phongCach": "màu nước", "nhanVat": [{"ten": "Thỏ", "ta": "lông trắng, áo gile xanh"}, {"ten": "", "ta": "x"}]}"#;
        let t = doc_truyen(than, &[]).unwrap();
        assert_eq!(t.doan, vec!["Một.", "Hai.", "Ba.", "Bốn."]);
        assert_eq!(t.phong_cach, "màu nước");
        assert_eq!(t.nhan_vat, "Thỏ: lông trắng, áo gile xanh", "AI viết kèm hồ sơ: muse khỏi lập lại");
        assert!(doc_truyen(than, &["thỏ và rùa".into()]).is_none(), "trùng sổ");
        assert!(doc_truyen(r#"{"ten": "X", "doan": ["a", "b"]}"#, &[]).is_none(), "quá ngắn");
    }

    #[test]
    fn so_da_ke_khong_trung_va_co_tran() {
        let cfg = json!({ "daKe": [{ "ten": "A", "loai": "x" }] });
        let s = so_them(&cfg, "a", "x", 5_000);
        assert_eq!(s.as_array().unwrap().len(), 1);
        let s = so_them(&cfg, "B", "y", 6_000);
        assert_eq!(da_ke(&json!({ "daKe": s })), vec!["A".to_string(), "B".to_string()]);
    }

    #[test]
    fn khong_cho_anh_nua_cu_vao_truyen_roi_anh_hien_dan() {
        let cfg = json!({
            // Đang kể dở một truyện, truyện sau CHƯA vẽ ảnh nào.
            "title": "A",
            "passages": "Một.
Hai.",
            "anhTuDong": true,
            "truyenSau": { "title": "B", "passages": "Một.\nHai.", "hoSoCua": "", "moc": [] }
        });
        assert!(duoc_chuyen(&cfg), "chưa vẽ ảnh vẫn vào truyện, ảnh vẽ tiếp trên khung");
        // Truyện sau chưa có chữ thì mới là chưa sẵn.
        assert!(!duoc_chuyen(&json!({ "title": "A", "passages": "Một." })), "không có truyện sau");
    }

    #[test]
    fn khong_ke_lai_truyen_da_ke_trong_mot_ngay() {
        let now = 10 * KHONG_KE_LAI_MS;
        let cfg = json!({ "daKe": [
            // Kể hôm qua: hết hạn cấm, được kể lại.
            { "ten": "Cũ", "loai": "x", "luc": now - KHONG_KE_LAI_MS - 1 },
            // Kể sáng nay: còn trong hạn.
            { "ten": "Sáng nay", "loai": "x", "luc": now - 60_000 },
            // Sổ ghi trước khi có ô giờ: không đoán bừa, coi như đã lâu.
            { "ten": "Không rõ giờ", "loai": "x" },
        ]});
        assert_eq!(ke_gan_day(&cfg, now), vec!["Sáng nay".to_string()]);

        // Đường dự phòng cũng phải tránh truyện kể trong ngày.
        let kho = kho_truyen();
        let ten: Vec<String> = kho.iter().map(|t| t.ten.clone()).collect();
        let t = du_phong_kho(kho, &ten, &ten[0], &ten[1..3]).unwrap();
        assert!(!ten[1..3].contains(&t.ten), "truyện kể hôm nay không được lấy lại");
        // Cả kho đã kể trong ngày: vẫn phải có truyện, thà nghe lại còn hơn im.
        assert!(du_phong_kho(kho, &ten, &ten[0], &ten).is_some());
    }

    #[test]
    fn ke_lai_truyen_cu_thi_day_xuong_cuoi_so_va_ghi_gio_moi() {
        // Sổ cũ: "A" nằm đầu, tức là truyện kể lâu nhất.
        let cfg = json!({ "daKe": [
            { "ten": "A", "loai": "x", "luc": 1_000 },
            { "ten": "B", "loai": "x", "luc": 2_000 },
        ]});
        // Dự phòng kể lại "A": nó phải xuống cuối với giờ mới, không nhân đôi.
        let s = so_them(&cfg, "A", "x", 9_000);
        let ds = s.as_array().unwrap();
        assert_eq!(ds.len(), 2, "không nhân đôi mục");
        assert_eq!(ds[1]["ten"], json!("A"), "truyện vừa kể phải nằm cuối sổ");
        assert_eq!(ds[1]["luc"], json!(9_000));
        assert_eq!(ds[0]["ten"], json!("B"), "giờ B mới là truyện kể lâu nhất");
        // Và luật một ngày bắt được nó ngay.
        assert!(ke_gan_day(&json!({ "daKe": s }), 9_000).contains(&"A".to_string()));
    }

    #[test]
    fn so_them_ghi_gio_ke() {
        let s = so_them(&json!({}), "A", "x", 1_234);
        assert_eq!(s[0]["luc"], json!(1_234));
        assert_eq!(ke_gan_day(&json!({ "daKe": s }), 1_234), vec!["A".to_string()]);
    }

    #[test]
    fn san_sang_khi_co_ten_va_doan() {
        assert_eq!(san_sang(&json!({ "truyenSau": {} })), None);
        assert_eq!(
            san_sang(&json!({ "truyenSau": { "title": "T", "passages": "a\nb" } })),
            Some("T".to_string())
        );
        assert!(tu_chuyen(&json!({})));
        assert!(!tu_chuyen(&json!({ "cachKe": "tu-doc" })), "tự đọc: không chuẩn bị truyện sau");
    }

    #[test]
    fn khung_trong_thi_chuyen_ngay_khong_cho_anh() {
        let sau = json!({ "title": "Sư tử và chuột nhắt", "passages": "a\nb\nc\nd" });
        // Khung trống (vừa lên sóng, truyện cũ đã dọn): chuyển ngay, dù chưa vẽ ảnh.
        let trong = json!({ "title": "", "passages": "", "anhTuDong": true, "truyenSau": sau.clone() });
        assert!(khung_trong(&trong));
        assert!(duoc_chuyen(&trong), "khung trống phải chuyển ngay");
        // Đang kể dở cũng vậy: có truyện sau là vào, không chờ ảnh.
        let dang_ke = json!({ "title": "Tấm Cám", "passages": "a\nb", "truyenSau": sau });
        assert!(!khung_trong(&dang_ke));
        assert!(duoc_chuyen(&dang_ke), "đang kể dở cũng không chờ ảnh");
    }

    #[test]
    fn danh_muc_chon_truyen_quen_chua_ke() {
        let cam = |ds: &[&str]| ds.iter().map(|s| s.to_string()).collect::<Vec<_>>();
        assert_eq!(chon_danh_muc("ngụ ngôn", &[]), Some(("Thỏ và Rùa", "ngụ ngôn")));
        // Trùng cả khi tên đã kể chứa tên danh mục; không phân biệt hoa thường.
        assert_eq!(
            chon_danh_muc("ngụ ngôn", &cam(&["thỏ và rùa", "Ếch ngồi đáy giếng", "Anh thợ đẽo cày giữa đường"])),
            Some(("Thầy bói xem voi", "ngụ ngôn"))
        );
        // Thể loại hết truyện: sang thể loại kế, vẫn là truyện quen.
        let het: Vec<String> = DANH_MUC[2].1.iter().map(|s| s.to_string()).collect();
        assert_eq!(chon_danh_muc("ngụ ngôn", &het).map(|x| x.1), Some("cha mẹ"));
        // Kể hết mọi danh mục: không còn gì — để AI sáng tác.
        let tat_ca: Vec<String> = DANH_MUC.iter().flat_map(|(_, ds)| ds.iter().map(|s| s.to_string())).collect();
        assert_eq!(chon_danh_muc("ngụ ngôn", &tat_ca), None);
        // Thể loại nào trong vòng xoay cũng có danh mục.
        for l in THE_LOAI {
            assert!(DANH_MUC.iter().any(|(d, _)| *d == l), "{l} chưa có danh mục");
        }
    }
}
