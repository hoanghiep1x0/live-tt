//! WebSocket: phát sự kiện và cấu hình xuống thiết kế đang chạy và trang quản lý.
//!
//! Một chiều là chính. Thiết kế chỉ nhận; muốn tác động thì gửi lệnh lên kèm
//! nhãn nguồn, backend mới là nơi quyết.

use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::Response;
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};

use crate::state::AppState;

pub async fn upgrade(ws: WebSocketUpgrade, State(st): State<Arc<AppState>>) -> Response {
    ws.on_upgrade(move |socket| chay(socket, st))
}

async fn chay(socket: WebSocket, st: Arc<AppState>) {
    let (mut tx, mut rx) = socket.split();
    let mut bus = st.subscribe();

    // Gửi ngay toàn bộ trạng thái: client vừa nối không phải chờ sự kiện kế tiếp
    // mới biết phòng nào đang phát, module nào đang bật và phiên đang thế nào.
    for tin in st.chao_ws() {
        if tx.send(Message::Text(tin.to_string())).await.is_err() {
            return;
        }
    }

    loop {
        tokio::select! {
            tin = bus.recv() => match tin {
                Ok(v) => {
                    if tx.send(Message::Text(v.to_string())).await.is_err() {
                        break;
                    }
                }
                // Client chậm quá, mất bớt tin cũ. Báo để nó tự nạp lại trạng thái.
                Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                    let canh_bao = json!({ "t": "error", "message": format!("trễ {n} tin, hãy nạp lại trạng thái") });
                    if tx.send(Message::Text(canh_bao.to_string())).await.is_err() {
                        break;
                    }
                }
                Err(_) => break,
            },
            tin = rx.next() => match tin {
                Some(Ok(Message::Text(s))) => {
                    if let Some(tra_loi) = xu_ly(&st, &s) {
                        if tx.send(Message::Text(tra_loi.to_string())).await.is_err() {
                            break;
                        }
                    }
                }
                Some(Ok(Message::Close(_))) | None => break,
                Some(Err(_)) => break,
                _ => {}
            },
        }
    }
}

/// Tin từ client.
///
/// Lệnh đi lên bằng cửa này chứ không phải một route REST riêng, vì `RoomCommand`
/// là whitelist dùng chung cho người, luật tự động và AI (hợp đồng 02 §6).
///
/// Hiện mới nhận `set-module`, `set-config`, `set-design-config` và `set-bot`,
/// và chỉ khi nguồn là `nguoi`.
/// Cổng duyệt đầy đủ — xét khác nhau theo nguồn, có mức "gợi ý cho người" —
/// làm cùng lúc với module tự vận hành. Trước mắt thế này là đủ an toàn: `/ws`
/// đã qua lớp chặn Host và Origin nên chỉ trang của chính app gọi được.
fn xu_ly(st: &Arc<AppState>, raw: &str) -> Option<Value> {
    let v: Value = serde_json::from_str(raw).ok()?;
    match v.get("t").and_then(Value::as_str) {
        Some("ping") => Some(json!({ "t": "pong" })),
        Some("command") => lam_lenh(st, &v),
        _ => None,
    }
}

fn lam_lenh(st: &Arc<AppState>, v: &Value) -> Option<Value> {
    if v.get("by").and_then(Value::as_str) != Some("nguoi") {
        return Some(json!({ "t": "error", "message": "nguồn lệnh chưa được nhận" }));
    }
    let c = v.get("command")?;
    let op = c.get("op").and_then(Value::as_str).unwrap_or_default();
    // Kiểm whitelist TRƯỚC khi hỏi phòng nào đang phát: lệnh lạ thì phải bị từ
    // chối rõ ràng, kể cả lúc chưa phát phòng nào.
    if op != "set-module" && op != "set-config" && op != "set-design-config" && op != "set-bot" {
        return Some(json!({ "t": "error", "message": "lệnh này chưa nhận" }));
    }

    let design = st.live()?;
    let module_id = c.get("moduleId").and_then(Value::as_str).unwrap_or_default();
    let patch = || c.get("patch").cloned().unwrap_or(Value::Null);

    let kq = if op == "set-module" {
        let on = c.get("on").and_then(Value::as_bool).unwrap_or(false);
        st.set_enabled(&design, module_id, on)
    } else if op == "set-design-config" {
        st.set_design_config(&design, patch())
    } else if op == "set-bot" {
        st.set_bot_config(&design, patch())
    } else {
        st.set_config(&design, module_id, patch())
    };

    match kq {
        Ok(()) => None,
        Err(e) => Some(json!({ "t": "error", "message": format!("{e:?}") })),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::paths::Layout;

    fn st() -> Arc<AppState> {
        let d = tempfile::tempdir().unwrap();
        // Giữ thư mục sống qua hết test bằng cách cố tình rò — chỉ dùng ở test.
        let p = d.keep();
        AppState::new(Layout::new(p), 47830, "tok".into())
    }

    #[test]
    fn ping_duoc_tra_pong() {
        assert_eq!(xu_ly(&st(), r#"{"t":"ping"}"#), Some(json!({ "t": "pong" })));
    }

    #[test]
    fn tin_la_thi_bo_qua_chu_khong_sap() {
        let s = st();
        assert_eq!(xu_ly(&s, "{}"), None);
        assert_eq!(xu_ly(&s, "không phải json"), None);
        assert_eq!(xu_ly(&s, r#"{"t":"xoa-het"}"#), None);
    }

    #[test]
    fn lenh_khong_khai_nguon_thi_tu_choi() {
        let s = st();
        let ra = xu_ly(&s, r#"{"t":"command","command":{"op":"set-module","moduleId":"story","on":true}}"#);
        assert_eq!(ra.unwrap()["t"], json!("error"));
    }

    #[test]
    fn lenh_ngoai_whitelist_thi_tu_choi() {
        let s = st();
        let ra = xu_ly(&s, r#"{"t":"command","by":"nguoi","command":{"op":"xoa-het"}}"#);
        assert_eq!(ra.unwrap()["t"], json!("error"));
    }

    #[test]
    fn chua_phat_phong_nao_thi_lenh_khong_lam_gi() {
        let s = st();
        let ra = xu_ly(&s, r#"{"t":"command","by":"nguoi","command":{"op":"set-module","moduleId":"story","on":true}}"#);
        assert_eq!(ra, None, "không có phòng để áp thì im lặng, không sập");
    }
}
