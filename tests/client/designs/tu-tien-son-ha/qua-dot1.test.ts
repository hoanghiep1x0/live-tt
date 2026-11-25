import { describe, expect, it } from 'vitest';
import {
  bacQua,
  buoc,
  nhanTin,
  nhapMonThang,
  NHIP_LIVE,
  taoThe,
  type The,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/core';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const t0 = 1_000_000_000_000;

function phong(soNguoi = 4): { the: The; r: () => number } {
  const r = hat(3);
  const the = taoThe(t0, NHIP_LIVE);
  for (let i = 0; i < soNguoi; i++) {
    nhapMonThang(the, { kind: 'comment', user: `u${i}`, ten: `U${i}`, text: 'x' }, i % 2 ? 'thuy' : 'son', 'nam', t0, r);
  }
  buoc(the, t0, r);
  return { the, r };
}
const qua = (the: The, user: string, ten: string, xu: number, now: number, r: () => number, count = 1) =>
  nhanTin(the, { kind: 'gift', user, ten: user.toUpperCase(), text: ten, count, xu }, now, r);

describe('Cơ chế quà đợt 1', () => {
  it('thang 5 bậc theo xu', () => {
    expect([1, 9, 10, 99, 100, 499, 500, 2999, 3000, 44999].map(bacQua)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('combo: cùng quà trong 8 giây thì cộng dồn, đổi quà thì đếm lại; biển quà ghi lại', () => {
    const { the, r } = phong();
    qua(the, 'u0', 'Rose', 1, t0 + 1_000, r);
    qua(the, 'u0', 'Rose', 3, t0 + 2_000, r, 3);
    expect(the.quaMoi.at(-1)?.combo).toBe(4);
    qua(the, 'u0', 'Rosa', 10, t0 + 3_000, r);
    expect(the.quaMoi.at(-1)?.combo).toBe(1);
    expect(the.quaMoi.at(-1)?.bac).toBe(2);
    qua(the, 'u0', 'Rosa', 10, t0 + 20_000, r);
    expect(the.quaMoi.at(-1)?.combo).toBe(1);
  });

  it('tu luyện: quà bậc 4 rải Mưa Linh Thạch cho cả phòng', () => {
    const { the, r } = phong(5);
    expect(['cho', 'hoi', 'dap']).toContain(the.pha.k);
    const truoc = [1, 2, 3, 4].map((i) => the.nguoi.get(`u${i}`)!.tinChi);
    const su = qua(the, 'u0', 'Money Gun', 500, t0 + 1_000, r);
    expect(su.some((s) => s.k === 'mua-thach')).toBe(true);
    [1, 2, 3, 4].forEach((i, j) => expect(the.nguoi.get(`u${i}`)!.tinChi).toBeGreaterThan(truoc[j]!));
    expect(the.quaMoi.at(-1)?.chu).toMatch(/Mưa Linh Thạch/);
  });

  it('Cung Phụng xếp theo tổng xu buổi', () => {
    const { the, r } = phong();
    qua(the, 'u1', 'Rose', 1, t0 + 1_000, r);
    qua(the, 'u2', 'Hand Heart', 100, t0 + 2_000, r);
    expect(the.nguoi.get('u2')!.huong).toBe(100);
    expect(the.nguoi.get('u1')!.huong).toBe(1);
  });
});
