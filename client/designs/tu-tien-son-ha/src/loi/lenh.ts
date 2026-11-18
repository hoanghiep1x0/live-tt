/** Đọc lệnh trong bình luận — phần THUẦN. Khách gõ có dấu, không dấu, thừa chấm than,
 *  nên so trên bản đã bỏ dấu và bỏ ký tự thừa. */

import type { Huong } from './me-cung';
import type { CanCo, Gioi, Ky, Phe } from './the-gioi';

export type Lenh =
  | { k: 'phe'; phe: Phe; gioi?: Gioi }
  | { k: 'gioi'; gioi: Gioi }
  | { k: 'dap'; chon: 0 | 1 | 2 }
  | { k: 'danh' }
  | { k: 'ho' }
  | { k: 'toi' }
  | { k: 'di'; huong: Huong }
  | { k: 'ky'; ky: Ky }
  | { k: 'vao' }
  | { k: 'can-co'; canCo: CanCo }
  | { k: 'noi' };

/** Bỏ dấu tiếng Việt, chữ thường, gộp khoảng trắng, bỏ ký tự không phải chữ số. */
export function chuan(chu: string): string {
  return chu
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SON = new Set(['nui', 'son', 'son tinh', 'tan vien', 'phe nui', 'son mon', 'ba vi', 'vao nui', 'theo nui']);
const THUY = new Set(['nuoc', 'thuy', 'thuy tinh', 'long cung', 'phe nuoc', 'thuy phu', 'vao nuoc', 'theo nuoc']);
const TOI = new Set(['toi', 'tu vi', 'tuvi', 'tv', 'xem toi', 'cua toi', 'cs', 'chi so']);

/** Mũi tên gõ thẳng (bàn phím điện thoại có sẵn) — phải đọc trước khi bỏ ký tự lạ. */
const MUI_TEN: Record<string, Huong> = { '↑': 'len', '⬆': 'len', '↓': 'xuong', '⬇': 'xuong', '←': 'trai', '⬅': 'trai', '→': 'phai', '➡': 'phai' };
const DI: Record<string, Huong> = { len: 'len', tren: 'len', xuong: 'xuong', duoi: 'xuong', trai: 'trai', phai: 'phai' };

export function docLenh(text: string): Lenh {
  const mt = MUI_TEN[text.trim().charAt(0)];
  if (mt !== undefined) return { k: 'di', huong: mt };
  const c = chuan(text);
  if (c === '') return { k: 'noi' };
  if (SON.has(c)) return { k: 'phe', phe: 'son' };
  if (THUY.has(c)) return { k: 'phe', phe: 'thuy' };
  // Nhập môn kèm chọn nhân vật: "núi nam", "nước nữ", "nam núi", "vào nước nữ".
  const sau = /^(.+) (nam|nu)$/.exec(c);
  const truoc = /^(nam|nu) (.+)$/.exec(c);
  const kem = sau ? { phe: sau[1]!, gioi: sau[2] as Gioi } : truoc ? { phe: truoc[2]!, gioi: truoc[1] as Gioi } : null;
  if (kem !== null) {
    if (SON.has(kem.phe)) return { k: 'phe', phe: 'son', gioi: kem.gioi };
    if (THUY.has(kem.phe)) return { k: 'phe', phe: 'thuy', gioi: kem.gioi };
  }
  if (c === 'nam' || c === 'nu') return { k: 'gioi', gioi: c };
  // "a", "A!!!", "đáp án b", "chọn c", "c c c" — chỉ một chữ cái lặp lại cũng tính.
  const dap = /^(?:dap an |chon |dap )?([abc])(?: \1)*$/.exec(c);
  if (dap) return { k: 'dap', chon: (dap[1]!.charCodeAt(0) - 97) as 0 | 1 | 2 };
  if (/^(danh|chem|tan cong|dam|chiu don)( .*)?$/.test(c)) return { k: 'danh' };
  // "độ", "do", "hộ pháp", "độ độ độ". Không bắt "đó", "đồ" vì đã bỏ dấu — chấp nhận:
  // tin chỉ gồm "do" thì gần như luôn là người đang hô độ kiếp.
  if (/^(do|ho phap|ho|do kiep)( (do|ho))*$/.test(c)) return { k: 'ho' };
  if (TOI.has(c)) return { k: 'toi' };
  // Xin nhập môn mà không chọn phe: game tự xếp vào phe đang yếu hơn.
  if (['vao', 'tham gia', 'nhap mon', 'choi', 'tu tien', 'bai su'].includes(c)) return { k: 'vao' };
  // Hô trận pháp: "hồi", "thủ", "công", "phá" (lặp lại cũng tính), hoặc "hồi máu", "tăng công"…
  const ky = /^(?:tang |hoi mau|pha giap)?(hoi|thu|cong|pha)?(?: (hoi|thu|cong|pha))*$/.exec(c);
  const KY: Record<string, Ky> = { hoi: 'hoi', thu: 'thu', cong: 'cong', pha: 'pha', 'hoi mau': 'hoi', 'pha giap': 'pha', 'tang cong': 'cong', 'tang thu': 'thu' };
  if (KY[c] !== undefined) return { k: 'ky', ky: KY[c]! };
  if (ky && ky[1] !== undefined && c.split(' ').every((w) => w === ky[1])) return { k: 'ky', ky: KY[ky[1]]! };
  const CAN: Record<string, CanCo> = { 'chien tuong': 'tuong', 'ho ve': 've', 'y su': 'y', 'pha quan': 'quan' };
  if (CAN[c] !== undefined) return { k: 'can-co', canCo: CAN[c]! };
  // Dẫn đường trong Địa Cung: "lên", "đi lên", "qua trái", "phải phải".
  const di = /^(?:di |qua |sang |re |ben )?(len|tren|xuong|duoi|trai|phai)(?: \1)*$/.exec(c);
  if (di) return { k: 'di', huong: DI[di[1]!]! };
  return { k: 'noi' };
}
