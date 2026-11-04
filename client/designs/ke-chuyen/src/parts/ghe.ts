/** Hàng ghế và ảnh khán giả — phần THUẦN, không React, không DOM.
 *
 *  Tách ra để test chạy được ở Node (quy ước 01 §5). Phần vẽ nằm ở
 *  `HangGhe.tsx`.
 */

import { seatLayout, seatsInRow } from '../seats';

export interface ChoNgoi {
  key: string;
  r: number;
  /** Chỉ số phẳng, đếm từ ghế đầu hàng A. Backend xếp chỗ theo đúng thứ tự này,
   *  nên `Seat.i` khớp thẳng vào đây mà không cần bảng quy đổi. */
  flat: number;
  x: number;
  y: number;
  scale: number;
}

export function dungGhe(rows: number): ChoNgoi[] {
  const ra: ChoNgoi[] = [];
  let flat = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let i = 0; i < seatsInRow(r); i += 1) {
      ra.push({ key: `${r}-${i}`, r, flat, ...seatLayout(r, i) });
      flat += 1;
    }
  }
  return ra;
}

/** Sáu kiểu khán giả, mỗi kiểu hai dáng. Đây là CHÍNH sáu nhân vật của bản cũ:
 *  chạy lại `buildChibi(0..5)` trong `chibi3d.ts` với đúng bộ đèn rồi chụp ra
 *  PNG nền trong — xem `assets/CREDITS.md`. */
const SO_KIEU = 6;
export const ANH_NGOI: readonly string[] = Array.from(
  { length: SO_KIEU },
  (_, i) => `chibi/khan-${i + 1}.png`,
);
export const ANH_DUNG: readonly string[] = Array.from(
  { length: SO_KIEU },
  (_, i) => `chibi/dung-${i + 1}.png`,
);

/** Lấy ảnh theo kiểu. Mảng dựng đủ `SO_KIEU` phần tử và `kieuChibi` luôn trả số
 *  trong khoảng đó, nhưng `noUncheckedIndexedAccess` không biết điều ấy. */
export function anhCua(ds: readonly string[], kieu: number): string {
  return ds[kieu] ?? ds[0] ?? '';
}

/** Mỗi người xem giữ đúng một kiểu suốt buổi: băm từ nick chứ không bốc ngẫu
 *  nhiên, nên hai cửa sổ xem cùng một phòng thấy giống hệt nhau và người đó đổi
 *  ghế vẫn là người đó. Chuyển nguyên ý `chibiVariantOf` của bản cũ. */
export function kieuChibi(user: string): number {
  let h = 0;
  for (let i = 0; i < user.length; i += 1) h = (h * 31 + user.charCodeAt(i)) % 100_003;
  return h % SO_KIEU;
}

