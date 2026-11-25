import { describe, expect, it } from 'vitest';
import { buoc, nhanTin, nhapMonThang, NHIP_LIVE, TAN_TU_HE_SO, taoThe } from '../../../../client/designs/tu-tien-son-ha/src/loi/core';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Mở một trận Đại Chiến có sẵn mỗi tông một đệ tử. */
function tran() {
  const r = hat(5);
  const the = taoThe(0, { ...NHIP_LIVE, luDau: 0, yeuDau: 1e12, mua: 1e12, meDau: 1e12, nmDau: 1e12 });
  nhapMonThang(the, { kind: 'comment', user: 's', ten: 'S', text: 'x' }, 'son', 'nam', 10, r);
  nhapMonThang(the, { kind: 'comment', user: 't', ten: 'T', text: 'x' }, 'thuy', 'nam', 10, r);
  let t = 10;
  while (the.pha.k !== 'lu' && t < 120_000) buoc(the, (t += 250), r);
  if (the.pha.k !== 'lu') throw new Error('chưa mở Đại Chiến');
  return { the, r, t, p: the.pha };
}

describe('Đại Chiến — tán tu', () => {
  it('khách bình luận: ra đòn giúp một phe ngẫu nhiên, vẫn là khách', () => {
    const { the, r, t, p } = tran();
    const truoc = p.son + p.thuy;
    const ra = nhanTin(the, { kind: 'comment', user: 'k', ten: 'K', text: 'đánh đi' }, t + 100, r);
    expect(ra.some((s) => s.k === 'tan-tu')).toBe(true);
    expect(p.son + p.thuy - truoc).toBeCloseTo(TAN_TU_HE_SO, 5);
    expect(the.nguoi.get('k')!.phe).toBeNull();
    // Gõ dồn không thêm đòn.
    const ra2 = nhanTin(the, { kind: 'comment', user: 'k', ten: 'K', text: 'nữa' }, t + 200, r);
    expect(ra2.some((s) => s.k === 'tan-tu')).toBe(false);
  });

  it('tán tu gõ tên tông giữa trận thì nhập môn ngay', () => {
    const { the, r, t } = tran();
    nhanTin(the, { kind: 'comment', user: 'k', ten: 'K', text: 'núi' }, t + 100, r);
    expect(the.nguoi.get('k')!.phe).toBe('son');
  });
});
