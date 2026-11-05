/** Nhịp nhạc của sàn bar (san-bar-hop-dem). Đèn, LED, laser cùng đọc một nhịp — lệch là thấy ngay. */

import { describe, expect, it } from 'vitest';
import { BANG_MAU, BPM, mauDai, nhipTai } from '../../../../client/designs/san-bar-hop-dem/src/nhip';

describe('nhịp', () => {
  it('124 BPM: 2 giây là 4,13 nhịp, sang ô 4 nhịp thứ nhất', () => {
    const n = nhipTai(2);
    expect(BPM).toBe(124);
    expect(n.beat).toBeCloseTo((2 * 124) / 60, 6);
    expect(n.bar4).toBe(1);
  });

  it('độ nảy bằng 1 ngay đầu nhịp và tắt dần trước nhịp sau', () => {
    const dau = nhipTai(60 / BPM);
    const giua = nhipTai(1.5 * (60 / BPM));
    expect(dau.pulse).toBeCloseTo(1, 6);
    expect(giua.pulse).toBeCloseTo(0.125, 6);
  });

  it('thời gian âm không làm nhịp âm', () => {
    expect(nhipTai(-3)).toEqual({ beat: 0, pulse: 1, bar4: 0 });
  });
});

describe('màu dải LED', () => {
  it('xoay vòng trong bảng 4 màu, các dải lệch pha không trùng màu', () => {
    expect(BANG_MAU).toHaveLength(4);
    expect(mauDai(0, 0)).toBe(0);
    expect(mauDai(5, 0)).toBe(1);
    expect(mauDai(0, 0.25)).toBe(1);
    expect(mauDai(-1, 0)).toBe(3);
  });
});
