import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
  size: z.number().int().min(1).max(5).default(5),
  announce: z.boolean().default(true),
  template: z.string().min(1).max(200).default('{ten} vừa vươn lên dẫn đầu!'),
  race: z.boolean().default(true),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'top-givers',
  name: 'Top người tặng',
  icon: '🏆',
  summary: 'Bảng vinh danh người tặng nhiều nhất phiên',
  // Bảng vinh danh đọc thẳng từ phiên — không tự cộng lại thứ backend đã cộng,
  // và việc báo đổi ngôi làm theo nhịp. Bắt `gift` chỉ để nhớ ai vừa tặng gì
  // cho dòng đua top.
  triggers: ['gift'],
  configVersion: 2,
  schema,
  slots: ['tops'],
  needs: ['tts'],
  quick: ['size', 'announce', 'race'],
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
    {
      key: 'race',
      label: 'Dòng đua top',
      short: 'Dòng đua',
      type: 'toggle',
      hint: 'Dòng đỏ ngay trên bảng: ai vừa tặng gì và đang hạng mấy. Hiện một lúc lâu rồi nghỉ nửa phút',
    },
  ],
};
