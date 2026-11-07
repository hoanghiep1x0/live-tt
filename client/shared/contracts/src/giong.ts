/** Giọng đọc của từng tính năng. Thuần, để test không cần trình duyệt. */

import type { Effect } from './effects';
import { mauCua, tenKetNoi } from './ket-noi-ai';
import type { KetNoiAi } from './ket-noi-ai';
import type { ConfigField } from './module';

/** Tab chuẩn cho mọi ô về giọng đọc, để tính năng nào cũng gom về một chỗ. */
export const TAB_GIONG = 'Giọng đọc';

/** Một giọng trong dàn, phần cần để hiện tên. */
export interface GiongTrongDan {
  id: string;
  role: string;
}

/** Một giọng trong dàn, đủ để biết đọc bằng kết nối nào. */
export interface GiongCoNha extends GiongTrongDan {
  /** Id kết nối trong kho Kết nối AI. */
  provider: string;
  /** Tên giọng, hoặc model nếu nhà đó gói giọng trong model (`x/y`). */
  voice: string;
}

/** Giọng này đọc được chưa, theo kho Kết nối AI. `null` là ổn; không thì là
 *  câu nói rõ thiếu gì — hiện ngay trên thẻ, thay vì để sân khấu gọi rồi nhận
 *  lỗi 400 mà không ai biết vì sao. Thuần. */
export function loiGiong(g: GiongCoNha, kho: readonly KetNoiAi[]): string | null {
  if (g.provider.trim() === '') return 'chưa chọn kết nối';
  const p = kho.find((x) => x.id === g.provider);
  if (p === undefined) return `kết nối "${g.provider}" không còn trong kho`;
  if (!p.uses.includes('tts')) return 'kết nối này chưa bật việc Giọng đọc';
  if (!p.hasKey) return 'kết nối này thiếu khoá';
  if (g.voice.trim() === '' && (p.models.tts ?? '').trim() === '') {
    return 'chưa có tên giọng, và kết nối cũng chưa có model đọc';
  }
  return null;
}

/** Giọng này thật ra phát ra từ đâu: dịch vụ đọc, miễn phí hay trả phí, đi
 *  qua kết nối nào. Một kết nối như 9router chỉ là bộ chuyển — tên giọng mới
 *  nói ai đọc (`edge-tts/…` là Microsoft Edge, `google-tts/…` là Google Dịch).
 *  Trang quản lý và bảng xem thử cùng gọi hàm này để nói cùng một câu. Thuần. */
export interface NguonGiong {
  /** Dịch vụ đọc: "Microsoft Edge", "ElevenLabs"… */
  dichVu: string;
  /** `null` là chưa biết (kết nối tự cắm, model lạ). */
  mienPhi: boolean | null;
  /** Tên kết nối trong kho mà giọng đi qua. */
  quaKetNoi: string;
}

/** Dịch vụ nhận ra được từ đầu tên giọng / model. */
const THEO_TEN: readonly { dau: string; dichVu: string; mienPhi: boolean }[] = [
  { dau: 'edge-tts/', dichVu: 'Microsoft Edge', mienPhi: true },
  { dau: 'google-tts/', dichVu: 'Google Dịch', mienPhi: true },
];

/** Dịch vụ nhận ra được từ chính kết nối (mẫu nhà trong kho). */
const THEO_MAU: Partial<Record<string, { dichVu: string; mienPhi: boolean }>> = {
  elevenlabs: { dichVu: 'ElevenLabs', mienPhi: false },
  openai: { dichVu: 'OpenAI', mienPhi: false },
  vieneu: { dichVu: 'VieNeu', mienPhi: false },
};

export function nguonGiong(g: GiongCoNha, kho: readonly KetNoiAi[]): NguonGiong | null {
  const p = kho.find((x) => x.id === g.provider);
  if (p === undefined) return null;
  const quaKetNoi = tenKetNoi(p);
  const ten = (g.voice.trim() === '' ? (p.models.tts ?? '') : g.voice).trim().toLowerCase();
  const theoTen = THEO_TEN.find((x) => ten.startsWith(x.dau));
  if (theoTen !== undefined) return { dichVu: theoTen.dichVu, mienPhi: theoTen.mienPhi, quaKetNoi };
  const mau = mauCua(p);
  const theoMau = THEO_MAU[mau.ma];
  if (theoMau !== undefined) return { ...theoMau, quaKetNoi };
  return { dichVu: mau.ma === 'khac' ? quaKetNoi : mau.ten, mienPhi: null, quaKetNoi };
}

/** Một dòng ngắn để hiện: "Microsoft Edge · miễn phí · qua 9router". */
export function chuNguon(n: NguonGiong | null): string {
  if (n === null) return 'chưa có kết nối';
  const gia = n.mienPhi === null ? '' : n.mienPhi ? ' · miễn phí' : ' · trả phí';
  return n.dichVu === n.quaKetNoi ? `${n.dichVu}${gia}` : `${n.dichVu}${gia} · qua ${n.quaKetNoi}`;
}

/** Các giọng trong dàn đang đọc qua một kết nối — để thẻ kết nối nói được
 *  "đang dùng cho Người dẫn truyện, bé gái" và người vận hành biết gỡ nó thì ai
 *  câm. Thuần. */
export function giongQua(cast: readonly GiongCoNha[], ketNoi: string): string[] {
  return cast
    .filter((g) => g.provider === ketNoi)
    .map((g) => (g.role.trim() === '' ? g.id : g.role));
}

/** Giá trị ô giọng nghĩa là "tự đổi": mỗi câu đọc bằng một giọng khác trong
 *  dàn, như bản cũ — lời chào, lời cảm ơn, đoạn truyện không cố định một giọng. */
export const GIONG_XOAY = '*';

/** Chọn giọng cho câu kế khi tính năng để "Tự đổi giọng": quay vòng cả dàn,
 *  không bao giờ lặp liền một giọng (trừ khi dàn chỉ có một). `truoc` là giọng
 *  câu trước. Thuần — `rand` truyền vào để test. */
export function giongXoay(dan: readonly string[], truoc: string, rand: () => number): string {
  const ds = dan.length > 1 ? dan.filter((g) => g !== truoc) : dan;
  return ds[Math.floor(rand() * ds.length)] ?? '';
}

/** Đổi ô `voice` thành ô chọn với danh sách giọng của phiên. Ô khác giữ nguyên.
 *  Giọng đang chọn mà đã bị gỡ khỏi dàn thì vẫn hiện, ghi rõ, để người vận
 *  hành thấy nó hỏng chứ không lặng lẽ đọc bằng giọng khác. */
export function oChonGiong(
  f: ConfigField,
  dan: readonly GiongTrongDan[],
  dang: unknown,
): ConfigField {
  if (f.type !== 'voice') return f;
  const options = [
    { value: '', label: 'Giọng mặc định của dàn' },
    { value: GIONG_XOAY, label: 'Tự đổi giọng — mỗi câu một giọng trong dàn' },
    ...dan.map((g) => ({
      value: g.id,
      label: g.role.trim() === '' ? g.id : `${g.role} (${g.id})`,
    })),
  ];
  if (typeof dang === 'string' && dang !== '' && dang !== GIONG_XOAY && !dan.some((g) => g.id === dang)) {
    options.push({ value: dang, label: `${dang} (không còn trong dàn)` });
  }
  return { ...f, type: 'select', options };
}

/** Khoá của ô chọn giọng trong module, nếu module có khai. */
export function khoaGiong(fields: readonly ConfigField[]): string | undefined {
  return fields.find((f) => f.type === 'voice')?.key;
}

/** Gắn giọng đã chọn vào các câu module đọc mà chưa tự nói rõ giọng nào. */
export function ganGiong(ra: Effect[], giong: unknown): Effect[] {
  if (typeof giong !== 'string' || giong === '') return ra;
  return ra.map((e) => (e.kind === 'say' && (e.voice ?? '') === '' ? { ...e, voice: giong } : e));
}

/** Một đoạn của câu, đọc bằng một giọng. `voice` rỗng là giọng mặc định của dàn. */
export interface DoanDoc {
  text: string;
  voice: string;
}

/** Dấu vai trong nội dung: `[id-giong]` đổi sang giọng đó, `[-]` về giọng chính. */
const DAU_VAI = /\[(-|[a-z][a-z0-9-]{0,59})\]/gi;

/** Bỏ dấu vai, để phụ đề và chữ trên màn không lộ `[ong-lao]`. */
export function boVai(text: string): string {
  return text
    .replace(DAU_VAI, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Chia một câu thành các đoạn theo vai.
 *
 *  Đơn giọng (`daGiong` false): cả câu một đoạn, đọc bằng giọng mặc định của
 *  dàn — dấu vai bị bỏ, giọng riêng của tính năng cũng bỏ. Đa giọng: đoạn đầu
 *  là giọng chính của tính năng, mỗi `[id]` đổi giọng tới dấu kế tiếp, `[-]`
 *  quay về giọng chính. Id lạ thì backend tự lùi về giọng mặc định. */
export function tachVai(text: string, giongChinh: string, daGiong: boolean): DoanDoc[] {
  if (!daGiong) {
    const t = boVai(text);
    return t === '' ? [] : [{ text: t, voice: '' }];
  }
  const ra: DoanDoc[] = [];
  let giong = giongChinh;
  let tu = 0;
  const day = (den: number): void => {
    const t = text.slice(tu, den).replace(/\s+/g, ' ').trim();
    if (t === '') return;
    const cuoi = ra.at(-1);
    // Hai đoạn liền nhau cùng giọng thì gộp: đỡ một lượt gọi nhà cung cấp.
    if (cuoi !== undefined && cuoi.voice === giong) cuoi.text = `${cuoi.text} ${t}`;
    else ra.push({ text: t, voice: giong });
  };
  for (const m of text.matchAll(DAU_VAI)) {
    day(m.index);
    tu = m.index + m[0].length;
    const id = (m[1] ?? '-').toLowerCase();
    giong = id === '-' ? giongChinh : id;
  }
  day(text.length);
  return ra;
}

/** MC tự xưng "mình", không bao giờ "MC": đổi chữ "MC" đứng riêng thành
 *  "mình" — đầu câu thì "Mình". Áp cho mọi câu đọc to và hiện chữ, kể cả mẫu
 *  câu người vận hành tự lưu. Hàm thuần. */
export function xungMinh(text: string): string {
  return text.replace(/(^|[^\p{L}\p{N}])MC(?![\p{L}\p{N}])/gu, (_m, truoc: string, viTri: number) => {
    const phiaTruoc = text.slice(0, viTri + truoc.length).trimEnd();
    const dauCau = phiaTruoc === '' || /[.!?…:"“\n]$/u.test(phiaTruoc);
    return `${truoc}${dauCau ? 'Mình' : 'mình'}`;
  });
}

/** Cách kể của Kể chuyện: MC kể (AI diễn từng đoạn, mặc định) hay tự đọc. */
export type CachKe = 'mc-day-du' | 'tu-doc';

/** Cách kể đang dùng: ô `cachKe`; cấu hình cũ chưa có thì suy từ `nguoiKe`;
 *  "mc-tiet-kiem" (chế độ đã bỏ) coi như MC — khớp `ke_truyen::cach_ke` của
 *  máy chủ. Hàm thuần. */
export function cachKeCua(o: { cachKe?: unknown; nguoiKe?: unknown }): CachKe {
  if (o.cachKe === 'tu-doc') return 'tu-doc';
  if (typeof o.cachKe === 'string') return 'mc-day-du';
  return o.nguoiKe === 'tu-doc' ? 'tu-doc' : 'mc-day-du';
}
