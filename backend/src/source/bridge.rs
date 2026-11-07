//! Nguồn cầu nối: client WebSocket nối tới cầu nối TikTok.
//!
//! Đây là đường tới **dữ liệu TikTok thật**, không qua trình duyệt nào. Cầu nối
//! (`backend/cau-noi`, backend tự bật — xem `tien_trinh`) đọc phòng live rồi đẩy
//! JSON qua WebSocket; ở đây chỉ việc nhận và chuẩn hoá. Trỏ `url` sang một cầu
//! nối khác nói cùng giao thức (vd bản cũ `D:\Live\tools\bridge`) cũng chạy.
//!
//! Giao thức giữ nguyên của bản cũ để dùng lại được cầu nối đã có:
//!
//! ```text
//! backend → cầu nối : { "type": "subscribe", "channel": "kechuyen.dem" }
//! cầu nối → backend : { "kind": "gift", "user": …, "name": …, "gift": …,
//!                       "count": …, "xuEach": …, "ts": 1730000000000 }
//!                     hoặc một MẢNG các tin như trên
//!                     hoặc tin điều khiển { "type": "status" | "viewers" | "agent", … }
//! ```

use std::sync::Arc;
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use tokio_tungstenite::tungstenite::Message;

use crate::events::LiveEvent;
use crate::source::SourceCfg;
use crate::state::AppState;

/// Bỏ tin cũ hơn mốc mở kết nối chừng này. Cầu nối có thể đẩy lại một ít lịch
/// sử lúc vừa nối; đọc lại chúng là cảm ơn lại quà cũ.
const KHOAN_DUNG_MS: i64 = 3_000;

const CHO_DAU_MS: u64 = 2_000;
const CHO_TRAN_MS: u64 = 15_000;

#[derive(Debug, PartialEq)]
pub enum TinCauNoi {
    SuKien(Box<LiveEvent>),
    /// Số người đang xem do TikTok đếm — tin con số này hơn số người mình thấy.
    /// Kèm tổng lượt xem cả buổi (`views`) nếu cầu nối gửi.
    Viewers(u64, Option<u64>),
    TrangThai {
        state: String,
        message: Option<String>,
    },
    /// Không hiểu, hoặc là tin cũ. Bỏ, không làm sập nguồn.
    Bo,
}

/// Đọc một tin thô. Hàm thuần nên test được không cần cầu nối nào chạy.
pub fn doc_tin(raw: &str, mo_luc: i64) -> Vec<TinCauNoi> {
    let Ok(v) = serde_json::from_str::<Value>(raw) else {
        return vec![TinCauNoi::Bo];
    };
    match v {
        Value::Array(xs) => xs.into_iter().map(|x| doc_mot(x, mo_luc)).collect(),
        x => vec![doc_mot(x, mo_luc)],
    }
}

fn doc_mot(v: Value, mo_luc: i64) -> TinCauNoi {
    if let Some(t) = v.get("type").and_then(Value::as_str) {
        return match t {
            "viewers" => match v.get("count").and_then(Value::as_u64) {
                // Giới hạn như bản cũ: số vô lý thì bỏ, không để nó lên màn.
                Some(n) if n <= 1_000_000 => TinCauNoi::Viewers(
                    n,
                    // Tổng lượt xem: phải không nhỏ hơn số đang xem, và không vô lý.
                    v.get("views")
                        .and_then(Value::as_u64)
                        .filter(|&t| t >= n && t <= 1_000_000_000),
                ),
                _ => TinCauNoi::Bo,
            },
            "status" => TinCauNoi::TrangThai {
                state: v
                    .get("state")
                    .and_then(Value::as_str)
                    .unwrap_or("?")
                    .to_string(),
                message: v
                    .get("message")
                    .and_then(Value::as_str)
                    .map(|s| s.chars().take(200).collect()),
            },
            _ => TinCauNoi::Bo,
        };
    }

    // Tin đẩy lại lúc vừa nối: bỏ, nếu không sẽ cảm ơn lại quà của phiên trước.
    if let Some(ts) = v.get("ts").and_then(Value::as_i64) {
        if ts < mo_luc - KHOAN_DUNG_MS {
            return TinCauNoi::Bo;
        }
    }

    match serde_json::from_value::<LiveEvent>(v) {
        Ok(e) if !e.who.user.is_empty() && !e.who.name.is_empty() => TinCauNoi::SuKien(Box::new(e)),
        _ => TinCauNoi::Bo,
    }
}

fn bay_gio_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Áp một tin theo giao thức cầu nối vào phiên. Dùng chung cho nguồn `bridge`
/// (tin qua WebSocket) và nguồn `webview` (tin trang quản lý đẩy vào
/// `POST /api/source/day`).
///
/// Lời báo lúc đã nối cầu nối nhưng chưa nhận được gì từ phòng live.
pub const DANG_NOI: &str = "Đang nối tới phòng live…";

/// Lỗi nguồn ứng với một trạng thái kênh. Hàm thuần.
///
/// Nút "Kết nối Studio" chỉ xanh khi **đang thật sự nhận** dữ liệu: chỉ
/// `dang-live` xoá lỗi. `dang-noi` là "đang nối…", chưa xanh — trước đây nối
/// được tới cầu nối là xanh luôn, dù kênh chưa live hay sai nick.
pub fn loi_theo_trang_thai(state: &str, message: Option<String>) -> Option<String> {
    match state {
        "dang-live" => None,
        "dang-noi" => Some(message.unwrap_or_else(|| DANG_NOI.into())),
        _ => Some(message.unwrap_or_else(|| state.to_string())),
    }
}

/// Luật trạng thái: xem `loi_theo_trang_thai`. Thêm: `offline` — kênh tắt live
/// là cả phòng ra cùng lúc. TikTok không gửi tin "rời phòng" cho ai, nên không
/// dọn ở đây thì rạp còn đầy chibi và 👥 treo ở số cũ suốt mười phút.
pub fn ap_tin(st: &AppState, x: TinCauNoi) {
    match x {
        // Sự kiện từ cầu nối là người THẬT, không phải nhân vật ảo.
        TinCauNoi::SuKien(e) => st.ap_su_kien(*e, false),
        TinCauNoi::Viewers(n, luot) => {
            st.dat_nguoi_xem(n);
            if let Some(t) = luot {
                st.dat_luot_xem(t);
            }
        }
        TinCauNoi::TrangThai { state, message } => {
            tracing::info!(%state, ?message, "nguồn báo trạng thái");
            if state == "offline" {
                st.don_phong();
            }
            st.dat_loi_nguon(loi_theo_trang_thai(&state, message));
        }
        TinCauNoi::Bo => {}
    }
}

pub async fn chay(st: Arc<AppState>, cfg: SourceCfg, the_he: u64) {
    let mut cho = CHO_DAU_MS;
    tracing::info!(url = %cfg.url, channel = %cfg.channel, "mở nguồn cầu nối");

    loop {
        if st.the_he_nguon() != the_he {
            tracing::info!("nguồn cầu nối dừng: đã đổi nguồn");
            return;
        }

        match mot_lan(&st, &cfg, the_he, &mut cho).await {
            // Chỉ về đây khi nguồn đã đổi: không đụng lỗi nguồn — giờ nó là
            // của nguồn mới.
            Ok(()) => return,
            Err(e) => {
                tracing::warn!(loi = %e, "cầu nối đứt, sẽ thử lại");
                st.dat_loi_nguon(Some(e));
            }
        }

        if st.the_he_nguon() != the_he {
            return;
        }
        tokio::time::sleep(Duration::from_millis(cho)).await;
        // Chờ lâu dần: cầu nối chưa mở thì gõ cửa hai giây một lần suốt buổi là
        // vô ích, còn chờ mãi thì nó mở rồi mình không biết.
        cho = (cho * 2).min(CHO_TRAN_MS);
    }
}

async fn mot_lan(st: &Arc<AppState>, cfg: &SourceCfg, the_he: u64, cho: &mut u64) -> Result<(), String> {
    let (ws, _) = tokio_tungstenite::connect_async(&cfg.url)
        .await
        .map_err(|e| format!("Chưa nối được cầu nối TikTok ({}) — đang thử lại: {e}", cfg.url))?;
    // Nối được thì lần đứt sau chờ ngắn lại từ đầu.
    *cho = CHO_DAU_MS;
    let (mut tx, mut rx) = ws.split();

    let chao = serde_json::json!({ "type": "subscribe", "channel": cfg.channel });
    tx.send(Message::Text(chao.to_string()))
        .await
        .map_err(|e| format!("không gửi được lời chào: {e}"))?;

    let mo_luc = bay_gio_ms();
    // Nối được cầu nối chưa phải là có dữ liệu: chờ cầu nối báo `dang-live`.
    if st.the_he_nguon() == the_he {
        st.dat_loi_nguon(Some(DANG_NOI.into()));
    }
    tracing::info!(url = %cfg.url, "đã nối cầu nối");

    while let Some(tin) = rx.next().await {
        if st.the_he_nguon() != the_he {
            return Ok(());
        }
        let raw = match tin {
            Ok(Message::Text(s)) => s,
            Ok(Message::Binary(b)) => String::from_utf8_lossy(&b).to_string(),
            Ok(Message::Close(_)) => return Err("cầu nối đóng kết nối".into()),
            Ok(_) => continue,
            Err(e) => return Err(format!("lỗi đọc: {e}")),
        };

        for x in doc_tin(&raw, mo_luc) {
            ap_tin(st, x);
        }
    }
    Err("cầu nối ngừng gửi".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::events::Payload;

    const MO: i64 = 1_000_000;

    #[test]
    fn doc_duoc_mot_su_kien_qua() {
        let ra = doc_tin(
            r#"{"kind":"gift","user":"a","name":"An","gift":"Hoa sen","count":2,"xuEach":10,"ts":1000000}"#,
            MO,
        );
        match &ra[0] {
            TinCauNoi::SuKien(e) => {
                assert_eq!(e.who.user, "a");
                assert!(matches!(
                    e.what,
                    Payload::Gift {
                        count: 2,
                        xu_each: 10,
                        ..
                    }
                ));
            }
            x => panic!("phải là sự kiện, nhận {x:?}"),
        }
    }

    #[test]
    fn doc_duoc_ca_mang_tin() {
        let ra = doc_tin(
            r#"[{"kind":"join","user":"a","name":"An"},{"kind":"comment","user":"b","name":"Bình","text":"chào"}]"#,
            MO,
        );
        assert_eq!(ra.len(), 2);
        assert!(matches!(ra[0], TinCauNoi::SuKien(_)));
        assert!(matches!(ra[1], TinCauNoi::SuKien(_)));
    }

    #[test]
    fn bo_tin_cu_hon_luc_moi_noi() {
        let cu = doc_tin(r#"{"kind":"join","user":"a","name":"An","ts":900000}"#, MO);
        assert_eq!(
            cu[0],
            TinCauNoi::Bo,
            "tin của phiên trước không được tính lại"
        );

        // Trong khoảng khoan dung thì vẫn nhận.
        let vua = doc_tin(
            &format!(
                r#"{{"kind":"join","user":"a","name":"An","ts":{}}}"#,
                MO - 1_000
            ),
            MO,
        );
        assert!(matches!(vua[0], TinCauNoi::SuKien(_)));
    }

    #[test]
    fn tin_khong_co_ts_thi_van_nhan() {
        let ra = doc_tin(r#"{"kind":"join","user":"a","name":"An"}"#, MO);
        assert!(matches!(ra[0], TinCauNoi::SuKien(_)));
    }

    #[test]
    fn doc_duoc_so_nguoi_xem() {
        assert_eq!(
            doc_tin(r#"{"type":"viewers","count":1234}"#, MO)[0],
            TinCauNoi::Viewers(1234, None)
        );
        assert_eq!(
            doc_tin(r#"{"type":"viewers","count":1234,"views":64394}"#, MO)[0],
            TinCauNoi::Viewers(1234, Some(64394)),
            "kèm tổng lượt xem cả buổi"
        );
        assert_eq!(
            doc_tin(r#"{"type":"viewers","count":1234,"views":10}"#, MO)[0],
            TinCauNoi::Viewers(1234, None),
            "tổng lượt xem nhỏ hơn số đang xem là vô lý — bỏ phần đó"
        );
    }

    #[test]
    fn so_nguoi_xem_vo_ly_thi_bo() {
        assert_eq!(
            doc_tin(r#"{"type":"viewers","count":99999999}"#, MO)[0],
            TinCauNoi::Bo
        );
        assert_eq!(doc_tin(r#"{"type":"viewers"}"#, MO)[0], TinCauNoi::Bo);
    }

    #[test]
    fn doc_duoc_trang_thai_kenh() {
        match &doc_tin(
            r#"{"type":"status","state":"dang-live","message":"ổn"}"#,
            MO,
        )[0]
        {
            TinCauNoi::TrangThai { state, message } => {
                assert_eq!(state, "dang-live");
                assert_eq!(message.as_deref(), Some("ổn"));
            }
            x => panic!("phải là trạng thái, nhận {x:?}"),
        }
    }

    #[test]
    fn chi_dang_live_moi_xoa_loi_nguon() {
        assert_eq!(loi_theo_trang_thai("dang-live", Some("ổn".into())), None);
        assert_eq!(
            loi_theo_trang_thai("dang-noi", None).as_deref(),
            Some(DANG_NOI),
            "đang nối thì chưa xanh"
        );
        assert_eq!(
            loi_theo_trang_thai("dang-noi", Some("Đang nối tới @abc".into())).as_deref(),
            Some("Đang nối tới @abc")
        );
        assert_eq!(
            loi_theo_trang_thai("offline", Some("Kênh chưa phát live".into())).as_deref(),
            Some("Kênh chưa phát live")
        );
        assert_eq!(loi_theo_trang_thai("loi", None).as_deref(), Some("loi"));
    }

    #[test]
    fn tin_hong_thi_bo_chu_khong_sap() {
        for raw in [
            "không phải json",
            "{}",
            r#"{"kind":"gift","user":"a","name":"An"}"#,
            r#"{"kind":"join","user":"","name":""}"#,
            r#"{"type":"agent","command":"gi-do"}"#,
            "[]",
        ] {
            let ra = doc_tin(raw, MO);
            assert!(
                ra.iter().all(|x| *x == TinCauNoi::Bo),
                "phải bỏ: {raw} → {ra:?}"
            );
        }
    }

    #[test]
    fn mot_tin_hong_trong_mang_khong_lam_mat_tin_tot() {
        let ra = doc_tin(
            r#"[{"kind":"xin-chao"},{"kind":"join","user":"a","name":"An"}]"#,
            MO,
        );
        assert_eq!(ra[0], TinCauNoi::Bo);
        assert!(matches!(ra[1], TinCauNoi::SuKien(_)));
    }
}
