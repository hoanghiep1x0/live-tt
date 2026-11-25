import { describe, expect, it } from 'vitest';
import {
  BAO_DAU,
  BAO_LAU,
  GIAP_HE,
  HUT_PHAN,
  MAU_YEU_NGUOI,
  bocYeu,
  buoc,
  nhanTin,
  NHIP_LIVE,
  taoThe,
  type Nhip,
  type The,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import { docLenh } from '../../../../client/designs/tu-tien-son-ha/src/loi/lenh';
import { nhapMonThang } from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import { THU_TU_YEU, YEU, type YeuId } from '../../../../client/designs/tu-tien-son-ha/src/loi/the-gioi';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const xa: Nhip = { ...NHIP_LIVE, nmDau: 1e12, luDau: 1e9, yeuDau: 0, mua: 1e9 };

function noi(the: The, user: string, text: string, now: number, rand: () => number) {
  const l = docLenh(text);
  if (l.k === 'phe' && (the.nguoi.get(user)?.phe ?? null) === null) {
    return nhapMonThang(the, { kind: 'comment', user, ten: user.toUpperCase(), text }, l.phe, l.gioi, now, rand);
  }
  return nhanTin(the, { kind: 'comment', user, ten: user.toUpperCase(), text }, now, rand);
}

/** Trận yêu tinh, ba đệ tử Sơn Tông đã gõ 5 ra tay; yêu tinh là `yeu` (đổi sau khi mở). */
function moTran(seed: number, yeu: YeuId = 'chan') {
  const r = hat(seed);
  const the = taoThe(0, xa);
  for (let i = 0; i < 3; i++) noi(the, `k${i}`, 'núi', 10, r);
  for (let t = 0; t <= 4000; t += 250) buoc(the, t, r);
  if (the.pha.k !== 'yeu') throw new Error('chưa vào trận yêu tinh');
  the.pha.yeu = yeu;
  for (let i = 0; i < 3; i++) noi(the, `k${i}`, '5', 4000, r);
  return { the, r, pha: the.pha };
}

/** Chạy nhịp tới khi yêu tinh báo chiêu lớn; trả lúc đó. */
function toiBao(the: The, tu: number, r: () => number) {
  let t = tu;
  while (the.pha.k === 'yeu' && the.pha.bao === null) {
    t += 250;
    buoc(the, t, r);
    if (t - tu > 60_000) throw new Error('không báo chiêu');
  }
  return t;
}

describe('Yêu tinh: bảy con bốc ngẫu nhiên', () => {
  it('đủ 7 con thường, mỗi con 3 chiêu lớn đủ loại số đỡ, không trùng con vừa đánh', () => {
    expect(THU_TU_YEU).toHaveLength(7);
    for (const id of THU_TU_YEU) expect(YEU[id].chieuLon).toHaveLength(3);
    const the = taoThe(0, xa);
    const r = hat(5);
    let cu: YeuId | null = null;
    const gap = new Set<YeuId>();
    for (let i = 0; i < 200; i++) {
      const y = bocYeu(the, r);
      expect(y).not.toBe(cu);
      cu = y;
      gap.add(y);
    }
    expect(gap.size).toBe(7);
  });
});

describe('Yêu tinh: gõ 5 đánh, chiêu lớn báo trước và gõ số đỡ', () => {
  it('gõ 5 là ra đòn như gõ "đánh"', () => {
    const { pha } = moTran(3);
    expect(pha.dmg.size).toBe(3);
    expect(pha.mau).toBeLessThan(pha.mauMax);
  });

  it('báo chiêu sau BAO_DAU, ra đòn sau BAO_LAU; không ai đỡ thì Quật Đuôi trúng cả đội', () => {
    const { the, r, pha } = moTran(7, 'chan');
    const t = toiBao(the, 4000, r);
    expect(t).toBeGreaterThanOrEqual(BAO_DAU);
    expect(pha.bao?.chieu.loai).toBe('quet');
    const ra = buoc(the, pha.bao!.den, r);
    const s = ra.find((x) => x.k === 'chieu-lon');
    expect(s?.k === 'chieu-lon' && s.trung.length).toBe(3);
    for (let i = 0; i < 3; i++) expect(pha.hp.get(`k${i}`)!).toBeLessThan(MAU_YEU_NGUOI);
  });

  it('gõ 2 kịp (đủ phiếu) thì cả phe đỡ trọn Quật Đuôi', () => {
    const { the, r, pha } = moTran(9, 'chan');
    const t = toiBao(the, 4000, r);
    const ra = noi(the, 'k1', '2', t + 500, r);
    expect(ra.some((x) => x.k === 'do-chieu' && x.phe === 'son')).toBe(true);
    const ra2 = buoc(the, t + BAO_LAU, r);
    const s = ra2.find((x) => x.k === 'chieu-lon');
    expect(s?.k === 'chieu-lon' && s.trung.length).toBe(0);
    expect(s?.k === 'chieu-lon' && s.doPhe).toEqual(['son']);
  });

  it('gõ sai số không đỡ được', () => {
    const { the, r, pha } = moTran(11, 'chan');
    const t = toiBao(the, 4000, r);
    const ra = noi(the, 'k1', '4', t + 500, r);
    expect(ra.some((x) => x.k === 'do-chieu')).toBe(false);
    expect(pha.bao?.do).toEqual([]);
  });

  it('giáp không phá thì yêu tinh khoác giáp (đòn còn GIAP_HE); gõ 4 phá thì lộ sơ hở', () => {
    // Hổ Tinh: Gầm (choáng) → Hổ Uy (giáp) → Uống Máu (hút).
    const a = moTran(13, 'cop');
    a.pha.soLon = 1;
    let t = toiBao(a.the, 4000, a.r);
    expect(a.pha.bao?.chieu.loai).toBe('giap');
    buoc(a.the, t + BAO_LAU, a.r);
    expect(a.pha.giapDen).toBeGreaterThan(t + BAO_LAU);
    expect(GIAP_HE).toBeLessThan(1);

    const b = moTran(13, 'cop');
    b.pha.soLon = 1;
    t = toiBao(b.the, 4000, b.r);
    noi(b.the, 'k0', '4', t + 300, b.r);
    buoc(b.the, t + BAO_LAU, b.r);
    expect(b.pha.giapDen).toBe(0);
    expect(b.pha.yeuVo).toBeGreaterThan(t + BAO_LAU);
  });

  it('hút máu không cắt thì yêu tinh hồi HUT_PHAN máu tối đa; gõ 1 cắt được thì không hồi', () => {
    const a = moTran(17, 'cop');
    a.pha.soLon = 2;
    a.pha.mau = Math.round(a.pha.mauMax / 2);
    let t = toiBao(a.the, 4000, a.r);
    expect(a.pha.bao?.chieu.loai).toBe('hut');
    let m0 = a.pha.mau;
    buoc(a.the, t + BAO_LAU, a.r);
    expect(a.pha.mau - m0).toBe(Math.round(a.pha.mauMax * HUT_PHAN));

    const b = moTran(17, 'cop');
    b.pha.soLon = 2;
    b.pha.mau = Math.round(b.pha.mauMax / 2);
    t = toiBao(b.the, 4000, b.r);
    noi(b.the, 'k2', '1', t + 300, b.r);
    m0 = b.pha.mau;
    buoc(b.the, t + BAO_LAU, b.r);
    expect(b.pha.mau).toBe(m0);
  });
});
