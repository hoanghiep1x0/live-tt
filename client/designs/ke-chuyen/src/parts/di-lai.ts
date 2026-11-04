/** Lượt người ra vào ở lối đi — phần THUẦN, không React, không DOM.
 *
 *  Tách ra để test chạy được ở Node (quy ước 01 §5). Phần vẽ nằm ở `LoiDi.tsx`.
 */

import type { FeedItem } from '@live/contracts';
import { AISLES_X } from '../seats';
import { kieuChibi } from './ghe';

/** Một lượt đi hết ngần này. Lấy đúng `WALK_MS` của bản cũ. */
export const DI_MS = 5_200;
/** Trên cùng một lối, người sau xuất phát cách người trước ngần này — không dồn cục. */
const CACH_MS = 1_400;
/** Chờ lượt quá lâu thì bỏ: phòng quá đông thì không xếp hàng vô tận. */
const CHO_TOI_DA_MS = 6_000;
/** Nhiều hơn ngần này người cùng đi là rối mắt. */
const TOI_DA = 6;

export interface LuotDi {
  key: string;
  loi: number;
  vao: boolean;
  tu: number;
  kieu: number;
  /** Nick, để tra chỗ ngồi. */
  ai: string;
  /** Tên hiện trên nhãn đi theo đầu. */
  ten: string;
}

/** Tên dài thì lấy một chữ cho vừa nhãn. Cùng ý `shortName` của bản cũ. */
export function tenNgan(name: string): string {
  const tu = name.trim().split(/\s+/).filter(Boolean);
  const dayDu = tu.length > 1 && tu.every((w) => /^\p{Lu}/u.test(w));
  const lay = (dayDu ? tu[tu.length - 1] : tu[0]) ?? name.trim();
  return Array.from(lay).slice(0, 10).join('');
}

/** Lối gần ghế này nhất. Người rời ghế đi ngang ra lối gần nhất rồi mới xuống,
 *  chứ không bước xuyên qua cả rạp. */
export function loiGan(x: number): number {
  let tot = 0;
  for (let i = 1; i < AISLES_X.length; i += 1) {
    if (Math.abs((AISLES_X[i] ?? 50) - x) < Math.abs((AISLES_X[tot] ?? 50) - x)) tot = i;
  }
  return tot;
}

/** Các lượt đang đi, tính thuần từ feed. Chuyển nguyên cách xếp lượt của bản
 *  cũ: mỗi lối một hàng chờ, người sau cách người trước `CACH_MS`. */
export function cacLuot(
  feed: readonly FeedItem[],
  now: number,
  choCua: (ai: string) => { x: number } | undefined,
): LuotDi[] {
  const ranh = AISLES_X.map(() => 0);
  const ra: LuotDi[] = [];
  // Feed của phiên xếp cũ → mới, mà hàng chờ phải tính theo thứ tự thời gian.
  for (const f of feed) {
    if (f.kind !== 'join' && f.kind !== 'leave') continue;
    const ai = f.user ?? f.name;
    const cho = choCua(ai);
    const loi = cho === undefined ? f.id % AISLES_X.length : loiGan(cho.x);
    const tu = Math.max(f.at, ranh[loi] ?? 0);
    if (tu - f.at > CHO_TOI_DA_MS) continue;
    ranh[loi] = tu + CACH_MS;
    if (now >= tu && now < tu + DI_MS) {
      ra.push({
        key: `${f.kind}:${f.id}`,
        loi,
        vao: f.kind === 'join',
        tu,
        kieu: kieuChibi(ai),
        ai,
        ten: tenNgan(f.name),
      });
    }
  }
  return ra.slice(-TOI_DA);
}

