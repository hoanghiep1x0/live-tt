# Tài liệu kiến trúc — Live Studio

Bộ tài liệu này là **quy ước bắt buộc** cho mã nguồn trong nhánh `quan-ly-thiet-ke`.
Mã cũ ở các nhánh khác không theo quy ước này; nhánh này làm lại từ đầu.

Đọc theo thứ tự:

| # | Tài liệu | Nội dung |
|---|---|---|
| 00 | [Tổng quan](00-tong-quan.md) | Vì sao làm lại, ba tầng, sơ đồ chạy, các quyết định đã chốt |
| 01 | [Quy ước mã](01-quy-uoc.md) | Thư mục, đặt tên, ngôn ngữ, lõi thuần, test, phiên bản |
| 02 | [Hợp đồng](02-hop-dong.md) | `LiveEvent`, `FeedItem`, `Effect`, `ModuleManifest` — type dùng chung |
| 03 | [Viết một module](03-viet-module.md) | Các bước thêm một tính năng mới, có ví dụ đầy đủ |
| 04 | [Viết một thiết kế](04-viet-thiet-ke.md) | Mỗi thiết kế là một gói độc lập có assets riêng |
| 05 | [Backend](05-backend.md) | HTTP, WebSocket, lưu trữ, khoá API, phục vụ OBS |
| 06 | [Lộ trình chuyển đổi](06-lo-trinh.md) | Chuyển từng tính năng từ mã cũ sang, theo thứ tự |

## Ba câu tóm tắt

1. **Thiết kế** là một phòng live hoàn chỉnh, đóng gói riêng, có assets riêng. Một lúc chỉ **một** thiết kế chạy.
2. **Module** là một tính năng cắm thêm. Thiết kế chạy được khi không có module nào; module chỉ thêm khả năng.
3. **Backend** giữ nguồn sự thật duy nhất. Đổi cấu hình là đẩy xuống thiết kế đang chạy, **không tải lại trang**.
