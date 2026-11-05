# 03 — Viết một module

Thêm một tính năng = thêm một thư mục trong `client/modules/`, một file test, và một dòng
trong sổ module. Không sửa gì khác. Nếu bạn thấy mình phải sửa chỗ khác, kiến trúc đã sai — báo lại.

Module là **móc sự kiện**: nó khai nó chạy khi nào ("khi có quà", "khi có người theo dõi"),
cùng cách nghĩ với mục Sự kiện của TikTok LIVE Studio. Nó không nhận mọi thứ rồi tự lọc.

## 1. Thư mục

```
client/modules/<module-id>/
├─ package.json          name: "@live/mod-<module-id>"
├─ assets/               (tuỳ chọn) hình, tiếng RIÊNG của module
└─ src/
   ├─ manifest.ts        khai báo, mô tả ô cấu hình, schema zod
   ├─ core.ts            lõi thuần — không React, không DOM, không mạng
   ├─ stage.tsx          (tuỳ chọn) lớp vẽ
   └─ index.ts
```

Test nằm ở `tests/client/modules/<module-id>/core.test.ts` — **không** cạnh mã nguồn
(quy ước 01 §3). Rồi thêm một dòng vào `client/shared/stage-sdk/src/danh-sach.ts`
(`DANH_SACH_MODULE`) — chỗ DUY NHẤT liệt kê module. Trang quản lý, bảng xem và sân khấu
cùng đọc mảng này; `tests/client/shared/danh-sach-module.test.ts` đỏ nếu mảng thiếu hay thừa
so với thư mục `client/modules/`. Nhớ thêm `"@live/mod-<id>": "*"` vào dependencies của
`client/shared/stage-sdk/package.json` rồi chạy `npm install` để có liên kết workspace.

Module không có test cho `core.ts` thì không được thêm vào sổ.

## 2. `manifest.ts` — khai báo

Mã thật: [`client/modules/gift-thanks/src/manifest.ts`](../client/modules/gift-thanks/src/manifest.ts).

```ts
import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
  minCoins: z.number().int().min(0).max(100_000).default(1),
  template: z.string().min(1).max(200).default('Cảm ơn {ten} đã tặng {qua}!'),
  combo: z.boolean().default(true),
  comboSec: z.number().int().min(1).max(60).default(5),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'gift-thanks',
  name: 'Cảm ơn quà',
  icon: '🎁',
  summary: 'Đọc tên & tạo hiệu ứng khi có quà',
  triggers: ['gift'],          // chạy khi nào — phải khớp các khoá trong core.hooks
  configVersion: 1,
  schema,
  slots: ['ticker'],
  needs: ['tts', 'audio'],
  quick: ['minCoins', 'combo'], // ô hiện ngay trên thẻ, tối đa 3
  fields: [
    { key: 'minCoins', label: 'Quà tối thiểu (xu)', short: 'Từ (xu)', type: 'number', min: 0 },
    { key: 'template', label: 'Câu cảm ơn', type: 'textarea', hint: 'Dùng {ten}, {qua}, {soluong}' },
    { key: 'combo', label: 'Gộp combo quà', short: 'Combo', type: 'toggle' },
    { key: 'comboSec', label: 'Chờ gom combo', type: 'number', unit: 'giây', min: 1, max: 60 },
  ],
};
```

Khai `fields` là xong: thẻ trên trang Tính năng, modal riêng và modal Cấu hình nhanh đều tự
dựng theo. Không viết một dòng JSX nào cho phần cấu hình.

| Khoá | Việc |
|---|---|
| `triggers` | Sự kiện module bắt. Trang quản lý hiện thành nhãn "Chạy khi: có quà". |
| `fields` | Mô tả ô cấu hình: `text`, `textarea`, `number`, `toggle`, `select`, `range`, `time`, `media`, `voice`, `gallery`. |
| `short` | Nhãn ngắn khi ô đó hiện trên thẻ. Thiếu thì dùng `label`. |
| `quick` | Danh sách **khoá**, trỏ tới `fields`. Tối đa 3, nhiều hơn thì thẻ chật. |
| `room` | Loại phòng mà tính năng chỉ hợp (`ke-chuyen`, `san-bar`, `dam-cuoi`), hoặc danh sách khi nhiều loại cùng dùng. Chỉ khai loại có thiết kế gợi ý nó. Dùng chung chỉ còn Kết nối AI, nên module mới phải khai `room`. |
| `slots` | Slot cần có để module vẽ được. Thiết kế thiếu slot thì module im lặng không hiện. |
| `needs` | Khả năng cần: `tts`, `audio`, `stage-3d`, `net`, `storage`. |

**Giá trị mặc định chỉ nằm trong schema** (`.default(...)`), không nằm ở `fields`. Trang quản lý
lấy bằng `manifest.schema.parse({})`. Hai chỗ cùng giữ mặc định thì sớm muộn lệch nhau.

## 3. `core.ts` — lõi thuần

Mã thật: [`client/modules/gift-thanks/src/core.ts`](../client/modules/gift-thanks/src/core.ts).

```ts
export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, gom: new Map() };
  },

  hooks: {
    gift: {
      run(state, item, ctx) {
        const coins = item.coins ?? item.xu ?? 0;
        if (coins < state.config.minCoins) return [];
        // …gom lại hoặc cảm ơn ngay
        return [];
      },
    },
  },

  onTick(state, now) { /* xả combo đã dứt */ },

  onConfig(state, config) {
    state.config = config;
    // Tắt gộp combo giữa lúc đang live: quà đang gom phải ra ngay nhịp sau.
    if (!config.combo) for (const g of state.gom.values()) g.at = 0;
    return state;
  },

  dispose(state) { state.gom.clear(); },
};
```

Những điều `hooks` lo thay bạn:

- **Không phải kiểm loại sự kiện.** Móc `gift` chỉ được gọi với mục quà.
- **Không phải kiểm `virtual`.** Runtime lọc nhân vật ảo trước khi gọi móc. Module nào thật sự
  cần thấy nhân vật ảo thì khai `includeVirtual: true` ở móc đó.
- **Phòng đông thì nhẹ hơn.** Mỗi bình luận không chạy qua hai mươi hàm chỉ để bị bỏ.

Cấm, theo quy ước 01 §5: `react`, `three`, `window`, `document`, `localStorage`, `fetch`,
`Date.now()`, `Math.random()`. Thời gian và ngẫu nhiên tiêm qua `ctx.now` và `ctx.rand`.
`tsconfig.json` ở gốc **không** khai `lib: DOM`, nên chạm `document` là lỗi biên dịch ngay.

`onConfig` là **bắt buộc** nếu module có cấu hình. Phòng đang live mà tải lại trang là mất khán giả.

## 4. Gọi lõi — qua `@live/runtime`

Đừng gọi `core.hooks.gift.run(...)` thẳng, kể cả trong test: làm vậy là bỏ qua lớp lọc
nhân vật ảo.

```ts
import { runFeed, runTick, runAction } from '@live/runtime';

runFeed(moduleGiftThanks, state, item, ctx);   // chọn đúng móc, lọc virtual
runTick(moduleGiftThanks, state, now, ctx);
runAction(moduleGiftThanks, state, 'draw', ctx);
```

## 5. Test

Ở `tests/client/modules/<module-id>/core.test.ts`. Mở đầu bằng `kiemModule` —
nó kiểm những điều mọi module phải đúng, trong đó có việc `triggers` khớp `hooks`:

```ts
import { runFeed } from '@live/runtime';
import { core, moduleGiftThanks as mod, schema } from '@live/mod-gift-thanks';
import { ctx, kiemModule } from '../_helper';

const MAC_DINH = schema.parse({});

it('đúng mọi điều buộc với module', () => {
  kiemModule(mod);
});

it('đọc tên và tên quà', () => {
  const s = core.init(MAC_DINH);
  const ra = runFeed(mod, s, qua(), ctx(MAC_DINH, 1_000));
  expect(loiNoi(ra)).toBe('Cảm ơn Hạnh đã tặng Hoa hồng!');
});
```

## 6. Assets của module

Hình và tiếng của module đi theo module, ở `client/modules/<id>/assets/`, phục vụ tại
`http://127.0.0.1:47830/m/<module-id>/<đường dẫn>`.

Vì sao không để trong thư mục thiết kế: cùng một tính năng phải chạy được ở phòng kể chuyện,
phòng đám cưới, quán bar. Nếu sprite nhân vật nằm trong `client/designs/ke-chuyen/assets/`
thì bật module ở phòng mới là phải đi copy file — và rồi hai bản lệch nhau.

Ngược lại: **nền sân khấu, khung cảnh, nhạc nền riêng của một bối cảnh** thuộc thiết kế,
không thuộc module. Xem [04 — Viết thiết kế](04-viet-thiet-ke.md) §5.

## 7. Khi nào cần `stage.tsx`

Chỉ khi module phải **vẽ**. Cảm ơn quà không cần — nó trả `say`, thiết kế lo đọc và hiện chữ.

Có rồi: `top-givers` (bảng vinh danh), `ticker` (dải chữ chạy), `chat-bubbles` (bóng chat nổi), `likes-counter`
(thanh tiến độ), `vu-cong-3d` (vũ công 3D — slot `stage-3d`, không vẽ DOM mà khai yêu cầu cho cảnh
3D của thiết kế, docs/02 §5b). Sẽ cần: Thông báo ghim, Nhân vật chibi.

```tsx
import type { StagePartProps } from '@live/stage-sdk';
import './stage.css';

export function Stage({ config, state, modState, now }: StagePartProps<Config, State>) {
  return <ol>{state.session.topGivers.slice(0, config.size).map((g) => <li key={g.user}>{g.name}</li>)}</ol>;
}
```

| Props | Là gì |
|---|---|
| `config` | Cấu hình đầy đủ: mặc định của schema đã được gộp với thứ đã lưu |
| `state` | Phiên, danh sách module đang bật, cấu hình mọi module |
| `modState` | Trạng thái lõi của **chính module này** — đừng tính lại thứ lõi đã tính |
| `now` | Giờ hiện tại, để vẽ theo thời gian (bóng chat tự tắt) |

Ba luật:

1. **Không xuất `Stage` từ `index.ts`.** `index.ts` phải nạp được ở Node (test, trang quản lý)
   mà không kéo theo React và CSS. Khai một lối riêng trong `package.json`:
   `"exports": { ".": "./src/index.ts", "./stage": "./src/stage.tsx" }`.
2. **Không tính lại thứ lõi đã tính.** Bóng nào được hiện là việc của `core.ts`; `stage.tsx`
   chỉ vẽ `modState`. Hai nơi cùng quyết thì sớm muộn hai nơi nói khác nhau.
3. **CSS lấy màu từ biến của thiết kế**, kèm giá trị lui:
   `background: var(--stage-chip-bg, rgba(0,0,0,.5))`. Nhờ vậy cùng một module trông hợp ở
   phòng kể chuyện, phòng đám cưới và quán bar mà không phải sửa dòng nào. Đơn vị dùng `cqw`
   — khung sân khấu khai `container-type: inline-size`.

Rồi khai phần vẽ trong `PHAN_VE` ở `client/shared/stage-sdk/src/registry.ts` (module thì đã có
ở `danh-sach.ts`, đây chỉ ghép slot với Part):

```ts
phan(moduleTopGivers, { slot: 'tops', Part: TopGiversStage }),
```

Thiết kế **không** import module; nó chỉ đặt `<Slot name="tops" />`.

## 7b. Ô cấu hình nhờ AI viết hộ

Ô nào cần thì khai thêm một dòng `ai` trong `fields` — lời dặn viết CÁI GÌ:

```ts
{
  key: 'passages',
  label: 'Các đoạn truyện',
  type: 'textarea',
  ai: 'các đoạn của MỘT truyện cổ tích Việt Nam, mỗi dòng một đoạn dưới 110 ký tự…',
}
```

Bảng xem mọc ra nút "AI viết" cạnh ô đó, kèm một chỗ để người vận hành thêm ý của mình.
Backend ghép lời dặn với ý đó rồi hỏi model (nhà cung cấp `mc`), trả về chữ thuần.

Chữ trả về chỉ **điền vào ô**, không tự lưu: người vận hành đọc, sửa, rồi mới quyết — máy
viết hộ chứ không viết thay. Và không chỗ nào phải biết tên module nào (quy ước 01 §6).

Ô ảnh / video thì khai `type: 'media'`: bảng xem cho dán đường dẫn, tải file lên, hoặc nhờ
AI vẽ — cả ba cùng cho ra một chuỗi đường dẫn, module không cần biết nó tới từ đâu.

Chọn bằng ảnh (bộ trang phục, nhân vật…): mỗi mục `options` khai thêm `img` (ảnh nhỏ, thường là
asset của chính module, `/m/<id>/…`). `type: 'gallery'` hiện lưới ảnh bấm để bật / tắt từng mục,
giá trị là mảng `value` đang bật (schema: `z.array(z.string())`); `type: 'select'` mà mục nào cũng
có `img` thì hiện lưới ảnh bấm chọn một. Mẫu: `client/modules/vu-cong-3d/src/manifest.ts`.

## 7c. Module đọc to — tab Giọng đọc

Module nào có câu `say` thì khai hai ô vào tab `TAB_GIONG`: công tắc đọc to và ô chọn giọng.

```ts
import { TAB_GIONG } from '@live/contracts';

// schema
voice: z.boolean().default(true),
voiceId: z.string().max(60).default(''),

// fields
{ key: 'voice', label: 'Đọc to lời cảm ơn', short: 'Đọc to', type: 'toggle', tab: TAB_GIONG },
{ key: 'voiceId', label: 'Đọc bằng giọng', short: 'Giọng', type: 'voice', tab: TAB_GIONG },
```

- `type: 'voice'` — bảng xem và trang quản lý tự đổ dàn giọng của phòng vào thành ô chọn.
  Rỗng là giọng mặc định. Giọng đã gỡ khỏi dàn vẫn hiện, ghi "không còn trong dàn".
- **Lõi không đụng tới giọng.** Runtime (`registry.ts`, `ganGiong`) gắn giọng đã chọn vào mọi
  câu `say` chưa tự nói rõ `voice`. Lõi chỉ phải tôn trọng công tắc: `voice` tắt thì không
  sinh câu `say`.
- `tab` dùng cho mọi ô, không riêng giọng: modal chia tab khi có ô khai `tab`, ô không khai về
  tab đầu "Cài đặt". Module ngắn không khai gì vẫn là một trang.

**Đơn giọng / đa giọng** là công tắc của cả phòng (`multi` trong cài đặt giọng, hộp thoại
Giọng đọc ở trang quản lý):

- Đơn giọng (mặc định): cả phòng đọc bằng giọng mặc định của dàn. `voiceId` của tính năng và
  dấu vai trong câu bị bỏ qua.
- Đa giọng: ô `voice` là **giọng chính** của tính năng. Trong nội dung, `[id-giọng]` đổi sang
  giọng đó tới dấu kế tiếp, `[-]` quay về giọng chính:
  `Ông lão gọi: [ong-lao] Con ơi về đi! [-] Cô bé chạy về.`

Hàng đọc (`HangGiong`, hàm thuần `tachVai`) đọc lần lượt từng đoạn của một câu; cả câu là một
mục trong hàng chờ nên không bao giờ bị cắt giữa lời thoại. Phụ đề và chữ trên khung chiếu đi
qua `boVai`, nên khán giả không thấy dấu `[ong-lao]`. Module không phải làm gì thêm.

Câu MC chọn giọng ở tab Giọng đọc của thẻ MC (`voiceId` trong cấu hình AI của phòng); backend
gắn giọng đó vào câu MC trước khi đẩy xuống sân khấu.

## 8. Module có nút bấm

```ts
// manifest.ts
action: { label: 'Quay', op: 'draw' },

// core.ts
onAction(state, op, ctx) {
  if (op !== 'draw') return [];
  const pool = ctx.session.recentUsers;
  if (pool.length === 0) return [{ kind: 'say', text: 'Chưa có ai để quay.' }];
  const winner = pool[Math.floor(ctx.rand() * pool.length)]!;
  return [
    { kind: 'say', text: `Chúc mừng ${winner.name}!`, priority: 'high' },
    { kind: 'sfx', sound: 'fanfare' },
    { kind: 'record', table: 'raffle', row: { user: winner.user, at: ctx.now } },
  ];
}
```

## 9. Bảng kiểm trước khi gửi review

- [ ] `core.ts` không import `react`, `three`, không dùng `window`, `Date.now`, `Math.random`
- [ ] Nhận sự kiện bằng `hooks`, không có hàm nào tự kiểm `item.kind`
- [ ] `manifest.triggers` khớp đúng các khoá trong `core.hooks`
- [ ] Có `onConfig` nếu module có cấu hình, và nó xử lý được trường hợp tắt một tuỳ chọn giữa chừng
- [ ] Mọi trường trong schema có `.default(...)`
- [ ] `fields` có đủ mọi khoá của schema; `quick` tối đa 3 và trỏ tới khoá có thật
- [ ] Nhóm `other` thì không khai `quick`
- [ ] Test gọi qua `runFeed`/`runTick`, mở đầu bằng `kiemModule`
- [ ] Assets riêng của module nằm trong `client/modules/<id>/assets/`
- [ ] Không sửa file nào ngoài thư mục module, trừ một dòng trong `client/shared/stage-sdk/src/danh-sach.ts`
      (một dòng `phan(...)` trong `registry.ts` nếu có phần vẽ, một dependency trong `package.json` của stage-sdk)
