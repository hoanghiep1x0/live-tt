/** Hợp đồng của một module tính năng. Xem docs/03-viet-module.md. */

import type { ZodType } from 'zod';
import type { Effect, Json, SlotName } from './effects';
import type { FeedItem, SessionView } from './events';

/** ID hợp lệ: kebab-case, bắt đầu bằng chữ. Dùng cho cả module và thiết kế.
 *  Cố ý KHÔNG ràng buộc dạng `kieu-<số>` như mã cũ. */
export const ID_RE = /^[a-z][a-z0-9-]{1,31}$/;

export type Capability = 'tts' | 'audio' | 'stage-3d' | 'net' | 'storage';

/** Một ô chỉnh nhanh hiện ngay trên thẻ module, không cần mở modal. */
export interface QuickField {
  /** Khoá trong cấu hình của module. */
  key: string;
  /** Nhãn ngắn vừa bề ngang thẻ, ví dụ "Số bot". */
  label: string;
}

/** Nút bấm trên thẻ, ví dụ "Quay" của module quay thưởng. */
export interface ModuleAction {
  label: string;
  op: string;
}

export interface ModuleManifest<C = Json> {
  id: string;
  /** Tên tiếng Việt hiện trên thẻ. */
  name: string;
  icon: string;
  /** Một dòng mô tả dưới tên. */
  summary: string;
  /** 'quick' lên nhóm trên, có ô chỉnh nhanh; 'other' là thẻ gọn. */
  group: 'quick' | 'other';
  configVersion: number;
  /** Schema kèm giá trị mặc định. Backend kiểm tra bằng chính schema này. */
  schema: ZodType<C>;
  /** Tối đa 3 — nhiều hơn thì thẻ chật. */
  quick?: readonly QuickField[];
  /** Slot cần có để module hiển thị được. */
  slots?: readonly SlotName[];
  /** Khả năng module cần. Thiếu thì manager cảnh báo trước khi bật. */
  needs?: readonly Capability[];
  action?: ModuleAction;
  migrate?: (old: Json, fromVersion: number) => C;
}

export interface Ctx<C> {
  config: C;
  now: number;
  /** Tiêm vào để test chạy lại cho cùng kết quả. Không dùng Math.random. */
  rand: () => number;
  session: SessionView;
}

export interface ModuleCore<C, S = unknown> {
  init(config: C): S;

  /** Một mục mới trên bus. Nhớ bỏ qua mục `virtual`. */
  onFeed?(state: S, item: FeedItem, ctx: Ctx<C>): Effect[];

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
