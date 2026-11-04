import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';

/** Vài kiểu chào, dùng xoay vòng. Chào ba mươi người bằng đúng một câu thì
 *  người thứ hai đã nghe ra là máy. */
const CHAO = [
  'Chào {ten} 👋',
  'Chào mừng {ten} vào phòng 🙏',
  '{ten} vào rồi kìa, chào bạn nha',
  'Chào {ten}, ngồi nghe chuyện cùng cả nhà nhé',
].join('\n');

export const schema = z.object({
  templates: z.string().min(1).max(2_000).default(CHAO),
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
  triggers: ['join'],
  configVersion: 2,
  schema,
  slots: ['ticker'],
  needs: ['tts', 'audio'],
  quick: ['gapSec', 'voice'],
  fields: [
    {
      key: 'templates',
      label: 'Câu chào',
      short: 'Câu chào',
      type: 'textarea',
      hint: 'Mỗi dòng một câu, chào xoay vòng. Dùng {ten} cho tên người vào',
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
