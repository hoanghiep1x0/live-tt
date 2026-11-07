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
) {
    // `sau`: người gọi chỉ đưa khi lượt này là lượt báo chuyển tiếp.
    if let Some(t) = sau {
        b["chuyenTiep"] = json!({ "truyenSau": t, "cau": crate::truyen_sau::cau_chuyen_tiep() });
    }
    if !td.vua_xong && td.tiep == 0 {
        b["moDau"] = json!({ "truyenTruoc": truoc, "chuyenMcKe": mc_sang_tac });
    }
    if let Some(t) = cho {
        b["choTruyenSau"] = json!({ "truyenSau": t });
    }
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
        them_chuyen(&mut b, &td, None, Some("Trước"), false, None);
        assert_eq!(b["moDau"]["truyenTruoc"], json!("Trước"), "đoạn đầu: mở bằng MC kể thêm truyện");
        assert!(b.get("chuyenTiep").is_none());

        for i in 0..3 {
            td.da_ke(i, 3, false);
        }
        let mut b = boi_canh(&td, &doan());
        them_chuyen(&mut b, &td, Some("Sau"), None, false, None);
        assert_eq!(b["chuyenTiep"]["truyenSau"], json!("Sau"));
        assert!(b["chuyenTiep"]["cau"].as_str().unwrap().starts_with("Chờ xíu xíu"));

        // Truyện sau chưa sẵn: khép truyện như thường.
        let mut b = boi_canh(&td, &doan());
        them_chuyen(&mut b, &td, None, None, false, Some("Sau"));
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
