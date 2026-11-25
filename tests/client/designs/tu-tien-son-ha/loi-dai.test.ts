import { describe, expect, it } from 'vitest';
import {
  buoc,
  giuMan,
  napHoSo,
  nhanTin,
  nhapMonThang,
  nhayTiThi,
  NHIP_LIVE,
  taoThe,
  xuatHoSo,
  type The,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import {
  bangTop,
  hangCua,
  LD_MAU,
  LD_NGHI,
  LD_NO_DAY,
  LD_THANG,
  LD_TRAN_LAU,
  QUA_THACH,
  SI_KHI_MOC,
  tiThiMo,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/loi-dai';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const t0 = 1_000_000_000_000;

/** Phòng một tông: `canh[i]` là cảnh giới người thứ i (tên a, b, c…). Hạng sẵn: cảnh giới cao đứng trên. */
function phong(canh: number[], phe: 'son' | 'thuy' = 'son'): { the: The; r: () => number; ds: string[] } {
  const r = hat(3);
  const the = taoThe(t0, NHIP_LIVE);
  const ds = canh.map((_, i) => String.fromCharCode(97 + i));
  ds.forEach((u, i) => {
    nhapMonThang(the, { kind: 'comment', user: u, ten: u.toUpperCase(), text: 'x' }, phe, 'nam', t0, r);
    the.nguoi.get(u)!.canh = canh[i]!;
  });
  buoc(the, t0, r);
  expect(['cho', 'hoi', 'dap']).toContain(the.pha.k);
  // Các test cơ chế trận chạy trong giờ Lôi Đài (ngoài giờ, quà khiêu chiến chỉ xếp hàng — xem test riêng bên dưới).
  the.ldGio = { den: t0 + 10 * 3_600_000 };
  return { the, r, ds };
}

const go = (the: The, u: string, text: string, now: number, r: () => number) =>
  nhanTin(the, { kind: 'comment', user: u, ten: u.toUpperCase(), text }, now, r);
const qua = (the: The, u: string, hang: number, now: number, r: () => number) => {
  const q = QUA_THACH[hang - 1]!;
  return nhanTin(the, { kind: 'gift', user: u, ten: u.toUpperCase(), text: q.ten, xu: q.xu, count: 1 }, now, r);
};

/** Chạy đồng hồ tới khi có trận rồi trận đó xong. */
function chayTran(the: The, r: () => number, tu: number): number {
  let t = tu;
  while (the.loiDai?.tran == null && t < tu + 10_000) buoc(the, (t += 500), r);
  while (the.loiDai?.tran != null && t < tu + LD_TRAN_LAU + 20_000) buoc(the, (t += 500), r);
  return t;
}

describe('Lôi Đài Đồng Môn — Top và khiêu chiến bằng quà', () => {
  it('bảng Top xếp theo cảnh giới, rồi điểm Lôi Đài', () => {
    const { the } = phong([1, 3, 2]);
    expect(bangTop(the, 'son').map((n) => n.user)).toEqual(['b', 'c', 'a']);
    the.ldDiem.set('a', 5);
    the.nguoi.get('a')!.canh = 2;
    expect(bangTop(the, 'son').map((n) => n.user)).toEqual(['b', 'a', 'c']);
  });

  it('gõ 8 hiện bảng Top; không làm việc tu luyện nào', () => {
    const { the, r } = phong([1, 1]);
    const n = the.nguoi.get('a')!;
    const lk = n.lk;
    go(the, 'a', '8', t0 + 1_000, r);
    expect(the.ldXem?.phe).toBe('son');
    expect(n.lk).toBe(lk);
  });

  it('tặng quà của hạng 1: khiêu chiến đúng người hạng 1, lên đài khi tới lượt', () => {
    const { the, r } = phong([2, 1, 1]);
    qua(the, 'c', 1, t0 + 1_000, r);
    expect(the.ldHang).toEqual([expect.objectContaining({ user: 'c', dich: 'a' })]);
    buoc(the, t0 + 1_500, r);
    expect(the.loiDai?.tran?.a.user).toBe('a');
    expect(the.loiDai?.tran?.b.user).toBe('c');
  });

  it('không khiêu chiến được người đứng dưới mình hay chính mình', () => {
    const { the, r } = phong([3, 2, 1]);
    qua(the, 'a', 2, t0 + 1_000, r);
    qua(the, 'b', 2, t0 + 1_000, r);
    qua(the, 'b', 3, t0 + 1_000, r);
    expect(the.ldHang).toEqual([]);
  });

  it('nhiều người khiêu chiến thì xếp hàng, đấu lần lượt', () => {
    const { the, r } = phong([3, 1, 1, 1]);
    qua(the, 'b', 1, t0 + 1_000, r);
    qua(the, 'c', 1, t0 + 1_000, r);
    qua(the, 'd', 1, t0 + 1_000, r);
    expect(the.ldHang.map((k) => k.user)).toEqual(['b', 'c', 'd']);
    let t = chayTran(the, r, t0 + 1_000);
    expect(the.ldHang.map((k) => k.user)).toEqual(['c', 'd']);
    t = chayTran(the, r, t + LD_NGHI);
    expect(the.ldHang.map((k) => k.user)).toEqual(['d']);
  });

  it('cùng cảnh giới mà người khiêu chiến thắng thì lên hạng; thắng được thưởng', () => {
    const { the, r } = phong([2, 2]);
    // a đứng trên b (lực chiến bằng, tên a trước). Cho b mạnh hẳn để chắc thắng.
    const b = the.nguoi.get('b')!;
    b.vo = 5;
    the.ldDiem.set('a', 3);
    expect(hangCua(the, 'a')).toBe(1);
    const tc = b.tinChi;
    qua(the, 'b', 1, t0 + 1_000, r);
    chayTran(the, r, t0 + 1_000);
    expect(the.loiDai?.ket?.thang).toBe('b');
    expect(hangCua(the, 'b')).toBe(1);
    expect(the.loiDai?.ket?.lenHang).toBe(1);
    // Quà khiêu chiến (100 xu) cũng cho linh thạch như mọi quà; trừ phần đó ra là thưởng thắng.
    expect(b.tinChi - tc - QUA_THACH[0]!.xu).toBe(LD_THANG.thach);
  });

  it('đột phá cảnh giới là tự lên hạng', () => {
    const { the } = phong([2, 1]);
    expect(hangCua(the, 'b')).toBe(2);
    the.nguoi.get('b')!.canh = 3;
    expect(hangCua(the, 'b')).toBe(1);
  });

  it('người bị khiêu chiến không online: nhân vật tự đấu (tự tung chiêu)', () => {
    const { the, r } = phong([2, 1]);
    the.nguoi.get('a')!.lanCuoi = t0 - 60 * 60_000;
    qua(the, 'b', 1, t0 + 1_000, r);
    buoc(the, t0 + 1_500, r);
    const tran = the.loiDai!.tran!;
    expect(tran.a.tuDong).toBe(true);
    expect(tran.b.tuDong).toBe(false);
    tran.a.no = LD_NO_DAY;
    buoc(the, t0 + 3_000, r);
    expect(tran.a.no).toBeLessThan(LD_NO_DAY);
  });

  it('đấu thủ gõ 1 là đòn chứ không phải vận công; người ngoài gõ 1 vẫn vận công', () => {
    const { the, r } = phong([2, 1, 1]);
    qua(the, 'b', 1, t0 + 1_000, r);
    buoc(the, t0 + 1_100, r);
    const tran = the.loiDai!.tran!;
    const a = the.nguoi.get('a')!;
    const lkA = a.lk;
    const mauB = tran.b.mau;
    go(the, 'a', '1', t0 + 1_200, r);
    expect(a.lk).toBe(lkA);
    expect(tran.b.mau).toBeLessThan(mauB);
    const c = the.nguoi.get('c')!;
    const lkC = c.lk;
    go(the, 'c', '1', t0 + 1_300, r);
    expect(c.lk).toBeGreaterThan(lkC);
  });

  it('tim của đấu thủ hồi máu tối đa 20%; quà 10 xu của đấu thủ hồi 30%', () => {
    const { the, r } = phong([2, 1]);
    qua(the, 'b', 1, t0 + 1_000, r);
    buoc(the, t0 + 1_100, r);
    const tran = the.loiDai!.tran!;
    tran.b.mau = 100;
    nhanTin(the, { kind: 'like', user: 'b', ten: 'B', count: 50 }, t0 + 1_200, r);
    expect(tran.b.mau).toBe(100 + 0.2 * LD_MAU);
    nhanTin(the, { kind: 'gift', user: 'b', ten: 'B', xu: 10, text: 'Hoa lạ' }, t0 + 1_300, r);
    expect(tran.b.mau).toBe(100 + 0.5 * LD_MAU);
  });

  it('điểm Lôi Đài được lưu sổ', () => {
    const { the } = phong([1, 1]);
    the.ldDiem.set('a', 7);
    const so = xuatHoSo(the);
    const moi = taoThe(t0, NHIP_LIVE);
    napHoSo(moi, so);
    expect(moi.ldDiem.get('a')).toBe(7);
  });

  it('Nhảy tới tỉ thí: hạng 2 khiêu chiến hạng 1 ngay; một người thì đấu trưởng lão', () => {
    const { the, r } = phong([1, 3, 2]);
    nhayTiThi(the, t0 + 1_000, r);
    expect(the.loiDai?.tran?.a.user).toBe('b');
    expect(the.loiDai?.tran?.b.user).toBe('c');
    const p2 = phong([1]);
    nhayTiThi(p2.the, t0 + 1_000, p2.r);
    expect(p2.the.loiDai?.tran?.a.npc).toBe(true);
  });

  it('đang tỉ thí thì không đổi lượt tông', () => {
    const { the, r } = phong([2, 1]);
    nhapMonThang(the, { kind: 'comment', user: 'x', ten: 'X', text: 'x' }, 'thuy', 'nam', t0, r);
    nhayTiThi(the, t0 + 1_000, r);
    the.pheDoiLuc = t0 + 1_500;
    buoc(the, t0 + 2_000, r);
    expect(the.pheHien).toBe('son');
    expect(the.loiDai?.tran).not.toBeNull();
  });

  it('khiêu chiến của tông đang không tới lượt thì chờ tới lượt tông đó', () => {
    const { the, r } = phong([2, 1], 'thuy');
    nhapMonThang(the, { kind: 'comment', user: 's', ten: 'S', text: 'x' }, 'son', 'nam', t0, r);
    the.pheHien = 'son';
    the.pheDoiLuc = t0 + 10 * 60_000;
    qua(the, 'b', 1, t0 + 1_000, r);
    buoc(the, t0 + 1_500, r);
    // Giờ Lôi Đài mà Sơn Tông đang tới lượt: đài thuộc Sơn (đấu giao hữu), lời khiêu chiến của Thủy vẫn chờ.
    expect(the.loiDai?.phe ?? 'son').toBe('son');
    expect(the.ldHang).toHaveLength(1);
    the.pheHien = 'thuy';
    buoc(the, t0 + 2_000, r);
    buoc(the, t0 + 2_500, r);
    expect(the.loiDai?.tran?.b.user).toBe('b');
  });
  it('khán giả tặng quà (không phải quà khiêu chiến) lúc đang đấu: cộng sĩ khí một đấu thủ; chạm mốc thì ra hành động', () => {
    const { the, r } = phong([2, 1, 1]);
    qua(the, 'b', 1, t0 + 1_000, r);
    buoc(the, t0 + 1_100, r);
    const tran = the.loiDai!.tran!;
    const ra = nhanTin(the, { kind: 'gift', user: 'c', ten: 'C', text: 'Món lạ', xu: 25, count: 1 }, t0 + 1_200, r);
    const tong = tran.a.siKhi + tran.b.siKhi;
    expect(tong).toBe(25);
    const moc = ra.filter((s) => s.k === 'ld-si-khi').map((s) => (s.k === 'ld-si-khi' ? s.ten : ''));
    expect(moc).toEqual(SI_KHI_MOC.filter((m) => m.moc <= 25).map((m) => m.ten));
  });
});

describe('Lôi Đài tách riêng trong lịch (giờ Lôi Đài)', () => {
  it('ngoài giờ Lôi Đài: quà khiêu chiến chỉ xếp hàng, màn vẫn là tu luyện', () => {
    const { the, r } = phong([3, 1]);
    the.ldGio = null;
    qua(the, 'b', 1, t0 + 1_000, r);
    expect(the.ldHang).toHaveLength(1);
    expect(the.hdMoi?.chu).toContain('đấu giờ Lôi Đài');
    for (let t = t0 + 1_000; t < t0 + 30_000; t += 500) buoc(the, t, r);
    expect(the.loiDai?.tran ?? null).toBeNull();
    expect(tiThiMo(the)).toBe(false);
  });

  it('tới giờ Lôi Đài trong lịch: lời khiêu chiến đã xếp hàng lên đài; hết hàng thì đồng môn đấu giao hữu, màn không nháy về tu luyện', () => {
    const { the, r } = phong([3, 2, 1]);
    the.ldGio = null;
    qua(the, 'c', 1, t0 + 1_000, r);
    the.ldGio = { den: t0 + 5 * 60_000 };
    let t = t0 + 2_000;
    while (the.loiDai?.tran == null && t < t0 + 10_000) buoc(the, (t += 500), r);
    expect(the.loiDai?.tran?.b.user).toBe('c');
    expect(the.loiDai?.tran?.a.user).toBe('a');
    expect(the.ldHang).toHaveLength(0);
    while (the.loiDai?.tran != null && t < t0 + 120_000) buoc(the, (t += 500), r);
    // Nghỉ giữa hai trận: vẫn là màn Tỉ Thí.
    expect(tiThiMo(the)).toBe(true);
    while (the.loiDai?.tran == null && t < t0 + 140_000) buoc(the, (t += 500), r);
    expect(the.loiDai?.tran).not.toBeNull();
  });

  it('hết giờ Lôi Đài: trận đang đấu đánh nốt, không mở trận mới, về tu luyện', () => {
    const { the, r } = phong([2, 1]);
    the.ldGio = { den: t0 + 60_000 };
    let t = t0;
    for (; t < t0 + 6 * 60_000; t += 500) buoc(the, t, r);
    expect(the.ldGio).toBeNull();
    expect(the.loiDai?.tran ?? null).toBeNull();
    expect(tiThiMo(the)).toBe(false);
  });

  it('đang giữ màn (⏸) trong giờ Lôi Đài: giờ Lôi Đài không tự hết, màn Tỉ Thí ở lại tới khi bấm ▶', () => {
    const { the, r } = phong([2, 1]);
    the.ldGio = { den: t0 + 60_000 };
    giuMan(the);
    let t = t0;
    for (; t < t0 + 5 * 60_000; t += 500) buoc(the, t, r);
    expect(tiThiMo(the)).toBe(true);
    while (the.loiDai?.tran == null && t < t0 + 6 * 60_000) buoc(the, (t += 500), r);
    expect(the.loiDai?.tran).not.toBeNull();
  });

  it('đang giữ màn tu luyện: trong giờ Lôi Đài cũng không tự mở trận', () => {
    const { the, r } = phong([2, 1]);
    the.ldGio = null;
    giuMan(the);
    the.ldGio = { den: t0 + 5 * 60_000 };
    the.ldGiu = false;
    for (let t = t0; t < t0 + 60_000; t += 500) buoc(the, t, r);
    expect(the.loiDai?.tran ?? null).toBeNull();
  });
});
