/** Bộ cài đặt của phòng Sơn Hà Tiên Lộ — các thẻ trong ngăn "Tính năng dành riêng" bên phải.
 *
 *  Mỗi thẻ là một màn của game, đúng thứ tự trong bản đồ (`docs/phong/tu-tien/ban-do.md` §10): thêm
 *  hay đổi một ô ở đây thì sửa bảng ở đó trong cùng lần sửa. Mọi ô về nhịp đi qua một chỗ duy nhất:
 *  `docCaiDat()` đổi giá trị trên thẻ thành phần `Nhip` cho lõi (`datNhip()`). */

import type { DesignCard, DesignOption } from '@live/contracts';
import { CHUOI_MAU, CO_DUYEN_GOC, NHIP_LIVE, SU_KIEN_GOC, type Chuoi, type MucChuoi, type MucSuKien, type Nhip, type PhanCoDuyen } from './loi/core';
import { KHO_DO_GOC, PHAM, TEN_O, type MonDo, type OTrangBi } from './loi/trang-bi';

type KhoaNhip = keyof Nhip;

/** Một ô số gắn với một trường của `Nhip`: đơn vị trên thẻ là phút hoặc giây. */
interface ONhip {
  key: string;
  nhip: KhoaNhip;
  label: string;
  short: string;
  don: 'phút' | 'giây';
  min: number;
  max: number;
  hint?: string;
  /** Mặc định khác nhịp gốc (vd người vận hành muốn trận dài 30 phút). */
  macDinh?: number;
}

const MS: Record<ONhip['don'], number> = { phút: 60_000, giây: 1_000 };

function oSo(o: ONhip): DesignOption {
  const goc = o.macDinh ?? NHIP_LIVE[o.nhip] / MS[o.don];
  return {
    key: o.key,
    label: o.label,
    short: o.short,
    type: 'number',
    value: Math.round(goc * 10) / 10,
    min: o.min,
    max: o.max,
    step: 1,
    unit: o.don,
    ...(o.hint ? { hint: o.hint } : {}),
  };
}

/** Mọi ô nhịp, theo màn. */
const O_NHIP = {
  chung: [
    { key: 'mua', nhip: 'mua', label: 'Một năm (hết năm thì tổng kết, phe giữ đất thắng mùa)', short: 'Một năm', don: 'phút', min: 10, max: 240 },
    { key: 'xuatMon', nhip: 'xuatMon', label: 'Đệ tử không tích linh khí quá lâu thì xuất môn sau', short: 'Xuất môn', don: 'phút', min: 5, max: 240 },
  ],
  tu: [
    { key: 'hoi', nhip: 'hoi', label: 'Thời gian trả lời một câu Ngọc Phả', short: 'Trả lời', don: 'giây', min: 8, max: 120 },
    { key: 'kiep', nhip: 'kiep', label: 'Thời gian một lần độ kiếp', short: 'Độ kiếp', don: 'giây', min: 10, max: 120 },
  ],
  coDuyen: [
    { key: 'skTlCach', nhip: 'skTlCach', label: 'Sự kiện cơ duyên mở mỗi (lúc tu luyện; luân phiên Cơ Duyên Giáng Thế / Linh Thảo Nở Rộ)', short: 'Mở mỗi', don: 'giây', min: 30, max: 1800 },
    { key: 'skTlLau', nhip: 'skTlLau', label: 'Một lần sự kiện cơ duyên dài', short: 'Dài', don: 'giây', min: 10, max: 300 },
  ],
  nm: [
    { key: 'nmCach', nhip: 'nmCach', label: 'Ải mở xen mỗi (lúc tu luyện, khi có khách đang chờ; theo lịch thì không chen sát sự kiện)', short: 'Xen mỗi', don: 'phút', min: 2, max: 60 },
    { key: 'nmVao', nhip: 'nmVao', label: 'Thời gian bước vào (gõ số 1–4 chọn nhân vật)', short: 'Bước vào', don: 'giây', min: 10, max: 120 },
    { key: 'nm', nhip: 'nm', label: 'Thời gian vượt ải', short: 'Vượt ải', don: 'giây', min: 20, max: 300 },
  ],
  me: [
    { key: 'meCach', nhip: 'meCach', label: 'Tranh Đoạt Bảo Vật mở mỗi (chỉ khi tắt lịch trình)', short: 'Tắt lịch: mỗi', don: 'phút', min: 3, max: 120 },
    { key: 'me', nhip: 'me', label: 'Một lượt Tranh Đoạt Bảo Vật dài', short: 'Dài', don: 'giây', min: 30, max: 600 },
  ],
  yeu: [
    { key: 'yeuCach', nhip: 'yeuCach', label: 'Yêu tinh xuất thế mỗi (chỉ khi tắt lịch trình)', short: 'Tắt lịch: mỗi', don: 'phút', min: 2, max: 180 },
    {
      key: 'yeuPhut',
      nhip: 'yeu',
      label: 'Một trận đánh yêu tinh dài',
      short: 'Dài',
      don: 'phút',
      min: 1,
      max: 60,
      macDinh: 30,
      hint: 'Máu yêu tinh tự dày theo số phút để trận không hết sớm.',
    },
  ],
  lu: [
    { key: 'luCach', nhip: 'luCach', label: 'Đại Chiến mỗi (chỉ khi tắt lịch trình)', short: 'Tắt lịch: mỗi', don: 'phút', min: 2, max: 180 },
    {
      key: 'luPhut',
      nhip: 'lu',
      label: 'Một trận Đại Chiến (PK) dài',
      short: 'Dài',
      don: 'phút',
      min: 1,
      max: 60,
      macDinh: 30,
      hint: 'Trận khí hai phe tự dày theo số phút.',
    },
  ],
} satisfies Record<string, ONhip[]>;

/** Việc chọn được cho một mục của chuỗi sự kiện. */
const LUA_VIEC: readonly { value: string; label: string }[] = [
  { value: 'ai', label: '🚪 Thử Thách Nhập Môn' },
  { value: 'dia-cung', label: '🏺 Tranh Đoạt Bảo Vật' },
  { value: 'pk', label: '⚔️ Đại Chiến tỉ võ (PK)' },
  { value: 'cho', label: '🏯 Thành Trì Tự Do (Đan Các + Tàng Kinh Các)' },
  { value: 'loi-dai', label: '🏆 Tỉ Thí Lôi Đài (đồng môn so tài, quà khiêu chiến lên đài)' },
  { value: 'yeu-luan', label: '👹 Boss lớn luân phiên (Ngư → Hồ → Mộc)' },
  { value: 'yeu-ngu-son', label: '👹 Ngư Tinh · Sơn Tông đánh' },
  { value: 'yeu-ngu-ca', label: '👹 Ngư Tinh · hai tông' },
  { value: 'yeu-ho-thuy', label: '👹 Hồ Tinh · Thủy Tông đánh' },
  { value: 'yeu-ho-ca', label: '👹 Hồ Tinh · hai tông' },
  { value: 'yeu-moc-son', label: '👹 Mộc Tinh · Sơn Tông đánh' },
  { value: 'yeu-moc-thuy', label: '👹 Mộc Tinh · Thủy Tông đánh' },
  { value: 'yeu-moc-ca', label: '👹 Mộc Tinh · hai tông' },
  { value: 'dai-yeu', label: '👹 Đại Yêu Dạ (Tam Yêu)' },
  { value: 'dai-lu', label: '🌊 Đại Hồng Thủy' },
  { value: 'hoi-thi', label: '📜 Hội thi Ngọc Phả' },
  { value: 'phuc-loc', label: '✨ Giờ Linh Khí' },
  { value: 'tu-luyen', label: '🧘 Tu luyện thêm (nghỉ dài hơn)' },
];

/** Chuỗi sự kiện từ thẻ 📅: danh sách mục (kéo-thả đổi thứ tự) và giờ nghỉ giữa hai sự kiện. */
export function docChuoi(cauHinh: Record<string, unknown>): Chuoi {
  const nghi = soO(cauHinh['nghiPhut'], CHUOI_MAU.nghi / 60_000, 0, 60) * 60_000;
  const v = cauHinh['chuoi'];
  if (!Array.isArray(v)) return { ...CHUOI_MAU, nghi };
  // Danh sách lưu từ bản cũ (chưa có cột "bắt đầu ở phút") thì dùng lịch chuẩn mỗi giờ đã chốt.
  if (v.length > 0 && v.every((x) => typeof x === 'object' && x !== null && !('batDau' in x))) return { ...CHUOI_MAU, nghi };
  const ds: MucChuoi[] = [];
  for (const x of v) {
    if (typeof x !== 'object' || x === null) continue;
    const o = x as Record<string, unknown>;
    const viec = typeof o['viec'] === 'string' && LUA_VIEC.some((l) => l.value === o['viec']) ? (o['viec'] as string) : 'ai';
    ds.push({
      viec,
      phut: soO(o['phut'], 0, 0, 120),
      bao: typeof o['bao'] === 'string' ? o['bao'] : '',
      batDau: soO(o['batDau'], -1, -1, 59),
    });
  }
  return { ds, nghi };
}

const soO = (v: unknown, md: number, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : md;

const SU_KIEN_MAU = '';

/** Ô "Sự kiện lớn" (theo giờ đồng hồ, định dạng `loi/lich.ts`) — tuỳ chọn. */
export function taoLich(cauHinh: Record<string, unknown>): string {
  const lon = cauHinh['lichLon'];
  return typeof lon === 'string' ? lon : SU_KIEN_MAU;
}

const TAT_MO = (key: string, label: string): DesignOption => ({ key, label, type: 'toggle', value: true });

export const LUA_CHON: readonly DesignCard[] = [
  {
    id: 'son-ha',
    name: 'Sơn Hà Tiên Lộ',
    icon: '⛰️',
    summary: 'Chung: đọc to, một năm, xuất môn',
    toggle: {
      key: 'docTo',
      label: 'Đọc to câu hỏi và sự kiện',
      type: 'toggle',
      value: true,
      hint: 'Dùng giọng đọc của phòng. Tắt nếu MC AI đã dẫn đủ.',
    },
    fields: [
      ...O_NHIP.chung.map(oSo),
      { key: 'tiengHieuUng', label: 'Tiếng chuông, sấm, đòn đánh', short: 'Tiếng hiệu ứng', type: 'toggle', value: true },
    ],
  },
  {
    id: 'son-ha-lich',
    name: 'Lịch trình mỗi giờ',
    icon: '📅',
    summary: 'Mỗi giờ: :00 Ải · :15 Đại Chiến · :25 Tranh Đoạt Bảo Vật · :30 Thành Trì Tự Do · :45 Boss lớn · :55 Tranh Đoạt · :58 tổng kết',
    toggle: {
      key: 'theoLich',
      label: 'Chạy theo lịch',
      type: 'toggle',
      value: true,
      hint: 'Bật: sự kiện chạy đúng phút trong danh sách dưới, lặp lại mỗi giờ (tính từ lúc mở live), tổng kết năm ở phút 58. Ải Nhập Môn vẫn mở xen giữa lúc tu luyện. Tắt: mỗi màn chạy theo ô "Tắt lịch: mỗi … phút" ở thẻ của màn đó.',
    },
    fields: [
      {
        key: 'nghiPhut',
        label: 'Nghỉ tu luyện cho dòng nối tiếp (-1)',
        short: 'Nghỉ (-1)',
        type: 'number',
        value: CHUOI_MAU.nghi / 60_000,
        min: 0,
        max: 60,
        step: 1,
        unit: 'phút',
        hint: 'Chỉ dùng cho dòng ghi "Bắt đầu ở phút" = -1: sự kiện trước xong thì tu luyện chừng này phút rồi mới tới. Dòng có phút cố định thì chạy đúng phút đó.',
      },
      {
        key: 'chuoi',
        label: 'Sự kiện',
        short: 'Sự kiện mỗi giờ',
        type: 'list',
        max: 40,
        hint: 'Mỗi dòng: sự kiện, phút bắt đầu trong giờ, dài bao lâu, câu thông báo. Kéo dòng (hoặc ↑ ↓) để sắp lại cho dễ nhìn. Mười giây trước mỗi sự kiện, màn hiện đếm ngược và MC đọc câu thông báo.',
        value: CHUOI_MAU.ds.map((m, i) => ({ id: `s${i + 1}`, viec: m.viec, batDau: m.batDau, phut: m.phut, bao: '' })),
        moi: { viec: 'ai', batDau: -1, phut: 0, bao: '' },
        fields: [
          { key: 'viec', label: 'Sự kiện', type: 'select', options: LUA_VIEC },
          {
            key: 'batDau',
            label: 'Bắt đầu ở phút (mỗi giờ)',
            type: 'number',
            min: -1,
            max: 59,
            step: 1,
            hint: 'Phút thứ mấy của mỗi giờ (tính từ lúc mở live), vd 15 là :15. Mọi dòng đều có phút thì chạy theo giờ và tổng kết năm ở :58. Ghi -1 là nối tiếp sau sự kiện trước (nghỉ theo ô "Tu luyện giữa hai sự kiện").',
          },
          {
            key: 'phut',
            label: 'Dài (phút)',
            type: 'number',
            min: 0,
            max: 120,
            step: 1,
            unit: 'phút',
            hint: 'Trận yêu tinh / Đại Chiến: 0 là theo thẻ màn (mặc định 30). Tu luyện thêm: số phút nghỉ. Ải, Tranh Đoạt Bảo Vật: theo thẻ màn.',
          },
          {
            key: 'bao',
            label: 'Thông báo 10 giây trước',
            type: 'textarea',
            hint: 'Hiện to trên màn kèm đếm ngược và MC đọc lên. Để trống là câu mặc định của sự kiện.',
          },
        ],
      },
      {
        key: 'lichLon',
        label: 'Sự kiện lớn theo giờ đồng hồ (tuỳ chọn, nâng cao)',
        short: 'Sự kiện lớn',
        type: 'textarea',
        value: SU_KIEN_MAU,
        hint: 'Chỉ dùng khi muốn hẹn giờ cố định, vd "21:00 hang-ngay hoi-thi", "22:00 cn dai-yeu", "12:00 t7,cn phuc-loc". Để trống là không có.',
      },
    ],
  },
  {
    id: 'son-ha-tu',
    name: 'Tu luyện & Độ kiếp',
    icon: '🧘',
    summary: 'Câu hỏi Ngọc Phả, lượt môn phái, độ kiếp',
    fields: [
      {
        key: 'doiPhe',
        label: 'Đổi môn phái ở màn tu luyện sau mỗi',
        short: 'Lượt môn phái',
        type: 'number',
        value: 2,
        min: 1,
        max: 30,
        step: 1,
        unit: 'phút',
        hint: 'Lúc tu luyện chỉ hiện một môn phái kèm tổng lực chiến, hết lượt thì đổi phe kia.',
      },
      ...O_NHIP.tu.map(oSo),
    ],
  },
  {
    id: 'son-ha-co-duyen',
    name: 'Cơ duyên',
    icon: '✨',
    summary: 'Sự kiện lúc tu luyện: gõ 6 nhận cơ duyên miễn phí, gõ 2 hái linh thảo ×2',
    toggle: TAT_MO('moCoDuyen', 'Mở sự kiện cơ duyên'),
    fields: [
      ...O_NHIP.coDuyen.map(oSo),
      {
        key: 'khoSuKien',
        label: 'Sự kiện',
        short: 'Sự kiện',
        type: 'list',
        max: 12,
        hint: 'Các sự kiện lúc tu luyện, mở luân phiên theo thứ tự. Bấm một ô để sửa tên, hình, hệ số; tắt hoặc xoá thì không mở nữa. Xoá hết thì dùng lại hai sự kiện gốc.',
        luoi: { hinh: 'hinh', phu: ['loai'] },
        value: SU_KIEN_GOC.map((m) => ({ ...m })),
        moi: { loai: 'co-duyen', ten: 'Sự kiện mới', boi: 2, hinh: '✨', bat: true },
        fields: [
          { key: 'ten', label: 'Tên sự kiện', type: 'text' },
          { key: 'hinh', label: 'Hình (emoji)', type: 'text' },
          {
            key: 'loai',
            label: 'Cách chơi',
            type: 'select',
            options: [
              { value: 'co-duyen', label: 'Gõ 6 nhận thưởng' },
              { value: 'linh-thao', label: 'Gõ 2 hái linh thảo' },
            ],
          },
          { key: 'boi', label: 'Hái linh thảo được gấp', short: '×', type: 'number', min: 1, max: 10, step: 1, hint: 'Chỉ dùng cho cách chơi "Gõ 2 hái linh thảo".' },
          { key: 'bat', label: 'Đang dùng', type: 'toggle' },
        ],
      },
      {
        key: 'khoCoDuyen',
        label: 'Phần thưởng cơ duyên',
        short: 'Phần thưởng',
        type: 'list',
        max: 24,
        hint: 'Gõ 6 lúc có sự kiện cơ duyên thì bốc một phần thưởng dưới đây theo tỉ trọng (số càng lớn càng dễ trúng). Xoá hết thì dùng lại bốn phần thưởng gốc.',
        luoi: { hinh: 'hinh', phu: ['tiLe'] },
        value: CO_DUYEN_GOC.map((m) => ({ ...m })),
        moi: { loai: 'thach', ten: 'Phần thưởng mới', tu: 5, den: 10, tiLe: 10, hiem: false, hinh: '🎁', bat: true },
        fields: [
          { key: 'ten', label: 'Tên', type: 'text' },
          { key: 'hinh', label: 'Hình (emoji)', type: 'text' },
          {
            key: 'loai',
            label: 'Được gì',
            type: 'select',
            options: [
              { value: 'lk', label: 'Linh khí' },
              { value: 'thach', label: 'Linh thạch' },
              { value: 'do', label: 'Một món trang bị' },
            ],
          },
          { key: 'tu', label: 'Ít nhất (trang bị: phẩm 0–4)', type: 'number', min: 0, max: 100000, step: 1 },
          { key: 'den', label: 'Nhiều nhất', type: 'number', min: 0, max: 100000, step: 1, hint: 'Bằng "Ít nhất" là số cố định. Trang bị thì không dùng ô này.' },
          { key: 'tiLe', label: 'Tỉ trọng trúng', short: 'tỉ trọng', type: 'number', min: 0, max: 1000, step: 1 },
          { key: 'hiem', label: 'Hiếm (chữ vàng rực giữa màn)', type: 'toggle' },
          { key: 'bat', label: 'Đang dùng', type: 'toggle' },
        ],
      },
    ],
  },
  {
    id: 'son-ha-do',
    name: 'Trang bị & vũ khí',
    icon: '⚔️',
    summary: 'Đồ rơi ở Tranh Đoạt Bảo Vật, boss, Ải, cơ duyên: sửa tên, ảnh, chỉ số, thêm, xoá',
    fields: [
      {
        key: 'khoDo',
        label: 'Món đồ',
        short: 'Kho đồ',
        type: 'list',
        max: 60,
        hint: 'Bấm một ô để sửa. Món tắt hoặc xoá thì không rơi nữa, ai đang giữ vẫn giữ. Cùng loại, cùng phẩm có nhiều món thì bốc theo tỉ trọng rơi. Một loại không còn món nào thì dùng lại bảng gốc.',
        luoi: { anh: 'anh', macDinh: 'tranh', phu: ['pham', 'goc'] },
        value: KHO_DO_GOC.map((m) => ({ ...m, tranh: `do/${m.o}.webp` })),
        moi: { o: 'vu', pham: 0, ten: 'Món mới', goc: 8, roi: 1, anh: '', tranh: '', bat: true },
        fields: [
          { key: 'ten', label: 'Tên món', type: 'text' },
          { key: 'anh', label: 'Ảnh riêng (trống là ảnh chung của loại)', type: 'media' },
          {
            key: 'o',
            label: 'Loại',
            type: 'select',
            options: (Object.keys(TEN_O) as OTrangBi[]).map((o) => ({ value: o, label: `${TEN_O[o]}${o === 'vu' ? ' (công)' : o === 'ao' ? ' (thủ)' : ' (nửa công nửa thủ)'}` })),
          },
          { key: 'pham', label: 'Phẩm', type: 'select', options: PHAM.map((p, i) => ({ value: String(i), label: p.ten })) },
          { key: 'goc', label: 'Chỉ số gốc (mỗi lần rơi lệch ±15%)', short: 'chỉ số', type: 'number', min: 1, max: 100000, step: 1 },
          { key: 'roi', label: 'Tỉ trọng rơi (so với món cùng loại, cùng phẩm)', type: 'number', min: 0, max: 100, step: 1 },
          { key: 'bat', label: 'Đang rơi', type: 'toggle' },
        ],
      },
    ],
  },
  {
    id: 'son-ha-nm',
    name: 'Thử Thách Nhập Môn',
    icon: '🚪',
    summary: 'Mê cung cấp 1: khách vượt ải để nhập tông',
    fields: O_NHIP.nm.map(oSo),
  },
  {
    id: 'son-ha-me',
    name: 'Tranh Đoạt Bảo Vật',
    icon: '🏺',
    summary: 'Mê cung cấp 2: đệ tử nhặt trang bị',
    toggle: TAT_MO('moMe', 'Mở Tranh Đoạt Bảo Vật'),
    fields: O_NHIP.me.map(oSo),
  },
  {
    id: 'son-ha-yeu',
    name: 'Yêu tinh',
    icon: '👹',
    summary: 'Hai tông cùng đánh boss, rơi đồ và linh vật',
    toggle: TAT_MO('moYeu', 'Cho yêu tinh xuất thế'),
    fields: O_NHIP.yeu.map(oSo),
  },
  {
    id: 'son-ha-lu',
    name: 'Đại Chiến',
    icon: '⚔️',
    summary: 'PK hai tông: tự đánh, quà ra chiêu',
    toggle: TAT_MO('moLu', 'Mở Đại Chiến'),
    fields: O_NHIP.lu.map(oSo),
  },
];

/** Màn tắt được trên thẻ. */
export interface TatMan {
  me: boolean;
  yeu: boolean;
  lu: boolean;
  coDuyen: boolean;
}

/** Đọc giá trị trên các thẻ thành phần nhịp cho lõi và các màn đang tắt. Ô thiếu hoặc hỏng thì giữ
 *  mặc định của thẻ. */
const so = (v: unknown, mac: number) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : mac);
const chu = (v: unknown, mac = '') => (typeof v === 'string' ? v : mac);
const mucDs = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null) : []);

/** Kho người vận hành sửa trên thẻ (trang bị, phần thưởng cơ duyên, sự kiện). Ô chưa ai đụng thì trả bảng gốc. */
export function docKho(cauHinh: Record<string, unknown>): { do: MonDo[] | null; coDuyen: PhanCoDuyen[]; suKien: MucSuKien[] } {
  const O: readonly string[] = ['vu', 'ao', 'bao'];
  return {
    do:
      cauHinh['khoDo'] === undefined
        ? null
        : mucDs(cauHinh['khoDo']).map((m, i) => ({
            id: chu(m['id'], `d${i}`),
            o: (O.includes(chu(m['o'])) ? chu(m['o']) : 'vu') as OTrangBi,
            pham: Math.max(0, Math.min(PHAM.length - 1, Math.round(so(m['pham'], 0)))),
            ten: chu(m['ten']).trim(),
            goc: Math.max(1, so(m['goc'], 8)),
            roi: Math.max(0, so(m['roi'], 1)),
            anh: chu(m['anh']),
            bat: m['bat'] !== false,
          })),
    coDuyen:
      cauHinh['khoCoDuyen'] === undefined
        ? CO_DUYEN_GOC.slice()
        : mucDs(cauHinh['khoCoDuyen']).map((m, i) => {
            const tu = Math.max(0, Math.round(so(m['tu'], 1)));
            return {
              id: chu(m['id'], `c${i}`),
              loai: (['do', 'thach', 'lk'].includes(chu(m['loai'])) ? chu(m['loai']) : 'lk') as PhanCoDuyen['loai'],
              ten: chu(m['ten']).trim() || 'Cơ duyên',
              tu,
              den: Math.max(tu, Math.round(so(m['den'], tu))),
              tiLe: Math.max(0, so(m['tiLe'], 0)),
              hiem: m['hiem'] === true,
              hinh: chu(m['hinh'], '🎁'),
              bat: m['bat'] !== false,
            };
          }),
    suKien:
      cauHinh['khoSuKien'] === undefined
        ? SU_KIEN_GOC.slice()
        : mucDs(cauHinh['khoSuKien']).map((m, i) => ({
            id: chu(m['id'], `s${i}`),
            loai: chu(m['loai']) === 'linh-thao' ? ('linh-thao' as const) : ('co-duyen' as const),
            ten: chu(m['ten']).trim() || 'Sự kiện',
            boi: Math.max(1, Math.min(10, Math.round(so(m['boi'], 2)))),
            hinh: chu(m['hinh'], '✨'),
            bat: m['bat'] !== false,
          })),
  };
}

export function docCaiDat(cauHinh: Record<string, unknown>): { nhip: Partial<Nhip>; tat: TatMan; theoLich: boolean; chuoi: Chuoi } {
  const nhip: Partial<Nhip> = {};
  for (const ds of Object.values(O_NHIP)) {
    for (const o of ds as ONhip[]) {
      const v = cauHinh[o.key];
      const so = typeof v === 'number' && Number.isFinite(v) ? Math.min(o.max, Math.max(o.min, v)) : (o.macDinh ?? NHIP_LIVE[o.nhip] / MS[o.don]);
      nhip[o.nhip] = Math.round(so * MS[o.don]);
    }
  }
  return {
    nhip,
    tat: { me: cauHinh['moMe'] === false, yeu: cauHinh['moYeu'] === false, lu: cauHinh['moLu'] === false, coDuyen: cauHinh['moCoDuyen'] === false },
    theoLich: cauHinh['theoLich'] !== false,
    chuoi: docChuoi(cauHinh),
  };
}
