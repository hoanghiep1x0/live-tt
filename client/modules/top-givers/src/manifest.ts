import { z } from 'zod';
import { TAB_GIONG } from '@live/contracts';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
  voice: z.boolean().default(true),
  voiceId: z.string().max(60).default(''),
  size: z.number().int().min(1).max(5).default(5),
  announce: z.boolean().default(true),
  template: z.string().min(1).max(200).default('{ten} vừa vươn lên dẫn đầu!'),
  race: z.boolean().default(true),
  /** Hàng bồ đoàn. Tách khỏi `race` vì hai khối này là hai thứ khác nhau:
   *  bảng ngồi dưới, dòng đua chạy trên, tắt cái nào cũng được. */
  board: z.boolean().default(true),
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
  room: 'ke-chuyen',
  triggers: ['gift'],
  configVersion: 3,
  schema,
  slots: ['tops'],
  needs: ['tts'],
  // Hai công tắc khối đứng trước: đó là thứ người vận hành gạt nhiều nhất.
  // `announce` lùi vào cấu hình đầy đủ — thẻ chỉ chứa được 3 ô chỉnh nhanh.
  quick: ['board', 'race', 'size'],
  fields: [
    {
      key: 'board',
      label: 'Hàng bồ đoàn',
      short: 'Bảng top',
      type: 'toggle',
      hint: 'Khối dưới: năm tòa sen xếp hạng người tặng. Tắt riêng, dòng đua vẫn chạy',
    },
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
      hint: 'Khối trên: dòng đỏ báo ai vừa tặng gì và đang hạng mấy. Hiện một lúc lâu rồi nghỉ nửa phút',
    },
    { key: 'voice', label: 'Đọc to khi đổi ngôi', short: 'Đọc to', type: 'toggle', tab: TAB_GIONG },
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
