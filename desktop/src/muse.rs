//! Cầu nối muse.ai phía vỏ desktop: lái tab muse.ai (đã đăng nhập sẵn trong
//! hộp Trình duyệt) như một API vẽ ảnh cho máy chủ (`live_backend::muse`).
//!
//! Một lượt:
//! 1. Mở tab `muse` nếu chưa có. Lượt mới thì đi tới `https://muse.ai/thread/new`
//!    (cuộc chat mới); lượt vẽ tiếp thì gửi trong cuộc chat đang mở.
//! 2. Điền lời vào ô "Message", bấm "Send".
//! 3. Chờ muse trả lời xong (nút dừng biến mất và đứng yên vài nhịp).
//! 4. Đọc trả lời theo thứ tự: chữ và ảnh xen nhau — "Đoạn N:" trước ảnh nào
//!    là ảnh của đoạn đó (máy chủ tự gán, `muse::gan_doan`).
//! 5. Ảnh muse là `blob:` chỉ trang đó đọc được: trang tự đổi ra data URL, vỏ
//!    lấy từng ảnh về.
//!
//! Phần chạy trong trang là một đoạn JS tự chạy (`BAT_DAU`), ghi tiến độ vào
//! `window.__museViec`; vỏ hỏi lại mỗi 2 giây bằng `eval_with_callback` — cùng
//! cách bản cũ đọc khung live TikTok.

use std::sync::mpsc;
use std::sync::Arc;
use std::time::{Duration, Instant};

use base64::Engine;
use live_backend::muse::{duoi_cua, AnhMuse, CauNoiMuse, Manh};
use serde_json::Value;
use tauri::{AppHandle, Manager, Url, Webview};

use crate::trinh_duyet::{self, Tabs};

const TAB: &str = "muse";

/// Tab của kênh vẽ thứ `kenh`: "muse", "muse-2", "muse-3"… — vẽ song song,
/// mỗi tab một cuộc chat riêng. Hàm thuần.
pub fn tab_cua(kenh: usize) -> String {
    if kenh == 0 { TAB.to_string() } else { format!("{TAB}-{}", kenh + 1) }
}
const TRANG_MOI: &str = "https://muse.ai/thread/new";

/// Đoạn JS khởi động một lượt; gọi `(BAT_DAU)(loi)`.
const BAT_DAU: &str = r#"(function (loi) {
  const V = (window.__museViec = { trang: 'dang', buoc: 'gui', manh: [], data: [], loi: '' });
  const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
  const ban = () => !!document.querySelector('button[aria-label*="top"]');
  (async () => {
    try {
      const truoc = new Set([...document.querySelectorAll('img')].map((i) => i.src));
      const o = document.querySelector('textarea[placeholder="Message"]');
      if (!o) throw new Error('không thấy ô nhập của muse.ai — đã đăng nhập chưa?');
      o.focus();
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(o, loi);
      o.dispatchEvent(new Event('input', { bubbles: true }));
      await ngu(700);
      const gui = document.querySelector('button[aria-label="Send"]');
      if (!gui || gui.disabled) throw new Error('không bấm được nút gửi của muse.ai');
      gui.click();
      V.buoc = 'cho';
      // Chờ muse bắt đầu (tối đa 30 giây), rồi chờ xong: nút dừng tắt đủ 3 nhịp liền.
      const t0 = Date.now();
      while (!ban() && Date.now() - t0 < 30000) await ngu(1000);
      let yen = 0;
      while (yen < 3) {
        await ngu(2000);
        yen = ban() ? 0 : yen + 1;
      }
      V.buoc = 'doc';
      // Đọc trả lời theo thứ tự trên trang, bỏ qua phần lời mình gửi.
      const log = document.querySelector('[role="log"]') || document.body;
      const moc = loi.trim().slice(-30);
      // Mốc nằm gọn trong một nút chữ thì bỏ qua tới đó; không thì đọc hết.
      let coMoc = false;
      const thu = document.createTreeWalker(log, NodeFilter.SHOW_TEXT);
      for (let n = thu.nextNode(); n && !coMoc; n = thu.nextNode()) coMoc = moc !== '' && n.textContent.includes(moc);
      let quaLoiGui = !coMoc;
      let chu = '';
      const anh = [];
      const di = document.createTreeWalker(log, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let n = di.nextNode(); n; n = di.nextNode()) {
        if (n.nodeType === 3) {
          const t = n.textContent;
          if (!quaLoiGui) {
            if (t.includes(moc)) quaLoiGui = true;
            continue;
          }
          chu += t + ' ';
        } else if (quaLoiGui && n.tagName === 'IMG' && !truoc.has(n.src) && n.naturalWidth > 500 && !anh.includes(n.src)) {
          V.manh.push({ chu: chu.trim() });
          chu = '';
          V.manh.push({ anh: anh.length });
          anh.push(n.src);
        }
      }
      if (chu.trim() !== '') V.manh.push({ chu: chu.trim() });
      V.buoc = 'lay';
      for (const src of anh) {
        const b = await (await fetch(src)).blob();
        V.data.push(await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }));
      }
      V.trang = 'xong';
    } catch (e) {
      V.trang = 'loi';
      V.loi = String((e && e.message) || e);
    }
  })();
  return 'ok';
})"#;

pub struct Muse {
    pub app: AppHandle,
}

/// Chạy JS trong trang, chờ kết quả. Kết quả là chuỗi JSON (có khi bọc thêm
/// một lớp chuỗi) → giá trị.
fn chay_js(w: &Webview, js: &str, het: Duration) -> Result<Value, String> {
    let (tx, rx) = mpsc::channel::<String>();
    w.eval_with_callback(js, move |raw| {
        let _ = tx.send(raw);
    })
    .map_err(|e| format!("không chạy được lệnh trong trang muse.ai: {e}"))?;
    let raw = rx.recv_timeout(het).map_err(|_| "trang muse.ai không trả lời".to_string())?;
    let v: Value = serde_json::from_str(&raw).unwrap_or(Value::Null);
    Ok(match v {
        Value::String(s) => serde_json::from_str(&s).unwrap_or(Value::String(s)),
        khac => khac,
    })
}

/// data URL → (byte, đuôi). Hàm thuần.
pub fn doc_data_url(d: &str) -> Option<(Vec<u8>, &'static str)> {
    let (dau, than) = d.strip_prefix("data:")?.split_once(',')?;
    let mime = dau.strip_suffix(";base64")?;
    let duoi = duoi_cua(mime)?;
    let byte = base64::engine::general_purpose::STANDARD.decode(than).ok()?;
    Some((byte, duoi))
}

/// Mở sẵn tab muse.ai (chạy nền, dời ra ngoài màn hình) ngay khi app lên — lượt
/// vẽ đầu khỏi chờ tải trang, và người vận hành thấy muse "sẵn sàng".
pub fn mo_san(app: &AppHandle) {
    let tabs = app.state::<Arc<Tabs>>();
    if let Err(e) = trinh_duyet::mo(app, tabs.inner(), TAB, TRANG_MOI) {
        tracing::warn!("chưa mở sẵn được tab muse.ai: {e}");
    }
}

impl Muse {
    /// Tab của kênh `kenh`, chưa có thì tự mở (cùng hồ sơ đăng nhập).
    fn tab(&self, kenh: usize) -> Result<Webview, String> {
        let id = tab_cua(kenh);
        let tabs = self.app.state::<Arc<Tabs>>();
        trinh_duyet::mo(&self.app, tabs.inner(), &id, TRANG_MOI)?;
        self.app
            .get_webview(&trinh_duyet::nhan(&id))
            .ok_or_else(|| format!("không mở được tab {id}"))
    }
}

/// Bỏ cuộc chat đang mở: bấm nút xoá của muse.ai nếu trang có (menu "..." →
/// Delete), rồi về trang chat mới. Không tìm thấy nút thì chỉ rời trang —
/// cuộc chat không còn được dùng nữa. Trả `true` nếu đã bấm xoá.
/// Xoá cuộc chat ĐANG MỞ trên muse.ai. Trang là ứng dụng một trang, thao tác
/// xoá chạy bất đồng bộ (mở menu → bấm Delete → xác nhận), mà `eval_with_callback`
/// không chờ được `await` — nên theo đúng lối của `BAT_DAU`: chạy nền, ghi tiến
/// độ vào `window.__museDon`, vỏ hỏi lại tới khi xong.
///
/// Chỉ xoá cuộc chat đang mở, và KHÔNG BAO GIỜ đụng "Main chat" — đó là cuộc
/// chat riêng của người dùng, app không được xoá.
/// Ghi lại các request của trang muse.ai (method + url) — để tìm đúng lời gọi
/// API mà trang dùng khi xoá một cuộc chat. Cài một lần, giữ 40 lời gọi gần
/// nhất. Chỉ đọc đường dẫn, KHÔNG đụng vào nội dung hay khoá đăng nhập.
const CAI_HOOK: &str = r#"(function () {
  if (window.__museNet) return 'da-co';
  const ds = (window.__museNet = []);
  const ghi = (m, u) => {
    ds.push({ m: String(m || 'GET').toUpperCase(), u: String(u || '').slice(0, 160) });
    if (ds.length > 40) ds.shift();
  };
  const f = window.fetch;
  window.fetch = function (a, b) {
    try {
      ghi((b && b.method) || (a && a.method), (a && a.url) || a);
    } catch (e) {}
    return f.apply(this, arguments);
  };
  const o = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) {
    try {
      ghi(m, u);
    } catch (e) {}
    return o.apply(this, arguments);
  };
  return 'ok';
})()"#;

const KHOI_DON: &str = r#"(function () {
  const V = (window.__museDon = { trang: 'dang', xoa: false, ten: '', thay: 0, id: '', hang: [] });
  const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
  const nhan = (b) =>
    (b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent || '').trim();
  const nut = (loc) =>
    [...document.querySelectorAll('button,[role="button"],[role="menuitem"],[role="option"]')].filter(loc);
  // Hàng của một cuộc chat trong danh sách: khối mang dấu "group/nav-row".
  // (Khối con có "group-hover/nav-row" nên không thể tìm theo chữ "nav-row".)
  const hangCua = (b) => {
    let e = b;
    for (let i = 0; i < 8 && e; i += 1) {
      if (((e.className || '') + '').includes('group/nav-row')) return e;
      e = e.parentElement;
    }
    return null;
  };
  (async () => {
    try {
      const cac = nut((b) => nhan(b).toLowerCase().startsWith('more thread actions'));
      V.thay = cac.length;
      V.id = (location.pathname.split('/').filter(Boolean).pop() || '').trim();
      const hang = cac.map((b) => ({ b, h: hangCua(b) })).filter((x) => x.h);
      V.hang = hang.slice(0, 3).map((x) => (x.h.textContent || '').trim().slice(0, 40));
      // Cuộc chat đang mở là cuộc MỚI NHẤT — app vừa tạo nó bằng /thread/new,
      // và danh sách xếp mới nhất lên đầu. Không có hàng nào, hay hàng đầu là
      // "Main chat" (cuộc chat riêng của người dùng) thì KHÔNG đụng vào.
      const dau = hang[0];
      if (!dau || /main chat/i.test((dau.h.textContent || '').trim())) {
        V.trang = 'xong';
        return;
      }
      V.ten = (dau.h.textContent || '').trim().slice(0, 60);
      // Nút chỉ hiện khi rê chuột thật (class "hidden group-hover/nav-row:flex").
      // Sự kiện chuột giả KHÔNG bật được :hover của CSS, nên phải tự cho khối
      // bọc nút hiện ra rồi mới bấm — không thì cú bấm rơi vào khoảng không.
      const boc = dau.b.closest('div[class*="group-hover/nav-row"]');
      if (boc) boc.style.display = 'flex';
      await ngu(150);
      // Menu kiểu Radix mở lúc NHẤN chuột, không phải lúc click: gửi đủ bộ.
      const bam = (e) => {
        for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
          const E = t.startsWith('pointer') ? PointerEvent : MouseEvent;
          e.dispatchEvent(new E(t, { bubbles: true, cancelable: true, button: 0, pointerId: 1 }));
        }
      };
      bam(dau.b);
      await ngu(800);
      // Mục của menu vừa mở (hộp nổi), không phải mọi nút trên trang.
      const mucMenu = () =>
        [...document.querySelectorAll('[role="menu"],[data-radix-popper-content-wrapper],[data-state="open"]')].flatMap(
          (h) => [...h.querySelectorAll('[role="menuitem"],button,[role="option"]')],
        );
      V.menu = mucMenu().map(nhan).filter((t) => t).slice(0, 12);
      const xoa = mucMenu().find((b) => /delete|xo[áa]|remove/i.test(nhan(b)));
      if (!xoa) {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        V.trang = 'xong';
        return;
      }
      bam(xoa);
      await ngu(900);
      // Hộp xác nhận: chỉ bấm nút khẳng định, không bấm Cancel.
      const ok = [...document.querySelectorAll('[role="dialog"] button,[role="alertdialog"] button')].find((b) =>
        /^delete\b|^confirm\b|^yes\b|^xo[áa]\b/i.test(nhan(b)),
      );
      if (ok) {
        bam(ok);
        await ngu(900);
      }
      V.xoa = true;
      V.trang = 'xong';
    } catch (e) {
      V.trang = 'loi';
      V.loi = String((e && e.message) || e);
    }
  })();
  return 'ok';
})()"#;

impl CauNoiMuse for Muse {
    fn don(&self, kenh: usize) -> Result<(), String> {
        let w = self.tab(kenh)?;
        let _ = chay_js(&w, CAI_HOOK, Duration::from_secs(10));
        chay_js(&w, KHOI_DON, Duration::from_secs(10))?;
        // Hỏi lại tới khi xong: thao tác xoá có mở menu và hộp xác nhận.
        let bat_dau = Instant::now();
        let mut kq = Value::Null;
        while bat_dau.elapsed() < Duration::from_secs(12) {
            std::thread::sleep(Duration::from_millis(500));
            let v = chay_js(
                &w,
                "JSON.stringify(window.__museDon ? { trang: __museDon.trang, xoa: __museDon.xoa, ten: __museDon.ten, thay: __museDon.thay, hang: __museDon.hang, menu: __museDon.menu || [], loi: __museDon.loi || '' } : null)",
                Duration::from_secs(10),
            )?;
            if v.get("trang").and_then(Value::as_str).is_some_and(|t| t != "dang") {
                kq = v;
                break;
            }
        }
        let xoa = kq.get("xoa").and_then(Value::as_bool) == Some(true);
        let ten = kq.get("ten").and_then(Value::as_str).unwrap_or("").to_string();
        let thay = kq.get("thay").cloned().unwrap_or(Value::Null).to_string();
        let loi = kq.get("loi").and_then(Value::as_str).unwrap_or("").to_string();
        let hang = kq.get("hang").cloned().unwrap_or(Value::Null).to_string();
        let menu = kq.get("menu").cloned().unwrap_or(Value::Null).to_string();
        // Các lời gọi mạng của trang: tìm ra API xoá thì gọi thẳng, nhanh và
        // chắc hơn bấm nút.
        let mang = chay_js(
            &w,
            "JSON.stringify((window.__museNet || []).slice(-18))",
            Duration::from_secs(10),
        )
        .unwrap_or(Value::Null)
        .to_string();
        tracing::info!(tab = %tab_cua(kenh), %mang, "muse.ai: lời gọi mạng của trang");
        tracing::info!(tab = %tab_cua(kenh), xoa, %ten, %thay, %hang, %menu, %loi, "muse.ai: dọn cuộc chat");
        // Dù xoá được hay không: rời sang trang chat mới, cuộc cũ không dùng nữa.
        w.navigate(Url::parse(TRANG_MOI).map_err(|e| e.to_string())?)
            .map_err(|e| format!("không mở được muse.ai: {e}"))?;
        Ok(())
    }

    fn gui(&self, kenh: usize, loi: &str, cho_toi_da: Duration, chat_moi: bool) -> Result<Vec<Manh>, String> {
        let bat_dau = Instant::now();
        let w = self.tab(kenh)?;
        // Gửi tiếp trong cuộc chat đang mở thì giữ nguyên trang: muse thấy
        // các ảnh vừa vẽ. Ảnh cũ trên trang không bị đọc lại (`truoc` trong JS).
        if chat_moi {
            w.navigate(Url::parse(TRANG_MOI).map_err(|e| e.to_string())?)
                .map_err(|e| format!("không mở được muse.ai: {e}"))?;
            std::thread::sleep(Duration::from_secs(3));
        }

        // Chờ ô nhập — không thấy sau 40 giây là chưa đăng nhập.
        let san_sang = loop {
            let co = chay_js(&w, "!!document.querySelector('textarea[placeholder=\"Message\"]')", Duration::from_secs(10))
                .unwrap_or(Value::Bool(false));
            if co == Value::Bool(true) {
                break true;
            }
            if bat_dau.elapsed() > Duration::from_secs(40) {
                break false;
            }
            std::thread::sleep(Duration::from_secs(2));
        };
        if !san_sang {
            return Err("muse.ai chưa sẵn sàng: mở Trình duyệt → Đăng nhập muse.ai rồi thử lại".into());
        }

        // Cài bộ ghi request trước khi gửi: lúc dọn mới có danh sách API mà
        // trang dùng, tìm ra lời gọi xoá thì gọi thẳng cho nhanh.
        let _ = chay_js(&w, CAI_HOOK, Duration::from_secs(10));
        let goi = format!("({BAT_DAU})({})", serde_json::to_string(loi).map_err(|e| e.to_string())?);
        chay_js(&w, &goi, Duration::from_secs(10))?;
        tracing::info!(tab = %tab_cua(kenh), ky_tu = loi.chars().count(), "muse.ai: đã gửi lời vẽ");

        let xong = loop {
            std::thread::sleep(Duration::from_secs(2));
            let v = chay_js(
                &w,
                "JSON.stringify(window.__museViec ? { trang: __museViec.trang, buoc: __museViec.buoc, loi: __museViec.loi, manh: __museViec.manh, n: __museViec.data.length } : null)",
                Duration::from_secs(10),
            )?;
            match v.get("trang").and_then(Value::as_str) {
                Some("xong") => break v,
                Some("loi") => {
                    return Err(format!("muse.ai: {}", v.get("loi").and_then(Value::as_str).unwrap_or("lỗi lạ")));
                }
                Some(_) => {}
                // Trang tải lại giữa chừng (muse tự chuyển trang) là mất lượt.
                None => return Err("muse.ai: trang tải lại giữa chừng, lượt vẽ bị mất".into()),
            }
            if bat_dau.elapsed() > cho_toi_da {
                return Err(format!("muse.ai vẽ quá {} phút", cho_toi_da.as_secs() / 60));
            }
        };

        let mut ra = Vec::new();
        for m in xong.get("manh").and_then(Value::as_array).into_iter().flatten() {
            if let Some(c) = m.get("chu").and_then(Value::as_str) {
                ra.push(Manh::Chu(c.to_string()));
            } else if let Some(i) = m.get("anh").and_then(Value::as_u64) {
                let d = chay_js(&w, &format!("window.__museViec.data[{i}]"), Duration::from_secs(30))?;
                let (byte, duoi) = d
                    .as_str()
                    .and_then(doc_data_url)
                    .ok_or("muse.ai trả ảnh không đọc được")?;
                ra.push(Manh::Anh(AnhMuse { byte, duoi }));
            }
        }
        let so_anh = ra.iter().filter(|m| matches!(m, Manh::Anh(_))).count();
        tracing::info!(tab = %tab_cua(kenh), so_anh, giay = bat_dau.elapsed().as_secs(), "muse.ai: đã nhận trả lời");
        Ok(ra)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tab_song_song_co_ten_rieng() {
        assert_eq!(tab_cua(0), "muse");
        assert_eq!(tab_cua(2), "muse-3");
        assert!(crate::trinh_duyet::kiem_id(&tab_cua(2)).is_ok());
    }

    #[test]
    fn doc_data_url_anh() {
        let (b, d) = doc_data_url("data:image/webp;base64,UklGRg==").unwrap();
        assert_eq!(d, "webp");
        assert_eq!(b, b"RIFF");
        assert!(doc_data_url("data:text/html;base64,PGI+").is_none());
        assert!(doc_data_url("blob:https://muse.ai/x").is_none());
    }
}
