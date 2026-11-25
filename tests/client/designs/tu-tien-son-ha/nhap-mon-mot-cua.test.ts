import { describe, expect, it } from 'vitest';
import { buoc, kieuMe, ME_LOAI, nhanTin, nhapMonThang, nhayMe, nhayNm, nhayTt, NHIP_LIVE, KH_LK, QUA_ME_GIO, QUA_ME_XU, taoThe, type The } from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import { buocToi, ke } from '../../../../client/designs/tu-tien-son-ha/src/loi/me-cung';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const go = (the: The, u: string, text: string, now: number, r: () => number) =>
  nhanTin(the, { kind: 'comment', user: u, ten: u.toUpperCase(), text }, now, r);

describe('Thử Thách Nhập Môn một cửa (mỗi tông live một nick)', () => {
  it('nhảy tới Nhập Môn Thủy Tông: một cửa giữa mép trên; gõ 1 / 2 chọn giới, ai vào cũng thuộc Thủy Tông', () => {
    const r = hat(5);
    const the = taoThe(0, NHIP_LIVE);
    nhayNm(the, 'thuy', 1_000, r);
    const p = the.pha;
    if (p.k !== 'nm') throw new Error('chưa mở ải');
    expect(p.phe).toBe('thuy');
    expect(p.cua.son).toBe(p.cua.thuy);
    expect(p.cua.son).toBe(Math.floor(p.me.cot / 2));
    go(the, 'a', '1', 1_100, r);
    go(the, 'b', '2', 1_200, r);
    go(the, 'c', 'nam s', 1_300, r);
    expect(p.vt.get('a')).toMatchObject({ phe: 'thuy', gioi: 'nam' });
    expect(p.vt.get('b')).toMatchObject({ phe: 'thuy', gioi: 'nu' });
    expect(p.vt.get('c')).toMatchObject({ phe: 'thuy', gioi: 'nam' });
  });

  it('tới cửa là nhập Thủy Tông', () => {
    const r = hat(9);
    const the = taoThe(0, NHIP_LIVE);
    nhayNm(the, 'thuy', 1_000, r);
    const p = the.pha;
    if (p.k !== 'nm') throw new Error('chưa mở ải');
    go(the, 'a', '1', 1_100, r);
    const v = p.vt.get('a')!;
    let x = p.moLuc + 10;
    for (let i = 0; i < 80 && !v.qua; i++) {
      const toi = buocToi(p.me, v.o, new Set([p.cua.thuy]), () => 0)!;
      const h = (['len', 'xuong', 'trai', 'phai'] as const).find((d) => ke(p.me, v.o, d) === toi)!;
      go(the, 'a', { len: 'lên', xuong: 'xuống', trai: 'trái', phai: 'phải' }[h], (x += 400), r);
      buoc(the, (x += 400), r);
    }
    expect(v.qua).toBe(true);
    expect(the.nguoi.get('a')!.phe).toBe('thuy');
  });

  it('ải không ghi tông cũng là ải một cửa của tông đang tu luyện (ải hai cửa đã bỏ)', () => {
    const r = hat(2);
    const the = taoThe(0, { ...NHIP_LIVE, luDau: 1e12, yeuDau: 1e12, mua: 1e12, meDau: 1e12, nmDau: 5_000 });
    nhanTin(the, { kind: 'comment', user: 'k', ten: 'K', text: 'xin chào' }, 100, r);
    let t = 100;
    while (the.pha.k !== 'nm' && t < 120_000) buoc(the, (t += 250), r);
    const p = the.pha;
    if (p.k !== 'nm') throw new Error('ải không mở');
    expect(p.phe).not.toBeNull();
    expect(p.cua.son).toBe(p.cua.thuy);
  });
  it('quà trong mê cung: đủ 10 xu rơi thêm một cặp vật phẩm; lẻ thì tích lại', () => {
    const r = hat(4);
    const the = taoThe(0, NHIP_LIVE);
    nhayNm(the, 'son', 1_000, r);
    const p = the.pha;
    if (p.k !== 'nm') throw new Error('chưa mở ải');
    const t = p.moLuc + 100;
    const truoc = p.do.length;
    nhanTin(the, { kind: 'gift', user: 'k', ten: 'K', text: 'Rose', xu: 4, count: 1 }, t, r);
    expect(p.do.length).toBe(truoc);
    expect(p.quaTich).toBe(4);
    nhanTin(the, { kind: 'gift', user: 'k', ten: 'K', text: 'Rose', xu: QUA_ME_XU, count: 1 }, t + 100, r);
    expect(p.do.length).toBe(truoc + 2);
    expect(p.quaTich).toBe(4);
  });
  it('Tranh Đoạt riêng một tông: chỉ đệ tử tông đó xuống, một lối vào; mỗi tông bộ mê cung riêng, mỗi mê cung một nền', () => {
    const r = hat(6);
    const the = taoThe(0, NHIP_LIVE);
    nhapMonThang(the, { kind: 'comment', user: 's', ten: 'S', text: 'x' }, 'son', 'nam', 500, r);
    nhapMonThang(the, { kind: 'comment', user: 't', ten: 'T', text: 'x' }, 'thuy', 'nam', 500, r);
    const nen = new Set<string>();
    for (const phe of ['son', 'thuy'] as const) {
      for (let k = 1; k <= ME_LOAI[phe].length; k++) {
        nhayMe(the, phe, k, 1_000, r);
        const p = the.pha;
        if (p.k !== 'me') throw new Error('chưa mở mê cung');
        expect(p.loai).toBe(k);
        expect(p.phe).toBe(phe);
        expect(p.me.cot).toBe(kieuMe(phe, k).cot);
        expect(p.vao.son).toBe(p.vao.thuy);
        expect(p.vt.has(phe === 'son' ? 's' : 't')).toBe(true);
        expect(p.vt.has(phe === 'son' ? 't' : 's')).toBe(false);
        nen.add(kieuMe(phe, k).nen);
      }
    }
    expect(nen.size).toBe(ME_LOAI.son.length + ME_LOAI.thuy.length);
  });

  it('quà trong mê cung làm rơi đồ và kéo dài thời gian màn', () => {
    const r = hat(8);
    const the = taoThe(0, NHIP_LIVE);
    nhapMonThang(the, { kind: 'comment', user: 's', ten: 'S', text: 'x' }, 'son', 'nam', 500, r);
    nhayMe(the, 'son', 2, 1_000, r);
    const p = the.pha;
    if (p.k !== 'me') throw new Error('chưa mở mê cung');
    const den = p.den;
    nhanTin(the, { kind: 'gift', user: 'k', ten: 'K', text: 'Rosa', xu: QUA_ME_XU, count: 1 }, 2_000, r);
    expect(p.den).toBe(den + QUA_ME_GIO);
  });
  it('Đan Các · Tàng Kinh Các riêng một tông: chỉ đệ tử tông đó mua được', () => {
    const r = hat(10);
    const the = taoThe(0, NHIP_LIVE);
    nhapMonThang(the, { kind: 'comment', user: 's', ten: 'S', text: 'x' }, 'son', 'nam', 500, r);
    nhapMonThang(the, { kind: 'comment', user: 't', ten: 'T', text: 'x' }, 'thuy', 'nam', 500, r);
    the.nguoi.get('s')!.tinChi = 500;
    the.nguoi.get('t')!.tinChi = 500;
    nhayTt(the, 'son', 1_000);
    const p = the.pha;
    if (p.k !== 'tt') throw new Error('chưa mở chợ');
    expect(p.phe).toBe('son');
    go(the, 's', 'C1', 1_100, r);
    go(the, 't', 'C1', 1_200, r);
    expect(the.nguoi.get('s')!.tinChi).toBeLessThan(500);
    expect(the.nguoi.get('t')!.tinChi).toBe(500);
  });
  it('tu luyện không còn câu đố; câu đố chạy trong Đan Các · Tàng Kinh Các (Khảo hạch Tàng Kinh)', () => {
    const r = hat(12);
    const the = taoThe(0, NHIP_LIVE);
    nhapMonThang(the, { kind: 'comment', user: 's', ten: 'S', text: 'x' }, 'son', 'nam', 500, r);
    for (let t = 1_000; t < 120_000; t += 500) {
      buoc(the, t, r);
      expect(the.pha.k).not.toBe('hoi');
    }
    nhayTt(the, 'son', 200_000);
    let t = 200_000;
    while (the.pha.k === 'tt' && the.pha.kh === null && t < 210_000) buoc(the, (t += 500), r);
    const p = the.pha;
    if (p.k !== 'tt' || p.kh === null) throw new Error('chưa có câu khảo hạch');
    const n = the.nguoi.get('s')!;
    const lk = n.lk;
    go(the, 's', 'ABC'[p.kh.cau.dung]!, t + 100, r);
    while (p.kh!.hoi && t < 240_000) buoc(the, (t += 500), r);
    expect(n.lk - lk).toBeGreaterThanOrEqual(KH_LK);
  });
});
