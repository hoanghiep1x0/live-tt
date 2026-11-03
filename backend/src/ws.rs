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

    // Gửi ngay trạng thái hiện tại: client vừa nối không phải chờ sự kiện kế tiếp
    // mới biết thiết kế nào đang phát.
    let chao = json!({ "t": "live", "designId": st.live() });
    if tx.send(Message::Text(chao.to_string())).await.is_err() {
        return;
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
                    if let Some(tra_loi) = xu_ly(&s) {
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

/// Tin từ client. Hiện mới có `ping`; lệnh sẽ thêm khi có cổng duyệt.
fn xu_ly(raw: &str) -> Option<Value> {
    let v: Value = serde_json::from_str(raw).ok()?;
    match v.get("t").and_then(Value::as_str) {
        Some("ping") => Some(json!({ "t": "pong" })),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ping_duoc_tra_pong() {
        assert_eq!(xu_ly(r#"{"t":"ping"}"#), Some(json!({ "t": "pong" })));
    }

    #[test]
    fn tin_la_thi_bo_qua_chu_khong_sap() {
        assert_eq!(xu_ly("{}"), None);
        assert_eq!(xu_ly("không phải json"), None);
        assert_eq!(xu_ly(r#"{"t":"xoa-het"}"#), None);
    }
}
