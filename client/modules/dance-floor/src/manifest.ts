import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';
import { TOI_DA } from './core';

export const schema = z.object({
  /** Bao nhiêu người chạy lên sàn mỗi màn. */
  count: z.number().int().min(1).max(TOI_DA).default(3),
  danceOnGift: z.boolean().default(true),
  danceSec: z.number().int().min(10).max(600).default(120),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'dance-floor',
  name: 'Sàn nhảy',
  icon: '💃',
  summary: 'Có quà thì vài người chạy lên sàn trước hàng ghế nhảy, khán giả tung hoa; xong thì chạy xuống',
  // `comment`: khách gõ "nhảy" thì chibi của họ lên sàn (máy chủ đọc lệnh sẵn ở `item.lenh`).
  triggers: ['gift', 'comment'],
  configVersion: 1,
  schema,
  slots: ['floor'],
  // Khai `room` để bảng xem và trang quản lý xếp nó vào đúng mục: hôm nay chỉ
  // phòng kể chuyện có slot `floor`, nên để nó ở mục dùng chung là nói với
  // người vận hành rằng mọi phòng đều bật được — trong khi bật ở phòng khác
  // thì nó im lặng không hiện gì.
  //
  // Phần MÃ vẫn không ràng vào phòng nào: chỗ đứng tính trong lòng slot `floor`
  // chứ không theo toạ độ phòng kể chuyện (xem `CHO_DUNG` trong core.ts). Phòng
  // mới có slot đó thì thêm id của nó vào đây là chạy, không phải sửa lõi.
  room: 'ke-chuyen',
  needs: [],
  actions: [{ label: 'Nhảy ngay', op: 'nhay', icon: '🕺' }],
  quick: ['count', 'danceOnGift', 'danceSec'],
  fields: [
    {
      key: 'count',
      label: 'Số người trên sàn',
      short: 'Số người',
      type: 'range',
      min: 1,
      max: TOI_DA,
      step: 1,
      unit: 'người',
      hint: 'Ba người đầu đứng giữa sàn; đông hơn thì lan dần ra hai bên',
    },
    {
      key: 'danceOnGift',
      label: 'Có quà thì lên nhảy',
      short: 'Nhảy khi có quà',
      type: 'toggle',
      hint: 'Tắt thì chỉ nhảy khi bấm “Nhảy ngay”. Quà tới liên tiếp thì nhảy tiếp, không chạy xuống',
    },
    {
      key: 'danceSec',
      label: 'Mỗi món quà nhảy thêm',
      short: 'Nhảy',
      type: 'number',
      unit: 'giây',
      min: 10,
      max: 600,
    },
  ],
};
