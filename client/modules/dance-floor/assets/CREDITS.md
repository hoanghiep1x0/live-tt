# Assets của module Sàn nhảy

| File | Dùng làm gì | Nguồn |
|---|---|---|
| `chibi-<1..6>-dung.svg` | Khung nhân vật đứng — tay buông, chân khép | Tự dựng cho dự án |
| `chibi-<1..6>-nhay.svg` | Khung nhân vật nhảy — tay giơ, chân dạng, miệng reo | Tự dựng cho dự án |

Sáu kiểu nhân vật và bảng màu lấy đúng từ bản cũ (`D:\Live client/public/assets/chibi`),
nhưng vẽ thêm chân: bản cũ chỉ có đầu và thân vì nhân vật ngồi ghế, còn ở đây họ **đứng**
trên sàn. Khung vẽ `0 0 64 96`, gót chân nằm đúng mép dưới, nên phần vẽ chỉ việc đặt
`transform: translate(-50%, -100%)` là chân chạm sàn.

Hai khung đổi qua lại theo nhịp nhạc chính là cả hoạt ảnh nhảy — không có three.js ở đây,
xem ghi chú đầu `src/stage.tsx`.

Đây là assets **của module**, phục vụ ở `/m/dance-floor/…`, nên sàn nhảy cắm được vào mọi
bối cảnh phòng có slot `floor`.
