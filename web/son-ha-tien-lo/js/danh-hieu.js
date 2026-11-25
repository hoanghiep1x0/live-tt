/* Bảng nhãn DANH HIỆU Sơn Hà Tiên Lộ — dữ liệu cho trang Xếp hạng.
   Mỗi BỘ là một đường để người chơi được vinh danh; mỗi bộ nhiều CẤP (mốc → tên nhãn).
   trangThai: 'co' đã chạy trong game · 'de-xuat' đề xuất, game chưa đếm (cần thêm bộ đếm vào sổ hồ sơ).
   Thêm bộ mới = thêm một mục vào BO; thêm cấp = thêm một dòng vào `cap`. Tên nhãn theo chất Văn Lang – Đông Sơn
   (Lạc hầu, Lạc tướng là chức thời Hùng Vương), không dùng chức tước Trung Hoa.
   Nguyên tắc (Kinh Thư §2.7, Bản đồ §3c): danh hiệu chủ yếu là TÊN TUỔI — khung tên, màu chữ, hào quang, chỗ ngồi;
   nếu có thưởng sức mạnh thì rất nhỏ và không vượt cảnh giới. */
(function () {
  'use strict';
  /* Màu theo bậc độ hiếm, dùng lại cho mọi bộ: đồng → bạc → vàng → ngọc → lam → tím → hồng → đỏ → cầu vồng */
  var MAU = ['#b98a5a', '#c9d1d9', '#ffd24c', '#5fe0a0', '#5fb0ff', '#c77dff', '#ff7ac8', '#ff6a4c', 'cau-vong'];

  var BO = [
    {
      id: 'luc', ten: 'Lực chiến', bt: '⚔️', trangThai: 'de-xuat', don: 'lực chiến',
      mo: 'Theo lực chiến hiện tại (cảnh giới + trang bị + công pháp + linh thú). Lên đồ, học võ, đổi linh thú là nhảy nhãn.',
      tien: 'Thúc người chơi mua công pháp, linh thú, đan trận bằng linh thạch — mà linh thạch nhanh nhất là từ quà.',
      cap: [[50, 'Tân Đệ Tử'], [100, 'Lạc Dân'], [150, 'Lạc Binh'], [200, 'Thập Trưởng'], [300, 'Bách Trưởng'], [400, 'Lạc Tướng'], [500, 'Lạc Hầu'],
        [650, 'Trấn Ải'], [800, 'Phá Trận'], [1000, 'Trấn Sơn Hà'], [1250, 'Kình Thiên'], [1500, 'Đạp Lũ'], [1800, 'Dời Non'], [2200, 'Lấp Biển'],
        [2700, 'Thiên Hạ Vô Song'], [3300, 'Sơn Hà Đệ Nhất']]
    },
    {
      id: 'huong-hoa', ten: 'Hương Hỏa', bt: '🪔', trangThai: 'de-xuat', don: 'xu quà tích lũy',
      mo: 'Tổng quà mọi buổi (mở rộng từ "Tiên Duyên" 9 bậc trong tài liệu quà). Mỗi bậc một khung tên và vòng hào quang riêng; nhận thêm linh khí rất nhỏ (+1% … +9%).',
      tien: 'Đường chính để người tặng nhiều thấy mình khác người: tên vàng, khung riêng, ngồi ngai Cung Phụng.',
      cap: [[10, 'Thắp Nén Hương'], [50, 'Dâng Bó Hoa'], [100, 'Dâng Mâm Lễ'], [200, 'Hương Chủ'], [500, 'Thí Chủ Đồng'], [1000, 'Thí Chủ Bạc'],
        [2000, 'Thí Chủ Vàng'], [3000, 'Lạc Hầu Hương Hỏa'], [5000, 'Lạc Tướng Hương Hỏa'], [10000, 'Thượng Khách Tản Viên · Long Cung'],
        [20000, 'Phò Mã · Công Chúa Văn Lang'], [30000, 'Quốc Khách Văn Lang'], [50000, 'Hộ Quốc Đại Thí Chủ'], [100000, 'Thiên Đình Ghi Danh'],
        [200000, 'Ngọc Phả Lưu Danh'], [500000, 'Bất Tử Hương Hỏa']]
    },
    {
      id: 'cung-phung', ten: 'Cung Phụng', bt: '👑', trangThai: 'co', don: 'hạng quà trong buổi',
      mo: 'Ba người tặng nhiều nhất buổi live hiện trên thẻ Cung Phụng; người đứng đầu ngồi ngai Cung Phụng cạnh Chưởng Môn.',
      tien: 'Cạnh tranh trong buổi — hạng đổi liên tục nên người ta tặng để giữ ngôi.',
      cap: [[3, 'Cung Phụng Hạng Ba'], [2, 'Cung Phụng Hạng Nhì'], [1, 'Đệ Nhất Cung Phụng']]
    },
    {
      id: 'chuc', ten: 'Chức vụ tông môn', bt: '🏯', trangThai: 'co', don: 'cảnh giới',
      mo: 'Theo cảnh giới, mỗi tông một bộ tên (Sơn Tông môn phái trên núi, Thủy Tông triều đình Long Cung). Từ Chấp sự có biển chức trên đầu.',
      cap: [[0, 'Tạp dịch · Thủy dịch'], [1, 'Ngoại môn · Thủy binh'], [2, 'Nội môn · Thủy vệ'], [3, 'Chân truyền · Đô thống'], [4, 'Chấp sự · Tuần hải sứ'],
        [5, 'Trưởng lão · Thủy tướng'], [6, 'Đại trưởng lão · Thừa tướng'], [7, 'Hộ sơn · Trấn hải tôn giả'], [8, 'Thái thượng'], [9, 'Lão tổ']]
    },
    {
      id: 'ghe', ten: 'Ghế đầu tông', bt: '🪑', trangThai: 'co', don: 'thứ hạng trong tông',
      mo: 'Người đứng đầu theo cảnh giới rồi lực chiến ngồi đỉnh kim tự tháp; người đứng đầu thật (không phải trưởng lão NPC) ngồi ngai đồng.',
      cap: [[7, 'Tứ Trấn Ba Vì · Tứ Tuần'], [3, 'Tả · Hữu Hộ Pháp'], [1, 'Chưởng Môn · Long Soái']]
    },
    {
      id: 'loi-dai', ten: 'Lôi Đài', bt: '🏯', trangThai: 'co', don: 'hạng Top Lôi Đài',
      mo: 'Top 8 mỗi tông. Khiêu chiến bằng đúng món quà của hạng đó; thắng cùng cảnh giới thì lên hạng.',
      tien: 'Mỗi lời khiêu chiến là một món quà; hạng càng cao quà càng lớn.',
      cap: [[8, 'Hạng 8 Lôi Đài'], [5, 'Hạng 5 Lôi Đài'], [3, 'Tam Kiệt Lôi Đài'], [2, 'Á Quân Lôi Đài'], [1, 'Lôi Đài Chi Chủ']]
    },
    {
      id: 'diet-yeu', ten: 'Diệt Yêu', bt: '👹', trangThai: 'de-xuat', don: 'lần hạ yêu tinh (có ra tay)',
      mo: 'Đếm số trận yêu tinh bị hạ mà mình có ra tay; thêm nhãn riêng cho người kết liễu từng con.',
      tien: 'Quà trong trận yêu tinh ra đòn chí mạng và cứu viện — người săn nhãn sẽ tặng để kết liễu.',
      cap: [[1, 'Lần Đầu Diệt Yêu'], [5, 'Thợ Săn Yêu'], [10, 'Trừ Yêu Sư'], [25, 'Khắc Tinh Yêu Tà'], [50, 'Diệt Yêu Tướng'], [100, 'Trảm Yêu Vương'],
        [200, 'Phong Ấn Sư'], [500, 'Truyền Nhân Lạc Long Quân']],
      phu: 'Nhãn kết liễu riêng: Khắc Tinh Ngư Tinh · Khắc Tinh Hồ Tinh · Khắc Tinh Mộc Tinh · Chém Chằn · Bắn Bàng · Đả Hổ · Phá Giải · Trảm Tam Yêu'
    },
    {
      id: 'ho-phap', ten: 'Hộ Pháp', bt: '⚡', trangThai: 'de-xuat', don: 'lần hộ pháp độ kiếp',
      mo: 'Đếm số lần đứng ra che sét cho đồng đạo độ kiếp.',
      cap: [[10, 'Người Che Sét'], [50, 'Hộ Pháp Đồng Môn'], [100, 'Kim Cương Hộ Pháp'], [300, 'Lôi Thần Hộ Vệ'], [1000, 'Thiên Lôi Bất Động']]
    },
    {
      id: 'dai-chien', ten: 'Đại Chiến', bt: '🌊', trangThai: 'de-xuat', don: 'mùa lũ thắng (đã ra tay)',
      mo: 'Đếm số Đại Chiến tông thắng mà mình có ra tay; thêm nhãn khi làm Tiên Phong, đầu công trạng phe.',
      tien: 'Quà ra chiêu trong trận (Liên Kích, Trận Pháp, Tuyệt Kỹ) và Tử chiến ×2 điểm.',
      cap: [[1, 'Lính Mùa Lũ'], [5, 'Dũng Sĩ'], [10, 'Tiên Phong'], [25, 'Dũng Tướng'], [50, 'Đại Tướng Mùa Lũ'], [100, 'Chiến Thần Sơn Hà']],
      phu: 'Nhãn trận: Tiên Phong · Đầu Công Trạng · Người Hi Sinh · Người Lật Kèo'
    },
    {
      id: 'chuyen-can', ten: 'Chuyên Cần', bt: '📅', trangThai: 'de-xuat', don: 'ngày có mặt liên tiếp',
      mo: 'Mỗi ngày vào live và tu luyện được ít nhất một lần thì chuỗi tăng; bỏ một ngày thì về 0 (có đan "giữ chuỗi" bán bằng linh thạch).',
      tien: 'Giữ người quay lại hằng ngày; đan giữ chuỗi là một chỗ tiêu linh thạch.',
      cap: [[3, 'Ba Ngày Không Nghỉ'], [7, 'Tuần Tu'], [14, 'Nửa Tháng Bế Quan'], [30, 'Tháng Tu'], [60, 'Bền Như Núi'], [100, 'Trăm Ngày Đắc Đạo'], [365, 'Một Năm Như Một']]
    },
    {
      id: 'tim', ten: 'Lòng Thành', bt: '❤️', trangThai: 'de-xuat', don: 'tim tích lũy',
      mo: 'Tổng tim đã thả mọi buổi. Cho người không tặng quà vẫn có đường lên nhãn.',
      cap: [[1000, 'Lòng Thành'], [5000, 'Tâm Như Lửa'], [10000, 'Vạn Tim'], [50000, 'Tim Nghiêng Sơn Hà'], [100000, 'Bách Vạn Thành Tâm']]
    },
    {
      id: 'dac-biet', ten: 'Đặc biệt', bt: '🌟', trangThai: 'de-xuat', don: 'sự kiện',
      mo: 'Nhãn một-lần, không bao giờ có lại — giá trị sưu tầm cao.',
      cap: [[1, 'Đồ Đệ Đời Đầu (vào tông tháng đầu)'], [1, 'Khai Thiên (người đầu tiên lên Bất Tử)'], [1, 'Công Thần Năm (góp nhiều nhất năm tông thắng)'],
        [1, 'Đại Yêu Dạ Tam Kiệt'], [1, 'Người Mở Rương Thiên Phẩm']]
    }
  ];

  function mau(i, n) { var j = Math.min(MAU.length - 1, Math.round((i / Math.max(1, n - 1)) * (MAU.length - 1))); return MAU[j]; }
  function nhan(ten, m, them) {
    return '<span class="nhan-dh' + (m === 'cau-vong' ? ' cau-vong' : '') + '"' + (m === 'cau-vong' ? '' : ' style="--m:' + m + '"') + '>' + (them || '') + ten + '</span>';
  }
  /* Nhãn lực chiến của một người (dùng trên bảng xếp hạng) */
  function nhanLuc(luc) {
    var b = BO[0], idx = -1;
    b.cap.forEach(function (c, i) { if (luc >= c[0]) idx = i; });
    return idx < 0 ? '' : nhan(b.cap[idx][1], mau(idx, b.cap.length));
  }
  function veBo(hop, tabHop) {
    tabHop.innerHTML = BO.map(function (b, i) { return '<button data-i="' + i + '" class="' + (b.trangThai === 'co' ? '' : 'sap') + '">' + b.bt + ' ' + b.ten + '</button>'; }).join('');
    function chon(i) {
      var b = BO[i];
      tabHop.querySelectorAll('button').forEach(function (x, j) { x.classList.toggle('dang', j === i); });
      hop.innerHTML = '<div class="the kho-the"><div class="kho-dau"><h3 class="tieu-game">' + b.bt + ' ' + b.ten + '</h3>' +
        (b.trangThai === 'co' ? '<span class="nhan son">✅ đã có trong game</span>' : '<span class="nhan sap">💡 đề xuất</span>') +
        ' <span class="nhan">' + b.cap.length + ' cấp · theo ' + b.don + '</span></div><p>' + b.mo + '</p>' +
        (b.tien ? '<p class="co-bang">🎁 <b>Quà / linh thạch:</b> ' + b.tien + '</p>' : '') +
        '<div class="thang-nhan">' + b.cap.map(function (c, k) {
          return '<div><small>' + (b.id === 'dac-biet' ? 'một lần' : (typeof c[0] === 'number' ? c[0].toLocaleString('vi-VN') : c[0])) + '</small>' + nhan(c[1], mau(k, b.cap.length)) + '</div>';
        }).join('') + '</div>' + (b.phu ? '<p class="ghi">' + b.phu + '</p>' : '') + '</div>';
    }
    tabHop.querySelectorAll('button').forEach(function (x) { x.onclick = function () { chon(+x.dataset.i); }; });
    chon(0);
  }
  window.SHTL_DH = { BO: BO, nhanLuc: nhanLuc, nhan: nhan, veBo: veBo, tongCap: BO.reduce(function (s, b) { return s + b.cap.length; }, 0) };
})();
