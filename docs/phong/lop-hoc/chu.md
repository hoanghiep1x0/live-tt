# Kiểu `chu` — Lớp học chữ (`lop-hoc-chu`)

## Bố cục

Khung 1080×1920 (tấm vẽ co giãn bằng `transform: scale`, không dùng CSS `zoom` — chủ kênh cũ thử và thấy mờ trên live).
Nền `assets/bg/lop.webp` là ảnh 941×1672 phóng lên 1080 ngang; mọi toạ độ trong module (`ROWS`, bảng đen 350·262 555×348,
bục) đo trên ảnh này. **Thay nền khác kích thước là lệch chỗ ngồi.**

Chỉnh so với bản cũ (chủ kênh mới yêu cầu, 2026-11-06), toạ độ ở `client/modules/do-chu/src/view/GameStage.tsx`:

- Nội dung bảng đen lùi trái 350 → **310** (khỏi sát cột Quỹ lớp ở x 904); cô giáo 86 → **56**. Khung Nhanh nhất / Top 5,
  dòng nhắc, chỗ đứng phạt, chỗ đưa hoa, tay cô (quà bay) dịch theo; màn chờ và đuôi bong bóng MC của thiết kế cũng vậy.
- Học sinh đứng phạt hạ chân 880 → **905** cho đầu khỏi chạm dòng "Gõ đáp án vào bình luận".
- Ba bảng phụ **hiện theo nhịp** chứ không đứng cả buổi (chu kỳ 60 giây theo giờ máy, mọi cửa sổ thấy cùng lúc):
  "Học sinh xuất sắc" giây 0–20 (và luôn hiện lúc điểm danh giữa tiết, tổng kết); "Quỹ lớp" + "Gửi tặng cô" giây 30–45;
  "Quỹ lớp" lên thêm 8 giây sau mỗi món quà và lúc đạt mốc quỹ. Hằng số ở `NHIP_BANG`, `hienXuatSac`, `hienQuy`.

| Slot | Chỗ | Ai cắm |
|---|---|---|
| `full` | Phủ cả tấm 1080×1920 | Module `do-chu` (xin `trongSuot` để thiết kế cất màn chờ trên bảng đen) |
| `ticker` | Dải dưới dãy bàn thứ tư (y 1640) | Module dải chữ, nếu bật |

Không gợi ý `gift-thanks`/`welcome`: cô giáo đã tự cảm ơn quà và chào "vào lớp" — bật thêm là cảm ơn hai lần.

## Cài đặt lớp

Bắt kịp bảng "🏫 Cài đặt lớp" của bản cũ (commit `b3d3355`, 2026-11-06). Bản cũ lưu ở `settings.json` và đẩy sự kiện `roomCfg`; ở đây là ô cấu hình của module `do-chu`, đổi giữa lúc live là sân khấu đổi ngay.

| Ô | Mặc định | Làm gì |
|---|---|---|
| `tenCo` "Tên cô giáo" | `Cô Ngân` | Bảng tên trên ngực và câu cô tự xưng tên: lời thoại viết sẵn "cô Ngân" đọc theo tên mới (`Classroom.t()`), các chữ "cô" khác và ảnh nhân vật giữ nguyên — đặt "Thầy …" thì cô vẫn xưng "cô". Để trống là tên gốc. |
| `khauHieu` "Chữ bảng đỏ" | `NGHE HẾT ĐỀ – GÕ MỚI ĂN ĐIỂM` | Dòng khẩu hiệu trên bảng đen, tối đa 40 ký tự. Phần vẽ đo chữ ở cỡ 38, rộng hơn câu gốc (656 px) thì thu nhỏ cho vừa — bảng đỏ không lấn sang bảng Tổ thi đua. |
| `everest`, `chuong` | bật cả 2 | Thay ô `gameLon` cũ. Xen kẽ 2 game, game nào tắt thì bỏ qua (`Classroom.nextKind()` đọc `GAME.showsOn`); tắt cả 2 thì tới lượt game lớn là ra chơi, bảng Sự kiện ẩn. Game đang chơi dở vẫn chơi hết; nút Everest / Rung Chuông Đồng trên thẻ vẫn chơi ngay được. |
| `nenLop` "Nền lớp học" | trống | Ảnh dọc 9:16 phủ lên nền gốc của thiết kế. Ảnh riêng không có bảng đen nên lớp tự vẽ 1 tấm (x 292, y 244, 592×384) ôm nội dung bảng. |

Giọng nữ / nam của bản cũ không cần ô riêng: ô "Giọng cô giáo" (`voiceId`) đã chọn được mọi giọng trong dàn giọng. Lời dặn MC (`mc-dan.md`) vẫn viết "cô Ngân" — đổi tên cô thì sửa luôn file đó nếu bật MC.

## Đứng ngoài cửa khi hết ghế (tuỳ chọn, mặc định TẮT)

Ô "Đứng ngoài cửa khi hết ghế" của module. Bật thì 22 bạn sau ghế thứ 30 (`DUNG_CUA`) đứng **ngoài hành lang** hai cửa
bên, ló vào như xin vào lớp — vẫn chơi và tính điểm; bạn sau nữa hiện ở "chờ vào lớp". Bản cũ (`4a96d61`) cho đứng dọc
vách trong lớp, chủ kênh bỏ ở `e8efab5`; chủ kênh mới muốn đứng ngoài cửa.

- Mỗi cửa 11 chỗ (`CUA_TRAI`, cửa phải lật ngang): 9 bạn ngoài hành lang, 3 hàng xa → gần, cắt theo khung cửa
  (`clip-path` `KHUNG_TRAI` / `KHUNG_PHAI` — tường và ngưỡng cửa che như thật); 2 bạn chớm qua ngưỡng, không cắt,
  rảnh thì vẫy / giơ tay xin vào, có bảng tên (bảng bạn đứng sau nâng một tầng).
- Hình học đo trên ảnh nền: khung cửa trái x ~117, chân khung y ~769, ngưỡng chéo tới (0, 970); cửa phải đối xứng
  (khung ~965). **Thay ảnh nền là phải đo lại.**
- Bảng "Top tương tác" ở chỗ cũ (842, 616) che đúng cửa phải, nên khi ô này bật bảng lên **góc trái trên** (10, 10),
  gọn 4 dòng cho khỏi đè bảng khẩu hiệu. Tắt ô là bảng về chỗ cũ.

## MC do AI dẫn — cô giáo trò chuyện

Cùng bộ máy MC của phòng kể chuyện (`backend/src/ai.rs`), khác đúng lời dặn: `design.json` khai `"mc": { "dan":
"mc-dan.md" }`, máy chủ đọc file đó thay cho lời dặn kể chuyện (`AppState::dan_mc`, lùi về lời dặn gốc nếu thiếu file).
Phòng kể chuyện không khai gì nên vẫn chạy y như cũ — hai thiết kế không dùng chung file nào.

- Vai: cô Ngân (hồ sơ nhân vật ở đầu `loi-thoai.ts`), chỉ **trò chuyện xen giữa** — máy đố chữ đã tự đọc đề, chấm điểm,
  cảm ơn quà, chào "vào lớp".
- Luật vàng trong lời dặn: không gợi ý đáp án, **không nhắc lại bình luận của khách** (có thể là đáp án), không nói ai
  đúng/sai/điểm, không ra câu đố riêng (khách sẽ gõ trả lời làm rối chấm điểm), không mời tặng quà.
- Hiện: bong bóng thoại trên đầu cô giáo (`.lop-mc`, chỗ bảng "Học sinh xuất sắc" — đè tạm vài giây, không che bảng đen).
- Giọng: dàn giọng chung (thẻ "Giọng đọc" ở bảng xem) + ô giọng của thẻ MC. Nên chọn trùng giọng cô ở thẻ module.
- Chung hàng đọc với cô giáo: câu chương trình của module (đọc đề, đáp án, tổng kết) đi hàng **ưu tiên**, chen trước câu MC
  và không bị bỏ khi hàng đầy; trong lúc ai đang đọc thì đồng hồ câu hỏi dừng như khi cô đọc đề.
- Bật ở thẻ "MC do AI dẫn" của bảng xem (`TINH_NANG_HE.mc` có `lop-hoc`). Tốn tiền API theo nhịp — sổ chi phí ở góc bảng xem.

## Nhân vật ảo

`crowd` khai câu nói của lớp ("câu này khó ghê", "cô ơi cho gợi ý với"…). Người vận hành bật ở thẻ "Nhân vật ảo"
(`TINH_NANG_HE.nhanVatAo` có `lop-hoc`). Trong lớp họ **chỉ ngồi và nói chuyện** (chủ kênh chốt):

| Có | Không |
|---|---|
| Vào phòng là có ghế, luôn ngồi **sau** bạn thật | Trả lời câu hỏi — gõ trúng đáp án cũng không tính |
| Bình luận hiện thành bong bóng trên đầu | Điểm, bảng nhanh nhất, lớp trưởng, bảng vàng, học bạ, sổ lớp |
| Rời phòng là trả ghế | Tổ thi đua, điểm danh chuyên cần, thả tim (tim ảo bị runtime lọc) |
| | Bị cô gọi tên (kiểm tra miệng, gọi ngủ gật), tính vào "số bạn đang chơi" hay "chờ vào lớp" |

Bật đám đông thì chân màn có dòng **"Lớp có nhân vật minh họa"** (`Stage.tsx`). Lối riêng trong máy lớp học:
`Classroom.virtualIn` / `virtualOut`; móc `join`/`leave` của module chỉ dùng cho nhân vật ảo.

## Chạy thử

```
npm run build -w @live/design-lop-hoc-chu
http://127.0.0.1:47830/d/lop-hoc-chu/          (bật module "Lớp học đố chữ" ở bảng xem hoặc trang quản lý)
```

Sửa class Tailwind trong `client/modules/do-chu/src/view/*.tsx` thì chạy `scripts/phong/lop-hoc/tao-css.sh` rồi build lại.
Thêm câu hỏi: thêm/sửa `client/modules/do-chu/src/lop/cau-hoi/*.txt` (cú pháp ở đầu `questions.ts`), chạy
`npx vitest run tests/client/modules/do-chu/bank.test.ts`, rồi build lại thiết kế.
