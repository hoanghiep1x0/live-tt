import { describe, expect, it } from 'vitest';
import { conLaiGiay, dongHoDem } from '../../../../client/designs/ke-chuyen/src/parts/ket-thuc';

describe('màn hình chào kết thúc', () => {
  it('đếm ngược từ lúc bật, không âm', () => {
    expect(conLaiGiay(1_000, 60, 1_000)).toBe(60);
    expect(conLaiGiay(1_000, 60, 31_500)).toBe(30);
    expect(conLaiGiay(1_000, 60, 61_000)).toBe(0);
    expect(conLaiGiay(1_000, 60, 999_000)).toBe(0);
  });

  it('đồng hồ mm:ss', () => {
    expect(dongHoDem(60)).toBe('01:00');
    expect(dongHoDem(9)).toBe('00:09');
    expect(dongHoDem(0)).toBe('00:00');
    expect(dongHoDem(-3)).toBe('00:00');
  });
});
