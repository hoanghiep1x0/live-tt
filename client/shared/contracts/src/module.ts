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
  | 'time';

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
  /** Bắt buộc với `select`. */
  options?: readonly { value: string; label: string }[];
  /** Cho `range` và `number`. */
  min?: number;
  max?: number;
  step?: number;
  /** Đơn vị hiện cạnh số, ví dụ "giây". */
  unit?: string;
}

/** Nút bấm trên thẻ, ví dụ "Quay" của module quay thưởng. */
export interface ModuleAction {
  label: string;
  op: string;
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
  /** 'quick' lên nhóm trên, có ô chỉnh nhanh; 'other' là thẻ gọn. */
  group: 'quick' | 'other';
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
  action?: ModuleAction;
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

  /** Dọn tài nguyên khi tắt module hoặc đổi thiết kế. */
  dispose?(state: S): void;
}

export interface LiveModule<C = Json, S = unknown> {
  manifest: ModuleManifest<C>;
  core: ModuleCore<C, S>;
}
