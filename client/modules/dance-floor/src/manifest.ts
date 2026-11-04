import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';
import { TOI_DA } from './core';

export const schema = z.object({
  /** Bao nhiêu người đứng trên sàn. Luôn có người đứng đó, kể cả lúc không ai
   *  nhảy — sàn trống trước hàng ghế A nhìn ra ngay là phòng thiếu người. */
  count: z.number().int().min(1).max(TOI_DA).default(3),
  danceOnGift: z.boolean().default(true),
  danceSec: z.number().int().min(10).max(600).default(120),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'dance-floor',
  name: 'Sàn nhảy',
  icon: '💃',
  summary: 'Vài người đứng trên sàn trước hàng ghế, có quà thì cả nhóm lên nhảy',
  triggers: ['gift'],
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
      hint: 'Tắt thì họ vẫn đứng đó làm động tác nghỉ, chỉ không nhảy nữa',
    },
    {
      key: 'danceSec',
      label: 'Một màn nhảy kéo dài',
      short: 'Nhảy',
      type: 'number',
      unit: 'giây',
      min: 10,
      max: 600,
    },
  ],
};
