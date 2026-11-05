import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
  max: z.number().int().min(1).max(8).default(5),
  songSec: z.number().int().min(2).max(60).default(7),
  giftEvery: z.number().int().min(1).max(10).default(3),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'chat-bubbles',
  name: 'Bóng chat nổi',
  icon: '💬',
  summary: 'Bình luận hiện thành bóng nổi ở góc màn',
  room: 'ke-chuyen',
  triggers: ['comment', 'gift'],
  configVersion: 1,
  schema,
  slots: ['chat'],
  quick: ['max', 'songSec'],
  fields: [
    { key: 'max', label: 'Số bóng cùng lúc', short: 'Số bóng', type: 'number', min: 1, max: 8 },
    {
      key: 'songSec',
      label: 'Bóng sống bao lâu',
      short: 'Sống (s)',
      type: 'number',
      unit: 'giây',
      min: 2,
      max: 60,
    },
    {
      key: 'giftEvery',
      label: 'Cứ mấy món quà thì chen một bóng quà',
      type: 'number',
      min: 1,
      max: 10,
      hint: 'Để 1 thì món quà nào cũng hiện; để lớn hơn cho đỡ lấn bình luận thật',
    },
  ],
};
