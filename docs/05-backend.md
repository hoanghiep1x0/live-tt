# 05 — Backend

Backend nằm trong `backend/` (Rust). Không có server ngoài, không có cloud.
Nó là **nguồn sự thật duy nhất**: cấu hình, phiên, sổ sách, khoá API đều ở đây.

## 0. Hiện trạng

Tài liệu này mô tả đích đến. Phần đã dựng và phần còn lại:

| Hạng mục | Trạng thái |
|---|---|
| HTTP server, chặn Host/Origin/token | **xong** |
| Phục vụ `/d/<id>/` và `/a/<id>/` cho OBS, chặn thoát thư mục | **xong** |
| Sổ thiết kế, quét `design.json`, báo thiết kế chưa build | **xong** |
| Một thiết kế một lúc, trả `409` kèm tên cái đang chạy | **xong** |
| Cấu hình module theo thiết kế, ghi nguyên tử | **xong** |
| WebSocket đẩy cấu hình xuống ngay, không tải lại trang | **xong** |
| Phục vụ `/m/<id>/` — assets riêng của module | **xong** |
| Đổi tên thiết kế, link Studio, xoá dữ liệu phiên | **xong** |
| Nạp cấu hình gợi ý của bối cảnh (`defaults` trong design.json) | **xong** |
| Kiểm tra cấu hình theo schema zod của module | chưa — xem mục 4 |
| Lõi phiên: tổng, ghế, top người tặng, feed | **xong** |
| Nguồn `mau` — giả lập, để dựng phòng khi chưa lên sóng | **xong** |
| Nguồn `bridge` — nhận sự kiện thật từ tiến trình đọc TikTok ngoài | **xong** |
| Nguồn `webview` — tự đọc khung webcast | chưa — cần vỏ Tauri, xem mục 6 |
| SQLite cho sổ quà | chưa — mới có `database/schema.sql` |
| Kho khoá API, `POST /api/tts` gọi hộ nhà cung cấp giọng đọc | **xong** |
| `POST /api/ai/tick` (Claude) | chưa |
| Công bố cổng và token ra `.tmp/agent-port.json` | **xong** |
| Vỏ Tauri và webview TikTok | chưa |

Chạy thử khi phát triển, không cần Tauri:

```bash
cd backend && cargo run
# rồi mở http://127.0.0.1:47830/d/<id>/
```

Cổng và token công bố ở `.tmp/agent-port.json` (`{ port, token, pid }`), xoá khi máy chủ
dừng. Dev server của Vite đọc file đó rồi tự gắn header, nên **token không bao giờ nằm
trong mã trang**. Test: `cd backend && cargo test` (93 unit + 34 tích hợp).

## 1. Vì sao cần backend thật

Mã cũ không có server. Hệ quả:

- OBS phải dùng Window Capture, không có URL Browser Source.
- Cấu hình nằm ở `localStorage`, mà bản dev (`localhost:5180`) và bản đóng gói (`tauri.localhost`) có kho riêng → phải vá `Storage.prototype` để mirror xuống file.
- Bảng vận hành chỉ thấy phòng trên cùng một máy, nhật ký mất khi đóng tab chủ.
- Assets của mọi thiết kế nằm chung một thư mục public.

Thêm một HTTP server nội bộ giải quyết cả bốn.

## 2. Cổng và bảo mật

| Hạng mục | Giá trị |
|---|---|
| Địa chỉ | `127.0.0.1` — chỉ máy này, không bao giờ `0.0.0.0` |
| Cổng | `47830`, bận thì lấy cổng trống kế tiếp |
| Công bố | ghi `{ port, token, pid }` vào `agent-port.json` trong thư mục dữ liệu app |
| Token | 128-bit, sinh mới mỗi lần mở app |

Quy tắc kiểm tra request, giữ nguyên tinh thần `local_port.rs` của mã cũ:

- Request có header `Origin` lạ → từ chối (chống trang web gọi vào).
- `Host` không phải `127.0.0.1:<port>` → từ chối (chống DNS rebinding).
- `/api/*` bắt buộc có token. `/d/*` và `/a/*` không cần, vì OBS không gửi được header.

## 3. Routes

### Phục vụ thiết kế và assets

| Route | Việc |
|---|---|
| `GET /d/<designId>/` | Trang thiết kế — **URL cho OBS Browser Source** |
| `GET /d/<designId>/<đường dẫn>` | File trong `client/designs/<id>/dist/` |
| `GET /a/<designId>/<đường dẫn>` | File trong `client/designs/<id>/assets/` |
| `GET /m/<moduleId>/<đường dẫn>` | File trong `client/modules/<id>/assets/` — dùng được ở mọi thiết kế |
| `GET /u/<designId>/<tên file>` | Ảnh, video người vận hành tải lên, ở `database/designs/<id>/media/` |

Hai `designId` khác nhau không bao giờ đọc được file của nhau. Đường dẫn bị chuẩn hoá
và kiểm tra nằm trong thư mục gốc của thiết kế, chặn `..`.

File tải lên nằm ở `database/` chứ **không** ở `client/designs/<id>/assets/`: assets là mã
nguồn của bản thiết kế và được commit, còn ảnh video người vận hành đưa vào là dữ liệu của
họ. Xoá cả thư mục `database` là về máy sạch mà mã nguồn không mất gì.

### Lối cho sân khấu — không token

Trang sân khấu chạy trong OBS nên không giữ được token, mà bảng xem thử lại nằm ngay trong
trang đó. Mấy route này vì vậy miễn token, nhưng vẫn qua lớp chặn `Host` và `Origin`:

| Route | Việc |
|---|---|
| `GET /s/voice`, `POST /s/tts` | Giọng đọc cho sân khấu |
| `POST /s/media/<designId>?ext=png` | Nhận một file tải lên; thân yêu cầu là chính nội dung file |
| `POST /s/media/<designId>/ai` | Nhờ AI vẽ một ảnh (`{ prompt }`), cất vào kho rồi trả đường dẫn |
| `POST /s/viet/<designId>` | Nhờ AI viết chữ cho một ô cấu hình (`{ what, extra }`), trả `{ text }` |

Đuôi file đi theo **danh sách cho phép** (ảnh và video thường gặp), không phải danh sách
cấm: quên chặn một đuôi lạ thì thành lỗ hổng, còn quên cho phép một đuôi mới thì chỉ là
thiếu tiện. `svg` không nhận vì nó chạy được script.

### REST

| Route | Việc |
|---|---|
| `GET /api/designs` | Danh sách thiết kế, đọc từ `client/designs/*/design.json` |
| `PUT /api/designs/<id>/settings` | Đổi tên hiện trên thẻ, đặt link TikTok Studio |
| `POST /api/designs/<id>/reset` | Xoá dữ liệu phiên; **không** đụng cấu hình module và sổ quà |
| `GET /api/live` | Thiết kế đang phát, hoặc `null` |
| `POST /api/live` | Bật phát một thiết kế |
| `DELETE /api/live` | Tắt phát |
| `GET /api/modules` | Manifest mọi module, kèm trạng thái bật/tắt |
| `GET /api/modules/<id>/config` | Cấu hình hiện tại |
| `PUT /api/modules/<id>/config` | Ghi cấu hình, kiểm tra bằng schema |
| `POST /api/modules/<id>/enabled` | Bật/tắt module |
| `POST /api/modules/<id>/action` | Bấm nút trên thẻ, vd Quay thưởng |
| `GET /api/session` | Bản tóm tắt phiên, `null` khi chưa phát |
| `GET /api/source` | Nguồn sự kiện hiện tại và trạng thái của nó |
| `PUT /api/source` | Đổi nguồn: `{ "kind": "tat" \| "mau" \| "bridge", "url"?, "channel"? }` |
| `POST /api/command` | Gửi `RoomCommand`, đi qua cổng duyệt |
| `GET /api/ledger?from=&to=` | Sổ quà đối soát |

**Một thiết kế một lúc.** `POST /api/live` khi đã có thiết kế khác đang phát thì trả
`409 Conflict` kèm id thiết kế đang chạy. Người dùng phải tắt cái cũ trước — khớp đúng
hành vi đã chốt trên giao diện quản lý.

### WebSocket

```
WS /ws?role=stage&design=<id>     thiết kế nối vào
WS /ws?role=manager&token=<token> trang quản lý nối vào
```

Thông điệp theo đúng `Down` / `Up` ở [02 — Hợp đồng](02-hop-dong.md).

## 4. Lưu trữ

```
database/
├─ schema.sql                     commit — nguồn sự thật của cấu trúc
├─ migrations/                    commit — mỗi thay đổi một file, đánh số tăng
├─ live.sqlite                    không commit — sổ quà, bình chọn, quay thưởng
├─ designs/                       không commit
│  └─ <designId>/
│     ├─ config.json              cấu hình mọi module cho thiết kế này
│     ├─ settings.json            tên và link Studio do người vận hành đặt
│     └─ session.json             bản chụp phiên, để mở lại không mất
├─ voice.json                     không commit — dàn giọng, KHÔNG có bí mật
└─ secrets.json                   không commit — khoá API, chỉ backend đọc
```

Một cơ sở dữ liệu **dùng chung cho dev và production**, không tách hai bản,
để số liệu đối soát không bị lệch. Chi tiết: `database/README.md`.

Quy tắc ghi:

- Ghi ra file `.tmp` rồi `rename` — không bao giờ ghi đè trực tiếp. Mã cũ đã làm đúng ở `store.rs`, giữ nguyên.
- Cấu hình được kiểm tra **trước khi** ghi. Sai thì trả `400` kèm lý do cụ thể, không im lặng sửa thành mặc định.
  Hiện backend mới kiểm tra được hình dạng (phải là object, id hợp lệ, kích thước dưới 1 MB).
  Kiểm tra đầy đủ theo schema zod của từng module cần bước build xuất `schema.json`
  từ `client/modules/*` ra cho backend đọc — làm cùng lúc với registry module.
- Sổ quà chỉ thêm, không sửa, không xoá. `POST /api/designs/<id>/reset` xoá phiên nhưng **không** đụng sổ quà.

Vì sao SQLite chỉ cho sổ quà: dữ liệu này cần truy vấn theo ngày, theo phòng, và phải
giữ lâu dài để đối soát. Cấu hình thì ít và cần đọc được bằng mắt, nên để JSON.

## 5. Khoá API

Mọi khoá nằm ở `database/secrets.json`, **chỉ backend đọc**. Client không bao giờ thấy giá trị thật.

```jsonc
{
  "anthropic": { "key": "sk-ant-…" },
  "tts": {
    "vieneu":  { "baseUrl": "https://api.vieneu.io/api/v1", "key": "…" },
    "9router": { "baseUrl": "http://localhost:20128/v1" }
  }
}
```

| Route | Việc |
|---|---|
| `GET /api/secrets` | Trả **trạng thái**: nhà nào đã có khoá. Không bao giờ trả giá trị. |
| `PUT /api/secrets/<provider>` | Đặt khoá. Khoá rỗng nghĩa là giữ khoá cũ. |
| `DELETE /api/secrets/<provider>` | Xoá nhà cung cấp |
| `GET` / `PUT /api/voice` | Dàn giọng: danh sách nhân vật, giọng mặc định, nhanh chậm |
| `POST /api/tts` | Gọi hộ nhà cung cấp, trả bytes mp3 (trang quản lý dùng để nghe thử) |
| `POST /api/ai/tick` | Backend gọi Claude, trả `RoomCommand[]` đã lọc — **chưa làm** |

### Lối `/s/` — dành cho sân khấu

| Route | Việc |
|---|---|
| `GET /s/voice` | Dàn giọng, để sân khấu biết đọc bằng gì |
| `POST /s/tts` | Sinh giọng cho một câu: `{ text, voiceId, speed? }` |

Hai route này **không đòi token**, vì sân khấu chạy trong OBS và không có chỗ nào
giữ token — giống `/d/*` và `/a/*`. Chúng vẫn đi qua lớp chặn `Host` và `Origin`,
nên một trang web ngoài không gọi vào được.

### Dàn giọng — mỗi nhân vật một giọng

Một phiên có nhiều nhân vật: MC dẫn chuyện, bé gái, cậu bé, người chào khách.
Nên cài đặt giọng là một **danh sách**, không phải một giọng duy nhất:

```jsonc
// database/voice.json — không commit
{
  "enabled": true, "speed": 1, "volume": 1,
  "default": "mc",
  "cast": [
    { "id": "mc",     "provider": "9router", "voice": "", "role": "MC dẫn chuyện" },
    { "id": "be-gai", "provider": "9router", "voice": "edge-tts/vi-VN-HoaiMyNeural", "role": "bé gái" }
  ]
}
```

Module nói câu nào bằng giọng nào thì ghi id vào hiệu ứng:
`{ kind: 'say', text: '…', voice: 'be-gai' }`. Không ghi thì dùng `default`.

Sân khấu **chỉ gửi id**: `POST /s/tts { text, voiceId }`. Việc tra ra nhà cung
cấp nào, giọng nào, khoá nào là của backend — sân khấu không cần biết dàn giọng
được cấu hình ra sao, và đổi dàn giọng không phải build lại thiết kế.

Id nhà cung cấp và id nhân vật được **bắt đầu bằng số** (lỏng hơn id module và
thiết kế), vì có nhà cung cấp tên thật là `9router`.

### Hai kiểu giao thức

Giữ nguyên của bản cũ để dùng lại được khoá đã có:

| Kiểu | Lời gọi | Khoá ở đâu |
|---|---|---|
| `openai` (VieNeu, OpenAI, 9router) | `POST {base}/audio/speech`, body `{input, voice, response_format:"mp3", speed, model?}` | `Authorization: Bearer` |
| `elevenlabs` | `POST /text-to-speech/{voice_id}?output_format=mp3_44100_128` | `xi-api-key` |

Có nhà đặt giọng vào `model` chứ không có trường `voice` riêng — 9router là một.
Quy ước giữ của bản cũ: **tên giọng có dấu `/` thì chính nó là model**, ví dụ
`google-tts/vi`, và khi đó không gửi trường `voice` nữa. Để trống tên giọng thì
dùng model mặc định đã khai ở nhà cung cấp.

Giới hạn: câu cắt ở 400 ký tự, audio tối đa 8 MiB, chờ tối đa 60 giây, không đi
theo chuyển hướng. Địa chỉ nhà cung cấp phải là `https://`, trừ khi nó chạy ngay
trên máy này — và không được chứa `user:pass@` hay tham số, vì cả hai đều là
đường giấu một địa chỉ khác vào chỗ trông như hợp lệ.

Lỗi được dịch ra tiếng người: 401 "khoá sai hoặc đã thu hồi", 402/403 "hết gói",
429 "đang bị giới hạn". Nhà cung cấp hỏng thì sân khấu **không im bặt** — nó rơi
về giọng máy của trình duyệt.

Chưa làm: cache audio theo câu (bản cũ giữ 16 câu trong RAM), và điều tiết số
lời gọi song song cho từng nhà.

### Tiếng động

Không có file âm thanh nào. Sân khấu **tổng hợp tại chỗ** bằng WebAudio, chuyển
nguyên bốn tiếng của bản cũ (`gift`, `join`, `sad`, `comfort`) và thêm hai tiếng
mà hợp đồng `Effect` có khai (`fanfare`, `tick`). Nhờ vậy không có file nào phải
tải và đổi bối cảnh không phải đi kiếm bộ tiếng mới.

Đây là thay đổi so với mã cũ: khoá Claude từng nằm trong `localStorage` và gọi thẳng
từ renderer bằng `dangerouslyAllowBrowser: true`. Giọng đọc thì đã đi qua Rust rồi.
Nay cả hai cùng một đường.

## 6. Nguồn sự kiện TikTok

Mọi nguồn trả đúng `LiveEvent`, nên phần còn lại của hệ thống không biết sự kiện
đến từ đâu. Thêm nguồn mới chỉ là viết một mapper.

| Nguồn | Việc | Trạng thái |
|---|---|---|
| `mau` | Giả lập, để dựng phòng và thử tính năng khi chưa lên sóng | **xong** |
| `bridge` | Nối tới tiến trình đọc TikTok chạy ngoài, qua WebSocket | **xong** |
| `webview` | Tự đọc khung webcast trong webview TikTok | chưa |

### Cờ `virtual` — của bot, không phải của nguồn mẫu

Cờ này đánh dấu **nhân vật do máy dựng bên trong một phiên thật**, để module cảm ơn quà
không tự cảm ơn con bot của chính mình. Nguồn `mau` KHÔNG gắn cờ này: nó là cả một phòng
giả, gắn cờ thì không module nào chạy và nguồn mẫu mất sạch công dụng.

Cờ nằm **ngay trong phiên**, không gắn thêm lúc phát xuống. Sân khấu nhận feed qua hai
đường — tin `feed` và bản chụp `session` — hai đường mà nói khác nhau thì module lúc chạy
lúc không.

### `bridge` — đường tới dữ liệu thật hôm nay

```
tiến trình đọc TikTok  →  WebSocket JSON  →  backend  →  phiên  →  bus
```

Giao thức giữ nguyên của bản cũ, để dùng lại được cầu nối đã có (`tools/bridge`
của dự án cũ, cổng 8787):

```jsonc
// backend → cầu nối, ngay khi nối
{ "type": "subscribe", "channel": "kechuyen.dem" }

// cầu nối → backend: một tin, hoặc một mảng tin
{ "kind": "gift", "user": "…", "name": "…", "gift": "Hoa sen",
  "count": 3, "xuEach": 10, "ts": 1730000000000 }
{ "type": "viewers", "count": 1234 }
{ "type": "status", "state": "dang-live", "message": "…" }
```

Những chi tiết đã giữ đúng bản cũ: bỏ tin cũ hơn lúc nối 3 giây (không thì cảm ơn
lại quà của phiên trước), tin hỏng thì bỏ chứ không làm sập nguồn, nối lại với
thời gian chờ tăng dần 2 → 15 giây. Backend chỉ nhận `ws://` — cầu nối chạy trên
chính máy này, không phải một máy chủ ngoài Internet.

### `webview` — vì sao chưa làm

Bản cũ **không** giải protobuf bằng Rust: `capture.js` bắt khung nhị phân trong
webview, rồi renderer giải bằng thư viện npm `tiktok-live-proto`. Chuyển sang Rust
cần schema protobuf riêng, và không có phiên live thật thì không kiểm chứng được.
Làm cùng lúc dựng vỏ Tauri, khi đó mới có webview để bắt khung.

Những chỗ phải giữ đúng khi làm, chép lại từ mã cũ để không mất:

- Bỏ tin `isHistory` — đó là backlog, không phải sự kiện đang xảy ra.
- Quà nhấn giữ (`gift.type == 1` hoặc `gift.combo`) bắn nhiều tin với `repeatCount`
  tăng dần: **chỉ nhận tin có `repeatEnd == 1`**, nếu không một món quà bị đếm
  nhiều lần.
- Số lượng lấy `repeatCount`, xu mỗi món lấy `gift.diamondCount`.
- Tổng tim lấy `max` với `totalLikeCount`, không cộng dồn mù.
- Số người xem lấy `total`/`viewerCount`, **không** lấy `totalUser` — đó là tổng
  lượt ghé, không phải người đang xem.
- Một tin hỏng không được làm hỏng cả khung.

### Rủi ro đã biết

Cách đọc này dựa vào trang web của TikTok. Nếu TikTok chuyển WebSocket vào Web
Worker hoặc đổi đường dẫn `/webcast/im/` thì `capture.js` mù hoàn toàn. Khi đó
chuyển sang nguồn `bridge`.

## 7. Tauri command còn lại

Sau khi có HTTP server, chỉ giữ những lệnh thật sự cần quyền hệ điều hành:

| Command | Việc |
|---|---|
| `tiktok_open` / `_close` / `_reload` / `_show` / `_hide` / `_list` / `_navigate` | Quản lý webview TikTok |
| `open_app_window` | Mở cửa sổ phụ |
| `server_info` | Trả cổng và token cho trang quản lý |

Bỏ `store_load` / `store_set` — thay bằng REST. Bỏ `tts_speech` — thay bằng `POST /api/tts`.

`tiktok_navigate` giữ nguyên whitelist chỉ cho `*.tiktok.com` qua HTTPS.

## 8. Test

```bash
cd backend && cargo test
```

Bắt buộc có test cho: kiểm tra `Origin` và `Host`, kiểm tra token, chặn `..` trong đường dẫn
assets, từ chối `POST /api/live` khi đã có thiết kế đang chạy, ghi file qua `.tmp` rồi rename,
và whitelist URL TikTok.
