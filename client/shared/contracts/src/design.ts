/** Manifest của một thiết kế — nội dung design.json. Xem docs/04-viet-thiet-ke.md. */

import { z } from 'zod';
import { ID_RE } from './module';
import type { ConfigField } from './module';
import type { Json } from './effects';

/** Phải khớp `SlotName` ở effects.ts. */
const slot = z.enum([
  'top-bar',
  'ticker',
  'screen',
  'screen-overlay',
  'tops',
  'target',
  'stage-3d',
  'seats',
  'floor',
  'chat',
  'center',
  'corner-left',
  'corner-right',
  'bottom-bar',
  'full',
]);

const capability = z.enum(['tts', 'audio', 'stage-3d', 'net', 'storage']);

export const designManifestSchema = z.object({
  id: z.string().regex(ID_RE, 'id phải là kebab-case, bắt đầu bằng chữ'),
  name: z.string().min(1),
  /** Emoji hiện trong ô vuông nổi trên thẻ. Thiết kế tự khai, để trang quản lý
   *  không phải giữ một bảng ánh xạ theo id — quy ước 01 §6. */
  icon: z.string().default('🎬'),
  summary: z.string().default(''),
  version: z.string().default('1.0.0'),
  canvas: z
    .object({ width: z.number().int().positive(), height: z.number().int().positive() })
    .default({ width: 1080, height: 1920 }),
  /** Chỗ module cắm vào. Khai báo thiếu thì module im lặng không hiện. */
  slots: z.array(slot).default([]),
  /** Khả năng thiết kế tự có, dùng để thoả `needs` của module. */
  provides: z.array(capability).default([]),
  /** Module gợi ý bật khi lần đầu chọn thiết kế. Chỉ gợi ý, không ép. */
  recommends: z.array(z.string().regex(ID_RE)).default([]),
  /** Cấu hình gợi ý cho bối cảnh này, theo từng module. Backend nạp MỘT LẦN
   *  khi thiết kế chưa có cấu hình; sau đó sửa của người vận hành được giữ.
   *  Nhờ khối này mà một bối cảnh mới không cần sửa module nào. */
  defaults: z.record(z.string().regex(ID_RE), z.record(z.string(), z.unknown())).default({}),
  /** Số chỗ ngồi của phòng. Vị trí từng chỗ là việc của thiết kế. */
  seats: z.number().int().positive().max(1_000_000).default(84),
  /** Đổi xu TikTok sang điểm của phòng. Mỗi bối cảnh có thể khác nhau. */
  pointRate: z.number().positive().max(1000).default(1),
  /** Nhân vật ảo của riêng bối cảnh này.
   *
   *  Bắt buộc phải khai ở đây chứ không để backend giữ một bộ dùng chung: phòng
   *  kể chuyện thì người ta "nghe hay quá", sàn bar thì "quẩy lên", đám cưới thì
   *  "chúc hai bạn trăm năm". Một bộ câu dùng cho mọi phòng là lộ ngay.
   *  Bỏ trống thì phòng không có nhân vật ảo, dù người vận hành có bật. */
  crowd: z
    .object({
      /** Tên tự đặt, mỗi phần tử một tên. Rỗng thì ghép họ + tên Việt ngẫu nhiên. */
      names: z.array(z.string().min(1)).default([]),
      /** Câu họ bình luận. Rỗng là coi như bối cảnh này không khai đám đông. */
      lines: z.array(z.string().min(1)).default([]),
    })
    .default({ names: [], lines: [] }),
  entry: z.string().default('dist/index.html'),
  quality: z
    .object({ auto: z.boolean().default(true), minFps: z.number().int().positive().default(24) })
    .optional(),
});

export type DesignManifest = z.infer<typeof designManifestSchema>;

/** Một lựa chọn của riêng thiết kế: khung dọc hay ngang, bật tắt đồ đạc của
 *  phòng… KHÔNG thuộc module nào, vì nó đổi hình hài của chính căn phòng, mà
 *  module thì phải cắm được vào mọi thiết kế.
 *
 *  Mặc định nằm ngay đây chứ không trong schema zod như module (quy ước 01 §7):
 *  thiết kế không có schema, danh sách này chính là nguồn duy nhất. Thiết kế
 *  khai nó khi dựng `StageProvider`, bảng xem tự dựng form từ đó. */
export interface DesignOption extends ConfigField {
  value: Json;
}

/** Trạng thái phát của một thiết kế, hiện trên thẻ ở trang quản lý. */
export type DesignStatus = 'live' | 'off' | 'error';

export interface DesignInfo {
  manifest: DesignManifest;
  status: DesignStatus;
  /** URL cho OBS Browser Source. */
  obsUrl: string;
  /** Lý do khi status là 'error', ví dụ chưa build. */
  problem?: string;
  /** Tên người vận hành tự đặt, hoặc `manifest.name` nếu chưa đặt.
   *  Giữ riêng để không phải sửa design.json — file đó thuộc thiết kế. */
  displayName: string;
  /** Link TikTok LIVE Studio của phòng này, nếu đã lưu. */
  studioUrl?: string;
}
