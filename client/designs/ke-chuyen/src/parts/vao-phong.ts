/** Thông báo người mới vào phòng — phần THUẦN, không React, không DOM.
 *
 *  Tách ra để test chạy được ở Node (quy ước 01 §5). Phần vẽ nằm ở
 *  `VaoPhong.tsx`.
 */

import type { FeedItem } from '@live/contracts';

/** Mỗi lời báo hiện ngần này rồi tắt. Đúng `JOIN_MS` của bản cũ. */
export const HIEN_MS = 4_000;
/** Đông hơn thì gộp thành một dòng "và N người khác". Đúng `JOIN_SHOW`. */
export const TOI_DA = 2;

export interface VaoPhong {
  /** Người vừa vào, mới nhất trước. */
  hien: readonly FeedItem[];
  /** Số người vừa vào nữa mà không còn chỗ hiện tên. */
  them: number;
}

/** Ai đang được báo là vừa vào phòng. Thuần theo feed và đồng hồ, nên hai cửa
 *  sổ xem cùng một phòng thấy cùng một lời báo.
 *
 *  Bỏ nhân vật ảo, như bản cũ: họ vào ra liên tục để phòng đỡ trống, báo cả họ
 *  thì góc màn lúc nào cũng nhấp nháy tên người không có thật. Họ vẫn có nhãn
 *  đi theo trên lối đi. */
export function nguoiMoiVao(feed: readonly FeedItem[], now: number): VaoPhong {
  const vua: FeedItem[] = [];
  // Feed xếp cũ → mới; lời báo lấy mới nhất trước.
  for (let i = feed.length - 1; i >= 0; i -= 1) {
    const f = feed[i];
    if (f === undefined) continue;
    if (now - f.at >= HIEN_MS) break;
    if (f.kind === 'join' && f.virtual !== true && now >= f.at) vua.push(f);
  }
  return { hien: vua.slice(0, TOI_DA), them: Math.max(0, vua.length - TOI_DA) };
}
