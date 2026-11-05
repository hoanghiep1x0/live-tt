import { z } from 'zod';
import { TAB_GIONG } from '@live/contracts';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
  voiceId: z.string().max(60).default(''),
  title: z.string().max(120).default(''),
  /** Mỗi dòng một đoạn. Dòng trống bị bỏ qua. */
  passages: z.string().max(20_000).default(''),
  /** Ảnh hoặc video chiếu trong khung. Để trống thì khung chỉ có chữ. */
  media: z.string().max(600).default(''),
  /** Bỏ hẳn nền của khung — không ảnh, không video, không nền đổi màu — để lộ
   *  phòng phía sau. Dải sáng quét và chữ vẫn chạy để khung không đứng im. */
  transparentBg: z.boolean().default(false),
  secPerPassage: z.number().int().min(3).max(300).default(18),
  readAloud: z.boolean().default(true),
  /** Hết đoạn cuối thì quay lại từ đầu. Phòng live chạy liên tục nên mặc định bật. */
  loop: z.boolean().default(true),
});

export type Config = z.infer<typeof schema>;

/** Báo cho thiết kế: bật nền trong suốt thì bỏ màn chờ và nền khung phía dưới,
 *  không thì chúng lộ ra đè lên phụ đề. */
export const trongSuot = (config: Config): boolean => config.transparentBg;

export const manifest: ModuleManifest<Config> = {
  id: 'story',
  name: 'Kể chuyện',
  icon: '📖',
  summary: 'Tiêu đề và từng đoạn truyện hiện trong khung chiếu',
  // Chạy theo nhịp, không theo sự kiện của khán giả.
  room: 'ke-chuyen',
  triggers: [],
  configVersion: 1,
  schema,
  slots: ['screen'],
  needs: ['tts'],
  actions: [{ label: 'Đoạn sau', op: 'next', icon: '⏭' }],
  quick: ['secPerPassage', 'readAloud'],
  fields: [
    {
      key: 'title',
      label: 'Tên truyện',
      type: 'text',
      ai: 'tên một truyện cổ tích hoặc truyện ngắn Việt Nam. Chỉ trả về đúng cái tên, không gì khác.',
    },
    {
      key: 'passages',
      label: 'Các đoạn truyện',
      type: 'textarea',
      ai:
        'các đoạn của MỘT truyện cổ tích hoặc truyện ngắn Việt Nam, kể bằng lời của mình, ' +
        'đúng cốt truyện gốc nếu là truyện quen thuộc. Mỗi dòng một đoạn, mỗi đoạn dưới 110 ' +
        'ký tự, khoảng 12–18 đoạn, nối tiếp nhau thành một mạch. Chỉ trả về các dòng đó, ' +
        'không đánh số, không tiêu đề.',
      hint: 'Mỗi dòng một đoạn. Đoạn nào dài quá thì tách ra cho dễ nghe.',
    },
    {
      key: 'media',
      label: 'Ảnh hoặc video',
      type: 'media',
      hint: 'Dán đường dẫn, tải file lên, hoặc nhờ AI vẽ. Để trống thì khung tự trải một nền đổi màu.',
    },
    {
      key: 'transparentBg',
      label: 'Nền trong suốt',
      type: 'toggle',
      hint: 'Tắt ảnh, video và nền đổi màu để lộ phòng phía sau. Nền phòng nên tự có chuyển động — TikTok soi khung hình đứng im.',
    },
    {
      key: 'secPerPassage',
      label: 'Mỗi đoạn hiện',
      short: 'Mỗi đoạn (s)',
      type: 'number',
      unit: 'giây',
      min: 3,
      max: 300,
    },
    {
      key: 'readAloud',
      label: 'Đọc to từng đoạn',
      short: 'Đọc to',
      type: 'toggle',
      tab: TAB_GIONG,
    },
    { key: 'loop', label: 'Hết truyện thì kể lại từ đầu', type: 'toggle' },
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
