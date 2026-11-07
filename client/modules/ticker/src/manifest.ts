import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';

const MOI_MAC_DINH = [
  'Nghe thấy ấm lòng thì thả một trái tim cho câu truyện ❤',
  'Follow kênh để ghé nghe truyện bất cứ lúc nào 🌸',
  'Thích truyện nào, bình luận cho chúng mình biết để kể tiếp 😊',
  'Một lượt chia sẻ là thêm một người được nghe câu truyện này đó 🌷',
].join('\n');

export const schema = z.object({
  /** Lấy lời của ai lên dải. `top` cho dải một giọng quen thuộc; phòng đông mà
   *  để `tatca` thì lời chạy không kịp đọc. */
  source: z.enum(['top', 'tatca']).default('top'),
  invites: z.string().max(1_000).default(MOI_MAC_DINH),
  speed: z.number().min(2).max(12).default(5),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'ticker',
  name: 'Dải chữ chạy',
  icon: '📜',
  summary: 'Lời nhắn người xem chạy ngang, chưa ai nhắn thì chạy lời mời',
  room: 'ke-chuyen',
  triggers: ['comment'],
  configVersion: 1,
  schema,
  slots: ['ticker'],
  needs: [],
  quick: ['source', 'speed'],
  fields: [
    {
      key: 'source',
      label: 'Lấy lời của ai',
      short: 'Lời của',
      type: 'select',
      options: [
        { value: 'top', label: 'Chỉ top người tặng' },
        { value: 'tatca', label: 'Mọi người xem' },
      ],
    },
    {
      key: 'speed',
      label: 'Tốc độ chạy',
      short: 'Tốc độ',
      type: 'range',
      min: 2,
      max: 12,
      step: 1,
      unit: 'chữ/giây',
      hint: 'Chữ dài hay ngắn đều trôi cùng tốc độ này',
    },
    {
      key: 'invites',
      label: 'Lời mời khi chưa ai nhắn',
      type: 'textarea',
      hint: 'Mỗi dòng một câu, chạy lần lượt',
    },
  ],
};
