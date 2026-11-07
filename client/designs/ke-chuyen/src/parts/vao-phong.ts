/** Thông báo người mới vào phòng — phần THUẦN, không React, không DOM.
 *
 *  Tách ra để test chạy được ở Node (quy ước 01 §5). Phần vẽ nằm ở
 *  `VaoPhong.tsx`.
 */

import type { FeedItem } from '@live/contracts';

/** Mỗi lời báo hiện ngần này rồi tắt. Đúng `JOIN_MS` của bản cũ. */
export const HIEN_MS = 4_000;
/** Mỗi dòng báo gọi nhiều nhất ngần này tên.
 *
 *  Hai là vừa khít bề ngang: đo ngay trên sân khấu với tên dài nhất mà
 *  `tenNgan` cho ra, một tên chiếm 33cqw, hai tên 44cqw — đúng `max-width` của
 *  cột lời báo — ba tên 55cqw thì bị cắt mất đuôi. */
export const TEN_MOI_DONG = 2;
/** Nhiều nhất ngần này dòng cùng lúc.
 *
 *  Lời báo có nền tối đặc, nằm đè lên hàng ghế ở góc trái dưới, nên cao bao
 *  nhiêu là che bấy nhiêu chibi: mỗi dòng ~18px trên sân khấu cao 768px. Ba
 *  dòng (~57px) gọi được sáu tên mà chỉ che bằng nửa sáu dòng một tên. */
export const DONG_TOI_DA = 3;
/** Tổng số tên hiện được mỗi nhịp; đông hơn thì gộp thành dòng "và N người
 *  khác".
 *
 *  Bản cũ để 2 (`JOIN_SHOW`) cho phòng vài chục người. Phòng đông thì 2 là quá
 *  ít: đo trên phòng 4.400 người được 328 lượt vào trong 4 phút, tức chừng 5–6
 *  người mỗi 4 giây — đúng bằng `HIEN_MS` — nên hai phần ba khách chỉ còn là
 *  con số trong dòng "và N người khác", không ai thấy tên mình. Giọng đọc không
 *  gánh nổi nhịp ấy (một lượt MC chỉ chào được dăm tên), nên LỜI BÁO TRÊN MÀN
 *  là chỗ duy nhất gọi được tên gần hết mọi người. Sáu tên là vừa nhịp phòng
 *  đông, và tự co lại khi phòng vắng vì chỉ hiện người thật sự vừa vào. */
export const TOI_DA = TEN_MOI_DONG * DONG_TOI_DA;

export interface VaoPhong {
  /** Các dòng báo, mới nhất trước; mỗi dòng gọi tên một hai người. */
  dong: readonly (readonly FeedItem[])[];
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
  const hien = vua.slice(0, TOI_DA);
  const dong: FeedItem[][] = [];
  for (const f of hien) {
    const cuoi = dong[dong.length - 1];
    if (cuoi === undefined || cuoi.length >= TEN_MOI_DONG) dong.push([f]);
    else cuoi.push(f);
  }
  return { dong, them: Math.max(0, vua.length - TOI_DA) };
}
