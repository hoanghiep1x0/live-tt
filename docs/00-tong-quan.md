# 00 — Tổng quan kiến trúc

## 1. Vì sao làm lại

Mã cũ chạy được và đã phát live thật, nhưng thêm một tính năng phải sửa tay 6–9 chỗ rải rác:

| Phải sửa | Ở đâu |
|---|---|
| Khai báo kiểu cấu hình | `settings.ts` — interface `Settings` |
| Giá trị mặc định | `settings.ts` — `DEFAULT_SETTINGS` |
| Hợp lệ hoá khi nạp | `settings.ts` — `mergeSettings` |
| Kiểu patch | `settings.ts` — `SettingsPatch` |
| Áp patch | `settings.ts` — `applyPatch` |
| Giao diện bật/tắt | `SettingsPage.tsx` — inline trong một file 554 dòng |
| Cho phép theo kiểu phòng | `roomModules.ts` — union `SectionKey` đóng |
| Lệnh bật/tắt từ xa | `ops.ts` `FlagName` + chuỗi `if/else` trong `RoomRuntime.tsx` |
| Cho phép đồng bộ liên tab | `sync.ts` — mảng chuỗi `ACTION_TYPES` |

Quên một chỗ thì tính năng **im lặng không chạy**, không báo lỗi. Ngoài ra:

- Phòng và kiểu bị ép 1:1 — `fixedRooms()` xoá mọi phòng không khớp kiểu.
- ID kiểu `kieu-<số>` hard-code ở 5 nơi; id dạng chữ như `bar-3d` bị từ chối âm thầm.
- `roomModules.ts` chỉ ẩn/hiện mục trong trang Cài đặt; sân khấu không tôn trọng khai báo đó.
- Khoá API Claude nằm trong `localStorage` và gọi thẳng từ renderer.
- Assets của mọi thiết kế nằm chung `client/public/assets/`, đường dẫn hard-code trong component.
- Không có HTTP server, nên OBS phải dùng Window Capture thay vì Browser Source.

Kiến trúc mới giải quyết đúng các điểm trên. Thêm một tính năng = **thêm một thư mục**, không sửa file nào khác.

## 2. Ba tầng

```
┌──────────────────────────────────────────────────────────────┐
│  client/manager/       Trang quản lý (React + shadcn)        │
│  ├─ Trình duyệt · Thiết kế · Tính năng                       │
│  └─ Chỉ nói chuyện với backend qua REST + WebSocket          │
└──────────────────────────────────────────────────────────────┘
                              │ HTTP / WS
┌──────────────────────────────────────────────────────────────┐
│  backend/              Tauri + Rust  ← NGUỒN SỰ THẬT         │
│  ├─ HTTP server (axum): REST, WS, phục vụ thiết kế + assets  │
│  ├─ Kho cấu hình: database/designs/<id>/config.json          │
│  ├─ Webview TikTok: đọc sự kiện live                         │
│  └─ Giữ mọi khoá API, gọi mạng thay cho renderer             │
└──────────────────────────────────────────────────────────────┘
                              │ WS  (sự kiện xuống, cấu hình xuống)
┌──────────────────────────────────────────────────────────────┐
│  client/designs/<id>/  Thiết kế đang chạy (1 lúc 1 cái)      │
│  ├─ Gói build riêng, assets riêng                            │
│  ├─ Nhúng shared/runtime để chạy module                      │
│  └─ URL cho OBS Browser Source                               │
└──────────────────────────────────────────────────────────────┘
```

## 3. Cây thư mục

```
TikTok/
├─ package.json                 npm workspaces
├─ .env.example                 mẫu biến môi trường
├─ client/                      mọi thứ chạy trong trình duyệt
│  ├─ manager/                  trang quản lý
│  ├─ shared/
│  │  ├─ contracts/             type + zod schema, backend cũng theo
│  │  ├─ runtime/               lõi thuần: bus, registry, vòng đời module
│  │  ├─ stage-sdk/             SDK cho thiết kế: nối WS, nhận cấu hình nóng
│  │  └─ ui/                    component shadcn dùng chung
│  ├─ modules/                  mỗi tính năng một thư mục
│  │  ├─ gift-thanks/           cảm ơn quà
│  │  ├─ welcome/               chào mừng vào phòng
│  │  ├─ bot-duty/              bot trực phòng
│  │  ├─ comfort/               an ủi
│  │  └─ hiphop-dancer/         nhân vật hip hop
│  └─ designs/                  mỗi thiết kế một gói
│     ├─ ke-chuyen/
│     │  ├─ design.json
│     │  ├─ src/
│     │  └─ assets/             assets RIÊNG của thiết kế này
│     └─ hip-hop/
├─ backend/                     Tauri + Rust: HTTP server, webview TikTok
├─ tests/                       toàn bộ test, cây soi gương với client/
├─ database/                    schema, migrations, dữ liệu lâu dài
├─ scripts/                     script .ps1 và .sh
├─ design/                      bản mẫu HTML của giao diện quản lý
├─ .tmp/                        rác, xoá được bất cứ lúc nào
└─ docs/
```

Chi tiết từng thư mục và điều cấm: [01 — Quy ước mã](01-quy-uoc.md).

## 4. Luồng chạy

### 4.1 Sự kiện đi xuống

```
Trang TikTok trong webview
   → capture.js đọc khung webcast
   → Rust giải mã, chuẩn hoá thành LiveEvent
   → Rust ghi vào phiên, sinh FeedItem
   → broadcast WS tới thiết kế đang chạy và tới manager
   → runtime trong thiết kế gọi từng module đã bật
   → module trả về Effect[]
   → thiết kế thực thi Effect (nói, hiệu ứng, âm thanh…)
```

### 4.2 Cấu hình đi xuống — không tải lại trang

```
Người dùng gạt công tắc trên thẻ module
   → manager PUT /api/designs/<id>/config
   → backend kiểm tra bằng zod schema của module, ghi file
   → backend broadcast WS { type: 'config', moduleId, config }
   → stage-sdk nhận, gọi module.onConfig(state, config)
   → module đổi hành vi ngay giữa lúc đang live
```

**Đây là ràng buộc cứng.** Không module nào được yêu cầu tải lại trang để áp cấu hình.
Phòng đang live mà tải lại là mất khán giả.

## 5. Các quyết định đã chốt

| Quyết định | Lý do |
|---|---|
| **Một lúc chỉ một thiết kế chạy** | Đo thật: mỗi phòng ~1–1,5 nhân CPU, ~1,2 GB RAM. Ba phòng đã tốn 3,6 GB. Muốn đổi thiết kế thì tắt cái cũ trước. |
| **Thiết kế là gói build riêng, không phải tiến trình riêng** | Giữ được assets riêng và build riêng mà không nhân đôi chi phí tài nguyên. |
| **Backend giữ nguồn sự thật, không phải localStorage** | Mã cũ mirror localStorage xuống file qua Rust vì bản dev và bản đóng gói có localStorage khác nhau. Bỏ hẳn lớp vá đó. |
| **Thêm HTTP server thật (axum) trong Tauri** | Để OBS dùng Browser Source thay vì Window Capture, và để mỗi thiết kế phục vụ assets riêng. |
| **Mọi khoá API nằm ở backend** | Mã cũ để khoá Claude trong localStorage và gọi thẳng từ trình duyệt. Giọng đọc thì đã đi qua Rust. Nay thống nhất một đường. |
| **Cấu hình áp nóng, không tải lại** | Bật tắt tính năng giữa lúc đang live phải an toàn. |
| **Module là tuỳ chọn, thiết kế chạy độc lập** | Tắt hết module thì thiết kế vẫn phát bình thường, chỉ thiếu tính năng. |
| **ID dạng kebab-case tự do** | Bỏ ràng buộc `kieu-<số>`. `ke-chuyen`, `hip-hop`, `bar-3d` đều hợp lệ. |

## 6. Giữ lại gì từ mã cũ

Ba ranh giới trong mã cũ đã đúng, nâng thành hợp đồng chính thức:

1. **`LiveEvent`** — cửa vào duy nhất, 5 loại sự kiện.
2. **`FeedItem[]`** — bus chung, mọi tính năng đọc từ đây.
3. **`RoomCommand` + `gateFor`** — cửa ra có kiểm soát, dùng chung cho người, luật và AI.

Các lõi sau đã thuần và có test, chuyển sang gần như nguyên vẹn:
`autopilot.ts`, `playground.ts`, `comfort.ts`, `lobby.ts`, `phrases.ts`, `storyBeat.ts`,
`mcStage.ts`, `tiktokMap.ts`, `schedule.ts`, `stageVisibility.ts`.

270 test client hiện có là lưới an toàn. Xem [06 — Lộ trình](06-lo-trinh.md) về cách giữ chúng xanh trong lúc chuyển.
