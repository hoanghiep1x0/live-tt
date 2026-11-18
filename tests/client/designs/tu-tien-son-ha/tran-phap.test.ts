import { describe, expect, it } from 'vitest';
import {
  buoc,
  hoiChieu,
  hoPhapCan,
  napHoSo,
  npcCua,
  soNpc,
  nhanTin,
  NHIP_LIVE,
  taoThe,
  xuatHoSo,
  type Nhip,
  type Su,
  type The,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import { docLenh } from '../../../../client/designs/tu-tien-son-ha/src/loi/lenh';
import { CAN_CO_DS } from '../../../../client/designs/tu-tien-son-ha/src/loi/the-gioi';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const xa: Nhip = { ...NHIP_LIVE, luDau: 1e9, yeuDau: 1e9, mua: 1e9, meDau: 1e9 };

function noi(the: The, user: string, text: string, now: number, r: () => number): Su[] {
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

describe('Trận Pháp trong Đại Chiến', () => {
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

  it('đủ người cùng hô thì kết trận: lượt đầu thần ban miễn phí, lượt sau tốn 10 Linh Mạch', () => {
    const { the, r, t, p } = san(4);
    the.linhMach.son = 25;
    const ds = noi(the, 's0', 'công', t + 10, r);
    expect(ds.some((s) => s.k === 'ky-nang' && s.ky === 'cong' && s.phe === 'son')).toBe(true);
    expect(the.linhMach.son).toBe(25); // miễn phí
    expect(p.tran.hl.son.cong).toBeGreaterThan(t);
    const ds2 = noi(the, 's0', 'thủ', t + 1500, r);
    expect(ds2.some((s) => s.k === 'ky-nang' && s.ky === 'thu')).toBe(true);
    expect(the.linhMach.son).toBe(15);
  });

  it('hết lượt miễn phí mà không đủ Linh Mạch thì không kết được', () => {
    const { the, r, t } = san(5);
    noi(the, 's0', 'công', t + 10, r);
    const ds = noi(the, 's0', 'thủ', t + 1500, r);
    expect(ds.some((s) => s.k === 'ky-nang')).toBe(false);
  });

  it('mỗi trận pháp hồi chiêu 20 giây', () => {
    const { the, r, t, p } = san(6);
    the.linhMach.son = 100;
    noi(the, 's0', 'công', t + 10, r);
    expect(hoiChieu(p, 'son', 'cong', t + 5_000)).toBeGreaterThan(0);
    const ds = noi(the, 's0', 'công', t + 5_000, r);
    expect(ds.some((s) => s.k === 'ky-nang')).toBe(false);
    expect(hoiChieu(p, 'son', 'cong', t + 21_000)).toBe(0);
  });

  it('trận Công làm đòn nặng ×1,3; trận Thủ của địch làm đòn nhẹ ×0,7; Phá xoá khiên', () => {
    const { the, r, t, p } = san(7, 1);
    the.linhMach.son = 100;
    the.linhMach.thuy = 100;
    // Đòn thường.
    noi(the, 's0', 'đẩy', t + 10, r);
    const thuong = p.son;
    noi(the, 's0', 'công', t + 1300, r); // cú này đẩy trước, rồi mới kết trận
    const truoc = p.son;
    noi(the, 's0', 'đẩy', t + 2600, r);
    const coCong = p.son - truoc;
    expect(coCong / thuong).toBeGreaterThan(1.2);
    // Phe Nước dựng khiên.
    noi(the, 't0', 'thủ', t + 2700, r);
    const truoc2 = p.son;
    noi(the, 's0', 'đẩy', t + 3900, r);
    expect((p.son - truoc2) / coCong).toBeLessThan(0.8);
    // Phá khiên.
    noi(the, 's0', 'phá', t + 5200, r);
    expect(p.tran.hl.thuy.thu).toBe(0);
    expect(p.tran.hl.thuy.vo).toBeGreaterThan(t + 5200);
  });

  it('trận Hồi trả lại trận khí cho phe mình', () => {
    const { the, r, t, p } = san(8, 1);
    for (let i = 0; i < 6; i++) noi(the, 't0', 'đẩy', t + 10 + i * 1300, r);
    const truoc = p.thuy;
    noi(the, 's0', 'hồi', t + 9000, r);
    expect(p.thuy).toBeLessThan(truoc);
  });

  it('tặng quà kết ngay trận pháp theo căn cơ, không cần đủ người hô và không tốn Linh Mạch', () => {
    const { the, r, t, p } = san(9, 3);
    the.nguoi.get('s0')!.canCo = 'y';
    for (let i = 0; i < 3; i++) noi(the, `t${i}`, 'đẩy', t + 10, r);
    p.tran.mien.son = 0;
    const ds = nhanTin(the, { kind: 'gift', user: 's0', ten: 'S0', text: 'Hoa hồng', count: 1, xu: 1 }, t + 50, r);
    expect(ds.some((s) => s.k === 'ky-nang' && s.ky === 'hoi' && s.nguon === 'qua')).toBe(true);
    expect(the.linhMach.son).toBe(0);
  });

  it('cạn trận khí thì bị phá trận, thua ngay', () => {
    const { the, r, t, p } = san(10, 1);
    p.son = p.H + 1;
    const ds = buoc(the, t + 300, r);
    expect(ds.some((s) => s.k === 'pha-tran' && s.thang === 'son')).toBe(true);
    buoc(the, t + 600, r);
    expect(the.pha.k).toBe('lu-ket');
  });
});

describe('tự chia phe cho cân', () => {
  it('gõ "vào", "nam", "nữ" thì được xếp vào phe đang ít người hơn', () => {
    const r = hat(20);
    const the = taoThe(0, xa);
    noi(the, 'a', 'vào', 100, r);
    noi(the, 'b', 'nữ', 110, r);
    noi(the, 'c', 'tham gia', 120, r);
    noi(the, 'd', 'nam', 130, r);
    const dem = { son: 0, thuy: 0 };
    for (const n of the.nguoi.values()) dem[n.phe!]++;
    expect(dem).toEqual({ son: 2, thuy: 2 });
    expect(the.nguoi.get('b')!.gioi).toBe('nu');
  });

  it('Đại Chiến mở thì khách đang có mặt được tự xếp phe cho cân', () => {
    const r = hat(21);
    const the = taoThe(0, { ...xa, luDau: 3_000 });
    noi(the, 'a', 'núi', 100, r);
    for (const u of ['k1', 'k2', 'k3']) noi(the, u, 'xin chào', 100, r);
    toi(the, 'lu', r);
    const dem = { son: 0, thuy: 0 };
    for (const n of the.nguoi.values()) dem[n.phe!]++;
    expect(dem).toEqual({ son: 2, thuy: 2 });
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
