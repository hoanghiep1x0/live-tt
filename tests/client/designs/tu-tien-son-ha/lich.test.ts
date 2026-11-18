import { describe, expect, it } from 'vitest';
import { denGio, docLich, sapToi } from '../../../../client/designs/tu-tien-son-ha/src/loi/lich';
import {
  buoc,
  datLich,
  HOI_THI_SO_CAU,
  nhanTin,
  NHIP_LIVE,
  suKienKe,
  taoThe,
  type Nhip,
  type The,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import { LINH_VAT, YEU } from '../../../../client/designs/tu-tien-son-ha/src/loi/the-gioi';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// Múi giờ Việt Nam: getTimezoneOffset() = -420.
const VN = -420;
/** Mốc thật của giờ địa phương VN. 2026-11-22 là Chủ nhật. */
const luc = (iso: string) => Date.parse(`${iso}+07:00`);
const xa: Nhip = { ...NHIP_LIVE, luDau: 1e12, yeuDau: 1e12, mua: 1e12 };

function noi(the: The, user: string, text: string, now: number, r: () => number) {
  return nhanTin(the, { kind: 'comment', user, ten: user, text }, now, r);
}

describe('docLich', () => {
  it('đọc giờ, ngày, loại; bỏ dòng trống và chú thích', () => {
    const { ds, loi } = docLich('20:00 cn dai-yeu\n\n# ghi chú\n21h hằng-ngày hoi-thi\n12:30 t7,cn phuc-loc');
    expect(loi).toEqual([]);
    expect(ds.map((d) => [d.gio, d.phut, d.thu, d.loai])).toEqual([
      [20, 0, [0], 'dai-yeu'],
      [21, 0, [], 'hoi-thi'],
      [12, 30, [0, 6], 'phuc-loc'],
    ]);
  });

  it('dòng sai thì báo lỗi, dòng đúng vẫn nhận', () => {
    const { ds, loi } = docLich('25:00 cn dai-yeu\n20:00 t9 dai-lu\n20:00 cn bay-len\n19:00 cn dai-lu');
    expect(ds).toHaveLength(1);
    expect(loi).toHaveLength(3);
  });
});

describe('denGio / sapToi', () => {
  const { ds } = docLich('20:00 cn dai-yeu');

  it('tới giờ đúng ngày thì báo, sai ngày thì không', () => {
    expect(denGio(ds, luc('2026-11-22T20:00:30'), VN, new Set())).toHaveLength(1);
    expect(denGio(ds, luc('2026-11-21T20:00:30'), VN, new Set())).toHaveLength(0);
  });

  it('mở phòng trễ vài phút vẫn bắt kịp; trễ quá 10 phút thì bỏ', () => {
    expect(denGio(ds, luc('2026-11-22T20:09:00'), VN, new Set())).toHaveLength(1);
    expect(denGio(ds, luc('2026-11-22T20:11:00'), VN, new Set())).toHaveLength(0);
  });

  it('đã chạy thì không chạy lại', () => {
    const [mot] = denGio(ds, luc('2026-11-22T20:00:30'), VN, new Set());
    expect(denGio(ds, luc('2026-11-22T20:02:00'), VN, new Set([mot!.khoa]))).toHaveLength(0);
  });

  it('lần kế tiếp tính đúng sang tuần sau', () => {
    const k = sapToi(ds, luc('2026-11-22T21:00:00'), VN)!;
    expect(k.luc).toBe(luc('2026-11-29T20:00:00'));
  });
});

describe('Sự kiện theo lịch trong lõi', () => {
  function san(lich: string, now: number) {
    const r = hat(5);
    const the = taoThe(now - 60_000, xa);
    datLich(the, docLich(lich).ds, VN);
    for (let i = 0; i < 4; i++) noi(the, `k${i}`, i % 2 ? 'nước' : 'núi', now - 30_000, r);
    return { the, r };
  }

  it('báo trước 15 phút trên đầu màn', () => {
    const { the } = san('20:00 cn dai-yeu', luc('2026-11-22T19:50:00'));
    const ke = suKienKe(the, luc('2026-11-22T19:50:00'));
    expect(ke).toMatchObject({ ten: 'Đại Yêu Dạ', dacBiet: true });
  });

  it('20h Chủ nhật mở Đại Yêu Dạ với Tam Yêu, máu gấp ba', () => {
    const t0 = luc('2026-11-22T20:00:00');
    const { the, r } = san('20:00 cn dai-yeu', t0);
    let t = t0;
    while (the.pha.k !== 'yeu' && t < t0 + 120_000) {
      t += 250;
      for (let i = 0; i < 4; i++) the.nguoi.get(`k${i}`)!.lanCuoi = t;
      buoc(the, t, r);
    }
    expect(the.pha.k).toBe('yeu');
    if (the.pha.k !== 'yeu') return;
    expect(the.pha.yeu).toBe('tam');
    expect(the.pha.dai).toBe(true);
    expect(the.pha.mauMax).toBeGreaterThanOrEqual(2000);
  });

  it('Hội thi Ngọc Phả: tám câu khó liền, đúng được gấp đôi', () => {
    const t0 = luc('2026-11-22T21:00:00');
    const { the, r } = san('21:00 hang-ngay hoi-thi', t0);
    const thi: number[] = [];
    let t = t0;
    while (thi.length < HOI_THI_SO_CAU + 1 && t < t0 + 30 * 60_000) {
      t += 250;
      for (const s of buoc(the, t, r)) if (s.k === 'pha' && s.pha === 'hoi' && the.pha.k === 'hoi') thi.push(the.pha.thi);
    }
    expect(thi).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  });
});

describe('Kinh Thư: logic truyền thuyết', () => {
  it('Ngư Tinh sợ phe Núi, Hồ Tinh sợ phe Nước, Mộc Tinh không ai khắc', () => {
    expect(YEU.ngu.khac).toBe('son');
    expect(YEU.ho.khac).toBe('thuy');
    expect(YEU.moc.khac).toBeNull();
  });

  it('mỗi phe bốn linh vật; ba sính lễ của Sơn Tinh thuộc phe Núi', () => {
    expect(LINH_VAT.filter((l) => l.phe === 'son')).toHaveLength(4);
    expect(LINH_VAT.filter((l) => l.phe === 'thuy')).toHaveLength(4);
    for (const id of ['voi', 'ga', 'ngua']) expect(LINH_VAT.find((l) => l.id === id)!.phe).toBe('son');
  });

  it('hạ yêu tinh: chỉ nhận linh vật của phe mình', () => {
    const r = hat(9);
    const the = taoThe(0, { ...xa, yeuDau: 0 });
    noi(the, 'son1', 'núi', 10, r);
    noi(the, 'thuy1', 'nước', 10, r);
    for (let t = 0; t < 4000; t += 250) buoc(the, t, r);
    expect(the.pha.k).toBe('yeu');
    let t = 4000;
    while (the.pha.k === 'yeu') {
      noi(the, 'son1', 'đánh', t, r);
      noi(the, 'thuy1', 'đánh', t, r);
      t += 2000;
    }
    for (const [u, phe] of [['son1', 'son'], ['thuy1', 'thuy']] as const) {
      for (const id of the.nguoi.get(u)!.linhVat) expect(LINH_VAT.find((l) => l.id === id)!.phe).toBe(phe);
    }
  });
});
