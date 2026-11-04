import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
  size: z.number().int().min(1).max(5).default(5),
  announce: z.boolean().default(true),
  template: z.string().min(1).max(200).default('{ten} vừa vươn lên dẫn đầu!'),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'top-givers',
  name: 'Top người tặng',
  icon: '🏆',
  summary: 'Bảng vinh danh người tặng nhiều nhất phiên',
  group: 'quick',
  // Không bắt sự kiện nào: bảng đọc thẳng từ phiên, còn việc báo đổi ngôi làm
  // theo nhịp. Bắt từng món quà thì phải tự cộng lại bảng mà backend đã cộng rồi.
  triggers: [],
  configVersion: 1,
  schema,
  slots: ['tops'],
  needs: ['tts'],
  quick: ['size', 'announce'],
  fields: [
    { key: 'size', label: 'Số người hiển thị', short: 'Số người', type: 'number', min: 1, max: 5 },
    {
      key: 'announce',
      label: 'Báo khi đổi ngôi đầu',
      short: 'Báo đổi ngôi',
      type: 'toggle',
      hint: 'Đọc một câu khi có người vượt lên hạng nhất',
    },
    { key: 'template', label: 'Câu báo đổi ngôi', type: 'text', hint: 'Dùng {ten}' },
  ],
};
