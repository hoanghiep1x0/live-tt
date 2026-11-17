/** Màn hình chào kết thúc — phần THUẦN (giờ đếm ngược), không React.
 *
 *  Người vận hành bật công tắc "Màn hình chào kết thúc" trước khi tắt live:
 *  màn chào phủ kín khung kèm đồng hồ đếm ngược N giây. Máy chủ (`ket_thuc.rs`)
 *  cho MC chào tạm biệt một câu và tạm dừng truyện. */

/** Đếm ngược mặc định (giây). */
export const KET_THUC_GIAY_MAC_DINH = 60;
export const KET_THUC_LOI_MAC_DINH = 'Cảm ơn cả nhà đã nghe truyện cùng mình';
export const KET_THUC_HEN_MAC_DINH = 'Hẹn gặp lại cả nhà buổi sau nha ❤';

/** Số giây còn lại, từ lúc bật `batDau` (ms), đếm `giay` giây. Không âm. */
export function conLaiGiay(batDau: number, giay: number, now: number): number {
  const het = batDau + Math.max(0, giay) * 1000;
  return Math.max(0, Math.ceil((het - now) / 1000));
}

/** "mm:ss" từ số giây. */
export function dongHoDem(giay: number): string {
  const g = Math.max(0, Math.floor(giay));
  return `${String(Math.floor(g / 60)).padStart(2, '0')}:${String(g % 60).padStart(2, '0')}`;
}
