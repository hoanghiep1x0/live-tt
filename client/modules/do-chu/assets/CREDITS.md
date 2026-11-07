# Assets — module Lớp học đố chữ (`do-chu`)

Phục vụ ở `/m/do-chu/…`.

| Thư mục | Nội dung | Nguồn | Giấy phép |
|---|---|---|---|
| `nv/co-ngan/` | Cô giáo (cô Ngân): 16 tư thế bộ trắng, bộ `so-mi`, `ao-dai-xanh-ngoc`, `everest`, `chuong` (game lớn) | repo [lop-hoc-chu](https://github.com/workaipvlinh-byte/lop-hoc-chu) `public/assets/nv/co-ngan/` (đã tách nền) | Thuộc tác giả repo |
| `nv/nam/`, `nv/nu/` | Học sinh nam/nữ: 8 tư thế mặt trước + `sau-*` (thân sau lưng đã xoá đầu, tóc vẽ SVG ở `Hair.tsx`), `head.json` khung đầu đã xoá | như trên | Thuộc tác giả repo |
| `sfx/` | Chưa có file tiếng. Bỏ `ting.mp3`, `drum.mp3`… vào đây và ghi tên vào `danh-sach.json` là game dùng thay tiếng tự tạo (`src/view/sfx.tsx`) | — | — |

README của repo gốc: mã nguồn MIT; **ảnh nhân vật cô Ngân, học sinh và ảnh nền thuộc tác giả — dùng cho kênh
khác thì nên thay bằng ảnh riêng.** Thay ảnh thì giữ nguyên tên file và tỉ lệ khung (toạ độ trong `GameStage.tsx`
tính theo ảnh hiện tại).

Ảnh gốc chưa tách nền (`nhan-vat/`, ~140 MB) không chép vào đây — chỉ bản webp đã tách nền mà game dùng.
