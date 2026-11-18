import { describe, expect, it } from 'vitest';
import {
  buoc,
  napHoSo,
  nhanTin,
  NHIP_LIVE,
  phienMoi,
  taoThe,
  xuatHoSo,
  type Nhip,
  type The,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import { CANH_GIOI } from '../../../../client/designs/tu-tien-son-ha/src/loi/the-gioi';
import { BO_CAU, CAU_KHO, bocCau, cauTinh } from '../../../../client/designs/tu-tien-son-ha/src/loi/cau-hoi';

/** Ngẫu nhiên có hạt giống: test chạy lại cho cùng kết quả. */
function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const ABC = ['a', 'b', 'c'];
const xa: Nhip = { ...NHIP_LIVE, luDau: 1e9, yeuDau: 1e9, mua: 1e9 };

function chay(the: The, tu: number, den: number, rand: () => number) {
  for (let t = tu; t <= den; t += 250) buoc(the, t, rand);
}

function noi(the: The, user: string, text: string, now: number, rand: () => number) {
  return nhanTin(the, { kind: 'comment', user, ten: user.toUpperCase(), text }, now, rand);
}

/** Chạy tới khi có câu hỏi, trả về chữ cái đúng và sai. */
function toiCauHoi(the: The, now: number, rand: () => number) {
  let t = now;
  while (the.pha.k !== 'hoi') {
    t += 250;
    buoc(the, t, rand);
    if (t - now > 120_000) throw new Error('không ra câu hỏi');
  }
  const p = the.pha;
  return { t, dung: ABC[p.cau.dung]!, sai: ABC[(p.cau.dung + 1) % 3]! };
}

describe('Thiên Vấn', () => {
  it('đúng được linh khí, ba người nhanh nhất có thưởng thêm, sai thì không', () => {
    const r = hat(3);
    const the = taoThe(0, xa);
    const { t, dung, sai } = toiCauHoi(the, 0, r);
    noi(the, 'lan', dung, t + 100, r);
    noi(the, 'hung', dung, t + 200, r);
    noi(the, 'mai', sai, t + 300, r);
    noi(the, 'mai', dung, t + 400, r); // đổi ý không tính
    chay(the, t, t + NHIP_LIVE.hoi + 500, r);
    expect(the.pha.k).toBe('dap');
    expect(the.nguoi.get('lan')!.lk).toBe(16);
    expect(the.nguoi.get('hung')!.lk).toBe(14);
    expect(the.nguoi.get('mai')!.lk).toBe(0);
  });

  it('chat thường thì là khách, không tự vào phe', () => {
    const r = hat(5);
    const the = taoThe(0, xa);
    for (let i = 0; i < 4; i++) noi(the, `k${i}`, 'xin chào', 1000 + i, r);
    expect([...the.nguoi.values()].every((n) => n.phe === null)).toBe(true);
  });

  it('nhập môn kèm chọn nhân vật nam nữ; chỉ gõ phe thì lấy giới mặc định của phe', () => {
    const r = hat(6);
    const the = taoThe(0, xa);
    noi(the, 'a', 'núi nữ', 1000, r);
    noi(the, 'b', 'nước nam', 1000, r);
    noi(the, 'c', 'nước', 1000, r);
    expect(the.nguoi.get('a')).toMatchObject({ phe: 'son', gioi: 'nu' });
    expect(the.nguoi.get('b')).toMatchObject({ phe: 'thuy', gioi: 'nam' });
    expect(the.nguoi.get('c')).toMatchObject({ phe: 'thuy', gioi: 'nu' });
    noi(the, 'c', 'nam', 2000, r);
    expect(the.nguoi.get('c')!.gioi).toBe('nam');
  });

  it('chọn phe rồi thì 15 phút mới đổi được', () => {
    const r = hat(7);
    const the = taoThe(0, xa);
    noi(the, 'lan', 'núi', 1000, r);
    noi(the, 'lan', 'nước', 2000, r);
    expect(the.nguoi.get('lan')!.phe).toBe('son');
    noi(the, 'lan', 'nước', 1000 + 15 * 60_000, r);
    expect(the.nguoi.get('lan')!.phe).toBe('thuy');
  });
});

describe('Lôi Kiếp', () => {
  function sanKiep(seed: number) {
    const r = hat(seed);
    const the = taoThe(0, xa);
    noi(the, 'lan', 'núi', 100, r);
    const n = the.nguoi.get('lan')!;
    n.canh = 3;
    n.lk = CANH_GIOI[4]!.can - 5;
    const { t, dung } = toiCauHoi(the, 200, r);
    noi(the, 'lan', dung, t + 100, r);
    chay(the, t, t + NHIP_LIVE.hoi + NHIP_LIVE.dap + NHIP_LIVE.nghi + 1000, r);
    return { the, r, n };
  }

  it('chạm ngưỡng Nguyên Anh thì dừng ở bình cảnh và lên độ kiếp', () => {
    const { the, n } = sanKiep(11);
    expect(n.lk).toBe(CANH_GIOI[4]!.can);
    expect(n.canh).toBe(3);
    expect(the.pha.k).toBe('kiep');
  });

  it('trả lời sai nhưng đủ hộ pháp thì vẫn qua, không có Phúc Lộc', () => {
    const { the, r, n } = sanKiep(13);
    const p = the.pha;
    if (p.k !== 'kiep') throw new Error('chưa vào kiếp');
    const t = p.den - NHIP_LIVE.kiep + 1000;
    for (const u of ['a1', 'a2', 'a3']) noi(the, u, 'độ', t, r);
    noi(the, 'lan', ABC[(p.cau.dung + 1) % 3]!, t + 500, r);
    chay(the, t, t + 6000, r);
    expect(the.pha.k).toBe('kiep-ket');
    expect(n.canh).toBe(4);
    expect(the.phucLoc).toBe(0);
    expect(the.nguoi.get('a1')!.lk).toBeGreaterThan(0);
  });

  it('sai và thiếu hộ pháp thì ngã kiếp, mất linh khí, phải chờ', () => {
    const { the, r, n } = sanKiep(17);
    const p = the.pha;
    if (p.k !== 'kiep') throw new Error('chưa vào kiếp');
    const t = p.den - NHIP_LIVE.kiep + 1000;
    noi(the, 'lan', ABC[(p.cau.dung + 1) % 3]!, t, r);
    chay(the, t, t + 6000, r);
    expect(n.canh).toBe(3);
    expect(n.lk).toBeLessThan(CANH_GIOI[4]!.can);
    expect(n.kiepLai).toBeGreaterThan(t);
  });

  it('trả lời đúng thì qua và cả phòng được Phúc Lộc', () => {
    const { the, r, n } = sanKiep(19);
    const p = the.pha;
    if (p.k !== 'kiep') throw new Error('chưa vào kiếp');
    noi(the, 'lan', ABC[p.cau.dung]!, p.den - 20_000, r);
    chay(the, p.den - 20_000, p.den, r);
    expect(n.canh).toBe(4);
    expect(the.phucLoc).toBe(2);
  });
});

describe('Nhịp', () => {
  it('hàng kiếp dài không chặn yêu tinh: giữa hai kiếp luôn có việc khác', () => {
    const r = hat(43);
    const the = taoThe(0, { ...xa, yeuDau: 0 });
    for (let i = 0; i < 4; i++) {
      noi(the, `k${i}`, 'núi', 10, r);
      const n = the.nguoi.get(`k${i}`)!;
      n.canh = 3;
      n.lk = CANH_GIOI[4]!.can;
    }
    the.hangKiep = ['k0', 'k1', 'k2', 'k3'];
    for (const u of the.hangKiep) the.nguoi.get(u)!.choKiep = true;
    const thuTu: string[] = [];
    for (let t = 0; t < 400_000 && thuTu.length < 4; t += 250) {
      for (let i = 0; i < 4; i++) the.nguoi.get(`k${i}`)!.lanCuoi = t;
      for (const s of buoc(the, t, r)) if (s.k === 'pha' && s.pha !== 'cho' && !s.pha.endsWith('ket') && s.pha !== 'dap') thuTu.push(s.pha);
    }
    expect(thuTu).toEqual(['kiep', 'yeu', 'kiep', 'hoi']);
  });
});

describe('Mùa Lũ và Yêu Tinh', () => {
  it('gõ nhanh không được thêm điểm: mỗi người một cú mỗi 1,2 giây', () => {
    const r = hat(23);
    const the = taoThe(0, { ...xa, luDau: 0 });
    noi(the, 'a', 'núi', 10, r);
    noi(the, 'b', 'nước', 10, r);
    the.nguoi.get('a')!.canCo = null;
    the.nguoi.get('b')!.canCo = null;
    chay(the, 0, 4000, r);
    expect(the.pha.k).toBe('lu');
    for (let t = 4000; t < 20_000; t += 100) noi(the, 'a', 'đẩy', t, r); // spam
    for (let t = 4000; t < 20_000; t += 1200) noi(the, 'b', 'lên', t, r); // đều tay
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    // Người spam không hơn người gõ đều tay (người đi sau còn được chút bứt phá).
    expect(p.cong.get('a')!).toBeLessThanOrEqual(p.cong.get('b')! * 1.05);
    expect(p.cong.get('a')!).toBeGreaterThan(p.cong.get('b')! * 0.7);
  });

  it('phe ra tay nhiều hơn hẳn thì thắng, mực nước đổi theo; phe ít người có thần binh đánh bù', () => {
    const r = hat(24);
    const the = taoThe(0, { ...xa, luDau: 0 });
    for (const u of ['s1', 's2', 's3']) noi(the, u, 'núi', 10, r);
    noi(the, 't1', 'nước', 10, r);
    chay(the, 0, 4000, r);
    expect(the.pha.k).toBe('lu');
    noi(the, 't1', 'đẩy', 4000, r); // ra tay một lần rồi thôi
    for (let t = 4000; t < 4000 + NHIP_LIVE.lu; t += 1300) {
      for (const u of ['s1', 's2', 's3']) noi(the, u, 'lên', t, r);
      chay(the, t, t + 1250, r);
    }
    chay(the, 4000 + NHIP_LIVE.lu, 4000 + NHIP_LIVE.lu + 800, r);
    expect(the.pha.k).toBe('lu-ket');
    if (the.pha.k === 'lu-ket') {
      expect(the.pha.thang).toBe('son');
      // Thần binh có đánh bù cho phe Nước: điểm phe Nước lớn hơn hẳn một cú đẩy.
      expect(the.pha.thuy).toBeGreaterThan(10);
    }
    expect(the.muc).toBe(-1);
  });

  it('đánh hết máu yêu tinh thì người kết liễu nhận linh vật', () => {
    const r = hat(29);
    const the = taoThe(0, { ...xa, yeuDau: 0 });
    for (let i = 0; i < 3; i++) noi(the, `k${i}`, 'núi', 10, r);
    chay(the, 0, 4000, r);
    expect(the.pha.k).toBe('yeu');
    let t = 4000;
    while (the.pha.k === 'yeu') {
      for (let i = 0; i < 3; i++) noi(the, `k${i}`, 'đánh', t, r);
      t += 2000;
    }
    expect(the.pha.k).toBe('yeu-ket');
    if (the.pha.k !== 'yeu-ket') return;
    expect(the.pha.thang).toBe(true);
    const tong = [...the.nguoi.values()].reduce((s, n) => s + n.linhVat.length, 0);
    expect(tong).toBeGreaterThanOrEqual(1);
  });
});

describe('Hồ sơ', () => {
  it('xuất rồi nạp lại giữ nguyên tu vi; phiên mới quên chuyện buổi trước', () => {
    const r = hat(31);
    const the = taoThe(0, xa);
    noi(the, 'lan', 'nước', 10, r);
    const n = the.nguoi.get('lan')!;
    n.lk = 250;
    n.canh = 3;
    n.linhVat = ['rua'];
    n.huong = 99;
    const so = JSON.parse(JSON.stringify(xuatHoSo(the)));
    const moi = taoThe(0, xa);
    napHoSo(moi, so);
    expect(moi.nguoi.get('lan')).toMatchObject({ phe: 'thuy', lk: 250, canh: 3, linhVat: ['rua'] });
    phienMoi(the, 5000);
    expect(the.nguoi.get('lan')!.huong).toBe(0);
    expect(the.nguoi.get('lan')!.lk).toBe(250);
  });

  it('sổ hỏng một dòng thì bỏ dòng đó', () => {
    const the = taoThe(0, xa);
    napHoSo(the, { nguoi: { x: null as never, y: { t: 'Y', p: 'lửa' as never, k: 40, c: 99, v: ['khong-co'], d: 2 } } });
    const y = the.nguoi.get('y')!;
    expect(the.nguoi.has('x')).toBe(false);
    expect(y.phe).toBeNull();
    expect(y.canh).toBe(CANH_GIOI.length - 1);
    expect(y.linhVat).toEqual([]);
  });
});

describe('Kho câu hỏi', () => {
  it('mỗi câu có ba đáp án khác nhau', () => {
    for (const b of BO_CAU) for (const d of b.ds) expect(new Set(d.slice(1)).size, d[0]).toBe(3);
    for (const d of CAU_KHO) expect(new Set(d.slice(1)).size, d[0]).toBe(3);
  });

  it('câu tính nhanh đúng phép tính', () => {
    const r = hat(37);
    for (let i = 0; i < 200; i++) {
      const c = cauTinh(r);
      const [a, op, b] = c.hoi.replace(' = ?', '').split(' ');
      const x = Number(a);
      const y = Number(b);
      const kq = op === '×' ? x * y : op === '+' ? x + y : x / y;
      expect(Number(c.dap[c.dung])).toBe(kq);
      expect(new Set(c.dap).size).toBe(3);
    }
  });

  it('không lặp câu trong một vòng kho', () => {
    const r = hat(41);
    const da = new Set<number>();
    const thay = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const c = bocCau(da, r);
      if (c.loai === 'Tính nhanh') continue;
      expect(thay.has(c.hoi), c.hoi).toBe(false);
      thay.add(c.hoi);
    }
  });
});
