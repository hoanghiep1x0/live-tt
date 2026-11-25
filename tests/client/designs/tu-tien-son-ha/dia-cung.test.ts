import { describe, expect, it } from 'vitest';
import {
  buoc,
  congThu,
  datLuotPhe,
  napHoSo,
  nhanTin,
  NHIP_LIVE,
  butPha,
  chonNhanDo,
  pheTuLuyen,
  taoThe,
  tongLuc,
  xuatHoSo,
  type Nhip,
  type Su,
  type The,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import { nhapMonThang } from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import { docLenh } from '../../../../client/designs/tu-tien-son-ha/src/loi/lenh';
import { buocToi, ke, khoang, lanCan, oGiua, oGuong, taoMe, taoMeDoiXung } from '../../../../client/designs/tu-tien-son-ha/src/loi/me-cung';
import {
  bocPham,
  chanDay,
  chiSo,
  lucDay,
  nenMac,
  taoDo,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/trang-bi';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Chỉ Địa Cung: mọi sự kiện khác đẩy thật xa. */
const chiMe: Nhip = { ...NHIP_LIVE, nmDau: 1e12, luDau: 1e9, yeuDau: 1e9, mua: 1e9, meDau: 5_000 };

function noi(the: The, user: string, text: string, now: number, r: () => number): Su[] {
  const l = docLenh(text);
  if (l.k === 'phe' && the.pha.k !== 'nm' && (the.nguoi.get(user)?.phe ?? null) === null) {
    return nhapMonThang(the, { kind: 'comment', user, ten: user.toUpperCase(), text }, l.phe, l.gioi, now, r);
  }
  return nhanTin(the, { kind: 'comment', user, ten: user.toUpperCase(), text }, now, r);
}

function toiMe(the: The, r: () => number, tu = 0): number {
  let t = tu;
  while (the.pha.k !== 'me') {
    t += 250;
    buoc(the, t, r);
    if (t - tu > 120_000) throw new Error('Địa Cung không mở');
  }
  return t;
}

describe('mê cung', () => {
  it('ô nào cũng đi tới được từ ô nào (không có góc bị bịt kín)', () => {
    for (const seed of [1, 2, 3, 7]) {
      const me = taoMe(11, 13, hat(seed));
      const da = new Set([0]);
      const hang = [0];
      for (let i = 0; i < hang.length; i++) for (const k of lanCan(me, hang[i]!)) if (!da.has(k)) (da.add(k), hang.push(k));
      expect(da.size).toBe(11 * 13);
    }
  });

  it('mê cung đối xứng cũng đi tới được mọi ô', () => {
    for (const seed of [1, 2, 3, 7, 11]) {
      const me = taoMeDoiXung(11, 13, hat(seed));
      const da = new Set([0]);
      const hang = [0];
      for (let i = 0; i < hang.length; i++) for (const k of lanCan(me, hang[i]!)) if (!da.has(k)) (da.add(k), hang.push(k));
      expect(da.size).toBe(11 * 13);
    }
  });

  it('tường hai phía khớp nhau: đi được A→B thì đi được B→A', () => {
    const me = taoMe(11, 13, hat(4));
    for (let o = 0; o < 11 * 13; o++) {
      for (const h of ['len', 'xuong', 'trai', 'phai'] as const) {
        const k = ke(me, o, h);
        if (k !== null) expect(lanCan(me, k)).toContain(o);
      }
    }
  });

  it('sảnh lõi 3×3 thông thoáng', () => {
    const me = taoMe(11, 13, hat(9));
    const g = oGiua(me);
    for (const h of ['len', 'xuong', 'trai', 'phai'] as const) expect(ke(me, g, h)).not.toBeNull();
  });

  it('tìm đường: mỗi bước tiến lại gần đích, rồi tới nơi', () => {
    const me = taoMe(11, 13, hat(5));
    const r = hat(6);
    let o = 0;
    const dich = new Set([11 * 13 - 1]);
    for (let i = 0; i < 400 && !dich.has(o); i++) o = buocToi(me, o, dich, r)!;
    expect(o).toBe(11 * 13 - 1);
  });
});

describe('trang bị và công thủ', () => {
  it('phẩm cao phải đủ cảnh giới mới mặc', () => {
    const r = hat(2);
    const thien = taoDo('vu', 4, r);
    expect(nenMac(3, {}, thien)).toBe(false);
    expect(nenMac(7, {}, thien)).toBe(true);
  });

  it('chỉ mặc món tốt hơn món đang mặc', () => {
    const tot = { o: 'ao' as const, pham: 2, cong: 0, thu: 30 };
    const kem = { o: 'ao' as const, pham: 1, cong: 0, thu: 14 };
    expect(nenMac(5, { ao: tot }, kem)).toBe(false);
    expect(nenMac(5, { ao: kem }, tot)).toBe(true);
  });

  it('lực chiến gốc: dưới Nguyên Anh tăng hàng chục, từ Nguyên Anh tăng hàng trăm', () => {
    const goc = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => chiSo(c, {}).cong + chiSo(c, {}).thu);
    expect(goc).toEqual([20, 50, 90, 140, 300, 500, 750, 1050, 1400, 1800]);
    for (let c = 1; c < 4; c++) expect(goc[c]! - goc[c - 1]!).toBeLessThan(100);
    for (let c = 4; c < 10; c++) expect(goc[c]! - goc[c - 1]!).toBeGreaterThanOrEqual(100);
  });

  it('gần lõi Địa Cung ra đồ quý nhiều hơn', () => {
    const dem = (gan: number) => {
      const r = hat(11);
      let quy = 0;
      for (let i = 0; i < 4000; i++) if (bocPham(r, gan) >= 3) quy++;
      return quy;
    };
    expect(dem(1)).toBeGreaterThan(dem(0) * 2);
  });

  it('công thủ tác động Đại Chiến có trần: một cao thủ không bằng cả phòng', () => {
    expect(lucDay(10)).toBeCloseTo(1.067, 2);
    expect(lucDay(10_000)).toBe(2.5);
    expect(chanDay(10_000)).toBe(0.2);
  });

  it('đồ đang mặc được ghi sổ và nạp lại', () => {
    const the = taoThe(0, chiMe);
    noi(the, 'lan', 'núi', 100, hat(1));
    the.nguoi.get('lan')!.lk = 10;
    the.nguoi.get('lan')!.tb = { vu: { o: 'vu', pham: 2, cong: 25, thu: 0 } };
    const so = xuatHoSo(the);
    const moi = taoThe(0, chiMe);
    napHoSo(moi, JSON.parse(JSON.stringify(so)));
    expect(moi.nguoi.get('lan')!.tb.vu).toMatchObject({ o: 'vu', pham: 2, cong: 25, thu: 0 });
    expect(congThu(moi.nguoi.get('lan')!).cong).toBe(12 + 25);
  });
});

describe('Địa Cung', () => {
  function san(seed: number, so = 6) {
    const r = hat(seed);
    const the = taoThe(0, chiMe);
    for (let i = 0; i < so; i++) noi(the, `k${i}`, i % 2 ? 'núi' : 'nước', 100 + i, r);
    const t = toiMe(the, r);
    const p = the.pha;
    if (p.k !== 'me') throw new Error();
    return { the, r, t, p };
  }

  /** Một bước hợp lệ (không đụng tường) từ ô của người này. */
  function huongDi(p: Extract<The['pha'], { k: 'me' }>, user: string) {
    const v = p.vt.get(user)!;
    return (['len', 'xuong', 'trai', 'phai'] as const).find((h) => ke(p.me, v.o, h) !== null)!;
  }
  const CHU = { len: 'lên', xuong: 'xuống', trai: 'trái', phai: 'phải' } as const;

  it('đệ tử đứng ở cửa vào của phe mình; phàm nhân không xuống được (phải vượt Ải Nhập Môn trước)', () => {
    const { the, r, t, p } = san(3);
    for (const [user, v] of p.vt) expect(v.o).toBe(p.vao[the.nguoi.get(user)!.phe!]);
    noi(the, 'khach', 'lên', t + 10, r);
    expect(p.vt.has('khach')).toBe(false);
    expect(the.nguoi.get('khach')!.phe).toBeNull();
  });

  it('bảo vật có hạn và không rơi đầy sân', () => {
    const { the, r, t, p } = san(4, 8);
    let cao = 0;
    for (let x = t; x < t + chiMe.me - 500; x += 250) {
      buoc(the, x, r);
      cao = Math.max(cao, p.do.filter((d) => d.loai === 'tb').length);
    }
    expect(cao).toBeLessThanOrEqual(4);
    expect(p.conRoi).toBeGreaterThanOrEqual(0);
  });

  it('mỗi lệnh là một bước; gõ dồn quá nhanh thì không tính; đụng tường thì đứng yên', () => {
    const { the, r, t, p } = san(5);
    const v = p.vt.get('k0')!;
    const o0 = v.o;
    const h = huongDi(p, 'k0');
    noi(the, 'k0', CHU[h], t + 1000, r);
    expect(v.o).toBe(ke(p.me, o0, h));
    const o1 = v.o;
    noi(the, 'k0', CHU[h], t + 1100, r); // chưa qua khoảng nghỉ
    expect(v.o).toBe(o1);
    const tuong = (['len', 'xuong', 'trai', 'phai'] as const).find((x) => ke(p.me, v.o, x) === null);
    if (tuong !== undefined) {
      noi(the, 'k0', CHU[tuong], t + 2000, r);
      expect(v.o).toBe(o1);
    }
  });

  it('nhặt đồ chỉ vào túi; ra tới Cửa Ra mới mặc, lực chiến tăng', () => {
    const { the, r, t, p } = san(6);
    const n = the.nguoi.get('k0')!;
    n.tb = {}; // bỏ đồ ban nhập môn để thấy rõ món nhặt
    const v = p.vt.get('k0')!;
    // Đặt đồ ngay ô kế bên, rồi đặt người cạnh Cửa Ra.
    const h = huongDi(p, 'k0');
    const ke1 = ke(p.me, v.o, h)!;
    p.do = [{ id: 99, o: ke1, loai: 'tb', vat: { o: 'vu', pham: 0, cong: 6, thu: 0 } }];
    noi(the, 'k0', CHU[h], t + 1000, r);
    expect(v.tui).toHaveLength(1);
    expect(n.tb.vu).toBeUndefined();
    const truoc = congThu(n).cong;
    const hRa = (['len', 'xuong', 'trai', 'phai'] as const).find((x) => ke(p.me, p.ra, x) !== null)!;
    const nguoc = { len: 'xuong', xuong: 'len', trai: 'phai', phai: 'trai' } as const;
    v.o = ke(p.me, p.ra, hRa)!;
    const ds = noi(the, 'k0', CHU[nguoc[hRa]], t + 2000, r);
    expect(v.thoat).toBe(true);
    expect(n.tb.vu).toBeDefined();
    expect(n.tb.vu!.cong).toBe(6);
    expect(congThu(n).cong).toBeGreaterThanOrEqual(truoc + 6);
    const s = ds.find((x) => x.k === 'thoat');
    expect(s && s.k === 'thoat' && s.thu).toBe(1);
  });

  it('hết giờ còn bên trong vẫn giữ đồ đã nhặt (chỉ không có thứ hạng)', () => {
    const { the, r, t, p } = san(7);
    const n = the.nguoi.get('k1')!;
    p.vt.get('k1')!.tui.push({ o: 'ao', pham: 1, cong: 0, thu: 14 });
    n.canh = 2;
    for (let x = t; x <= t + chiMe.me + 500; x += 250) buoc(the, x, r);
    expect(the.pha.k).toBe('me-ket');
    expect(n.tb.ao).toMatchObject({ o: 'ao', pham: 1, cong: 0, thu: 14 });
  });

  it('mê cung đối xứng gương: Cửa Núi và Cửa Nước cách Cửa Ra bằng nhau', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { p } = san(seed);
      expect(khoang(p.me, p.vao.son, p.ra)).toBe(khoang(p.me, p.vao.thuy, p.ra));
      for (let o = 0; o < p.me.cot * p.me.hang; o++) {
        expect(lanCan(p.me, oGuong(p.me, o)).sort()).toEqual(lanCan(p.me, o).map((k) => oGuong(p.me, k)).sort());
      }
    }
  });

  it('bảo vật rơi theo cặp soi gương, cùng phẩm cùng chỉ số', () => {
    const { the, r, t, p } = san(8, 8);
    for (let x = t; x < t + chiMe.me * 0.8; x += 250) buoc(the, x, r);
    const tb = p.do.filter((d) => d.loai === 'tb');
    expect(tb.length % 2).toBe(0);
    for (const d of tb) {
      const g = tb.find((x) => x.o === oGuong(p.me, d.o));
      expect(g).toBeDefined();
      if (d.loai === 'tb' && g?.loai === 'tb') expect(g.vat).toEqual(d.vat);
    }
  });
});

describe('PK Thiên Bình', () => {
  function sanLu(seed: number) {
    const r = hat(seed);
    const the = taoThe(0, { ...chiMe, meDau: 1e9, luDau: 3_000 });
    return { the, r };
  }
  function toiLu(the: The, r: () => number) {
    let t = 100;
    while (the.pha.k !== 'lu') buoc(the, (t += 250), r);
    return t;
  }

  it('phe toàn cao thủ và phe toàn người mới, cùng số người cùng nhịp gõ thì điểm bằng nhau', () => {
    const { the, r } = sanLu(8);
    for (let i = 0; i < 4; i++) {
      noi(the, `s${i}`, 'núi', 100, r);
      noi(the, `t${i}`, 'nước', 100, r);
      the.nguoi.get(`t${i}`)!.tb = {}; // người mới tinh, chưa cả đồ ban nhập môn
      const s = the.nguoi.get(`s${i}`)!;
      s.canh = 9;
      s.tb = { vu: { o: 'vu', pham: 4, cong: 64, thu: 0 } };
    }
    let t = toiLu(the, r);
    for (let k = 0; k < 10; k++, t += 1300) {
      for (let i = 0; i < 4; i++) {
        noi(the, `s${i}`, 'đẩy', t, r);
        noi(the, `t${i}`, 'đẩy', t, r);
      }
    }
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    expect(Math.abs(p.son - p.thuy) / (p.son + p.thuy)).toBeLessThan(0.05);
  });

  it('trong cùng phe, người lực chiến cao góp công trạng nhiều hơn', () => {
    const { the, r } = sanLu(9);
    noi(the, 'manh', 'núi', 100, r);
    noi(the, 'yeu', 'núi', 100, r);
    the.nguoi.get('manh')!.canh = 8;
    let t = toiLu(the, r);
    for (let k = 0; k < 5; k++, t += 1300) {
      noi(the, 'manh', 'đẩy', t, r);
      noi(the, 'yeu', 'đẩy', t, r);
    }
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    expect(p.cong.get('manh')!).toBeGreaterThan(p.cong.get('yeu')!);
  });

  it('tim và quà cộng điểm; quà một người giảm dần (không một mình định đoạt trận)', () => {
    const { the, r } = sanLu(10);
    noi(the, 'a', 'núi', 100, r);
    const t = toiLu(the, r);
    nhanTin(the, { kind: 'like', user: 'a', ten: 'A', count: 10 }, t + 10, r);
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    expect(p.son).toBeCloseTo(3, 1); // 10 tim × 0,3 (liên kích đầu cộng 0,5%)
    nhanTin(the, { kind: 'gift', user: 'a', ten: 'A', text: 'x', count: 1, xu: 100 }, t + 20, r);
    const sau100 = p.son;
    nhanTin(the, { kind: 'gift', user: 'a', ten: 'A', text: 'x', count: 1, xu: 100 }, t + 30, r);
    expect(p.son - sau100).toBeLessThan(sau100 - 3);
  });

  it('liên kích: cả phe ra đòn dồn dập thì đếm nối, qua mốc 20 thì báo', () => {
    const { the, r } = sanLu(13);
    for (let i = 0; i < 5; i++) noi(the, `s${i}`, 'núi', 100, r);
    let t = toiLu(the, r);
    const ds: Su[] = [];
    for (let k = 0; k < 5; k++, t += 1300) for (let i = 0; i < 5; i++) ds.push(...noi(the, `s${i}`, 'đẩy', t + i, r));
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    expect(p.combo.son.so).toBe(25);
    expect(ds.filter((s) => s.k === 'lien-kich')).toHaveLength(1);
  });

  it('quyết chiến: 10 giây cuối điểm ×1,5', () => {
    const { the, r } = sanLu(14);
    noi(the, 'a', 'núi', 100, r);
    const t = toiLu(the, r);
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    noi(the, 'a', 'đẩy', t + 10, r);
    const dau = p.son;
    noi(the, 'a', 'đẩy', p.den - 5_000, r);
    expect(p.son - dau).toBeCloseTo(dau * 1.5, 1);
  });

  it('đảo chiều: phe thua vượt lên thì báo', () => {
    const { the, r } = sanLu(15);
    noi(the, 'a', 'núi', 100, r);
    noi(the, 'b', 'nước', 100, r);
    const t = toiLu(the, r);
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    p.son = 30;
    p.thuy = 29.5;
    p.dan = 'son';
    const ds = nhanTin(the, { kind: 'like', user: 'b', ten: 'B', count: 5 }, t + 10, r);
    expect(ds.some((s) => s.k === 'dao-chieu' && s.phe === 'thuy')).toBe(true);
  });

  it('đấu tướng: hai người công trạng cao nhất giao chiến, ai góp nhiều hơn thì phe mình thêm 12', () => {
    const { the, r } = sanLu(16);
    for (const u of ['a', 'b']) noi(the, u, 'núi', 100, r);
    noi(the, 'c', 'nước', 100, r);
    for (const u of ['a', 'b', 'c']) the.nguoi.get(u)!.tb = {}; // bỏ đồ ban nhập môn: chỉ so công trạng
    let t = toiLu(the, r);
    noi(the, 'a', 'đẩy', t + 10, r);
    noi(the, 'b', 'đẩy', t + 10, r);
    noi(the, 'a', 'đẩy', t + 1300, r);
    noi(the, 'c', 'đẩy', t + 10, r);
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    const ds: Su[] = [];
    for (; t < p.den && p.dau === null; t += 250) ds.push(...buoc(the, t, r));
    const mo = ds.find((s) => s.k === 'dau-tuong');
    expect(mo && mo.k === 'dau-tuong' && mo.son).toBe('a');
    expect(mo && mo.k === 'dau-tuong' && mo.thuy).toBe('c');
    // a góp trong lúc đấu, c không.
    nhanTin(the, { kind: 'like', user: 'a', ten: 'A', count: 10 }, t + 100, r);
    const sonTruoc = p.son;
    const ket: Su[] = [];
    for (let x = t; x < t + 7_000; x += 250) ket.push(...buoc(the, x, r));
    const k = ket.find((s) => s.k === 'dau-tuong-ket');
    expect(k && k.k === 'dau-tuong-ket' && k.thang).toBe('son');
    expect(p.son).toBeGreaterThanOrEqual(sonTruoc + 12); // +12 thưởng, cộng thêm đòn thường tự động
  });

  it('quyết chiến được báo một lần, MC hô', () => {
    const { the, r } = sanLu(17);
    noi(the, 'a', 'núi', 100, r);
    const t = toiLu(the, r);
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    const ds: Su[] = [];
    for (let x = t; x < p.den; x += 250) ds.push(...buoc(the, x, r));
    expect(ds.filter((s) => s.k === 'quyet-chien')).toHaveLength(1);
    expect(ds.some((s) => s.k === 'doc' && s.chu.includes('quyết chiến'))).toBe(true);
  });

  it('phe thua xa được bứt phá', () => {
    const { the, r } = sanLu(11);
    noi(the, 'a', 'núi', 100, r);
    noi(the, 'b', 'nước', 100, r);
    toiLu(the, r);
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    p.son = 100;
    p.thuy = 40;
    expect(butPha(p, 'thuy')).toBeGreaterThan(1.2);
    expect(butPha(p, 'son')).toBe(1);
  });

  it('bình luận chỉ là tiếp sức: không tự ra tuyệt kỹ dù lực chiến cao', () => {
    const { the, r } = sanLu(12);
    for (const u of ['a', 'b', 'c']) noi(the, u, 'núi', 100, r);
    const a = the.nguoi.get('a')!;
    a.canh = 9;
    a.tb = { vu: { o: 'vu', pham: 4, cong: 70, thu: 0 } };
    const t = toiLu(the, r);
    const ds = [...noi(the, 'b', 'đẩy', t + 5, r), ...noi(the, 'a', 'đẩy', t + 10, r), ...noi(the, 'a', 'đẩy', t + 1300, r)];
    expect(ds.some((s) => s.k === 'tuyet-ky')).toBe(false);
  });
});

describe('Yêu tinh phản đòn', () => {
  it('đánh trúng người vừa ra tay: choáng thì không đánh được; thả tim thì hồi khí', () => {
    const r = hat(31);
    const the = taoThe(0, { ...chiMe, meDau: 1e9, yeuDau: 3_000 });
    for (const u of ['a', 'b', 'c']) noi(the, u, 'núi', 100, r);
    let t = 100;
    while (the.pha.k !== 'yeu') buoc(the, (t += 250), r);
    const p = the.pha;
    if (p.k !== 'yeu') throw new Error();
    for (const u of ['a', 'b', 'c']) noi(the, u, 'đánh', t + 10, r);
    let ds: Su[] = [];
    for (let x = t; x < t + 12_000 && !ds.some((s) => s.k === 'phan-don'); x += 250) ds = buoc(the, x, r);
    const pd = ds.find((s) => s.k === 'phan-don');
    expect(pd).toBeDefined();
    if (pd?.k !== 'phan-don') return;
    expect(pd.trung.length + pd.doDuoc.length).toBeGreaterThan(0);
    const u = pd.trung[0];
    if (u === undefined) return; // cả ba đều đỡ được — hiếm, vẫn hợp lệ
    const mau = p.mau;
    const luc = p.phanCuoi!.luc;
    noi(the, u, 'đánh', luc + 2_100, r);
    expect(p.mau).toBe(mau); // đang choáng
    nhanTin(the, { kind: 'like', user: u, ten: u, count: 3 }, luc + 2_200, r);
    expect(p.choang.has(u)).toBe(false);
  });
});

describe('Yêu tinh rơi đồ theo tim và quà', () => {
  it('85% cho người ra tay (top tim + quà nhận nhiều nhất), khoảng 15% cho người ngồi xem', () => {
    const r = hat(21);
    const the = taoThe(0, { ...chiMe, meDau: 1e9, yeuDau: 3_000 });
    for (const u of ['a', 'b', 'c', 'x1', 'x2']) noi(the, u, 'núi', 100, r);
    let t = 100;
    while (the.pha.k !== 'yeu') buoc(the, (t += 250), r);
    const p = the.pha;
    if (p.k !== 'yeu') throw new Error();
    for (const u of ['a', 'b', 'c']) {
      p.dmg.set(u, 50);
      p.tuongTac.add(u);
    }
    p.tim.set('a', 100);
    p.qua.set('a', 50);
    p.tim.set('b', 4);
    const dem = new Map<string, number>();
    for (let i = 0; i < 6000; i++) {
      const n = chonNhanDo(the, p, t, r)!;
      dem.set(n.user, (dem.get(n.user) ?? 0) + 1);
    }
    const ngoi = (dem.get('x1') ?? 0) + (dem.get('x2') ?? 0);
    expect(ngoi / 6000).toBeGreaterThan(0.1);
    expect(ngoi / 6000).toBeLessThan(0.2);
    expect(dem.get('a')!).toBeGreaterThan(dem.get('b')!);
    expect(dem.get('b')!).toBeGreaterThan(dem.get('c')!);
  });
});

describe('Yêu tinh rơi đồ', () => {
  it('hạ yêu tinh thì kết liễu chắc chắn nhận một món', () => {
    const r = hat(10);
    const the = taoThe(0, { ...chiMe, meDau: 1e9, yeuDau: 3_000 });
    noi(the, 'a', 'núi', 100, r);
    let t = 100;
    while (the.pha.k !== 'yeu') buoc(the, (t += 250), r);
    const p = the.pha;
    if (p.k !== 'yeu') throw new Error();
    p.mau = 1;
    const ds: Su[] = [];
    for (let i = 0; i < 10 && the.pha.k === 'yeu'; i++) ds.push(...noi(the, 'a', 'đánh', t + 10 + i * 2100, r));
    expect(ds.some((s) => s.k === 'nhat' && s.nguon === 'yeu' && s.vat !== null)).toBe(true);
  });
});

describe('lượt môn phái ở màn tu luyện', () => {
  it('hai phe thay nhau ngẫu nhiên nhưng công bằng: chạy lâu thì thời gian hiện xấp xỉ nhau', () => {
    const r = hat(12);
    const the = taoThe(0, { ...chiMe, meDau: 1e12 });
    datLuotPhe(the, 2);
    const dem = { son: 0, thuy: 0 };
    let doi = 0;
    let truoc = pheTuLuyen(the, 0).phe;
    for (let t = 0; t < 4 * 3600_000; t += 1000) {
      if (t % 60_000 === 0) {
        // Giữ cả hai phe luôn có người đang chơi.
        noi(the, 'a', 'núi', t, r);
        noi(the, 'b', 'nước', t, r);
      }
      buoc(the, t, r);
      const p = pheTuLuyen(the, t).phe;
      dem[p]++;
      if (p !== truoc) doi++;
      truoc = p;
    }
    expect(doi).toBeGreaterThan(60);
    expect(Math.abs(dem.son - dem.thuy) / (dem.son + dem.thuy)).toBeLessThan(0.1);
  });

  it('phe tới lượt không ai chơi thì hiện phe kia', () => {
    const r = hat(14);
    const chiThuy = taoThe(0, chiMe);
    noi(chiThuy, 'a', 'nước', 100, r);
    expect(pheTuLuyen(chiThuy, 1000).phe).toBe('thuy');
  });

  it('tổng lực chiến là công + thủ của đệ tử đang chơi', () => {
    const r = hat(13);
    const the = taoThe(0, chiMe);
    noi(the, 'a', 'núi', 100, r);
    noi(the, 'b', 'núi', 100, r);
    const doBan = (u: string) => Object.values(the.nguoi.get(u)!.tb).reduce((a, t) => a + t!.cong + t!.thu, 0);
    expect(tongLuc(the, 200, 'son')).toEqual({ luc: 2 * (12 + 8) + doBan('a') + doBan('b'), so: 2 });
  });
});

describe('lệnh dẫn đường', () => {
  it.each([
    ['lên', 'len'],
    ['đi xuống', 'xuong'],
    ['qua trái', 'trai'],
    ['⬆️', 'len'],
    ['→', 'phai'],
  ])('%s', (chu, huong) => {
    expect(docLenh(chu)).toEqual({ k: 'di', huong });
  });

  it.each([
    ['phải phải', 'phai', 2],
    ['lên lên lên', 'len', 3],
    ['trái 4', 'trai', 4],
    ['đi xuống 2', 'xuong', 2],
  ])('%s là nhiều bước', (chu, huong, so) => {
    expect(docLenh(chu)).toEqual({ k: 'di', huong, so });
  });
});

describe('Ải Nhập Môn', () => {
  const nhip: Nhip = { ...NHIP_LIVE, luDau: 1e12, yeuDau: 1e12, mua: 1e12, meDau: 1e12, nmDau: 5_000 };

  /** Chạy tới khi ải mở (cần có khách đang chờ). */
  function moAi(seed: number) {
    const r = hat(seed);
    const the = taoThe(0, nhip);
    nhanTin(the, { kind: 'comment', user: 'k', ten: 'K', text: 'xin chào' }, 100, r);
    let t = 100;
    while (the.pha.k !== 'nm') {
      buoc(the, (t += 250), r);
      if (t > 120_000) throw new Error('ải không mở');
    }
    const p = the.pha;
    if (p.k !== 'nm') throw new Error();
    return { the, r, t, p };
  }

  /** Đi đường ngắn nhất tới cửa phe mình, mỗi bình luận một bước. */
  function diToiCua(the: The, user: string, t: number, r: () => number) {
    const p = the.pha;
    if (p.k !== 'nm') throw new Error();
    const v = p.vt.get(user)!;
    let x = t;
    for (let i = 0; i < 80 && !v.qua; i++) {
      const toi = buocToi(p.me, v.o, new Set([p.cua[v.phe]]), () => 0)!;
      const h = (['len', 'xuong', 'trai', 'phai'] as const).find((d) => ke(p.me, v.o, d) === toi)!;
      noi(the, user, { len: 'lên', xuong: 'xuống', trai: 'trái', phai: 'phải' }[h], (x += 400), r);
      buoc(the, (x += 400), r);
    }
    return x;
  }

  it('không có khách thì không mở ải', () => {
    const r = hat(1);
    const the = taoThe(0, nhip);
    for (let t = 0; t < 60_000; t += 250) buoc(the, t, r);
    expect(the.pha.k).not.toBe('nm');
  });

  it('gõ "Nam - S", "nữ T" trong 30 giây đầu là bước vào; chữ hoa thường như nhau', () => {
    const { the, r, t, p } = moAi(2);
    noi(the, 'a', 'Nam - S', t + 100, r);
    noi(the, 'b', 'NỮ-t', t + 200, r);
    noi(the, 'c', 'nu s', t + 300, r);
    expect(p.vt.get('a')).toMatchObject({ phe: p.phe, gioi: 'nam', o: p.vao });
    // Ải một cửa: ai bước vào cũng về tông của ải, chỉ giới theo chữ gõ.
    expect(p.vt.get('b')).toMatchObject({ phe: p.phe, gioi: 'nu' });
    expect(p.vt.get('c')).toMatchObject({ phe: p.phe, gioi: 'nu' });
    // Chưa qua ải thì vẫn là khách.
    expect(the.nguoi.get('a')!.phe).toBeNull();
    // Hết 30 giây thì không bước vào được nữa.
    noi(the, 'muon', 'nam s', p.moLuc + 10, r);
    expect(p.vt.has('muon')).toBe(false);
  });

  it('lên tiếng trong 30 giây mà chưa chọn nhân vật thì được bốc ngẫu nhiên; đã chọn thì chat thêm không đổi', () => {
    const { the, r, t, p } = moAi(13);
    noi(the, 'x', 'chào cả nhà', t + 100, r);
    const v = p.vt.get('x')!;
    expect(v).toBeDefined();
    expect(['son', 'thuy']).toContain(v.phe);
    expect(['nam', 'nu']).toContain(v.gioi);
    noi(the, 'y', 'Nam - T', t + 200, r);
    noi(the, 'y', 'hay quá', t + 300, r);
    expect(p.vt.get('y')).toMatchObject({ phe: p.phe, gioi: 'nam' });
  });

  it('hai cửa cách lối vào bằng nhau (mê cung soi gương)', () => {
    for (const seed of [3, 4, 5, 6]) {
      const { p } = moAi(seed);
      expect(khoang(p.me, p.vao, p.cua.son)).toBe(khoang(p.me, p.vao, p.cua.thuy));
    }
  });

  it('chưa hết 30 giây thì chưa đi được; tới đúng cửa phe mình là nhập môn, được ban trang phục', () => {
    const { the, r, t, p } = moAi(7);
    noi(the, 'a', 'nam s', t + 100, r);
    noi(the, 'a', 'lên', t + 500, r);
    buoc(the, t + 1000, r);
    expect(p.vt.get('a')!.o).toBe(p.vao);
    let x = t + 1000;
    while (x < p.moLuc) buoc(the, (x += 250), r);
    diToiCua(the, 'a', x, r);
    const n = the.nguoi.get('a')!;
    expect(p.vt.get('a')!.qua).toBe(true);
    expect(n).toMatchObject({ phe: 'son', gioi: 'nam' });
    expect(n.ao).toBeGreaterThanOrEqual(1);
    expect(n.ao).toBeLessThanOrEqual(5);
    expect(p.qua).toEqual(['a']);
  });

  it('"lên 3" đi ba bước liền (mỗi bước một nhịp ngắn)', () => {
    const { the, r, p } = moAi(8);
    noi(the, 'a', 'nam s', p.moLuc - 1000, r);
    const v = p.vt.get('a')!;
    v.o = 2 * p.me.cot + 4;
    // Mở thông ba ô phía trên để thử.
    for (const o of [v.o, v.o - p.me.cot, v.o - 2 * p.me.cot]) p.me.tuong[o] = p.me.tuong[o]! & ~1;
    for (const o of [v.o - p.me.cot, v.o - 2 * p.me.cot]) p.me.tuong[o] = p.me.tuong[o]! & ~4;
    const goc = v.o;
    noi(the, 'a', 'lên 2', p.moLuc + 10, r);
    for (let x = p.moLuc + 10; x < p.moLuc + 2000; x += 100) buoc(the, x, r);
    expect(v.o).toBe(goc - 2 * p.me.cot);
  });

  it('hết giờ chưa tới cửa thì vẫn là khách, chờ ải sau', () => {
    const { the, r, t, p } = moAi(9);
    noi(the, 'a', 'nữ t', t + 100, r);
    let x = t;
    while (the.pha.k === 'nm') buoc(the, (x += 250), r);
    expect(the.pha.k).toBe('nm-ket');
    const k = the.pha;
    if (k.k !== 'nm-ket') throw new Error();
    expect(k.truot).toBe(1);
    expect(the.nguoi.get('a')!.phe).toBeNull();
  });

  it('vật phẩm rơi theo cặp soi gương, nằm trên đường tới cửa; vượt ải thì đồ và bí kíp thành của mình', () => {
    const { the, r, t, p } = moAi(11);
    noi(the, 'a', 'nam s', t + 100, r);
    let x = t + 100;
    while (x < p.moLuc + the.nhip.nm * 0.95) buoc(the, (x += 250), r);
    // Đồ đã rơi hết (chưa ai nhặt): từng cặp soi gương nhau, cách lối vào và cửa tông bằng nhau.
    expect(p.do.length).toBeGreaterThanOrEqual(6);
    for (const d of p.do) {
      const g = oGuong(p.me, d.o);
      expect(p.do.some((e) => e.o === g && e.loai === d.loai)).toBe(true);
      const cua = d.o % p.me.cot < p.me.cot / 2 ? p.cua.son : p.cua.thuy;
      // Túi linh thạch được rơi lệch đường tới cửa tối đa 4 bước (THACH_NM); vật phẩm thì nằm ngay trên đường.
      const lech = khoang(p.me, p.vao, d.o) + khoang(p.me, d.o, cua) - khoang(p.me, p.vao, cua);
      if (d.loai === 'thach') expect(lech).toBeLessThanOrEqual(4);
      else expect(lech).toBe(0);
    }
  });

  it('nhặt bí kíp rồi vượt ải thì lĩnh ngộ một môn công pháp; đồ nhặt được mặc hoặc luyện hoá', () => {
    const { the, r, t, p } = moAi(12);
    noi(the, 'a', 'nữ t', t + 100, r);
    const v = p.vt.get('a')!;
    let x = t + 100;
    while (x < p.moLuc) buoc(the, (x += 250), r);
    // Đặt sẵn bí kíp và một món đồ ngay trên đường đi.
    const o1 = buocToi(p.me, v.o, new Set([p.cua.thuy]), () => 0)!;
    const o2 = buocToi(p.me, o1, new Set([p.cua.thuy]), () => 0)!;
    p.do = [
      { id: 90, o: o1, loai: 'bk' },
      { id: 91, o: o2, loai: 'tb', vat: { o: 'vu', pham: 0, cong: 6, thu: 0 } },
    ];
    p.hen = [];
    diToiCua(the, 'a', x, r);
    const n = the.nguoi.get('a')!;
    expect(n.phe).toBe(p.phe);
    expect(n.cp).toBe(1);
    expect(n.tb.vu).toBeDefined();
  });

  it('khách không tự vào phe bằng "vào" hay "núi" ngoài giờ ải', () => {
    const r = hat(10);
    const the = taoThe(0, nhip);
    nhanTin(the, { kind: 'comment', user: 'a', ten: 'A', text: 'vào' }, 100, r);
    nhanTin(the, { kind: 'comment', user: 'b', ten: 'B', text: 'núi nam' }, 100, r);
    expect(the.nguoi.get('a')!.phe).toBeNull();
    expect(the.nguoi.get('b')!.phe).toBeNull();
  });
});
