/** Sổ module đã cài.
 *
 *  Thêm một tính năng = thêm một thư mục ở `client/modules/` rồi thêm một dòng
 *  ở đây. Không có `if (id === …)` ở bất kỳ đâu khác trong trang quản lý: mọi
 *  thứ nó cần vẽ đều đọc từ manifest.
 */

import type { FeedKind, Json, ModuleUi } from '@live/contracts';
import { manifest as chatBubbles } from '@live/mod-chat-bubbles';
import { manifest as followThanks } from '@live/mod-follow-thanks';
import { manifest as giftThanks } from '@live/mod-gift-thanks';
import { manifest as likesCounter } from '@live/mod-likes-counter';
import { manifest as story } from '@live/mod-story';
import { manifest as ticker } from '@live/mod-ticker';
import { manifest as topGivers } from '@live/mod-top-givers';
import { manifest as welcome } from '@live/mod-welcome';

export interface Registered {
  ui: ModuleUi;
  /** Cấu hình mặc định, lấy từ chính schema zod của module (quy ước 01 §7). */
  defaults: Record<string, Json>;
}

/** Chỉ cần đọc được `parse`; trang quản lý không kiểm tra cấu hình, backend làm
 *  việc đó bằng đúng schema này. */
type HasSchema = ModuleUi & { schema: { parse(v: unknown): unknown } };

function reg(m: HasSchema): Registered {
  return { ui: m, defaults: m.schema.parse({}) as Record<string, Json> };
}

export const MODULES: readonly Registered[] = [
  reg(story),
  reg(giftThanks),
  reg(welcome),
  reg(chatBubbles),
  reg(topGivers),
  reg(likesCounter),
  reg(followThanks),
  reg(ticker),
];

/** Chữ hiện trên nhãn "Chạy khi" của thẻ. */
const TEN_SU_KIEN: Partial<Record<FeedKind, string>> = {
  gift: 'có quà',
  like: 'có tim',
  comment: 'có bình luận',
  join: 'có người vào',
  leave: 'có người ra',
  follow: 'có người theo dõi',
  share: 'có người chia sẻ',
  subscribe: 'có hội viên',
  milestone: 'đạt mốc',
  vote: 'có bình chọn',
  message: 'có tin nhắn',
  seat: 'đổi ghế',
  host: 'chủ phòng nói',
  system: 'tin hệ thống',
};

export function tenSuKien(k: FeedKind): string {
  return TEN_SU_KIEN[k] ?? k;
}

/** Cấu hình đang có hiệu lực: mặc định của module, phủ bằng thứ đã lưu. */
export function hopCauHinh(
  r: Registered,
  luu: Record<string, Json> | undefined,
): Record<string, Json> {
  return { ...r.defaults, ...(luu ?? {}) };
}
