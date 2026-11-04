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

Không mang theo từ bản cũ:

- `charity/art/mascot@3x.png`, `charity/art/boy@3x.png` — hai bạn nhỏ của cảnh an ủi.
  Chúng thuộc **module** `comfort`, sẽ nằm ở `client/modules/comfort/assets/` để
  dùng được ở mọi bối cảnh phòng.
- `music/*.mp3` — thuộc module `music`.
- `sanh/*`, `charity/icons/*`, `game3d/*` — thuộc thiết kế khác (`tich-phuoc`, `san-choi-3d`).
