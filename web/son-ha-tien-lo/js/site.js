/* Sơn Hà Tiên Lộ — dữ liệu chung + thanh trên + chân trang. Không cần build, mở thẳng tệp HTML là chạy. */
(function () {
  'use strict';

  /* ===== Mục lục: thêm chương mới = thêm một dòng ở đây + một tệp chuong/NN.js (xem README) ===== */
  var MUC_LUC = [
    {
      so: 0, ten: 'Ngọc Phả khai quyển', phu: 'Tiền truyện',
      mo: 'Chuyện từ thuở Lạc Long Quân trấn yêu tới ngày Thiên Đình đặt lệ cho hai vị thần — gốc rễ của mọi luật lệ ở Sơn Hà.',
      chuong: [
        { so: 1, ten: 'Ba yêu và một khối sắt', tom: 'Lạc Long Quân diệt Ngư Tinh, Hồ Tinh, Mộc Tinh — nhưng oán khí thì không chết.', anh: 'anh/chuong/01.webp', co: true },
        { so: 2, ten: 'Sính lễ chín ngà', tom: 'Vua Hùng kén rể. Một vị thần đến trước, một vị thần đến muộn một bước chân.', anh: 'anh/chuong/02.webp', co: true },
        { so: 3, ten: 'Lệ của Trời', tom: 'Trận lũ đầu tiên, và cái lệ khiến hai vị thần phải đi thu đồ đệ.', anh: 'anh/chuong/03.webp', co: true },
        { so: 4, ten: 'Lò đồng dưới lũ', tom: 'Lò đúc đồng của các vua Hùng chìm dưới phù sa — và cửa hang chỉ mở khi nước rút.', anh: 'anh/chuong/04.webp', co: true }
      ]
    },
    {
      so: 1, ten: 'Phàm nhân', phu: 'Quyển một',
      mo: 'Ba nghìn năm sau. Phong ấn yếu dần, hai tông mở cửa nhận người thường. Một cậu bé đốn củi và một cô gái làng chài bước lên tiên lộ.',
      chuong: [
        { so: 5, ten: 'Mặt hồ sủi tăm', tom: 'Rừng Phong Châu rỉ sương xanh, Biển Đông cuộn đen. Hai vị thần cùng mở cửa.', anh: 'anh/chuong/05.webp', co: true },
        { so: 6, ten: 'Dưới Sảnh Thiên Vấn', tom: 'Phàm nhân đứng hàng cuối, nghe Ngọc Phả hỏi — và được trả lời.', anh: 'anh/chuong/06.webp', co: true },
        { so: 7, ten: 'Ải hai cửa', tom: 'Mê cung soi gương. Mỗi cửa chỉ mở cho người đã chọn nó.', anh: 'anh/chuong/07.webp', co: true },
        { so: 8, ten: 'Tụ Linh Trận', tom: 'Ghế dưới cùng của kim tự tháp, và dòng linh khí nối người với người.', anh: 'anh/chuong/08.webp', co: true }
      ]
    },
    {
      so: 2, ten: 'Trăm đường tu', phu: 'Quyển hai',
      mo: 'Tu tiên không chỉ ngồi luận đạo. Hái linh thảo, luyện đan, tự bước qua cửa đột phá, và lần đầu đứng dưới sét.',
      chuong: [
        { so: 9, ten: 'Linh Chi Ngàn Năm', tom: 'Vận công, hái linh thảo, Cơ Duyên Giáng Thế; viên linh thạch đầu tiên.', anh: 'anh/nen/son.webp', co: true },
        { so: 10, ten: 'Tự bước qua cửa', tom: 'Trời chỉ chứng cho người tự bước qua cửa. Trúc Cơ, Kết Đan; đổi áo, đổi ghế.', anh: 'anh/chuong/08.webp', co: true },
        { so: 11, ten: 'Sét trên mặt trống', tom: 'Lôi kiếp Nguyên Anh của Tre. Cả tông đứng ra hộ pháp; cánh hoa vàng rơi.', anh: 'anh/nen/kiep.webp', co: true },
        { so: 12, ten: 'Lôi đài đồng môn', tom: 'Ngần dâng lễ khiêu chiến sư tỉ. Thua không mất gì — chỉ mất mặt một chút.', anh: 'anh/nen/thuy.webp', co: true }
      ]
    },
    {
      so: 3, ten: 'Một năm ở Sơn Hà', phu: 'Quyển ba',
      mo: 'Một năm trọn vẹn, đúng như một giờ trong phòng live: mùa lũ, nước rút, chợ phiên, yêu tinh, Thiên Đình ghi công.',
      chuong: [
        { so: 13, ten: 'Mùa lũ', tom: 'Đại Chiến của đồ đệ: Chủ Tướng, trận khí, bốn trận pháp, thần binh.', anh: 'anh/nen/lu.webp', co: true },
        { so: 14, ten: 'Nước rút', tom: 'Tranh Đoạt Bảo Vật trong Địa Cung Đồng Cổ.', anh: 'anh/chuong/04.webp', co: true },
        { so: 15, ten: 'Chợ không gươm', tom: 'Thành Trì Tự Do: Đan Các, Tàng Kinh Các, một chiêu hai dáng.', anh: 'anh/nen/cho.webp', co: true },
        { so: 16, ten: 'Hai tông gác thù', tom: 'Ngư Tinh trồi lên. Tim là linh dược; linh vật thần ban.', anh: 'anh/nen/sanh.webp', co: true },
        { so: 17, ten: 'Thiên Đình ghi công', tom: 'Hết năm. Nước dâng hay núi cao?', anh: 'anh/bia.webp', co: true }
      ]
    },
    {
      so: 4, ten: 'Bảy yêu', phu: 'Quyển bốn',
      mo: 'Oán khí rò ra đánh thức cả những yêu đời sau. Mỗi con một cách đánh, mỗi con khắc một tông.',
      chuong: [
        { so: 18, ten: 'Hồ Tây đêm trăng', tom: 'Hồ Tinh chín đuôi — con yêu sợ nước.' },
        { so: 19, ten: 'Rễ nghìn năm', tom: 'Mộc Tinh, con yêu không ai khắc.' },
        { so: 20, ten: 'Chằn Tinh hang núi', tom: 'Con trăn từng gục dưới lưỡi rìu.' },
        { so: 21, ten: 'Cánh đồng thau', tom: 'Đại Bàng Tinh và cơn giông trên đỉnh núi.' },
        { so: 22, ten: 'Ông Ba Mươi', tom: 'Hổ Tinh rừng thiêng — hổ sợ nước.' },
        { so: 23, ten: 'Mai đá biển sâu', tom: 'Giải Tinh và bọt độc tím.' },
        { so: 24, ten: 'Đại Yêu Dạ', tom: 'Ba oán khí hợp một: Tam Yêu Hợp Thể.' }
      ]
    },
    {
      so: 5, ten: 'Tiên lộ', phu: 'Quyển năm',
      mo: 'Từ Hóa Thần tới Bất Tử. Đỉnh tháp, ngai đồng, và lời hẹn mùa lũ năm sau.',
      chuong: [
        { so: 25, ten: 'Trưởng lão', tom: 'Hóa Thần, Luyện Hư — những người đã ngồi trên ghế viền vàng.' },
        { so: 26, ten: 'Chưởng Môn và Long Soái', tom: 'Đỉnh kim tự tháp, ngai đồng, và gánh nặng của người đứng đầu.' },
        { so: 27, ten: 'Sơn Hà Đại Trận', tom: 'Trận tu luyện năm cấp — hương hỏa của cả tông.' },
        { so: 28, ten: 'Sánh vai Tứ Bất Tử', tom: 'Bậc thứ mười của Thang Trời. Và mùa lũ năm sau vẫn đến.' }
      ]
    }
  ];

  var CANH_GIOI = [
    { ten: 'Phàm Nhân', can: 0, hoPhap: 0, hao: '#c9c2b8', son: 'Tạp dịch', thuy: 'Thủy dịch', tranh: 0 },
    { ten: 'Luyện Khí', can: 30, hoPhap: 0, hao: '#9ad17a', son: 'Ngoại môn', thuy: 'Thủy binh', tranh: 1 },
    { ten: 'Trúc Cơ', can: 90, hoPhap: 0, hao: '#4fc3a1', son: 'Nội môn', thuy: 'Thủy vệ', tranh: 1 },
    { ten: 'Kết Đan', can: 200, hoPhap: 0, hao: '#58a6ff', son: 'Chân truyền', thuy: 'Đô thống', tranh: 1 },
    { ten: 'Nguyên Anh', can: 360, hoPhap: 3, hao: '#8f7bff', son: 'Chấp sự', thuy: 'Tuần hải sứ', tranh: 4 },
    { ten: 'Hóa Thần', can: 600, hoPhap: 4, hao: '#c86bff', son: 'Trưởng lão', thuy: 'Thủy tướng', tranh: 4 },
    { ten: 'Luyện Hư', can: 950, hoPhap: 5, hao: '#ff6bb5', son: 'Đại trưởng lão', thuy: 'Thừa tướng', tranh: 6 },
    { ten: 'Đại Thừa', can: 1450, hoPhap: 6, hao: '#ff8a4c', son: 'Hộ sơn tôn giả', thuy: 'Trấn hải tôn giả', tranh: 6 },
    { ten: 'Chân Tiên', can: 2150, hoPhap: 7, hao: '#ffd24c', son: 'Thái thượng', thuy: 'Thái thượng', tranh: 9 },
    { ten: 'Bất Tử', can: 3100, hoPhap: 8, hao: '#fff6c8', son: 'Lão tổ', thuy: 'Lão tổ', tranh: 9 }
  ];

  var YEU = [
    { id: 'ngu', ten: 'Ngư Tinh', noi: 'Biển Đông', khac: 'son', ta: 'Cá khổng lồ vảy xanh đen, miệng còn vết cháy của khối sắt nung năm xưa.', chieu: 'Sóng Thần Nuốt Thuyền · Vảy Thép Hộ Thân · Xoáy Nước Hút Hồn' },
    { id: 'ho', ten: 'Hồ Tinh chín đuôi', noi: 'Đáy Hồ Tây', khac: 'thuy', ta: 'Cáo trắng chín đuôi, mắt tím. Hang cũ bị nước phá nên sợ nước.', chieu: 'Mê Hồn Nhãn · Cửu Vĩ Hồ Hỏa · Hút Tinh Khí' },
    { id: 'moc', ten: 'Mộc Tinh', noi: 'Rừng già Phong Châu', khac: '', ta: 'Cây chiên đàn nghìn năm. Rễ quấn chân, đòn đánh trượt. Không tông nào khắc.', chieu: 'Rễ Cổ Trói Chân · Vỏ Gỗ Nghìn Năm · Thân Gỗ Đè Núi' },
    { id: 'chan', ten: 'Chằn Tinh', noi: 'Hang núi', khac: 'son', ta: 'Trăn khổng lồ từng gục dưới lưỡi rìu. Sợ rìu đồng Sơn Tông.', chieu: 'Quật Đuôi Đổ Núi · Phun Độc Mù Trời · Lột Xác Hồi Sinh' },
    { id: 'bang', ten: 'Đại Bàng Tinh', noi: 'Mây giông', khac: '', ta: 'Chim cắp người, bay cao né đòn. Không tông nào khắc.', chieu: 'Bão Cánh Cuốn Trời · Lông Sắt Hộ Thân · Tiếng Rít Xé Hồn' },
    { id: 'cop', ten: 'Hổ Tinh', noi: 'Rừng thiêng', khac: 'thuy', ta: 'Ông Ba Mươi thành tinh. Hổ sợ nước — Thủy Tông đánh đau.', chieu: 'Gầm Rung Núi Rừng · Hổ Uy Hộ Thể · Uống Máu Hồi Sức' },
    { id: 'giai', ten: 'Giải Tinh', noi: 'Biển sâu', khac: 'son', ta: 'Cua khổng lồ, mai như đá — chỉ đá núi đập vỡ.', chieu: 'Càng Thép Quét Ngang · Mai Đá Bất Hoại · Bọt Độc Mê Man' },
    { id: 'tam', ten: 'Tam Yêu Hợp Thể', noi: 'Đại Yêu Dạ', khac: '', ta: 'Ba oán khí hợp làm một. Chỉ xuất hiện trong Đại Yêu Dạ.', chieu: 'Tam Yêu Loạn Kích · Vạn Yêu Hộ Thể · Hắc Thủy Hút Hồn' }
  ];

  /* Ảnh chụp thật các màn trong phòng live (bản chơi thử của game, anh/man/) */
  var MAN = [
    { id: 'nhap-mon', ten: 'Thử Thách Nhập Môn', phut: ':00', go: '{1} Nam Sơn · {2} Nữ Sơn · {3} Nam Thủy · {4} Nữ Thủy', chuong: 7 },
    { id: 'nhap-mon-di', ten: 'Đi tới cửa tông', phut: ':00', go: '{1} lên · {2} xuống · {3} trái · {4} phải', chuong: 7 },
    { id: 'tu-luyen-son', ten: 'Tu luyện · Sơn Tông', phut: 'suốt giờ', go: '{A} {B} {C} trả lời · {1}–{8} chơi nhanh', chuong: 8 },
    { id: 'tu-luyen-thuy', ten: 'Tu luyện · Thủy Tông', phut: 'suốt giờ', go: '{A} {B} {C} · {5} đột phá', chuong: 8 },
    { id: 'do-kiep', ten: 'Độ Kiếp', phut: 'khi có người', go: '{1} {2} {3} hay {độ} để hộ pháp', chuong: 11 },
    { id: 'dai-chien', ten: 'Đại Chiến mùa lũ', phut: ':15', go: 'bình luận tiếp sức · tim bạo kích', chuong: 13 },
    { id: 'dai-chien-go', ten: 'Góp sức cho tông', phut: ':15', go: '{1} Công {2} Thủ {3} Hồi {4} Phá', chuong: 13 },
    { id: 'dia-cung', ten: 'Tranh Đoạt Bảo Vật', phut: ':25 · :55', go: '{1} lên · {2} xuống · {3} trái · {4} phải', chuong: 14 },
    { id: 'thanh-tri', ten: 'Thành Trì Tự Do', phut: ':30', go: '{D1}–{D9} mua đan · {C1}–{C9} học chiêu', chuong: 15 },
    { id: 'yeu-tinh', ten: 'Tiêu Diệt Quái Thú', phut: ':45', go: '{5} đánh · chiêu lớn thì gõ đúng số đỡ', chuong: 16 },
    { id: 'tong-ket', ten: 'Tổng kết năm', phut: ':58', go: 'xem phe nào thắng năm', chuong: 17 }
  ];

  /* Kênh live: điền khi có (để trống thì trang hiện "đang cập nhật"). */
  var LIVE = { tiktok: '', ten: '', gio: '' };

  function tatCaChuong() {
    var ds = [];
    MUC_LUC.forEach(function (q) { q.chuong.forEach(function (c) { ds.push(Object.assign({ quyen: q }, c)); }); });
    return ds;
  }

  /* ===== Hoa văn mặt trời trống đồng (SVG) ===== */
  function trongDong(canh) {
    canh = canh || 14;
    var tia = '';
    var nua = Math.PI / canh;
    function d(r, g) { return (50 + r * Math.cos(g)).toFixed(1) + ' ' + (50 + r * Math.sin(g)).toFixed(1); }
    for (var i = 0; i < canh; i++) {
      var a = (i / canh) * Math.PI * 2;
      tia += 'M' + d(11, a - nua) + 'L' + d(32, a) + 'L' + d(11, a + nua) + 'Z';
    }
    return '<svg class="trong" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2">' +
      '<circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="38" stroke-dasharray="3 3"/></g>' +
      '<path d="' + tia + '" fill="currentColor"/><circle cx="50" cy="50" r="9" fill="currentColor"/></svg>';
  }

  /* ===== Thanh trên + chân trang ===== */
  var MENU = [
    ['index.html', '🏯', 'Trang chủ'],
    ['muc-luc.html', '📜', 'Mục lục'],
    ['nhan-vat.html', '🧘', 'Nhân vật'],
    ['the-gioi.html', '⛰️', 'Thế giới'],
    ['tang-bao.html', '💎', 'Tàng Bảo Các'],
    ['xep-hang.html', '🏆', 'Xếp hạng'],
    ['choi.html', '🎮', 'Vào live chơi', 'noi']
  ];
  function veKhung() {
    var trang = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (trang === 'doc.html') trang = 'muc-luc.html';
    var dau = document.getElementById('dau');
    if (dau) {
      dau.className = 'dau';
      dau.innerHTML = '<div class="khung"><a class="logo" href="index.html">' + trongDong() + 'Sơn Hà Tiên Lộ</a>' +
        '<button class="nut-menu" aria-label="Mở menu" aria-expanded="false">☰</button><nav class="menu">' +
        MENU.map(function (m) {
          return '<a href="' + m[0] + '" class="' + (m[3] || '') + (m[0] === trang ? ' dang' : '') + '"><span class="bt">' + m[1] + '</span>' + m[2] + '</a>';
        }).join('') + '</nav></div>';
      var nut = dau.querySelector('.nut-menu'), menu = dau.querySelector('.menu');
      nut.addEventListener('click', function () {
        var mo = menu.classList.toggle('mo');
        nut.setAttribute('aria-expanded', mo ? 'true' : 'false');
        nut.textContent = mo ? '✕' : '☰';
      });
    }
    var chan = document.getElementById('chan');
    if (chan) {
      chan.className = 'chan';
      chan.innerHTML = '<div class="khung"><div class="vach">' + trongDong() + '</div>' +
        '<p><b>Sơn Hà Tiên Lộ</b> — truyện của thế giới game tu tiên chơi bằng bình luận trên TikTok LIVE.</p>' +
        '<p>Truyện dựa trên truyền thuyết dân gian Việt Nam (Sơn Tinh – Thủy Tinh, Lạc Long Quân diệt yêu); phần nào là lệ riêng của Sơn Hà thì truyện tự đặt. ' +
        'Trò chơi giả tưởng, vật phẩm trong game không quy đổi tiền thật.</p>' +
        '<p><a href="muc-luc.html">Mục lục</a> · <a href="nhan-vat.html">Nhân vật</a> · <a href="the-gioi.html">Thế giới</a> · <a href="choi.html">Cách vào live chơi</a></p></div>';
    }
  }

  /* ===== Chữ chương: một định dạng nhỏ, dễ viết =====
     dòng trống = sang đoạn · "> " = trích · "---" = ngắt cảnh · "[[anh/..|chú thích]]" = tranh
     *nghiêng* · **đậm** · {lệnh gõ} */
  function dinhDang(chu) {
    function dong(s) {
      return s
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\{(.+?)\}/g, '<kbd>$1</kbd>');
    }
    var khoi = chu.replace(/\r/g, '').trim().split(/\n\s*\n/);
    var dau = true;
    return khoi.map(function (k) {
      k = k.trim();
      if (k === '---') return '<hr>';
      var t = k.match(/^\[\[(.+?)\|(.*?)\]\]$/);
      if (t) return '<figure><img src="' + t[1] + '" alt="' + dong(t[2]) + '" loading="lazy"><figcaption>' + dong(t[2]) + '</figcaption></figure>';
      if (/^>\s?/.test(k)) return '<blockquote>' + k.split('\n').map(function (l) { return dong(l.replace(/^>\s?/, '')); }).join('<br>') + '</blockquote>';
      var html = dong(k.replace(/\n/g, ' '));
      if (dau) { dau = false; return '<p class="mo-dau">' + html + '</p>'; }
      return '<p>' + html + '</p>';
    }).join('\n');
  }

  function veMan(m) {
    var go = m.go.replace(/\{(.+?)\}/g, '<kbd>$1</kbd>');
    return '<figure><div class="khung-dt"><img src="anh/man/' + m.id + '.webp" alt="Màn ' + m.ten + ' trong phòng live" loading="lazy"></div>' +
      '<figcaption>' + m.ten + '<small>' + m.phut + ' · ' + go + '</small></figcaption></figure>';
  }

  function docLuu(khoa, macDinh) {
    try { var v = localStorage.getItem('shtl.' + khoa); return v === null ? macDinh : JSON.parse(v); } catch (e) { return macDinh; }
  }
  function ghiLuu(khoa, v) {
    try { localStorage.setItem('shtl.' + khoa, JSON.stringify(v)); } catch (e) { /* bỏ qua */ }
  }

  window.SHTL = {
    MUC_LUC: MUC_LUC, CANH_GIOI: CANH_GIOI, YEU: YEU, LIVE: LIVE, MAN: MAN, veMan: veMan,
    tatCaChuong: tatCaChuong, trongDong: trongDong, dinhDang: dinhDang, docLuu: docLuu, ghiLuu: ghiLuu
  };
  /* Hiện dần khi cuộn tới (thẻ, khối) */
  function hienDan() {
    var ds = document.querySelectorAll('.the, .the-chuong, .quyen, .dia-danh, .tong, .man-live figure, .moc');
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('da-hien'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -40px 0px' });
    ds.forEach(function (el) {
      if (el.getBoundingClientRect().top < innerHeight) return;
      el.classList.add('hien-dan'); io.observe(el);
    });
  }
  function batDau() { veKhung(); setTimeout(hienDan, 60); }
  window.SHTL.hienDan = hienDan;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', batDau); else batDau();
})();
