# database/

Dữ liệu lâu dài của app. **Một cơ sở dữ liệu dùng chung cho cả dev và production** —
không tách hai bản, để số liệu đối soát không bị lệch.

```
database/
├─ schema.sql          định nghĩa bảng, là nguồn sự thật của cấu trúc
├─ migrations/         mỗi thay đổi một file, đánh số tăng dần
│  └─ 001-khoi-tao.sql
├─ live.sqlite         (không commit) file dữ liệu thật
├─ designs/            (không commit) cấu hình từng thiết kế
│  └─ <design-id>/config.json
└─ secrets.json        (không commit) khoá API, chỉ backend đọc
```

## Quy tắc

- **Commit**: `schema.sql`, `migrations/*.sql`, `README.md`.
- **Không commit**: `*.sqlite`, `designs/`, `secrets.json` — chứa số liệu thật và khoá.
- Migration **chỉ thêm**, không sửa file đã có. Đã chạy ở máy khác rồi thì không sửa được nữa.
- Đặt tên migration: `<số thứ tự 3 chữ số>-<việc gì>.sql`, ví dụ `002-them-bang-binh-chon.sql`.
- Sổ quà **chỉ thêm, không sửa, không xoá**. Lệnh "Reset dữ liệu" trên thẻ thiết kế
  xoá phiên nhưng không đụng tới sổ quà.
- Ghi file cấu hình phải qua `.tmp` rồi `rename`, không ghi đè trực tiếp.

## Vì sao SQLite cho sổ quà nhưng JSON cho cấu hình

Sổ quà cần truy vấn theo ngày, theo thiết kế, và giữ lâu dài để đối soát với TikTok.
Cấu hình thì ít, cần đọc và sửa được bằng mắt khi gỡ lỗi, nên để JSON.
