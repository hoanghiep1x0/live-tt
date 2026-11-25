/* Kho đồ Sơn Hà Tiên Lộ — DỮ LIỆU cho trang Tàng Bảo Các.
   Thêm một loại đồ mới (cánh, thú cưỡi, pháp bảo…) = thêm một mục vào KHO; thêm món = thêm một dòng vào `dong`.
   trangThai: 'co' (đã chạy trong game) · 'sap' (đang thiết kế — chưa có luật cuối, ghi "dự kiến").
   co: cách có — 'thach' linh thạch · 'qua' quà · 'nhat' nhặt (Ải, Địa Cung) · 'yeu' diệt yêu · 'chien' Đại Chiến · 'mach' Linh Mạch của phe.
   Số liệu phải khớp game: docs/phong/tu-tien/ban-do.md §3c–§3d, §4; co-che-qua.md. */
(function () {
  'use strict';
  var NGUON = {
    thach: '💎 linh thạch', qua: '🎁 quà', nhat: '🏺 nhặt', yeu: '👹 diệt yêu', chien: '⚔️ Đại Chiến', mach: '💠 Linh Mạch', canh: '⚡ cảnh giới'
  };


  /* Kho biến thể trang bị: mỗi tông × mỗi phẩm một "popup" 9 món = 3 binh khí, 3 giáp y, 3 bảo vật (biến thể a, b, c).
     Biến thể a là mã B1…V5 trong bảng; b, c vẽ thêm để người chơi không mặc giống hệt nhau. Cùng ô, cùng phẩm thì cùng chỉ số;
     binh khí cùng phẩm cùng loại (cung / lao / rìu…) nên dùng chung một hình chiêu. Ảnh: anh/vp/<mã>-<son|thuy>.webp,
     bản gốc + tờ lưới: tranh-goc/trang-bi-son/, trang-bi-thuy/, chieu-son/, chieu-thuy/; lời nhắc vẽ: tranh-goc/LOI-NHAC-TRANG-BI.md. */
  var PHAM_TB = [
    { ten: 'Phàm', mau: '#d8cfc0', mac: 'Phàm Nhân', goc: 8 }, { ten: 'Linh', mau: '#7fe07a', mac: 'Luyện Khí', goc: 20 },
    { ten: 'Huyền', mau: '#5fb0ff', mac: 'Kết Đan', goc: 45 }, { ten: 'Địa', mau: '#c77dff', mac: 'Hóa Thần', goc: 120 },
    { ten: 'Thiên', mau: '#ffd24c', mac: 'Đại Thừa', goc: 250 }
  ];
  // [phẩm][ô: binh khí, giáp y, bảo vật][biến thể a, b, c]
  var BIEN_THE = {
    son: [
      [['Cung Tre Vót', 'Cung Mây Đan', 'Cung Trúc Buộc Thừng'], ['Sơn Dã Bào', 'Mộc Diệp Bào', 'Thạch Văn Bào'], ['Vòng Đá Suối', 'Chuỗi Hạt Gỗ Trầm', 'Vòng Nanh Lợn Rừng']],
      [['Cung Gỗ Tên Đồng', 'Cung Sừng Trâu', 'Cung Gỗ Lim Lông Trĩ'], ['Lông Trĩ Linh Y', 'Bích Ngọc Linh Y', 'Trúc Phong Linh Y'], ['Khuyên Tai Ngọc Bích', 'Chuỗi Hạt Ngọc Bích', 'Vòng Cổ Nanh Hổ']],
      [['Rìu Xéo Đồng', 'Rìu Lưỡi Hia Khắc Hươu', 'Rìu Đôi Đồng Núi'], ['Tê Giác Huyền Giáp', 'Đá Ong Huyền Giáp', 'Lạc Vũ Huyền Bào'], ['Lục Lạc Đồng', 'Chuông Đồng Cán Hươu', 'Lục Lạc Ngọc Bích']],
      [['Dao Găm Tượng Người Ngọc Bích', 'Dao Găm Cán Tượng Voi', 'Dao Găm Chuôi Rắn Quấn'], ['Hộ Tâm Đồng Giáp', 'Hươu Thần Chiến Bào', 'Tản Viên Chiến Bào'], ['Vòng Tay Khảm Ngọc Bích', 'Vòng Tay Đồng Chuông Nhỏ', 'Vòng Cổ Đồng Mã Não']],
      [['Cung Thần Chim Lạc', 'Cung Thần Sấm Núi', 'Cung Thần Voi Chín Ngà'], ['Thiên Y Lông Lạc', 'Thiên Y Mây Tản Viên', 'Thiên Giáp Sơn Thần'], ['Mặt Trống Hộ Sơn', 'Mặt Ngọc Chim Lạc', 'Vòng Đồng Voi Chín Ngà']]
    ],
    thuy: [
      [['Lao Tre Vót', 'Xiên Cá Tre', 'Lao Tre Mũi Ốc'], ['Ngư Gia Bào', 'Rong Biển Bào', 'Bạch Sa Bào'], ['Vòng Vỏ Sò', 'Chuỗi Vỏ Ốc Suối', 'Vòng Xương Cá']],
      [['Mũi Lao Đồng', 'Lao Đồng Ngạnh Cá', 'Lao Đồng Tua Rong'], ['Ngân Lân Linh Y', 'Kim Lý Linh Y', 'Bạch Lộ Linh Y'], ['Khuyên Tai Ngọc Trai', 'Chuỗi Ngọc Trai', 'Vòng Cổ Răng Cá Mập']],
      [['Đinh Ba Đồng', 'Đinh Ba Sóng Bạc', 'Chĩa Đồng Hai Ngạnh'], ['Mai Rùa Huyền Giáp', 'Cua Đá Huyền Giáp', 'Cá Sấu Huyền Giáp'], ['Lục Lạc Đồng Hình Ốc', 'Tù Và Ốc Biển', 'Chuông Đồng Hình Sò']],
      [['Dao Găm Tượng Người San Hô', 'Dao Găm Cán Cá Sấu', 'Dao Găm Lưỡi Sóng'], ['Châu Ngọc Đồng Giáp', 'Sóng Bạc Chiến Bào', 'Rùa Thần Chiến Bào'], ['Vòng Tay Khảm San Hô', 'Vòng Tay Ngọc Trai Đen', 'Vòng Cổ San Hô Đỏ']],
      [['Lao Thần Chim Lạc', 'Lao Thần Sóng Dữ', 'Lao Thần Rùa Vàng'], ['Thiên Y Lạc Thủy', 'Thiên Y Sóng Bạc', 'Thiên Giáp Mai Rùa Thần'], ['Mặt Trống Hộ Thủy', 'Ngọc Trai Rùa Vàng', 'Vòng Đồng Sóng Biển']]
    ]
  };
  var O_TB = [['B', 'Binh khí'], ['G', 'Giáp y'], ['V', 'Bảo vật']];

  function veKho9(hop) {
    var tong = 'son', pham = 0, gioi = 'nam';
    function ve() {
      var P = PHAM_TB[pham], h = '<div class="k9-chon"><div class="k9-tong">' +
        [['son', '⛰️ Sơn Tông'], ['thuy', '🌊 Thủy Tông']].map(function (t) { return '<button data-tong="' + t[0] + '" class="' + (t[0] === tong ? 'dang' : '') + '">' + t[1] + '</button>'; }).join('') +
        '<span class="k9-gach"></span>' + [['nam', '♂ Nam'], ['nu', '♀ Nữ']].map(function (g) { return '<button data-gioi="' + g[0] + '" class="' + (g[0] === gioi ? 'dang' : '') + '">' + g[1] + '</button>'; }).join('') +
        '</div><div class="k9-pham">' + PHAM_TB.map(function (q, i) { return '<button data-pham="' + i + '" class="' + (i === pham ? 'dang' : '') + '" style="--mp:' + q.mau + '">' + q.ten + '</button>'; }).join('') + '</div></div>' +
        '<div class="k9-luoi" style="--mp:' + P.mau + '">';
      O_TB.forEach(function (o, oi) {
        BIEN_THE[tong][pham][oi].forEach(function (ten, bi) {
          var ma = o[0] + (pham + 1) + (bi ? 'bc'.charAt(bi - 1) : '');
          h += '<figure><img src="anh/vp/' + ma + '-' + tong + (o[0] === 'G' ? '-' + gioi : '') + '.webp" alt="" loading="lazy" onerror="this.className=`hong`">' +
            '<figcaption><b>' + ten + '</b><small>' + ma + ' · ' + o[1] + '</small></figcaption></figure>';
        });
      });
      var g = P.goc;
      h += '</div><p class="k9-ghi"><b style="color:' + P.mau + '">' + P.ten + ' phẩm</b> · mặc từ ' + P.mac + ' · binh khí công ' + g + ', giáp y thủ ' + g + ', bảo vật công ' + g / 2 + ' + thủ ' + g / 2 +
        '</p><div class="k9-chieu"><span>Chiêu binh khí phẩm này</span><img src="anh/vp/B' + (pham + 1) + '-' + tong + '-chieu.webp" alt="" loading="lazy" onerror="this.className=`hong`"></div>';
      hop.innerHTML = h;
      hop.querySelectorAll('[data-tong]').forEach(function (b) { b.onclick = function () { tong = b.dataset.tong; ve(); }; });
      hop.querySelectorAll('[data-gioi]').forEach(function (b) { b.onclick = function () { gioi = b.dataset.gioi; ve(); }; });
      hop.querySelectorAll('[data-pham]').forEach(function (b) { b.onclick = function () { pham = +b.dataset.pham; ve(); }; });
    }
    ve();
  }

  var KHO = [
    {
      id: 'trang-bi', ten: 'Trang bị', bt: '⚔️', trangThai: 'co', co: ['nhat', 'yeu', 'chien', 'qua'],
      mo: 'Đồ đồng Đông Sơn từ lò đúc của các vua Hùng (chương 4). Ba ô: binh khí cộng công, giáp y cộng thủ, bảo vật cộng cả hai (nửa mức). Phẩm cao phải đủ cảnh giới mới mặc; chưa đủ thì luyện hóa thành linh khí. Quà không đổi thẳng ra đồ, nhưng quà trong mê cung làm rơi thêm đồ để nhặt. Nhập môn được ban ngay 3 món Phàm phẩm của tông mình — 1 binh khí, 1 giáp y (đúng giới nam / nữ), 1 bảo vật — mỗi món bốc ngẫu nhiên biến thể a / b / c, nên hai người cùng tông vừa vào đã mặc khác nhau (ô nào đã có đồ thì không ban lại). Mỗi món giữ mã biến thể của nó (vd <kbd>B1b</kbd>): lưu sổ, tải lại, lên Vinh Danh, ngồi tu luyện đều hiện đúng tên và hình món đó. Đồ rơi trong mê cung, diệt yêu, Đại Chiến, Rương Đồng cũng bốc biến thể; về tay ai thì mang tên, hình theo tông của người đó và giáp theo giới; đã cầm món nào thì giữ món đó, chỉ thay khi tự mặc món tốt hơn.',
      kho9: true, // lưới 9 món theo tông × phẩm × giới, thay dải ảnh
      gioi: /^G/, // giáp y có bản nam và nữ: anh/vp/G1-son-nam.webp, G1-son-nu.webp
      vpCot: { 1: '-son', 2: '-thuy' },
      chieu: /^B/, // binh khí có thêm ô hình chiêu (vệt chiêu bay tới đích) ngay sau ảnh món: anh/vp/B1-son-chieu.webp
      cot: ['Mã', 'Sơn Tông', 'Thủy Tông', 'Ô', 'Phẩm', 'Mặc từ', 'Chỉ số', 'Rơi ở'],
      dong: [
        // Binh khí
        ['{B1}', 'Cung Tre Vót', 'Lao Tre Vót', 'Binh khí', '<b style="color:#d8cfc0">Phàm</b>', 'Phàm Nhân', 'công 8', 'Ải, Địa Cung, yêu tinh'],
        ['{B2}', 'Cung Gỗ Tên Đồng', 'Mũi Lao Đồng', 'Binh khí', '<b style="color:#7fe07a">Linh</b>', 'Luyện Khí', 'công 20', 'Ải, Địa Cung, yêu tinh'],
        ['{B3}', 'Rìu Xéo Đồng', 'Đinh Ba Đồng', 'Binh khí', '<b style="color:#5fb0ff">Huyền</b>', 'Kết Đan', 'công 45', 'Ải, Địa Cung, yêu tinh (hiếm hơn)'],
        ['{B4}', 'Dao Găm Tượng Người Ngọc Bích', 'Dao Găm Tượng Người San Hô', 'Binh khí', '<b style="color:#c77dff">Địa</b>', 'Hóa Thần', 'công 120', 'gần lõi Địa Cung, Rương Đồng, yêu tinh'],
        ['{B5}', 'Cung Thần Chim Lạc', 'Lao Thần Chim Lạc', 'Binh khí', '<b style="color:#ffd24c">Thiên</b>', 'Đại Thừa', 'công 250', 'Rương Đồng, yêu tinh (rất hiếm)'],
        // Giáp y
        ['{G1}', 'Sơn Dã Bào', 'Ngư Gia Bào', 'Giáp y', '<b style="color:#d8cfc0">Phàm</b>', 'Phàm Nhân', 'thủ 8', 'Ải, Địa Cung, yêu tinh'],
        ['{G2}', 'Lông Trĩ Linh Y', 'Ngân Lân Linh Y', 'Giáp y', '<b style="color:#7fe07a">Linh</b>', 'Luyện Khí', 'thủ 20', 'Ải, Địa Cung, yêu tinh'],
        ['{G3}', 'Tê Giác Huyền Giáp', 'Mai Rùa Huyền Giáp', 'Giáp y', '<b style="color:#5fb0ff">Huyền</b>', 'Kết Đan', 'thủ 45', 'Ải, Địa Cung, yêu tinh (hiếm hơn)'],
        ['{G4}', 'Hộ Tâm Đồng Giáp', 'Châu Ngọc Đồng Giáp', 'Giáp y', '<b style="color:#c77dff">Địa</b>', 'Hóa Thần', 'thủ 120', 'gần lõi Địa Cung, Rương Đồng, yêu tinh'],
        ['{G5}', 'Thiên Y Lông Lạc', 'Thiên Y Lạc Thủy', 'Giáp y', '<b style="color:#ffd24c">Thiên</b>', 'Đại Thừa', 'thủ 250', 'Rương Đồng, yêu tinh (rất hiếm)'],
        // Bảo vật
        ['{V1}', 'Vòng Đá Suối', 'Vòng Vỏ Sò', 'Bảo vật', '<b style="color:#d8cfc0">Phàm</b>', 'Phàm Nhân', 'công 4 + thủ 4', 'Ải, Địa Cung, yêu tinh'],
        ['{V2}', 'Khuyên Tai Ngọc Bích', 'Khuyên Tai Ngọc Trai', 'Bảo vật', '<b style="color:#7fe07a">Linh</b>', 'Luyện Khí', 'công 10 + thủ 10', 'Ải, Địa Cung, yêu tinh'],
        ['{V3}', 'Lục Lạc Đồng', 'Lục Lạc Đồng Hình Ốc', 'Bảo vật', '<b style="color:#5fb0ff">Huyền</b>', 'Kết Đan', 'công 22 + thủ 22', 'Ải, Địa Cung, yêu tinh (hiếm hơn)'],
        ['{V4}', 'Vòng Tay Khảm Ngọc Bích', 'Vòng Tay Khảm San Hô', 'Bảo vật', '<b style="color:#c77dff">Địa</b>', 'Hóa Thần', 'công 60 + thủ 60', 'gần lõi Địa Cung, Rương Đồng, yêu tinh'],
        ['{V5}', 'Mặt Trống Hộ Sơn', 'Mặt Trống Hộ Thủy', 'Bảo vật', '<b style="color:#ffd24c">Thiên</b>', 'Đại Thừa', 'công 125 + thủ 125', 'Rương Đồng, yêu tinh (rất hiếm)']
      ],
      du: [
        '<b>Mua đồ bằng linh thạch:</b> mua trang bị theo phẩm; món mua cũng bốc biến thể theo tông và giới người mua (giá chưa chốt).',
        '<b>Đổi kiểu trong cùng phẩm:</b> muốn đổi sang biến thể khác cùng ô cùng phẩm (chỉ đổi hình, không đổi chỉ số) thì tốn linh thạch, như đổi trang phục.'
      ],
      truyen: 'Hiện game: đã ban đồ khi nhập môn, giữ đúng biến thể qua sổ lưu và cấp đồ rơi theo tông / giới; trang bị chưa mua được bằng linh thạch, chưa đổi kiểu được.',
      ghi: 'Lưới trên: chọn tông, giới và phẩm để xem 9 món (3 binh khí, 3 giáp y, 3 bảo vật — biến thể a, b, c), như một popup chọn đồ; bảng dưới là biến thể a của từng ô. Biến thể cùng ô cùng phẩm thì cùng chỉ số, chỉ khác hình để nhân vật không giống hệt nhau. Giáp y là xiêm y tu tiên có bản nam và bản nữ riêng (lưng để trống để sau lắp cánh); binh khí, bảo vật dùng chung. Mã B1–B5 (binh khí), G1–G5 (giáp y), V1–V5 (bảo vật), thêm đuôi b / c cho biến thể, là mã của trang truyện để tra cứu — game chưa có lệnh gõ cho trang bị, đồ chỉ rơi khi nhặt, diệt yêu, Đại Chiến. Game dùng đúng tên riêng từng tông trong bảng này (món cũ từ trước khi có kho thì giữ tên gốc chung). Cùng mã thì cùng phẩm, cùng chỉ số. Mỗi món rơi lệch ±15%. Cả bộ Thiên phẩm khoảng 70% lực chiến gốc Đại Thừa; cả bộ đồ một phẩm không bao giờ đưa ai lên bằng người ở cảnh giới kế — đồ không vượt cảnh giới. Không có nỏ thần (đời An Dương Vương).'
    },
    {
      id: 'ao', ten: 'Trang phục', bt: '👘', trangThai: 'co', co: ['thach', 'nhat'], ma: 'T',
      mo: 'Chỉ đổi hình, không cộng lực chiến. Nhập môn được ban ngẫu nhiên một bộ T1–T5. Mặc gì thì ngồi tu luyện và lên Vinh Danh đúng bộ đó.',
      anh: ['anh/nv/son-tp1.webp', 'anh/nv/son-tp2.webp', 'anh/nv/son-tp3.webp', 'anh/nv/thuy-tp1.webp', 'anh/nv/thuy-tp2.webp', 'anh/nv/thuy-tp3.webp'],
      cot: ['Mã', 'Sơn Tông', 'Thủy Tông', 'Giá 💎', 'Cần'],
      dong: [
        ['{T1}', 'Sơn Dã Y', 'Ngư Gia Y', 50, ''], ['{T2}', 'Hộ Sơn Giáp', 'Ngân Lân Giáp', 50, ''], ['{T3}', 'Bạch Vân Bào', 'Bạch Châu Bào', 50, ''],
        ['{T4}', 'Hồng Hội Bào', 'San Hô Bào', 50, ''], ['{T5}', 'Dạ Hành Y', 'Nguyệt Dạ Y', 50, ''],
        ['{T6}', 'Lạc Vũ Pháp Y', 'Lam Thủy Pháp Y', 100, 'Luyện Khí'], ['{T7}', 'Nguyên Anh Sơn Bào', 'Nguyên Anh Long Bào', 300, 'Nguyên Anh'],
        ['{T8}', 'Hư Không Sơn Giáp', 'Hư Không Hải Giáp', 600, 'Luyện Hư'], ['{T9}', 'Bất Tử Thần Y', 'Bất Tử Long Y', 1000, 'Chân Tiên']
      ],
      ghi: 'Dự kiến: thêm nhiều bộ cho cảnh giới cao, đổi bằng linh thạch.'
    },
    {
      id: 'dan', ten: 'Đan dược', bt: '💊', trangThai: 'co', co: ['thach', 'yeu'], ma: 'D',
      mo: 'D1–D5 là điểm đột phá (linh khí), uống ngay — mỗi viên hợp một cảnh giới (tên đan là tên cảnh giới dùng nó: Trúc Cơ Đan cho người Trúc Cơ, Kết Kim Đan cho người Kết Đan), mới vào cảnh giới mà uống thì không phí giọt nào; đan bậc cao lời hơn. D6–D9 là đan trận, cất trong túi, tự dùng đúng lúc ở trận kế — không phải gõ giữa trận. Mỗi tông luyện đan bằng của mình: Sơn Tông dùng sâm núi, linh chi, đá ong, đồng; Thủy Tông dùng rong biển, ngọc trai, san hô, vỏ sò. Cùng mã, cùng giá, cùng công dụng — chỉ khác tên và hình.',
      vpCot: { 1: '-son', 2: '-thuy' },
      cot: ['Mã', 'Sơn Tông', 'Thủy Tông', 'Giá 💎', 'Công dụng'],
      dong: [
        ['{D1}', 'Sâm Núi Tụ Khí Đan', 'Rong Biển Tụ Khí Đan', 20, '+25 ⚡ ngay · mọi cảnh giới'],
        ['{D2}', 'Linh Chi Bồi Nguyên Đan', 'San Hô Bồi Nguyên Đan', 36, '+50 ⚡ ngay · từ Luyện Khí'],
        ['{D3}', 'Đá Ong Trúc Cơ Đan', 'Vỏ Sò Trúc Cơ Đan', 60, '+90 ⚡ ngay · từ Trúc Cơ'],
        ['{D4}', 'Kim Đồng Kết Kim Đan', 'Long Châu Kết Kim Đan', 88, '+140 ⚡ ngay · từ Kết Đan'],
        ['{D5}', 'Tản Viên Phá Cảnh Đan', 'Long Cung Phá Cảnh Đan', 560, 'đầy linh khí tới ngưỡng (vẫn tự gõ đột phá) · từ Nguyên Anh'],
        ['{D6}', 'Hỏa Sơn Bạo Khí Đan', 'Nộ Triều Bạo Khí Đan', 60, 'trận kế: công +20%'],
        ['{D7}', 'Thạch Bích Kim Cương Đan', 'Long Lân Kim Cương Đan', 60, 'trận kế: thủ +20%'],
        ['{D8}', 'Mộc Linh Hồi Hồn Đan', 'Bạng Châu Hồi Hồn Đan', 40, 'đỡ trọn một lần choáng do yêu tinh'],
        ['{D9}', 'Lôi Sơn Hộ Kiếp Đan', 'Hải Long Hộ Kiếp Đan', 80, '+2 hộ pháp đầu lần độ kiếp kế · từ Kết Đan']
      ],
      ghi: 'Tên riêng từng tông là đề xuất của trang truyện; game hiện ghi chung tên gốc (Tụ Khí Đan, Bồi Nguyên Đan, Trúc Cơ Đan, Kết Kim Đan, Phá Cảnh Đan, Bạo Khí Đan, Kim Cương Đan, Hồi Hồn Đan, Hộ Kiếp Đan) — tên gốc vẫn nằm ở cuối mỗi tên.'
    },
    {
      id: 'cong-phap', ten: 'Công pháp', bt: '📜', trangThai: 'co', co: ['thach', 'nhat'], ma: 'C',
      vpCot: { 1: '-son', 2: '-thuy' },
      mo: 'Chọn một môn đang dùng; tên môn là tên chiêu khi ra đòn. Sơn Tông học cung, Thủy Tông học lao — cùng hệ, cùng giá. Mỗi bậc +6% lực chiến gốc. Bậc cao phải đủ cảnh giới mới học (bậc 2 từ Luyện Khí, 3 Trúc Cơ, 4 Kết Đan, 5 Nguyên Anh), giá gấp đôi mỗi bậc. Bí kíp ở Ải Nhập Môn tặng một môn chưa có, hợp cảnh giới.',
      cot: ['Mã', 'Sơn Tông (cung)', 'Thủy Tông (lao)', 'Giá 💎', 'Trong trận'],
      dong: [
        ['{C1}', 'Sơn Ưng Tiễn', 'Thủy Xà Thương', 30, 'đòn +8%'], ['{C2}', 'Thạch Bích Công', 'Thủy Mạc Công', 30, 'đỡ +5%, đòn +3%'],
        ['{C3}', 'Linh Chi Quyết', 'Ngọc Châu Quyết', 30, 'hồi trận khí, đòn +3%'], ['{C4}', 'Xuyên Vân Tiễn', 'Xuyên Lãng Thương', 60, 'bạo kích +6%, đòn +10% · từ Luyện Khí'],
        ['{C5}', 'Phá Sơn Liên Tiễn', 'Phá Lãng Thương Pháp', 60, 'đòn +16% · từ Luyện Khí'], ['{C6}', 'Tản Viên Hộ Thể', 'Long Lân Hộ Thể', 120, 'đỡ +15%, đòn +9% · từ Trúc Cơ'],
        ['{C7}', 'Mộc Linh Hồi Xuân', 'Hồi Xuân Thủy Pháp', 120, 'hồi trận khí ×3, đòn +9% · từ Trúc Cơ'], ['{C8}', 'Đồng Cổ Lôi Tiễn', 'Hải Long Lôi Thương', 240, 'bạo kích +12%, đòn +20% · từ Kết Đan'],
        ['{C9}', 'Sơn Thần Vạn Tiễn', 'Thủy Thần Cuồng Lan', 480, 'đòn +40% · từ Nguyên Anh']
      ]
    },
    {
      id: 'linh-thu', ten: 'Linh thú', bt: '🐾', trangThai: 'co', co: ['thach'], ma: 'P',
      mo: 'Thú nuôi của tông, đổi bằng linh thạch, theo người và hiện cạnh tên. Cộng thêm một phần công thủ gốc của cảnh giới nên có tác dụng ở mọi trận.',
      vpCot: { 1: '' }, vp: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'],
      cot: ['Mã', 'Linh thú', 'Tông', 'Giá 💎', 'Công thủ gốc'],
      dong: [
        ['{P1}', 'Gà Chín Cựa', '⛰️ Sơn', 100, '+5%'],
        ['{P2}', 'Cá Chép Vàng', '🌊 Thủy', 100, '+5%'],
        ['{P3}', 'Chim Lạc', '⛰️ Sơn', 150, '+6%'],
        ['{P4}', 'Rùa Thần', '🌊 Thủy', 200, '+8%'],
        ['{P5}', 'Ngựa Chín Hồng Mao', '⛰️ Sơn', 300, '+10%'],
        ['{P6}', 'Voi Chín Ngà', '⛰️ Sơn', 300, '+10%'],
        ['{P7}', 'Thuồng Luồng', '🌊 Thủy', 400, '+12%'],
        ['{P8}', 'Giao Long', '🌊 Thủy', 600, '+15%'],
        ['{P9}', 'Linh thú bậc cao nhất', 'chung', 1000, '+18%']
      ],
      ghi: 'Cột "Tông" là thú gốc của đạo quân thần nào (theo truyện); game hiện bán chung cho cả hai tông. Dự kiến: cho linh thú ăn (khoảng 10 💎 mỗi lần), tăng thân mật; Doughnut (30 xu) dự kiến là "Linh Thực" +1 cấp thân mật. Thêm linh thú mới = thêm một dòng (mã P10, P11…).'
    },
    {
      id: 'linh-vat', ten: 'Linh vật', bt: '🐘', trangThai: 'co', co: ['yeu'],
      mo: 'Thần của phe mình ban cho người có công diệt yêu (kết liễu, top sát thương) — không phải yêu tinh rơi ra. Mỗi con +5% linh khí và sát thương yêu tinh, tối đa 4. Thần đã ban thì không đòi lại.',
      cot: ['Hình', 'Sơn Tinh ban', 'Hình', 'Thủy Tinh ban'],
      dong: [['@P6', 'Voi Chín Ngà', '@P7', 'Thuồng Luồng'], ['@P1', 'Gà Chín Cựa', '@LV-ca-chep-hoa-rong', 'Cá Chép Hóa Rồng'], ['@P5', 'Ngựa Chín Hồng Mao', '@P4', 'Rùa Thần'], ['@P3', 'Chim Lạc', '@P8', 'Giao Long']]
    },

    /* ---------- ĐANG THIẾT KẾ: chưa có trong game, ghi "dự kiến" ---------- */
    {
      id: 'canh', ten: 'Cánh', bt: '🪶', trangThai: 'sap', co: ['qua', 'thach', 'canh'],
      mo: 'Đôi cánh sau lưng, làm theo đúng chất Đông Sơn: cánh lông chim Lạc, cánh sóng nước, cánh mây ngũ sắc — không dùng cánh tiên kiểu Tàu. Cảnh giới càng cao, cánh càng lớn, càng sáng.',
      du: ['Chủ yếu đổi hình (như trang phục), có thể kèm chút chỉ số theo đúng bảng lực chiến — không vượt cảnh giới.', 'Có thể ghép từ mảnh cánh rơi khi diệt yêu, hoặc nâng bằng linh thạch.', 'Quà lớn (bậc 4–5) có thể mở hiệu ứng cánh đặc biệt trong buổi.'],
      truyen: 'Chưa có trong luật game — cần thiết kế và ghi vào Kinh Thư trước.'
    },
    {
      id: 'thu-cuoi', ten: 'Thú cưỡi', bt: '🐎', trangThai: 'sap', co: ['yeu', 'qua', 'thach'],
      mo: 'Thần ban thú cưỡi cho đệ tử có công. Đổi dáng ngồi trên kim tự tháp và đi nhanh hơn trong Địa Cung.',
      du: ['+5% lực chiến gốc (theo bảng lực chiến).', 'Đi nhanh hơn trong mê cung (Ải, Địa Cung).', 'Bảng dưới là bộ thú cưỡi đầu tiên (tên, cách có là dự kiến); thêm thú cưỡi mới = thêm một dòng.'],
      truyen: 'Kinh Thư §14 chặng 8 "Thuần thú" — chưa làm.',
      cot: ['Hình', 'Thú cưỡi', 'Tông', 'Cách có (dự kiến)'],
      dong: [
        ['@M-voi', 'Voi Chín Ngà Yên Đồng', '⛰️ Sơn', 'thần ban khi diệt yêu · quà bậc 4'],
        ['@M-ngua', 'Ngựa Hồng Mao Yên Ngọc', '⛰️ Sơn', 'thần ban khi diệt yêu · linh thạch'],
        ['@M-giao', 'Giao Long Đài Sóng', '🌊 Thủy', 'thần ban khi diệt yêu · quà bậc 4'],
        ['@M-rua', 'Rùa Thần Đài Ngọc', '🌊 Thủy', 'thần ban khi diệt yêu · linh thạch']
      ]
    },
    {
      id: 'linh-thu-chien', ten: 'Linh thú chiến', bt: '🐉', trangThai: 'sap', co: ['yeu', 'qua'],
      mo: 'Nâng linh vật thần ban thành linh thú có chiêu: mỗi con một nội tại theo căn cơ, hoặc ra đòn phụ khi đánh yêu tinh và Đại Chiến.',
      du: ['Sinh ra khi diệt yêu (thần ban), dùng ở đánh yêu và Đại Chiến.', 'Quà "Linh Thực" (Doughnut 30 xu) dự kiến tăng thân mật.'],
      truyen: 'Kinh Thư §13 "Chỗ đã chừa sẵn".'
    },
    {
      id: 'phap-bao', ten: 'Pháp bảo của phe', bt: '🥁', trangThai: 'sap', co: ['mach'],
      mo: 'Báu vật của cả tông — ví dụ Trống Đồng Ngọc Lũ, Long Châu — đúc bằng Linh Mạch cả tông góp. Mỗi pháp bảo mở một trận pháp thứ năm hoặc nâng một trận pháp sẵn có.',
      du: ['Không cộng sức mạnh cá nhân — là của chung cả phe.', 'Tông tu luyện chăm (Linh Mạch dày) đúc được trước.'],
      truyen: 'Kinh Thư §13, §14 chặng 9 "Đúc bảo".'
    },
    {
      id: 'ruong', ten: 'Rương Bảo', bt: '🎁', trangThai: 'sap', co: ['qua'],
      mo: 'Quà từ 100 xu mở một rương. Tỉ lệ ghi rõ trên màn.',
      du: ['70% đan dược / linh thạch.', '25% trang bị.', '5% trang phục hiếm.'],
      truyen: 'Cơ chế quà đợt 3.'
    },
    {
      id: 'tien-duyen', ten: 'Tiên Duyên', bt: '🌟', trangThai: 'sap', co: ['qua'],
      mo: 'Danh hiệu tích lũy theo tổng quà mọi buổi, 9 bậc: 10 / 50 / 200 / 500 / 1k / 3k / 10k / 30k / 100k xu.',
      du: ['Khung tên, vòng hào quang, danh hiệu riêng.', '+1% … +9% linh khí — nhỏ, không vượt cảnh giới.'],
      truyen: 'Cơ chế quà đợt 3.'
    },
    {
      id: 'dao-lu', ten: 'Đạo lữ', bt: '💞', trangThai: 'sap', co: [],
      mo: 'Hai đệ tử hợp ý cùng gõ một lệnh để kết đạo lữ: ngồi cạnh nhau, song tu thêm linh khí, cứu nhau khi choáng.',
      du: ['Quà "Song Tu" (Hand Heart 100 xu) dự kiến: mình và người ngồi cạnh cùng +20 linh khí.'],
      truyen: 'Kinh Thư §14 chặng 7 "Kết duyên".'
    }
  ];

  /* Quà chữ ký — mỗi món một tác dụng riêng ngoài tác dụng theo bậc. Đang thiết kế (co-che-qua.md §4). */
  var QUA_CHU_KY = [
    [5655, 'Rose', 1, 'Linh Hoa', 'hồi 5% máu khi đánh yêu tinh'],
    [5487, 'Finger Heart', 5, 'Kết Ấn', 'tự hô trận pháp Thủ cho tông'],
    [8913, 'Rosa', 10, 'Hồng Liên Đan', '+1 Tụ Khí Đan, không tốn linh thạch'],
    [5879, 'Doughnut', 30, 'Linh Thực', 'linh thú +1 cấp thân mật'],
    [5660, 'Hand Heart', 100, 'Song Tu', 'mình và người đứng ngay trên / dưới cùng +20 ⚡'],
    [7168, 'Money Gun', 500, 'Mưa Linh Thạch', 'mưa đá quý bay khắp màn'],
    [6563, 'Meteor Shower', 3000, 'Thiên Thạch Giáng Thế', 'chiêu Sơn Băng Địa Liệt bản lớn (Thủy Tông ra băng)'],
    [6369, 'Lion', 29999, 'Thần Thú Hộ Sơn', 'thần thú tông bay qua cả khung, cả tông ×2 linh khí 5 phút']
  ];

  function kb(s) { return String(s).replace(/\{(.+?)\}/g, '<kbd>$1</kbd>'); }
  function chip(c) { return '<span class="nhan">' + NGUON[c] + '</span>'; }

  function veKho(hop, tabHop) {
    tabHop.innerHTML = KHO.map(function (k, i) {
      return '<button data-i="' + i + '" class="' + (k.trangThai === 'sap' ? 'sap' : '') + '">' + k.bt + ' ' + k.ten + (k.trangThai === 'sap' ? ' <small>sắp có</small>' : '') + '</button>';
    }).join('');
    function chon(i) {
      var k = KHO[i];
      tabHop.querySelectorAll('button').forEach(function (b, j) { b.classList.toggle('dang', j === i); });
      var h = '<div class="the kho-the"><div class="kho-dau"><h3 class="tieu-game">' + k.bt + ' ' + k.ten + '</h3>' +
        (k.trangThai === 'sap' ? '<span class="nhan sap">⏳ đang thiết kế</span>' : '<span class="nhan son">✅ đã có trong game</span>') +
        (k.ma ? ' <span class="nhan">gõ ' + kb('{' + k.ma + '1}–{' + k.ma + '9}') + '</span>' : '') + '</div>' +
        '<p>' + k.mo + '</p>' + (k.co.length ? '<p class="co-bang">Có bằng: ' + k.co.map(chip).join(' ') + '</p>' : '');
      if (k.kho9) h += '<div class="kho9"></div>';
      if (k.anh) h += '<div class="hang-ao">' + k.anh.map(function (a) { return '<img src="' + a + '" alt="" loading="lazy">'; }).join('') + '</div>';
      if (k.dong) {
        var vc = k.vpCot || {};
        var dau = '';
        k.cot.forEach(function (c, j) {
          if (vc[j] !== undefined) dau += '<th class="cot-hinh">Hình</th>' + (k.chieu ? '<th class="cot-chieu">Chiêu</th>' : '');
          dau += '<th>' + c + '</th>';
        });
        h += '<div class="cuon-ngang"><table class="bang bang-' + k.id + (k.vpCot ? ' co-hinh' : '') + '"><thead><tr>' + dau + '</tr></thead><tbody>' +
          k.dong.map(function (d) {
            var m = /^\{([A-Z]\d+)\}$/.exec(String(d[0]));
            return '<tr>' + d.map(function (x, j) {
              var o = '';
              if (vc[j] !== undefined) {
                var co = m && (!k.vp || k.vp.indexOf(m[1]) >= 0);
                var hai = co && k.gioi && k.gioi.test(m[1]);
                o += '<td class="cot-hinh">' + (!co ? '<span class="vp-cho">⏳</span>' : hai
                  ? '<span class="vp-doi"><img class="vp" src="anh/vp/' + m[1] + vc[j] + '-nam.webp" alt="" title="Nam" loading="lazy"><img class="vp" src="anh/vp/' + m[1] + vc[j] + '-nu.webp" alt="" title="Nữ" loading="lazy"></span>'
                  : '<img class="vp" src="anh/vp/' + m[1] + vc[j] + '.webp" alt="" loading="lazy">') + '</td>';
                if (k.chieu) o += '<td class="cot-chieu">' + (m && k.chieu.test(m[1]) ? '<img class="chieu" src="anh/vp/' + m[1] + vc[j] + '-chieu.webp" alt="" loading="lazy">' : '') + '</td>';
              }
              if (typeof x === 'string' && x.charAt(0) === '@') {
                return o + '<td class="cot-hinh">' + (x === '@-' ? '<span class="vp-cho">⏳</span>' : '<img class="vp" src="anh/vp/' + x.slice(1) + '.webp" alt="" loading="lazy">') + '</td>';
              }
              return o + '<td>' + kb(x) + '</td>';
            }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>';
      }
      if (k.du) h += '<div class="du-kien"><b>Dự kiến</b><ul>' + k.du.map(function (d) { return '<li>' + d + '</li>'; }).join('') + '</ul>' + (k.truyen ? '<small>' + k.truyen + '</small>' : '') + '</div>';
      if (k.ghi) h += '<p class="ghi">' + kb(k.ghi) + '</p>';
      hop.innerHTML = h + '</div>';
      if (k.kho9) veKho9(hop.querySelector('.kho9'));
      try { history.replaceState(null, '', '#kho-' + k.id); } catch (e) { /* bỏ qua */ }
    }
    tabHop.querySelectorAll('button').forEach(function (b) { b.onclick = function () { chon(+b.dataset.i); }; });
    var dau = location.hash.indexOf('#kho-') === 0 ? KHO.findIndex(function (k) { return '#kho-' + k.id === location.hash; }) : 0;
    chon(dau < 0 ? 0 : dau);
  }

  function veChuKy(hop) {
    hop.innerHTML = QUA_CHU_KY.map(function (q) {
      return '<div class="the chu-ky"><img src="anh/qua/' + q[0] + '.webp" alt="" loading="lazy"><div><b>' + q[3] + '</b><small>' + q[1] + ' · ' + q[2].toLocaleString('vi-VN') + ' xu</small><p>' + q[4] + '</p></div></div>';
    }).join('');
  }

  window.SHTL_KHO = { KHO: KHO, QUA_CHU_KY: QUA_CHU_KY, veKho: veKho, veChuKy: veChuKy, BIEN_THE: BIEN_THE };
})();
