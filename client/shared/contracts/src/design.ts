/** Manifest của một thiết kế — nội dung design.json. Xem docs/04-viet-thiet-ke.md. */

import { z } from 'zod';
import { ID_RE } from './module';

const slot = z.enum([
  'top-bar',
  'bottom-bar',
  'left',
  'right',
  'center',
  'full',
  'ticker',
  'stage-3d',
]);

const capability = z.enum(['tts', 'audio', 'stage-3d', 'net', 'storage']);

export const designManifestSchema = z.object({
  id: z.string().regex(ID_RE, 'id phải là kebab-case, bắt đầu bằng chữ'),
  name: z.string().min(1),
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
  entry: z.string().default('dist/index.html'),
  quality: z
    .object({ auto: z.boolean().default(true), minFps: z.number().int().positive().default(24) })
    .optional(),
});

export type DesignManifest = z.infer<typeof designManifestSchema>;

/** Trạng thái phát của một thiết kế, hiện trên thẻ ở trang quản lý. */
export type DesignStatus = 'live' | 'off' | 'error';

export interface DesignInfo {
  manifest: DesignManifest;
  status: DesignStatus;
  /** URL cho OBS Browser Source. */
  obsUrl: string;
  /** Lý do khi status là 'error', ví dụ chưa build. */
  problem?: string;
}
