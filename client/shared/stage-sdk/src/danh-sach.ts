/** Danh sách module đã cài — nguồn DUY NHẤT.
 *
 *  Trang quản lý (`@live/stage-sdk/danh-sach`) và sổ module của sân khấu
 *  (`./registry`) cùng đọc mảng này, nên hai nơi không thể lệch nhau: thêm một
 *  tính năng là thêm một thư mục ở `client/modules/` rồi thêm một dòng ở đây.
 *  Phần vẽ (Part, slot) khai riêng ở `./registry`, theo đúng module object này.
 *
 *  File này cố ý không chạm React hay DOM: chỉ manifest và lõi, nạp được ở
 *  Node (test) và ở trang quản lý mà không kéo phần vẽ theo.
 */

import type { LiveModule } from '@live/contracts';
import { moduleChatBubbles } from '@live/mod-chat-bubbles';
import { moduleDanceFloor } from '@live/mod-dance-floor';
import { moduleFollowThanks } from '@live/mod-follow-thanks';
import { moduleGiftThanks } from '@live/mod-gift-thanks';
import { moduleLikesCounter } from '@live/mod-likes-counter';
import { moduleStory } from '@live/mod-story';
import { moduleTicker } from '@live/mod-ticker';
import { moduleTopGivers } from '@live/mod-top-givers';
import { moduleVuCong3d } from '@live/mod-vu-cong-3d';
import { moduleWelcome } from '@live/mod-welcome';

/** Bỏ kiểu cấu hình riêng của từng module để xếp chung một mảng. Ranh giới xoá
 *  kiểu duy nhất của danh sách: cấu hình thật luôn đi qua `schema` của chính
 *  module, nên không chỗ nào dựa vào kiểu đã bỏ. */
function xoaKieu<C, S>(m: LiveModule<C, S>): LiveModule {
  return m as unknown as LiveModule;
}

/** Thứ tự ở đây là thứ tự thẻ hiện ở trang quản lý và bảng xem. */
export const DANH_SACH_MODULE: readonly LiveModule[] = [
  xoaKieu(moduleStory),
  xoaKieu(moduleGiftThanks),
  xoaKieu(moduleWelcome),
  xoaKieu(moduleChatBubbles),
  xoaKieu(moduleTopGivers),
  xoaKieu(moduleLikesCounter),
  xoaKieu(moduleFollowThanks),
  xoaKieu(moduleTicker),
  xoaKieu(moduleDanceFloor),
  xoaKieu(moduleVuCong3d),
];
