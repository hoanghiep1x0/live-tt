# Tranh nhân vật và yêu tinh — Sơn Hà Tiên Lộ

Thân nhân vật **không vẽ bằng mã**: đã thử SVG, trông như ma-nơ-canh. Tranh vẽ tay bằng ChatGPT Image (nền từng màn, nhân vật, yêu tinh), theo đúng
[Kinh Thư §5–6](../kinh-thu.md). Game tự dùng tấm nào có trong `client/designs/tu-tien-son-ha/assets/`; tấm nào thiếu
thì phần đó dùng hình dự phòng (người chơi: ảnh tròn có hào quang; yêu tinh: hình vẽ canvas).

## Bảng kiểm

| File | Nội dung | Có chưa |
|---|---|---|
| `nhan-vat/son-0.webp` | Phe Núi — bậc Sơ (Phàm Nhân, Luyện Khí) | chưa |
| `nhan-vat/son-1.webp` | Phe Núi — bậc Trúc (Trúc Cơ, Kết Đan) | chưa |
| `nhan-vat/son-2.webp` | Phe Núi — bậc Anh (Nguyên Anh, Hóa Thần) | chưa |
| `nhan-vat/son-3.webp` | Phe Núi — bậc Hư (Luyện Hư, Đại Thừa) | chưa |
| `nhan-vat/son-4.webp` | Phe Núi — bậc Tiên (Chân Tiên, Bất Tử) | chưa |
| `nhan-vat/thuy-0.webp` … `thuy-4.webp` | Phe Nước — năm bậc như trên | chưa |
| `yeu/ngu.webp` | Ngư Tinh Biển Đông (1024×1024) | **có** |
| `yeu/ho.webp` | Hồ Tinh Chín Đuôi | **có** |
| `yeu/moc.webp` | Mộc Tinh Rừng Già | **có** |
| `yeu/tam.webp` | Tam Yêu Hợp Thể | **có** |
| `than/son-tinh.webp`, `than/thuy-tinh.webp` | Hai thần cho màn Đại Chiến, 800×1200, đứng đối mặt nhau | **có** |
| `nhan-vat/<phe>-c<0..9>.webp` | Mỗi cảnh giới một bộ, 1024×1024 ngồi thiền. Có: c0, c1, c4, c6, c9; thiếu c2, c3, c5, c7, c8 (mượn bộ dưới) | một phần |
| `nen/sanh.webp` | Nền màn Sảnh Thiên Vấn (1024×1536) | **có** |
| `nen/lu.webp` | Nền màn Mùa Lũ | **có** |
| `nen/kiep.webp` | Nền màn Lôi Kiếp — mặt trống đồng ở 1/3 dưới, giữa | **có** |
| `nen/yeu-ngu.webp`, `yeu-ho`, `yeu-moc`, `yeu-tam` | Nền ba bãi yêu tinh và Đại Yêu Dạ | chưa — tạm mượn nền Sảnh nhuộm màu |
| `nen/ket.webp` | Nền tổng kết năm | chưa — tạm mượn nền Sảnh |

## Cỡ và bố cục — phải đúng thì mới khớp cảnh

- **Nhân vật**: tu sĩ **ngồi xếp bằng thiền định** (tư thế hoa sen, tay kết ấn trên đùi), vì người chơi ngồi tu
  luyện trong từng ô bàn cờ. Nhờ vẽ 1024×1024 (vuông), nền trong suốt, ngồi giữa khung, phần ngồi chạm mép dưới, chừa
  ~18% trống phía trên đầu (huy hiệu ảnh khách đặt ở đó). Lưu `webp` 512×512.
- **Yêu tinh**: 1024×1024, nền trong suốt, thân chạm mép dưới, chiếm gần hết khung. Lưu `webp` 640×640.
- Không chữ, không khung, không bóng đổ xuống nền, không chữ ký.

## Câu khoá phong cách — dán đầu MỌI lời nhắc

> Phong cách hoạt hình 3D tu tiên cao cấp (như phim hoạt hình tiên hiệp), ánh sáng viền vàng, chất liệu lụa mềm có
> độ bóng, màu tươi sáng. Tỉ lệ người dễ thương, đầu hơi to (khoảng 1:4), mắt sáng, mặt hiền. Trang phục là **trang
> phục Đông Sơn thời Văn Lang**, KHÔNG phải Hán phục: áo xẻ ngực hoặc áo quấn, váy quấn, thắt lưng bản to, khuyên tai
> lớn, vòng tay đồng, mũ cắm lông chim trĩ như người trên trống đồng. Hoa văn trống đồng: mặt trời nhiều cánh, chim
> Lạc, răng cưa, vòng tròn tiếp tuyến. Không chữ Hán, không rồng Tàu có bờm, không mái chùa. Nền trong suốt, đứng cả
> người, chân chạm mép dưới, chừa khoảng trống phía trên đầu.

## Lời nhắc từng tấm (dán sau câu khoá)

Mỗi bậc **thêm** chứ không thay: vẽ bậc sau thì gửi kèm ảnh bậc trước và nói "giữ nguyên người này, chỉ thêm…".
Vẽ một tấm một lần (kinh nghiệm dự án: nhờ nhiều tấm một lượt dễ lệch màu).

### Phe Núi — Tản Viên Sơn Môn (đất, rừng, đồng thau, ngọc bích)

- **son-0 (Sơ)**: Thiếu niên đồ đệ núi Tản. Áo vải nâu đất xẻ ngực, khố nâu, chân đất, khăn chít đầu màu be thắt nút
  trên đỉnh. Cầm cành tre. Hào quang xám nhạt quanh người.
- **son-1 (Trúc)**: Giữ người bậc Sơ, thêm thắt lưng bản to bằng đồng thau có khoá tròn, dây lá xanh quấn hai cổ tay,
  một lông trĩ cam cài trên khăn. Hào quang ngọc lục.
- **son-2 (Anh)**: Áo lụa xanh ngọc thêu ba đỉnh núi bằng chỉ vàng ở vạt áo, mũ lông chim thấp (5 lông trĩ cam), giáp
  vai bằng đá mây xám. Hào quang tím.
- **son-3 (Hư)**: Thêm áo choàng hai lớp màu nâu đồng bay sau lưng, viền gấu áo hoa văn răng cưa trống đồng, mũ lông
  chim cao (7 lông). Hào quang hồng.
- **son-4 (Tiên)**: Mão đồng hình mặt trời trống đồng 14 cánh trên đầu, áo lụa vàng đất, hào quang sau lưng là mặt
  trời trống đồng có chim Lạc bay vòng. Vẻ uy nghi nhưng vẫn hiền.

### Phe Nước — Long Cung Thủy Phủ (sóng, ngọc trai, lam, ngọc lam)

- **thuy-0 (Sơ)**: Thiếu nữ (hoặc thiếu niên) Long Cung. Áo vải chàm, váy quấn chàm, vòng cổ vỏ sò trắng, tóc búi hai
  bên. Hào quang xám lam.
- **thuy-1 (Trúc)**: Giữ người bậc Sơ, thêm khuyên tai ngọc trai, thắt lưng lưới cá kết hạt ngọc. Hào quang ngọc lam.
- **thuy-2 (Anh)**: Áo lụa lam óng như vảy cá, thêu sóng cuộn bằng chỉ bạc, mũ lông chim nhuộm lam, vai trang trí sóng
  xoắn. Hào quang tím.
- **thuy-3 (Hư)**: Thêm áo choàng mỏng trong như nước (ngọc lam trong suốt), tóc búi cài lược san hô hồng. Hào quang hồng.
- **thuy-4 (Tiên)**: Mão rồng nước **mình rắn uốn khúc** (rồng Việt thời Lý, không bờm), lụa trắng lam, hào quang sau
  lưng là vòng sóng xoáy. Vẻ thanh thoát.

### Yêu tinh (không cần câu tỉ lệ 1:4; giữ phần phong cách và "không Tàu")

- **ngu**: Ngư Tinh — cá khổng lồ trồi lên khỏi sóng, vảy xanh đen óng, vây lưng gai, miệng răng cưa, mắt đỏ rực,
  một vết cháy đỏ trong miệng (khối sắt nung năm xưa). Dữ nhưng kiểu hoạt hình, không máu me.
- **ho**: Hồ Tinh — cáo trắng chín đuôi xoè sau lưng, đầu đuôi ánh hồng, mắt tím, hoa văn đỏ giữa trán, đứng trên mặt hồ
  sương tím, sen quanh chân. Đẹp mà nguy hiểm.
- **moc**: Mộc Tinh — cây chiên đàn nghìn năm thành tinh, thân xoắn, mặt là hốc cây có mắt xanh lục phát sáng, cành như
  tay vươn ra, rễ bò như chân.
- **tam**: Tam Yêu Hợp Thể — Mộc Tinh làm thân, chín đuôi cáo trắng mọc sau lưng, Ngư Tinh quấn dưới chân như rắn biển;
  tà khí đỏ thẫm. Là trùm cuối của Đại Yêu Dạ.

## Xử lý khi xuất (script `dua_vao.py` trong lịch sử phiên; làm lại bằng tay thì theo đúng các bước)

- Điểm alpha < 32 đưa về 0: ChatGPT để lại lớp điểm gần trong suốt quanh nền, hiệu ứng tỏa sáng sẽ khuếch chúng
  thành khung vuông.
- Yêu tinh và thần: làm mờ dần bốn mép (viền mềm ~12%) vì sương, sóng thường chạm mép khung.
- Nhân vật, yêu tinh 1024×1024; thần 800×1200; nền giữ 1024×1536. WebP chất lượng 90.

## Đưa vào game

1. Cắt nền thật trong suốt (ChatGPT đôi khi trả nền trắng — soát lại).
2. Đổi cỡ và lưu `webp` theo bảng trên, đặt vào `client/designs/tu-tien-son-ha/assets/nhan-vat/` và `assets/yeu/`.
3. Tải lại phòng: tấm nào có là dùng ngay, không cần build lại (assets phục vụ riêng ở `/a/tu-tien-son-ha/…`).
4. Đánh dấu "có" ở bảng kiểm và ghi nguồn vào `assets/CREDITS.md`.
