import { z } from 'zod';
import { TAB_GIONG } from '@live/contracts';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
  voiceId: z.string().max(60).default(''),
  followTemplate: z.string().min(1).max(200).default('Cảm ơn {ten} đã theo dõi!'),
  subscribeTemplate: z.string().min(1).max(200).default('Cảm ơn {ten} đã thành hội viên!'),
  voice: z.boolean().default(true),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'follow-thanks',
  name: 'Cảm ơn theo dõi',
  icon: '⭐',
  summary: 'Chào khi có người theo dõi hoặc thành hội viên',
  room: 'ke-chuyen',
  triggers: ['follow', 'subscribe'],
  configVersion: 1,
  schema,
  slots: ['ticker'],
  needs: ['tts'],
  fields: [
    { key: 'followTemplate', label: 'Câu cảm ơn theo dõi', type: 'text', hint: 'Dùng {ten}' },
    { key: 'subscribeTemplate', label: 'Câu cảm ơn hội viên', type: 'text', hint: 'Dùng {ten}' },
    { key: 'voice', label: 'Đọc to', type: 'toggle', tab: TAB_GIONG },
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
