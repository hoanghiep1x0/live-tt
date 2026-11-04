import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
  template: z.string().min(1).max(200).default('Chào {ten} ghé phòng nha!'),
  gapSec: z.number().int().min(0).max(300).default(12),
  voice: z.boolean().default(true),
  skipDefault: z.boolean().default(true),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'welcome',
  name: 'Chào mừng vào phòng',
  icon: '👋',
  summary: 'Gọi tên & chào khi có người vào phòng',
  group: 'quick',
  triggers: ['join'],
  configVersion: 1,
  schema,
  slots: ['ticker'],
  needs: ['tts', 'audio'],
  quick: ['gapSec', 'voice'],
  fields: [
    {
      key: 'template',
      label: 'Câu chào',
      short: 'Câu chào',
      type: 'text',
      hint: 'Dùng {ten} cho tên người vào',
    },
    {
      key: 'gapSec',
      label: 'Giãn cách tối thiểu',
      short: 'Giãn (s)',
      type: 'number',
      unit: 'giây',
      min: 0,
      max: 300,
      hint: 'Phòng đông người vào liên tục: chào quá dày sẽ lấn bình luận thật',
    },
    { key: 'voice', label: 'Đọc to lời chào', short: 'Đọc to', type: 'toggle' },
    {
      key: 'skipDefault',
      label: 'Bỏ qua tên mặc định',
      type: 'toggle',
      hint: 'Không gọi tên kiểu "user123…"',
    },
  ],
};
