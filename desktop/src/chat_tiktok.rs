//! Gõ tin của MC vào ô chat trang live TikTok.
//!
//! Chỗ gõ là tab kênh (`kenh-<nick>`) — tab người vận hành đã mở bằng nút
//! "Kết nối Studio" và đã đăng nhập TikTok trong đó. Vỏ desktop làm việc này
//! vì chỉ nó mới có tab ấy; máy chủ chỉ quyết gửi gì, lúc nào
//! (`live_backend::chat_tiktok`).
//!
//! KHÔNG tự mở tab: không thấy tab kênh thì báo lỗi rồi thôi. Tự mở một trang
//! live giữa buổi là cướp mất tab người vận hành đang xem, và tab mới chưa
//! chắc đã đăng nhập.

use std::sync::mpsc;
use std::sync::Arc;
use std::time::Duration;

use live_backend::chat_tiktok::CauNoiChat;
use serde_json::Value;
use tauri::{AppHandle, Manager, Webview};

use crate::trinh_duyet::{self, Tabs};

pub struct ChatTiktok {
    pub app: AppHandle,
}

/// Chờ trang trả lời một lệnh.
const CHO: Duration = Duration::from_secs(10);

/// Gõ `loi` vào ô chat rồi gửi. Trả `{ok, vi}` — `vi` là chỗ đã tìm thấy ô,
/// để nhật ký nói được TikTok đang dùng ô nào (họ đổi giao diện luôn).
///
/// Ô chat của TikTok là `div[contenteditable]`, không phải `<input>`: gán
/// `value` không ăn, phải chèn chữ bằng `execCommand('insertText')` để React
/// của trang nhận được sự kiện nhập y như người gõ. Gửi bằng phím Enter —
/// nút gửi của TikTok đổi nhãn theo ngôn ngữ, phím Enter thì không.
const GUI_JS: &str = r#"(function (loi) {
  const ra = (ok, vi, loi2) => JSON.stringify({ ok: ok, vi: vi || '', loi: loi2 || '' });
  try {
    // Thử lần lượt các chỗ TikTok từng đặt ô chat. Lấy ô ĐANG HIỆN, bỏ ô ẩn.
    const chon = [
      '[data-e2e="comment-text-input"]',
      'div[contenteditable="true"][data-e2e*="comment"]',
      'div[contenteditable="plaintext-only"]',
      'div[contenteditable="true"]',
    ];
    let o = null;
    let vi = '';
    for (const c of chon) {
      for (const x of document.querySelectorAll(c)) {
        const r = x.getBoundingClientRect();
        if (r.width > 40 && r.height > 8) { o = x; vi = c; break; }
      }
      if (o) break;
    }
    if (!o) return ra(false, '', 'không thấy ô chat — đã đăng nhập TikTok trong tab này chưa?');

    o.focus();
    // Dọn chữ cũ còn sót trong ô (người vận hành gõ dở).
    const sel = window.getSelection();
    const rg = document.createRange();
    rg.selectNodeContents(o);
    sel.removeAllRanges();
    sel.addRange(rg);
    document.execCommand('insertText', false, loi);

    const chu = (o.innerText || o.textContent || '').trim();
    if (chu.indexOf(loi.trim().slice(0, 12)) === -1) {
      return ra(false, vi, 'gõ vào ô chat không ăn');
    }
    for (const kieu of ['keydown', 'keypress', 'keyup']) {
      o.dispatchEvent(new KeyboardEvent(kieu, {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true,
      }));
    }
    return ra(true, vi, '');
  } catch (e) {
    return ra(false, '', String((e && e.message) || e));
  }
})"#;

fn chay_js(w: &Webview, js: &str) -> Result<Value, String> {
    let (tx, rx) = mpsc::channel::<String>();
    w.eval_with_callback(js, move |raw| {
        let _ = tx.send(raw);
    })
    .map_err(|e| format!("không chạy được lệnh trong tab kênh: {e}"))?;
    let raw = rx.recv_timeout(CHO).map_err(|_| "tab kênh không trả lời".to_string())?;
    let v: Value = serde_json::from_str(&raw).unwrap_or(Value::Null);
    Ok(match v {
        Value::String(s) => serde_json::from_str(&s).unwrap_or(Value::String(s)),
        khac => khac,
    })
}

/// Id tab kênh mà trang quản lý đặt cho `nick`: `kenh-<nick>` với mọi ký tự
/// không phải chữ/số đổi thành gạch nối (`docOThemTab` bên
/// `client/manager/src/lib/trang-web.ts`). Hàm thuần.
pub fn tab_cua(nick: &str) -> String {
    let mut than = String::new();
    for c in nick.trim().trim_start_matches('@').to_lowercase().chars() {
        if c.is_ascii_alphanumeric() {
            than.push(c);
        } else if !than.ends_with('-') {
            // GỘP cả dãy ký tự lạ thành MỘT gạch nối — đúng `[^a-z0-9]+` bên
            // trang quản lý. Đổi từng ký tự một thì "a..b" ra "a--b", lệch id
            // và không bao giờ tìm thấy tab.
            than.push('-');
        }
    }
    let mut id = format!("kenh-{than}");
    id.truncate(40);
    while id.ends_with('-') {
        id.pop();
    }
    id
}

impl ChatTiktok {
    /// Tab kênh đang mở. KHÔNG tự mở tab mới — xem chú thích đầu file.
    fn tab(&self, nick: &str) -> Result<Webview, String> {
        let id = tab_cua(nick);
        let tabs = self.app.state::<Arc<Tabs>>();
        if !tabs.ids().iter().any(|x| x == &id) {
            return Err(format!(
                "chưa mở tab trang live của @{nick} — bấm \"Kết nối Studio\" ở trang quản lý rồi đăng nhập TikTok"
            ));
        }
        self.app
            .get_webview(&trinh_duyet::nhan(&id))
            .ok_or_else(|| format!("không thấy tab {id}"))
    }
}

impl CauNoiChat for ChatTiktok {
    fn gui(&self, nick: &str, loi: &str) -> Result<(), String> {
        let w = self.tab(nick)?;
        let goi = format!("({GUI_JS})({})", serde_json::to_string(loi).map_err(|e| e.to_string())?);
        let kq = chay_js(&w, &goi)?;
        if kq.get("ok").and_then(Value::as_bool) == Some(true) {
            let o = kq.get("vi").and_then(Value::as_str).unwrap_or("").to_string();
            tracing::info!(kenh = %nick, %o, "chát TikTok: đã gửi");
            return Ok(());
        }
        Err(kq.get("loi").and_then(Value::as_str).unwrap_or("gửi hỏng, không rõ lý do").to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn id_tab_kenh_khop_voi_trang_quan_ly() {
        assert_eq!(tab_cua("yuki.54haji"), "kenh-yuki-54haji");
        assert_eq!(tab_cua("@Hieuthao.1995"), "kenh-hieuthao-1995");
        assert_eq!(tab_cua("  labeau_official "), "kenh-labeau-official");
        // Dãy ký tự lạ gộp thành MỘT gạch nối, y như trang quản lý.
        assert_eq!(tab_cua("a..b"), "kenh-a-b");
        assert_eq!(tab_cua("x__y!!"), "kenh-x-y");
        // Id không bao giờ quá 40 ký tự, không bao giờ kết thúc bằng gạch nối.
        let dai = tab_cua(&"a.".repeat(60));
        assert!(dai.len() <= 40 && !dai.ends_with('-'), "{dai}");
    }

    #[test]
    fn doan_js_gui_khong_dung_den_value_cua_input() {
        // Ô chat TikTok là contenteditable: gán `value` không ăn. Giữ bài kiểm
        // này để ai sửa sau không quay về lối cũ.
        assert!(GUI_JS.contains("insertText"));
        assert!(GUI_JS.contains("contenteditable"));
        assert!(GUI_JS.contains("Enter"));
    }
}
