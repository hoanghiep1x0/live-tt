/** Mốc dàn trang của phòng kể chuyện — nguồn duy nhất.
 *
 *  Đơn vị cqw = 1% bề rộng khung màn. Khung không dùng `transform: scale`:
 *  `.stage` rộng `min(100vw, 100vh×9/16)`, cao tự ra theo `aspect-ratio: 9/16`,
 *  mọi thứ bên trong tính bằng cqw nên co giãn tuyến tính theo bề rộng.
 *  CSS đọc lại các số này qua biến trên `style` của `.stage`.
 *
 *  Chuyển nguyên từ mã cũ (D:\Live client/src/components/StageView.tsx).
 */

export type Huong = 'portrait' | 'landscape';

/** Chiều cao màn phát, tính bằng cqw. */
export const STAGE_H = (100 * 16) / 9;
/** Đáy khung chiếu cách đỉnh màn 53,5% chiều cao. */
export const SCREEN_BOTTOM_RATIO = 0.535;
export const LANDSCAPE_W = 91;
/** Đáy khung dọc dừng TRÊN mốc phần dưới chừng này, chừa khoảng trống cho dòng
 *  đua top và hàng bồ đoàn thở. Trước đây khung kéo xuống quá mốc 2,2cqw nên
 *  dòng đua dính sát mép khung. */
export const PORTRAIT_BOTTOM_GAP = 1;
/** Mốc phần dưới — chung cho cả hai hướng, nên phần dưới đứng yên khi đổi hướng. */
export const LOWER_TOP = SCREEN_BOTTOM_RATIO * STAGE_H;
export const HALL_TOP = LOWER_TOP + 32;
export const HALL_H = 172 - HALL_TOP;
/** Đỉnh khung dọc. Dải tiêu đề kết thúc quãng 5,9cqw, nên khung có thể bắt đầu
 *  ngay từ 6,6 — nhưng để thấp hơn một chút cho dải trên thở, và khung bớt cao
 *  thì cụm dưới (dòng đua, hàng bồ đoàn, thanh tiến độ) rộng chỗ hơn. Lời minh
 *  bạch không còn nằm trong khung nữa, nó đã lên dải trên cạnh chữ LIVE. */
export const OVERLAY_TOP = 9;
/** Khung ngang nâng cao hơn mốc phần dưới một đoạn, cho cân đối. */
export const LANDSCAPE_LIFT = 14.3;
/** Khung ngang: cụm top / tiến độ / dải chữ nâng lên cùng khung. */
export const LANDSCAPE_GROUP_LIFT = 6.2;

export interface KhungChieu {
  top: number;
  height: number;
  width: number;
  bottom: number;
}

export function screenGeometry(huong: Huong): KhungChieu {
  if (huong === 'landscape') {
    const height = (LANDSCAPE_W * 9) / 16;
    const top = LOWER_TOP - LANDSCAPE_LIFT - height;
    return { top, height, width: LANDSCAPE_W, bottom: top + height };
  }
  const bottom = LOWER_TOP - PORTRAIT_BOTTOM_GAP;
  const height = bottom - OVERLAY_TOP;
  // Khung dọc chiếu nội dung 9:16, nên bề rộng suy ra từ chiều cao.
  return { top: OVERLAY_TOP, height, width: (height * 9) / 16, bottom };
}

/** Biến CSS đặt trên `.stage`. Một chỗ duy nhất, CSS không tự tính lại số nào. */
export function bienCss(huong: Huong, rows: number): Record<string, string> {
  const g = screenGeometry(huong);
  return {
    '--overlay-top': `${OVERLAY_TOP}cqw`,
    '--screen-top': `${g.top}cqw`,
    '--screen-h': `${g.height}cqw`,
    '--screen-w': `${g.width}cqw`,
    '--screen-mid': `${g.top + g.height / 2}cqw`,
    '--screen-bottom': `${g.bottom}cqw`,
    '--lower-top': `${LOWER_TOP}cqw`,
    '--hall-top': `${HALL_TOP}cqw`,
    '--hall-gap': `${STAGE_H - HALL_TOP - HALL_H}cqw`,
    '--group-lift': `${huong === 'landscape' ? LANDSCAPE_GROUP_LIFT : 0}cqw`,
    '--hall-rows': String(rows),
  };
}
