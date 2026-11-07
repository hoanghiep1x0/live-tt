# Loại phòng: Lớp học (`lop-hoc`)

Phòng live dạng lớp học 2D: cô giáo đứng bục, bảng đen ra câu đố, người xem bình luận là "vào lớp" — có tên, có ghế,
gõ đáp án vào bình luận để ghi điểm. Điểm cao ngồi bàn đầu. Mỗi **kiểu** là một lớp khác nhau (môn khác, cô giáo khác,
nền khác) trên cùng cơ chế đó.

Chuyển từ repo riêng [lop-hoc-chu](https://github.com/workaipvlinh-byte/lop-hoc-chu) (Node + Express + React, chạy riêng
cổng 3006). Luật chơi và các quyết định của chủ kênh bản cũ nằm ở `CLAUDE.md` của repo đó — giữ nguyên, không viết lại ở đây.

## Các kiểu

| Kiểu (`style`) | Thiết kế | Bối cảnh | Đặc tả |
|---|---|---|---|
| `chu` | `client/designs/lop-hoc-chu/` | Lớp học chữ: bảng đen, bục cô Ngân, 4 dãy bàn dài (7·7·8·8 = 30 ghế) | [chu.md](chu.md) |

## Thiết kế và module

Đúng quy ước 04 §1, phòng tách làm hai:

| Phần | Ở đâu | Làm gì |
|---|---|---|
| **Thiết kế** `lop-hoc-chu` | `client/designs/lop-hoc-chu/` | Nền lớp (`assets/bg/lop.webp`), khung 1080×1920 co giãn, màn chờ trên bảng đen, slot `full` + `ticker`, câu nói của nhân vật ảo (`crowd`). Không bật module nào vẫn lên hình. |
| **Module** `do-chu` (Lớp học đố chữ, `room: 'lop-hoc'`) | `client/modules/do-chu/` | Toàn bộ game: cô giáo, học sinh, câu đố, ra chơi, 2 game lớn, sổ lớp. Ảnh nhân vật là asset của module (`/m/do-chu/nv/…`). |

Trong module:

| File | Vai |
|---|---|
| `src/lop/*.ts` | Máy lớp học chuyển gần nguyên vẹn (`Classroom` ở `quiz.ts`, lời cô `loi-thoai.ts`, số liệu `config.ts`, ~2.500 câu ở `cau-hoi/*.txt`). Thuần: giờ và ngẫu nhiên tiêm vào. |
| `src/core.ts` | Nối máy lớp học vào runtime: móc feed (bình luận, quà, tim, theo dõi), nhịp giọng, nút trên thẻ, cấu hình nóng. |
| `src/so-lop.ts` | Sổ lớp (câu đã hỏi, bảng vàng tuần, chuyên cần, học bạ, quỹ hoa) — bản cũ máy chủ Node tính, nay là hàm thuần. |
| `src/stage.tsx` → `src/view/LopHoc.tsx` | Phần vẽ nạp lười (chỉ phòng lớp học tải ~460 KB). Nạp bộ câu + sổ, cất sổ, tiếng động, vẽ `GameStage`. |
| `src/view/lop.css` → `lop.gen.css` | Class Tailwind của bản cũ, dựng sẵn và gói dưới `.dc-root` bằng `scripts/phong/lop-hoc/tao-css.sh`. |

### Khác bản cũ ở đâu

| Bản cũ | Ở đây |
|---|---|
| `tiktok-live-connector` trong server Node | Feed của backend (`LiveEvent` → `FeedItem`), cùng mọi nguồn khác |
| Giọng Edge gọi thẳng, có callback "đọc xong" | Effect `say` qua hàng giọng chung; lõi biết cô đọc xong bằng `ctx.dangNoi` (thêm vào hợp đồng `Ctx`) |
| `F:` / `E:` / `^` trong lời thoại | `chuMieng()` đổi sang dàn giọng: đoạn `E:` đọc bằng ô "Giọng đọc từ tiếng Anh" (`[id] … [-]`) |
| `data/so-lop.json` + `/api/game/save`, `/api/game/attend` | Lõi giữ sổ trong state; phần vẽ cất cả sổ vào `GET/PUT /s/so/<thiết kế>/do-chu` (`backend/src/so.rs`) 20 giây một lần — chỉ ở trang của phòng **đang phát** và đang giữ quyền nói |
| Trang điều khiển: nút Tiết mới, Bỏ câu, Ra chơi, game lớn, Chào tạm biệt | `actions` trên thẻ module |
| Ô "Tên lớp", nhịp câu, chế độ nhanh, chia tổ, game lớn | Ô cấu hình module, đổi giữa lúc live không tải lại |
| Bảng "🏫 Cài đặt lớp" (b3d3355): tên cô, giọng HoaiMy/NamMinh, chữ bảng đỏ, bật tắt Everest / Rung Chuông Đồng, tải ảnh nền lên `data/nen-lop/` | Ô cấu hình module: "Tên cô giáo", "Chữ bảng đỏ", 2 công tắc game, "Nền lớp học" (ô `media`: dán, tải lên, nhờ AI vẽ). Giọng thì đã có ô "Giọng cô giáo" chọn trong cả dàn giọng ([chu.md](chu.md#cài-đặt-lớp)) |
| `DATA_DIR` để chạy thử không đụng sổ thật | Ô "Ghi sổ lớp" (tắt khi chạy thử) |

## Trạng thái

| Việc | Trạng thái |
|---|---|
| Thiết kế, module, sổ lớp, route `/s/so`, test (`tests/client/modules/do-chu/`, 63 test) | **xong** |
| Nhân vật ảo ngồi lớp và nói chuyện, không trả lời, không điểm, có dòng minh bạch ([chu.md](chu.md#nhân-vật-ảo)) | **xong** |
| Đứng ngoài cửa khi hết ghế — tuỳ chọn, mặc định tắt ([chu.md](chu.md#đứng-ngoài-cửa-khi-hết-ghế-tuỳ-chọn-mặc-định-tắt)) | **xong** |
| MC do AI dẫn: cô giáo trò chuyện, lời dặn riêng `mc-dan.md` ([chu.md](chu.md#mc-do-ai-dẫn--cô-giáo-trò-chuyện)) | **xong** — chưa chạy với khoá API thật |
| Trang báo cáo sau buổi (`/bao-cao`, người xem theo từng phần) | chưa chuyển — `reportLog` đang bị bỏ |
| Ô chúc sinh nhật theo tên, đọc câu tự gõ, chỉnh tốc độ giọng ở trang điều khiển cũ | dùng lệnh `say` chung / dàn giọng; ô sinh nhật theo tên chưa có |
| Cài đặt lớp: tên cô, chữ bảng đỏ, bật tắt từng game lớn, nền riêng — bắt kịp bản cũ tới `b3d3355` (2026-11-06) ([chu.md](chu.md#cài-đặt-lớp)) | **xong** |
| Ảnh nhân vật, nền | bản của tác giả repo gốc — README gốc dặn kênh khác nên thay ảnh riêng |
