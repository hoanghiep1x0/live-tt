import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
  minCoins: z.number().int().min(0).max(100_000).default(1),
  template: z.string().min(1).max(200).default('Cảm ơn {ten} đã tặng {qua}!'),
  combo: z.boolean().default(true),
  comboSec: z.number().int().min(1).max(60).default(5),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'gift-thanks',
  name: 'Cảm ơn quà',
  icon: '🎁',
  summary: 'Đọc tên & tạo hiệu ứng khi có quà',
  group: 'quick',
  triggers: ['gift'],
  configVersion: 1,
  schema,
  slots: ['ticker'],
  needs: ['tts', 'audio'],
  quick: ['minCoins', 'combo'],
  fields: [
    { key: 'minCoins', label: 'Quà tối thiểu (xu)', short: 'Từ (xu)', type: 'number', min: 0 },
    {
      key: 'template',
      label: 'Câu cảm ơn',
      type: 'textarea',
      hint: 'Dùng {ten}, {qua}, {soluong}',
    },
    {
      key: 'combo',
      label: 'Gộp combo quà',
      short: 'Combo',
      type: 'toggle',
      hint: 'Gom quà liên tiếp của một người thành một lời cảm ơn',
    },
    {
      key: 'comboSec',
      label: 'Chờ gom combo',
      type: 'number',
      unit: 'giây',
      min: 1,
      max: 60,
      hint: 'Hết khoảng này không thấy quà mới thì đọc lời cảm ơn',
    },
  ],
};
