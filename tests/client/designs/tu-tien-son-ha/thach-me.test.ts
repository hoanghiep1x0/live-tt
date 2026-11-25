import { describe, expect, it } from 'vitest';
import {
  buoc,
  nhanTin,
  nhapMonThang,
  NHIP_LIVE,
  taoThe,
  THACH_ME,
  THACH_NM,
  type Nhip,
  type Su,
  type The,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import { buocToi, ke, oGuong, type Huong } from '../../../../client/designs/tu-tien-son-ha/src/loi/me-cung';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const chiMe: Nhip = { ...NHIP_LIVE, nmDau: 1e12, luDau: 1e9, yeuDau: 1e9, mua: 1e9, meDau: 5_000 };
const chiNm: Nhip = { ...NHIP_LIVE, nmDau: 2_000, luDau: 1e9, yeuDau: 1e9, mua: 1e9, meDau: 1e9 };
const HUONG: Record<Huong, string> = { len: 'lên', xuong: 'xuống', trai: 'trái', phai: 'phải' };

function toi(the: The, k: 'me' | 'nm', r: () => number): number {
  let t = 0;
  while (the.pha.k !== k) {
    t += 250;
    buoc(the, t, r);
    if (t > 200_000) throw new Error(`không mở ${k}`);
  }
  return t;
}

describe('Linh thạch rơi trong Tranh Đoạt Bảo Vật', () => {
  it('rơi từng cặp soi gương, không quá số tối đa, không đè món khác', () => {
    const r = hat(5);
    const the = taoThe(0, chiMe);
    nhapMonThang(the, { kind: 'comment', user: 'a', ten: 'A', text: 'núi' }, 'son', 'nam', 10, r);
    let t = toi(the, 'me', r);
    const p = the.pha;
    if (p.k !== 'me') throw new Error('chưa vào');
    for (const den = t + THACH_ME.dau + THACH_ME.cach * 8; t < den; t += 250) buoc(the, t, r);
    const th = p.do.filter((d) => d.loai === 'thach');
    expect(th.length).toBeGreaterThanOrEqual(2);
    expect(th.length).toBeLessThanOrEqual(THACH_ME.toiDa);
    expect(th.length % 2).toBe(0);
    for (const d of th) {
      if (d.loai !== 'thach') continue;
      expect(d.so).toBeGreaterThanOrEqual(THACH_ME.tu);
      expect(d.so).toBeLessThanOrEqual(THACH_ME.den);
      expect(th.some((x) => x.o === oGuong(p.me, d.o) && x.loai === 'thach' && x.so === d.so)).toBe(true);
    }
    expect(new Set(p.do.map((d) => d.o)).size).toBe(p.do.length);
  });

  it('bước vào ô có túi là nhặt: linh thạch cộng ngay, túi biến mất', () => {
    const r = hat(9);
    const the = taoThe(0, chiMe);
    nhapMonThang(the, { kind: 'comment', user: 'a', ten: 'A', text: 'núi' }, 'son', 'nam', 10, r);
    let t = toi(the, 'me', r);
    const p = the.pha;
    if (p.k !== 'me') throw new Error('chưa vào');
    while (!p.do.some((d) => d.loai === 'thach')) buoc(the, (t += 250), r);
    const n = the.nguoi.get('a')!;
    const truoc = n.tinChi;
    const su: Su[] = [];
    for (let i = 0; i < 400 && !su.some((s) => s.k === 'nhat-thach'); i++) {
      const v = p.vt.get('a')!;
      const dich = p.do.filter((d) => d.loai === 'thach').sort((x, y) => x.id - y.id)[0];
      if (dich === undefined || v.thoat) break;
      const ke1 = buocToi(p.me, v.o, new Set([dich.o]), r);
      const h = (Object.keys(HUONG) as Huong[]).find((x) => ke(p.me, v.o, x) === ke1);
      if (ke1 === null || h === undefined) break;
      t += 1_000;
      su.push(...nhanTin(the, { kind: 'comment', user: 'a', ten: 'A', text: HUONG[h] }, t, r));
      su.push(...buoc(the, t, r));
    }
    const s = su.find((x) => x.k === 'nhat-thach');
    expect(s).toBeDefined();
    if (s?.k !== 'nhat-thach') return;
    expect(n.tinChi).toBe(truoc + s.so);
    expect(p.do.some((d) => d.o === s.o)).toBe(false);
  });
});

describe('Linh thạch rơi trong Ải Nhập Môn', () => {
  it('rơi trên đường tới cửa, từng cặp, không quá số tối đa', () => {
    const r = hat(3);
    const the = taoThe(0, chiNm);
    nhanTin(the, { kind: 'comment', user: 'k', ten: 'K', text: 'xin chào' }, 10, r);
    let t = toi(the, 'nm', r);
    const p = the.pha;
    if (p.k !== 'nm') throw new Error('chưa vào');
    // Một khách bước vào ải (gõ 1) để ải không đóng sớm.
    nhanTin(the, { kind: 'comment', user: 'k', ten: 'K', text: '1' }, t + 500, r);
    for (; t < p.moLuc; t += 250) buoc(the, t, r);
    for (const den = t + THACH_NM.dau + THACH_NM.cach * 3; t < den && the.pha === p; t += 250) buoc(the, t, r);
    const th = p.do.filter((d) => d.loai === 'thach');
    if (th.length < 2) throw new Error(JSON.stringify({ k: the.pha.k, cung: the.pha === p, t, mo: p.moLuc, den: p.den, ke: p.thachKe, do: p.do.length, phe: p.phe }));
    expect(th.length).toBeLessThanOrEqual(THACH_NM.toiDa);
    expect(th.length % 2).toBe(0);
  });
});
