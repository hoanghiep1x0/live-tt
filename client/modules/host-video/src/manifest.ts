import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
  /** Video người thật lên nói chuyện — tải lên lúc nào cũng được. */
  video: z.string().max(600).default(''),
  /** Tải video mới lên là phát ngay (một lần). Tắt thì chờ bấm "Phát". */
  phatNgay: z.boolean().default(true),
  /** Âm lượng của video, %. */
  amLuong: z.number().int().min(0).max(100).default(100),
  /** Phát ngần này PHÚT rồi ẩn; 0 là phát hết video đúng một lượt. Video ngắn
   *  hơn thì LẶP cho đủ ngần ấy phút. */
  phatPhut: z.number().int().min(0).max(60).default(2),
  /** Ẩn xong thì bao nhiêu phút sau hiện lại; 0 là không tự hiện lại. */
  lapPhut: z.number().int().min(0).max(240).default(10),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'host-video',
  name: 'Video người thật',
  icon: '🎥',
  summary: 'Video người thật ở góc rạp: phát một lúc rồi ẩn, cách quãng lại hiện lại',
  // Chỉ phòng có ô `corner-right` đặt đúng chỗ cho video mới bật được.
  room: 'ke-chuyen',
  triggers: [],
  configVersion: 1,
  schema,
  slots: ['corner-right'],
  actions: [
    { label: 'Phát', op: 'phat', icon: '▶' },
    { label: 'Tắt', op: 'tat', icon: '⏹' },
  ],
  quick: ['video', 'phatPhut', 'lapPhut'],
  fields: [
    {
      key: 'video',
      label: 'Video',
      short: 'Video',
      type: 'media',
      hint: 'TikTok cần người thật thỉnh thoảng lên tương tác: tải clip của bạn lên, phát một lần ở góc rạp rồi ẩn. Không lặp lại.',
    },
    {
      key: 'phatNgay',
      label: 'Tải lên là phát ngay',
      short: 'Phát ngay',
      type: 'toggle',
      hint: 'Tắt thì video chờ bạn bấm "Phát".',
    },
    { key: 'amLuong', label: 'Âm lượng', short: 'Âm lượng', type: 'range', min: 0, max: 100, unit: '%' },
    {
      key: 'lapPhut',
      label: 'Cách mấy phút hiện lại',
      short: 'Hiện lại',
      type: 'number',
      unit: 'phút',
      min: 0,
      max: 240,
      hint: 'Ẩn xong, chờ ngần này phút rồi phát lại. Để 0 là chỉ phát một lần.',
    },
    {
      key: 'phatPhut',
      label: 'Phát trong',
      short: 'Phát (phút)',
      type: 'number',
      unit: 'phút',
      min: 0,
      max: 60,
      hint: 'Mỗi lượt phát ngần này phút rồi ẩn. Video ngắn hơn thì lặp cho đủ. Để 0 là phát hết video một lượt.',
    },
  ],
};
