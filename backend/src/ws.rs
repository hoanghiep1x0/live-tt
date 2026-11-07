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

    // Thiết kế mà cửa sổ này đang xem thử (tin `xem`), để lúc đóng còn báo.
    let mut dang_xem: Option<String> = None;

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
                    let mut dut = false;
                    for tra_loi in xu_ly_cua(&st, &s, &mut dang_xem) {
                        if tx.send(Message::Text(tra_loi.to_string())).await.is_err() {
                            dut = true;
                            break;
                        }
                    }
                    if dut {
                        break;
                    }
                }
                Some(Ok(Message::Close(_))) | None => break,
                Some(Err(_)) => break,
                _ => {}
            },
        }
    }
    // Cửa sổ đóng (hay mất nối): trả lượt xem. Cửa sổ cuối cùng của phòng đi
    // thì phiên xem thử của phòng đó thôi chạy.
    if let Some(id) = dang_xem {
        st.dong_xem_thu(&id);
    }
}

/// Tin từ client.
///
/// Lệnh đi lên bằng cửa này chứ không phải một route REST riêng, vì `RoomCommand`
/// là whitelist dùng chung cho người, luật tự động và AI (hợp đồng 02 §6).
///
/// Hiện mới nhận `set-module`, `set-config`, `set-design-config`, `set-bot` và
/// `set-ai`, và chỉ khi nguồn là `nguoi`.
/// Cổng duyệt đầy đủ — xét khác nhau theo nguồn, có mức "gợi ý cho người" —
/// làm cùng lúc với module tự vận hành. Trước mắt thế này là đủ an toàn: `/ws`
/// đã qua lớp chặn Host và Origin nên chỉ trang của chính app gọi được.
///
/// Bản xem trước của một thiết kế CHƯA phát (bảng xem thử trên trang `/d/<id>/`)
/// khai mình là ai bằng tin `xem`, và gửi lệnh kèm `designId`: lệnh áp vào chính
/// thiết kế đó, trạng thái mới chỉ trả riêng cho trang đó (gắn `designId`), không
/// phát cho ai — phòng đang live không bị đụng. Thiếu `designId` (trang quản lý)
/// thì như cũ: áp vào thiết kế đang phát.
#[cfg(test)]
fn xu_ly(st: &Arc<AppState>, raw: &str) -> Vec<Value> {
    xu_ly_cua(st, raw, &mut None)
}

/// `dang_xem`: thiết kế cửa sổ này đang xem thử, giữ qua các tin của nó.
fn xu_ly_cua(st: &Arc<AppState>, raw: &str, dang_xem: &mut Option<String>) -> Vec<Value> {
    let Ok(v) = serde_json::from_str::<Value>(raw) else { return vec![] };
    match v.get("t").and_then(Value::as_str) {
        Some("ping") => vec![json!({ "t": "pong" })],
        Some("xem") => match thiet_ke_cua(st, &v) {
            Some(id) => {
                // Một cửa sổ chỉ xem một phòng: khai phòng khác thì trả phòng cũ.
                if dang_xem.as_deref() != Some(id.as_str()) {
                    if let Some(cu) = dang_xem.replace(id.clone()) {
                        st.dong_xem_thu(&cu);
                    }
                    st.mo_xem_thu(&id);
                }
                if st.live().as_deref() == Some(id.as_str()) {
                    vec![]
                } else {
                    rieng(st, &id)
                }
            }
            None => vec![],
        },
        Some("command") => lam_lenh(st, &v),
        // Tin quyền nói của một sân khấu (`stage-sdk/src/quyen-noi.ts`): chuyển
        // tới MỌI trang đang nối. Cửa sổ ở hai trình duyệt khác nhau không nghe
        // được nhau qua `BroadcastChannel`, nên trước đây cả hai cùng đọc to —
        // người xem nghe lặp giọng. Máy chủ không xét gì, chỉ chuyển; tin to
        // bất thường thì bỏ.
        Some("quyen-noi") => {
            if let Some(tin) = v.get("tin").filter(|t| t.is_object() && t.to_string().len() <= 512) {
                st.broadcast(json!({ "t": "quyen-noi", "tin": tin }));
            }
            vec![]
        }
        // Sân khấu tự đọc một đoạn truyện thay MC: máy chủ ghi tiến độ để MC
        // quay lại kể tiếp từ đoạn sau, không kể lại (`ke_truyen::bao_tu_doc`).
        Some("tu-doc") => {
            let id = thiet_ke_cua(st, &v).or_else(|| st.live());
            let ten = v.get("ten").and_then(Value::as_str);
            let doan = v.get("doan").and_then(Value::as_u64).and_then(|d| usize::try_from(d).ok());
            if let (Some(id), Some(ten), Some(doan)) = (id, ten, doan) {
                crate::ke_truyen::bao_tu_doc(st, &id, ten, doan);
            }
            vec![]
        }
        _ => vec![],
    }
}

/// `designId` của tin, chỉ khi là id hợp lệ của một thiết kế có thật (id nằm trong
/// đường dẫn thư mục — không nhận `..`, `/`).
fn thiet_ke_cua(st: &Arc<AppState>, v: &Value) -> Option<String> {
    let id = v.get("designId").and_then(Value::as_str)?;
    let hop_le = !id.is_empty()
        && id.len() <= 32
        && id.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-');
    (hop_le && st.design_exists(id)).then(|| id.to_string())
}

/// Trạng thái của một thiết kế chưa phát, gắn `designId` để trang biết là của mình.
fn rieng(st: &Arc<AppState>, id: &str) -> Vec<Value> {
    st.trang_thai_phong(id)
        .into_iter()
        .map(|mut m| {
            if let Some(o) = m.as_object_mut() {
                o.insert("designId".into(), json!(id));
            }
            m
        })
        .collect()
}

fn lam_lenh(st: &Arc<AppState>, v: &Value) -> Vec<Value> {
    if v.get("by").and_then(Value::as_str) != Some("nguoi") {
        return vec![json!({ "t": "error", "message": "nguồn lệnh chưa được nhận" })];
    }
    let Some(c) = v.get("command") else { return vec![] };
    let op = c.get("op").and_then(Value::as_str).unwrap_or_default();
    // Kiểm whitelist TRƯỚC khi hỏi phòng nào đang phát: lệnh lạ thì phải bị từ
    // chối rõ ràng, kể cả lúc chưa phát phòng nào.
    if op != "set-module"
        && op != "set-config"
        && op != "set-design-config"
        && op != "set-bot"
        && op != "set-ai"
        && op != "module-action"
    {
        return vec![json!({ "t": "error", "message": "lệnh này chưa nhận" })];
    }

    let live = st.live();
    let Some(design) = thiet_ke_cua(st, v).or_else(|| live.clone()) else { return vec![] };
    let module_id = c.get("moduleId").and_then(Value::as_str).unwrap_or_default();
    let patch = || c.get("patch").cloned().unwrap_or(Value::Null);

    // Nút bấm của module: không lưu gì, `bam` tự phát (đang phát) hoặc trả riêng tin
    // gắn `designId` cho trang xem thử vừa bấm (chưa phát).
    if op == "module-action" {
        let action = c.get("action").and_then(Value::as_str).unwrap_or_default();
        return match crate::hanh_dong::bam(st, &design, module_id, action) {
            Ok(_) if live.as_deref() == Some(design.as_str()) => vec![],
            Ok(tin) => vec![tin],
            Err(e) => vec![json!({ "t": "error", "message": format!("{e:?}") })],
        };
    }

    let kq = if op == "set-module" {
        let on = c.get("on").and_then(Value::as_bool).unwrap_or(false);
        st.set_enabled(&design, module_id, on)
    } else if op == "set-design-config" {
        st.set_design_config(&design, patch())
    } else if op == "set-bot" {
        st.set_bot_config(&design, patch())
    } else if op == "set-ai" {
        st.set_ai_config(&design, patch())
    } else {
        st.set_config(&design, module_id, patch())
    };

    match kq {
        // Các hàm set_* đã phát cho mọi cửa sổ, kể cả cửa sổ vừa gửi lệnh: đang
        // phát thì như tin thường, chưa phát thì gắn `designId` của phòng đó.
        Ok(()) => vec![],
        Err(e) => vec![json!({ "t": "error", "message": format!("{e:?}") })],
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
        assert_eq!(xu_ly(&st(), r#"{"t":"ping"}"#), vec![json!({ "t": "pong" })]);
    }

    #[test]
    fn tin_la_thi_bo_qua_chu_khong_sap() {
        let s = st();
        assert!(xu_ly(&s, "{}").is_empty());
        assert!(xu_ly(&s, "không phải json").is_empty());
        assert!(xu_ly(&s, r#"{"t":"xoa-het"}"#).is_empty());
    }

    #[test]
    fn lenh_khong_khai_nguon_thi_tu_choi() {
        let s = st();
        let ra = xu_ly(&s, r#"{"t":"command","command":{"op":"set-module","moduleId":"story","on":true}}"#);
        assert_eq!(ra[0]["t"], json!("error"));
    }

    #[test]
    fn lenh_ngoai_whitelist_thi_tu_choi() {
        let s = st();
        let ra = xu_ly(&s, r#"{"t":"command","by":"nguoi","command":{"op":"xoa-het"}}"#);
        assert_eq!(ra[0]["t"], json!("error"));
    }

    #[test]
    fn chua_phat_phong_nao_thi_lenh_khong_lam_gi() {
        let s = st();
        let ra = xu_ly(&s, r#"{"t":"command","by":"nguoi","command":{"op":"set-module","moduleId":"story","on":true}}"#);
        assert!(ra.is_empty(), "không có phòng để áp thì im lặng, không sập");
    }

    /// Có một thiết kế thật trong thư mục tạm.
    fn st_co(id: &str) -> Arc<AppState> {
        let p = tempfile::tempdir().unwrap().keep();
        let d = p.join("client").join("designs").join(id);
        std::fs::create_dir_all(d.join("dist")).unwrap();
        std::fs::write(d.join("design.json"), format!(r#"{{"id":"{id}","name":"x","slots":[]}}"#)).unwrap();
        AppState::new(Layout::new(p), 47830, "tok".into())
    }

    #[test]
    fn xem_truoc_thiet_ke_chua_phat_bat_duoc_module() {
        let s = st_co("san-bar-hop-dem");
        let mut rx = s.subscribe();
        let ra = xu_ly(
            &s,
            r#"{"t":"command","by":"nguoi","designId":"san-bar-hop-dem","command":{"op":"set-module","moduleId":"vu-cong-3d","on":true}}"#,
        );
        assert!(ra.is_empty(), "không trả riêng nữa: tin đi qua bus tới mọi cửa sổ");
        let m = rx.try_recv().expect("phát cho mọi cửa sổ xem thử của phòng này");
        assert_eq!(m["designId"], json!("san-bar-hop-dem"));
        assert_eq!(m["enabled"], json!(["vu-cong-3d"]));
        // nối lại: tin `xem` trả đúng trạng thái đã lưu
        let lai = xu_ly(&s, r#"{"t":"xem","designId":"san-bar-hop-dem"}"#);
        assert!(lai.iter().any(|m| m["t"] == json!("modules") && m["enabled"] == json!(["vu-cong-3d"])));
    }

    #[test]
    fn bam_nut_module_o_trang_xem_thu_tra_rieng_tin_action() {
        let s = st_co("san-bar-hop-dem");
        let ra = xu_ly(
            &s,
            r#"{"t":"command","by":"nguoi","designId":"san-bar-hop-dem","command":{"op":"module-action","moduleId":"vu-cong-3d","action":"nhay"}}"#,
        );
        assert_eq!(ra.len(), 1);
        assert_eq!(ra[0]["t"], json!("action"));
        assert_eq!(ra[0]["moduleId"], json!("vu-cong-3d"));
        assert_eq!(ra[0]["op"], json!("nhay"));
        assert_eq!(ra[0]["designId"], json!("san-bar-hop-dem"));
    }

    #[test]
    fn xem_thu_co_phien_rieng_gan_dung_phong() {
        let s = st_co("ke-chuyen");
        let ra = xu_ly(&s, r#"{"t":"xem","designId":"ke-chuyen"}"#);
        let p = ra.iter().find(|m| m["t"] == json!("session")).expect("trang xem thử có phiên");
        assert_eq!(p["designId"], json!("ke-chuyen"));
        assert_eq!(p["view"]["designId"], json!("ke-chuyen"));
        assert!(s.session_view().is_none(), "phiên xem thử không phải phiên đang phát");
    }

    #[test]
    fn cua_so_cuoi_dong_thi_bo_phien_xem_thu() {
        let s = st_co("ke-chuyen");
        let mut a = None;
        let mut b = None;
        xu_ly_cua(&s, r#"{"t":"xem","designId":"ke-chuyen"}"#, &mut a);
        xu_ly_cua(&s, r#"{"t":"xem","designId":"ke-chuyen"}"#, &mut b);
        assert_eq!(s.cac_xem_thu().len(), 1);
        s.dong_xem_thu("ke-chuyen");
        assert_eq!(s.cac_xem_thu().len(), 1, "còn một cửa sổ thì phiên vẫn chạy");
        s.dong_xem_thu("ke-chuyen");
        assert!(s.cac_xem_thu().is_empty(), "hết cửa sổ thì bỏ phiên");
    }

    #[test]
    fn designid_la_hoac_khong_co_that_thi_bo_qua() {
        let s = st_co("san-bar-hop-dem");
        assert!(xu_ly(&s, r#"{"t":"xem","designId":"../../etc"}"#).is_empty());
        assert!(xu_ly(&s, r#"{"t":"xem","designId":"khong-co"}"#).is_empty());
        let ra = xu_ly(
            &s,
            r#"{"t":"command","by":"nguoi","designId":"../x","command":{"op":"set-module","moduleId":"a","on":true}}"#,
        );
        assert!(ra.is_empty(), "id hỏng thì như không có id — chưa phát phòng nào nên im lặng");
    }

    #[test]
    fn tin_quyen_noi_chuyen_toi_moi_trang() {
        let s = st();
        let mut rx = s.subscribe();
        let tin = r#"{"t":"quyen-noi","tin":{"t":"toi","id":"a1","obs":false,"luc":5}}"#;
        assert!(xu_ly(&s, tin).is_empty(), "không trả riêng: đi qua bus tới mọi cửa sổ");
        let m = rx.try_recv().expect("phải chuyển tới mọi trang");
        assert_eq!(m, json!({ "t": "quyen-noi", "tin": { "t": "toi", "id": "a1", "obs": false, "luc": 5 } }));
        // Không phải object, hay to bất thường: bỏ.
        xu_ly(&s, r#"{"t":"quyen-noi","tin":"x"}"#);
        let to = format!(r#"{{"t":"quyen-noi","tin":{{"id":"{}"}}}}"#, "a".repeat(600));
        xu_ly(&s, &to);
        assert!(rx.try_recv().is_err());
    }

    #[test]
    fn san_khau_tu_doc_thi_mc_ke_tiep_tu_doan_sau() {
        let s = st_co("ke-chuyen");
        let lenh = |c: &str| xu_ly(&s, &format!(r#"{{"t":"command","by":"nguoi","designId":"ke-chuyen","command":{c}}}"#));
        lenh(r#"{"op":"set-module","moduleId":"story","on":true}"#);
        lenh(r#"{"op":"set-config","moduleId":"story","patch":{"title":"Tấm Cám","passages":"Một.\nHai.\nBa."}}"#);
        let dau = crate::anh_truyen::dau_truyen("Tấm Cám", &["Một.".into(), "Hai.".into(), "Ba.".into()]);
        assert_eq!(s.tien_do_ke("ke-chuyen", &dau).tiep, 0);

        // Tin của truyện khác (truyện đã đổi): bỏ.
        assert!(xu_ly(&s, r#"{"t":"tu-doc","designId":"ke-chuyen","ten":"Thạch Sanh","doan":1}"#).is_empty());
        assert_eq!(s.tien_do_ke("ke-chuyen", &dau).tiep, 0);

        // Đúng truyện: sân khấu đã tự đọc đoạn 2 → MC kể tiếp đoạn 3.
        xu_ly(&s, r#"{"t":"tu-doc","designId":"ke-chuyen","ten":"Tấm Cám","doan":1}"#);
        assert_eq!(s.tien_do_ke("ke-chuyen", &dau).tiep, 2);

        // Phòng tự đọc (không có MC): máy chủ không giữ tiến độ, không đụng.
        lenh(r#"{"op":"set-config","moduleId":"story","patch":{"cachKe":"tu-doc"}}"#);
        xu_ly(&s, r#"{"t":"tu-doc","designId":"ke-chuyen","ten":"Tấm Cám","doan":2}"#);
        assert_eq!(s.tien_do_ke("ke-chuyen", &dau).tiep, 2);
    }
}
