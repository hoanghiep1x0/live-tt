/** Nhịp cảnh an ủi — phần THUẦN, không React, không DOM.
 *
 *  Tách ra để test chạy được ở Node (quy ước 01 §5). Phần vẽ nằm ở `AnUi.tsx`.
 */

import type { FeedItem, Seat } from '@live/contracts';
import type { ChoNgoi } from './ghe';

/** Mỗi chu kỳ một lượt an ủi. Bản cũ chờ ngẫu nhiên 40–90 giây; ở đây chốt một
 *  con số để nhịp là hàm thuần của đồng hồ. */
const CHU_KY_MS = 60_000;
export const CHAY_MS = 1_600;
export const OM_MS = 5_000;
export const TONG_MS = CHAY_MS * 2 + OM_MS;

export type NhanVat = 'be' | 'cau-be';

/** Chỗ đứng ôm quanh từng nhân vật, lấy nguyên `HUG_SPOTS` của bản cũ (x %,
 *  đáy chân y cqw). Bé ở sát mép trái nên cả hai người đứng bên phải; cậu bé
 *  thì một người trước mặt, một người lùi sau mép phải. */
export const CHO_OM: Record<NhanVat, readonly { x: number; y: number }[]> = {
  be: [
    { x: 15.4, y: 114 },
    { x: 19, y: 113.6 },
  ],
  'cau-be': [
    { x: 84.9, y: 124 },
    { x: 97.2, y: 116.8 },
  ],
};

/** Nhân vật được ôm đứng ở đâu, để đặt tim. */
export const CHO_NHAN_VAT: Record<NhanVat, { x: number; y: number }> = {
  be: { x: 11, y: 117 },
  'cau-be': { x: 91.5, y: 118 },
};

/** Khách gõ mấy chữ này thì chính chibi của họ chạy lên ôm. Lấy đúng bộ chữ
 *  của bản cũ (`viewerHugs`). */
export function xinOm(text: string): boolean {
  const t = text.toLowerCase();
  if (t.includes('an ủi') || t.includes('thương bé')) return true;
  // Tách theo chữ cái chứ không dùng `includes('ôm')`: "hôm nay" không phải
  // lời xin ôm.
  return t.split(/[^\p{L}]+/u).includes('ôm');
}

/** Lời xin ôm gần nhất còn trong thời hạn một lượt, của khách THẬT. */
export function khachXinOm(
  feed: readonly FeedItem[],
  now: number,
): { at: number; user: string } | null {
  for (let i = feed.length - 1; i >= 0; i -= 1) {
    const f = feed[i];
    if (f === undefined) continue;
    if (now - f.at >= TONG_MS) break;
    if (f.kind !== 'comment' || f.virtual === true) continue;
    if (!xinOm(f.text)) continue;
    return { at: f.at, user: f.user ?? f.name };
  }
  return null;
}

export interface Canh {
  /** Số thứ tự lượt — dùng làm hạt bốc người, nên cùng lượt là cùng người. */
  k: number;
  nhanVat: NhanVat;
  /** Đã trôi bao lâu kể từ đầu lượt. */
  t: number;
  /** Khách tự gõ xin ôm: chính họ phải là người chạy lên. */
  nguoiXin?: string;
}

/** Lượt an ủi đang diễn ra, hoặc `null`. Hàm thuần.
 *
 *  Khách gõ "ôm" thì lượt của họ ĐÈ lên lượt định kỳ: người xem vừa ngỏ lời mà
 *  phải chờ hết phút mới thấy gì thì chẳng ai gõ nữa. */
export function canhAnUi(now: number, xin: { at: number; user: string } | null = null): Canh | null {
  if (xin !== null && now - xin.at < TONG_MS) {
    return {
      k: Math.floor(xin.at / 1000),
      nhanVat: 'be',
      t: now - xin.at,
      nguoiXin: xin.user,
    };
  }
  const k = Math.floor(now / CHU_KY_MS);
  const t = now % CHU_KY_MS;
  if (t >= TONG_MS) return null;
  return { k, nhanVat: k % 2 === 0 ? 'be' : 'cau-be', t };
}

/** Chọn người ôm từ những ai đang ngồi. Thuần theo `k` nên hai cửa sổ chọn
 *  đúng một nhóm. Rạp trống thì không có lượt nào — không dựng người từ hư
 *  không để làm phòng có vẻ đông. */
export function chonNguoiOm(
  ngoi: Map<number, Seat>,
  ghe: readonly ChoNgoi[],
  k: number,
  soNguoi: number,
  /** Khách tự gõ xin ôm — họ đứng đầu danh sách, nếu đang có ghế. */
  nguoiXin?: string,
): { user: string; x: number; y: number }[] {
  const co = [...ngoi.entries()]
    .map(([i, ai]) => {
      const g = ghe.find((x) => x.flat === i);
      return g === undefined ? null : { user: ai.user, x: g.x, y: g.y };
    })
    .filter((x): x is { user: string; x: number; y: number } => x !== null)
    // Hàng gần sân khấu (y nhỏ) được ưu tiên, như bản cũ.
    .sort((a, b) => a.y - b.y);
  if (co.length === 0) return [];

  const ra: { user: string; x: number; y: number }[] = [];
  if (nguoiXin !== undefined) {
    const minh = co.find((x) => x.user === nguoiXin);
    if (minh !== undefined) ra.push(minh);
  }
  for (let i = 0; ra.length < soNguoi && i < soNguoi * 3; i += 1) {
    const j = (k * 7 + i * 13) % co.length;
    const nguoi = co[j];
    if (nguoi !== undefined && !ra.some((x) => x.user === nguoi.user)) ra.push(nguoi);
  }
  return ra;
}

