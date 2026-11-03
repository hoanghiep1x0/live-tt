# 05 — Backend

Backend nằm trong `backend` (Tauri + Rust). Không có server ngoài, không có cloud.
Nó là **nguồn sự thật duy nhất**: cấu hình, phiên, sổ sách, khoá API đều ở đây.

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
| `GET /d/<designId>/<đường dẫn>` | File trong `client/client/designs/<id>/dist/` |
| `GET /a/<designId>/<đường dẫn>` | File trong `client/client/designs/<id>/assets/` |

Hai `designId` khác nhau không bao giờ đọc được file của nhau. Đường dẫn bị chuẩn hoá
và kiểm tra nằm trong thư mục gốc của thiết kế, chặn `..`.

### REST

| Route | Việc |
|---|---|
| `GET /api/designs` | Danh sách thiết kế, đọc từ `client/designs/*/design.json` |
| `POST /api/designs/<id>/rename` | Đổi tên |
| `POST /api/designs/<id>/reset` | Xoá dữ liệu phiên của thiết kế |
| `GET /api/live` | Thiết kế đang phát, hoặc `null` |
| `POST /api/live` | Bật phát một thiết kế |
| `DELETE /api/live` | Tắt phát |
| `GET /api/modules` | Manifest mọi module, kèm trạng thái bật/tắt |
| `GET /api/modules/<id>/config` | Cấu hình hiện tại |
| `PUT /api/modules/<id>/config` | Ghi cấu hình, kiểm tra bằng schema |
| `POST /api/modules/<id>/enabled` | Bật/tắt module |
| `POST /api/modules/<id>/action` | Bấm nút trên thẻ, vd Quay thưởng |
| `GET /api/session` | Bản tóm tắt phiên |
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
│     └─ session.json             bản chụp phiên, để mở lại không mất
└─ secrets.json                   không commit — khoá API, chỉ backend đọc
```

Một cơ sở dữ liệu **dùng chung cho dev và production**, không tách hai bản,
để số liệu đối soát không bị lệch. Chi tiết: `database/README.md`.

Quy tắc ghi:

- Ghi ra file `.tmp` rồi `rename` — không bao giờ ghi đè trực tiếp. Mã cũ đã làm đúng ở `store.rs`, giữ nguyên.
- Cấu hình được kiểm tra bằng schema của module **trước khi** ghi. Sai thì trả `400` kèm lý do cụ thể, không im lặng sửa thành mặc định.
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
| `GET /api/secrets` | Trả **trạng thái**: nhà cung cấp nào đã có khoá. Không trả giá trị. |
| `PUT /api/secrets/<provider>` | Đặt khoá |
| `DELETE /api/secrets/<provider>` | Xoá khoá |
| `POST /api/tts` | Backend gọi API giọng đọc, trả audio |
| `POST /api/ai/tick` | Backend gọi Claude, trả `RoomCommand[]` đã lọc |

Đây là thay đổi so với mã cũ: khoá Claude từng nằm trong `localStorage` và gọi thẳng
từ renderer bằng `dangerouslyAllowBrowser: true`. Giọng đọc thì đã đi qua Rust rồi.
Nay cả hai cùng một đường.

## 6. Nguồn sự kiện TikTok

Giữ nguyên cách đọc đã chạy được với live thật, chỉ đổi chỗ chạy từ client sang backend:

```
webview TikTok  →  capture.js đọc khung webcast
                →  Rust giải mã protobuf
                →  chuẩn hoá thành LiveEvent
                →  áp vào phiên, sinh FeedItem
                →  broadcast WS
```

Ba nguồn, chọn trong cài đặt: `webview` (desktop, mặc định), `bridge` (WebSocket ngoài), `mau` (giả lập).
Mọi nguồn đều phải trả `LiveEvent`; thêm nguồn mới chỉ cần viết mapper.

Rủi ro đã biết, ghi lại để không quên: cách đọc này dựa vào trang web TikTok.
Nếu TikTok chuyển WebSocket vào Web Worker hoặc đổi đường dẫn `/webcast/im/` thì
`capture.js` mù hoàn toàn. Khi đó chuyển sang nguồn `bridge`.

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
