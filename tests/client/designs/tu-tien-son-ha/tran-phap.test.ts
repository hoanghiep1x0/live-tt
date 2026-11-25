import { describe, expect, it } from 'vitest';
import {
  buoc,
  capNhanh,
  capTran,
  heSoPheLuc,
  heSoVo,
  lucChien,
  tenVo,
  hoiChieu,
  tiLeBao,
  hoPhapCan,
  napHoSo,
  npcCua,
  soNpc,
  nhanTin,
  NHIP_LIVE,
  taoThe as taoThe0,
  tongLuc,
  xuatHoSo,
  type Nhip,
  type Su,
  type The,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/core';

/** Các test này dùng câu đố lúc tu luyện (nay mặc định tắt, `cauTl`) — bật lại để vẫn kiểm được. */
const taoThe = (...a: Parameters<typeof taoThe0>) => {
  const t = taoThe0(...a);
  t.cauTl = true;
  return t;
};
import { nhapMonThang } from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import { docLenh } from '../../../../client/designs/tu-tien-son-ha/src/loi/lenh';
import { CAN_CO_DS } from '../../../../client/designs/tu-tien-son-ha/src/loi/the-gioi';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const xa: Nhip = { ...NHIP_LIVE, nmDau: 1e12, luDau: 1e9, yeuDau: 1e9, mua: 1e9, meDau: 1e9 };

function noi(the: The, user: string, text: string, now: number, r: () => number): Su[] {
  const l = docLenh(text);
  if (l.k === 'phe' && the.pha.k !== 'nm' && (the.nguoi.get(user)?.phe ?? null) === null) {
    return nhapMonThang(the, { kind: 'comment', user, ten: user.toUpperCase(), text }, l.phe, l.gioi, now, r);
  }
  return nhanTin(the, { kind: 'comment', user, ten: user.toUpperCase(), text }, now, r);
}

function toi(the: The, k: 'lu' | 'yeu', r: () => number): number {
  let t = 100;
  while (the.pha.k !== k) {
    buoc(the, (t += 250), r);
    if (t > 200_000) throw new Error(`không tới ${k}`);
  }
  return t;
}

describe('lệnh trận pháp và căn cơ', () => {
  it.each([
    ['hồi', { k: 'ky', ky: 'hoi' }],
    ['THỦ!!!', { k: 'ky', ky: 'thu' }],
    ['công công công', { k: 'ky', ky: 'cong' }],
    ['phá', { k: 'ky', ky: 'pha' }],
    ['hồi máu', { k: 'ky', ky: 'hoi' }],
    ['phá giáp', { k: 'ky', ky: 'pha' }],
    ['y sư', { k: 'can-co', canCo: 'y' }],
    ['Chiến Tướng', { k: 'can-co', canCo: 'tuong' }],
  ])('%s', (chu, lenh) => {
    expect(docLenh(chu)).toEqual(lenh);
  });

  it('không lẫn với lệnh cũ: "thủy" vẫn là nhập phe Nước, "phải" vẫn là dẫn đường', () => {
    expect(docLenh('thủy')).toEqual({ k: 'phe', phe: 'thuy' });
    expect(docLenh('phải')).toEqual({ k: 'di', huong: 'phai' });
    expect(docLenh('hộ pháp')).toEqual({ k: 'ho' });
  });
});

describe('căn cơ', () => {
  it('nhập môn là có căn cơ ngay, không phải gõ thêm; gõ tên căn cơ để đổi (ngoài trận)', () => {
    const r = hat(1);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi nam', 100, r);
    const a = the.nguoi.get('a')!;
    expect(CAN_CO_DS).toContain(a.canCo);
    noi(the, 'a', 'y sư', 200, r);
    expect(a.canCo).toBe('y');
  });

  it('căn cơ được ghi sổ', () => {
    const r = hat(2);
    const the = taoThe(0, xa);
    noi(the, 'a', 'nước', 100, r);
    the.nguoi.get('a')!.canCo = 've';
    the.nguoi.get('a')!.lk = 5;
    const moi = taoThe(0, xa);
    napHoSo(moi, JSON.parse(JSON.stringify(xuatHoSo(the))));
    expect(moi.nguoi.get('a')!.canCo).toBe('ve');
  });
});

describe('Linh Mạch', () => {
  it('trả lời đúng bồi đắp Linh Mạch phe mình; Linh Mạch được ghi sổ', () => {
    const r = hat(3);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi', 100, r);
    the.nguoi.get('a')!.canCo = 'tuong';
    let t = 100;
    while (the.pha.k !== 'hoi') buoc(the, (t += 250), r);
    const p = the.pha;
    if (p.k !== 'hoi') throw new Error();
    noi(the, 'a', ['a', 'b', 'c'][p.cau.dung]!, t + 100, r);
    for (let x = t; x < t + NHIP_LIVE.hoi + 500; x += 250) buoc(the, x, r);
    expect(the.linhMach.son).toBe(1);
    const moi = taoThe(0, xa);
    napHoSo(moi, JSON.parse(JSON.stringify(xuatHoSo(the))));
    expect(moi.linhMach.son).toBe(1);
  });
});

describe('PK tự động và chiêu theo quà', () => {
  function san(seed: number, soMoiPhe = 2) {
    const r = hat(seed);
    const the = taoThe(0, { ...xa, luDau: 3_000 });
    for (let i = 0; i < soMoiPhe; i++) {
      noi(the, `s${i}`, 'núi', 100, r);
      noi(the, `t${i}`, 'nước', 100, r);
      the.nguoi.get(`s${i}`)!.canCo = null;
      the.nguoi.get(`t${i}`)!.canCo = null;
    }
    const t = toi(the, 'lu', r);
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    return { the, r, t, p };
  }
  const qua = (the: The, user: string, xu: number, now: number, r: () => number) =>
    nhanTin(the, { kind: 'gift', user, ten: user.toUpperCase(), text: 'Quà', count: 1, xu }, now, r);

  it('không ai làm gì trận vẫn chạy: hai phe tự ra đòn thường', () => {
    const { the, r, t, p } = san(4);
    const ds: Su[] = [];
    for (let x = t; x < t + 9_000; x += 250) ds.push(...buoc(the, x, r));
    expect(ds.filter((s) => s.k === 'don').length).toBeGreaterThanOrEqual(8);
    expect(p.son).toBeGreaterThan(5);
    expect(p.thuy).toBeGreaterThan(5);
  });

  it('phe tổng lực chiến cao hơn thì đòn thường nặng hơn, nhưng có kẹp', () => {
    const { the, t } = san(5);
    the.nguoi.get('s0')!.canh = 9;
    the.nguoi.get('s1')!.canh = 9;
    expect(heSoPheLuc(the, t, 'son')).toBe(1.25);
    expect(heSoPheLuc(the, t, 'thuy')).toBe(0.8);
  });

  it('tim hâm nóng phe: tăng tỉ lệ bạo kích của đòn thường, có trần', () => {
    const { the, r, t, p } = san(6);
    const goc = tiLeBao(p, 'son');
    nhanTin(the, { kind: 'like', user: 's0', ten: 'S0', count: 10 }, t + 10, r);
    expect(tiLeBao(p, 'son')).toBeCloseTo(goc + 0.1, 5);
    nhanTin(the, { kind: 'like', user: 's0', ten: 'S0', count: 500 }, t + 20, r);
    expect(tiLeBao(p, 'son')).toBe(0.5);
    expect(tiLeBao(p, 'thuy')).toBe(goc);
  });

  it('quà ra chiêu theo mức xu: Bạo Kích, Liên Kích ×3, Trận Pháp theo căn cơ, Tuyệt Kỹ hiếm', () => {
    const { the, r, t, p } = san(7);
    the.nguoi.get('s0')!.canCo = 'tuong';
    const a = qua(the, 's0', 1, t + 10, r);
    expect(a.some((s) => s.k === 'qua-chieu' && s.ten === 'Bạo Kích')).toBe(true);
    const b = qua(the, 's0', 10, t + 20, r);
    expect(b.some((s) => s.k === 'qua-chieu' && s.ten === 'Liên Kích ×3')).toBe(true);
    const c = qua(the, 's0', 50, t + 30, r);
    expect(c.some((s) => s.k === 'ky-nang' && s.ky === 'cong' && s.nguon === 'qua')).toBe(true);
    expect(p.tran.hl.son.cong).toBeGreaterThan(t);
    const truoc = p.son;
    const d = qua(the, 's1', 200, t + 40, r);
    expect(d.some((s) => s.k === 'tuyet-ky' && s.user === 's1')).toBe(true);
    expect(p.son - truoc).toBeGreaterThan(p.H * 0.1);
  });

  it('tử chiến: trận khí một tông dưới 20% thì mở 30 giây, quà của tông đó ×2 điểm', () => {
    const { the, r, t, p } = san(12);
    p.thuy = p.H * 0.85; // Sơn Tông còn 15% trận khí
    buoc(the, t + 250, r);
    expect(the.quaGap?.loai).toBe('tu-chien');
    expect(the.quaGap?.phe).toBe('son');
    const truoc = p.son;
    nhanTin(the, { kind: 'gift', user: 's0', ten: 'S0', text: 'Rose', count: 1, xu: 1 }, t + 300, r);
    const tuChien = p.son - truoc;
    const truoc2 = p.thuy;
    nhanTin(the, { kind: 'gift', user: 't0', ten: 'T0', text: 'Rose', count: 1, xu: 1 }, t + 310, r);
    expect(tuChien).toBeGreaterThan(p.thuy - truoc2);
  });

  it('gõ số hô trận pháp trong Đại Chiến: 1 công · 2 thủ · 3 hồi · 4 phá (gõ chữ cũng được)', () => {
    const { the, r, t, p } = san(11);
    the.linhMach.son = 50;
    the.linhMach.thuy = 50;
    const a = noi(the, 's0', '2', t + 10, r);
    const b = noi(the, 's1', '2 2', t + 20, r);
    expect([...a, ...b].some((s) => s.k === 'ky-nang' && s.ky === 'thu')).toBe(true);
    expect(p.tran.hl.son.thu).toBeGreaterThan(t);
    const c = [...noi(the, 't0', 'công', t + 30, r), ...noi(the, 't1', 'công', t + 40, r)];
    expect(c.some((s) => s.k === 'ky-nang' && s.ky === 'cong')).toBe(true);
  });

  it('trận pháp bằng quà không tốn Linh Mạch nhưng vẫn theo hồi chiêu 20 giây', () => {
    const { the, r, t, p } = san(8);
    the.nguoi.get('s0')!.canCo = 'y';
    the.linhMach.son = 30;
    expect(qua(the, 's0', 60, t + 10, r).some((s) => s.k === 'ky-nang' && s.ky === 'hoi')).toBe(true);
    expect(the.linhMach.son).toBe(30);
    expect(hoiChieu(p, 'son', 'hoi', t + 5_000)).toBeGreaterThan(0);
    expect(qua(the, 's0', 60, t + 5_000, r).some((s) => s.k === 'ky-nang')).toBe(false);
    expect(hoiChieu(p, 'son', 'hoi', t + 21_000)).toBe(0);
  });

  it('phe tự kết trận pháp bằng Linh Mạch: lượt đầu thần ban, lượt sau tốn 10; hết Linh Mạch thì thôi', () => {
    const { the, r, t } = san(9);
    the.linhMach.son = 10;
    the.linhMach.thuy = 0;
    const ds: Su[] = [];
    for (let x = t; x < t + 32_000 && the.pha.k === 'lu'; x += 250) ds.push(...buoc(the, x, r));
    const ky = (phe: 'son' | 'thuy') => ds.filter((s) => s.k === 'ky-nang' && s.phe === phe && s.nguon === 'ho').length;
    expect(ky('son')).toBe(2); // một lượt thần ban + một lượt trả 10 Linh Mạch
    expect(ky('thuy')).toBe(1); // chỉ lượt thần ban
    expect(the.linhMach.son).toBeLessThan(10);
  });

  it('trận Công làm đòn nặng ×1,3; trận Thủ của địch làm đòn nhẹ đi; Phá xoá khiên', () => {
    const { the, r, t, p } = san(10, 1);
    the.nguoi.get('s0')!.canCo = 'tuong';
    the.nguoi.get('t0')!.canCo = 've';
    noi(the, 's0', 'đẩy', t + 10, r);
    const thuong = p.son;
    qua(the, 's0', 50, t + 20, r); // kết trận Công
    const truoc = p.son;
    noi(the, 's0', 'đẩy', t + 1300, r);
    const coCong = p.son - truoc;
    expect(coCong / thuong).toBeGreaterThan(1.2);
    qua(the, 't0', 50, t + 1400, r); // phe Nước dựng khiên
    const truoc2 = p.son;
    noi(the, 's0', 'đẩy', t + 2600, r);
    expect((p.son - truoc2) / coCong).toBeLessThan(0.8);
    the.nguoi.get('s0')!.canCo = 'quan';
    qua(the, 's0', 50, t + 2700, r); // phá khiên
    expect(p.tran.hl.thuy.thu).toBe(0);
    expect(p.tran.hl.thuy.vo).toBeGreaterThan(t + 2700);
  });

  it('trận Hồi trả lại trận khí cho phe mình', () => {
    const { the, r, t, p } = san(11, 1);
    the.nguoi.get('s0')!.canCo = 'y';
    for (let i = 0; i < 6; i++) noi(the, 't0', 'đẩy', t + 10 + i * 1300, r);
    const truoc = p.thuy;
    qua(the, 's0', 50, t + 9000, r);
    expect(p.thuy).toBeLessThan(truoc);
  });

  it('cạn trận khí thì bị phá trận, thua ngay', () => {
    const { the, r, t, p } = san(12, 1);
    p.son = p.H + 1;
    const ds = buoc(the, t + 300, r);
    expect(ds.some((s) => s.k === 'pha-tran' && s.thang === 'son')).toBe(true);
    buoc(the, t + 600, r);
    expect(the.pha.k).toBe('lu-ket');
  });
});

describe('lên cấp phải tự gõ', () => {
  it('đủ linh khí thì dừng ở ngưỡng, không tự lên; gõ "đột phá" mới lên', () => {
    const r = hat(30);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi', 100, r);
    const a = the.nguoi.get('a')!;
    a.lk = 25;
    let t = 100;
    while (the.pha.k !== 'hoi') buoc(the, (t += 250), r);
    const p = the.pha;
    if (p.k !== 'hoi') throw new Error();
    noi(the, 'a', ['a', 'b', 'c'][p.cau.dung]!, t + 100, r);
    const ds: Su[] = [];
    for (let x = t; x < t + NHIP_LIVE.hoi + 500; x += 250) ds.push(...buoc(the, x, r));
    expect(a.canh).toBe(0);
    expect(a.lk).toBe(30); // dừng đúng ngưỡng Luyện Khí
    expect(ds.some((s) => s.k === 'du-lk' && s.user === 'a')).toBe(true);
    const len = noi(the, 'a', 'đột phá', t + NHIP_LIVE.hoi + 600, r);
    expect(a.canh).toBe(1);
    expect(len.some((s) => s.k === 'dot-pha')).toBe(true);
  });

  it('chưa đủ linh khí mà gõ "đột phá" thì không lên', () => {
    const r = hat(31);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi', 100, r);
    noi(the, 'a', 'đột phá', 200, r);
    expect(the.nguoi.get('a')!.canh).toBe(0);
  });

  it('đã bỏ luật xuất môn: lâu không tích linh khí vẫn giữ tông, vào lại không phải vượt Ải', () => {
    const r = hat(32);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi', 100, r);
    const a = the.nguoi.get('a')!;
    a.canh = 2;
    a.lk = 100;
    const ds: Su[] = [];
    for (let t = 1000; t < NHIP_LIVE.xuatMon + 20_000; t += 5_000) ds.push(...buoc(the, t, r));
    expect(a.phe).toBe('son');
    expect(ds.some((s) => s.k === 'xuat-mon')).toBe(false);
  });
});

describe('trận tu luyện lên cấp nhờ quà, sinh linh thạch', () => {
  const qua = (the: The, user: string, xu: number, now: number, r: () => number) =>
    nhanTin(the, { kind: 'gift', user, ten: user.toUpperCase(), text: 'Quà', count: 1, xu }, now, r);

  it('quà nâng nhánh của người tặng; nhánh lên cấp thì đẩy thêm lực cho trận phe', () => {
    const r = hat(40);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi', 100, r);
    const ds = qua(the, 'a', 10, 200, r);
    expect(capNhanh(the.nguoi.get('a')!)).toBe(1);
    expect(ds.some((s) => s.k === 'nhanh-len' && s.cap === 1)).toBe(true);
    expect(the.tranLuc.son).toBe(10 + 20);
    expect(the.tranLuc.thuy).toBe(0);
  });

  it('đủ trận lực thì trận phe lên cấp, đổi tên; trận lực được ghi sổ', () => {
    const r = hat(41);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi', 100, r);
    expect(capTran(the, 'son')).toMatchObject({ cap: 1, ten: 'Tụ Linh Trận', thach: 0 });
    const ds = qua(the, 'a', 60, 200, r); // 60 xu + 2 cấp nhánh × 20 = 100
    expect(capTran(the, 'son')).toMatchObject({ cap: 2, ten: 'Lạc Điểu Trận', thach: 1 });
    expect(ds.some((s) => s.k === 'tran-len' && s.cap === 2)).toBe(true);
    const moi = taoThe(0, xa);
    napHoSo(moi, JSON.parse(JSON.stringify(xuatHoSo(the))));
    expect(capTran(moi, 'son').cap).toBe(2);
    expect(capNhanh(moi.nguoi.get('a')!)).toBe(2);
  });

  it('trận càng cao, mỗi câu đáp đúng môn đồ càng được nhiều linh thạch', () => {
    const r = hat(42);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi', 100, r);
    the.tranLuc.son = 800; // Thiên Phù Trận, cấp 4
    let t = 100;
    while (the.pha.k !== 'hoi') buoc(the, (t += 250), r);
    const p = the.pha;
    if (p.k !== 'hoi') throw new Error();
    noi(the, 'a', ['a', 'b', 'c'][p.cau.dung]!, t + 100, r);
    for (let x = t; x < t + NHIP_LIVE.hoi + 500; x += 250) buoc(the, x, r);
    expect(the.nguoi.get('a')!.tinChi).toBe(3);
  });
});

describe('tiêu linh thạch: đan dược và võ công', () => {
  it('luyện đan: 20 linh thạch đổi 25 linh khí; thiếu linh thạch thì không được', () => {
    const r = hat(50);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi', 100, r);
    const a = the.nguoi.get('a')!;
    a.canh = 3;
    a.lk = 210;
    noi(the, 'a', 'luyện đan', 200, r);
    expect(a.lk).toBe(210);
    a.tinChi = 45;
    const ds = noi(the, 'a', 'luyện đan', 300, r);
    expect(a.tinChi).toBe(25);
    expect(a.lk).toBe(235);
    expect(ds.some((s) => s.k === 'luyen-dan')).toBe(true);
  });

  it('học võ: mua môn công pháp rẻ nhất chưa có, đòn mạnh lên; được ghi sổ', () => {
    const r = hat(51);
    const the = taoThe(0, xa);
    noi(the, 'a', 'nước', 100, r);
    const a = the.nguoi.get('a')!;
    a.tinChi = 100;
    noi(the, 'a', 'học võ', 200, r); // C1 Lạc Điểu Quyền, 30
    expect(a.cp).toBe(1);
    expect(a.tinChi).toBe(70);
    expect(heSoVo(a)).toBeCloseTo(1.08, 5);
    const moi = taoThe(0, xa);
    napHoSo(moi, JSON.parse(JSON.stringify(xuatHoSo(the))));
    expect(moi.nguoi.get('a')!.cp).toBe(1);
  });
});

describe('Tàng Bảo Các', () => {
  function san(seed: number) {
    const r = hat(seed);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi', 100, r);
    const a = the.nguoi.get('a')!;
    return { r, the, a };
  }

  it('đọc mã T/D/C/P + số, chữ hoa thường như nhau', () => {
    expect(docLenh('T3')).toEqual({ k: 'ma', loai: 't', so: 3 });
    expect(docLenh('d 1')).toEqual({ k: 'ma', loai: 'd', so: 1 });
    expect(docLenh('C9')).toEqual({ k: 'ma', loai: 'c', so: 9 });
    expect(docLenh('p2')).toEqual({ k: 'ma', loai: 'p', so: 2 });
    expect(docLenh('c')).toEqual({ k: 'dap', chon: 2 });
  });

  it('trang phục: món chưa có thì mua rồi mặc; đã có thì đổi miễn phí; áo cảnh giới cần đủ cảnh giới', () => {
    const { r, the, a } = san(70);
    a.tinChi = 120;
    const coSan = a.ao;
    const khac = coSan === 1 ? 2 : 1;
    noi(the, 'a', `T${khac}`, 200, r);
    expect(a.ao).toBe(khac);
    expect(a.tinChi).toBe(70);
    noi(the, 'a', `T${coSan}`, 300, r); // đã có từ lúc nhập môn
    expect(a.ao).toBe(coSan);
    expect(a.tinChi).toBe(70);
    noi(the, 'a', 'T7', 400, r); // áo Nguyên Anh, chưa đủ cảnh giới
    expect(a.ao).toBe(coSan);
  });

  it('pet cộng công thủ theo phần công thủ gốc; công pháp đổi hệ số đòn', () => {
    const { r, the, a } = san(71);
    a.canh = 4;
    a.tinChi = 1100;
    const truoc = lucChien(a);
    noi(the, 'a', 'P8', 200, r); // Giao Long +15%
    expect(lucChien(a) - truoc).toBe(Math.round(300 * 0.15));
    noi(the, 'a', 'C9', 300, r); // Sơn Hà Thần Quyết, hệ đòn bậc 5
    expect(heSoVo(a)).toBeCloseTo(1.4, 5);
    expect(a.tinChi).toBe(1100 - 600 - 480);
  });

  it('đan linh khí không uống được khi đã đầy; đan trận cất túi, vào trận tự dùng', () => {
    const { r, the, a } = san(72);
    a.tinChi = 200;
    noi(the, 'a', 'D1', 200, r);
    expect(a.lk).toBe(25);
    noi(the, 'a', 'D6', 300, r);
    expect(a.dan.cong).toBe(1);
    a.lk = 9999;
    const con = a.tinChi;
    noi(the, 'a', 'D2', 400, r);
    expect(a.tinChi).toBe(con);
  });

  it('đang đánh thì không mua đổi được', () => {
    const r = hat(73);
    const the = taoThe(0, { ...xa, luDau: 3_000 });
    noi(the, 'a', 'núi', 100, r);
    const a = the.nguoi.get('a')!;
    a.tinChi = 500;
    toi(the, 'lu', r);
    noi(the, 'a', 'P1', the.pha.den - 5_000, r);
    expect(a.pet).toBe(0);
  });
});

describe('hệ số linh thạch', () => {
  it('đột phá: người đột phá +5 × cảnh giới mới, mỗi người online +1 × cảnh giới mới; người offline không được', () => {
    const r = hat(60);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi', 100, r);
    noi(the, 'b', 'nước', 100, r);
    noi(the, 'vang', 'nước', 100, r);
    const a = the.nguoi.get('a')!;
    a.canh = 2;
    a.lk = 200;
    const sau = 100 + 6 * 60_000; // 'vang' đã 6 phút không hành động
    noi(the, 'b', 'hi', sau, r);
    const ds = noi(the, 'a', 'đột phá', sau + 10, r);
    expect(a.canh).toBe(3);
    expect(a.tinChi).toBe(15);
    expect(the.nguoi.get('b')!.tinChi).toBe(3);
    expect(the.nguoi.get('vang')!.tinChi).toBe(0);
    expect(ds.find((s) => s.k === 'dot-pha')).toMatchObject({ thach: 15, phong: 3 });
  });

  it('tim chạm mốc trong buổi thì thưởng linh thạch, mỗi mốc một lần', () => {
    const r = hat(61);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi', 100, r);
    const tim = (so: number, now: number) => nhanTin(the, { kind: 'like', user: 'a', ten: 'A', count: so }, now, r);
    tim(49, 200);
    expect(the.nguoi.get('a')!.tinChi).toBe(0);
    const ds = tim(160, 300); // qua mốc 50 và 200
    expect(the.nguoi.get('a')!.tinChi).toBe(2 + 5);
    expect(ds.filter((s) => s.k === 'tim-moc')).toHaveLength(2);
    tim(10, 400);
    expect(the.nguoi.get('a')!.tinChi).toBe(7);
  });

  it('người quá 5 phút không hành động thì lực chiến không tính vào tổng lực chiến phe', () => {
    const r = hat(62);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi', 100, r);
    noi(the, 'b', 'núi', 100, r);
    expect(tongLuc(the, 200, 'son').so).toBe(2);
    for (const u of ['a', 'b']) the.nguoi.get(u)!.tb = {}; // bỏ đồ ban nhập môn: lực chiến gốc
    noi(the, 'a', 'hi', 100 + 6 * 60_000, r);
    expect(tongLuc(the, 200 + 6 * 60_000, 'son')).toEqual({ luc: 20, so: 1 });
  });
});

describe('tín chỉ', () => {
  it('quà tặng cộng tín chỉ cho người tặng và được ghi sổ', () => {
    const r = hat(33);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi', 100, r);
    nhanTin(the, { kind: 'gift', user: 'a', ten: 'A', text: 'Hoa hồng', count: 2, xu: 30 }, 200, r);
    expect(the.nguoi.get('a')!.tinChi).toBe(30);
    const moi = taoThe(0, xa);
    napHoSo(moi, JSON.parse(JSON.stringify(xuatHoSo(the))));
    expect(moi.nguoi.get('a')!.tinChi).toBe(30);
  });
});

describe('tự chia phe cho cân', () => {
  it('Đại Chiến mở thì khách chỉ đứng xem, không bị kéo vào phe', () => {
    const r = hat(21);
    const the = taoThe(0, { ...xa, luDau: 3_000 });
    noi(the, 'a', 'núi', 100, r);
    for (const u of ['k1', 'k2', 'k3']) noi(the, u, 'xin chào', 100, r);
    toi(the, 'lu', r);
    for (const u of ['k1', 'k2', 'k3']) expect(the.nguoi.get(u)!.phe).toBeNull();
  });
});

describe('Chủ Tướng', () => {
  it('mỗi phe một Chủ Tướng (cảnh giới cao nhất); đòn Chủ Tướng nặng gấp ba người trợ chiến', () => {
    const r = hat(22);
    const the = taoThe(0, { ...xa, luDau: 3_000 });
    for (const u of ['a', 'b']) noi(the, u, 'núi', 100, r);
    noi(the, 'c', 'nước', 100, r);
    for (const u of ['a', 'b', 'c']) the.nguoi.get(u)!.canCo = null;
    the.nguoi.get('a')!.canh = 3;
    the.nguoi.get('b')!.canh = 3;
    the.nguoi.get('b')!.tb = {};
    the.nguoi.get('c')!.tb = {};
    the.nguoi.get('a')!.tb = { bao: { o: 'bao', pham: 0, cong: 1, thu: 1 } };
    const t = toi(the, 'lu', r);
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    expect(p.chu.son).toBe('a');
    expect(p.chu.thuy).toBe('c');
    noi(the, 'a', 'đẩy', t + 10, r);
    noi(the, 'b', 'đẩy', t + 11, r);
    expect(p.cong.get('a')! / p.cong.get('b')!).toBeGreaterThan(2.5);
  });
});

describe('Tụ Linh Trận và trưởng lão NPC', () => {
  it('phe chưa đủ 6 đệ tử thì có trưởng lão NPC ngồi bù; đủ người thì NPC lui', () => {
    const r = hat(23);
    const the = taoThe(0, xa);
    expect(soNpc(the, 'son', 100)).toBe(6);
    noi(the, 'a', 'núi', 100, r);
    expect(soNpc(the, 'son', 200)).toBe(5);
    expect(npcCua('son', 5).map((n) => n.ten)).toContain('Cao Sơn');
    for (let i = 0; i < 6; i++) noi(the, `s${i}`, 'núi', 100, r);
    expect(soNpc(the, 'son', 200)).toBe(0);
  });

  it('một mình tu luyện vẫn được trưởng lão truyền thêm linh khí; đông đồng môn cùng đúng thì cộng hưởng', () => {
    const lk = (soDeTu: number) => {
      const r = hat(24);
      const the = taoThe(0, xa);
      for (let i = 0; i < soDeTu; i++) {
        noi(the, `s${i}`, 'núi', 100, r);
        the.nguoi.get(`s${i}`)!.canCo = null;
      }
      let t = 100;
      while (the.pha.k !== 'hoi') buoc(the, (t += 250), r);
      const p = the.pha;
      if (p.k !== 'hoi') throw new Error();
      const ds: Su[] = [];
      for (let i = soDeTu - 1; i >= 0; i--) noi(the, `s${i}`, ['a', 'b', 'c'][p.cau.dung]!, t + 100, r);
      for (let x = t; x < t + NHIP_LIVE.hoi + 500; x += 250) ds.push(...buoc(the, x, r));
      return { lk: the.nguoi.get('s0')!.lk, ch: ds.filter((s) => s.k === 'cong-huong').length };
    };
    // s0 trả lời cuối cùng nên không có thưởng nhanh khi phòng từ 4 người: 10 gốc + liên kết.
    expect(lk(1).lk).toBe(10 + 6 + 3); // một mình: nhanh nhất +6, 5 trưởng lão × 0,5 → +3 (làm tròn)
    expect(lk(8).lk).toBe(10 + 5); // 8 đồng môn cùng đúng: cộng hưởng chạm trần +5
    expect(lk(8).ch).toBe(1);
  });
});

describe('phòng vắng', () => {
  it('một người chơi một mình vẫn có đối thủ: thần binh đánh bù cho phe trống', () => {
    const r = hat(11);
    const the = taoThe(0, { ...xa, luDau: 3_000 });
    noi(the, 'a', 'núi', 100, r);
    the.nguoi.get('a')!.canCo = null;
    let t = toi(the, 'lu', r);
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    const het = p.den;
    for (; t < het; t += 250) {
      if ((t - 100) % 1250 === 0) noi(the, 'a', 'đẩy', t, r);
      buoc(the, t, r);
    }
    expect(p.thuy).toBeGreaterThan(5);
    expect(p.binh.thuy).toBeGreaterThan(5);
    // Người chăm gõ thì thắng thần binh.
    expect(p.son).toBeGreaterThan(p.thuy);
  });

  it('một người lười thì thua thần binh', () => {
    const r = hat(12);
    const the = taoThe(0, { ...xa, luDau: 3_000 });
    noi(the, 'a', 'núi', 100, r);
    let t = toi(the, 'lu', r);
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    noi(the, 'a', 'đẩy', t + 10, r);
    for (const het = p.den; t < het; t += 250) buoc(the, t, r);
    expect(p.thuy).toBeGreaterThan(p.son);
  });

  it('yêu tinh ở phòng một người: máu vừa sức', () => {
    const r = hat(13);
    const the = taoThe(0, { ...xa, yeuDau: 3_000 });
    noi(the, 'a', 'núi', 100, r);
    toi(the, 'yeu', r);
    const p = the.pha;
    if (p.k !== 'yeu') throw new Error();
    expect(p.mauMax).toBeLessThanOrEqual(300);
  });

  it('độ kiếp: số hộ pháp cần không vượt quá số đồng đạo đang có mặt', () => {
    const r = hat(14);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi', 100, r);
    noi(the, 'b', 'núi', 100, r);
    expect(hoPhapCan(the, 9, 200)).toBe(1);
    for (let i = 0; i < 10; i++) noi(the, `k${i}`, 'nước', 100, r);
    expect(hoPhapCan(the, 9, 200)).toBe(8);
  });
});
