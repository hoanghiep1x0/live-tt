# scripts/

Script thực thi được. Mỗi việc có **một cặp**: `.ps1` cho Windows và `.sh` cho bash,
làm đúng cùng một việc.

```
scripts/
├─ kiem-tra.ps1 / .sh    typecheck + test, chạy trước khi commit
├─ chay-dev.ps1 / .sh    bật trang quản lý và backend
└─ dung-db.ps1  / .sh    tạo database từ migrations
```

## Quy tắc

- Script phải **chạy được từ bất kỳ thư mục nào** — tự tìm gốc dự án, không giả định thư mục hiện tại.
- Thất bại thì **thoát với mã khác 0**. Không nuốt lỗi.
- File tạm trong lúc chạy ghi vào `.tmp/`, không ghi vào `scripts/` và không ghi ra gốc dự án.
- Không script nào tự commit, tự push, hay tự xoá dữ liệu trong `database/`.
- Thêm script mới thì làm đủ cả hai bản `.ps1` và `.sh`, và ghi vào bảng trên.
