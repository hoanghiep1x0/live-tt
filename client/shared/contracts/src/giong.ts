/** Giọng đọc của từng tính năng. Thuần, để test không cần trình duyệt. */

import type { Effect } from './effects';
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
    ...dan.map((g) => ({
      value: g.id,
      label: g.role.trim() === '' ? g.id : `${g.role} (${g.id})`,
    })),
  ];
  if (typeof dang === 'string' && dang !== '' && !dan.some((g) => g.id === dang)) {
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
