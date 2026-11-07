import { z } from 'zod';
import { MOC_LUU_TOI_DA, TAB_GIONG } from '@live/contracts';
import type { ModuleManifest } from '@live/contracts';

export const schema = z.object({
  voiceId: z.string().max(60).default(''),
  title: z.string().max(120).default(''),
  /** Mỗi dòng một đoạn. Dòng trống bị bỏ qua. */
  passages: z.string().max(20_000).default(''),
  /** Ảnh hoặc video chiếu trong khung. Để trống thì khung chỉ có chữ. Có mốc
   *  ảnh của truyện thì đây là ảnh chung, hiện khi đoạn đang kể chưa có ảnh. */
  media: z.string().max(600).default(''),
  /** Hồ sơ truyện — AI lập, máy chủ ghi: phong cách vẽ giữ cố định cả truyện. */
  phongCach: z.string().max(300).default(''),
  /** Hồ sơ truyện: mỗi dòng "Tên: ngoại hình" — mọi ảnh đều tả nhân vật y hệt. */
  nhanVat: z.string().max(2_000).default(''),
  /** Dấu truyện mà hồ sơ (phong cách, nhân vật) đang dành cho — máy chủ ghi. */
  hoSoTruyen: z.string().max(40).default(''),
  /** Mốc ảnh AI đặt vào những đoạn đáng vẽ (`anh-truyen.ts` của contracts). */
  moc: z
    .array(
      z.object({
        tu: z.number().int().min(1),
        ta: z.string().max(400),
        nhanVat: z.array(z.string().max(60)).max(12),
        anh: z.string().max(600),
        dau: z.string().max(40),
      }),
    )
    .max(MOC_LUU_TOI_DA)
    .default([]),
  /** Bật thì AI tự làm ảnh cho truyện (máy chủ, `anh_truyen.rs`). */
  anhTuDong: z.boolean().default(false),
  /** Khung chiếu CÓ hiện ảnh minh hoạ hay không.
   *
   *  Khác `anhTuDong` (vẽ hay không vẽ): tắt ô này là thôi hiện, ảnh đã vẽ vẫn
   *  còn nguyên trong `moc` — bật lại là có ngay, không phải vẽ lại tốn lượt.
   *  Để tắt nhanh giữa buổi: ảnh ra không ưng, hay muốn khung sạch chỉ còn
   *  chữ, mà không mất bộ ảnh đã vẽ. */
  hienAnh: z.boolean().default(true),
  /** Khung chiếu CÓ hiện đồng hồ "truyện đã kể được bao lâu" ở góc hay không.
   *
   *  Tắt để khung sạch, hoặc khi không muốn người xem thấy truyện đã dài bao
   *  nhiêu. Chỉ là chuyện hiện hay giấu: mốc `batDau` vẫn chạy như thường. */
  hienDongHo: z.boolean().default(true),
  /** Vẽ bằng tab muse.ai đã đăng nhập trong app desktop thay cho kết nối vẽ
   *  ảnh (máy chủ `muse.rs`): đưa nguyên cốt truyện, muse vẽ một mạch đủ ảnh. */
  anhMuse: z.boolean().default(false),
  /** Dấu của truyện mà hồ sơ và mốc đang dành cho — máy chủ ghi. */
  hoSoCua: z.string().max(40).default(''),
  /** Lỗi gần nhất của việc làm ảnh, rỗng là ổn — máy chủ ghi. */
  anhLoi: z.string().max(600).default(''),
  /** Truyện này không vẽ được ảnh (muse.ai lẫn API đều hỏng): kể bằng chữ,
   *  không thử vẽ lại — máy chủ ghi (`anh_truyen::ke_khong_anh`). */
  boAnh: z.boolean().default(false),
  /** Lúc truyện đang kể bắt đầu (ms) — máy chủ ghi khi đổi truyện. Khung đếm
   *  giờ từ mốc này. 0 là chưa biết: khung đếm từ lúc trang thấy truyện. */
  batDau: z.number().default(0),
  /** Máy chủ đã tự bật nhân vật minh hoạ vì mất nguồn dữ liệu — nối lại thì
   *  máy chủ tắt (`ai::canh_mat_nguon`). */
  botMatNguon: z.boolean().default(false),
  /** GIỜ NGHỈ — máy chủ mở/đóng (`truyen_sau::dat_giai_lao`): giữa hai truyện
   *  ("chuyen"), hay không vẽ được ảnh ("anh"). Trong giờ nghỉ khung lộ màn chờ
   *  của thiết kế ("Chào cả nhà" + đồng hồ) kèm dải "Truyện tiếp theo"; MC
   *  chào người mới, trò chuyện. `null` là đang kể bình thường. */
  giaiLao: z
    .object({
      truyenSau: z.string().max(120).default(''),
      lyDo: z.enum(['chuyen', 'anh', 'ket-noi']).catch('chuyen').default('chuyen'),
      tu: z.number().default(0),
      /** Giờ nghỉ sự cố này đã tự bật nhân vật minh hoạ — hết sự cố thì máy chủ tắt lại. */
      batBot: z.boolean().default(false),
    })
    .nullable()
    .catch(null)
    .default(null),
  /** Bỏ hẳn nền của khung — không ảnh, không video, không nền đổi màu — để lộ
   *  phòng phía sau. Dải sáng quét và chữ vẫn chạy để khung không đứng im. */
  transparentBg: z.boolean().default(false),
  secPerPassage: z.number().int().min(3).max(300).default(18),
  readAloud: z.boolean().default(true),
  /** Thể loại và nguồn của truyện đang kể ("kho", "AI", "… · truyện mình kể") —
   *  máy chủ ghi khi chuyển truyện (`truyen_sau.rs`). */
  loai: z.string().max(80).default(''),
  nguon: z.string().max(80).default(''),
  /** Truyện kế tiếp máy chủ chuẩn bị sẵn — cùng dạng các ô truyện (title,
   *  passages, loai, nguon, moc, hoSoCua…), ảnh vẽ sẵn trong đó. */
  truyenSau: z.record(z.string(), z.unknown()).default({}),
  /** Sổ truyện đã kể ở phòng — không bao giờ kể lại. */
  daKe: z
    .array(z.object({ ten: z.string().max(120), loai: z.string().max(80).default('') }))
    .max(300)
    .default([]),
  /** Cách kể (máy chủ `ke_truyen::cach_ke`): MC kể — AI diễn từng đoạn (mặc
   *  định) — hay tự đọc. "mc-tiet-kiem" chỉ còn để đọc cấu hình cũ. */
  cachKe: z.enum(['mc-day-du', 'tu-doc', 'mc-tiet-kiem']).default('mc-day-du'),
  /** AI cho MC: API (mặc định), Codex (tài khoản ChatGPT) hay Claude Code
   *  (tài khoản Claude) — máy chủ `ai_cli.rs`. */
  aiChu: z.enum(['api', 'codex', 'claude']).default('api'),
  /** Model Claude Code cho Người dẫn truyện (`cli_goi.rs`). Không bao giờ tự lên
   *  model đắt nhất — mặc định sonnet. */
  cliModel: z.enum(['haiku', 'sonnet', 'opus']).default('sonnet'),
  /** Model Claude Code cho việc tìm truyện kế tiếp. */
  cliModelViet: z.enum(['haiku', 'sonnet', 'opus']).default('sonnet'),
  /** Model Codex — rỗng là model mặc định của tài khoản ChatGPT. */
  codexModel: z.string().max(60).default(''),
  codexModelViet: z.string().max(60).default(''),
  /** Mức suy luận Codex (`model_reasoning_effort`): chỗ tiết kiệm chính. */
  codexMuc: z.enum(['low', 'medium', 'high']).default('low'),
  codexMucViet: z.enum(['low', 'medium', 'high']).default('low'),
  /** Ai kể: MC (AI) tự kể từng đoạn bằng lời có cảm xúc và nhiều giọng, như
   *  bản cũ; hay tính năng tự đọc nguyên văn từng đoạn theo nhịp. MC vắng thì
   *  tự đọc thay. */
  nguoiKe: z.enum(['mc', 'tu-doc']).optional(),
  /** Hết đoạn cuối thì quay lại từ đầu. Phòng live chạy liên tục nên mặc định bật. */
  loop: z.boolean().default(true),
});

export type Config = z.infer<typeof schema>;

/** Tab truyện đang kể: tên và các đoạn — tự chuyển truyện đã tự lo, ít khi sửa tay. */
const TAB_TRUYEN = 'Truyện';
const TAB_ANH = 'Ảnh truyện';

/** Báo cho thiết kế: bật nền trong suốt thì bỏ màn chờ và nền khung phía dưới,
 *  không thì chúng lộ ra đè lên phụ đề. */
/** Truyện đã có hình nào chưa: video/ảnh chung, hay một mốc ảnh AI đã vẽ. */
export const coHinhNao = (config: Config): boolean =>
  config.media.trim() !== '' || config.moc.some((m) => m.anh !== '');

/** Khung trong suốt: lộ sảnh phía sau, thiết kế cất màn chờ của nó đi. Khi
 *  người vận hành bật, hoặc ĐANG có truyện mà chưa có hình nào — thay cho nền
 *  tím đổi màu ngày trước. Chưa có truyện (buổi live vừa mở) hay đang giờ nghỉ
 *  thì không: lúc đó màn chờ "Chào cả nhà" của thiết kế PHẢI hiện. */
export const trongSuot = (config: Config): boolean =>
  config.giaiLao === null &&
  (config.transparentBg || (config.title.trim() !== '' && !coHinhNao(config)));

export const manifest: ModuleManifest<Config> = {
  id: 'story',
  name: 'Kể truyện',
  icon: '📖',
  summary: 'Tiêu đề và từng đoạn truyện hiện trong khung chiếu',
  // Chạy theo nhịp, không theo sự kiện của khán giả.
  room: 'ke-chuyen',
  // Tính năng chính của phòng kể chuyện: thẻ đứng đầu, trên thẻ MC.
  theDau: true,
  // `host`: câu MC kể một đoạn (mang `ke`) — chuyển đoạn theo MC.
  triggers: ['host'],
  configVersion: 1,
  schema,
  slots: ['screen'],
  needs: ['tts'],
  actions: [{ label: 'Đoạn sau', op: 'next', icon: '⏭' }],
  // Tối đa 3 ô (luật chung của mọi module, `kiemModule`). "Đọc to" rời hàng
  // này nhường chỗ cho "Đồng hồ truyện": nó chỉ hiện ở lối tự đọc, mà gạt một
  // lần rồi thôi — vẫn còn ở tab Giọng. Hai công tắc khung (ảnh, đồng hồ) thì
  // hay gạt giữa buổi nên đứng cạnh nhau ở hàng nhanh.
  quick: ['hienAnh', 'hienDongHo', 'secPerPassage'],
  fields: [
    // ── Cài đặt: AI viết & kể truyện đứng đầu — MC kể và AI viết truyện kế
    // tiếp là CÙNG một AI. Công tắc "Bật người dẫn" ghi cả `cachKe` lẫn MC của phòng.
    {
      key: 'cachKe',
      label: 'AI viết & kể truyện',
      type: 'mc-ke-chuyen',
      mcKe: { ai: 'aiChu' },
    },
    {
      key: 'secPerPassage',
      hienKhi: [{ cachKe: ['tu-doc'] }],
      label: 'Mỗi đoạn hiện',
      short: 'Mỗi đoạn (s)',
      type: 'number',
      unit: 'giây',
      min: 3,
      max: 300,
    },
    // ── Truyện: truyện đang kể — tự chuyển đã tự lo, ít khi phải sửa tay. ──
    {
      key: 'title',
      label: 'Tên truyện',
      type: 'text',
      tab: TAB_TRUYEN,
      ai: 'tên một truyện cổ tích hoặc truyện ngắn Việt Nam. Chỉ trả về đúng cái tên, không gì khác.',
    },
    {
      key: 'passages',
      label: 'Các đoạn truyện',
      type: 'textarea',
      tab: TAB_TRUYEN,
      ai:
        'các đoạn của MỘT truyện cổ tích hoặc truyện ngắn Việt Nam, kể bằng lời của mình, ' +
        'đúng cốt truyện gốc nếu là truyện quen thuộc. Mỗi dòng một đoạn, mỗi đoạn dưới 110 ' +
        'ký tự, khoảng 12–18 đoạn, nối tiếp nhau thành một mạch. Chỉ trả về các dòng đó, ' +
        'không đánh số, không tiêu đề.',
      hint: 'Mỗi dòng một đoạn.',
    },
    {
      key: 'truyenSau',
      hienKhi: [{ cachKe: ['mc-day-du', 'mc-tiet-kiem'] }],
      label: 'Truyện kế tiếp',
      type: 'truyen-sau',
      tab: TAB_TRUYEN,
    },
    {
      key: 'hienDongHo',
      label: 'Đồng hồ truyện',
      type: 'toggle',
      tab: TAB_TRUYEN,
      hint: 'Đồng hồ góc khung đếm truyện đã kể được bao lâu. Tắt thì khung sạch, truyện vẫn chạy như thường.',
    },
    {
      key: 'khoTruyen',
      label: 'Truyện đã kể',
      type: 'kho-truyen',
      tab: TAB_TRUYEN,
    },
    // ── Ảnh truyện: mọi thứ về hình trong khung chiếu. ──
    {
      key: 'hienAnh',
      label: 'Ảnh minh hoạ',
      type: 'toggle',
      tab: TAB_ANH,
      hint: 'Tắt thì khung chỉ còn chữ. Ảnh đã vẽ vẫn giữ, bật lại là hiện ngay.',
    },
    {
      key: 'anhTuDong',
      label: 'AI tự tạo ảnh',
      type: 'toggle',
      tab: TAB_ANH,
      hint: 'Tự vẽ ảnh minh hoạ theo truyện; đổi truyện là vẽ lại, ảnh cũ được dọn.',
    },
    {
      key: 'anhMuse',
      hienKhi: [{ anhTuDong: [true] }],
      label: 'AI tạo ảnh',
      type: 'nguon-anh',
      tab: TAB_ANH,
    },
    {
      key: 'moc',
      label: 'Ảnh theo truyện',
      type: 'anh-truyen',
      tab: TAB_ANH,
      truyen: {
        doan: 'passages',
        phongCach: 'phongCach',
        hoSo: 'nhanVat',
        hoSoCua: 'hoSoCua',
        loi: 'anhLoi',
      },
    },
    {
      key: 'media',
      label: 'Ảnh chung',
      type: 'media',
      tab: TAB_ANH,
      hint: 'Hiện khi đoạn đang kể chưa có ảnh. Để trống thì khung tự trải nền đổi màu.',
    },
    {
      key: 'transparentBg',
      label: 'Nền trong suốt',
      type: 'toggle',
      tab: TAB_ANH,
      hint: 'Bỏ ảnh và nền để lộ phòng phía sau.',
    },
    // ── Giọng đọc: MC kể thì giọng MC; tự đọc thì đọc to + giọng. ──
    {
      key: 'vaiGiong',
      hienKhi: [{ cachKe: ['mc-day-du', 'mc-tiet-kiem'] }],
      label: 'Ai đọc gì',
      type: 'vai-giong',
      tab: TAB_GIONG,
    },
    {
      key: 'readAloud',
      hienKhi: [{ cachKe: ['tu-doc'] }],
      label: 'Đọc to từng đoạn',
      short: 'Đọc to',
      type: 'toggle',
      tab: TAB_GIONG,
    },
    {
      key: 'voiceId',
      hienKhi: [{ cachKe: ['tu-doc'] }],
      label: 'Giọng chính',
      short: 'Giọng',
      type: 'voice',
      tab: TAB_GIONG,
      hint: 'Giọng tự đọc từng đoạn (khi phòng bật Đa giọng).',
    },
  ],
};
