"""Máy chủ nhận file tạm trên 127.0.0.1:8791 — khi Chrome chặn tải về (muse.ai, chatgpt.com), trang gửi thẳng blob về đây.

python cong-cu/nhan-file.py   → ghi vào web/son-ha-tien-lo/tranh-goc/_nhan/<tên>
Trong trang (DevTools / javascript):  fetch('http://127.0.0.1:8791/luu?ten=abc.mp4', {method: 'POST', body: blob})
Chỉ nghe 127.0.0.1, tên file lọc chỉ giữ chữ-số-gạch, không ghi ra ngoài thư mục _nhan.
"""
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

DICH = Path(__file__).resolve().parent.parent / 'tranh-goc' / '_nhan'
DICH.mkdir(parents=True, exist_ok=True)


class H(BaseHTTPRequestHandler):
    def _dau(self, ma=200):
        self.send_response(ma)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_GET(self):
        # Trang nhận: trang ngoài (CSP chặn fetch tới máy này) mở cửa sổ này rồi postMessage({ten, blob}); trang này tự POST
        # về cùng nguồn rồi báo lại {ok}.
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(b"""<!doctype html><meta charset=utf-8><title>nhan-file</title><body style="font:16px sans-serif">
<p id=t>Dang cho file...</p><script>
addEventListener('message', async (e) => {
  const { ten, blob } = e.data || {};
  if (!(blob instanceof Blob)) return;
  const r = await fetch('/luu?ten=' + encodeURIComponent(ten), { method: 'POST', body: blob }).then((x) => x.text()).catch((x) => 'LOI ' + x);
  document.getElementById('t').textContent += ' | ' + r;
  e.source && e.source.postMessage({ ok: r }, '*');
});
</script>""")

    def do_OPTIONS(self):
        self._dau(204)

    def do_POST(self):
        q = parse_qs(urlparse(self.path).query)
        ten = re.sub(r'[^A-Za-z0-9._-]', '', (q.get('ten') or ['file.bin'])[0])[:80] or 'file.bin'
        n = int(self.headers.get('Content-Length', '0'))
        if n <= 0 or n > 200 * 1024 * 1024:
            self._dau(400)
            return
        (DICH / ten).write_bytes(self.rfile.read(n))
        self._dau(200)
        self.wfile.write(f'ok {ten} {n}'.encode())


ThreadingHTTPServer(('127.0.0.1', 8791), H).serve_forever()
