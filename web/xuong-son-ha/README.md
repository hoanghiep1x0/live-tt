# Xưởng Sơn Hà — bản thiết kế sản xuất hình động

Trang tĩnh (HTML/CSS/JS thuần, không build) ghi cách phòng live **Sơn Hà Tiên Lộ** ghép nhiều lớp video thành một khung hình
liền mạch, đổi theo trang phục, đan dược, công pháp: danh mục tài nguyên, kịch bản từng sự kiện, quy trình sản xuất (lời
nhắc ChatGPT / Muse, công cụ), cách dựng game mới. Nội bộ — có lời nhắc và đường dẫn repo, **không** đưa lên mạng chung
với trang truyện `web/son-ha-tien-lo`.

## Xem

Trang đọc ảnh, video thẳng từ `client/designs/tu-tien-son-ha/assets/` (không chép), nên phải mở từ **gốc repo**:

```bash
python -m http.server 8773 --bind 127.0.0.1
```

rồi mở `http://localhost:8773/web/xuong-son-ha/` (hoặc cấu hình `xuong-son-ha` trong `.claude/launch.json`). Sửa file xong mà
trình duyệt còn bản cũ thì tải lại cứng (Ctrl+Shift+R).

## Cập nhật dữ liệu

```bash
node web/xuong-son-ha/cong-cu/xuat-du-lieu.mjs
```

Đọc thẳng `loi/tang-bao.ts`, `loi/the-gioi.ts` (dùng rolldown có sẵn trong repo) + `tranh-goc/chieu-cp/chieu.json` + quét thư
mục tài nguyên → `js/du-lieu.js`. Chạy lại sau mỗi lần thêm món trong game hay làm xong video / tranh mới.

| Tệp | Trang |
|---|---|
| `index.html` | Tổng quan: mô hình tách lớp chạy bằng tài nguyên thật, nguyên tắc hình, bảy luật liền mạch, các lớp trong game, tiến độ |
| `tai-nguyen.html` | Danh mục: 4 nhân vật × 9 trang phục (tranh + 4 video), công pháp, đan dược, nền màn, pet, yêu tinh |
| `kich-ban.html` | Dòng thời gian từng sự kiện (đổi áo, công pháp, đan, thiền, PK, kết trận) |
| `san-xuat.html` | Thông số file, lời nhắc, lệnh `nv-video.py` / `nen-muse.py` / `tien-canh.py`, bảng soát |
| `tai-dung.html` | Dữ liệu tối thiểu, quy ước tên + thứ tự lùi, thư mục, thêm nhân vật / trang phục, đoạn code ghép lớp |

Nguyên tắc chốt với người vận hành (2026-11-23): chuyển động nhân vật làm bằng **video WebM VP9 alpha**, không ảnh động WebP.
Công cụ sản xuất nằm ở `web/son-ha-tien-lo/cong-cu/`.
