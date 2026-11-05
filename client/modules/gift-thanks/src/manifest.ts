import { z } from 'zod';
import { TAB_GIONG } from '@live/contracts';
import type { ModuleManifest } from '@live/contracts';

/** Năm câu cảm ơn cho một món quà, đọc lần lượt theo `OFFSET_S`. MC nói nhiều
 *  kiểu thì người tặng mới thấy mình được nhắc tới thật, chứ nghe đúng một câu
 *  lặp lại là biết ngay máy đọc. */
const CAM_ON = [
  'Ui, {ten} tặng {qua} cho MC nè, cảm ơn bạn nhiều nhiều nha 🥰',
  '{ten} ơi, {qua} xinh xỉu luôn á, MC thương bạn ghê ❤',
  'Cả phòng ơi, vỗ tay cảm ơn {ten} giùm MC nha 👏🌸',
  'MC vẫn còn cười tủm tỉm vì {qua} của {ten} nè 😊',
  'Thêm một lần cảm ơn {ten} nha, chúc bạn hôm nay toàn chuyện vui 🍀',
].join('\n');

/** Quà lớn thì MC phấn khích hẳn lên. */
const CAM_ON_LON = [
  'Trời ơi trời ơi! {ten} tặng {qua} luôn kìa cả nhà ơi! MC cảm ơn {ten} nhiều lắm lắm luôn 😍🎉',
  'Ôi MC xúc động quá trời! {qua} của {ten} làm sáng rực cả phòng luôn á, thương {ten} ghê luôn 🥹❤',
  'Cả phòng ơi vỗ tay thật to cho {ten} đi nè! Cảm ơn {ten} rối rít luôn á 👏👏🌸',
  'MC vẫn còn run tay vì {qua} của {ten} đó nha, cảm ơn {ten} bao nhiêu cũng không đủ 😆💖',
  'Thêm một lần nữa nè: cảm ơn {ten} siêu siêu nhiều! Chúc {ten} hôm nay vui ơi là vui, may mắn ngập tràn 🍀✨',
].join('\n');

export const schema = z.object({
  voice: z.boolean().default(true),
  voiceId: z.string().max(60).default(''),
  minCoins: z.number().int().min(0).max(100_000).default(1),
  templates: z.string().min(1).max(4_000).default(CAM_ON),
  bigTemplates: z.string().min(1).max(4_000).default(CAM_ON_LON),
  bigCount: z.number().int().min(1).max(10_000).default(10),
  bigCoins: z.number().int().min(1).max(100_000).default(100),
  repeats: z.number().int().min(1).max(5).default(5),
  combo: z.boolean().default(true),
  comboSec: z.number().int().min(1).max(60).default(5),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'gift-thanks',
  name: 'Cảm ơn quà',
  icon: '🎁',
  summary: 'Đọc tên & tạo hiệu ứng khi có quà, nhắc lại vài lần sau đó',
  room: 'ke-chuyen',
  triggers: ['gift'],
  configVersion: 2,
  schema,
  slots: ['ticker'],
  needs: ['tts', 'audio'],
  quick: ['minCoins', 'repeats', 'combo'],
  fields: [
    { key: 'minCoins', label: 'Quà tối thiểu (xu)', short: 'Từ (xu)', type: 'number', min: 0 },
    {
      key: 'repeats',
      label: 'Cảm ơn mấy lần một món quà',
      short: 'Số lần',
      type: 'number',
      min: 1,
      max: 5,
      hint: 'Các câu cách nhau 0 · 5 · 15 · 30 · 60 giây, mỗi lần một câu khác',
    },
    {
      key: 'templates',
      label: 'Câu cảm ơn',
      type: 'textarea',
      hint: 'Mỗi dòng một câu, đọc lần lượt. Dùng {ten}, {qua}, {soluong}',
    },
    {
      key: 'bigTemplates',
      label: 'Câu cảm ơn quà lớn',
      type: 'textarea',
      hint: 'Dùng khi món quà vượt ngưỡng dưới đây',
    },
    {
      key: 'bigCount',
      label: 'Quà lớn từ bao nhiêu món',
      type: 'number',
      unit: 'món',
      min: 1,
    },
    {
      key: 'bigCoins',
      label: 'Hoặc từ bao nhiêu xu',
      type: 'number',
      unit: 'xu',
      min: 1,
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
    { key: 'voice', label: 'Đọc to lời cảm ơn', short: 'Đọc to', type: 'toggle', tab: TAB_GIONG },
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
