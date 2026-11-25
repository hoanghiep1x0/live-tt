// Xưởng Sơn Hà — phần dùng chung: menu, đường dẫn tài nguyên game, nút chép lời nhắc.
(function () {
  /** Tài nguyên đọc thẳng từ thư mục game (không chép), nên trang luôn thấy bản mới nhất. */
  const ASSET = '../../client/designs/tu-tien-son-ha/assets/';
  const TRANG = [
    ['index.html', 'Tổng quan'],
    ['tai-nguyen.html', 'Danh mục tài nguyên'],
    ['kich-ban.html', 'Kịch bản vận hành'],
    ['san-xuat.html', 'Quy trình sản xuất'],
    ['tai-dung.html', 'Dựng game mới'],
  ];
  const tep = location.pathname.split('/').pop() || 'index.html';
  const dau = document.getElementById('dau');
  if (dau) {
    dau.innerHTML =
      '<nav><a class="logo" href="index.html">⛰🌊 Xưởng Sơn Hà</a>' +
      TRANG.map(([h, t]) => `<a class="muc${h === tep ? ' dang' : ''}" href="${h}">${t}</a>`).join('') +
      '</nav>';
  }
  const chan = document.getElementById('chan');
  if (chan) {
    const luc = window.XUONG ? new Date(window.XUONG.luc).toLocaleString('vi-VN') : '—';
    chan.innerHTML = `Bản thiết kế sản xuất hình động · phòng live Sơn Hà Tiên Lộ · dữ liệu xuất lúc ${luc} (<code>node web/xuong-son-ha/cong-cu/xuat-du-lieu.mjs</code>)`;
  }

  // Nút "Chép" cho mọi khối lời nhắc.
  document.querySelectorAll('.loi-nhac').forEach((k) => {
    const b = document.createElement('button');
    b.className = 'chep';
    b.type = 'button';
    b.textContent = 'Chép';
    b.onclick = async () => {
      const chu = [...k.childNodes].filter((n) => !(n instanceof HTMLElement && (n.classList.contains('chep') || n.classList.contains('nguon')))).map((n) => n.textContent).join('').trim();
      try {
        await navigator.clipboard.writeText(chu);
        b.textContent = 'Đã chép ✓';
      } catch {
        b.textContent = 'Không chép được';
      }
      setTimeout(() => (b.textContent = 'Chép'), 1600);
    };
    k.append(b);
  });

  const h = (the, thuocTinh = {}, ...con) => {
    const e = document.createElement(the);
    for (const [k, v] of Object.entries(thuocTinh)) {
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      // Video tự phát phải tắt tiếng bằng THUỘC TÍNH (setAttribute('muted') không đủ, trình duyệt chặn autoplay).
      else if (k === 'muted') e.muted = e.defaultMuted = !!v;
      else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of con.flat()) if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return e;
  };
  const nhan = (co, chuCo = 'có', chuChua = 'chưa') => h('span', { class: `nhan ${co ? 'co' : 'chua'}` }, co ? chuCo : chuChua);
  window.XUONG_UI = { ASSET, h, nhan, a: (p) => ASSET + p };
})();
