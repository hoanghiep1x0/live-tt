/** Hàng ghế hình quạt của phòng kể chuyện.
 *
 *  Đây là **đồ đạc của phòng**, nên nó thuộc thiết kế, không thuộc module: phòng
 *  đám cưới xếp bàn tròn, chùa xếp bồ đoàn thành hàng, quán bar xếp ghế quầy.
 *  Module muốn đặt nhân vật lên ghế thì đọc vị trí mà thiết kế công bố, chứ
 *  không tự tính.
 *
 *  Đơn vị: cqw — 1% bề rộng khung màn. x tính theo bề rộng, y tính từ đầu vùng rạp.
 *  Chuyển nguyên từ `seatLayout` của mã cũ (D:\Live client/src/lib/session.ts).
 */

export interface HangGhe {
  row: string;
  count: number;
  tier: 'vang' | 'hong' | 'trang';
}

/** Sáu hàng đầu giữ dáng rạp (hẹp → rộng); hàng sau mỗi hàng `ROW_SEATS` ghế. */
export const SEAT_ROWS: readonly HangGhe[] = [
  { row: 'A', count: 8, tier: 'vang' },
  { row: 'B', count: 10, tier: 'vang' },
  { row: 'C', count: 12, tier: 'hong' },
  { row: 'D', count: 12, tier: 'hong' },
  { row: 'E', count: 14, tier: 'trang' },
  { row: 'F', count: 14, tier: 'trang' },
];

export const ROW_SEATS = 14;
/** 70 ghế A–F + hàng G = 84, mức mặc định của phòng mới. */
export const GHE_MAC_DINH = 84;

export const HALL_ROW_H = 5.5;
/** Hàng A lùi xuống, chừa khoảng trước rạp cho sàn nhảy. */
export const HALL_FIRST_Y = 10;
/** Xoè đều hình quạt từ hàng A tới G — mỗi hàng rộng thêm 7%. */
export const ROW_WIDTHS = [58, 65, 72, 79, 86, 93, 100];
/** Hai góc quạt lệch xuống tối đa chừng này ở hàng G. */
export const FAN_DROP = 4;
/** Độ cong hàng ghế: y lệch `−(t − 0.5)² × ROW_CURVE`. */
export const ROW_CURVE = 9;
export const AISLE_GAP = 13;
/** Ba lối đi dọc: mép trái · giữa · mép phải. */
export const AISLES_X = [3.2, 50, 96.8];

const GHE_TRUOC = SEAT_ROWS.reduce((n, r) => n + r.count, 0);

export function seatsInRow(r: number): number {
  return SEAT_ROWS[r]?.count ?? ROW_SEATS;
}

export function rowName(r: number): string {
  const d = SEAT_ROWS[r];
  if (d !== undefined) return d.row;
  // Hàng G trở đi: tiếp tục bảng chữ cái.
  return String.fromCharCode(65 + r);
}

export function tierOf(r: number): HangGhe['tier'] {
  return SEAT_ROWS[r]?.tier ?? 'trang';
}

/** Số hàng cần cho một sức chứa, tối thiểu sáu hàng đầu. */
export function hallRowsFor(capacity: number): number {
  return capacity <= GHE_TRUOC
    ? SEAT_ROWS.length
    : SEAT_ROWS.length + Math.ceil((capacity - GHE_TRUOC) / ROW_SEATS);
}

export interface ViTriGhe {
  x: number;
  y: number;
  scale: number;
}

export function seatLayout(r: number, i: number): ViTriGhe {
  const n = seatsInRow(r);
  const w = ROW_WIDTHS[Math.min(r, ROW_WIDTHS.length - 1)] ?? 100;

  // Hai nửa hàng, mỗi nửa chia đều trong phần của mình và chừa lối giữa, nhờ vậy
  // khoảng cách giữa các ghế đều nhau thay vì dồn về giữa.
  const left = Math.ceil(n / 2);
  const right = n - left;
  const halfW = (w - AISLE_GAP) / 2;
  const x =
    i < left
      ? 50 - AISLE_GAP / 2 - halfW + ((i + 0.5) / left) * halfW
      : 50 + AISLE_GAP / 2 + ((i - left + 0.5) / Math.max(1, right)) * halfW;

  const t = (x - (50 - w / 2)) / w;
  // Càng về hàng sau càng cong, để cả rạp thành một hình quạt đều.
  const curve = ROW_CURVE * (1 + Math.min(r, 6) * 0.22);
  const drop = Math.abs(t - 0.5) * 2 * FAN_DROP * (Math.min(r, 6) / 6);

  return {
    x,
    y: HALL_FIRST_Y + r * HALL_ROW_H - Math.pow(t - 0.5, 2) * curve + drop,
    scale: 0.92 + Math.min(r, 5) * 0.02,
  };
}

/** Chiều cao nội dung vùng rạp, để biết cuộn được bao xa. */
export function hallContentH(rows: number): number {
  return HALL_FIRST_Y + rows * HALL_ROW_H + 4;
}
