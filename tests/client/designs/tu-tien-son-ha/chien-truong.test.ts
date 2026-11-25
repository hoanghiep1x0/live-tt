import { describe, expect, it } from 'vitest';
import { buoc, heSoKich, KICH_DAY, KICH_TOI_DA, nhanTin, nhapMonThang, NHIP_LIVE, taoThe, type The } from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import { PHUT_CHOT, THAN_DON, VIEN_LAU, VIEN_XU, xuLatKeo } from '../../../../client/designs/tu-tien-son-ha/src/loi/chien-truong';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function tran() {
  const r = hat(5);
  const the = taoThe(0, { ...NHIP_LIVE, luDau: 0, yeuDau: 1e12, mua: 1e12, meDau: 1e12, nmDau: 1e12 });
  nhapMonThang(the, { kind: 'comment', user: 's', ten: 'S', text: 'x' }, 'son', 'nam', 10, r);
  nhapMonThang(the, { kind: 'comment', user: 't', ten: 'T', text: 'x' }, 'thuy', 'nam', 10, r);
  let t = 10;
  while (the.pha.k !== 'lu' && t < 120_000) buoc(the, (t += 250), r);
  const p = the.pha;
  if (p.k !== 'lu') throw new Error('chưa mở Đại Chiến');
  return { the, r, t, p };
}

const qua = (the: The, u: string, xu: number, now: number, r: () => number) =>
  nhanTin(the, { kind: 'gift', user: u, ten: u.toUpperCase(), text: 'Quà', xu, count: 1 }, now, r);

describe('Chiến trường Đại Chiến — quà quyết định', () => {
  it('cứ điểm: quà chiếm cứ điểm; bên kia tặng nhiều hơn thì cướp lại', () => {
    const { the, r, t, p } = tran();
    const ra = qua(the, 's', 2, t + 100, r);
    expect(ra.some((s) => s.k === 'cu-diem' && s.phe === 'son')).toBe(true);
    const i = p.ct!.cu.findIndex((c) => c.chu === 'son');
    expect(i).toBeGreaterThanOrEqual(0);
    // Thủy tặng lần lượt: hai cứ trống trước, rồi cướp cứ của Sơn khi vượt số xu.
    qua(the, 't', 1, t + 200, r);
    qua(the, 't', 1, t + 300, r);
    const ra3 = qua(the, 't', 5, t + 400, r);
    expect(p.ct!.cu.every((c) => c.chu === 'thuy')).toBe(true);
    expect(ra3.some((s) => s.k === 'cu-diem' && s.phe === 'thuy')).toBe(true);
  });

  it('giữ cứ điểm thì được cộng điểm đều theo giây', () => {
    const { the, r, t, p } = tran();
    qua(the, 's', 1, t + 100, r);
    const d0 = p.son;
    const thuy0 = p.thuy;
    for (let x = t + 500; x < t + 5_500; x += 250) buoc(the, x, r);
    expect(p.son - d0).toBeGreaterThan(1.5);
    expect(p.thuy - thuy0).toBeLessThan(p.son - d0 + 50);
  });

  it('viện binh: quà từ 10 xu gọi toán quân, từ 100 xu gọi tướng; sống 15 giây', () => {
    const { the, r, t, p } = tran();
    const a = qua(the, 's', VIEN_XU.quan, t + 100, r);
    const b = qua(the, 's', VIEN_XU.tuong, t + 200, r);
    expect(a.some((s) => s.k === 'vien-binh' && s.bac === 1)).toBe(true);
    expect(b.some((s) => s.k === 'vien-binh' && s.bac === 2)).toBe(true);
    expect(p.ct!.vien).toHaveLength(2);
    for (let x = t + 500; x < t + VIEN_LAU + 2_000; x += 500) buoc(the, x, r);
    expect(the.pha.k !== 'lu' || the.pha.ct!.vien.length === 0).toBe(true);
  });

  it('quà từ 500 xu: thần ra tay, cộng thẳng điểm', () => {
    const { the, r, t, p } = tran();
    const d0 = p.son;
    const ra = qua(the, 's', VIEN_XU.than, t + 100, r);
    expect(ra.some((s) => s.k === 'than-don')).toBe(true);
    expect(p.son - d0).toBeGreaterThanOrEqual(THAN_DON);
  });

  it('phút chót: điểm quà nhân đôi, và tính được số xu để lật kèo', () => {
    const a = tran();
    const b = tran();
    // Cùng một món quà: trận b đang ở phút chót.
    b.p.den = b.t + PHUT_CHOT - 1_000;
    const da = a.p.son;
    const db = b.p.son;
    qua(a.the, 's', 5, a.t + 100, a.r);
    qua(b.the, 's', 5, b.t + 100, b.r);
    expect(b.p.son - db).toBeGreaterThan((a.p.son - da) * 1.3);
    const lat = xuLatKeo({ den: 0, son: 10, thuy: 40 }, 0, 5);
    expect(lat?.phe).toBe('son');
    expect(lat!.xu).toBeGreaterThan(0);
  });
});

describe('Tán tu ở Đại Chiến — khích lệ sĩ khí', () => {
  it('tán tu tặng quà: sĩ khí tăng, hệ số thưởng hai tông tăng tới trần; không cộng điểm cho tông nào', () => {
    const { the, r, t, p } = tran();
    expect(heSoKich(p)).toBe(1);
    nhanTin(the, { kind: 'comment', user: 'k', ten: 'K', text: 'chào' }, t + 50, r);
    expect(the.nguoi.get('k')?.phe ?? null).toBeNull();
    const truoc = { son: p.son, thuy: p.thuy };
    const ra = qua(the, 'k', KICH_DAY / 2, t + 100, r);
    expect(p.kich?.xu).toBe(KICH_DAY / 2);
    expect(heSoKich(p)).toBeCloseTo(1 + KICH_TOI_DA / 2);
    expect(ra.some((s) => s.k === 'doc' && s.chu.includes('khích lệ sĩ khí'))).toBe(true);
    expect({ son: p.son, thuy: p.thuy }).toEqual(truoc);
    qua(the, 'k', KICH_DAY * 3, t + 200, r);
    expect(heSoKich(p)).toBeCloseTo(1 + KICH_TOI_DA);
  });

  it('hết trận: linh thạch thưởng của đệ tử tham chiến nhân hệ số sĩ khí', () => {
    const chay = (kich: boolean) => {
      const { the, r, t, p } = tran();
      qua(the, 's', 1, t + 100, r);
      qua(the, 't', 1, t + 100, r);
      if (kich) {
        nhanTin(the, { kind: 'comment', user: 'k', ten: 'K', text: 'chào' }, t + 50, r);
        qua(the, 'k', KICH_DAY, t + 150, r);
      }
      const s0 = the.nguoi.get('s')!.tinChi;
      let tt = t + 200;
      while (the.pha.k === 'lu' && tt < t + 3_600_000) buoc(the, (tt += 1000), r);
      void p;
      return the.nguoi.get('s')!.tinChi - s0;
    };
    const thuong = chay(false);
    const thuongKich = chay(true);
    expect(thuong).toBeGreaterThan(0);
    expect(thuongKich).toBeGreaterThan(thuong);
  });
});

describe('Đại Chiến không hết giờ — cạn trận khí là thua', () => {
  it('quà dồn tới khi tông kia cạn trận khí: trận kết ngay, tông đánh cạn khí thắng', () => {
    const { the, r, t, p } = tran();
    expect(p.den - p.tong + 10 * 60_000).toBeLessThan(p.den);
    let tt = t;
    for (let i = 0; i < 400 && the.pha.k === 'lu'; i++) {
      qua(the, 's', 500, (tt += 300), r);
      buoc(the, tt, r);
    }
    expect(the.pha.k).toBe('lu-ket');
    if (the.pha.k === 'lu-ket') expect(the.pha.thang).toBe('son');
    expect(tt - t).toBeLessThan(5 * 60_000);
  });

  it('phòng vắng: kiệt sức hao khí hai tông, trận vẫn kết trước ~8 phút', () => {
    const { the, r, t } = tran();
    let tt = t;
    while (the.pha.k === 'lu' && tt < t + 20 * 60_000) buoc(the, (tt += 1000), r);
    expect(the.pha.k).toBe('lu-ket');
    expect(tt - t).toBeLessThan(8 * 60_000);
  });
});
