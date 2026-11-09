# Tài liệu theo phòng

Mỗi **loại phòng** (`cate`) một thư mục; trong đó mỗi **kiểu phòng** (`style`) một file, mỗi **mảng dùng chung trong
loại** một thư mục con. Quy tắc đặt tên và chỗ để code, script, assets: [01 §12](../01-quy-uoc.md#12-phân-loại-phòng-loại--kiểu).

```
docs/phong/
├─ README.md                  (file này) danh sách loại phòng
└─ <cate>/
   ├─ README.md               loại phòng: mục đích, các kiểu, thứ dùng chung trong loại, trạng thái
   ├─ <style>.md              một kiểu: bố cục, cảnh, assets, slot, design.json, việc còn lại
   └─ <mảng>/                 mảng dùng chung các kiểu của loại (vd nhan-vat/), README.md là mục lục
```

## Các loại phòng

| Loại (`cate`) | Tên | Kiểu (`style`) → thiết kế | Tài liệu |
|---|---|---|---|
| `san-bar` | Sàn bar | `hop-dem` → `san-bar-hop-dem`, `bai-bien` → `san-bar-bai-bien` | [san-bar/](san-bar/README.md) |
| `ke-chuyen` | Phòng kể chuyện | mặc định → `ke-chuyen` (id có trước quy ước) | [04 — Viết thiết kế](../04-viet-thiet-ke.md) |
| `lop-hoc` | Lớp học | `chu` → `lop-hoc-chu` | [lop-hoc/](lop-hoc/README.md) |
| `dai-chien` | Live Đại Chiến (game, đang nghiên cứu) | `thap-den` → `dai-chien-thap-den` (chưa có mã) | [dai-chien/](dai-chien/README.md) |

## Thêm loại hoặc kiểu mới

1. **Kiểu mới của loại có sẵn**: thêm `docs/phong/<cate>/<style>.md`, thư mục `client/designs/<cate>-<style>/` (sao chép
   lõi và assets từ kiểu gần nhất — không trỏ sang thư mục của kiểu khác), một dòng vào bảng kiểu ở
   `docs/phong/<cate>/README.md` và ở bảng trên.
2. **Loại mới**: thêm `docs/phong/<cate>/README.md` theo mẫu của `san-bar/README.md`, một dòng vào bảng trên; script riêng
   (nếu có) ở `scripts/phong/<cate>/`.
3. Không sửa tài liệu, script, assets của loại khác. Thấy cần sửa ở đó thì thứ ấy là đồ **dùng chung** — đưa về
   `client/shared/`, một module, hoặc tài liệu gốc `docs/0x-*.md`.
