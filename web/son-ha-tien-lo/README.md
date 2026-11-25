# Trang truyện Sơn Hà Tiên Lộ

Web tĩnh kể cốt truyện của game live **Sơn Hà Tiên Lộ** (`client/designs/tu-tien-son-ha`). HTML/CSS/JS thuần,
không cần build, không thư viện. Chỉ tải phông chữ từ Google Fonts (không có mạng thì dùng phông máy).

## Chạy

Mở thẳng `index.html` bằng trình duyệt là chạy (chương nạp bằng thẻ `<script>`, nên `file://` vẫn được).

Muốn chạy như web thật (để thử trên điện thoại cùng mạng wifi):

```bash
npx vite web/son-ha-tien-lo --host
```

hoặc `python -m http.server 8080 -d web/son-ha-tien-lo`. Đưa lên mạng: chép nguyên thư mục này lên bất kỳ chỗ host tĩnh
nào (GitHub Pages, Netlify, Cloudflare Pages…).

## Các trang

| Tệp | Trang |
|---|---|
| `index.html` | Trang chủ: lời Cô Mây, hai tông, chương mới, bảy yêu |
| `muc-luc.html` | Mục lục sáu quyển (chương chưa viết hiện "sắp ra") |
| `doc.html?c=N` | Đọc chương N: cỡ chữ, nền tối / giấy, thanh tiến độ, nhớ chương đang đọc |
| `nhan-vat.html` | Nhân vật chính (bấm từng cảnh giới đổi tranh), thần, người dẫn chuyện, trưởng lão, yêu tinh |
| `the-gioi.html` | Hai tông, chức vụ, Thang Trời, địa danh, một năm ở Sơn Hà, linh vật, căn cơ và trận pháp |
| `choi.html` | Cách vào phòng live chơi, lệnh gõ, lịch một giờ |

| `tang-bao.html` | Quà TikTok theo màn, linh thạch, tu vi, kho đồ (đan, công pháp, linh thú, linh vật, thú cưỡi… — dữ liệu `js/tang-bao.js`), quà chữ ký, đồ rơi |
| `xep-hang.html` | Bảng xếp hạng lực chiến (tra theo tên, lọc tông, cảnh giới, Lôi Đài) + bảng danh hiệu nhiều cấp (dữ liệu `js/danh-hieu.js`) |

**Cập nhật bảng xếp hạng** từ sổ hồ sơ của game (chỉ đọc sổ, chỉ xuất tên hiển thị):

```bash
node web/son-ha-tien-lo/cong-cu/xuat-xep-hang.mjs
```

Ghi ra `du-lieu/xep-hang.js`. Chưa có sổ thì trang hiện 12 trưởng lão NPC làm mẫu. Lực chiến tính đúng công thức
`lucChienCua` của game — game đổi công thức thì sửa script theo. **Danh hiệu**: thêm bộ / cấp trong `js/danh-hieu.js`;
bộ `de-xuat` cần game đếm thêm số liệu vào sổ (tổng quà, số lần diệt yêu, hộ pháp, chuỗi ngày, tim…).

`js/site.js` giữ dữ liệu chung (mục lục, cảnh giới, yêu tinh, kênh live), thanh menu, chân trang và bộ định dạng chữ
chương. `css/site.css` là toàn bộ giao diện. `DAN-Y.md` là dàn ý cả bộ đã duyệt (2026-11-19).

## Thêm một chương

1. Tạo `chuong/NN.js` (hai chữ số, ví dụ `09.js`):

   ```js
   SHTL.nhanChuong({
     chu: `
   Đoạn đầu tiên (tự có chữ cái lớn).

   Dòng trống là sang đoạn mới. *nghiêng*, **đậm**, {lệnh gõ} hiện như phím.

   > Dòng bắt đầu bằng "> " là trích dẫn.

   ---

   [[anh/nen/kiep.webp|Chú thích tranh]]
   `,
     live: ['Mỗi dòng là một gạch đầu dòng trong ô "Trong phòng live", ví dụ gõ {5} để đột phá.']
   });
   ```

   Không dùng dấu backtick (`` ` ``) trong chữ chương — nó đóng chuỗi.

2. Trong `js/site.js`, mảng `MUC_LUC`, tìm dòng chương đó và thêm `anh: 'anh/...webp', co: true` (chưa có `co: true`
   thì chương hiện "sắp ra"). Chương mới hoàn toàn thì thêm một dòng `{ so, ten, tom, anh, co: true }` vào quyển.

3. Cuối chương có ô **Ghi chú của người chép**: ghi rõ phần nào là truyền thuyết dân gian thật, phần nào là lệ
   Sơn Hà. Trước khi viết, soát với `docs/phong/tu-tien/kinh-thu.md` (chuẩn) và `ban-do.md` (số liệu, lịch):
   không được mâu thuẫn luật game, chỗ game chưa nói rõ thì hỏi trước.

## Thêm loại đồ mới (cánh, thú cưỡi, pháp bảo…)

Trang `tang-bao.html` đọc dữ liệu từ `js/tang-bao.js`:

- **Loại đồ mới**: thêm một mục vào mảng `KHO` — `{ id, ten, bt, trangThai, co, mo, ma?, cot?, dong?, du?, truyen?, ghi?, anh? }`.
  `trangThai: 'sap'` hiện thẻ "⏳ đang thiết kế" với danh sách `du` (dự kiến); game làm xong thì đổi thành `'co'`, thêm
  `cot` + `dong` (bảng món) và `ma` (chữ cái mã gõ, ví dụ `'W'` → hiện "gõ W1–W9").
- **Món mới trong loại có sẵn**: thêm một dòng vào `dong`.
- **Quà chữ ký**: mảng `QUA_CHU_KY` (`[id ảnh quà, tên TikTok, xu, tên trong game, tác dụng]`); ảnh quà lấy từ
  `client/shared/qua-tiktok/anh/<id>.webp` chép vào `anh/qua/`.
- **Bảng quà theo màn** (đầu trang) tính trong `tang-bao.html` từ luật lõi (`bacQua`, `QUA_LK`, `QUA_ME_XU`…): đổi luật game
  thì sửa hàm tính ở đó.

Số liệu phải khớp `docs/phong/tu-tien/ban-do.md` (§3c bảng lực chiến, §3d Tàng Bảo Các, §4 hệ thống nâng cấp) và
`co-che-qua.md`. Thứ chưa có trong game luôn để `trangThai: 'sap'` và ghi "dự kiến".

## Tranh

| Thư mục | Nguồn |
|---|---|
| `anh/nen`, `anh/nv`, `anh/yeu`, `anh/than`, `anh/thu`, `anh/binh` | thu nhỏ từ `client/designs/tu-tien-son-ha/assets/` |
| `anh/man/` | **ảnh chụp thật** các màn của bản chơi thử (`?thu=1`), 540×960 |
| `anh/bia.webp`, `anh/nv2/` (Cô Mây, Lão Tiều, Bé Sò, Mỵ Nương, Lạc Long Quân), `anh/chuong/NN.webp` | vẽ bằng ChatGPT Image (2026-11-19), gửi kèm tranh của game làm mẫu phong cách |

Chụp lại màn game (khi game đổi giao diện): chạy dev server của game (cổng 5186), rồi dùng Chrome headless qua CDP mở
`http://localhost:5186/?thu=1`, khung 1080×1920, bấm "Nhảy tới…" chọn màn, chờ vài giây, chụp phần tử khung 1080×1920
(dùng `--use-angle=d3d11`; chạy phần mềm SwiftShader thì ánh sáng bloom bị cháy trắng). Thu về 540×960 WebP vào `anh/man/`.
Danh sách màn và lệnh gõ ghi ở mảng `MAN` trong `js/site.js`.

Tranh chương mới: nhờ ChatGPT vẽ ngang 16:9, gửi kèm tranh game (`assets/than/`, `nhan-vat/son-tp1`, `thuy-tp1`…), dặn
"same art style, NO text, no Chinese architecture"; lưu `anh/chuong/NN.webp` (1280×720) và ghi `anh:` vào `MUC_LUC`.

Thu nhỏ tranh từ assets:

```python
from PIL import Image
im = Image.open('client/designs/tu-tien-son-ha/assets/nen/sanh.webp')
im.thumbnail((720, 2000)); im.save('web/son-ha-tien-lo/anh/nen/sanh.webp', quality=80)
```

Giao diện bám theo màn live: khung tím sẫm viền vàng `#e3b44e`, tiêu đề Playfair Display 900 vàng phát sáng, phím số
vàng — lấy từ `client/designs/tu-tien-son-ha/src/stage.css` (phần cuối `css/site.css`).

## Kênh live

Điền `LIVE = { tiktok: 'https://www.tiktok.com/@…', ten: '@…', gio: '20h–23h hằng ngày' }` trong `js/site.js`; trang
"Cách vào live chơi" tự hiện nút mở kênh.

## Quyết định cốt truyện đã duyệt (dàn ý §6)

- Hai thần trên màn Đại Chiến là **pháp tướng** (bóng thần), thần thật không ra trận.
- Không nhắc Kỳ Lân; thú ở Tàng Bảo Các là **linh thú nuôi**, khác **linh vật thần ban** (chia theo phe).
- Thứ tự một năm theo lịch thật mỗi giờ (Kinh Thư §18); yêu trồi lên sau lũ vì lũ xói phong ấn.
- Thành Trì Tự Do là chợ trung lập trên bãi phù sa, Thiên Đình giữ.
- Thần thú Thủy Tông gọi **Rùa Thần** (không gọi Kim Quy).
