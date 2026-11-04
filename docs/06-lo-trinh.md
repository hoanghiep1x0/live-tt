# 06 — Lộ trình chuyển đổi

Chuyển từ mã cũ sang kiến trúc mới, theo thứ tự. Mỗi giai đoạn kết thúc bằng một thứ
**chạy được và xem được**, không có giai đoạn nào chỉ là dọn dẹp.

## Bản đồ: mã cũ → kiến trúc mới

### Thiết kế

| Mã cũ | Thiết kế mới | Nguồn chính |
|---|---|---|
| `kieu-1` Phòng chiếu kể chuyện | `ke-chuyen` | `StagePage.tsx`, `StageView.tsx` (79 KB) |
| `kieu-2` Sân chơi 3D | `san-choi-3d` | `PlaygroundPage.tsx`, `Playground3D.tsx`, `playground.ts` |
| `kieu-3` Sảnh Tích Phước | `tich-phuoc` | `SanhPage.tsx`, `components/charity/` (21 file) |
| — (mới) | `hip-hop` | dựng mới, dùng module `hiphop-dancer` |

`tich-phuoc` chuyển trước tiên trong nhóm thiết kế: `components/charity/` đã **không import gì** từ `lib/`,
nên nó gần như là một thiết kế độc lập sẵn rồi.

### Module

| Module | Nhóm | Nguồn trong mã cũ | Công sức |
|---|---|---|---|
| `gift-thanks` Cảm ơn quà | quick | `giftThanks.ts`, `phrases.ts` | nhẹ — lõi đã thuần |
| `welcome` Chào mừng vào phòng | quick | `botRunner.ts` phần chào, `phrases.ts` | nhẹ |
| `bot-duty` Bot trực phòng | quick | `botRunner.ts` | vừa — bóc hook ra khỏi `botStep`/`botReaction` |
| `tts-mc` AI MC giọng đọc | quick | `tts.ts`, `voiceApi.ts`, `mcStage.ts`, `storyBeat.ts`, `Announcer.tsx` | **nặng** — gọi mạng phải chuyển sang backend |
| `comfort` An ủi | quick | `comfort.ts` | vừa — tiêm 3 hằng ghế thay vì import `session.ts` |
| `hiphop-dancer` Nhân vật hip hop | quick | phần nhảy trong `comfort.ts` (`DANCE_*`, `FLOOR_*`) | vừa — tách khỏi `comfort` |
| `chibi` Nhân vật chibi | quick | `chibi3d.ts`, `ChibiLayer.tsx`, `stageCutout.ts` | nặng — WebGL |
| `music` Nhạc nền | quick | `music.ts` | nhẹ |
| `sfx` Hiệu ứng âm thanh | quick | `sfx.ts` | nhẹ — không phụ thuộc gì |
| `msg-approve` Duyệt tin nhắn | quick | `shoutMod` trong `session.ts` | vừa |
| `announce` Thông báo ghim | quick | `Announcer.tsx` phần chữ chạy | nhẹ |
| `schedule` Lịch phát | quick | `schedule.ts` | nhẹ — đã thuần |
| `autopilot` Tự vận hành | quick | `autopilot.ts`, `aiOperator.ts`, `AiRunner.tsx` | **nặng** — khoá API chuyển sang backend |
| `poll` Bình chọn | quick | `votes`/`voters` trong `session.ts` | vừa |
| `top-givers` Top người tặng | other | `session.ts` | nhẹ |
| `likes-counter` Bộ đếm tim | other | `session.ts` totals | nhẹ |
| `gift-goal` Mục tiêu quà | other | `progress` trong settings | nhẹ |
| `fireworks` Pháo hoa | other | `StageView.tsx` phần `flights` | vừa |
| `word-filter` Lọc từ cấm | other | chưa có, viết mới | nhẹ |
| `quiz` Đố vui | other | chưa có, viết mới | vừa |
| `follow-thanks` Cảm ơn theo dõi | other | `phrases.ts` | nhẹ |
| `raffle` Quay thưởng | other | chưa có, viết mới | nhẹ |

### Không thành module — thuộc nhân hệ thống

| Phần | Về đâu |
|---|---|
| `tiktokMap.ts`, `tiktokFrames.ts`, `bridge.ts`, `desktopLive.ts`, `capture.js` | Backend — nguồn sự kiện (`bridge` **xong**, `webview` chờ Tauri) |
| `session.ts` reducer | **Backend** (`backend/src/session.rs`) — phiên là nguồn sự thật chung, không thể nằm ở một trình duyệt |
| `ledger.ts`, `exportData.ts` | Backend — sổ quà, SQLite |
| `ops.ts`, `gateFor` | `client/shared/contracts` + backend — cổng lệnh |
| `video.ts`, `caseMedia.ts`, `storyAudio.ts` | Backend — kho media |
| `persist.ts`, `sync.ts`, `settings.ts`, `styleConfig.ts`, `roomModules.ts`, `rooms.ts` | **Bỏ hẳn** — backend thay thế |

## Giai đoạn

### GĐ 0 — Khung (chưa có gì chạy được cho người dùng)

- `package.json` gốc với npm workspaces
- `client/shared/contracts` — mọi type ở [02](02-hop-dong.md), kèm test cho schema
- `client/shared/runtime` — bus, registry, vòng đời module, chạy được ở Node
- `backend` — axum server, route `/api/designs`, `/ws`, phục vụ `/d/*` và `/a/*`

Xong khi: `curl http://127.0.0.1:47830/api/designs` trả danh sách rỗng, và `cargo test` xanh.

### GĐ 1 — Lát cắt dọc đầu tiên — phần lớn đã xong

Một thiết kế + vài module chạy thông suốt. Đổi thứ tự so với kế hoạch đầu: làm `ke-chuyen`
trước `tich-phuoc`, vì đó là phòng **đã từng phát live thật**, nên nó mới là bằng chứng.

| Việc | Trạng thái |
|---|---|
| `client/manager` — React + Tailwind + Radix, ba tab, nối backend | **xong** |
| `client/shared/runtime` — gọi móc sự kiện, lọc nhân vật ảo | **xong** |
| `client/shared/stage-sdk` — nối WS, slot, đường dẫn asset | **xong**, phần tối thiểu |
| `client/modules/gift-thanks`, `welcome`, `likes-counter`, `follow-thanks` | **xong**, có test |
| `client/designs/ke-chuyen` — bố cục và assets chuyển từ bản cũ | **xong** phần thiết kế vẽ |
| Lõi phiên ở backend: tổng, ghế, top người tặng, feed | **xong** |
| Nguồn `mau` (giả lập) và `bridge` (TikTok thật qua cầu nối ngoài) | **xong** |
| Nguồn `webview` — tự đọc khung webcast | chưa — cần vỏ Tauri |

Đã chứng minh được: bật phát từ trang quản lý → thẻ đổi trạng thái qua WebSocket, cấu hình
gợi ý của bối cảnh tự nạp, và **đổi cấu hình đẩy xuống phòng đang phát ngay, không tải lại trang**.

Còn thiếu để gọi là xong hẳn: các module có phần vẽ (`stage.tsx`) để những slot đang rỗng
có nội dung, và nguồn `webview` để không cần tiến trình cầu nối ngoài.

### GĐ 2 — Nhóm module nhẹ

Các module có lõi đã thuần hoặc không phụ thuộc gì, chuyển gần như nguyên vẹn:

`welcome`, `sfx`, `music`, `schedule`, `top-givers`, `likes-counter`, `gift-goal`,
`follow-thanks`, `word-filter`, `raffle`, `announce`

Xong khi: trang Tính năng có đủ 11 thẻ này, mỗi thẻ bật tắt và chỉnh nhanh được, mỗi module có test.

### GĐ 3 — Nhóm cần tách

- `bot-duty` — bóc `useBotRunner` ra, giữ `botStep`/`botReaction` thuần
- `comfort` — tiêm `AISLES_X`, `ROW_CURVE`, `ROW_WIDTHS` qua tham số thay vì import `session.ts`
- `hiphop-dancer` — tách phần nhảy khỏi `comfort.ts`, đây là module riêng
- `msg-approve`, `poll` — bóc khỏi reducer phiên
- `fireworks`, `quiz`

### GĐ 4 — Nhóm nặng

- `tts-mc` — chuyển mọi lời gọi API giọng đọc sang `POST /api/tts`; Web Speech giữ làm dự phòng cuối
- `autopilot` — `aiOperator` chuyển sang `POST /api/ai/tick`, bỏ `dangerouslyAllowBrowser`
- `chibi` — WebGL, chú ý giải phóng tài nguyên khi đổi thiết kế

### GĐ 5 — Thiết kế còn lại

- `client/client/designs/ke-chuyen` — tách `StageView.tsx` 79 KB: phần bố cục ở lại thiết kế, phần tính năng ra module
- `client/client/designs/san-choi-3d` — `playground.ts` đã thuần, chuyển thẳng
- `client/client/designs/hip-hop` — dựng mới

### GĐ 6 — Dọn

Xoá `client/` cũ. Chỉ làm khi mọi thiết kế đã chạy được trên kiến trúc mới và đã phát thử live thật ít nhất một phiên.

## 270 test cũ xử lý thế nào

| Nhóm test | Số test | Xử lý |
|---|---|---|
| `session`, `comfort`, `playground`, `lobby`, `ops`, `ai-operator`, `bot-runner`, `voice-api`, `tiktok-frames`, `schedule` | ~180 | **Chuyển theo lõi** sang package tương ứng, sửa đường dẫn import |
| `khung`, `stage-batch`, `cases`, `video`, `ledger`, `voice-sets`, `live-config` | ~70 | Chuyển sang backend hoặc module, viết lại phần chạm I/O |
| `settings`, `room-modules`, `room-styles`, `style-config`, `persist`, `sync`, `stage-visibility` | ~33 | **Nghỉ hưu cùng mã chúng kiểm tra** — các file này bị bỏ hẳn |

Quy tắc: không xoá một test nào trước khi mã nó kiểm tra đã bị xoá hoặc đã có test thay thế ở chỗ mới.

## Rủi ro đã biết

| Rủi ro | Cách giảm |
|---|---|
| Phòng đang live mà đổi cấu hình gây tải lại trang | `onConfig` là bắt buộc; GĐ 1 kiểm chứng điều này trước mọi thứ khác |
| Đọc TikTok dựa vào trang web, TikTok đổi là mù | Giữ nguồn `bridge` làm đường lui, đã có sẵn trong mã cũ |
| Thiết kế nặng ăn hết máy | Một lúc một thiết kế; mỗi thiết kế khai báo mức giảm chất lượng |
| Chuyển dở dang, hai kiến trúc cùng tồn tại lâu | Mỗi giai đoạn phải chạy được; không bắt đầu GĐ sau khi GĐ trước chưa xem được bằng mắt |
| Ổ C: hết dung lượng khi cài gói | Kiểm tra trước GĐ 0; `node_modules` nằm trên ổ D cùng repo |
