import { z } from 'zod';
import { TAB_GIONG } from '@live/contracts';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
  voice: z.boolean().default(true),
  voiceId: z.string().max(60).default(''),
  goal: z.number().int().min(1).max(100_000_000).default(10_000),
  stepPercent: z.number().int().min(5).max(100).default(25),
  template: z.string().min(1).max(200).default('Đã {phantram}% mục tiêu tim, cảm ơn cả phòng!'),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'likes-counter',
  name: 'Bộ đếm tim',
  icon: '❤️',
  summary: 'Thanh tiến độ lượt thả tim',
  room: 'ke-chuyen',
  triggers: ['like'],
  configVersion: 1,
  schema,
  slots: ['target'],
  fields: [
    { key: 'goal', label: 'Mục tiêu', type: 'number', unit: 'tim', min: 1 },
    {
      key: 'stepPercent',
      label: 'Báo mỗi',
      type: 'number',
      unit: '%',
      min: 5,
      max: 100,
      hint: 'Để 25 thì báo ở 25%, 50%, 75%, 100%',
    },
    { key: 'template', label: 'Câu báo mốc', type: 'text', hint: 'Dùng {phantram}' },
    { key: 'voice', label: 'Đọc to khi chạm mốc', short: 'Đọc to', type: 'toggle', tab: TAB_GIONG },
    {
      key: 'voiceId',
      label: 'Giọng chính',
      short: 'Giọng',
      type: 'voice',
      tab: TAB_GIONG,
      hint: 'Chỉ dùng khi phòng bật Đa giọng (trang quản lý, nút Giọng đọc). Trong câu, [id-giọng] đổi giọng, [-] quay về giọng chính.',
    },
  ],
};
