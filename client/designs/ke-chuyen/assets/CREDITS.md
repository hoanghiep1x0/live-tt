# Nguồn gốc assets — Phòng kể chuyện

Chuyển từ bản cũ ở `D:\Live\client\public\assets`. Mỗi thiết kế giữ assets riêng
(quy ước 04 §6), nên các file này là bản của riêng phòng kể chuyện.

| File | Dùng làm gì | Nguồn |
|---|---|---|
| `bg/amitabha-stage.png` | Nền sân khấu (chánh điện), 941×1672 | Tự dựng cho dự án |
| `fx/lotus.png` | Hoa sen phát sáng dưới avatar top | Tự dựng cho dự án |
| `fx/halo.png` | Vòng hào quang sau bồ đoàn top | Tự dựng cho dự án |
| `chibi/chibi-{1..6}-{sit,cheer}.svg` | Khán giả chibi bản 2D dự phòng, và ảnh thay khi thiếu avatar TikTok | Tự vẽ cho dự án |
| `video/mau-su-tich-cay-vu-sua.webm` | Video mẫu chiếu trong khung, 720×1280, 64 giây | Tự dựng, xem `video/CREDITS.md` |
| `nguoi/co-be.png` | Bé gái đứng bên trái sàn | Bản cũ `charity/art/mascot@3x.png` |
| `nguoi/cau-be.png` | Cậu bé đứng bên phải sàn | Bản cũ `charity/art/boy@3x.png` |

Hai bạn nhỏ là **đồ đạc của phòng**, không phải của module: bản cũ để cảnh an ủi
điều khiển động tác (cúi chào, vỗ tay, lau nước mắt), nhưng các em phải có mặt
kể cả khi không bật module nào. Làm module `comfort` thì nó mang bản động riêng
và thiết kế giấu bản tĩnh này đi.

Không mang theo từ bản cũ:
- `music/*.mp3` — thuộc module `music`.
- `sanh/*`, `charity/icons/*`, `game3d/*` — thuộc thiết kế khác (`tich-phuoc`, `san-choi-3d`).
