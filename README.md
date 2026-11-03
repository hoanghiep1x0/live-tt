# Live Studio

Phòng live TikTok có nhiều **thiết kế** (mỗi thiết kế là một phòng hoàn chỉnh, đóng gói riêng)
và các **module** tính năng cắm thêm (cảm ơn quà, bot trực phòng, AI MC giọng đọc…).

Một lúc chỉ một thiết kế chạy. Mọi cấu hình đổi được giữa lúc đang live, không tải lại trang.

## Bắt đầu

```bash
npm install
cp .env.example .env
./scripts/kiem-tra.sh
```

Trên Windows dùng `scripts\kiem-tra.ps1`.

## Cây thư mục

| Thư mục | Chứa gì |
|---|---|
| `client/` | Mọi thứ chạy trong trình duyệt |
| `client/manager/` | Trang quản lý: Trình duyệt · Thiết kế · Tính năng |
| `client/shared/` | Dùng chung: contracts, runtime, stage-sdk, ui |
| `client/modules/` | Mỗi tính năng một thư mục |
| `client/designs/` | Mỗi thiết kế một thư mục, có assets riêng |
| `backend/` | Tauri + Rust: HTTP server, webview TikTok, nguồn sự thật |
| `tests/` | Toàn bộ test, cây soi gương với `client/` |
| `database/` | Schema, migrations, dữ liệu lâu dài (dev dùng chung production) |
| `scripts/` | Script thực thi, mỗi việc một cặp `.ps1` và `.sh` |
| `docs/` | Tài liệu, kế hoạch, đặc tả |
| `design/` | Bản mẫu HTML của giao diện quản lý |
| `.tmp/` | Rác, xoá được bất cứ lúc nào |
| `.env.example` | Mẫu biến môi trường |

## Tài liệu

Đọc [docs/README.md](docs/README.md) trước khi sửa mã. Bộ tài liệu đó là quy ước bắt buộc,
không phải ghi chú tham khảo.

Thêm một tính năng là **thêm một thư mục** trong `client/modules/`. Nếu bạn thấy mình
phải sửa file ở nơi khác thì kiến trúc đã sai — báo lại thay vì vá.
