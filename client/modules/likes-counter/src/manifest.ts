import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
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
  ],
};
