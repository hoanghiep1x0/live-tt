# scripts/

Script thực thi được. Mỗi việc có **một cặp**: `.ps1` cho Windows và `.sh` cho bash,
làm đúng cùng một việc.

```
scripts/
├─ kiem-tra.ps1 / .sh    typecheck + test, chạy trước khi commit
├─ chay-dev.ps1 / .sh    bật trang quản lý và backend
├─ dung-db.ps1  / .sh    tạo database từ migrations
└─ phong/                script RIÊNG của từng loại phòng (docs/01 §12) — loại khác không gọi, không sửa
   └─ san-bar/           loại Sàn bar
      ├─ dung-nhan-vat.ps1 / .sh   chạy một bước dựng nhân vật 3D trong Blender
      └─ nhan-vat/                 các bước dựng nhân vật (Python) — docs/phong/san-bar/nhan-vat/
```

## Quy tắc

- Script phải **chạy được từ bất kỳ thư mục nào** — tự tìm gốc dự án, không giả định thư mục hiện tại.
- Thất bại thì **thoát với mã khác 0**. Không nuốt lỗi.
- File tạm trong lúc chạy ghi vào `.tmp/`, không ghi vào `scripts/` và không ghi ra gốc dự án.
- Không script nào tự commit, tự push, hay tự xoá dữ liệu trong `database/`.
- Thêm script mới thì làm đủ cả hai bản `.ps1` và `.sh`, và ghi vào bảng trên.
- Script chỉ phục vụ một loại phòng nằm trong `scripts/phong/<cate>/`, của riêng một kiểu thì
  `scripts/phong/<cate>/<style>/` — cùng tên với `docs/phong/<cate>/` và `client/designs/<cate>-<style>/`
  ([docs/01 §12](../docs/01-quy-uoc.md#12-phân-loại-phòng-loại--kiểu)). Thêm loại phòng mới là thêm một thư mục,
  không sửa script của loại khác.
- Bước chạy trong Blender (`.py`) đi kèm **một** cặp `.ps1`/`.sh` làm cửa chạy chung của mảng đó, không cần một cặp
  cho mỗi file `.py`.
