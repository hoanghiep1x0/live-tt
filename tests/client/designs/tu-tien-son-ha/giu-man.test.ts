import { describe, expect, it } from 'vitest';
import { buoc, giuMan, nhapMonThang, nhayMe, nhayTiThi, nhayTuLuyen, NHIP_LIVE, pheTuLuyen, taoThe, thaGiu } from '../../../../client/designs/tu-tien-son-ha/src/loi/core';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function phong() {
  const r = hat(3);
  const the = taoThe(0, NHIP_LIVE);
  for (const [u, phe] of [['a', 'son'], ['b', 'son'], ['c', 'thuy'], ['d', 'thuy']] as const)
    nhapMonThang(the, { kind: 'comment', user: u, ten: u.toUpperCase(), text: 'x' }, phe, 'nam', 10, r);
  return { the, r };
}

describe('Nhảy tới rồi giữ màn: màn không tự chuyển', () => {
  it('giữ tu luyện một tông: 20 phút sau vẫn tu luyện, vẫn đúng tông đó', () => {
    const { the, r } = phong();
    nhayTuLuyen(the, 1_000, r, 'thuy');
    giuMan(the);
    for (let t = 1_250; t < 20 * 60_000; t += 250) {
      buoc(the, t, r);
      expect(['cho', 'hoi', 'dap', 'kiep', 'kiep-ket']).toContain(the.pha.k);
    }
    expect(pheTuLuyen(the, 20 * 60_000).phe).toBe('thuy');
  });

  it('giữ mê cung một tông: hết giờ thì chạy lại, không sang màn khác', () => {
    const { the, r } = phong();
    nhayMe(the, 'son', 2, 1_000, r);
    giuMan(the);
    for (let t = 1_250; t < 15 * 60_000; t += 250) buoc(the, t, r);
    expect(['me', 'me-ket']).toContain(the.pha.k);
  });

  it('giữ tỉ thí: hết trận thì mở trận kế; bấm chạy tiếp thì thôi giữ', () => {
    const { the, r } = phong();
    nhayTiThi(the, 1_000, r, 'son');
    giuMan(the, true);
    let tran = 0;
    let truoc: unknown = null;
    for (let t = 1_250; t < 10 * 60_000; t += 250) {
      buoc(the, t, r);
      const x = the.loiDai?.tran ?? null;
      if (x !== null && x !== truoc) tran++;
      truoc = x;
    }
    expect(tran).toBeGreaterThan(1);
    expect(pheTuLuyen(the, 10 * 60_000).phe).toBe('son');
    thaGiu(the, 10 * 60_000, r);
    expect(the.giu).toBe(false);
    expect(the.ldGiu).toBe(false);
  });
});
