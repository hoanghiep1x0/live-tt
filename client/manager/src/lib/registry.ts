/** Sổ module đã cài, phía trang quản lý.
 *
 *  Danh sách module KHÔNG khai ở đây: nó đọc đúng mảng mà sân khấu đọc
 *  (`@live/stage-sdk/danh-sach`), nên tab ở trang này và bảng xem trên sân khấu
 *  luôn cùng một danh sách. Không có `if (id === …)` ở bất kỳ đâu khác trong
 *  trang quản lý: mọi thứ nó cần vẽ đều đọc từ manifest.
 */

import { phuCauHinh } from '@live/contracts';
import type { FeedKind, Json, ModuleUi } from '@live/contracts';
import { DANH_SACH_MODULE } from '@live/stage-sdk/danh-sach';

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

export const MODULES: readonly Registered[] = DANH_SACH_MODULE.map((m) => reg(m.manifest));

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
  return phuCauHinh(r.ui.fields, r.defaults, luu);
}
