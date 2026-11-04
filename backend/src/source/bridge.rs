//! Nguồn cầu nối: nối tới một tiến trình đọc TikTok chạy ngoài.
//!
//! Đây là đường tới **dữ liệu TikTok thật** mà không cần vỏ Tauri. Tiến trình
//! ngoài (bản cũ có sẵn ở `D:\Live\tools\bridge`) đọc phòng live rồi đẩy JSON
//! qua WebSocket; backend chỉ việc nhận và chuẩn hoá.
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
    Viewers(u64),
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
                Some(n) if n <= 1_000_000 => TinCauNoi::Viewers(n),
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

pub async fn chay(st: Arc<AppState>, cfg: SourceCfg, the_he: u64) {
    let mut cho = CHO_DAU_MS;
    tracing::info!(url = %cfg.url, channel = %cfg.channel, "mở nguồn cầu nối");

    loop {
        if st.the_he_nguon() != the_he {
            tracing::info!("nguồn cầu nối dừng: đã đổi nguồn");
            return;
        }

        match mot_lan(&st, &cfg, the_he).await {
            Ok(()) => {
                st.dat_loi_nguon(None);
                cho = CHO_DAU_MS;
            }
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

async fn mot_lan(st: &Arc<AppState>, cfg: &SourceCfg, the_he: u64) -> Result<(), String> {
    let (ws, _) = tokio_tungstenite::connect_async(&cfg.url)
        .await
        .map_err(|e| format!("không nối được {}: {e}", cfg.url))?;
    let (mut tx, mut rx) = ws.split();

    let chao = serde_json::json!({ "type": "subscribe", "channel": cfg.channel });
    tx.send(Message::Text(chao.to_string()))
        .await
        .map_err(|e| format!("không gửi được lời chào: {e}"))?;

    let mo_luc = bay_gio_ms();
    st.dat_loi_nguon(None);
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
            match x {
                // Sự kiện từ cầu nối là người THẬT, không phải nhân vật ảo.
                TinCauNoi::SuKien(e) => st.ap_su_kien(*e, false),
                TinCauNoi::Viewers(n) => st.dat_nguoi_xem(n),
                TinCauNoi::TrangThai { state, message } => {
                    tracing::info!(%state, ?message, "cầu nối báo trạng thái");
                    if state == "offline" || state == "loi" {
                        st.dat_loi_nguon(message.clone().or(Some(state)));
                    } else {
                        st.dat_loi_nguon(None);
                    }
                }
                TinCauNoi::Bo => {}
            }
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
            TinCauNoi::Viewers(1234)
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
