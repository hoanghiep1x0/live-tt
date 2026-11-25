import { describe, expect, it } from 'vitest';
import {
  buoc,
  datNhip,
  moSuKienTl,
  HAI_LK,
  nhanTin,
  nhapMonThang,
  NHIP_LIVE,
  SK_TL_LAU,
  taoThe,
  VAN_CONG_LK,
  type Su,
  type The,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/core';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const t0 = 1_000_000_000_000;

function phong(): { the: The; r: () => number } {
  const r = hat(7);
  const the = taoThe(t0, NHIP_LIVE);
  nhapMonThang(the, { kind: 'comment', user: 'a', ten: 'A', text: 'x' }, 'son', 'nam', t0, r);
  // Đảm bảo đang tu luyện (câu hỏi).
  buoc(the, t0, r);
  expect(['cho', 'hoi', 'dap']).toContain(the.pha.k);
  return { the, r };
}

const go = (the: The, text: string, now: number, r: () => number) =>
  nhanTin(the, { kind: 'comment', user: 'a', ten: 'A', text }, now, r);

describe('Tu luyện gõ số', () => {
  it('1 vận công: +linh khí, có hồi chiêu 20 giây, hiện chữ giữa màn', () => {
    const { the, r } = phong();
    const n = the.nguoi.get('a')!;
    const lk0 = n.lk;
    go(the, '1', t0 + 1_000, r);
    expect(n.lk).toBe(lk0 + VAN_CONG_LK);
    expect(the.hdMoi?.viec).toBe('Vận công');
    go(the, '1', t0 + 5_000, r);
    expect(n.lk).toBe(lk0 + VAN_CONG_LK);
    go(the, '1', t0 + 22_000, r);
    expect(n.lk).toBe(lk0 + 2 * VAN_CONG_LK);
  });

  it('2 hái linh thảo: ít nhất +2 linh khí', () => {
    const { the, r } = phong();
    const n = the.nguoi.get('a')!;
    const lk0 = n.lk;
    go(the, '2', t0 + 1_000, r);
    expect(n.lk - lk0).toBeGreaterThanOrEqual(HAI_LK);
    expect(the.hdMoi?.viec).toBe('Hái linh thảo');
  });

  it('6 cơ duyên chỉ có tác dụng trong sự kiện, mỗi người một lần', () => {
    const { the, r } = phong();
    const n = the.nguoi.get('a')!;
    const truoc = () => n.lk + n.tinChi + n.tb.length;
    let s = truoc();
    go(the, '6', t0 + 1_000, r);
    expect(truoc()).toBe(s);
    expect(the.hdMoi).toBeNull();
    // Mở sự kiện Cơ Duyên.
    the.skTlKe = t0 + 2_000;
    the.skTlSo = 0;
    const su = buoc(the, t0 + 2_000, r);
    expect(the.skTl?.loai).toBe('co-duyen');
    expect(su.some((x) => x.k === 'doc')).toBe(true);
    go(the, '6', t0 + 3_000, r);
    expect(the.hdMoi?.viec).toBe('Cơ duyên');
    expect(the.skTl?.da.has('a')).toBe(true);
    s = truoc();
    const moc = the.hdMoi!.luc;
    go(the, '6', t0 + 4_000, r);
    expect(the.hdMoi!.luc).toBe(moc);
    // Hết giờ thì đóng.
    buoc(the, t0 + 2_000 + SK_TL_LAU + 1, r);
    expect(the.skTl).toBeNull();
  });

  it('quản lý cơ duyên: tắt trên thẻ thì không tự mở; nút người vận hành mở ngay; nhịp theo thẻ', () => {
    const { the, r } = phong();
    datNhip(the, { skTlCach: 30_000, skTlLau: 20_000 }, { coDuyen: true }, t0);
    the.skTlKe = t0 + 1_000;
    buoc(the, t0 + 1_000, r);
    expect(the.skTl).toBeNull();
    const ra: Su[] = [];
    moSuKienTl(the, 'linh-thao', t0 + 2_000, ra);
    expect(the.skTl?.loai).toBe('linh-thao');
    expect(the.skTl?.den).toBe(t0 + 22_000);
    expect(the.skTlKe).toBe(t0 + 32_000);
    expect(ra.some((x) => x.k === 'doc')).toBe(true);
    datNhip(the, {}, { coDuyen: false }, t0 + 40_000);
    buoc(the, t0 + 40_000, r);
    expect(the.skTl).not.toBeNull();
    expect(the.skTl!.den).toBe(t0 + 60_000);
  });

  it('số không làm gì với khách và ngoài tu luyện không bị hiểu nhầm', () => {
    const { the, r } = phong();
    nhanTin(the, { kind: 'comment', user: 'k', ten: 'K', text: '1' }, t0 + 1_000, r);
    expect(the.hdMoi).toBeNull();
  });
});
