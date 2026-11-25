import { describe, expect, it } from 'vitest';
import {
  buoc,
  CHUOI_MAU,
  datChuoi,
  datTheoLich,
  giuMan,
  nhanTin,
  nhayKe,
  nhayMuc,
  thaGiu,
  nhapMonThang,
  NHIP_LIVE,
  taoThe,
  type The,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/core';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const PHUT = 60_000;
const LENH = ['a', 'b', 'c', 'đánh', 'lên', 'xuống', 'trái', 'phải'];

/** Chạy thử một giờ live đủ nhịp thật (NHIP_LIVE) với lịch chuẩn mỗi giờ, phòng có 6 đệ tử hay bình luận
 *  và khách mới vào đều đặn. Ghi lại phút:giây mỗi lần đổi màn. */
function chayMotGio(seed: number) {
  const r = hat(seed);
  const t0 = 1_000_000_000_000;
  const the: The = taoThe(t0, NHIP_LIVE);
  datChuoi(the, CHUOI_MAU, t0);
  datTheoLich(the, false, t0);
  datTheoLich(the, true, t0);
  const deTu = ['s1', 's2', 's3', 't1', 't2', 't3'];
  deTu.forEach((u, i) =>
    nhapMonThang(the, { kind: 'comment', user: u, ten: u.toUpperCase(), text: 'x' }, i < 3 ? 'son' : 'thuy', i % 2 ? 'nu' : 'nam', t0, r),
  );
  const nhatKy: { luc: string; phut: number; k: string }[] = [];
  let truoc = '';
  let khach = 0;
  for (let t = t0; t <= t0 + 61 * PHUT; t += 250) {
    // Đệ tử bình luận mỗi ~3 giây, thả tim thỉnh thoảng; mỗi 2 phút một khách mới lên tiếng.
    if ((t - t0) % 3_000 === 0) {
      for (const u of deTu) nhanTin(the, { kind: 'comment', user: u, ten: u.toUpperCase(), text: LENH[Math.floor(r() * LENH.length)]! }, t, r);
      if (r() < 0.3) nhanTin(the, { kind: 'like', user: deTu[Math.floor(r() * 6)]!, ten: 'x', count: 3 }, t, r);
    }
    if ((t - t0) % (2 * PHUT) === 1_000) {
      khach++;
      nhanTin(the, { kind: 'comment', user: `k${khach}`, ten: `K${khach}`, text: 'chào' }, t, r);
    }
    if (the.pha.k === 'nm' && (t - t0) % 2_000 === 0) {
      for (let i = Math.max(1, khach - 3); i <= khach; i++)
        nhanTin(the, { kind: 'comment', user: `k${i}`, ten: `K${i}`, text: i % 2 ? 'nam s' : 'nữ t' }, t, r);
    }
    buoc(the, t, r);
    if (the.pha.k !== truoc) {
      truoc = the.pha.k;
      const s = Math.round((t - t0) / 1000);
      nhatKy.push({ luc: `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, phut: (t - t0) / PHUT, k: truoc });
    }
  }
  return nhatKy;
}

describe('Chạy thử lịch 1 giờ (NHIP_LIVE, lịch chuẩn)', () => {
  it('các màn mở đúng mốc :00 Ải · :15 PK · :25 mê cung · :30 Thành Trì · :45 Boss · :55 mê cung · :58 tổng kết', () => {
    const nk = chayMotGio(7);
    // In lịch thật đã chạy để đối chiếu bằng mắt.
    console.log(
      nk
        .filter((x) => !['hoi', 'dap', 'cho'].includes(x.k))
        .map((x) => `${x.luc} ${x.k}`)
        .join('\n'),
    );
    const moLuc = (k: string, tu: number, den: number) => nk.find((x) => x.k === k && x.phut >= tu && x.phut < den);
    expect(moLuc('nm', 0, 1)).toBeDefined();
    expect(moLuc('lu', 15, 15.5)).toBeDefined();
    expect(moLuc('me', 25, 26.5)).toBeDefined();
    expect(moLuc('tt', 30, 30.5)).toBeDefined();
    expect(moLuc('yeu', 45, 45.5)).toBeDefined();
    expect(moLuc('me', 55, 56)).toBeDefined();
    expect(moLuc('mua-ket', 58, 59)).toBeDefined();
    // Giờ thứ hai bắt đầu lại bằng Ải.
    expect(moLuc('nm', 60, 61)).toBeDefined();
  });
});

/** Phòng 6 đệ tử chạy theo lịch chuẩn, hay bình luận; trả về hàm chạy tới phút `den` (ghi lại màn từng bước). */
function phong(seed: number) {
  const r = hat(seed);
  const t0 = 2_000_000_000_000;
  const the: The = taoThe(t0, NHIP_LIVE);
  datChuoi(the, CHUOI_MAU, t0);
  datTheoLich(the, false, t0);
  datTheoLich(the, true, t0);
  const deTu = ['s1', 's2', 's3', 't1', 't2', 't3'];
  deTu.forEach((u, i) => nhapMonThang(the, { kind: 'comment', user: u, ten: u, text: 'x' }, i < 3 ? 'son' : 'thuy', 'nam', t0, r));
  let t = t0;
  const da: string[] = [];
  const toi = (phut: number) => {
    for (; t <= t0 + phut * PHUT; t += 250) {
      if ((t - t0) % 3_000 === 0) for (const u of deTu) nhanTin(the, { kind: 'comment', user: u, ten: u, text: LENH[Math.floor(r() * LENH.length)]! }, t, r);
      buoc(the, t, r);
      if (da[da.length - 1] !== the.pha.k) da.push(the.pha.k);
    }
  };
  return { the, r, toi, da, luc: (phut: number) => t0 + phut * PHUT };
}

describe('Điều khiển màn (thanh ngoài khung)', () => {
  it('⏭ Màn kế: sự kiện sắp tới chạy ngay; tới giờ thật của nó không chạy lại', () => {
    const { the, r, toi, da, luc } = phong(11);
    toi(3);
    nhayKe(the, luc(3) + 100, r);
    expect(the.pha.k).toBe('lu');
    da.length = 0;
    toi(24);
    // PK đã chạy sớm (3′ → 13′); tới :15 không mở PK lần nữa, :25 vẫn đúng Tranh Đoạt Bảo Vật.
    // `da` mở đầu bằng trận PK đang chạy; sau đó không có lần mở PK nào nữa.
    expect(da[0]).toBe('lu');
    expect(da.slice(1).filter((k) => k === 'lu')).toEqual([]);
    toi(26);
    expect(da).toContain('me');
  });

  it('⏸ Giữ màn: màn đang chạy lặp lại, lịch không chen; ▶ chạy tiếp thì căn theo giờ thật', () => {
    const { the, r, toi, da, luc } = phong(13);
    toi(16);
    expect(the.pha.k).toBe('lu');
    giuMan(the);
    da.length = 0;
    toi(34);
    // Qua cả :25 và :30 mà vẫn ở Đại Chiến (trận có phe thua thì giữ ở màn kết của trận).
    expect(da.every((k) => k === 'lu' || k === 'lu-ket')).toBe(true);
    // Chạy tiếp lúc :34 — đang trong khung Thành Trì (:30–:40): mở Thành Trì, kết đúng :40.
    thaGiu(the, luc(34), r);
    expect(the.pha.k).toBe('tt');
    if (the.pha.k !== 'tt') return;
    expect(Math.abs(the.pha.den - luc(40))).toBeLessThanOrEqual(60_000);
    toi(46);
    expect(da).toContain('yeu');
  });

  it('▶ Chạy tiếp giữa hai mốc: về tu luyện, chờ mục kế đúng giờ', () => {
    const { the, r, toi, luc } = phong(17);
    toi(16);
    giuMan(the);
    toi(42);
    thaGiu(the, luc(42), r);
    expect(['cho', 'hoi', 'dap', 'lu-ket']).toContain(the.pha.k);
    toi(45.5);
    expect(the.pha.k).toBe('yeu');
  });
});

describe('Đại Chiến: diễn biến, thưởng và chiến thương', () => {
  it('hai phe đều tung chiêu diện rộng; kết trận người ra sức được linh thạch, mang chiến thương', () => {
    const { the, r, toi, luc } = phong(23);
    toi(1);
    const truoc = new Map([...the.nguoi.values()].map((n) => [n.user, n.tinChi]));
    const su = nhayMuc(the, 1, luc(1) + 100, r);
    expect(the.pha.k).toBe('lu');
    const phe = new Set<string>();
    let t = luc(1) + 100;
    const ds = [...su];
    let dem = 0;
    while (the.pha.k === 'lu' && t < luc(13)) {
      t += 250;
      if (++dem % 12 === 0) for (const u of ['s1', 's2', 't1', 't2']) ds.push(...nhanTin(the, { kind: 'comment', user: u, ten: u, text: 'đánh' }, t, r));
      ds.push(...buoc(the, t, r));
    }
    for (const x of ds) {
      if (x.k !== 'dien-rong') continue;
      phe.add(x.phe);
      // Mỗi chiêu diện rộng trừ một lượng trận khí vừa phải (sau khiên, Hộ Vệ, Y Sư).
      expect(x.tru ?? 0).toBeGreaterThanOrEqual(0);
      expect(x.tru ?? 0).toBeLessThanOrEqual(6);
    }
    expect(phe).toEqual(new Set(['son', 'thuy']));
    for (let i = 0; i < 400 && the.pha.k === 'lu'; i++) buoc(the, (t += 250), r);
    expect(the.pha.k).toBe('lu-ket');
    if (the.pha.k !== 'lu-ket') return;
    // Người đã ra sức: có linh thạch, lực chiến bị trừ do chiến thương. Người không tương tác (s3, t3) thì không.
    const s1 = the.nguoi.get('s1')!;
    expect(s1.tinChi).toBeGreaterThan(truoc.get('s1')!);
    expect(s1.thuong).toBeLessThan(1);
    expect(the.pha.thuong.son).toBeGreaterThan(0);
  });
});
