import { describe, expect, it } from 'vitest';
import { CHUA_TRAI, kepRong, khoaRong, RONG_TOI_THIEU } from '../../../client/shared/stage-sdk/src/keo-ngan';

describe('kéo đổi độ rộng ngăn xem thử', () => {
  it('giữ nguyên độ rộng nằm trong khoảng dùng được', () => {
    expect(kepRong(480, 1400)).toBe(480);
    expect(kepRong(480.6, 1400)).toBe(481);
  });

  it('không hẹp quá mức tối thiểu', () => {
    expect(kepRong(120, 1400)).toBe(RONG_TOI_THIEU);
    expect(kepRong(-50, 1400)).toBe(RONG_TOI_THIEU);
    expect(kepRong(Number.NaN, 1400)).toBe(RONG_TOI_THIEU);
  });

  it('luôn chừa một khúc bên trái để còn thấy sân khấu', () => {
    expect(kepRong(5000, 1400)).toBe(1400 - CHUA_TRAI);
  });

  it('cửa sổ quá hẹp thì vẫn về mức tối thiểu, không ra số âm', () => {
    expect(kepRong(600, 200)).toBe(RONG_TOI_THIEU);
  });

  it('mỗi thiết kế nhớ một độ rộng riêng', () => {
    expect(khoaRong('ke-chuyen')).not.toBe(khoaRong('san-bar-hop-dem'));
    expect(khoaRong(null)).toBe('bx-ngan-rong:chung');
  });
});
