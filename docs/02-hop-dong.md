# 02 — Hợp đồng dùng chung

Mọi type trong tài liệu này nằm ở `client/shared/contracts`. Backend (Rust) và frontend (TS) đều theo.
Đổi hợp đồng là đổi điểm chạm của cả hệ thống, phải sửa tài liệu này trước khi sửa mã.

## 1. Sơ đồ ba cửa

```
   nguồn          cửa vào              bus chung            cửa ra
┌──────────┐   ┌───────────┐      ┌──────────────┐     ┌──────────┐
│ TikTok   │──▶│           │      │              │────▶│  Effect  │──▶ sân khấu
│ giả lập  │──▶│ LiveEvent │─────▶│  FeedItem[]  │     └──────────┘
│ thủ công │──▶│           │      │              │────▶┌──────────┐
└──────────┘   └───────────┘      └──────────────┘     │ Command  │──▶ cổng duyệt
                                                        └──────────┘
```

## 2. Cửa vào — `LiveEvent`

Giữ nguyên hình dạng của mã cũ, đã chạy với live thật.

```ts
export interface EventUser {
  user: string;       // nick, định danh duy nhất
  name: string;       // tên hiển thị
  avatar?: string;
}

export type LiveEvent = EventUser & (
  | { kind: 'gift'; gift: string; count: number; xuEach: number }
  | { kind: 'like'; count: number; total?: number }
  | { kind: 'comment'; text: string }
  | { kind: 'join' }
  | { kind: 'leave' }
);
```

Mọi nguồn (webview TikTok, cầu nối, giả lập, bảng thử) đều chuẩn hoá về đây.
Thêm nguồn mới = viết một mapper trả `LiveEvent`, không đụng gì khác.

## 3. Bus chung — `FeedItem`

```ts
export type FeedKind =
  | LiveEvent['kind']
  | 'milestone' | 'system' | 'vote' | 'seat' | 'message' | 'host';

export interface FeedItem {
  id: number;
  at: number;          // mốc thời gian, ms
  kind: FeedKind;
  name: string;
  text: string;
  user?: string;
  xu?: number;         // điểm sau quy đổi
  coins?: number;      // xu thật TikTok, dùng cho sổ đối soát
  virtual?: boolean;   // nhân vật ảo: không đọc, không thông báo
  scripted?: boolean;  // câu do agent viết
  voice?: string;      // "nhà-cung-cấp:tên-giọng"
  story?: string;      // tên chuyện đang kể
}
```

`virtual` là cờ quan trọng: module nào đọc feed cũng phải bỏ qua mục `virtual`
trừ khi có lý do rõ ràng, nếu không bot sẽ tự cảm ơn chính nó.

## 4. Cửa ra — `Effect`

Module trả về `Effect[]`. Thiết kế quyết định thực thi thế nào.

```ts
export type Effect =
  | { kind: 'say';     text: string; voice?: string; priority?: Priority }
  | { kind: 'sfx';     sound: SfxName; volume?: number }
  | { kind: 'overlay'; slot: SlotName; node: OverlayNode; ttlMs?: number }
  | { kind: 'spawn';   actor: string; at?: Vec2; action?: string }
  | { kind: 'record';  table: 'gift' | 'vote' | 'raffle'; row: Json }
  | { kind: 'command'; command: RoomCommand; reason: string };

export type Priority = 'low' | 'normal' | 'high';
```

Quy tắc:

- `say` đi qua hàng chờ giọng đọc, `high` chen lên trước (ví dụ cảm ơn quà lớn).
- `say` có `voice` là **id một nhân vật trong dàn giọng** (`database/voice.json`),
  ví dụ `'be-gai'`. Không ghi thì dùng giọng mặc định. Module không biết và không
  cần biết giọng đó là của nhà cung cấp nào.
- `overlay` gắn vào **slot** mà thiết kế khai báo. Thiết kế không có slot đó thì effect bị bỏ, có ghi log, **không lỗi**.
- `command` là cửa duy nhất để module tác động sang module khác hoặc sang phiên; đi qua cổng duyệt.

## 5. Slot — chỗ thiết kế cho module cắm vào

Thiết kế khai báo slot trong `design.json`. Module khai báo slot nó cần.

```ts
export type SlotName =
  | 'top-bar' | 'ticker'
  | 'screen' | 'screen-overlay'
  | 'tops' | 'target'
  | 'stage-3d' | 'seats' | 'floor'
  | 'chat' | 'center'
  | 'corner-left' | 'corner-right'
  | 'bottom-bar' | 'full';
```

Tên slot nói **vai trí trong một phòng live**, không nói bối cảnh. Phòng kể chuyện, đám cưới
hay quán bar đều có khung chiếu, hàng vinh danh, vùng khán giả, góc chat — nhờ vậy một module
vẽ được ở mọi bối cảnh mà không cần biết mình đang ở phòng nào.

Manager đối chiếu hai danh sách và báo cho người dùng biết module nào chưa hiển thị được
trên thiết kế đang chạy. Đây là chỗ thay cho bảng `ROOM_MODULES` cũ, nhưng tự động.

## 6. Lệnh có kiểm soát — `RoomCommand`

```ts
export type RoomCommand =
  | { op: 'say';        text: string; voice?: string }
  | { op: 'set-module'; moduleId: string; on: boolean }
  | { op: 'set-config'; moduleId: string; patch: Json }
  | { op: 'set-design'; designId: string }
  | { op: 'set-design-config'; patch: Json }
  | { op: 'set-bot';           patch: Json }
  | { op: 'set-ai';            patch: Json }
  | { op: 'seed';       n: number }
  | { op: 'next-story' };

export type Gate = 'lam' | 'goi-y' | 'bo';
```

`set-design-config` là lựa chọn của chính thiết kế đang phát — khung dọc hay
ngang, đồ đạc của phòng — chứ không thuộc module nào. Thiết kế khai danh sách
lựa chọn bằng `DesignOption` (mặc định nằm ngay trong đó, vì thiết kế không có
schema zod như module), truyền vào `StageProvider`; bảng xem tự dựng form, và
backend lưu nó cạnh `modules` trong file cấu hình của thiết kế rồi phát xuống
bằng tin `{ t: 'design', config }`. Áp nóng như mọi thứ khác: không tải lại
trang.

`set-bot` chỉnh nhân vật ảo: `{ enabled, count }`. Chỉ có thế — câu họ nói và tên họ mang
là của thiết kế (`crowd` trong design.json, xem docs/04 §6), nên cùng một công tắc ở hai
bối cảnh cho ra hai đám đông khác hẳn. Backend giữ đám đông ở đúng số đó bằng sự kiện mang
cờ `virtual`, và phát xuống bằng tin `{ t: 'bot', cfg }`.

`set-ai` chỉnh MC do AI dẫn: `{ enabled, everySec, model, extra }`. **Khoá API không đi qua
đây và không bao giờ rời backend** — nó nằm ở kho khoá, nhà cung cấp `mc` (kind `anthropic`,
`baseUrl` rỗng thì gọi `https://api.anthropic.com`). Bản cũ để khoá trong `localStorage` của
trang đang live, đúng cái trang OBS đang thu.

Mỗi `everySec` giây backend chụp một bản tóm tắt phòng (ai đang chờ được đáp, MC đã nói gì,
tin mới) rồi hỏi model một lượt. Câu trả về đi vào phiên thành mục feed `kind: 'host'`, sân
khấu đọc to và hiện chữ. Đi qua feed chứ không phải một tin riêng, vì lượt sau AI phải đọc
lại được mình vừa nói gì, và cửa sổ xem mở giữa chừng cũng bắt đúng mạch.

Bình luận của khách vào lời nhắc trong thẻ `<tin_phong>` và được dặn rõ là **dữ liệu, không
phải chỉ dẫn**. Câu có nhắc tiền / kêu gọi đóng góp bị chặn ở backend, không lên sóng.

Người, luật tự động và AI dùng chung whitelist này, và chung cổng `gateFor`.
Mã cũ đã làm đúng ở `ops.ts` + `autopilot.ts`; chuyển sang nguyên tắc nguyên vẹn.

## 7. Manifest module

```ts
export interface ModuleManifest<C = Json> {
  id: string;                      // kebab-case, duy nhất
  name: string;                    // tên tiếng Việt trên thẻ
  icon: string;                    // emoji hoặc tên icon
  summary: string;                 // một dòng dưới tên
  room?: RoomKind;                 // chỉ hợp một loại phòng; thiếu là dùng chung
  triggers: FeedKind[];            // chạy khi nào — khớp khoá trong core.hooks
  fields: ConfigField[];           // mô tả ô cấu hình, manager tự dựng form
  configVersion: number;
  schema: ZodType<C>;              // kèm giá trị mặc định
  quick?: string[];                // khoá hiện ngay trên thẻ, tối đa 3
  slots?: SlotName[];              // slot cần có để hiển thị
  needs?: Capability[];            // 'tts' | 'audio' | 'stage-3d' | 'net'
  action?: { label: string; op: string };   // nút trên thẻ, vd "Quay"
  migrate?: (old: Json, fromVersion: number) => C;
}

export interface ConfigField {
  key: string;        // khoá trong config
  label: string;      // nhãn đầy đủ trong modal
  type: 'text' | 'textarea' | 'number' | 'toggle' | 'select' | 'range' | 'time';
  short?: string;     // nhãn ngắn khi ô này hiện trên thẻ, vd "Số bot"
  hint?: string;
  options?: { value: string; label: string }[];   // bắt buộc với 'select'
  min?: number; max?: number; step?: number; unit?: string;
}

export type Capability = 'tts' | 'audio' | 'stage-3d' | 'net' | 'storage';
```

`needs` để manager báo trước: module cần `tts` mà máy chưa cấu hình giọng đọc thì
hiện cảnh báo trên thẻ thay vì để người dùng bật rồi thấy im lặng.

Giá trị mặc định **chỉ** nằm trong `schema` (`.default(...)`). Manager lấy bằng
`schema.parse({})`. Để mặc định ở hai chỗ thì sớm muộn hai chỗ lệch nhau.

## 8. Lõi module

```ts
export interface ModuleCore<C, S = unknown> {
  init(config: C): S;

  /** Móc theo loại sự kiện — cửa duy nhất nhận tin từ bus.
   *  Cùng cách nghĩ với mục Sự kiện của TikTok LIVE Studio. */
  hooks?: Partial<Record<FeedKind, FeedHook<C, S>>>;

  /** Nhịp đều, mặc định 1 giây. Khai báo tickMs để đổi. */
  onTick?(state: S, now: number, ctx: Ctx<C>): Effect[];
  tickMs?: number;

  /** Cấu hình đổi giữa lúc đang chạy. BẮT BUỘC nếu module có cấu hình. */
  onConfig?(state: S, config: C): S;

  /** Người dùng bấm nút action trên thẻ. */
  onAction?(state: S, op: string, ctx: Ctx<C>): Effect[];

  /** Dọn dẹp khi tắt module hoặc đổi thiết kế. */
  dispose?(state: S): void;
}

export interface FeedHook<C, S> {
  /** Mặc định bỏ qua nhân vật ảo — runtime lọc, module không phải tự nhớ. */
  includeVirtual?: boolean;
  run(state: S, item: FeedItem, ctx: Ctx<C>): Effect[];
}
```

Gọi lõi qua `@live/runtime`, đừng gọi `hooks.gift.run(...)` thẳng — làm vậy là bỏ qua lớp
lọc nhân vật ảo:

```ts
import { runFeed, runTick, runAction } from '@live/runtime';
runFeed(module, state, item, ctx);
```

## 9. Ngữ cảnh — `Ctx`

```ts
export interface Ctx<C> {
  config: C;
  now: number;
  rand: () => number;
  /** Chỉ đọc. Module không sửa phiên trực tiếp. */
  session: Readonly<SessionView>;
}
```

`SessionView` là bản rút gọn chỉ đọc: tổng xu, tổng tim, số người xem, **chỗ ngồi đã có người**
(`seats`, mỗi chỗ là `{ i, user, name }` — chỗ thứ `i` nằm ở đâu là việc của thiết kế),
danh sách người đang trong phòng,
mục feed gần đây. Module **không** thấy toàn bộ state, để không ai phụ thuộc vào chi tiết nội bộ.

## 9. Manifest thiết kế — `design.json`

```json
{
  "id": "ke-chuyen",
  "name": "Phòng kể chuyện",
  "summary": "AI MC đọc truyện, khán giả ngồi ghế hình quạt",
  "version": "1.0.0",
  "canvas": { "width": 1080, "height": 1920 },
  "slots": ["top-bar", "center", "bottom-bar", "ticker"],
  "provides": ["stage-3d"],
  "recommends": ["gift-thanks", "welcome", "tts-mc", "top-givers"],
  "entry": "dist/index.html"
}
```

- `slots` — chỗ module cắm vào.
- `provides` — khả năng thiết kế tự có, thoả `needs` của module.
- `recommends` — module gợi ý bật khi lần đầu chọn thiết kế. **Chỉ gợi ý**, không ép.

## 10. Thông điệp WebSocket

```ts
// Backend → thiết kế và manager
type Down =
  | { t: 'feed';    items: FeedItem[] }
  | { t: 'session'; view: SessionView }
  | { t: 'config';  moduleId: string; config: Json }
  | { t: 'modules'; enabled: string[] }
  | { t: 'live';    designId: string | null };

// Manager → backend
type Up =
  | { t: 'command'; command: RoomCommand; by: 'nguoi' | 'luat' | 'ai' }
  | { t: 'ping' };
```

Thiết kế chỉ nhận, không gửi lệnh lên. Muốn tác động thì qua `Effect` dạng `command`,
do runtime trong thiết kế gửi lên kèm nhãn nguồn.
