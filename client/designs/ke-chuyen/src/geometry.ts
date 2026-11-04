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
/** Khung dọc kéo xuống dưới mốc phần dưới chừng này, bớt khoảng hở với hàng top. */
export const PORTRAIT_EXTEND = 2.2;
/** Mốc phần dưới — chung cho cả hai hướng, nên phần dưới đứng yên khi đổi hướng. */
export const LOWER_TOP = SCREEN_BOTTOM_RATIO * STAGE_H;
export const HALL_TOP = LOWER_TOP + 32;
export const HALL_H = 172 - HALL_TOP;
/** Đỉnh khung dọc và cột thống kê, ngay dưới dải tiêu đề. */
export const OVERLAY_TOP = 14;
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
  const bottom = LOWER_TOP + PORTRAIT_EXTEND;
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
