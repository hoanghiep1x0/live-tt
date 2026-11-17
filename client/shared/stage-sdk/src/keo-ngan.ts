/** Độ rộng ngăn xem thử do người vận hành kéo ở mép trái — phần THUẦN.
 *
 *  Chưa kéo lần nào thì `null`: ngăn theo `--bx-ngan-rong` của thiết kế (sàn
 *  bar 560px, còn lại 360px). Kéo rồi thì nhớ theo từng thiết kế, vì mỗi phòng
 *  cần một độ rộng khác nhau.
 */

/** Hẹp hơn thì chữ trên thẻ gãy dòng lung tung. */
export const RONG_TOI_THIEU = 300;
/** Chừa lại ngần này bên trái để luôn còn thấy một khúc sân khấu và nút ←. */
export const CHUA_TRAI = 120;

/** Giữ độ rộng trong khoảng dùng được với cửa sổ rộng `vw`. Hàm thuần. */
export function kepRong(rong: number, vw: number): number {
  const toiDa = Math.max(RONG_TOI_THIEU, vw - CHUA_TRAI);
  if (!Number.isFinite(rong)) return RONG_TOI_THIEU;
  return Math.round(Math.min(toiDa, Math.max(RONG_TOI_THIEU, rong)));
}

/** Khoá lưu trong trình duyệt, mỗi thiết kế một khoá. */
export function khoaRong(thietKe: string | null): string {
  return `bx-ngan-rong:${thietKe ?? 'chung'}`;
}

/** Đọc độ rộng đã nhớ; không có, hỏng hay bị chặn lưu trữ thì `null`. */
export function docRong(thietKe: string | null): number | null {
  try {
    const v = Number(localStorage.getItem(khoaRong(thietKe)));
    return Number.isFinite(v) && v >= RONG_TOI_THIEU ? v : null;
  } catch {
    return null;
  }
}

/** Nhớ độ rộng; `null` là về mặc định của thiết kế. Lỗi lưu thì bỏ qua. */
export function luuRong(thietKe: string | null, rong: number | null): void {
  try {
    if (rong === null) localStorage.removeItem(khoaRong(thietKe));
    else localStorage.setItem(khoaRong(thietKe), String(rong));
  } catch {
    // Chặn lưu trữ thì chỉ là lần sau mở lại về mặc định.
  }
}
