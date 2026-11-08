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

/// 12 thể loại xoay vòng: 10 thể loại đúng thứ tự bản cũ, thêm hai thể loại
/// kỹ năng cho cả nhà nghe cùng con.
pub const THE_LOAI: [&str; 12] = [
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
    "truyện tranh kỹ năng sống",
    "kỹ năng an toàn",
];
/// Truyện QUEN THUỘC theo thể loại — máy chủ chọn sẵn tên, AI chỉ kể lại đúng
/// truyện đó. Bản cũ kể hay vì MC kể truyện người nghe đã biết và yêu (Tấm Cám,
/// Thạch Sanh, Trạng Quỳnh…); để AI tự chọn thì nó hay "không nhớ chắc" rồi bịa
/// truyện lạ. Hết danh mục mới cho AI tự sáng tác.
///
/// Mỗi thể loại hai danh sách: truyện Việt Nam (`viet`) và truyện nước ngoài
/// (`ngoai`). Phòng ƯU TIÊN truyện Việt: còn truyện Việt chưa kể ở bất kỳ thể
/// loại nào thì không kể truyện nước ngoài — truyện nước ngoài chỉ là phần dự
/// trữ khi truyện Việt đã kể hết, không bị cấm hẳn.
pub struct DanhMuc {
    pub loai: &'static str,
    pub viet: &'static [&'static str],
    pub ngoai: &'static [&'static str],
}

pub const DANH_MUC: [DanhMuc; 12] = [
    DanhMuc {
        loai: "cổ tích Việt Nam",
        viet: &[
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
            "Sọ Dừa",
            "Sự tích trái sầu riêng",
            "Sự tích Hòn Trống Mái",
        ],
        ngoai: &[],
    },
    DanhMuc {
        loai: "nhân quả",
        viet: &[
            "Ăn khế trả vàng",
            "Của Thiên trả Địa",
            "Sự tích con khỉ",
            "Sự tích bộ lông con quạ",
            "Cái cân thủy ngân",
            "Sự tích chim quốc",
            "Sự tích con muỗi",
            "Sự tích chim bìm bịp",
            "Sự tích con thạch sùng",
        ],
        ngoai: &[
            "Ba lưỡi rìu",
            "Con ngỗng đẻ trứng vàng",
            "Bà tiên và hai cô gái",
            "Cậu bé chăn cừu nói dối",
            "Con cáo và con cò",
            "Người cha và kho báu trong vườn nho",
            "Ông lão đánh cá và con cá vàng",
        ],
    },
    DanhMuc {
        loai: "ngụ ngôn",
        viet: &[
            "Ếch ngồi đáy giếng",
            "Đẽo cày giữa đường",
            "Thầy bói xem voi",
            "Chân, Tay, Tai, Mắt, Miệng",
            "Trí khôn của ta đây",
            "Mèo lại hoàn mèo",
            "Đeo nhạc cho mèo",
        ],
        ngoai: &[
            "Thỏ và Rùa",
            "Kiến và Châu Chấu",
            "Sư tử và chuột nhắt",
            "Con quạ và con cáo",
            "Chuột thành phố và chuột đồng quê",
            "Hai con dê qua cầu hẹp",
            "Rùa và hai con ngỗng",
            "Vẽ rắn thêm chân",
            "Ôm cây đợi thỏ",
            "Lừa đội lốt sư tử",
            "Cáo và chùm nho",
            "Quạ và bình nước",
            "Cáo mượn oai hổ",
        ],
    },
    DanhMuc {
        loai: "cha mẹ",
        viet: &[
            "Sự tích cây vú sữa",
            "Sự tích hoa cúc trắng",
            "Sự tích ba cô gái",
            "Tích Chu",
            "Bông hồng cài áo",
            "Mục Kiền Liên cứu mẹ - sự tích lễ Vu Lan",
        ],
        ngoai: &[
            "Mạnh mẫu ba lần dời nhà",
            "Hoàng Hương quạt nồng ấp lạnh",
            "Lão Lai mặc áo hoa múa vui cha mẹ",
            "Tử Lộ đội gạo nuôi cha mẹ",
            "Diêm Tử lấy sữa nai cho cha mẹ",
        ],
    },
    DanhMuc {
        loai: "truyện cười",
        viet: &[
            "Lợn cưới áo mới",
            "Tam đại con gà",
            "Treo biển",
            "Mua kính",
            "Con rắn vuông",
            "Trạng Quỳnh và món mầm đá",
            "Thằng Bờm có cái quạt mo",
            "Trạng Lợn",
            "Đánh chết cái nết không chừa",
            "Ba Giai Tú Xuất",
        ],
        ngoai: &[],
    },
    DanhMuc {
        loai: "truyện hài trẻ con có tương tác",
        viet: &[
            "Chú dê đen",
            "Dê con nhanh trí",
            "Bác gấu đen và hai chú thỏ",
            "Chú vịt xám",
            "Cậu bé mũi dài",
        ],
        ngoai: &[
            "Củ cải khổng lồ",
            "Ba chú heo con",
            "Cô bé tóc vàng và ba chú gấu",
            "Chiếc bánh mì tròn Kolobok",
            "Cô gà mái đỏ và hạt lúa mì",
            "Gà con và bầu trời sập",
            "Chú bé bánh gừng",
            "Mèo đi hia",
        ],
    },
    DanhMuc {
        loai: "thiện – ác",
        viet: &["Thạch Sanh", "Cây tre trăm đốt", "Tấm Cám", "Sọ Dừa", "Nàng Út ống tre"],
        ngoai: &[
            "Cô bé Lọ Lem",
            "Nàng Bạch Tuyết và bảy chú lùn",
            "Cô bé quàng khăn đỏ",
            "Người đẹp và quái vật",
        ],
    },
    DanhMuc {
        loai: "tình cảm gia đình",
        viet: &[
            "Sự tích trầu cau",
            "Sự tích bánh chưng bánh giầy",
            "Câu chuyện bó đũa",
            "Hai anh em chia lúa",
            "Sự tích hòn Vọng Phu",
            "Sự tích ông Công ông Táo",
            "Sự tích con sam",
            "Cuộc chia tay của những con búp bê",
            "Bức tranh của em gái tôi",
        ],
        ngoai: &[],
    },
    DanhMuc {
        loai: "truyện cảm động",
        viet: &[
            "Tích Chu",
            "Sự tích hoa cúc trắng",
            "Sự tích hòn Vọng Phu",
            "Sự tích cây vú sữa",
            "Chiếc lược ngà",
        ],
        ngoai: &[
            "Cô bé bán diêm",
            "Chú lính chì dũng cảm",
            "Hoàng tử hạnh phúc",
            "Chiếc lá cuối cùng",
            "Chú vịt con xấu xí",
            "Nàng tiên cá",
            "Chú chó Hachiko",
        ],
    },
    DanhMuc {
        loai: "nhân cách – tri thức",
        viet: &[
            "Nguyễn Hiền - Cậu bé chăn trâu đỗ Trạng",
            "Mạc Đĩnh Chi và bài phú hoa sen giếng ngọc",
            "Lương Thế Vinh cân voi",
            "Cao Bá Quát luyện chữ",
            "Chu Văn An - người thầy muôn đời",
            "Em bé thông minh",
            "Trần Quốc Toản bóp nát quả cam",
            "Thần đồng Lê Quý Đôn",
            "Tô Hiến Thành - một người chính trực",
            "Vua tàu thủy Bạch Thái Bưởi",
        ],
        ngoai: &[
            "Có công mài sắt, có ngày nên kim",
            "Tư Mã Quang đập vỡ chum cứu bạn",
            "Khổng Dung nhường lê",
        ],
    },
    DanhMuc {
        loai: "truyện tranh kỹ năng sống",
        viet: &[
            "Mẩu giấy vụn",
            "Chiếc bút mực",
            "Bím tóc đuôi sam",
            "Những quả đào",
            "Bông hoa Niềm Vui",
            "Câu chuyện bó đũa",
        ],
        ngoai: &["Ba chú lợn con", "Cậu bé Pinocchio"],
    },
    DanhMuc {
        loai: "kỹ năng an toàn",
        viet: &["Đôi bạn"],
        ngoai: &["Bảy chú dê con", "Hansel và Gretel"],
    },
];

/// Thể loại "vui": truyện cười, truyện trẻ con, ngụ ngôn con vật. Chúng có
/// suất riêng trong vòng xoay, nhưng KHÔNG phải chỗ để tràn sang khi một thể
/// loại nghiêm hết truyện — xem `chon_danh_muc`.
pub const THE_LOAI_VUI: [&str; 3] = ["ngụ ngôn", "truyện cười", "truyện hài trẻ con có tương tác"];

/// Tên truyện quen thuộc kế tiếp chưa kể, đúng thể loại `loai` trước, truyện
/// Việt Nam trước truyện nước ngoài. Trả cả thể loại của truyện. So tên đã chuẩn hoá, coi trùng
/// cả khi tên này chứa tên kia ("Anh thợ đẽo cày giữa đường" ~ "Đẽo cày giữa
/// đường"). Hàm thuần.
///
/// THỨ TỰ TRÀN: thể loại nghiêm (nhân quả, cha mẹ, thiện ác, gia đình, cảm
/// động, giáo dục, cổ tích) hết truyện thì tràn sang truyện Việt ở thể loại
/// nghiêm KHÁC, rồi truyện nghiêm nước ngoài, thể loại vui để sau cùng. Thể
/// loại vui thì tràn theo thứ tự danh sách như cũ. Trước đây cứ tràn sang thể loại đứng kế trong danh
/// sách — "cha mẹ" hết là ra truyện cười rồi truyện trẻ con, "nhân quả" hết là
/// ra ngụ ngôn con vật. Nhóm ưu tiên của bản cũ gánh gần nửa số truyện mà mỗi
/// loại chỉ có vài truyện Việt, nên kể một buổi là hết và phòng toàn truyện
/// thiếu nhi — chủ phòng đã kêu đúng điều đó.
pub fn chon_danh_muc(loai: &str, cam: &[String]) -> Option<(&'static str, &'static str)> {
    let da: Vec<String> = cam.iter().map(|t| chuan(t)).filter(|t| !t.is_empty()).collect();
    let chua_ke = |ten: &str| {
        let t = chuan(ten);
        !da.iter().any(|d| *d == t || d.contains(&t) || t.contains(d.as_str()))
    };
    let dau = DANH_MUC.iter().position(|d| d.loai == loai).unwrap_or(0);
    let vong: Vec<&DanhMuc> = (0..DANH_MUC.len()).map(|i| &DANH_MUC[(dau + i) % DANH_MUC.len()]).collect();
    let la_vui = |d: &DanhMuc| THE_LOAI_VUI.contains(&d.loai);
    // Thể loại vui thì tràn theo thứ tự danh sách như cũ. Thể loại nghiêm thì
    // các thể loại nghiêm khác đứng trước, thể loại vui dồn xuống cuối.
    let tim = |ds: &[&DanhMuc], lay: fn(&DanhMuc) -> &'static [&'static str]| {
        ds.iter().find_map(|d| lay(d).iter().find(|t| chua_ke(t)).map(|t| (*t, d.loai)))
    };
    if la_vui(&DANH_MUC[dau]) {
        return tim(&vong, |d| d.viet).or_else(|| tim(&vong, |d| d.ngoai));
    }
    // Nghiêm: truyện Việt nghiêm → truyện nghiêm nước ngoài (Nhị thập tứ hiếu,
    // truyện cảm động quen thuộc) → mới tới truyện vui.
    let nghiem: Vec<&DanhMuc> = vong.iter().copied().filter(|d| !la_vui(d)).collect();
    let vui: Vec<&DanhMuc> = vong.iter().copied().filter(|d| la_vui(d)).collect();
    tim(&nghiem, |d| d.viet)
        .or_else(|| tim(&nghiem, |d| d.ngoai))
        .or_else(|| tim(&vui, |d| d.viet))
        .or_else(|| tim(&vui, |d| d.ngoai))
}

/// Nhóm ưu tiên của bản cũ (D:\Live): NHÂN QUẢ · CHA MẸ · THIỆN ÁC, xen lần lượt.
pub const UU_TIEN: [&str; 3] = ["nhân quả", "cha mẹ", "thiện – ác"];

/// Thể loại của truyện thứ `n` (đếm từ 0) trong phòng — đúng cách chia của
/// bản cũ: xoay vòng 10 thể loại, mỗi thể loại kể 2 truyện; sau mỗi thể loại
/// KHÁC nhóm ưu tiên thì xen thêm 1 truyện nhóm ưu tiên, lần lượt nhân quả →
/// cha mẹ → thiện ác, rồi mới sang thể loại kế. Bản thân ba thể loại ưu tiên
/// không xen thêm sau chúng.
///
/// Truyện xen tới lượt trùng thể loại của khối NGAY SAU nó (vd xen "nhân quả"
/// rồi khối kế là "nhân quả") thì lấy nhóm ưu tiên kế trong vòng — không thì
/// ra ba truyện cùng thể loại liền nhau. Hàm thuần.
pub fn the_loai_thu(n: usize) -> &'static str {
    let (mut vi_tri, mut luot) = (0usize, 0usize);
    for khoi in 0.. {
        let goc = THE_LOAI[khoi % THE_LOAI.len()];
        if n < vi_tri + 2 {
            return goc;
        }
        vi_tri += 2;
        if UU_TIEN.contains(&goc) {
            continue;
        }
        let sau = THE_LOAI[(khoi + 1) % THE_LOAI.len()];
        let k = (0..UU_TIEN.len()).map(|d| (luot + d) % UU_TIEN.len()).find(|&k| UU_TIEN[k] != sau).unwrap_or(luot);
        if n == vi_tri {
            return UU_TIEN[k];
        }
        vi_tri += 1;
        luot = (k + 1) % UU_TIEN.len();
    }
    unreachable!()
}

/// Thể loại người vận hành TỰ ĐẶT (ô "Thể loại truyện"), tách theo dấu phẩy.
/// Rỗng là để phòng xoay vòng 12 thể loại như cũ. Hàm thuần.
pub fn the_loai_dat(cfg: &Value) -> Vec<String> {
    // Công tắc TẮT thì coi như chưa đặt gì — phòng xoay vòng như cũ, nhưng
    // danh sách thể loại người vận hành đã chọn vẫn nằm nguyên đó, bật lại là
    // dùng ngay, không phải gõ lại.
    if cfg.get("theoTheLoai").and_then(Value::as_bool) != Some(true) {
        return Vec::new();
    }
    cfg.get("theLoai")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .split(',')
        .map(str::trim)
        .filter(|x| !x.is_empty())
        .map(str::to_string)
        .collect()
}

/// Thể loại cho truyện thứ `n`: của người vận hành nếu họ đã đặt, không thì
/// xoay vòng như cũ.
///
/// Đặt NHIỀU thể loại (ngăn bằng dấu phẩy) thì xoay vòng trong đúng mấy cái
/// ấy — chọn "truyện cười, cổ tích" là hai thể loại thay phiên, không phải
/// chỉ kể mãi cái đầu. Hàm thuần.
pub fn the_loai_cho(dat: &[String], n: usize) -> String {
    if dat.is_empty() {
        return the_loai_thu(n).to_string();
    }
    dat[n % dat.len()].clone()
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
pub const GIAI_LAO_TOI_THIEU_MS: i64 = 5_000;
pub const GIAI_LAO_CHUYEN_MS: i64 = 15_000;
pub const GIAI_LAO_SU_CO_MS: i64 = 24 * 60 * 60 * 1000;
/// Còn ngần này nữa là hết giờ nghỉ đổi truyện thì báo MC "sắp hết".
/// Phải NGẮN hơn cả giờ nghỉ ngắn nhất, không thì lượt nào cũng là "sắp hết".
const SAP_HET_MS: i64 = 3_000;
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

/// Quãng chuyển giữa hai truyện: 5–15 giây, bốc ngẫu nhiên.
///
/// Trước đây quãng này co theo số người: phòng đông nghỉ 45–75 giây để MC chào
/// khách và đáp bình luận. Chủ phòng chốt bỏ: khách vào là để nghe truyện, một
/// phút màn chờ giữa hai truyện là một phút họ bấm đi chỗ khác. Chào khách giờ
/// có làn giọng riêng chạy song song với lời kể (`chao-vao.ts`), nên không cần
/// chừa chỗ trống cho nó nữa.
///
/// Vẫn pha ngẫu nhiên: nghỉ đúng một con số tròn mỗi lần thì buổi live thành
/// cái máy đếm nhịp, người xem đoán trước được. `seed` lấy từ mốc mở giờ nghỉ
/// nên hàm vẫn THUẦN — cùng mốc thì mọi cửa sổ ra cùng kết quả, không có
/// chuyện hai màn hình đếm lệch nhau.
///
/// Không bao giờ quá `GIAI_LAO_CHUYEN_MS`.
pub fn han_giai_lao(seed: i64) -> i64 {
    let (ngan, dai) = (GIAI_LAO_TOI_THIEU_MS, GIAI_LAO_CHUYEN_MS);
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
            let han = han_giai_lao(now);
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

const DAN_VIET: &str = r#"Bạn là MC của một phòng live kể truyện trên TikTok, người nghe đa phần là người lớn: ông bà, cha mẹ, người đi làm. Phòng tập trung truyện nhân quả, tình cảm cha mẹ – gia đình, thiện ác và truyện có chiều sâu giáo dục; bài học hiện qua diễn biến, không thuyết giảng. Viết MỘT truyện để kể tiếp trong phòng.

Luật:
- Thể loại: đúng như trong <the_loai>.
- Hợp khung giờ trong <gio>.
- CHỈ kể truyện CÓ THẬT, truyện quen thuộc người nghe đã biết (cổ tích, ngụ ngôn, truyện cười dân gian, gương danh nhân, truyện tình cảm gia đình). ƯU TIÊN truyện Việt Nam: người nghe là người Việt, thích nghe truyện của mình; truyện nước ngoài chỉ thỉnh thoảng, khi đã kể nhiều truyện Việt. TUYỆT ĐỐI không tự nghĩ ra truyện mới, không ghép truyện, không đổi tên truyện có sẵn thành tên khác.
- Có <dan_y_goc>: đó là dàn ý BẢN GỐC do người khác lập độc lập. "tinhTiet" của bạn PHẢI có đủ MỌI mục trong đó, đúng thứ tự (được tách nhỏ thêm, không được gộp hay bỏ mục nào); các câu nói nổi tiếng trong đó phải xuất hiện trong lời thoại; kết phải đúng "Kết". Người soát sẽ đối chiếu từng mục — thiếu một mục là truyện bị trả lại.
- Có <truyen_can_ke>: kể lại ĐÚNG truyện đó bằng lời của mình — giữ trọn cốt truyện gốc, các tình tiết đắt giá và câu nói nổi tiếng mà người nghe chờ đợi; không bịa chi tiết sai, không đổi kết. Chi tiết dữ trong bản gốc thì kể nhẹ đi cho hợp mọi lứa tuổi, nhưng không bỏ ý. Giọng kể như người lớn kể cho cả nhà, không nựng nịu kiểu kể cho bé. "ten" giữ nguyên tên trong <truyen_can_ke>.
- Không có <truyen_can_ke>: tự chọn MỘT truyện có thật khác hợp <the_loai>, chưa có trong <da_ke>, chọn truyện Việt Nam trước (cổ tích, truyện cười dân gian, gương danh nhân Việt…), chỉ lấy truyện nước ngoài khi không còn truyện Việt nào hợp — tên truyện phải là tên thật của truyện đó. Không nhớ chắc truyện nào thì chọn truyện khác mà bạn nhớ rõ, đừng bịa.
- "tuSangTac" là false (trừ truyện kỹ năng tự viết ở dưới).
- TUYỆT ĐỐI không trùng truyện nào trong <da_ke> (kể cả đổi tên).
- Kể ĐỦ cốt truyện, ĐÚNG THỨ TỰ TRƯỚC SAU: đoạn 1 là mở đầu, đoạn cuối là kết. Không kể ngược, không nhảy cóc, không hồi tưởng, không đảo chỗ hai đoạn. Đọc lần lượt từ đoạn 1 tới đoạn cuối phải ra đúng cốt truyện gốc.
- DÀN Ý TRƯỚC: "tinhTiet" là danh sách MỌI tình tiết BẮT BUỘC của truyện theo đúng thứ tự trước sau, mỗi tình tiết một dòng ngắn (dưới 100 ký tự). Truyện quen thuộc thì đó là các mắt xích của BẢN GỐC — thiếu một mắt xích là người nghe biết ngay kể sai (vd Thạch Sanh: gặp Lý Thông, giết chằn tinh, bị cướp công, bắn đại bàng cứu công chúa, bị lấp hang, cứu thái tử Thuỷ Tề, bị vu oan vào ngục, đàn kêu, công chúa nói lại, niêu cơm đánh lui quân mười tám nước…). Rồi mới viết các đoạn; mỗi đoạn ghi "tinhTiet": số thứ tự (từ 1) các tình tiết nó kể. Mọi tình tiết phải có ít nhất một đoạn kể, các đoạn đi đúng thứ tự tình tiết, không kể ngược. Đoạn chỉ nối mạch (không kể tình tiết nào) thì "tinhTiet": [].
- Cần bao nhiêu đoạn thì viết bấy nhiêu, {DOAN_MIN}–{DOAN_MAX} đoạn. Truyện dài nhiều biến cố (Tấm Cám, Thạch Sanh, Sọ Dừa…) thì dùng NHIỀU đoạn: mỗi biến cố một đoạn riêng. TUYỆT ĐỐI không nén hai ba biến cố vào một đoạn, không lược bớt mắt xích cho đủ số — thà dài hơn còn hơn kể thiếu thành sai truyện. Truyện ngắn thì 8 đoạn là đủ, không kéo dài lê thê.
- Mỗi đoạn 1–2 câu, dưới {KY_TU} ký tự, nối tiếp thành một mạch. Đoạn đầu mở bằng một câu gợi tò mò; giữa truyện có lúc gay cấn hoặc bất ngờ; kết có hậu hoặc lắng đọng. Giọng ấm, có hình ảnh, cảm xúc; lời thoại nhân vật trong ngoặc kép ở chỗ hợp. Thỉnh thoảng một chút hài nhẹ hoặc một khoảnh khắc lắng đọng — xen kẽ, không lố.
- Các đoạn CHỈ là nội dung truyện — chúng hiện nguyên văn trong khung truyện trên màn. TUYỆT ĐỐI không có trong đoạn: lời người dẫn nói với khán giả ("cả nhà ơi", "các bạn nhỏ ơi", "tối nay ai có anh chị em nhớ nhắn…", "nghe hay thì thả tim"), lời chào, lời mời, câu hỏi khán giả, hay bất cứ câu nào nói với NGƯỜI XEM thay vì kể truyện. Đoạn cuối là câu KẾT CỦA TRUYỆN, không phải lời nhắn tới người nghe — lời nhắn đó để MC tự nói ngoài truyện.
- Thể loại "truyện tranh kỹ năng sống" / "kỹ năng an toàn": truyện cho cả nhà nghe cùng con, mỗi truyện xoay quanh MỘT kỹ năng cụ thể (giữ vệ sinh, chia sẻ, xin lỗi, tự lập, tiết kiệm…; không đi theo hay mở cửa cho người lạ, không nhận quà người lạ, tránh xa ổ điện, bếp lửa, ao hồ nước sâu, đi lạc thì đứng yên tìm chú công an, nhớ số điện thoại bố mẹ, gọi 113 công an, 114 cứu hoả, 115 cấp cứu). Cách làm ĐÚNG hiện rõ qua việc nhân vật làm, đúng với thực tế an toàn; chuyện nguy hiểm kể nhẹ nhàng, không doạ trẻ. Không có <truyen_can_ke> và không còn truyện có thật nào hợp: được viết MỘT truyện kỹ năng ngắn, mạch lạc như truyện tranh thiếu nhi, nhân vật là trẻ em hay con vật gần gũi — khi đó "tuSangTac" là true, tên truyện ngắn gọn nêu đúng kỹ năng.
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
{"ten": "...", "tuSangTac": false, "tinhTiet": ["...", "..."], "doan": [{"chu": "...", "tinhTiet": [1]}, {"chu": "...", "tinhTiet": [2, 3]}], "phongCach": "...", "nhanVat": [{"ten": "...", "ta": "..."}]}"#;

/// Truyện ngắn thì chừng này đoạn là đủ — lời dặn hỏi từ mức này.
pub const DOAN_TOI_THIEU: usize = 8;
/// Truyện nhiều biến cố (Thạch Sanh, Tấm Cám, Sọ Dừa) cần chừng này đoạn mới kể
/// đủ mắt xích. Trước đây trần 20 đoạn, mỗi đoạn một câu dưới 110 ký tự: truyện
/// dài bị nén lại và mất tình tiết. Khớp `MOC_LUU_TOI_DA` (30) của contracts.
pub const DOAN_TOI_DA: usize = 30;
/// Mỗi đoạn 1–2 câu, dưới chừng này ký tự. 30 đoạn × 180 ký tự vẫn dưới trần
/// `passages` 20.000 ký tự của module Kể truyện.
pub const KY_TU_DOAN: usize = 180;
/// Ít hơn chừng này đoạn thì coi như AI trả hỏng. Thấp hơn `DOAN_TOI_THIEU`
/// một chút cho đỡ loại oan một truyện ngụ ngôn ngắn.
const DOAN_SAN: usize = 4;
/// Mỗi truyện tối đa chừng này tình tiết trong dàn ý.
const TINH_TIET_TOI_DA: usize = 40;

/// Dàn ý bị kể sai thế nào. Hàm kiểm trả cái này để lần nhờ AI viết lại nói
/// đúng chỗ sai.
#[derive(Debug, PartialEq)]
pub enum LoiTinhTiet {
    /// AI không trả dàn ý (hay đoạn không ghi tình tiết) — không kiểm được.
    KhongCoDanY,
    /// Các tình tiết (đánh số từ 1) không đoạn nào kể.
    Thieu(Vec<usize>),
    /// Đoạn thứ `doan` (từ 1) kể lùi về tình tiết đã qua.
    NguocThuTu { doan: usize },
}

/// Kiểm truyện đã kể ĐỦ và ĐÚNG THỨ TỰ dàn ý chưa.
///
/// `so_tinh_tiet` là số tình tiết trong dàn ý; `gan[i]` là các tình tiết đoạn
/// thứ i kể. Đủ: mọi tình tiết 1..=n có ít nhất một đoạn. Đúng thứ tự: tình
/// tiết nhỏ nhất của mỗi đoạn không nhỏ hơn tình tiết lớn nhất đã kể ở các
/// đoạn trước — hai đoạn cùng kể một tình tiết thì được (kể dài ra), quay lại
/// tình tiết đã qua thì không. Số ngoài 1..=n bỏ qua. Thiếu xét trước thứ tự.
/// Hàm thuần.
pub fn kiem_tinh_tiet(so_tinh_tiet: usize, gan: &[Vec<usize>]) -> Result<(), LoiTinhTiet> {
    if so_tinh_tiet == 0 || gan.iter().all(Vec::is_empty) {
        return Err(LoiTinhTiet::KhongCoDanY);
    }
    let hop = |k: &usize| (1..=so_tinh_tiet).contains(k);
    let thieu: Vec<usize> = (1..=so_tinh_tiet).filter(|k| !gan.iter().any(|g| g.contains(k))).collect();
    if !thieu.is_empty() {
        return Err(LoiTinhTiet::Thieu(thieu));
    }
    let mut da_toi = 0usize;
    for (i, g) in gan.iter().enumerate() {
        let Some(nho) = g.iter().copied().filter(hop).min() else { continue };
        if nho < da_toi {
            return Err(LoiTinhTiet::NguocThuTu { doan: i + 1 });
        }
        da_toi = da_toi.max(g.iter().copied().filter(hop).max().unwrap_or(nho));
    }
    Ok(())
}

/// Câu nhờ AI viết lại, nói đúng tình tiết thiếu hay đoạn kể ngược. Hàm thuần.
pub fn loi_sua_tinh_tiet(loi: &LoiTinhTiet, tinh_tiet: &[String]) -> String {
    khoi_sua_lai(&[mo_ta_loi_tinh_tiet(loi, tinh_tiet)], tinh_tiet)
}

/// Khối `<sua_lai>` gửi kèm lần nhờ viết lại: các lỗi (của hàm kiểm dàn ý hay
/// của người soát) và dàn ý bản trước, để người viết sửa đúng chỗ mà không
/// đánh rơi phần đã đúng. Hàm thuần.
pub fn khoi_sua_lai(cac_loi: &[String], tinh_tiet: &[String]) -> String {
    let dan_y = tinh_tiet.iter().enumerate().map(|(i, t)| format!("{}. {t}", i + 1)).collect::<Vec<_>>().join("\n");
    let loi = cac_loi.iter().map(|l| format!("- {l}")).collect::<Vec<_>>().join("\n");
    format!(
        "<sua_lai>\nBản trước còn các lỗi sau:\n{loi}\nViết lại TOÀN BỘ truyện, sửa hết các lỗi trên: kể đủ MỌI tình tiết của bản gốc, đúng chi tiết, đúng thứ tự, mỗi đoạn ghi đúng \"tinhTiet\". Dàn ý bản trước:\n{dan_y}\n</sua_lai>"
    )
}

/// Một lỗi dàn ý nói thành câu cho người viết đọc. Hàm thuần.
pub fn mo_ta_loi_tinh_tiet(loi: &LoiTinhTiet, tinh_tiet: &[String]) -> String {
    match loi {
        LoiTinhTiet::KhongCoDanY => {
            "Bản trước không có dàn ý \"tinhTiet\" hoặc các đoạn không ghi \"tinhTiet\" — trả đúng khuôn JSON đã dặn."
                .to_string()
        }
        LoiTinhTiet::Thieu(ds) => format!(
            "Bản trước KỂ THIẾU các tình tiết: {}. Không đoạn nào kể chúng.",
            ds.iter()
                .map(|k| format!("{k} ({})", tinh_tiet.get(k - 1).map(String::as_str).unwrap_or("?")))
                .collect::<Vec<_>>()
                .join("; ")
        ),
        LoiTinhTiet::NguocThuTu { doan } => format!("Bản trước KỂ NGƯỢC ở đoạn {doan}: quay lại tình tiết đã kể qua."),
    }
}

/// Lời dặn NGƯỜI SOÁT: đọc bản kể, đối chiếu cốt truyện gốc, chỉ báo lỗi cốt
/// truyện thật — không chữa văn.
const DAN_SOAT: &str = r#"Bạn là người SOÁT TRUYỆN cho một phòng live kể truyện. Người viết vừa kể lại một truyện; việc của bạn là bắt lỗi CỐT TRUYỆN trước khi truyện lên sóng.

- <tu_sang_tac> là false: đây là truyện quen thuộc có tên trong <ten>. Đối chiếu với CỐT TRUYỆN GỐC (bản dân gian phổ biến nhất). Báo:
  - "thieu": tình tiết / mắt xích của bản gốc bị bỏ mất, khiến người nghe thấy kể sai (vd Thạch Sanh mà không có đoạn bị lấp hang, Tấm Cám mà không có đoạn hoá chim vàng anh).
  - "sai": chi tiết sai so với bản gốc — sai tên nhân vật, sai ai làm gì, sai vật thần, sai kết cục.
  - "dao": chỗ kể đảo thứ tự trước sau so với bản gốc.
- <tu_sang_tac> là true: truyện tự sáng tác, KHÔNG có bản gốc. Chỉ kiểm mạch truyện có liền không (đoạn sau nối đúng đoạn trước, không hụt ý) và các đoạn có khớp <dan_y> không.
- Có <dan_y_goc> (dàn ý bản gốc do người khác lập độc lập): đối chiếu TỪNG MỤC một. Mục nào không được kể ra trong <doan> — kể cả bị gộp lướt trong một câu đến mức người nghe không thấy chuyện đó xảy ra — là "thieu". Câu nói / câu vè nổi tiếng trong dàn ý gốc mà bản kể bỏ mất cũng là "thieu". Kết khác "Kết" của dàn ý gốc là "sai". Mắt xích trong dàn ý gốc KHÔNG phải chi tiết phụ.
- Chỉ báo lỗi THẬT về cốt truyện. KHÔNG bắt lỗi văn phong, chính tả, độ dài; KHÔNG đòi thêm chi tiết phụ hiếm gặp NGOÀI dàn ý gốc; các bản dân gian khác nhau ở chi tiết nhỏ thì chấp nhận. Kể nhẹ đi đoạn dữ (miễn không bỏ ý) không phải lỗi.
- Mỗi lỗi một câu ngắn, nói rõ đoạn nào sai và đúng ra phải là gì.

Trả JSON thuần, không rào ```:
{"dat": true, "thieu": [], "sai": [], "dao": []}"#;

/// Đọc trả lời của người soát: danh sách lỗi (thiếu / sai / đảo), rỗng là đạt.
/// `None` khi không đọc được — không có JSON hay thiếu khoá `dat`. Người soát
/// ghi `dat: false` mà không kê lỗi nào thì vẫn tính là lỗi, để người viết
/// được nhờ soát lại. Hàm thuần.
pub fn doc_soat(than: &str) -> Option<Vec<String>> {
    let v = boc_json(than)?;
    let dat = v.get("dat").and_then(Value::as_bool)?;
    let mut loi = Vec::new();
    for (k, nhan) in [("thieu", "Thiếu tình tiết"), ("sai", "Sai chi tiết"), ("dao", "Đảo thứ tự")] {
        for x in v.get(k).and_then(Value::as_array).into_iter().flatten().filter_map(Value::as_str) {
            let x = x.trim();
            if !x.is_empty() {
                loi.push(format!("{nhan}: {}", x.chars().take(300).collect::<String>()));
            }
        }
    }
    if !dat && loi.is_empty() {
        loi.push("Người soát thấy truyện chưa đúng bản gốc nhưng không nói rõ chỗ nào — soát kỹ lại từng tình tiết.".into());
    }
    Some(loi)
}

/// Lời nhắn gửi người soát: tên, cờ tự sáng tác, dàn ý và các đoạn (ghi kèm
/// tình tiết mỗi đoạn kể). Hàm thuần.
pub fn loi_cho_soat(t: &TruyenMoi, goc: Option<&str>) -> String {
    let dan_y = t.tinh_tiet.iter().enumerate().map(|(i, x)| format!("{}. {x}", i + 1)).collect::<Vec<_>>().join("\n");
    let doan = t
        .doan
        .iter()
        .enumerate()
        .map(|(i, d)| match t.gan.get(i).filter(|g| !g.is_empty()) {
            Some(g) => format!("{}. {d} (tình tiết {g:?})", i + 1),
            None => format!("{}. {d}", i + 1),
        })
        .collect::<Vec<_>>()
        .join("\n");
    let goc = goc.map(|g| format!("<dan_y_goc>\n{}\n</dan_y_goc>\n", g.trim())).unwrap_or_default();
    format!(
        "<ten>{}</ten>\n<tu_sang_tac>{}</tu_sang_tac>\n{goc}<dan_y>\n{dan_y}\n</dan_y>\n<doan>\n{doan}\n</doan>",
        t.ten, t.tu_sang_tac
    )
}

/// Lời dặn NGƯỜI LẬP DÀN Ý GỐC: liệt kê đủ cốt truyện bản gốc của một truyện
/// quen thuộc, ĐỘC LẬP với người viết — để người viết không tự đặt dàn ý ngắn
/// rồi tự chấm là đủ, và người soát có một bản để đối chiếu từng mục.
const DAN_DAN_Y_GOC: &str = r#"Bạn là người thuộc truyện dân gian, cổ tích, ngụ ngôn, truyện đọc sách giáo khoa Việt Nam và truyện thiếu nhi thế giới quen thuộc. Cho tên một truyện trong <ten>. Lập DÀN Ý BẢN GỐC phổ biến nhất của truyện ấy:
- "tinhTiet": MỌI tình tiết / mắt xích của bản gốc theo đúng thứ tự trước sau, mỗi mục một dòng ngắn (dưới 100 ký tự). Đủ từ mở đầu tới kết, không gộp hai biến cố vào một mục, không bỏ mắt xích nào người nghe đã quen (vd Tấm Cám phải có cả bắt tép, cá bống, nhặt thóc, đi hội, chiếc giày, cây cau, chim vàng anh, xoan đào, khung cửi, quả thị, miếng trầu). Truyện ngắn thì ít mục, truyện dài thì nhiều mục — đúng như bản gốc.
- "cauNoi": các câu nói, câu vè, câu thần chú nổi tiếng gắn với truyện (rỗng nếu không có).
- "ket": kết truyện đúng bản gốc, một câu.
- Không nhớ chắc truyện này (tên lạ, không có thật, nhớ lơ mơ) thì trả {"biet": false} — TUYỆT ĐỐI không đoán, không bịa.

Trả JSON thuần, không rào ```:
{"biet": true, "tinhTiet": ["..."], "cauNoi": ["..."], "ket": "..."}"#;

/// Đọc dàn ý gốc: `Some(Some(khối chữ))` khi biết truyện, `Some(None)` khi
/// người lập dàn ý nói không biết, `None` khi trả không đọc được. Hàm thuần.
pub fn doc_dan_y_goc(than: &str) -> Option<Option<String>> {
    let v = boc_json(than)?;
    if v.get("biet").and_then(Value::as_bool) == Some(false) {
        return Some(None);
    }
    let ds = |k: &str| -> Vec<String> {
        v.get(k)
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .map(|x| x.trim().chars().take(200).collect::<String>())
            .filter(|x| !x.is_empty())
            .take(40)
            .collect()
    };
    let tinh_tiet = ds("tinhTiet");
    if tinh_tiet.is_empty() {
        return None;
    }
    let mut ra: Vec<String> = tinh_tiet.iter().enumerate().map(|(i, x)| format!("{}. {x}", i + 1)).collect();
    let cau = ds("cauNoi");
    if !cau.is_empty() {
        ra.push(format!("Câu nói nổi tiếng: {}", cau.join(" | ")));
    }
    if let Some(k) = v.get("ket").and_then(Value::as_str).map(str::trim).filter(|k| !k.is_empty()) {
        ra.push(format!("Kết: {}", k.chars().take(240).collect::<String>()));
    }
    Some(Some(ra.join("\n")))
}

/// Lập dàn ý gốc cho truyện quen `ten`. `Ok(None)`: không lập được (AI lỗi,
/// trả hỏng) — viết như cũ, không có dàn ý gốc. `Err`: người lập dàn ý nói
/// không biết truyện này — đừng để người viết bịa.
fn lap_dan_y_goc(st: &AppState, id: &str, ten: &str) -> Result<Option<String>, String> {
    match goi_ai_viet(st, id, DAN_DAN_Y_GOC, &format!("<ten>{ten}</ten>")).map(|t| doc_dan_y_goc(&t.chu)) {
        Ok(Some(Some(g))) => {
            let so_muc = g.lines().filter(|l| l.chars().next().is_some_and(|c| c.is_ascii_digit())).count();
            tracing::info!(thiet_ke = %id, %ten, so_muc, "đã lập dàn ý gốc");
            Ok(Some(g))
        }
        Ok(Some(None)) => Err(format!("không ai nhớ chắc truyện \"{ten}\" — không kể để khỏi bịa")),
        Ok(None) => {
            tracing::warn!(thiet_ke = %id, %ten, "dàn ý gốc trả không đọc được — viết không có dàn ý gốc");
            Ok(None)
        }
        Err(e) => {
            tracing::warn!(thiet_ke = %id, %ten, "chưa lập được dàn ý gốc ({e}) — viết không có dàn ý gốc");
            Ok(None)
        }
    }
}

/// Lời dặn NGƯỜI PHÂN VAI: gán giọng dẫn chuyện, mỗi nhân vật một giọng, và
/// không khí từng đoạn — để MC kể đúng vai, đúng giọng điệu.
const DAN_PHAN_VAI: &str = r#"Bạn là người PHÂN VAI cho một truyện sắp được đọc to trong phòng live kể truyện. Chọn giọng trong <dan_giong> (chỉ dùng đúng các "id" có ở đó).

- "giongDan": một id trong <giong_dan_duoc> để dẫn chuyện, hợp không khí truyện.
- "vai": mỗi nhân vật CÓ LỜI THOẠI trong truyện một mục {"ten", "giong"}: chọn giọng hợp tuổi, giới, tính cách (trẻ con, cô bé, cậu bé → giọng trẻ con / giọng nữ trẻ; đàn ông, ông lão → giọng nam; mẹ, bà, cô gái → giọng nữ). Mỗi nhân vật giữ một giọng; hai nhân vật cùng có mặt thì không trùng giọng nếu <dan_giong> đủ giọng. Không dùng giọng dẫn chuyện cho nhân vật nếu còn giọng khác.
- "camXuc": mỗi đoạn trong <doan> đúng một chữ chỉ không khí để kể đúng giọng điệu, theo thứ tự đoạn: "vui", "buồn", "hồi hộp", "lắng đọng", "ấm áp", "hài hước" hay "bình thường".

Trả JSON thuần, không rào ```:
{"giongDan": "...", "vai": [{"ten": "...", "giong": "..."}], "camXuc": ["...", "..."]}"#;

/// Phân vai đã lọc: chỉ giọng có thật, đọc được.
#[derive(Debug, Default, PartialEq)]
pub struct PhanVai {
    pub giong_dan: String,
    /// (tên nhân vật, id giọng).
    pub vai: Vec<(String, String)>,
    /// Một chữ mỗi đoạn, cùng thứ tự đoạn.
    pub cam_xuc: Vec<String>,
}

/// Không khí đoạn nhận được. Chữ lạ thì "bình thường".
const CAM_XUC: [&str; 7] = ["vui", "buồn", "hồi hộp", "lắng đọng", "ấm áp", "hài hước", "bình thường"];

/// Lọc trả lời của người phân vai. `giong_vai`: giọng được giao cho nhân vật;
/// `giong_dan_duoc`: giọng được dẫn chuyện. Id lạ bỏ; giọng dẫn lạ thì lấy
/// giọng dẫn đầu tiên được phép. Hai nhân vật trùng giọng mà còn giọng chưa
/// dùng thì đổi người sau sang giọng chưa dùng — chỉ khi dàn đủ giọng cho mọi
/// nhân vật, không thì để trùng. `camXuc` cắt / bù cho đủ `so_doan`.
/// `None` khi không đọc được JSON. Hàm thuần.
pub fn loc_phan_vai(than: &str, giong_vai: &[String], giong_dan_duoc: &[String], so_doan: usize) -> Option<PhanVai> {
    let v = boc_json(than)?;
    let giong_dan = v
        .get("giongDan")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|g| giong_dan_duoc.iter().any(|x| x == g))
        .map(str::to_string)
        .or_else(|| giong_dan_duoc.first().cloned())
        .unwrap_or_default();
    let mut vai: Vec<(String, String)> = Vec::new();
    for m in v.get("vai").and_then(Value::as_array).into_iter().flatten() {
        let ten: String = m.get("ten").and_then(Value::as_str).unwrap_or_default().trim().chars().take(80).collect();
        let g = m.get("giong").and_then(Value::as_str).unwrap_or_default().trim();
        if ten.is_empty() || !giong_vai.iter().any(|x| x == g) || vai.iter().any(|(t, _)| *t == ten) {
            continue;
        }
        vai.push((ten, g.to_string()));
        if vai.len() >= 20 {
            break;
        }
    }
    if vai.len() <= giong_vai.len() {
        for i in 1..vai.len() {
            let trung = vai[..i].iter().any(|(_, g)| *g == vai[i].1);
            if trung {
                if let Some(moi) = giong_vai.iter().find(|g| !vai.iter().any(|(_, x)| x == *g)) {
                    vai[i].1 = moi.clone();
                }
            }
        }
    }
    let mut cam_xuc: Vec<String> = v
        .get("camXuc")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .map(|x| {
            let t = x.as_str().unwrap_or_default().trim().to_lowercase();
            if CAM_XUC.contains(&t.as_str()) { t } else { "bình thường".to_string() }
        })
        .take(so_doan)
        .collect();
    cam_xuc.resize(so_doan, "bình thường".to_string());
    Some(PhanVai { giong_dan, vai, cam_xuc })
}

/// Ô `phanVai` lưu vào cấu hình module Kể truyện. Hàm thuần.
pub fn phan_vai_json(pv: &PhanVai) -> Value {
    json!({
        "giongDan": pv.giong_dan,
        "vai": pv.vai.iter().map(|(t, g)| json!({ "ten": t, "giong": g })).collect::<Vec<_>>(),
        "camXuc": pv.cam_xuc,
    })
}

/// Lời nhắn gửi người phân vai. Hàm thuần.
pub fn loi_cho_phan_vai(t: &TruyenMoi, dan: &[(String, String)], giong_dan_duoc: &[String]) -> String {
    let ds = dan.iter().map(|(id, vai)| format!("- {id}: {vai}")).collect::<Vec<_>>().join("\n");
    let doan = t.doan.iter().enumerate().map(|(i, d)| format!("{}. {d}", i + 1)).collect::<Vec<_>>().join("\n");
    format!(
        "<ten>{}</ten>\n<nhan_vat>\n{}\n</nhan_vat>\n<dan_giong>\n{ds}\n</dan_giong>\n<giong_dan_duoc>{}</giong_dan_duoc>\n<doan>\n{doan}\n</doan>",
        t.ten,
        t.nhan_vat,
        giong_dan_duoc.join(", ")
    )
}

/// Số vòng nhờ người viết sửa (sau bản đầu). Người dùng chốt: đúng truyện trên
/// hết, chi phí không phải vấn đề — nhưng vẫn phải có trần, kẻo một truyện
/// khó làm phòng chờ mãi.
const VONG_SUA_TOI_DA: usize = 2;

/// Truyện AI viết, đã lọc. Hàm thuần.
#[derive(Debug, Default, PartialEq)]
pub struct TruyenMoi {
    pub ten: String,
    pub tu_sang_tac: bool,
    pub doan: Vec<String>,
    pub phong_cach: String,
    /// Các dòng "Tên: ngoại hình".
    pub nhan_vat: String,
    /// Dàn ý: các tình tiết bắt buộc theo thứ tự. Rỗng là AI không trả dàn ý.
    pub tinh_tiet: Vec<String>,
    /// `gan[i]`: các tình tiết (từ 1) đoạn thứ i kể. Cùng độ dài với `doan`.
    pub gan: Vec<Vec<usize>>,
}

/// Đọc truyện AI trả: tên không trống, không trùng sổ; `DOAN_SAN`–`DOAN_TOI_DA`
/// đoạn, mỗi đoạn gọn một dòng dưới `KY_TU_DOAN` ký tự. Nhận cả đoạn dạng
/// chuỗi (khuôn cũ, không có ánh xạ tình tiết) lẫn dạng `{chu, tinhTiet}`.
/// Hàm thuần.
pub fn doc_truyen(than: &str, da_ke: &[String]) -> Option<TruyenMoi> {
    let v = boc_json(than)?;
    let ten: String = v.get("ten").and_then(Value::as_str)?.trim().chars().take(80).collect();
    if ten.is_empty() || da_ke.iter().any(|t| chuan(t) == chuan(&ten)) {
        return None;
    }
    let (doan, gan): (Vec<String>, Vec<Vec<usize>>) = v
        .get("doan")
        .and_then(Value::as_array)?
        .iter()
        .filter_map(|d| {
            let (chu, tt) = match d {
                Value::String(c) => (c.as_str(), Vec::new()),
                Value::Object(o) => (
                    o.get("chu").and_then(Value::as_str)?,
                    o.get("tinhTiet")
                        .and_then(Value::as_array)
                        .map(|a| a.iter().filter_map(Value::as_u64).map(|k| k as usize).collect())
                        .unwrap_or_default(),
                ),
                _ => return None,
            };
            let chu = chu.split_whitespace().collect::<Vec<_>>().join(" ");
            let chu: String = chu.trim_start_matches("📖").trim().chars().take(KY_TU_DOAN).collect();
            (!chu.is_empty()).then_some((chu, tt))
        })
        .take(DOAN_TOI_DA)
        .unzip();
    if doan.len() < DOAN_SAN {
        return None;
    }
    let tinh_tiet: Vec<String> = v
        .get("tinhTiet")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(|t| t.trim().chars().take(160).collect::<String>())
        .filter(|t| !t.is_empty())
        .take(TINH_TIET_TOI_DA)
        .collect();
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
        tinh_tiet,
        gan,
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
    let dat = the_loai_dat(cfg);
    let loai_s = the_loai_cho(&dat, so.len() + 1);
    let loai = loai_s.as_str();
    let mut cam = so.clone();
    cam.push(hien.to_string());

    // KHÁCH XIN TRUYỆN đi trước mọi cách chọn khác. Được kể lại truyện đã kể.
    if chuan_bi_yeu_cau(st, id, cfg, &cam, loai)? {
        return Ok(());
    }

    let tu_kho = |t: &TruyenKho| {
        (
            t.ten.clone(),
            t.loai.clone(),
            t.doan.clone(),
            if t.tu_sang_tac { "kho · truyện MC kể" } else { "kho" },
            String::new(),
            String::new(),
            json!({}),
        )
    };
    // Truyện kho mẫu cũng qua người soát; thiếu thì AI viết lại đúng truyện đó.
    let mau = chon_tu_kho(kho_truyen(), &so, hien, loai);
    let mau_dat = mau.filter(|t| ban_co_san_dat(st, id, &t.ten, &t.doan, t.tu_sang_tac));
    let (ten, loai_ghi, doan, nguon, phong_cach, nhan_vat, phan_vai) = if let Some(t) = mau_dat {
        tu_kho(t)
    } else {
        // Truyện quen thuộc chưa kể trước; hết danh mục mới để AI sáng tác.
        let (ke_lai, loai_viet) = match (mau, chon_danh_muc(loai, &cam)) {
            (Some(t), _) if !t.tu_sang_tac => (Some(t.ten.as_str()), t.loai.as_str()),
            (_, Some((ten, l))) => (Some(ten), l),
            _ => (None, loai),
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

    // Đọc lại: người vận hành có thể đã tự đặt truyện sau trong lúc chờ —
    // hoặc khách vừa xin truyện trong lúc AI viết: bỏ truyện máy tự chọn này,
    // nhịp sau chuẩn bị đúng truyện khách xin.
    if cfg_story(st, id).is_some_and(|c| san_sang(&c).is_some() || !hang_cho(&c).is_empty()) {
        return Ok(());
    }
    ghi_truyen_sau(st, id, ten, loai_ghi, doan, nguon, phong_cach, nhan_vat, phan_vai, "")
}

/// Bỏ truyện `ten` khỏi đầu hàng chờ — đọc lại hàng, vì trong lúc viết khách
/// có thể đã xin thêm.
fn bo_khoi_hang(st: &AppState, id: &str, ten: &str) {
    let Some(c) = cfg_story(st, id) else { return };
    let mut hang = hang_cho(&c);
    if let Some(i) = hang
        .iter()
        .position(|x| cung_truyen(x.get("ten").and_then(Value::as_str).unwrap_or_default(), ten))
    {
        hang.remove(i);
        if let Err(e) = st.set_config(id, MODULE, json!({ "yeuCau": hang })) {
            tracing::warn!(thiet_ke = %id, ?e, "không ghi được hàng chờ truyện");
        }
    }
}

/// Chuẩn bị truyện ĐẦU HÀNG CHỜ khách xin. `Ok(true)` khi đã ghi truyện sau.
///
/// - Truyện đã kể (trong kho, kèm ảnh cũ) hay có trong kho sẵn: kể lại luôn,
///   không tốn lượt viết, không vẽ lại ảnh.
/// - Chưa có: AI tìm và kể lại đúng truyện đó — qua kiểm dàn ý, người soát,
///   người phân vai như mọi truyện. Không viết được (truyện không có thật,
///   AI không biết) thì bỏ khỏi hàng, phòng chọn truyện như thường.
fn chuan_bi_yeu_cau(st: &AppState, id: &str, cfg: &Value, cam: &[String], loai: &str) -> Result<bool, String> {
    let Some(dau) = hang_cho(cfg).first().cloned() else { return Ok(false) };
    let ten = dau.get("ten").and_then(Value::as_str).unwrap_or_default().trim().to_string();
    let khach = dau.get("khach").and_then(Value::as_str).unwrap_or_default().trim().to_string();
    if ten.is_empty() {
        bo_khoi_hang(st, id, &ten);
        return Ok(false);
    }
    tracing::info!(thiet_ke = %id, %ten, %khach, "chuẩn bị truyện khách xin");

    // Đã kể ở phòng này: lấy nguyên bản trong kho, kèm ảnh đã vẽ — sau khi
    // người soát xem bản ấy còn đủ truyện. Thiếu thì viết lại bản đầy đủ.
    let kho = tim_trong_kho(&crate::kho_da_ke::doc(&st.layout, id), &ten).filter(|t| {
        let ten_k = t.get("title").and_then(Value::as_str).unwrap_or_default();
        let doan_k = crate::anh_truyen::cat_doan(t.get("passages").and_then(Value::as_str).unwrap_or_default());
        let mc_ke = t.get("nguon").and_then(Value::as_str).is_some_and(|n| n.contains("truyện MC kể"));
        ban_co_san_dat(st, id, ten_k, &doan_k, mc_ke)
    });
    if let Some(t) = kho {
        let lay = |k: &str| t.get(k).cloned().unwrap_or(json!(""));
        st.set_config(
            id,
            MODULE,
            json!({ "truyenSau": {
                "title": lay("title"),
                "passages": lay("passages"),
                "loai": lay("loai"),
                "nguon": "kho · khách xin",
                "moc": t.get("moc").cloned().unwrap_or(json!([])),
                "hoSoCua": lay("hoSoCua"),
                "phongCach": lay("phongCach"),
                "nhanVat": lay("nhanVat"),
                "hoSoTruyen": lay("hoSoTruyen"),
                "anhLoi": "",
                "phanVai": t.get("phanVai").cloned().unwrap_or(json!({})),
                "theoYeuCau": khach,
            }}),
        )
        .map_err(|e| format!("không ghi được cấu hình: {e:?}"))?;
        tracing::info!(thiet_ke = %id, ten = %lay("title"), %khach, "kể lại truyện trong kho theo khách xin");
        bo_khoi_hang(st, id, &ten);
        return Ok(true);
    }

    // Có trong kho truyện mẫu của bản cũ.
    if let Some(t) = kho_truyen()
        .iter()
        .find(|t| cung_truyen(&t.ten, &ten))
        .filter(|t| ban_co_san_dat(st, id, &t.ten, &t.doan, t.tu_sang_tac))
    {
        let nguon = if t.tu_sang_tac { "kho · truyện MC kể" } else { "kho · khách xin" };
        ghi_truyen_sau(st, id, t.ten.clone(), t.loai.clone(), t.doan.clone(), nguon, String::new(), String::new(), json!({}), &khach)?;
        bo_khoi_hang(st, id, &ten);
        return Ok(true);
    }

    // Chưa có: AI tìm đúng truyện ấy mà kể lại. Bỏ tên ấy khỏi sổ cấm — khách
    // xin thì được kể lại truyện đã kể.
    let cam: Vec<String> = cam.iter().filter(|c| !cung_truyen(c, &ten)).cloned().collect();
    match viet_bang_ai(st, id, loai, Some(&ten), &cam) {
        Ok((ten_v, loai_ghi, doan, _, phong_cach, nhan_vat, phan_vai)) => {
            ghi_truyen_sau(st, id, ten_v, loai_ghi, doan, "AI · khách xin", phong_cach, nhan_vat, phan_vai, &khach)?;
            bo_khoi_hang(st, id, &ten);
            Ok(true)
        }
        Err(e) => {
            tracing::warn!(thiet_ke = %id, %ten, %khach, "không kể được truyện khách xin ({e}) — bỏ khỏi hàng chờ");
            bo_khoi_hang(st, id, &ten);
            let _ = st.set_config(id, MODULE, json!({ "yeuCauLoi": { "ten": ten, "khach": khach, "luc": crate::state::bay_gio_ms() } }));
            Ok(false)
        }
    }
}

type TruyenViet = (String, String, Vec<String>, &'static str, String, String, Value);

/// Trần token cho một lượt viết truyện qua API: 30 đoạn × 180 ký tự tiếng Việt
/// kèm dàn ý, ánh xạ tình tiết và hồ sơ nhân vật.
const MAX_TOKEN_VIET: u32 = 12_000;

/// Một lượt gọi AI cho việc viết truyện (viết, soát, phân vai): cùng đường,
/// cùng model viết truyện (`cliModelViet`), ghi vào khoản chi phí viết truyện.
fn goi_ai_viet(st: &AppState, id: &str, dan: &str, loi: &str) -> Result<crate::ai::TraLoi, String> {
    let story = cfg_story(st, id);
    // Mọi lượt (viết, soát, phân vai) đi cùng một đường và cùng model viết
    // truyện (`cliModelViet`), và đều ghi vào sổ chi phí khoản viết truyện.
    let tra = if let Some(cong) = crate::cli_goi::cong_cua(story.as_ref()) {
        // Tài khoản Claude / ChatGPT qua CLI: một session riêng cho truyện này.
        crate::cli_goi::goi_viet(
            cong,
            id,
            dan,
            loi,
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
        let than = than_chat(p.kind, &model_cho(&ai.model, &p), dan, loi, MAX_TOKEN_VIET);
        goi(&p, &than)?
    };
    st.ghi_chi_phi(id, crate::chi_phi::VIET, &tra.dung, tra.usd);
    Ok(tra)
}

/// Người soát xem một bản CÓ SẴN (kho đã kể, kho mẫu) trước khi kể lại: bản
/// cũ có thể viết từ hồi chưa có kiểm dàn ý và người soát, thiếu tình tiết.
/// `true` là đạt — hay không soát được (AI lỗi): khi ấy viết lại cũng không
/// được, kể bản có sẵn còn hơn để phòng đứng.
fn ban_co_san_dat(st: &AppState, id: &str, ten: &str, doan: &[String], tu_sang_tac: bool) -> bool {
    let t = TruyenMoi {
        ten: ten.to_string(),
        tu_sang_tac,
        doan: doan.to_vec(),
        ..TruyenMoi::default()
    };
    // Truyện quen: lập dàn ý gốc để soát từng mục. Không biết truyện thì cũng
    // không viết lại được — kể bản có sẵn.
    let goc = if tu_sang_tac { None } else { lap_dan_y_goc(st, id, ten).ok().flatten() };
    match goi_ai_viet(st, id, DAN_SOAT, &loi_cho_soat(&t, goc.as_deref())).map(|tra| doc_soat(&tra.chu)) {
        Ok(Some(loi)) if loi.is_empty() => {
            tracing::info!(thiet_ke = %id, %ten, so_doan = doan.len(), "bản có sẵn qua soát");
            true
        }
        Ok(Some(loi)) => {
            tracing::warn!(thiet_ke = %id, %ten, ?loi, "bản có sẵn chưa đủ, viết lại bản đầy đủ");
            false
        }
        Ok(None) => {
            tracing::warn!(thiet_ke = %id, %ten, "người soát trả không đọc được — kể bản có sẵn");
            true
        }
        Err(e) => {
            tracing::warn!(thiet_ke = %id, %ten, "chưa soát được bản có sẵn ({e}) — kể bản có sẵn");
            true
        }
    }
}

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
        let dan = DAN_VIET
            .replace("{VI_DU}", &vi_du)
            .replace("{DOAN_MIN}", &DOAN_TOI_THIEU.to_string())
            .replace("{DOAN_MAX}", &DOAN_TOI_DA.to_string())
            .replace("{KY_TU}", &KY_TU_DOAN.to_string());
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
        // DÀN Ý GỐC lập độc lập TRƯỚC khi viết (chỉ với truyện quen có tên):
        // người viết phải kể đủ từng mục, người soát đối chiếu từng mục.
        let goc: Option<String> = match ke_lai {
            Some(ten) => lap_dan_y_goc(st, id, ten)?,
            None => None,
        };
        let goc_khoi = goc.as_deref().map(|g| format!("<dan_y_goc>\n{g}\n</dan_y_goc>\n")).unwrap_or_default();
        let loi: String = format!(
            "{can_ke}{goc_khoi}<the_loai>{loai}</the_loai>\n<gio>{khung}: truyện {giong}</gio>\n<da_ke>\n{}\n</da_ke>",
            gan.iter().map(|t| format!("- {t}")).collect::<Vec<_>>().join("\n")
        );
        // Truyện + dàn ý + hồ sơ tiếng Việt khá nhiều token: chừa rộng, cụt giữa
        // chừng là JSON hỏng. 30 đoạn × 180 ký tự kèm dàn ý và ánh xạ tình tiết
        // vượt xa mức 6.000 cũ — đã từng lỗi vì câu trả lời bị cắt cụt.
        let goi_ai = |dan: &str, loi: &str| goi_ai_viet(st, id, dan, loi);
        let cam_doc: &[String] = if ke_lai.is_some() { &[] } else { cam };
        let doc = |chu: &str| -> Result<TruyenMoi, String> {
            doc_truyen(chu, cam_doc)
                .map(|mut t| {
                    // Kể lại truyện có tên sẵn: tên của danh mục là chuẩn (AI hay thêm thắt).
                    if let Some(ten) = ke_lai {
                        t.ten = ten.to_string();
                        t.tu_sang_tac = false;
                    }
                    t
                })
                .ok_or_else(|| {
                    let dau: String = chu.chars().take(160).collect();
                    let trung = crate::ai::boc_json(chu)
                        .and_then(|v| v.get("ten").and_then(Value::as_str).map(str::to_string))
                        .filter(|ten| cam.iter().any(|c| chuan(c) == chuan(ten)));
                    match trung {
                        Some(ten) => format!("AI viết trùng truyện đã kể: {ten}"),
                        None => format!("AI trả không đọc được ({} ký tự): {dau}", chu.chars().count()),
                    }
                })
        };
        // ĐÚNG TRUYỆN TRÊN HẾT. Bản đầu, rồi tối đa `VONG_SUA_TOI_DA` vòng sửa.
        // Mỗi vòng: (1) hàm kiểm dàn ý — đủ mọi tình tiết, đúng thứ tự; (2) qua
        // rồi thì NGƯỜI SOÁT đối chiếu bản gốc — thiếu mắt xích, sai chi tiết,
        // đảo thứ tự. Còn lỗi thì gửi người viết đúng danh sách lỗi để sửa. Hết
        // vòng vẫn lỗi: báo lỗi, phòng lấy truyện kho — KHÔNG đưa truyện sai
        // lên sóng.
        let mut lan = loi.clone();
        let mut t = doc(&goi_ai(&dan, &lan)?.chu)?;
        for vong in 0..=VONG_SUA_TOI_DA {
            let cac_loi: Vec<String> = match kiem_tinh_tiet(t.tinh_tiet.len(), &t.gan) {
                Err(e) => vec![mo_ta_loi_tinh_tiet(&e, &t.tinh_tiet)],
                Ok(()) => match doc_soat(&goi_ai(DAN_SOAT, &loi_cho_soat(&t, goc.as_deref()))?.chu) {
                    Some(ds) => ds,
                    // Người soát trả hỏng khuôn: bản đã qua hàm kiểm dàn ý, không
                    // giữ truyện lại chỉ vì lỗi định dạng của lượt soát.
                    None => {
                        tracing::warn!(thiet_ke = %id, ten = %t.ten, "người soát trả không đọc được — giữ bản đã qua kiểm dàn ý");
                        Vec::new()
                    }
                },
            };
            if cac_loi.is_empty() {
                tracing::info!(thiet_ke = %id, ten = %t.ten, so_tinh_tiet = t.tinh_tiet.len(), so_doan = t.doan.len(), vong_sua = vong, "truyện qua soát");
                break;
            }
            tracing::warn!(thiet_ke = %id, ten = %t.ten, vong, loi = ?cac_loi, "truyện chưa đúng bản gốc");
            if vong == VONG_SUA_TOI_DA {
                return Err(format!("truyện \"{}\" vẫn chưa đúng bản gốc sau {VONG_SUA_TOI_DA} lần sửa: {}", t.ten, cac_loi.join(" | ")));
            }
            lan = format!("{loi}\n{}", khoi_sua_lai(&cac_loi, &t.tinh_tiet));
            t = doc(&goi_ai(&dan, &lan)?.chu)?;
        }
        // NGƯỜI PHÂN VAI: giọng dẫn, giọng từng nhân vật, không khí từng đoạn.
        // Chỉ trong các giọng đọc được và người vận hành đã giao: họ đã chọn
        // người dẫn hay danh sách giọng nhân vật thì người phân vai chọn TRONG
        // đó. Lượt này hỏng không làm hỏng truyện — kể không phân vai.
        let phan_vai = phan_vai_cho(st, id, &t, |d, l| goi_ai(d, l));
        // Chỉ kể truyện có thật: AI vẫn đánh dấu tự sáng tác thì cũng không
        // gán là "truyện MC kể" — nguồn ghi đúng việc nó làm.
        let nguon = "AI · kể lại truyện quen";
        Ok((t.ten, loai.to_string(), t.doan, nguon, t.phong_cach, t.nhan_vat, phan_vai))
    }
}

/// Gọi người phân vai cho truyện `t`, lọc kết quả. Dàn giọng: giọng ĐỌC ĐƯỢC
/// nhóm kể chuyện, trong giới hạn người vận hành đã giao (giọng dẫn, giọng
/// nhân vật). Không có giọng nào hay lượt hỏng thì `{}` — MC kể như trước.
fn phan_vai_cho(
    st: &AppState,
    id: &str,
    t: &TruyenMoi,
    goi_ai: impl Fn(&str, &str) -> Result<crate::ai::TraLoi, String>,
) -> Value {
    let doc_duoc: Vec<(String, String)> = crate::ai::giong_doc_duoc(&st.layout)
        .into_iter()
        .filter(|(_, vai)| crate::ai::nhom_giong(vai) == "ke-chuyen")
        .collect();
    if doc_duoc.is_empty() {
        return json!({});
    }
    let ids: Vec<String> = doc_duoc.iter().map(|(g, _)| g.clone()).collect();
    let ai = st.ai_config(id);
    let giao: Vec<String> = ai.vai_giong.nhan_vat.iter().filter(|g| ids.contains(g)).cloned().collect();
    let giong_vai = if giao.is_empty() { ids.clone() } else { giao };
    let giong_dan_duoc: Vec<String> = match ai.giong().filter(|g| ids.contains(g)) {
        Some(g) => vec![g],
        None => ids.clone(),
    };
    let dan_cho: Vec<(String, String)> = doc_duoc.into_iter().filter(|(g, _)| giong_vai.contains(g) || giong_dan_duoc.contains(g)).collect();
    match goi_ai(DAN_PHAN_VAI, &loi_cho_phan_vai(t, &dan_cho, &giong_dan_duoc)) {
        Ok(tra) => match loc_phan_vai(&tra.chu, &giong_vai, &giong_dan_duoc, t.doan.len()) {
            Some(pv) => {
                tracing::info!(thiet_ke = %id, ten = %t.ten, giong_dan = %pv.giong_dan, so_vai = pv.vai.len(), "đã phân vai");
                phan_vai_json(&pv)
            }
            None => {
                tracing::warn!(thiet_ke = %id, ten = %t.ten, "người phân vai trả không đọc được — kể không phân vai");
                json!({})
            }
        },
        Err(e) => {
            tracing::warn!(thiet_ke = %id, ten = %t.ten, "người phân vai lỗi ({e}) — kể không phân vai");
            json!({})
        }
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
/// Hàng chờ giữ nhiều nhất chừng này truyện khách xin.
pub const YEU_CAU_TOI_DA: usize = 10;
/// Một khách giữ nhiều nhất chừng này chỗ trong hàng — một người không chiếm
/// cả buổi.
pub const YEU_CAU_MOI_KHACH: usize = 2;

/// Hàng chờ truyện khách xin, đầu hàng trước. Hàm thuần.
pub fn hang_cho(cfg: &Value) -> Vec<Value> {
    cfg.get("yeuCau").and_then(Value::as_array).cloned().unwrap_or_default()
}

/// Hai tên truyện có phải một truyện không: bằng nhau sau khi chuẩn hoá, hay
/// tên này nằm trọn trong tên kia ("Tấm Cám" ~ "Truyện Tấm Cám"). Hàm thuần.
pub fn cung_truyen(a: &str, b: &str) -> bool {
    let (a, b) = (chuan(a), chuan(b));
    if a.is_empty() || b.is_empty() {
        return false;
    }
    a == b || (a.chars().count() >= 4 && b.contains(&a)) || (b.chars().count() >= 4 && a.contains(&b))
}

/// Máy chủ nhận một lời xin truyện thế nào.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NhanYeuCau {
    /// Đã xếp vào hàng, ở vị trí này (đếm từ 1).
    Them(usize),
    /// Truyện này đã nằm trong hàng, ở vị trí này.
    DaCo(usize),
    /// Đang kể đúng truyện này.
    DangKe,
    /// Truyện này đã là truyện kế tiếp.
    KeTiep,
    /// Hàng đầy.
    Day,
    /// Khách này đã giữ đủ chỗ.
    KhachDu,
}

/// Hàng chờ sau khi xin thêm truyện `ten` cho `khach`. `Some(hàng mới)` khi
/// có thêm. Hàm thuần.
pub fn xep_yeu_cau(cfg: &Value, ten: &str, khach: &str, now: i64) -> (Option<Vec<Value>>, NhanYeuCau) {
    let ten_cua = |v: &Value, k: &str| v.get(k).and_then(Value::as_str).unwrap_or_default().to_string();
    if cung_truyen(&ten_cua(cfg, "title"), ten) {
        return (None, NhanYeuCau::DangKe);
    }
    if cfg.get("truyenSau").is_some_and(|s| cung_truyen(&ten_cua(s, "title"), ten)) {
        return (None, NhanYeuCau::KeTiep);
    }
    let mut hang = hang_cho(cfg);
    // Đã có trong hàng: xin lại là yêu cầu mới nhất — đưa lên đầu hàng, giữ
    // tên người xin đầu tiên.
    if let Some(i) = hang.iter().position(|x| cung_truyen(&ten_cua(x, "ten"), ten)) {
        if i == 0 {
            return (None, NhanYeuCau::DaCo(1));
        }
        let x = hang.remove(i);
        hang.insert(0, x);
        return (Some(hang), NhanYeuCau::DaCo(1));
    }
    if hang.len() >= YEU_CAU_TOI_DA {
        return (None, NhanYeuCau::Day);
    }
    if hang.iter().filter(|x| chuan(&ten_cua(x, "khach")) == chuan(khach)).count() >= YEU_CAU_MOI_KHACH {
        return (None, NhanYeuCau::KhachDu);
    }
    // Yêu cầu MỚI NHẤT kể tiếp ngay sau truyện đang kể: đứng đầu hàng.
    hang.insert(0, json!({ "ten": ten.trim(), "khach": khach.trim(), "luc": now }));
    (Some(hang), NhanYeuCau::Them(1))
}

/// Xếp truyện khách xin vào hàng chờ của phòng.
///
/// Yêu cầu mới nhất kể NGAY SAU truyện đang kể. Nên truyện kế tiếp đã chuẩn
/// bị mà chưa vào giờ nghỉ đổi truyện (chưa báo "Truyện tiếp theo: …") thì
/// nhường chỗ: truyện máy tự chọn thì bỏ, truyện của khách khác xin thì lùi về
/// hàng chờ, đứng ngay sau yêu cầu mới. Đã báo "Truyện tiếp theo" rồi thì giữ
/// nguyên — đổi lúc ấy là nói một đằng kể một nẻo.
pub fn them_yeu_cau(st: &AppState, id: &str, ten: &str, khach: &str, now: i64) -> NhanYeuCau {
    let Some(cfg) = cfg_story(st, id) else { return NhanYeuCau::Day };
    let (moi, kq) = xep_yeu_cau(&cfg, ten, khach, now);
    let Some(mut hang) = moi else { return kq };
    let sau = cfg.get("truyenSau").cloned().unwrap_or_default();
    let lay = |k: &str| sau.get(k).and_then(Value::as_str).unwrap_or_default().trim().to_string();
    let nhuong = san_sang(&cfg).is_some() && cfg.get("giaiLao").is_none_or(Value::is_null);
    if nhuong && !lay("theoYeuCau").is_empty() && hang.len() < YEU_CAU_TOI_DA {
        hang.insert(1, json!({ "ten": lay("title"), "khach": lay("theoYeuCau"), "luc": now }));
    }
    let mut sua = json!({ "yeuCau": hang });
    if nhuong {
        sua["truyenSau"] = json!({});
        tracing::info!(thiet_ke = %id, sau = %lay("title"), "truyện kế tiếp nhường chỗ cho yêu cầu mới nhất");
    }
    match st.set_config(id, MODULE, sua) {
        Ok(()) => kq,
        Err(e) => {
            tracing::warn!(thiet_ke = %id, ?e, "không ghi được hàng chờ truyện");
            NhanYeuCau::Day
        }
    }
}

/// Báo cho MC truyện khách xin không kể được trong ngần này.
const LOI_YEU_CAU_MS: i64 = 180_000;

/// Phần "truyện khách xin" đưa cho MC trong tin phòng. Hàm thuần.
pub fn boi_canh_yeu_cau(cfg: &Value, now: i64) -> Value {
    let lay = |v: &Value, k: &str| v.get(k).and_then(Value::as_str).unwrap_or_default().to_string();
    let hang: Vec<Value> = hang_cho(cfg)
        .iter()
        .map(|x| json!({ "ten": lay(x, "ten"), "khach": lay(x, "khach") }))
        .collect();
    let sau = cfg.get("truyenSau").cloned().unwrap_or_default();
    json!({
        "hangCho": hang,
        "truyenSau": lay(&sau, "title"),
        "truyenSauTheo": lay(&sau, "theoYeuCau"),
        "dangKeTheo": lay(cfg, "theoYeuCau"),
        "conCho": YEU_CAU_TOI_DA.saturating_sub(hang_cho(cfg).len()),
        // Truyện khách xin mà không kể được (ba phút gần đây): MC xin lỗi khéo.
        "khongKeDuoc": cfg
            .get("yeuCauLoi")
            .filter(|l| now - l.get("luc").and_then(Value::as_i64).unwrap_or(0) < LOI_YEU_CAU_MS)
            .map(|l| json!({ "ten": lay(l, "ten"), "khach": lay(l, "khach") })),
    })
}

/// Truyện trong kho đã kể (kèm ảnh cũ) khớp tên khách xin. Hàm thuần.
fn tim_trong_kho(kho: &[Value], ten: &str) -> Option<Value> {
    kho.iter()
        .rev()
        .find(|t| cung_truyen(t.get("title").and_then(Value::as_str).unwrap_or_default(), ten))
        .cloned()
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
    phan_vai: Value,
    theo_yeu_cau: &str,
) -> Result<(), String> {
    tracing::info!(thiet_ke = %id, %ten, %loai_ghi, %nguon, so_doan = doan.len(), co_ho_so = !nhan_vat.is_empty(), theo_yeu_cau, "đã chuẩn bị truyện kế tiếp");
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
            "phanVai": phan_vai,
            "theoYeuCau": theo_yeu_cau,
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
            // Phân vai đi cùng truyện: truyện kho không có thì xoá phân vai cũ.
            "phanVai": sau.get("phanVai").cloned().unwrap_or(json!({})),
            // Truyện khách xin: MC mở truyện bằng tên người đã xin.
            "theoYeuCau": sau.get("theoYeuCau").and_then(Value::as_str).unwrap_or_default(),
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
            // Khung trống (buổi live mới vừa dọn truyện cũ — `ke_truyen::don_truyen_cu`)
            // thì CÀNG phải chuẩn bị: MC đang chờ đúng truyện này để mở màn.
            // Trước đây bỏ qua khung trống, nên mở app giữa lúc truyện sau chưa
            // kịp viết là phòng đứng ở màn chờ mãi.
            if !tu_chuyen(&cfg) || san_sang(&cfg).is_some() {
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
    fn doc_dan_y_goc_va_dua_cho_nguoi_soat() {
        assert_eq!(doc_dan_y_goc(r#"{"biet": false}"#), Some(None), "không biết thì nói không biết");
        assert_eq!(doc_dan_y_goc("rác"), None);
        assert_eq!(doc_dan_y_goc(r#"{"biet": true, "tinhTiet": []}"#), None);
        let g = doc_dan_y_goc(r#"{"biet": true, "tinhTiet": ["Cám lừa lấy giỏ tép", " ", "Bụt cho cá bống"], "cauNoi": ["Bống bống bang bang"], "ket": "Tấm hạnh phúc"}"#)
            .unwrap()
            .unwrap();
        assert_eq!(g, "1. Cám lừa lấy giỏ tép\n2. Bụt cho cá bống\nCâu nói nổi tiếng: Bống bống bang bang\nKết: Tấm hạnh phúc");
        let t = TruyenMoi { ten: "Tấm Cám".into(), doan: vec!["Một.".into()], ..TruyenMoi::default() };
        let l = loi_cho_soat(&t, Some(&g));
        assert!(l.contains("<dan_y_goc>\n1. Cám lừa lấy giỏ tép"));
        assert!(!loi_cho_soat(&t, None).contains("dan_y_goc"));
    }

    #[test]
    fn hang_cho_truyen_khach_xin() {
        let cfg = json!({ "title": "Sự tích cây vú sữa", "truyenSau": { "title": "Cóc kiện trời" }, "yeuCau": [] });
        assert_eq!(xep_yeu_cau(&cfg, "sự tích cây vú sữa", "Lan", 1).1, NhanYeuCau::DangKe);
        assert_eq!(xep_yeu_cau(&cfg, "Truyện Cóc kiện trời", "Lan", 1).1, NhanYeuCau::KeTiep);
        let (h, kq) = xep_yeu_cau(&cfg, "Tấm Cám", "Lan", 5);
        assert_eq!(kq, NhanYeuCau::Them(1));
        let cfg = json!({ "title": "A", "yeuCau": h.unwrap() });
        assert_eq!(xep_yeu_cau(&cfg, "tấm  cám", "Hùng", 6), (None, NhanYeuCau::DaCo(1)), "trùng truyện thì báo chỗ cũ");
        let (h, kq) = xep_yeu_cau(&cfg, "Thạch Sanh", "Lan", 7);
        assert_eq!(kq, NhanYeuCau::Them(1), "yêu cầu mới nhất đứng đầu hàng");
        let h = h.unwrap();
        assert_eq!(h[0]["ten"], json!("Thạch Sanh"));
        assert_eq!(h[1]["ten"], json!("Tấm Cám"));
        let cfg = json!({ "title": "A", "yeuCau": h });
        assert_eq!(xep_yeu_cau(&cfg, "Cây khế", "lan", 8).1, NhanYeuCau::KhachDu, "một khách giữ tối đa hai chỗ");
        let (h, kq) = xep_yeu_cau(&cfg, "Tấm Cám", "Mai", 9);
        assert_eq!(kq, NhanYeuCau::DaCo(1));
        assert_eq!(h.unwrap()[0]["khach"], json!("Lan"), "xin lại thì lên đầu hàng, giữ người xin đầu");
        let day = json!({ "yeuCau": (0..YEU_CAU_TOI_DA).map(|i| json!({ "ten": format!("Truyện số {i}"), "khach": format!("k{i}") })).collect::<Vec<_>>() });
        assert_eq!(xep_yeu_cau(&day, "Cây khế", "Mai", 9).1, NhanYeuCau::Day);
    }

    #[test]
    fn cung_truyen_bo_qua_chu_hoa_va_chu_dem() {
        assert!(cung_truyen("Tấm Cám", "truyện tấm cám"));
        assert!(!cung_truyen("Tấm Cám", "Thạch Sanh"));
        assert!(!cung_truyen("", "Tấm Cám"));
        assert!(!cung_truyen("A", "Ba"), "tên quá ngắn không tính chứa");
    }

    #[test]
    fn boi_canh_yeu_cau_cho_mc() {
        let cfg = json!({
            "theoYeuCau": "Lan",
            "truyenSau": { "title": "Tấm Cám", "theoYeuCau": "Hùng" },
            "yeuCau": [{ "ten": "Cây khế", "khach": "Mai", "luc": 1 }],
            "yeuCauLoi": { "ten": "Truyện lạ", "khach": "Ken", "luc": 1_000 },
        });
        let b = boi_canh_yeu_cau(&cfg, 2_000);
        assert_eq!(b["dangKeTheo"], json!("Lan"));
        assert_eq!(b["truyenSauTheo"], json!("Hùng"));
        assert_eq!(b["hangCho"][0]["ten"], json!("Cây khế"));
        assert_eq!(b["conCho"], json!(YEU_CAU_TOI_DA - 1));
        assert_eq!(b["khongKeDuoc"]["khach"], json!("Ken"));
        assert!(boi_canh_yeu_cau(&cfg, 1_000 + LOI_YEU_CAU_MS)["khongKeDuoc"].is_null(), "quá ba phút thì thôi nhắc");
    }

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
    fn de_trong_the_loai_thi_van_xoay_vong_nhu_cu() {
        let trong: Vec<String> = Vec::new();
        for n in [0usize, 1, 5, 27, 300] {
            assert_eq!(the_loai_cho(&trong, n), the_loai_thu(n));
        }
        assert!(the_loai_dat(&json!({})).is_empty());
        assert!(the_loai_dat(&json!({ "theoTheLoai": true, "theLoai": "   " })).is_empty());
        assert!(the_loai_dat(&json!({ "theoTheLoai": true, "theLoai": " , ,, " })).is_empty());
        // Công tắc TẮT thì có chọn gì cũng xoay vòng như cũ.
        assert!(
            the_loai_dat(&json!({ "theLoai": "truyện ma, truyện cười" })).is_empty(),
            "chưa bật công tắc thì không theo thể loại"
        );
    }

    #[test]
    fn dat_the_loai_thi_ke_dung_the_loai_do() {
        let m = the_loai_dat(&json!({ "theoTheLoai": true, "theLoai": "truyện ma" }));
        assert_eq!(m, ["truyện ma"]);
        for n in [0usize, 1, 2, 99] {
            assert_eq!(the_loai_cho(&m, n), "truyện ma", "đặt một thể loại thì lượt nào cũng là nó");
        }
    }

    #[test]
    fn dat_nhieu_the_loai_thi_thay_phien_nhau() {
        // Ngăn bằng dấu phẩy, bỏ khoảng trắng thừa và ô rỗng.
        let m = the_loai_dat(&json!({ "theoTheLoai": true, "theLoai": " truyện cười ,, cổ tích Việt Nam , " }));
        assert_eq!(m, ["truyện cười", "cổ tích Việt Nam"]);
        // Thay phiên, không phải kể mãi cái đầu.
        let vong: Vec<String> = (0..4).map(|n| the_loai_cho(&m, n)).collect();
        assert_eq!(vong, ["truyện cười", "cổ tích Việt Nam", "truyện cười", "cổ tích Việt Nam"]);
    }

    #[test]
    fn quang_chuyen_truyen_luon_nam_trong_5_15_giay() {
        // Chủ phòng chốt: chuyển truyện 5–15 giây, phòng vắng hay nghìn người
        // cũng vậy. Một phút màn chờ là một phút khách bấm đi chỗ khác.
        assert_eq!(GIAI_LAO_TOI_THIEU_MS, 5_000);
        assert_eq!(GIAI_LAO_CHUYEN_MS, 15_000);
        for seed in [0_i64, 1, 7, 977, 1_794_000_000_000, i64::MAX, i64::MIN] {
            let h = han_giai_lao(seed);
            assert!((5_000..=15_000).contains(&h), "seed {seed} ra {h}");
        }
        // Báo "sắp hết" phải nằm TRONG cả giờ nghỉ ngắn nhất, không thì lượt
        // nào cũng là lượt "sắp hết".
        assert!(SAP_HET_MS < GIAI_LAO_TOI_THIEU_MS);
    }

    #[test]
    fn gio_cho_cung_moc_thi_moi_man_hinh_ra_cung_mot_so() {
        // Hàm thuần: hai cửa sổ cùng xem một phòng phải đếm giống hệt nhau.
        assert_eq!(han_giai_lao(1_794_000_000_000), han_giai_lao(1_794_000_000_000));
        // Mốc khác nhau thì rải ra, không phải lần nào cũng đúng một con số.
        let ds: Vec<i64> = (0..40).map(|i| han_giai_lao(1_794_000_000_000 + i * 977)).collect();
        let mut rieng = ds.clone();
        rieng.sort_unstable();
        rieng.dedup();
        assert!(rieng.len() > 10, "nghỉ đúng một con số tròn thì người xem đoán được: {rieng:?}");
    }

    #[test]
    fn het_gio_nghi_theo_han_da_chot_chu_khong_phai_moc_cu() {
        // Chốt 8 giây thì 8 giây là vào truyện, không phải chờ đủ mốc nào khác.
        assert!(het_giai_lao(0, 8_000, false, 8_000));
        assert!(!het_giai_lao(0, 7_999, false, 8_000));
        // Còn người chờ được chào thì vẫn nghỉ thêm, tối đa trần.
        assert!(!het_giai_lao(0, 8_000, true, 8_000));
        assert!(het_giai_lao(0, GIAI_LAO_CHUYEN_MS, true, 8_000));
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
        let ds: Vec<&str> = (0..14).map(the_loai_thu).collect();
        assert_eq!(
            ds,
            vec![
                // Sau cổ tích xen một truyện ưu tiên; tới lượt "nhân quả" mà
                // khối kế cũng là nhân quả nên lấy "cha mẹ".
                "cổ tích Việt Nam", "cổ tích Việt Nam", "cha mẹ",
                // Thể loại ưu tiên: không xen thêm.
                "nhân quả", "nhân quả",
                "ngụ ngôn", "ngụ ngôn", "thiện – ác",
                "cha mẹ", "cha mẹ",
                "truyện cười", "truyện cười", "nhân quả",
                "truyện hài trẻ con có tương tác",
            ]
        );
        let dai: Vec<&str> = (0..300).map(the_loai_thu).collect();
        // Không bao giờ có BA truyện cùng thể loại liền nhau.
        for w in dai.windows(3) {
            assert!(!(w[0] == w[1] && w[1] == w[2]), "ba truyện {} liền nhau", w[0]);
        }
        // Một vòng đủ 12 thể loại: 24 truyện + 9 truyện xen (sau 9 thể loại
        // không ưu tiên) = 33; mỗi thể loại không ưu tiên đúng 2 truyện.
        let vong = &dai[..33];
        for l in THE_LOAI {
            let so = vong.iter().filter(|x| **x == l).count();
            if UU_TIEN.contains(&l) {
                assert!(so > 2, "{l} là ưu tiên phải được xen thêm");
            } else {
                assert_eq!(so, 2, "{l} kể đúng 2 truyện mỗi vòng");
            }
        }
        assert_eq!(the_loai_thu(33), "cổ tích Việt Nam", "hết vòng quay lại cổ tích");
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
        // Phòng sôi động: nghỉ thêm, tới trần thì vẫn vào truyện.
        assert!(!het_giai_lao(0, GIAI_LAO_CHUYEN_MS - 1, true, 0));
        assert!(het_giai_lao(0, GIAI_LAO_CHUYEN_MS, true, 0));
        // Báo "sắp hết" trước một nhịp.
        assert!(sap_het_giai_lao(0, GIAI_LAO_TOI_THIEU_MS - SAP_HET_MS, false, 0));
        assert!(!sap_het_giai_lao(0, GIAI_LAO_TOI_THIEU_MS - SAP_HET_MS, true, 0));
        assert!(sap_het_giai_lao(0, GIAI_LAO_CHUYEN_MS - SAP_HET_MS, true, 0));
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
    fn doc_ket_qua_nguoi_soat() {
        assert_eq!(doc_soat(r#"{"dat": true, "thieu": [], "sai": [], "dao": []}"#), Some(vec![]));
        let loi = doc_soat(r#"{"dat": false, "thieu": ["Không có đoạn bị lấp hang"], "sai": ["Đoạn 9: Lý Thông chứ không phải mẹ hắn"], "dao": []}"#).unwrap();
        assert_eq!(loi.len(), 2);
        assert!(loi[0].starts_with("Thiếu tình tiết: Không có đoạn bị lấp hang"));
        assert!(loi[1].starts_with("Sai chi tiết: Đoạn 9"));
        // Ghi "đạt" mà vẫn kê lỗi: tin danh sách lỗi.
        assert_eq!(doc_soat(r#"{"dat": true, "sai": ["sai tên"]}"#).unwrap().len(), 1);
        // Ghi "không đạt" mà không nói chỗ nào: vẫn là lỗi, để soát lại.
        assert_eq!(doc_soat(r#"{"dat": false}"#).unwrap().len(), 1);
        // Không đọc được thì None (máy chủ giữ bản đã qua kiểm dàn ý).
        assert_eq!(doc_soat("truyện ổn"), None);
        assert_eq!(doc_soat(r#"{"thieu": []}"#), None, "thiếu khoá dat");
    }

    #[test]
    fn khoi_sua_lai_ke_du_loi_va_dan_y() {
        let dan_y = vec!["Gặp Lý Thông".to_string(), "Giết chằn tinh".to_string()];
        let c = khoi_sua_lai(&["Sai chi tiết: đoạn 3 sai tên".to_string(), "Đảo thứ tự: đoạn 5".to_string()], &dan_y);
        assert!(c.contains("- Sai chi tiết: đoạn 3 sai tên") && c.contains("- Đảo thứ tự: đoạn 5"), "{c}");
        assert!(c.contains("1. Gặp Lý Thông") && c.contains("2. Giết chằn tinh"), "{c}");
    }

    #[test]
    fn loi_cho_nguoi_soat_co_ten_dan_y_va_doan() {
        let t = TruyenMoi {
            ten: "Tấm Cám".into(),
            tu_sang_tac: false,
            doan: vec!["Ngày xưa có Tấm.".into(), "Tấm hoá chim vàng anh.".into()],
            phong_cach: String::new(),
            nhan_vat: String::new(),
            tinh_tiet: vec!["Mồ côi".into(), "Hoá vàng anh".into()],
            gan: vec![vec![1], vec![2]],
        };
        let l = loi_cho_soat(&t, None);
        assert!(l.contains("<ten>Tấm Cám</ten>") && l.contains("<tu_sang_tac>false</tu_sang_tac>"));
        assert!(l.contains("2. Hoá vàng anh") && l.contains("2. Tấm hoá chim vàng anh. (tình tiết [2])"), "{l}");
    }

    #[test]
    fn loc_phan_vai_bo_id_la_va_khong_trung_giong() {
        let vai = vec!["be-gai".to_string(), "nam-minh".to_string(), "google-vi".to_string()];
        let dan = vec!["mc".to_string()];
        // Id lạ bị bỏ; giọng dẫn lạ thì lấy giọng dẫn được phép.
        let pv = loc_phan_vai(
            r#"{"giongDan": "khong-co", "vai": [{"ten": "Tấm", "giong": "be-gai"}, {"ten": "Bụt", "giong": "giong-la"}], "camXuc": ["vui"]}"#,
            &vai, &dan, 3,
        )
        .unwrap();
        assert_eq!(pv.giong_dan, "mc");
        assert_eq!(pv.vai, vec![("Tấm".to_string(), "be-gai".to_string())]);
        // camXuc bù cho đủ số đoạn, chữ lạ thành "bình thường".
        assert_eq!(pv.cam_xuc, vec!["vui", "bình thường", "bình thường"]);
        // Hai nhân vật trùng giọng mà dàn đủ giọng: người sau đổi sang giọng chưa dùng.
        let pv = loc_phan_vai(
            r#"{"giongDan": "mc", "vai": [{"ten": "Thạch Sanh", "giong": "nam-minh"}, {"ten": "Lý Thông", "giong": "nam-minh"}]}"#,
            &vai, &dan, 1,
        )
        .unwrap();
        assert_ne!(pv.vai[0].1, pv.vai[1].1, "{:?}", pv.vai);
        // Không đủ giọng cho mọi nhân vật thì để trùng, không đổi bừa.
        let it = vec!["nam-minh".to_string()];
        let pv = loc_phan_vai(
            r#"{"vai": [{"ten": "A", "giong": "nam-minh"}, {"ten": "B", "giong": "nam-minh"}]}"#,
            &it, &dan, 0,
        )
        .unwrap();
        assert_eq!(pv.vai.len(), 2);
        assert!(pv.cam_xuc.is_empty());
        // Không phải JSON thì None.
        assert_eq!(loc_phan_vai("không biết", &vai, &dan, 2), None);
        // Lưu đúng khuôn ô `phanVai` của module.
        let j = phan_vai_json(&PhanVai { giong_dan: "mc".into(), vai: vec![("Tấm".into(), "be-gai".into())], cam_xuc: vec!["vui".into()] });
        assert_eq!(j, json!({ "giongDan": "mc", "vai": [{ "ten": "Tấm", "giong": "be-gai" }], "camXuc": ["vui"] }));
    }

    #[test]
    fn kiem_tinh_tiet_du_thieu_nguoc() {
        // Đủ mọi tình tiết, đúng thứ tự — kể cả hai đoạn cùng kể một tình tiết
        // và một đoạn chỉ nối mạch.
        let du = vec![vec![1], vec![2], vec![2], vec![], vec![3, 4], vec![5]];
        assert_eq!(kiem_tinh_tiet(5, &du), Ok(()));
        // Thiếu đúng tình tiết số 3.
        let thieu = vec![vec![1], vec![2], vec![4], vec![5]];
        assert_eq!(kiem_tinh_tiet(5, &thieu), Err(LoiTinhTiet::Thieu(vec![3])));
        // Kể ngược: đoạn 4 quay lại tình tiết 2 sau khi đã kể tới 3.
        let nguoc = vec![vec![1], vec![2], vec![3], vec![2], vec![4]];
        assert_eq!(kiem_tinh_tiet(4, &nguoc), Err(LoiTinhTiet::NguocThuTu { doan: 4 }));
        // Không có dàn ý thì không kiểm được — báo riêng để nhờ trả đúng khuôn.
        assert_eq!(kiem_tinh_tiet(0, &[vec![1]]), Err(LoiTinhTiet::KhongCoDanY));
        assert_eq!(kiem_tinh_tiet(3, &[vec![], vec![]]), Err(LoiTinhTiet::KhongCoDanY));
        // Số ngoài dàn ý bị bỏ qua, không làm hỏng thứ tự.
        assert_eq!(kiem_tinh_tiet(2, &[vec![1, 9], vec![2]]), Ok(()));
    }

    #[test]
    fn loi_sua_noi_dung_tinh_tiet_thieu() {
        let dan_y = vec!["Gặp Lý Thông".to_string(), "Giết chằn tinh".to_string(), "Cứu công chúa".to_string()];
        let c = loi_sua_tinh_tiet(&LoiTinhTiet::Thieu(vec![2]), &dan_y);
        assert!(c.contains("2 (Giết chằn tinh)"), "{c}");
        assert!(c.contains("1. Gặp Lý Thông") && c.contains("3. Cứu công chúa"), "kèm cả dàn ý cũ: {c}");
    }

    #[test]
    fn doc_truyen_khuon_moi_co_dan_y_va_nhan_30_doan() {
        let doan: Vec<Value> = (1..=30)
            .map(|i| json!({ "chu": format!("Đoạn {i} kể tiếp câu chuyện, có đủ hai câu cho rõ ý. Câu hai ở đây."), "tinhTiet": [i] }))
            .collect();
        let tinh_tiet: Vec<String> = (1..=30).map(|i| format!("Tình tiết {i}")).collect();
        let than = json!({ "ten": "Thạch Sanh", "tuSangTac": false, "tinhTiet": tinh_tiet, "doan": doan }).to_string();
        let t = doc_truyen(&than, &[]).expect("truyện 30 đoạn phải nhận");
        assert_eq!(t.doan.len(), 30);
        assert_eq!(t.tinh_tiet.len(), 30);
        assert_eq!(t.gan[29], vec![30]);
        assert_eq!(kiem_tinh_tiet(t.tinh_tiet.len(), &t.gan), Ok(()));
        // Đoạn dài hơn trần thì cắt đúng ở `KY_TU_DOAN`.
        let dai = json!({ "ten": "A", "doan": vec!["x".repeat(400); 8] }).to_string();
        assert!(doc_truyen(&dai, &[]).unwrap().doan.iter().all(|d| d.chars().count() == KY_TU_DOAN));
        // Khuôn cũ (đoạn là chuỗi) vẫn đọc được, chỉ là không có dàn ý.
        let cu = json!({ "ten": "B", "doan": ["a", "b", "c", "d"] }).to_string();
        let t = doc_truyen(&cu, &[]).unwrap();
        assert!(t.tinh_tiet.is_empty());
        assert_eq!(kiem_tinh_tiet(t.tinh_tiet.len(), &t.gan), Err(LoiTinhTiet::KhongCoDanY));
    }

    #[test]
    fn loi_dan_dung_chung_hang_so_do_dai() {
        // Lời dặn không ghi cứng số đoạn / số ký tự — thay bằng hằng số lúc gửi.
        for o in ["{DOAN_MIN}", "{DOAN_MAX}", "{KY_TU}", "{VI_DU}"] {
            assert!(DAN_VIET.contains(o), "thiếu chỗ thay {o}");
        }
        assert!(!DAN_VIET.contains("8–20") && !DAN_VIET.contains("110 ký tự"), "còn số cũ");
        assert!(DAN_VIET.contains("\"tinhTiet\""), "phải dặn trả dàn ý");
        assert_eq!(DOAN_TOI_DA, 30, "khớp MOC_LUU_TOI_DA của contracts");
        assert!(DOAN_TOI_DA * (KY_TU_DOAN + 1) <= 20_000, "vượt trần passages của module Kể truyện");
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
        assert_eq!(chon_danh_muc("ngụ ngôn", &[]), Some(("Ếch ngồi đáy giếng", "ngụ ngôn")));
        // Trùng cả khi tên đã kể chứa tên danh mục; không phân biệt hoa thường.
        assert_eq!(
            chon_danh_muc("ngụ ngôn", &cam(&["ếch ngồi đáy giếng", "Anh thợ đẽo cày giữa đường"])),
            Some(("Thầy bói xem voi", "ngụ ngôn"))
        );
        // Thể loại hết truyện Việt: sang truyện Việt ở thể loại kế, chưa tới
        // truyện nước ngoài của thể loại này.
        let het: Vec<String> = DANH_MUC[2].viet.iter().map(|s| s.to_string()).collect();
        assert_eq!(chon_danh_muc("ngụ ngôn", &het), Some(("Sự tích cây vú sữa", "cha mẹ")));
        // Kể hết MỌI truyện Việt: lúc đó mới tới truyện nước ngoài, đúng thể loại trước.
        let viet: Vec<String> = DANH_MUC.iter().flat_map(|d| d.viet.iter().map(|s| s.to_string())).collect();
        assert_eq!(chon_danh_muc("ngụ ngôn", &viet), Some(("Thỏ và Rùa", "ngụ ngôn")));
        // Kể hết mọi danh mục: không còn gì — để AI sáng tác.
        let tat_ca: Vec<String> =
            DANH_MUC.iter().flat_map(|d| d.viet.iter().chain(d.ngoai.iter()).map(|s| s.to_string())).collect();
        assert_eq!(chon_danh_muc("ngụ ngôn", &tat_ca), None);
        // Thể loại nào trong vòng xoay cũng có danh mục, và có truyện Việt.
        for l in THE_LOAI {
            assert!(DANH_MUC.iter().any(|d| d.loai == l && !d.viet.is_empty()), "{l} chưa có truyện Việt");
        }
    }

    #[test]
    fn the_loai_nghiem_het_truyen_khong_tran_sang_truyen_cuoi_tre_con() {
        let cam = |loai: &str| -> Vec<String> {
            DANH_MUC.iter().find(|d| d.loai == loai).unwrap().viet.iter().map(|s| s.to_string()).collect()
        };
        // Lỗi chủ phòng kêu: "cha mẹ" hết truyện Việt từng tràn sang truyện
        // cười rồi truyện trẻ con (hai thể loại đứng kế nó trong danh sách).
        let (_, loai) = chon_danh_muc("cha mẹ", &cam("cha mẹ")).unwrap();
        assert_eq!(loai, "thiện – ác", "cha mẹ hết thì sang thể loại nghiêm kế tiếp");
        // "nhân quả" từng tràn sang ngụ ngôn con vật.
        let (_, loai) = chon_danh_muc("nhân quả", &cam("nhân quả")).unwrap();
        assert!(!THE_LOAI_VUI.contains(&loai), "nhân quả tràn sang {loai}");
        // Hết sạch truyện Việt NGHIÊM: lấy truyện nghiêm nước ngoài trước truyện vui.
        let nghiem_viet: Vec<String> = DANH_MUC
            .iter()
            .filter(|d| !THE_LOAI_VUI.contains(&d.loai))
            .flat_map(|d| d.viet.iter().map(|s| s.to_string()))
            .collect();
        let (ten, loai) = chon_danh_muc("cha mẹ", &nghiem_viet).unwrap();
        assert_eq!(loai, "cha mẹ", "ra {ten}");
        assert!(!THE_LOAI_VUI.contains(&loai));
    }

    #[test]
    fn nhom_uu_tien_du_truyen_viet_cho_mot_buoi() {
        // Nhóm ưu tiên gánh gần nửa số truyện; mỗi thể loại phải đủ truyện Việt
        // để không cạn sau vài tiếng.
        for l in UU_TIEN {
            let n = DANH_MUC.iter().find(|d| d.loai == l).unwrap().viet.len();
            assert!(n >= 5, "{l} chỉ có {n} truyện Việt");
        }
    }
}
