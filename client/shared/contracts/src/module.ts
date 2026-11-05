/** Hợp đồng của một module tính năng. Xem docs/03-viet-module.md. */

import type { ZodType } from 'zod';
import type { Effect, Json, SlotName } from './effects';
import type { FeedItem, FeedKind, SessionView } from './events';

/** ID hợp lệ: kebab-case, bắt đầu bằng chữ. Dùng cho cả module và thiết kế.
 *  Cố ý KHÔNG ràng buộc dạng `kieu-<số>` như mã cũ. */
export const ID_RE = /^[a-z][a-z0-9-]{1,31}$/;

export type Capability = 'tts' | 'audio' | 'stage-3d' | 'net' | 'storage';

/** Kiểu điều khiển dựng cho một khoá cấu hình. */
export type ConfigFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'toggle'
  | 'select'
  | 'range'
  | 'time'
  /** Ảnh hoặc video: dán đường dẫn, tải file lên, hoặc nhờ AI vẽ. Giá trị vẫn
   *  là một chuỗi đường dẫn — module không cần biết nó tới từ đâu. */
  | 'media'
  /** Chọn một giọng trong dàn giọng của phiên. Giá trị là id giọng, rỗng là
   *  giọng mặc định. Bảng xem và trang quản lý tự đổ danh sách giọng vào —
   *  module chỉ khai một dòng, runtime tự gắn giọng đó vào mọi câu nó đọc. */
  | 'voice'
  /** Bật / tắt nhiều mục, mỗi mục một ảnh nhỏ — vd các bộ trang phục. Giá trị
   *  là mảng các `value` đang bật. Cần `options`; mục có `img` hiện thành ảnh. */
  | 'gallery'
  /** Một nhóm mục, mỗi mục một tab con — vd từng nhân vật trong phòng. Mục lấy từ
   *  `options`, ô của mỗi mục lấy từ `fields`. Giá trị là object `{ <mục>: { <ô>: … } }`;
   *  mục hay ô thiếu thì module tự hiểu là mặc định. */
  | 'roster'
  /** Danh sách mục người vận hành tự thêm / xoá — vd các nhóm đám đông. Mỗi mục một
   *  thẻ chứa các ô `fields`; giá trị là mảng object, mỗi object có `id` riêng. Bấm Thêm
   *  là chép `moi`. `max` là số mục tối đa. */
  | 'list'
  /** Chọn món trong tủ đồ của module (`assets/tu-do/<nguồn>/<ô>/<món>/`, máy chủ quét ở `/s/tu-do/<module>`).
   *  Giá trị là mảng khoá món `"<nguồn>/<ô>/<món>"`. Bảng xem dựng lưới ảnh theo ô, có nút xoá món / cả nguồn. */
  | 'tu-do';

/** Mô tả một khoá cấu hình để trang quản lý tự dựng form.
 *
 *  Giá trị mặc định KHÔNG nằm ở đây — nó nằm trong schema zod (quy ước 01 §7),
 *  trang quản lý lấy bằng `manifest.schema.parse({})`. Hai chỗ cùng giữ mặc định
 *  thì sớm muộn lệch nhau. */
export interface ConfigField {
  /** Khoá trong object cấu hình của module. */
  key: string;
  /** Nhãn đầy đủ, hiện trong modal. */
  label: string;
  type: ConfigFieldType;
  /** Nhãn ngắn khi ô này hiện ngay trên thẻ. Thiếu thì dùng `label`. */
  short?: string;
  /** Một dòng giải thích dưới ô. */
  hint?: string;
  /** Bắt buộc với `select` và `gallery`. `img` là ảnh nhỏ của mục (thường là asset
   *  của chính module, `/m/<id>/…`): `select` mà mục nào cũng có ảnh thì hiện thành
   *  lưới ảnh bấm chọn thay cho danh sách thả xuống — nhận ra bằng mắt nhanh hơn đọc tên. */
  options?: readonly { value: string; label: string; img?: string }[];
  /** Cho `range` và `number`. */
  min?: number;
  max?: number;
  step?: number;
  /** Đơn vị hiện cạnh số, ví dụ "giây". */
  unit?: string;
  /** Ô này nhờ AI viết hộ được. Chuỗi là lời dặn: viết CÁI GÌ, dài bao nhiêu,
   *  theo khuôn nào — backend ghép nó vào lời nhắc rồi trả về chữ thuần.
   *
   *  Để ở mô tả ô chứ không làm một đường riêng cho từng module: ô nào cần thì
   *  khai một dòng, bảng xem mọc ra cái nút, và không chỗ nào phải biết tên
   *  module nào (quy ước 01 §6). */
  ai?: string;
  /** Tên tab chứa ô này trong modal cấu hình. Thiếu là tab đầu ("Cài đặt").
   *  Modal chỉ chia tab khi có ô khai tab — module ngắn vẫn là một trang. */
  tab?: string;
  /** Ô nằm trên thẻ (`quick`) mà còn kèm vài ô phụ: trên thẻ nó thành một nút ghi giá
   *  trị đang chọn, bấm mở hộp nhỏ chỉ có chính ô này và các ô liệt kê ở đây — vd
   *  "Điệu" kèm "đổi điệu mỗi … giây". Modal đầy đủ vẫn hiện mọi ô như thường. */
  popup?: readonly string[];
  /** Cho `roster` và `list`: các ô của mỗi mục. */
  fields?: readonly ConfigField[];
  /** Cho `tu-do`: thân nhân vật của module (vd `model-1`) — bảng chỉ hiện đồ ôm theo thân này. */
  than?: string;
  /** Cho `tu-do`: GLB thân trong assets của module (vd `model-1.glb`) — có thì bảng dựng khung thử đồ 3D. */
  mau?: string;
  /** Cho `tu-do`: khoá ô anh em giữ bộ dựng sẵn (vd `bo`) — khung thử đồ mặc bộ đó khi chưa chọn món nào. */
  boSan?: string;
  /** Cho `list`: mục mới khi bấm Thêm (chưa có `id` — tự sinh). */
  moi?: { readonly [k: string]: Json };
}

/** Nút bấm trên thẻ, ví dụ "Quay" của module quay thưởng, "Nhảy ngay" của vũ công.
 *
 *  Bấm là việc tức thời, không phải cấu hình: không lưu, không đổi gì ở backend.
 *  Lệnh `module-action` đi xuống sân khấu, runtime gọi `core.onAction(state, op)`.
 *  Trang quản lý và bảng xem tự vẽ nút từ đây, không chỗ nào biết tên module. */
export interface ModuleAction {
  label: string;
  /** Khoá truyền vào `onAction`. kebab-case, như id. */
  op: string;
  /** Emoji đứng trước nhãn. */
  icon?: string;
}

/** Loại phòng live. Mỗi loại có một nhúm tính năng của riêng nó. */
export type RoomKind = 'ke-chuyen' | 'san-bar' | 'dam-cuoi';

/** Loại phòng theo thứ tự hiện trên trang. Mở một dạng live mới = thêm một dòng
 *  ở đây rồi gắn `room` cho các module của nó. */
export const LOAI_PHONG: readonly { id: RoomKind; name: string }[] = [
  { id: 'ke-chuyen', name: 'Live Kể Truyện' },
  { id: 'san-bar', name: 'Live Sàn Bar' },
  { id: 'dam-cuoi', name: 'Live Đám Cưới' },
];

/** `x` có phải id một loại phòng đã khai trong `LOAI_PHONG` không. */
export function laLoaiPhong(x: unknown): x is RoomKind {
  return LOAI_PHONG.some((p) => p.id === x);
}

/** Tính năng có thuộc riêng loại phòng `loai` không — `room` khai một loại
 *  hoặc một danh sách loại. Tính năng chung (không khai `room`) không thuộc
 *  riêng loại nào. */
export function thuocPhong(
  ui: { room?: RoomKind | readonly RoomKind[] },
  loai: RoomKind | undefined,
): boolean {
  if (ui.room === undefined || loai === undefined) return false;
  return typeof ui.room === 'string' ? ui.room === loai : ui.room.includes(loai);
}

/** Tính năng có dùng được ở phòng loại `loai` không: tính năng chung (không
 *  khai `room`) hợp mọi phòng, tính năng riêng chỉ hợp đúng các loại của nó.
 *
 *  Chỗ DUY NHẤT quyết chuyện này. Runtime sân khấu, bảng xem và trang quản lý
 *  cùng gọi hàm này, nên không nơi nào hiện một tính năng mà nơi khác giấu.
 *  Thiết kế chưa khai loại phòng thì chỉ có tính năng chung. */
export function hopPhong(
  ui: { room?: RoomKind | readonly RoomKind[] },
  loai: RoomKind | undefined,
): boolean {
  return ui.room === undefined || thuocPhong(ui, loai);
}

/** Tính năng có sẵn của hệ — không phải module, nhưng cũng chỉ hiện ở loại
 *  phòng có thiết kế dùng tới nó, cùng luật `room` như module. Loại phòng
 *  chưa có thiết kế nào dùng thì không khai vào đây.
 *
 *  Chỉ "Kết nối AI" là dùng chung, nên nó không có dòng ở đây. */
export const TINH_NANG_HE = {
  /** MC do AI dẫn: chỉ phòng kể chuyện có chỗ hiện lời MC. */
  mc: { room: ['ke-chuyen'] },
  /** Nhân vật ảo: thiết kế nào khai `crowd.lines` thì dùng. Sàn bar chỉ có
   *  vũ công 3D, không khai đám đông. */
  nhanVatAo: { room: ['ke-chuyen'] },
} as const satisfies Record<string, { room: readonly RoomKind[] }>;

/** Tính năng có chạy được — và THẤY được — ở thiết kế này không: đúng loại
 *  phòng (`hopPhong`) và thiết kế có đủ mọi slot tính năng cần để vẽ. Thiếu
 *  slot thì bật lên cũng không hiện gì, nên coi như không hợp.
 *
 *  Sân khấu, bảng xem và trang quản lý cùng gọi hàm này. */
export function hopThietKe(
  ui: { room?: RoomKind | readonly RoomKind[]; slots?: readonly SlotName[] },
  tk: { category?: RoomKind | undefined; slots: readonly string[] },
): boolean {
  return hopPhong(ui, tk.category) && (ui.slots ?? []).every((x) => tk.slots.includes(x));
}

/** Phần hiển thị của manifest. Trang quản lý chỉ cần đến đây, không cần schema —
 *  nhờ vậy nó không phải nạp zod của từng module chỉ để vẽ một cái thẻ. */
export interface ModuleUi {
  id: string;
  /** Tên tiếng Việt hiện trên thẻ. */
  name: string;
  /** Emoji hiện trong ô vuông nổi trên thẻ. */
  icon: string;
  /** Một dòng mô tả dưới tên. */
  summary: string;
  /** Loại phòng mà tính năng này CHỈ hợp — một loại, hoặc danh sách khi
   *  nhiều loại phòng cùng dùng. Chỉ khai những loại có thiết kế thật sự dùng
   *  nó (gợi ý trong `recommends`). Thiếu nghĩa là dùng chung cho mọi loại.
   *
   *  Đây là chỗ duy nhất khai đặc thù theo loại phòng. Phần còn lại của hệ —
   *  hợp đồng, runtime, sân khấu — không biết "đám cưới" hay "sàn bar" là gì. */
  room?: RoomKind | readonly RoomKind[];
  /** Sự kiện module này bắt, để trang quản lý nói được "Chạy khi: có quà".
   *  Phải khớp đúng các khoá trong `core.hooks` — có test giữ hai bên không lệch. */
  triggers: readonly FeedKind[];
  fields: readonly ConfigField[];
  /** Khoá hiện ngay trên thẻ để chỉnh không cần mở modal.
   *  Tối đa 3 — nhiều hơn thì thẻ chật. */
  quick?: readonly string[];
  /** Slot cần có để module hiển thị được. */
  slots?: readonly SlotName[];
  /** Khả năng module cần. Thiếu thì manager cảnh báo trước khi bật. */
  needs?: readonly Capability[];
  /** Nút bấm tức thời trên thẻ. Phải khớp các `op` mà `core.onAction` nhận. */
  actions?: readonly ModuleAction[];
}

export interface ModuleManifest<C = Json> extends ModuleUi {
  configVersion: number;
  /** Schema kèm giá trị mặc định. Backend kiểm tra bằng chính schema này. */
  schema: ZodType<C>;
  migrate?: (old: Json, fromVersion: number) => C;
}

export interface Ctx<C> {
  config: C;
  now: number;
  /** Tiêm vào để test chạy lại cho cùng kết quả. Không dùng Math.random. */
  rand: () => number;
  session: SessionView;
}

/** Một móc sự kiện: "khi có quà thì…", "khi có người theo dõi thì…".
 *
 *  Cùng cách nghĩ với mục Sự kiện của TikTok LIVE Studio — mỗi tính năng khai
 *  báo nó chạy khi nào, thay vì nhận mọi thứ rồi tự `if (kind !== 'gift')`.
 *  Nhờ vậy phòng đông người thì runtime chỉ gọi đúng module có quan tâm, và
 *  trang quản lý đọc được điều kiện chạy mà không cần nạp lõi module. */
export interface FeedHook<C, S> {
  /** Mặc định bỏ qua nhân vật ảo. Quên tay một lần là bot tự cảm ơn chính nó,
   *  nên để runtime lọc chứ không để từng module tự nhớ. */
  includeVirtual?: boolean;
  run(state: S, item: FeedItem, ctx: Ctx<C>): Effect[];
}

export type FeedHooks<C, S> = Partial<Record<FeedKind, FeedHook<C, S>>>;

export interface TrangThaiNut {
  bat: string | null;
  chu: string;
}

export interface ModuleCore<C, S = unknown> {
  init(config: C): S;

  /** Móc theo loại sự kiện. Cửa duy nhất để nhận tin từ bus. */
  hooks?: FeedHooks<C, S>;

  onTick?(state: S, now: number, ctx: Ctx<C>): Effect[];
  /** Nhịp gọi onTick, mặc định 1000 ms. */
  tickMs?: number;

  /** Cấu hình đổi giữa lúc đang live. BẮT BUỘC nếu module có cấu hình.
   *  Phải xử lý được cả trường hợp người dùng tắt một tuỳ chọn giữa chừng. */
  onConfig?(state: S, config: C): S;

  onAction?(state: S, op: string, ctx: Ctx<C>): Effect[];

  /** Hàng nút (`actions`) đang ở thế nào, cho bảng xem vẽ rõ: `bat` là `op` của nút
   *  đang có hiệu lực (nút đó sáng lên), `chu` là một dòng ngắn nói đang làm gì.
   *  Thiếu thì các nút chỉ là nút bấm, không có trạng thái. */
  trangThaiNut?(state: S, now: number): TrangThaiNut;

  /** Dọn tài nguyên khi tắt module hoặc đổi thiết kế. */
  dispose?(state: S): void;
}

export interface LiveModule<C = Json, S = unknown> {
  manifest: ModuleManifest<C>;
  core: ModuleCore<C, S>;
}

type JsonObj = { [k: string]: Json };

function laObj(v: Json | undefined): v is JsonObj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Các ô của một mục trong giá trị `roster`. Mục chưa có thì rỗng. */
export function mucRoster(v: Json, muc: string): JsonObj {
  const m = laObj(v) ? v[muc] : undefined;
  return laObj(m) ? m : {};
}

/** Giá trị `roster` mới sau khi sửa ô `o` của mục `muc` — giữ nguyên mọi mục, mọi ô khác. */
export function suaRoster(v: Json, muc: string, o: string, x: Json): Json {
  return { ...(laObj(v) ? v : {}), [muc]: { ...mucRoster(v, muc), [o]: x } };
}

/** Cấu hình đang có hiệu lực: mặc định của schema, phủ bằng thứ đã lưu.
 *
 *  Backend chỉ lưu khoá người vận hành đã đổi, nên phủ một lớp là đủ — trừ ô `roster`:
 *  ở đó phủ thêm từng mục, để mục hay ô chưa lưu vẫn lấy mặc định, và giá trị lưu sai
 *  dạng (bản cũ lưu kiểu khác) thì bỏ, dùng mặc định. */
export function phuCauHinh(
  fields: readonly ConfigField[],
  macDinh: JsonObj,
  luu: Json | undefined,
): JsonObj {
  const ra: JsonObj = { ...macDinh, ...(laObj(luu) ? luu : {}) };
  for (const f of fields) {
    if (f.type !== 'roster') continue;
    const goc = laObj(macDinh[f.key]) ? (macDinh[f.key] as JsonObj) : {};
    const da = laObj(ra[f.key]) ? (ra[f.key] as JsonObj) : {};
    const hop: JsonObj = {};
    for (const m of new Set([...Object.keys(goc), ...Object.keys(da)])) {
      hop[m] = { ...mucRoster(goc, m), ...mucRoster(da, m) };
    }
    ra[f.key] = hop;
  }
  for (const f of fields) {
    if (f.type !== 'list') continue;
    const v = ra[f.key];
    ra[f.key] = Array.isArray(v) ? v.filter(laObj).map((x) => ({ ...(f.moi ?? {}), ...x })) : (macDinh[f.key] ?? []);
  }
  return ra;
}

/** Các mục của giá trị `list`. Sai dạng thì rỗng. */
export function mucList(v: Json): JsonObj[] {
  return Array.isArray(v) ? v.filter(laObj) : [];
}

/** Giá trị `list` sau khi thêm một mục chép từ `moi`, kèm `id` mới. */
export function themList(f: ConfigField, v: Json, id: string): Json {
  return [...mucList(v), { ...(f.moi ?? {}), id }];
}

/** Giá trị `list` sau khi sửa ô `o` của mục thứ `i`. */
export function suaList(v: Json, i: number, o: string, x: Json): Json {
  return mucList(v).map((m, k) => (k === i ? { ...m, [o]: x } : m));
}

/** Giá trị `list` sau khi bỏ mục thứ `i`. */
export function boList(v: Json, i: number): Json {
  return mucList(v).filter((_, k) => k !== i);
}
