# Nguồn gốc assets — Phòng kể chuyện

Chuyển từ bản cũ ở `D:\Live\client\public\assets`. Mỗi thiết kế giữ assets riêng
(quy ước 04 §6), nên các file này là bản của riêng phòng kể chuyện.

| File | Dùng làm gì | Nguồn |
|---|---|---|
| `bg/amitabha-stage.png` | Nền sân khấu (chánh điện), 941×1672 | Tự dựng cho dự án |
| `fx/lotus.png` | Hoa sen phát sáng dưới avatar top | Tự dựng cho dự án |
| `fx/halo.png` | Vòng hào quang sau bồ đoàn top | Tự dựng cho dự án |
| `chibi/khan-{1..6}.png` | Khán giả chibi dáng NGỒI, 6 kiểu, cao 320px | Chụp từ rig 3D `buildChibi` của bản cũ |
| `chibi/dung-{1..6}.png` | Cũng sáu người đó, dáng ĐỨNG — lúc đi vào và đi ra | Chụp từ `buildChibi(v, { standing: true })` |
| `chibi/chibi-{1..6}-{sit,cheer}.svg` | Ảnh thay khi thiếu avatar TikTok | Tự vẽ cho dự án |
| `video/mau-su-tich-cay-vu-sua.webm` | Video mẫu chiếu trong khung, 720×1280, 64 giây | Tự dựng, xem `video/CREDITS.md` |
| `nguoi/co-be.png` | Bé gái ngồi thiền ở đầu trái thanh tiến độ | Bản cũ `charity/art/mascot@3x.png` |
| `nguoi/cau-be.png` | Cậu bé quỳ ở đầu phải thanh tiến độ | Bản cũ `charity/art/boy@3x.png` |
| `nguoi/be-chibi.png` | Bé chibi ngồi ôm gối, sau lưng bé gái, 399×640 | Chụp từ rig 3D `buildHero` của bản cũ |
| `nguoi/be-vui.png` | Cũng bé đó, lúc được ôm thì vui lên | Chụp `animateHero(h, 0, 0, mood = 1)` |

Ba nhân vật này là **đồ đạc của phòng**, không phải của module: bản cũ để cảnh
an ủi điều khiển động tác (cúi chào, vỗ tay, lau nước mắt, bé khóc, khách chạy
lên ôm), nhưng các em phải có mặt kể cả khi không bật module nào. Làm module
`comfort` thì nó mang bản động riêng và thiết kế giấu bản tĩnh này đi.

Bé chibi đúng là bé của bản cũ, không phải vẽ lại. Bản cũ dựng bé bằng
three.js (`buildHero` trong `D:\Live\client\src\lib\chibi3d.ts`) nên không
có file ảnh nào để mang sang; ảnh này lấy bằng cách chạy lại chính hàm đó:

    buildHero() + animateHero(hero, 0, 0, 0, true)   // mood 0 = đang buồn
    HemisphereLight(0xfff4e0, 0x5a3a28, 1.6) + DirectionalLight(0xffe6c4, 1.8)
    máy quay trực diện, ôm sát khối bé, nền trong

Sáu khán giả chibi cũng vậy: `buildChibi(0..5)` + `animateChibi(rig, 0, false)`
với cùng bộ đèn, máy quay trực diện ôm sát từng người; bộ `dung-*` thì thêm
`{ standing: true }`. Phải có hai dáng vì bản cũ cho khách ĐI vào chỗ: người
ngồi mà trôi ngang qua rạp thì nhìn ra ngay là ảnh dán.

**Vì sao ảnh nhân vật lại nằm ở assets của thiết kế**, dù docs/04 §6 xếp
"sprite nhân vật" về phía module: lý do của luật đó là sprite của một module
phải đi theo module để cùng tính năng chạy được ở mọi phòng. Ở đây không có
module nào vẽ người ngồi ghế, và cũng chưa thể có — slot `seats` không mang
theo toạ độ ghế, mà toạ độ ghế là của riêng thiết kế (docs/04 §6 xếp "ghế" về
phía thiết kế). Người ngồi ghế là một phần của khung cảnh rạp, không phải của
một tính năng. Ngày nào hợp đồng cho module biết chỗ ngồi thì tách ra, và ảnh
đi theo module.

Muốn chụp lại (đổi tâm trạng, đổi cỡ) thì dựng lại đoạn đó rồi chụp canvas.
Không kéo three.js vào bản mới: 600KB sau nén chỉ để vẽ một bé ngồi yên là
quá đắt cho trang mà OBS phải giữ 24 fps song song với video truyện.

Không mang theo từ bản cũ:
- `music/*.mp3` — thuộc module `music`.
- `sanh/*`, `charity/icons/*`, `game3d/*` — thuộc thiết kế khác (`tich-phuoc`, `san-choi-3d`).
