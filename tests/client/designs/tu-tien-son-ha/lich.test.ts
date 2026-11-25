import { describe, expect, it } from 'vitest';
import { denGio, docLich, sapToi } from '../../../../client/designs/tu-tien-son-ha/src/loi/lich';
import { docChuoi } from '../../../../client/designs/tu-tien-son-ha/src/cai-dat';
import {
  buoc,
  datLich,
  datTheoLich,
  datChuoi,
  type Su,
  lichSapToi,
  HOI_THI_SO_CAU,
  nhanTin,
  NHIP_LIVE,
  suKienKe,
  taoThe as taoThe0,
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
import { nhapMonThang } from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
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
const xa: Nhip = { ...NHIP_LIVE, nmDau: 1e12, luDau: 1e12, yeuDau: 1e12, mua: 1e12 };

function noi(the: The, user: string, text: string, now: number, r: () => number) {
  const l = docLenh(text);
  if (l.k === 'phe' && the.pha.k !== 'nm' && (the.nguoi.get(user)?.phe ?? null) === null) {
    return nhapMonThang(the, { kind: 'comment', user, ten: user, text }, l.phe, l.gioi, now, r);
  }
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

describe('Lịch trình hằng ngày', () => {
  it('đọc việc, phe đánh boss và dòng lặp mỗi giờ', () => {
    const { ds, loi } = docLich('xx:05 moi-gio ai\n19:20 hang-ngay yeu-ngu son\n20:20 hang-ngay yeu-ho thuy\n21:00 hang-ngay yeu-moc ca\n20:45 hang-ngay pk\n20:10 t2 dia-cung');
    expect(loi).toEqual([]);
    expect(ds.map((d) => [d.loai, d.phe, d.moiGio])).toEqual([
      ['ai', null, true],
      ['yeu-ngu', 'son', false],
      ['yeu-ho', 'thuy', false],
      ['yeu-moc', null, false],
      ['pk', null, false],
      ['dia-cung', null, false],
    ]);
    expect(docLich('xx:05 hang-ngay ai').loi.length).toBe(1);
    expect(docLich('20:00 hang-ngay yeu-ngu tim').loi.length).toBe(1);
  });

  it('dòng moi-gio chạy mỗi giờ đúng phút', () => {
    const { ds } = docLich('xx:05 moi-gio ai');
    expect(sapToi(ds, luc('2026-11-22T19:50:00'), VN)!.luc).toBe(luc('2026-11-22T20:05:00'));
    expect(sapToi(ds, luc('2026-11-22T20:04:00'), VN)!.luc).toBe(luc('2026-11-22T20:05:00'));
    expect(denGio(ds, luc('2026-11-22T20:06:00'), VN, new Set()).length).toBe(1);
  });

  it('chạy theo lịch: tới giờ thì Sơn Tông đánh Ngư Tinh, Thủy Tông chỉ đứng xem; không có yêu tinh theo nhịp', () => {
    const t0 = luc('2026-11-22T19:20:00');
    const r = hat(9);
    const the = taoThe(t0 - 60_000, { ...xa, yeuDau: 0 });
    datLich(the, docLich('19:20 hang-ngay yeu-ngu son').ds, VN);
    datTheoLich(the, true);
    noi(the, 's', 'núi', t0 - 30_000, r);
    noi(the, 't', 'nước', t0 - 30_000, r);
    // Trước giờ: dù nhịp yêu tinh đã tới, chạy theo lịch thì không mở.
    for (let t = t0 - 50_000; t < t0 - 1_000; t += 250) buoc(the, t, r);
    expect(the.pha.k).not.toBe('yeu');
    let t = t0;
    while (the.pha.k !== 'yeu' && t < t0 + 120_000) {
      buoc(the, (t += 250), r);
      for (const u of ['s', 't']) the.nguoi.get(u)!.lanCuoi = t;
    }
    const p = the.pha;
    if (p.k !== 'yeu') throw new Error('không mở yêu tinh');
    expect(p.yeu).toBe('ngu');
    expect(p.phe).toBe('son');
    noi(the, 't', 'đánh', t + 100, r);
    expect(p.dmg.has('t')).toBe(false);
    noi(the, 's', 'đánh', t + 200, r);
    expect(p.dmg.has('s') || p.dmg.size === 0).toBe(true);
  });

  it('bảng lịch trình liệt kê việc sắp tới theo giờ', () => {
    const the = taoThe(0, xa);
    datLich(the, docLich('xx:05 moi-gio ai\n20:45 hang-ngay pk').ds, VN);
    const ds = lichSapToi(the, luc('2026-11-22T20:00:00'), 4);
    expect(ds.map((x) => x.ten)).toEqual(['Thử Thách Nhập Môn', 'Nước Dâng Đoạt Mị Nương', 'Thử Thách Nhập Môn', 'Thử Thách Nhập Môn']);
  });
});

describe('Chuỗi sự kiện nối tiếp', () => {
  it('thẻ mặc định: lịch mỗi giờ :00 Ải · :15 PK · :25 mê cung · :30 Thành Trì · :40 Lôi Đài · :45 Boss · :55 mê cung', () => {
    const c = docChuoi({});
    expect(c.nghi).toBe(3 * 60_000);
    expect(c.ds.map((m) => `${m.batDau}:${m.viec}`)).toEqual(['0:ai', '15:pk', '25:dia-cung', '30:cho', '40:loi-dai', '45:yeu-luan', '55:dia-cung']);
    // Danh sách lưu từ bản cũ (chưa có phút bắt đầu) thì dùng lịch chuẩn.
    expect(docChuoi({ chuoi: [{ id: 'a', viec: 'pk' }] }).ds).toEqual(c.ds);
    const c2 = docChuoi({
      nghiPhut: 2,
      chuoi: [
        { id: 'b', viec: 'pk', batDau: -1 },
        { id: 'a', viec: 'ai', bao: 'Vào ải nào!', batDau: 5 },
      ],
    });
    expect(c2).toEqual({
      nghi: 2 * 60_000,
      ds: [
        { viec: 'pk', phut: 0, bao: '', batDau: -1 },
        { viec: 'ai', phut: 0, bao: 'Vào ải nào!', batDau: 5 },
      ],
    });
  });

  it('10 giây trước: thông báo (câu sửa tay), tới giờ mở sự kiện; xong thì nghỉ rồi tới sự kiện kế', () => {
    const t0 = 1_000_000;
    const r = hat(41);
    const the = taoThe(t0, xa);
    datChuoi(the, { nghi: 60_000, ds: [{ viec: 'ai', phut: 0, bao: 'Ải sắp mở, gõ Nam S!' }, { viec: 'yeu-ngu-son', phut: 2, bao: '' }] }, t0);
    datTheoLich(the, true, t0);
    noi(the, 's', 'núi', t0 + 1000, r);
    noi(the, 'k', 'xin chào', t0 + 1000, r);
    const ds: Su[] = [];
    let t = t0;
    while (the.pha.k !== 'nm' && t < t0 + 3 * 60_000) {
      ds.push(...buoc(the, (t += 250), r));
      for (const u of ['s', 'k']) the.nguoi.get(u)!.lanCuoi = t;
    }
    const bao = ds.find((x) => x.k === 'bao-truoc');
    expect(bao).toMatchObject({ chu: 'Ải sắp mở, gõ Nam S!' });
    expect(t - t0).toBeGreaterThanOrEqual(60_000);
    expect(t - t0).toBeLessThan(60_000 + 20_000);
    // Hết Ải: nghỉ 1 phút, 10 giây trước có câu mặc định cho Ngư Tinh, rồi Sơn Tông đánh Ngư Tinh 2 phút.
    const ds2: Su[] = [];
    while (the.pha.k !== 'yeu' && t < t0 + 10 * 60_000) {
      ds2.push(...buoc(the, (t += 250), r));
      for (const u of ['s', 'k']) the.nguoi.get(u)!.lanCuoi = t;
    }
    const p = the.pha;
    if (p.k !== 'yeu') throw new Error('không tới sự kiện kế');
    expect(p).toMatchObject({ yeu: 'ngu', phe: 'son', tong: 2 * 60_000 });
    expect(ds2.find((x) => x.k === 'bao-truoc')).toMatchObject({ chu: expect.stringContaining('Ngư Tinh') });
  });

  it('bảng lịch trình liệt kê chuỗi theo thứ tự, lặp lại khi hết', () => {
    const the = taoThe(0, xa);
    datChuoi(the, { nghi: 60_000, ds: [{ viec: 'ai', phut: 0, bao: '' }, { viec: 'pk', phut: 0, bao: '' }] }, 1000);
    datTheoLich(the, true, 1000);
    const ds = lichSapToi(the, 2000, 4);
    expect(ds.map((x) => x.ten)).toEqual(['Thử Thách Nhập Môn', 'Nước Dâng Đoạt Mị Nương', 'Thử Thách Nhập Môn', 'Nước Dâng Đoạt Mị Nương']);
    expect(ds[0]!.luc).toBe(1000 + 60_000);
  });
});
