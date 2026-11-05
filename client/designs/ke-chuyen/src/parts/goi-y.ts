/** Nhịp hiện popup gợi ý lệnh. Hàm thuần: hai cửa sổ người xem mở cùng lúc
 *  phải thấy popup hiện/tắt đúng cùng một giây, nên mọi thứ suy từ đồng hồ
 *  treo tường chứ không từ `setTimeout` của riêng từng máy. */

/** Bản cũ: `guide: { every: 300, showFor: 8 }` — 5 phút một lượt, hiện 8 giây. */
export const CHU_KY_MS = 300_000;
export const HIEN_MS = 8_000;

export interface Luot {
  /** Đang tới lượt hiện hay không. */
  hien: boolean;
  /** Số thứ tự lượt — làm `key` cho React để hiệu ứng vào chạy lại mỗi lượt. */
  luot: number;
}

export function luotGoiY(now: number, chuKy = CHU_KY_MS, hien = HIEN_MS): Luot {
  return {
    hien: now % chuKy < hien,
    luot: Math.floor(now / chuKy),
  };
}
