# 07 — Cầu nối TikTok: app tự bật, không phụ thuộc trình duyệt

Tài liệu này chốt cách Live Studio lấy dữ liệu live realtime (bình luận, tim, quà,
người vào phòng, số người xem) **không qua trình duyệt nào**. Trình duyệt trong app
chỉ dùng để tạo ảnh (muse.ai) và đăng nhập tài khoản — không nằm trên đường dữ liệu live.

Đọc cùng: [00 — Tổng quan](00-tong-quan.md) §4.1, [02 — Hợp đồng](02-hop-dong.md) §2,
[05 — Backend](05-backend.md) §6.

## 1. Quyết định

| Quyết định | Lý do |
|---|---|
| **Không dùng đường webview** (chép khung từ trang TikTok trong app) | Phụ thuộc trình duyệt: trang phải mở, phải vào được phòng, TikTok đổi trang là mù. Bản cũ (`D:\Live`) chạy đường này thì không ổn định. |
| **Dùng cầu nối Node** (`tiktok-live-connector`) — đúng thứ đang chạy được với live thật | Nối thẳng tới máy chủ TikTok, không cần trang nào mở, không cần đăng nhập. Thư viện có cộng đồng cập nhật khi TikTok đổi giao thức. |
| **Backend tự bật, giám sát, tắt cầu nối** | Người vận hành không phải tự chạy một cửa sổ lệnh trước mỗi buổi live. |
| **Giữ nguyên nguồn `bridge` và giao thức JSON của nó** | Backend đã đọc đúng giao thức này (`backend/src/source/bridge.rs`, 9 test). Đổi giao thức là đổi điểm chạm, không cần. |
| **Không viết lại bằng Rust** (lúc này) | Phải tự giải protobuf, tự xin chữ ký, tự theo kịp mỗi lần TikTok đổi. Để sau, nếu Node trở thành gánh nặng. |

Cả hai cách (Node hay Rust) đều cần **máy chủ ký Euler Stream** (bên thứ ba): TikTok bắt địa
chỉ kết nối phải có chữ ký. Bản miễn phí có giới hạn; khoá `EULER_API_KEY` nới giới hạn.

Giả định (chưa xác nhận với người vận hành): **một kênh mỗi lần phát**, app chạy trên
**chính máy phát live** (máy này có Node 24.19). Cầu nối vốn hỗ trợ nhiều kênh nên giả định
sai cũng không phải viết lại, chỉ dễ chạm giới hạn ký miễn phí hơn.

## 2. Luồng dữ liệu

```
máy chủ TikTok ──WebSocket──▶ cầu nối Node (tiến trình con, 127.0.0.1:8787)
                                 │  tiktok-live-connector giải protobuf
                                 │  map.ts chuẩn hoá → JSON đúng LiveEvent
                                 ▼
                       backend Rust — nguồn `bridge` (client WebSocket)
                                 │  doc_tin → ap_su_kien / dat_nguoi_xem
                                 ▼
                       phiên → FeedItem → broadcast WS → thiết kế, trang quản lý
```

Khớp §4.1 của tài liệu tổng quan ở mọi bước sau "chuẩn hoá thành LiveEvent". Khác duy nhất:
khâu giải mã nằm trong tiến trình con Node thay vì Rust — được ghi rõ ở đây và ở 05 §6.

## 3. Bố trí mã

| Chỗ | Việc |
|---|---|
| `backend/cau-noi/` | Gói Node của cầu nối (workspace npm `@live/cau-noi`). Chuyển từ `D:\Live\tools\bridge`. Nằm dưới `backend/` vì nó là phần máy chủ, không chạy trong trình duyệt (01 §1). |
| `backend/cau-noi/src/server.ts` | Máy chủ cầu nối: mỗi nick một kết nối, nối lại, quá hạn 30 giây, ngắt sau 30 giây không ai nghe, `GET /status`. |
| `backend/cau-noi/src/map.ts` | Ánh xạ thuần tin TikTok → JSON `LiveEvent` (chuyển từ `D:\Live\client\src\lib\tiktokMap.ts`). Không I/O. |
| `backend/src/source/tien_trinh.rs` | Rust: bật / giám sát / tắt tiến trình con `node`. |
| `tests/backend/cau-noi/map.test.ts` | Test ánh xạ (vitest, Node). Soi gương mã nguồn (01 §3). |

Bỏ khi chuyển (đã có chỗ khác làm, giữ lại là trùng):

- `--mock`: backend đã có nguồn `mau`.
- `POST /agent` và tin `pulse`: lệnh phòng đi qua `POST /api/command` + cổng duyệt của backend.

Ghim phiên bản chính xác trong `package.json` (`tiktok-live-connector` `2.5.0`, `ws` `8.22.1` — đúng
bản đang chạy ở D:\Live), không dùng `^`.

## 4. Backend tự bật cầu nối

Tiến trình con chỉ chạy **khi nguồn là `bridge` và `url` là địa chỉ mặc định**
(`ws://127.0.0.1:8787/ws/live`). Người dùng trỏ `url` sang cầu nối của riêng họ thì backend
không bật gì — giữ đúng hành vi hiện nay.

| Việc | Cách làm |
|---|---|
| Kiểm tra trước khi bật | Hỏi `GET http://127.0.0.1:8787/status`. Có cầu nối đang sống (vd bản D:\Live còn chạy) thì **dùng lại**, không bật thêm — tránh hai tiến trình tranh một cổng. |
| Bật | `node backend/cau-noi/src/server.ts`, thư mục làm việc `backend/cau-noi`, biến môi trường `PORT=8787`, `HOST=127.0.0.1`, `EULER_API_KEY` (nếu có). |
| Không hiện cửa sổ đen | Windows: cờ `CREATE_NO_WINDOW` (`0x08000000`) khi tạo tiến trình. |
| Nhật ký | Đọc stdout/stderr của tiến trình con, ghi qua `tracing` (mức info / warn). |
| Chết giữa chừng | Bật lại, chờ giãn dần 2 → 30 giây. Ghi lỗi nguồn (`dat_loi_nguon`) bằng câu dễ hiểu. |
| Đổi nguồn / tắt app | Theo cơ chế thế hệ nguồn (`the_he_nguon`) như `mau` và `bridge`: thế hệ đổi thì tắt tiến trình con. Tắt app thì `kill_on_drop`. Không để sót tiến trình mồ côi giữ cổng 8787. |
| Thiếu Node / Node cũ | `node --version` < 23.6 hoặc không có `node` → lỗi nguồn: "Cần cài Node.js 23.6 trở lên để lấy dữ liệu live". Không sập backend. |
| Thiếu thư viện | Chưa `npm install` → lỗi nguồn nói rõ cần chạy `npm install` ở gốc dự án. |

Cần bật feature `process` cho `tokio` trong `backend/Cargo.toml`.

## 5. Khoá Euler Stream

Theo 05 §5: **mọi khoá ở `database/secrets.json`, chỉ backend đọc**. Backend đọc khoá Euler
rồi truyền cho tiến trình con qua biến môi trường `EULER_API_KEY`. Kho hiện chỉ biết kết nối
AI (`ProviderKind` = `openai` / `anthropic` / `elevenlabs`), nên khoá Euler cất ở một mục
riêng, **không** nhét thành một "kết nối AI" giả — làm vậy nó sẽ hiện trong hộp Kết nối AI và
lọt vào `GET /s/providers`. Ghi cách cất vào 05 §5. Không bao giờ ghi khoá vào file cấu hình nguồn, vào URL hay xuống client.
Không có khoá vẫn chạy (giới hạn miễn phí). Cầu nối **không** bật `authenticateWs` — tuỳ
chọn đó gửi cookie đăng nhập TikTok cho máy chủ ký bên thứ ba.

## 6. Lấy dữ liệu đúng — luật phải giữ

Đã đối chiếu với schema `tiktok-live-proto` v3 mà `tiktok-live-connector@2.5.0` dùng
(`WebcastGiftMessage.repeatCount / repeatEnd / gift.type / gift.combo / gift.diamondCount /
gift.name`, `WebcastLikeMessage.count / total`, `WebcastRoomUserSeqMessage.total / totalUser`).

| Luật | Ở đâu |
|---|---|
| Bỏ tin dồn lại trước lúc nối: `processInitialData: false` | `server.ts` |
| Bỏ tin cũ hơn lúc mở kết nối 3 giây | `bridge.rs` (`KHOAN_DUNG_MS`, đã có) |
| Quà nhấn giữ (`gift.type == 1` hoặc `gift.combo`): **chỉ nhận tin `repeatEnd == 1`**, số lượng = `repeatCount` — không thì một món bị đếm nhiều lần | `map.ts` |
| Xu mỗi món = `gift.diamondCount` | `map.ts` |
| Tim: gửi kèm `total` (tổng cả phiên của TikTok); backend lấy `max`, không cộng dồn mù | `map.ts` + `session.rs` (đã có) |
| Số người đang xem = `total`, **không** lấy `totalUser` (tổng lượt ghé); phòng vắng thật là 0 | `map.ts` |
| Người: nick (`displayId` / `uniqueId`) làm khoá, tên hiển thị, ảnh đại diện `https` đầu tiên | `map.ts` |
| Một tin hỏng không làm sập nguồn | `map.ts` trả `null`; `bridge.rs` bỏ tin hỏng (đã có) |
| Phiên live kết thúc → `{type:'status', state:'offline'}` → backend dọn phòng (`don_phong`) | `server.ts` + `bridge.rs` (đã có) |
| Nút "Kết nối Studio" chỉ sáng xanh khi **đang thật sự nhận** dữ liệu: chỉ trạng thái `dang-live` mới xoá lỗi nguồn; `dang-noi` là "đang nối…", chưa xanh | `bridge.rs` — đổi luật này, có test |

## 7. Trang quản lý

- **Nút "Kết nối Studio"** trên thẻ phòng: lấy nick từ link (`nickTuLink`), gọi
  `PUT /api/source { kind: 'bridge', channel: nick, url: <url hiện tại> }`. **Không mở trang
  TikTok** nữa — dữ liệu không cần trang nào. Chạy được cả trong app lẫn trình duyệt thường.
- **Đổi nguồn ở thanh trên** (`doiNguon`): gửi kèm `channel` và `url` đang có. Hiện nó chỉ
  gửi `{kind}` nên kênh bị xoá trắng mỗi lần đổi.
- **Trạng thái nguồn cập nhật ngay**: backend phát tin WS mới `{ t: 'source', source }`
  (thêm vào `Down` trong `client/shared/contracts/src/wire.ts`, **sửa 02 — Hợp đồng trước**)
  mỗi khi cấu hình hoặc lỗi nguồn đổi. Trang quản lý cập nhật `nguon` từ tin này thay vì chỉ
  đọc một lần lúc tải trang.
- Nhãn nguồn `bridge` hiện "TikTok (cầu nối)".

## 8. Kiểm tra

- `cargo test` trong `backend/` — xanh, trừ `giong-doc::dia_chi_nha_cung_cap_la_bi_tu_choi`
  đang hỏng từ trước (kho khoá, không liên quan).
- `npm test`, `npm run typecheck` — xanh.
- Test mới tối thiểu: `map.test.ts` (chat, tim có total, quà giữa chuỗi bị bỏ / cuối chuỗi
  được nhận, quà thường, số người xem `total` vs `totalUser`, thiếu nick → bỏ); Rust: luật
  trạng thái mới, quyết định "dùng lại / bật mới / không bật" của `tien_trinh.rs` (tách thành
  hàm thuần), thông báo khi thiếu Node.
- Thử thật: tắt cầu nối D:\Live, mở app, dán link live của một kênh đang phát, bấm
  "Kết nối Studio" → nút xanh, 👥 / ❤ / 🎁 trên thanh trên chạy, bình luận hiện ở feed.
  So số người xem với chính trang TikTok.

## 9. Rủi ro đã biết

- `tiktok-live-connector` không chính thức: TikTok đổi giao thức là có thể hỏng → cập nhật thư viện.
- Máy chủ ký Euler giới hạn bản miễn phí → nối lại dồn dập có thể bị chặn tạm; có khoá thì nới.
- Bản đóng gói cài sang máy khác cần Node trên máy đó (hoặc gói kèm `node.exe`, ~80 MB) — chưa làm.

## 10. Hiện trạng (đã làm)

| Phần | Chỗ |
|---|---|
| Gói cầu nối, ghim `tiktok-live-connector` 2.5.0, `ws` 8.22.1 | `backend/cau-noi/` (workspace npm, `tsconfig.json` riêng, có trong `npm run typecheck`) |
| Tự bật / dùng lại / bật lại giãn dần / tắt khi đổi nguồn | `backend/src/source/tien_trinh.rs` (hàm thuần `quyet_dinh`, `kiem_node`, `la_cau_noi_song`, `kiem_ma_nguon` có test) |
| Chống tiến trình mồ côi | `kill_on_drop` + backend giữ stdin, cầu nối chạy với `CAU_NOI_THEO_CHA=1` tự tắt khi stdin đóng |
| Lỗi tiến trình ở ô riêng, thắng lỗi nối của client | `AppState::dat_loi_tien_trinh` |
| Chỉ `dang-live` mới xanh | `bridge::loi_theo_trang_thai` (có test) |
| Tin WS `{ t: 'source' }` khi nguồn đổi | `AppState::phat_nguon`, `Down` trong `wire.ts`, trang quản lý `store.ts` |
| Khoá Euler ở mục riêng `_cau-noi` của `secrets.json`, `GET`/`PUT /api/source/khoa` | `secrets.rs` (có test), 05 §5 |
| "Kết nối Studio" gọi `PUT /api/source`, không mở trang TikTok; `doiNguon` giữ kênh và url | `DesignCard.tsx`, `store.ts` |
| Test ánh xạ | `tests/backend/cau-noi/map.test.ts` |

Mã nguồn `webview` (backend + vỏ desktop) còn đó nhưng không còn nằm trên đường nào của trang quản lý.
Chưa có ô nhập khoá Euler trên trang quản lý — đặt qua `PUT /api/source/khoa`.
