/** Nhịp nhạc chung của sàn bar — thuần số học, không THREE, không DOM (test được ở Node).
 *
 *  Cảnh, đèn, laser, màn LED đều đổi theo cùng một nhịp: lệch nhịp giữa các thứ là
 *  nhìn ra ngay cảnh "giả". Sao chép giống hệt ở mỗi kiểu của loại sàn bar (quy ước 01 §12).
 */

export const BPM = 124;

/** Bảng màu của loại sàn bar: hồng, tím, xanh, cam — đèn, LED, laser xoay vòng theo ô 4 nhịp. */
export const BANG_MAU = ['#ff2d95', '#7a3cff', '#18d6ff', '#ffb02e'] as const;

export interface Nhip {
  /** Số nhịp đã qua (thực). */
  beat: number;
  /** 1 ngay đầu nhịp, tắt dần về 0 trước nhịp sau — độ "nảy". */
  pulse: number;
  /** Số ô 4 nhịp đã qua — đổi kiểu quét đèn, bật laser theo ô. */
  bar4: number;
}

export function nhipTai(giay: number, bpm: number = BPM): Nhip {
  const beat = (Math.max(0, giay) * bpm) / 60;
  const pulse = Math.pow(1 - (beat % 1), 3);
  return { beat, pulse, bar4: Math.floor(beat / 4) };
}

/** Chỉ số màu của một dải LED: dải lệch pha nhau `phase` (0..1) để không đổi màu cùng lúc. */
export function mauDai(bar4: number, phase: number): number {
  const n = BANG_MAU.length;
  return (((bar4 + Math.round(phase * n)) % n) + n) % n;
}
