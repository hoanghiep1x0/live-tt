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
  "icon": "📖",
  "summary": "AI MC đọc truyện, khán giả ngồi ghế hình quạt, top người tặng",
  "version": "1.0.0",
  "canvas": { "width": 1080, "height": 1920 },
  "slots": ["top-bar", "center", "bottom-bar", "ticker", "stage-3d"],
  "provides": ["stage-3d"],
  "recommends": ["gift-thanks", "welcome", "tts-mc", "top-givers"],
  "entry": "dist/index.html"
}
```

`icon` là emoji hiện trên thẻ ở trang quản lý. Thiết kế tự khai, để trang quản lý không phải
giữ một bảng ánh xạ theo id (quy ước 01 §6).

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

Assets nằm trong `client/designs/<id>/assets/`. Chúng **không nằm trong bản build**:
backend phục vụ riêng ở `/a/<designId>/…`, lấy đường dẫn bằng `useAsset()` của stage-sdk:

```tsx
const asset = useAsset();
<img src={asset('bg/rap-chieu.png')} />       // ĐÚNG → /a/ke-chuyen/bg/rap-chieu.png
<img src="./assets/bg/rap-chieu.png" />       // SAI — ./assets là thư mục bundle của Vite
```

Vì sao không nhét vào bundle: phòng kể chuyện có 19 MB ảnh và video. Chép ngần ấy vào `dist`
mỗi lần build là chậm vô ích, và sửa một tấm nền lại phải build lại cả thiết kế.

`vite.config.ts` vẫn đặt `base: './'` cho **mã** trong bundle (backend phục vụ ở `/d/<id>/`),
và dùng `proxyBackend()` để `npm run dev` lấy được assets qua backend.

Assets dùng chung giữa nhiều thiết kế thì **sao chép**, không dùng chung thư mục.
Đổi một thiết kế không được làm vỡ thiết kế khác — đây là lý do chính tách riêng.

Mỗi thư mục assets có `CREDITS.md` ghi nguồn gốc và giấy phép.

### Asset nào của thiết kế, asset nào của module

| Asset | Thuộc về | Vì sao |
|---|---|---|
| Nền sân khấu, khung cảnh, ghế, ánh sáng | **thiết kế** | Chỉ đúng với một bối cảnh |
| Nhạc nền của bối cảnh | **thiết kế** | Nhạc chùa không dùng cho quán bar |
| Sprite nhân vật, icon quà, tiếng chuông mặc định | **module** | Cùng tính năng phải chạy ở mọi phòng |

Nếu sprite nhân vật nằm trong `client/designs/ke-chuyen/assets/` thì bật module đó ở phòng
đám cưới là phải đi copy file — rồi hai bản lệch nhau. Nên chúng ở
`client/modules/<id>/assets/`, phục vụ tại `/m/<module-id>/…`.

### Thiết kế phủ asset của module — CHƯA LÀM

Dự định: một bối cảnh muốn đổi hình tiếng của module dùng chung thì **phủ lên**, không sửa module:

```
client/designs/chua-online/assets/mod/sfx/gift.mp3     ← tiếng chuông chùa
client/modules/sfx/assets/gift.mp3                     ← bản mặc định
```

`stage-sdk` sẽ tìm theo thứ tự: asset của thiết kế trước (`/a/<designId>/mod/<moduleId>/…`),
không có thì dùng bản của module (`/m/<moduleId>/…`). Không có `if` theo id ở đâu cả —
có file thì phủ, không có thì thôi.

Hiện `moduleAssetUrl()` mới trả bản mặc định của module. Phần phủ sẽ làm cùng module đầu
tiên thật sự có assets; làm trước bây giờ là đoán nhu cầu chưa có.

## 6b. Bối cảnh mới dùng lại tính năng cũ

Đám cưới online, chùa online, quán bar online, kể chuyện online — mỗi cái là **một thiết kế**,
không phải một nhánh mã mới. Thứ khác nhau giữa chúng chỉ có bốn:

| Khác nhau ở | Nằm ở đâu |
|---|---|
| Bố cục và hình nền | `src/Stage.tsx` + `assets/` của thiết kế |
| Câu chữ ("Cảm ơn đã tặng" ↔ "Cảm ơn đã gửi lời chúc") | cấu hình module, lưu theo từng thiết kế |
| Hình tiếng riêng của bối cảnh | `assets/mod/<moduleId>/…` phủ lên asset module |
| Bật tính năng nào | `recommends` + `defaults` trong `design.json` |
| Nhân vật ảo nói gì | `crowd` trong `design.json` |

Phần **cơ chế** — cảm ơn quà, chào người vào, top người tặng, bình chọn, quay thưởng, giọng
đọc — không đổi gì cả. Viết một lần, chạy ở mọi bối cảnh.

`defaults` là cấu hình gợi ý cho bối cảnh này, backend chỉ nạp **một lần** khi thiết kế chưa
có cấu hình nào. Người vận hành sửa sau đó thì sửa của họ được giữ:

```json
{
  "recommends": ["gift-thanks", "welcome", "tts-mc"],
  "defaults": {
    "gift-thanks": { "template": "Cảm ơn {ten} đã gửi lời chúc {qua}!" },
    "welcome": { "template": "Mừng {ten} đến dự tiệc!" }
  }
}
```

`crowd` là đám đông minh hoạ của riêng bối cảnh. Người vận hành bật tắt và chọn số lượng ở
bảng xem, còn **họ nói gì là việc của thiết kế** — phòng kể chuyện thì "nghe hay quá", sàn
bar thì "quẩy lên", đám cưới thì "chúc hai bạn trăm năm". Một bộ câu dùng chung cho mọi
phòng là người xem nhận ra ngay:

```json
{
  "crowd": {
    "names": [],
    "lines": ["nghe hay quá ạ", "kể tiếp đi ạ", "cho xin tên truyện với ạ"]
  }
}
```

`names` rỗng thì ghép họ + tên Việt ngẫu nhiên. `lines` rỗng nghĩa là bối cảnh này không có
nhân vật ảo — người vận hành có bật thì cũng không ai vào. Họ không bao giờ tặng quà và
không lên bảng top: sự kiện của họ mang cờ `virtual`, và quà giả trên bảng vinh danh là nói
dối người xem chứ không còn là trang trí. Chân màn chỉ ghi "có nhân vật minh họa" khi đám
đông đang bật.

Nhờ vậy làm một phòng mới là: một thư mục thiết kế, assets của nó, và một khối `defaults`.
Không thêm một dòng nào vào module nào.

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
