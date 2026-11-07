import { z } from 'zod';
import type { ModuleManifest } from '@live/contracts';

/** Nút trên thẻ. Phải khớp các `op` mà `core.onAction` nhận. */
export const NUT = {
  tietMoi: 'tiet-moi',
  quaCau: 'qua-cau',
  boCau: 'bo-cau',
  raChoi: 'ra-choi',
  everest: 'everest',
  chuong: 'chuong',
  tamBiet: 'tam-biet',
} as const;

export const schema = z.object({
  /** Giọng cô giáo. Ô `voice` đầu tiên là giọng chính của module (`khoaGiong`). */
  voiceId: z.string().max(60).default(''),
  /** Giọng đọc từ tiếng Anh (câu tiếng Anh, mẹo tiếng Anh). Trống là cô đọc
   *  luôn bằng giọng chính. */
  giongAnh: z.string().max(60).default(''),
  /** Tên lớp trên bảng hiệu. */
  tenLop: z.string().max(40).default('Lớp Học Chữ'),
  /** Thời gian trả lời một câu. Chủ kênh cũ chốt 20 giây. */
  giayMoiCau: z.number().int().min(8).max(60).default(20),
  /** Chế độ nhanh: cô đọc ngắn, đọc xong là mở bảng; tắt là nhịp cũ (hô "bắt đầu"). */
  cheDoNhanh: z.boolean().default(true),
  /** Chia 4 tổ thi đua (tiết 1, 5, 9… có 20 giây chọn tổ). */
  chiaTo: z.boolean().default(true),
  /** Tên cô giáo: bảng tên trên ngực và những câu cô tự xưng tên. Chỉ thay chữ
   *  "cô Ngân"; các chữ "cô" khác và ảnh nhân vật giữ nguyên. */
  tenCo: z.string().max(24).default('Cô Ngân'),
  /** Chữ bảng đỏ phía trên bảng đen. Để trống là câu gốc (cũng như tên cô). */
  khauHieu: z.string().max(40).default('NGHE HẾT ĐỀ – GÕ MỚI ĂN ĐIỂM'),
  /** Cứ 4 tiết thay giờ ra chơi bằng một game lớn, xen kẽ 2 game. Tắt game nào thì
   *  bỏ qua game đó; tắt cả 2 thì chỉ có giờ ra chơi. Game đang chơi dở vẫn chơi hết. */
  everest: z.boolean().default(true),
  chuong: z.boolean().default(true),
  /** Ảnh nền lớp riêng (dọc 9:16), phủ lên nền gốc; lớp tự vẽ tấm bảng đen lên.
   *  Trống là nền gốc. */
  nenLop: z.string().max(600).default(''),
  /** Hết 30 ghế thì tới 22 bạn tiếp theo đứng ngoài hành lang 2 cửa lớp, ló vào
   *  xin vào lớp (tuỳ chọn, mặc định TẮT). Tắt: hết ghế vẫn chơi, chỉ hiện ở bảng
   *  Sĩ số / Chờ vào lớp. */
  dungCua: z.boolean().default(false),
  /** Ghi sổ lớp (câu đã hỏi, bảng vàng tuần, học bạ). Tắt khi chạy thử để tên
   *  giả không lẫn vào sổ thật. */
  ghiSo: z.boolean().default(true),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'do-chu',
  name: 'Lớp học đố chữ',
  icon: '🧑‍🏫',
  summary: 'Cô giáo đố chữ xáo trộn, toán nhẩm, đuổi hình bắt chữ; người xem gõ đáp án, nhanh nhất ngồi bàn đầu',
  room: 'lop-hoc',
  triggers: ['comment', 'gift', 'like', 'follow', 'join', 'leave'],
  configVersion: 1,
  schema,
  slots: ['full'],
  needs: ['tts', 'audio'],
  quick: ['tenLop', 'giayMoiCau', 'ghiSo'],
  actions: [
    { label: 'Tiết mới', op: NUT.tietMoi, icon: '🔄' },
    { label: 'Qua câu', op: NUT.quaCau, icon: '⏭️' },
    { label: 'Bỏ câu này', op: NUT.boCau, icon: '🚫' },
    { label: 'Ra chơi', op: NUT.raChoi, icon: '🛝' },
    { label: 'Everest', op: NUT.everest, icon: '🏔️' },
    { label: 'Rung Chuông Đồng', op: NUT.chuong, icon: '🔔' },
    { label: 'Chào tạm biệt', op: NUT.tamBiet, icon: '👋' },
  ],
  fields: [
    { key: 'tenLop', label: 'Tên lớp', short: 'Tên lớp', type: 'text', hint: 'Hiện trên bảng hiệu đầu lớp' },
    {
      key: 'giayMoiCau',
      label: 'Thời gian mỗi câu',
      short: 'Giây/câu',
      type: 'number',
      unit: 'giây',
      min: 8,
      max: 60,
      hint: 'Đồng hồ dừng trong lúc cô đọc đề, đọc xong mới đếm',
    },
    {
      key: 'cheDoNhanh',
      label: 'Chế độ nhanh',
      type: 'toggle',
      hint: 'Cô đọc ngắn, đọc xong đề là mở bảng chữ. Tắt: đọc dài, hô "bắt đầu" rồi mới mở',
    },
    { key: 'chiaTo', label: 'Chia tổ thi đua', type: 'toggle', hint: 'Tiết 1, 5, 9… có 20 giây gõ "tổ 1".."tổ 4"' },
    {
      key: 'everest',
      label: 'Game Đường lên đỉnh Everest',
      short: 'Everest',
      type: 'toggle',
      hint: 'Cứ 4 tiết thay giờ ra chơi bằng 1 game lớn, xen kẽ 2 game. Tắt cả 2 thì chỉ có giờ ra chơi',
    },
    { key: 'chuong', label: 'Game Rung Chuông Đồng', short: 'Chuông', type: 'toggle', hint: 'Game đang chơi dở vẫn chơi hết' },
    { key: 'tenCo', label: 'Tên cô giáo', type: 'text', hint: 'Bảng tên trên ngực và câu cô tự xưng tên. Ảnh nhân vật giữ nguyên' },
    { key: 'khauHieu', label: 'Chữ bảng đỏ', type: 'text', hint: 'Dòng khẩu hiệu phía trên bảng đen, tối đa 40 ký tự' },
    { key: 'nenLop', label: 'Nền lớp học', type: 'media', hint: 'Ảnh dọc 9:16. Lớp tự vẽ tấm bảng đen lên ảnh. Để trống là nền gốc' },
    {
      key: 'dungCua',
      label: 'Đứng ngoài cửa khi hết ghế',
      type: 'toggle',
      hint: 'Hết 30 ghế thì 22 bạn tiếp theo đứng ngoài hành lang, ló vào 2 cửa lớp xin vào; vẫn chơi và tính điểm',
    },
    {
      key: 'ghiSo',
      label: 'Ghi sổ lớp',
      short: 'Ghi sổ',
      type: 'toggle',
      hint: 'Nhớ câu đã hỏi, bảng vàng tuần, chuyên cần, học bạ qua các buổi. Tắt khi chạy thử',
    },
    { key: 'voiceId', label: 'Giọng cô giáo', type: 'voice', tab: 'Giọng' },
    {
      key: 'giongAnh',
      label: 'Giọng đọc từ tiếng Anh',
      type: 'voice',
      tab: 'Giọng',
      hint: 'Để trống thì cô đọc từ tiếng Anh bằng giọng chính',
    },
  ],
};
