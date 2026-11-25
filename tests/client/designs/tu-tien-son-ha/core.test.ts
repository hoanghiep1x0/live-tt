import { describe, expect, it } from 'vitest';
import {
  buoc,
  napHoSo,
  nhanTin,
  NHIP_LIVE,
  phienMoi,
  taoThe as taoThe0,
  xuatHoSo,
  type Nhip,
  type The,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/core';

/** Các test này kiểm luật câu đố lúc tu luyện (nay mặc định tắt, `cauTl`) — bật lại để vẫn kiểm được. */
const taoThe = (...a: Parameters<typeof taoThe0>) => {
  const t = taoThe0(...a);
  t.cauTl = true;
  return t;
};
import { docLenh } from '../../../../client/designs/tu-tien-son-ha/src/loi/lenh';
import { HO_LK, HO_THACH, KIEP_ROT, KIEP_TU, nhapMonThang } from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
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
const xa: Nhip = { ...NHIP_LIVE, nmDau: 1e12, luDau: 1e9, yeuDau: 1e9, mua: 1e9 };

function chay(the: The, tu: number, den: number, rand: () => number) {
  for (let t = tu; t <= den; t += 250) buoc(the, t, rand);
}

function noi(the: The, user: string, text: string, now: number, rand: () => number) {
  const l = docLenh(text);
  if (l.k === 'phe' && the.pha.k !== 'nm' && (the.nguoi.get(user)?.phe ?? null) === null) {
    return nhapMonThang(the, { kind: 'comment', user, ten: user.toUpperCase(), text }, l.phe, l.gioi, now, rand);
  }
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
    chay(the, t, t + NHIP_LIVE.hoi + 500, r);
    // Đủ linh khí rồi vẫn chưa độ kiếp: phải tự gõ "đột phá".
    expect(n.choKiep).toBe(false);
    noi(the, 'lan', 'đột phá', t + NHIP_LIVE.hoi + 600, r);
    chay(the, t + NHIP_LIVE.hoi + 600, t + NHIP_LIVE.hoi + NHIP_LIVE.dap + NHIP_LIVE.nghi + 1000, r);
    return { the, r, n };
  }

  it('chạm ngưỡng Nguyên Anh thì dừng ở bình cảnh và lên độ kiếp', () => {
    const { the, n } = sanKiep(11);
    expect(n.lk).toBe(CANH_GIOI[4]!.can);
    expect(n.canh).toBe(3);
    expect(the.pha.k).toBe('kiep');
  });

  /** Chạy tới sát giờ phán, rồi phán với chuỗi số ngẫu nhiên định sẵn (số 1: tự vượt, số 2: rớt cảnh giới…). */
  function phan(the: The, ds: number[]) {
    const p = the.pha;
    if (p.k !== 'kiep') throw new Error('chưa vào kiếp');
    chay(the, p.den - 5000, p.den - 250, () => 0.9);
    let i = 0;
    buoc(the, p.den, () => ds[Math.min(i++, ds.length - 1)]!);
  }

  it('đủ hộ pháp (gõ 1 / 2 / 3, A hay "độ") thì chắc qua, cả phòng được Phúc Lộc, hộ pháp có quà', () => {
    const { the, r, n } = sanKiep(13);
    const p = the.pha;
    if (p.k !== 'kiep') throw new Error('chưa vào kiếp');
    const t = p.den - NHIP_LIVE.kiep + 1000;
    noi(the, 'a1', '1', t, r);
    noi(the, 'a2', 'A', t, r);
    noi(the, 'a3', 'độ', t, r);
    noi(the, 'lan', '2', t, r);
    expect(p.ho.has('a1') && p.ho.has('a2') && p.ho.has('a3')).toBe(true);
    expect(p.ho.has('lan')).toBe(false);
    const thach = the.nguoi.get('a2')!.tinChi;
    // Hộ pháp: a1 +linh khí (0.9), a2 trúng cơ duyên linh thạch (0.01), a3 +linh khí.
    phan(the, [0.9, 0.01, 0.9]);
    expect(the.pha.k).toBe('kiep-ket');
    expect(n.canh).toBe(4);
    expect(the.phucLoc).toBe(2);
    expect(the.nguoi.get('a1')!.lk).toBeGreaterThanOrEqual(HO_LK * 2);
    expect(the.nguoi.get('a2')!.tinChi).toBeGreaterThanOrEqual(thach + HO_THACH * 2);
  });

  it('thiếu hộ pháp, vận không tới thì ngã kiếp: giữ cảnh giới và linh khí (thường), phải chờ', () => {
    const { the, n } = sanKiep(17);
    const lk = n.lk;
    phan(the, [0.9, 0.9]);
    expect(n.canh).toBe(3);
    expect(n.lk).toBe(lk);
    expect(n.kiepLai).toBeGreaterThan(0);
  });

  it('ngã kiếp hiếm khi (KIEP_ROT) rớt một cảnh giới', () => {
    const { the, n } = sanKiep(17);
    phan(the, [0.9, KIEP_ROT / 2]);
    expect(n.canh).toBe(2);
    expect(n.lk).toBe(CANH_GIOI[2]!.can);
    const k = the.pha;
    expect(k.k === 'kiep-ket' && k.rot).toBe(true);
  });

  it('thiếu hộ pháp vẫn có cơ may tự vượt (KIEP_TU), không có Phúc Lộc', () => {
    const { the, n } = sanKiep(19);
    phan(the, [KIEP_TU / 2]);
    expect(n.canh).toBe(4);
    expect(the.phucLoc).toBe(0);
    const k = the.pha;
    expect(k.k === 'kiep-ket' && k.qua && !k.nhoHo).toBe(true);
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
    // Giữa hai kiếp luôn có việc khác (yêu tinh trước), và hai lượt kiếp cách nhau ít nhất `kiepCach`.
    expect(thuTu.slice(0, 2)).toEqual(['kiep', 'yeu']);
    expect(thuTu.some((x, i) => x === 'kiep' && thuTu[i - 1] === 'kiep')).toBe(false);
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

  it('phe ra tay nhiều hơn hẳn thì thắng (có khi phá trận sớm), mực nước đổi theo; phe ít người có thần binh đánh bù', () => {
    const r = hat(24);
    const the = taoThe(0, { ...xa, luDau: 0 });
    for (const u of ['s1', 's2', 's3']) noi(the, u, 'núi', 10, r);
    noi(the, 't1', 'nước', 10, r);
    chay(the, 0, 4000, r);
    const p = the.pha;
    if (p.k !== 'lu') throw new Error();
    noi(the, 't1', 'đẩy', 4000, r); // ra tay một lần rồi thôi
    let ket: typeof the.pha | null = null;
    // Không hết giờ: đánh tới khi một phe cạn trận khí (kiệt sức sau 4 phút bảo đảm trận kết trước ~7,5 phút).
    for (let t = 4000; t < 4000 + 9 * 60_000 && ket === null; t += 250) {
      if ((t - 4000) % 1250 === 0 && the.pha.k === 'lu') for (const u of ['s1', 's2', 's3']) noi(the, u, 'lên', t, r);
      buoc(the, t, r);
      if (the.pha.k === 'lu-ket') ket = the.pha;
    }
    expect(ket?.k).toBe('lu-ket');
    if (ket?.k === 'lu-ket') expect(ket.thang).toBe('son');
    // Thần binh có đánh bù cho phe Nước.
    expect(p.binh.thuy).toBeGreaterThan(5);
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

  /** Mở trận yêu tinh với ba đệ tử Sơn Tông đã ra tay một đòn. */
  function moTranYeu(seed: number) {
    const r = hat(seed);
    const the = taoThe(0, { ...xa, yeuDau: 0 });
    for (let i = 0; i < 3; i++) noi(the, `k${i}`, 'núi', 10, r);
    chay(the, 0, 4000, r);
    for (let i = 0; i < 3; i++) noi(the, `k${i}`, 'đánh', 4000, r);
    if (the.pha.k !== 'yeu') throw new Error('chưa vào trận yêu tinh');
    return { the, r, pha: the.pha };
  }
  const tim = (the: The, user: string, now: number, r: () => number) =>
    nhanTin(the, { kind: 'like', user, ten: user.toUpperCase(), count: 1 }, now, r);

  it('hết máu màn 1 thì Cuồng Bạo; hạ tiếp thì phe hạ yêu được thưởng một lần', () => {
    const { the, r, pha } = moTranYeu(41);
    pha.mau = 1;
    noi(the, 'k0', 'đánh', 7000, r);
    expect(the.pha.k).toBe('yeu');
    expect(pha.cuong).toBe(true);
    expect(pha.mau).toBe(pha.mauMax);
    const truoc = [0, 1, 2].map((i) => the.nguoi.get(`k${i}`)!.tinChi);
    pha.mau = 1;
    noi(the, 'k1', 'đánh', 9000, r);
    expect(the.pha.k).toBe('yeu-ket');
    if (the.pha.k !== 'yeu-ket') return;
    expect(the.pha.thang).toBe(true);
    expect(the.pha.pheHa).toBe('son');
    expect(the.pha.thuong?.thach).toBe(100);
    [0, 1, 2].forEach((i) => expect(the.nguoi.get(`k${i}`)!.tinChi).toBeGreaterThanOrEqual(truoc[i]! + 100));
  });

  it('tim hồi 90% máu vừa mất; tim dư tiếp sức người mạnh nhất phe', () => {
    const { the, r, pha } = moTranYeu(43);
    the.nguoi.get('k0')!.canh = 5;
    // k1 vừa trúng đòn mất 10 máu: một tim hồi 9.
    pha.hp.set('k1', 290);
    pha.hoiDuoc.set('k1', 9);
    const ra = tim(the, 'k1', 5000, r);
    expect(pha.hp.get('k1')).toBe(299);
    expect(ra.some((s) => s.k === 'hoi-mau' && s.user === 'k1' && s.mau === 9)).toBe(true);
    // Hết máu để hồi: tim dư sang người mạnh nhất phe (k0), +1% sát thương.
    const ra2 = tim(the, 'k1', 5100, r);
    expect(ra2.some((s) => s.k === 'buff' && s.tu === 'k1' && s.toi === 'k0' && s.so === 1)).toBe(true);
    tim(the, 'k2', 5200, r);
    expect(pha.buff.get('k0')?.so).toBe(2);
    expect(pha.buff.get('k0')?.nguoi.size).toBe(2);
  });

  it('Cuồng Bạo đồ sát: không ai thả tim thì cả đội ngã, yêu tinh thắng', () => {
    const { the, r, pha } = moTranYeu(47);
    pha.mau = 1;
    noi(the, 'k0', 'đánh', 7000, r);
    expect(pha.cuong).toBe(true);
    let t = 7000;
    while (the.pha.k === 'yeu' && t < 400_000) {
      t += 250;
      buoc(the, t, r);
    }
    expect(the.pha.k).toBe('yeu-ket');
    if (the.pha.k !== 'yeu-ket') return;
    expect(the.pha.thang).toBe(false);
    expect(the.pha.doSat).toBe(true);
  });

  it('ngã rồi thả tim kịp thì gượng dậy', () => {
    const { the, r, pha } = moTranYeu(53);
    pha.hp.set('k2', 0);
    pha.hoiDuoc.set('k2', 40);
    pha.nga.set('k2', 5000);
    const ra = tim(the, 'k2', 6000, r);
    expect(pha.nga.has('k2')).toBe(false);
    expect(pha.hp.get('k2')).toBe(40);
    expect(ra.some((s) => s.k === 'hoi-mau' && s.day)).toBe(true);
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
