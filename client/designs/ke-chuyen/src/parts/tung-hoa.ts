/** Khán giả hô "Tung hoa!" cho người nhảy trên sàn — phần THUẦN, không React,
 *  không DOM.
 *
 *  Tách ra để test chạy được ở Node (quy ước 01 §5). Phần vẽ nằm ở
 *  `TungHoa.tsx`.
 */

import type { Seat } from '@live/contracts';
import type { ChoNgoi } from './ghe';

/** Mỗi ngần này đổi sang một ghế khác. Đúng `DANCE_SHOUT_MS` của bản cũ. */
export const NHIP_MS = 1_100;

export interface TiengHo {
  /** Số nhịp — vừa là key lúc vẽ, vừa là hạt chọn ghế. */
  k: number;
  x: number;
  y: number;
}

/** Ai đang hô lúc `now`. Như bản cũ: mỗi nhịp một ghế đang có người, và chữ
 *  sống hai nhịp nên luôn có hai tiếng hô so le chồng nhau.
 *
 *  Thuần theo đồng hồ và chỗ ngồi: hai cửa sổ xem cùng phòng thấy cùng ghế hô.
 *  Rạp trống thì không ai hô — không dựng tiếng reo từ hư không. */
export function tiengHo(ngoi: Map<number, Seat>, ghe: readonly ChoNgoi[], now: number): TiengHo[] {
  const co = [...ngoi.keys()]
    .sort((a, b) => a - b)
    .map((i) => ghe.find((g) => g.flat === i))
    .filter((g): g is ChoNgoi => g !== undefined);
  if (co.length === 0) return [];
  const nhip = Math.floor(now / NHIP_MS);
  return [nhip - 1, nhip]
    .filter((k) => k >= 0)
    .map((k) => {
      const g = co[(Math.imul(k, 2654435761) >>> 0) % co.length] as ChoNgoi;
      return { k, x: g.x, y: g.y };
    });
}
