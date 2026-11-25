# Quà TikTok LIVE — danh mục và ảnh

Dùng chung cho mọi thiết kế phòng (bảng quy đổi quà, hướng dẫn tặng quà, hiệu ứng khi nhận quà).

- `danh-sach.json`: mỗi quà một dòng
  - `id`: mã quà TikTok, khớp `giftId` trong sự kiện quà của live;
  - `ten`: tên tiếng Anh như trên bảng quà;
  - `xu`: giá bằng xu (diamond);
  - `combo`: tặng liên tiếp được;
  - `loai`: kiểu quà của TikTok;
  - `panel`: vị trí trên bảng quà (`null` là quà không hiện trên bảng: quà sự kiện, quà fan club…);
  - `anh`: link ảnh gốc trên CDN;
  - `file`: ảnh đã tải.
  
  Thứ tự trong tệp: quà trên bảng trước (đúng thứ tự bảng), rồi tới các quà khác theo giá.
- `anh/<id>.webp`: ảnh quà (nền trong suốt, khoảng 200×200).

Quét lúc 2026-11-19 từ API `webcast/gift/list` của một phòng live đang mở (vùng có thể làm danh sách khác đôi chút).
Cập nhật: trong trang live đang mở, gọi API đó bằng `fetch` (kèm cookie), lưu mảng
`{id, ten, xu, combo, loai, panel, anh}` ra tệp JSON, rồi chạy:

```bash
python scripts/qua-tiktok/tai_qua.py <tệp-json>
```

Ảnh có sẵn thì bỏ qua, chỉ tải quà mới.
