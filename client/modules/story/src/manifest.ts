import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
  title: z.string().max(120).default(''),
  /** Mỗi dòng một đoạn. Dòng trống bị bỏ qua. */
  passages: z.string().max(20_000).default(''),
  /** Ảnh hoặc video chiếu trong khung. Để trống thì khung chỉ có chữ. */
  media: z.string().max(400).default(''),
  secPerPassage: z.number().int().min(3).max(300).default(18),
  readAloud: z.boolean().default(true),
  /** Hết đoạn cuối thì quay lại từ đầu. Phòng live chạy liên tục nên mặc định bật. */
  loop: z.boolean().default(true),
});

export type Config = z.infer<typeof schema>;

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
  action: { label: 'Đoạn sau', op: 'next' },
  quick: ['secPerPassage', 'readAloud'],
  fields: [
    { key: 'title', label: 'Tên truyện', type: 'text' },
    {
      key: 'passages',
      label: 'Các đoạn truyện',
      type: 'textarea',
      hint: 'Mỗi dòng một đoạn. Đoạn nào dài quá thì tách ra cho dễ nghe.',
    },
    {
      key: 'media',
      label: 'Ảnh hoặc video',
      type: 'text',
      hint: 'Để trống thì khung chỉ có chữ, và chữ sẽ nằm giữa khung cho cân.',
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
    { key: 'readAloud', label: 'Đọc to từng đoạn', short: 'Đọc to', type: 'toggle' },
    { key: 'loop', label: 'Hết truyện thì kể lại từ đầu', type: 'toggle' },
  ],
};
