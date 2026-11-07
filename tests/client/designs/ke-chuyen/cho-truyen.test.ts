import { describe, expect, it } from 'vitest';
import {
  GIAI_LAO_TOI_THIEU_MS,
  giaiLaoCua,
  giayConLai,
} from '../../../../client/designs/ke-chuyen/src/parts/cho-truyen';

const nghi = (tu: number, lyDo = 'chuyen') => ({ giaiLao: { truyenSau: 'Sọ Dừa', lyDo, tu } });

describe('đếm ngược tới truyện kế', () => {
  it('đọc ô giaiLao của module Kể truyện', () => {
    expect(giaiLaoCua(nghi(1_000))).toEqual({ truyenSau: 'Sọ Dừa', lyDo: 'chuyen', tu: 1_000 });
    expect(giaiLaoCua({})).toBeNull();
    expect(giaiLaoCua(null)).toBeNull();
    expect(giaiLaoCua({ giaiLao: { tu: 0 } })).toBeNull();
  });

  it('đếm số giây còn lại, làm tròn lên', () => {
    const g = giaiLaoCua(nghi(1_000));
    expect(giayConLai(g, 1_000)).toBe(GIAI_LAO_TOI_THIEU_MS / 1000);
    expect(giayConLai(g, 1_000 + 10_400)).toBe(30);
    expect(giayConLai(g, 1_000 + 10_600)).toBe(30, 'nửa giây lẻ vẫn là 30, không nhảy xuống 29');
  });

  it('hết giờ tối thiểu thì thôi đếm, trả về đồng hồ thường', () => {
    const g = giaiLaoCua(nghi(1_000));
    expect(giayConLai(g, 1_000 + GIAI_LAO_TOI_THIEU_MS)).toBeNull();
    expect(giayConLai(g, 9_999_999)).toBeNull();
  });

  it('nghỉ vì sự cố thì không đếm — không biết bao giờ xong', () => {
    expect(giayConLai(giaiLaoCua(nghi(1_000, 'anh')), 1_000)).toBeNull();
    expect(giayConLai(giaiLaoCua(nghi(1_000, 'ket-noi')), 1_000)).toBeNull();
  });

  it('không trong giờ nghỉ thì không đếm', () => {
    expect(giayConLai(null, 1_000)).toBeNull();
  });
});
