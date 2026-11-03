# 04 — Viết một thiết kế

Một **thiết kế** là một phòng live hoàn chỉnh: bố cục, hình nền, nhân vật, cách kể chuyện.
Nó là một gói độc lập, build riêng, có assets riêng.

## 1. Thiết kế độc lập với module

Đây là luật, không phải khuyến nghị:

- Thiết kế **phải chạy được khi không có module nào bật**. Không bật module thì phòng vẫn lên hình, vẫn phát, chỉ thiếu tính năng.
- Thiết kế **không được import** từ `client/modules/*`.
- Thiết kế chỉ khai báo **slot** và **khả năng** của mình, rồi để runtime cắm module vào.

Sai lầm cần tránh: viết thiết kế "Sàn nhảy hip hop" rồi nhét logic nhảy vào trong đó.
Logic nhảy là module `hiphop-dancer`, cắm được vào mọi thiết kế có slot `stage-3d`.

## 2. Cấu trúc

```
client/designs/ke-chuyen/
├─ design.json
├─ package.json          name: "@live/design-ke-chuyen"
├─ vite.config.ts
├─ index.html
├─ src/
│  ├─ main.tsx           điểm vào, nối stage-sdk
│  ├─ Stage.tsx          bố cục, khai báo slot
│  └─ parts/             thành phần riêng của thiết kế
└─ assets/
   ├─ bg/
   ├─ chibi/
   └─ CREDITS.md         nguồn gốc và bản quyền asset
```

## 3. `design.json`

```json
{
  "id": "ke-chuyen",
  "name": "Phòng kể chuyện",
  "summary": "AI MC đọc truyện, khán giả ngồi ghế hình quạt, top người tặng",
  "version": "1.0.0",
  "canvas": { "width": 1080, "height": 1920 },
  "slots": ["top-bar", "center", "bottom-bar", "ticker", "stage-3d"],
  "provides": ["stage-3d"],
  "recommends": ["gift-thanks", "welcome", "tts-mc", "top-givers"],
  "entry": "dist/index.html"
}
```

Khai báo đúng `slots` là phần quan trọng nhất. Module cần slot mà thiết kế không có
thì manager hiện cảnh báo "module này chưa hiển thị được trên thiết kế đang chạy",
chứ không âm thầm không chạy như mã cũ.

## 4. `src/main.tsx`

```tsx
import { createRoot } from 'react-dom/client';
import { connectStage } from '@live/stage-sdk';
import { Stage } from './Stage';

const stage = connectStage({ designId: 'ke-chuyen' });
createRoot(document.getElementById('root')!).render(<Stage stage={stage} />);
```

`connectStage` lo hết: nối WebSocket tới backend, nhận feed, nhận cấu hình nóng,
dựng runtime, chạy các module đang bật, và thực thi `Effect` chúng trả về.

## 5. `src/Stage.tsx` — khai báo slot

```tsx
import { Slot, useSession } from '@live/stage-sdk';

export function Stage() {
  const session = useSession();
  return (
    <div className="stage">
      <img className="bg" src="./assets/bg/rap-chieu.png" alt="" />

      <header><Slot name="top-bar" /></header>
      <main>
        <Slot name="center" />
        <Slot name="stage-3d" />
      </main>
      <footer>
        <Slot name="ticker" />
        <Slot name="bottom-bar" />
      </footer>
    </div>
  );
}
```

`Slot` tự tìm các module đang bật khai báo slot đó và vẽ chúng, xếp theo thứ tự đăng ký.
Thiết kế không biết module nào sẽ nằm ở đó, và không cần biết.

## 6. Assets

Assets nằm trong `client/client/designs/<id>/assets/`, tham chiếu bằng đường dẫn **tương đối**:

```tsx
<img src="./assets/bg/rap-chieu.png" />       // ĐÚNG
<img src="/assets/bg/rap-chieu.png" />        // SAI — vỡ khi phục vụ dưới /d/<id>/
```

Backend phục vụ thiết kế ở `/d/<id>/`, nên đường dẫn tương đối tự khớp.
`vite.config.ts` đặt `base: './'`.

Assets dùng chung giữa nhiều thiết kế thì **sao chép**, không dùng chung thư mục.
Đổi một thiết kế không được làm vỡ thiết kế khác — đây là lý do chính tách riêng.

Mỗi thư mục assets có `CREDITS.md` ghi nguồn gốc và giấy phép.

## 7. Build và chạy

```bash
npm run dev  -w @live/design-ke-chuyen     # xem riêng khi làm
npm run build -w @live/design-ke-chuyen    # ra client/designs/ke-chuyen/dist
npm run build:designs                      # build hết, backend quét lại registry
```

Khi chạy trong app, backend phục vụ bản đã build. URL cho OBS Browser Source:

```
http://127.0.0.1:47830/d/ke-chuyen/
```

Thẻ thiết kế trên trang quản lý hiện đúng URL này, nút **Kết nối OBS** chép nó vào clipboard.

## 8. Thiết kế nặng và giới hạn tài nguyên

Đo thật trên bản cũ: mỗi phòng tốn ~1–1,5 nhân CPU và ~1,2 GB RAM; ba phòng là 3,6 GB.
Vì vậy **một lúc chỉ một thiết kế chạy**. Thiết kế nào dùng WebGL cần thêm:

- Tôn trọng `prefers-reduced-motion`.
- Có mức giảm chất lượng khi khung hình tụt, khai báo trong `design.json`:
  `"quality": { "auto": true, "minFps": 24 }`.
- Giải phóng `THREE` resource trong `dispose`, không để rò bộ nhớ khi đổi thiết kế.

## 9. Bảng kiểm

- [ ] Chạy được khi tắt hết module
- [ ] Không import gì từ `client/modules/*`
- [ ] Mọi đường dẫn asset là tương đối, `base: './'`
- [ ] `design.json` khai báo đủ slot thật sự có trong `Stage.tsx`
- [ ] Có `assets/CREDITS.md`
- [ ] Không đọc `localStorage` — mọi cấu hình đến từ `stage-sdk`
- [ ] Đổi cấu hình module không làm thiết kế tải lại
