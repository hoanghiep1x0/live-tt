import { describe, expect, it } from 'vitest';
import { banCo, soHang } from '../../../../client/designs/tu-tien-son-ha/src/ve3d/doi-hinh';
import { CANH_GIOI, CHUC_VU, bacChuc, chucVu } from '../../../../client/designs/tu-tien-son-ha/src/loi/the-gioi';

const KHU = { trai: 0, phai: 400, day: 1800, tren: 1000, toiDaCot: 4 };

describe('chỗ ngồi theo cảnh giới', () => {
  it('người đầu danh sách ngồi một mình ở đỉnh tháp, chính giữa', () => {
    const bc = banCo(10, KHU);
    const yTren = Math.min(...bc.ban.map((o) => o.y));
    expect(bc.nguoi[0]!.y).toBe(yTren);
    expect(bc.nguoi[0]!.x).toBe(200);
    expect(bc.nguoi.filter((o) => o.y === yTren)).toHaveLength(1);
  });

  it('ba hàng đầu là kim tự tháp 1 – 2 – 4, rồi tới lưới đủ cột', () => {
    expect(soHang(20, 4)).toEqual([1, 2, 4, 4, 4, 4, 1]);
    expect(soHang(4, 3)).toEqual([1, 2, 1]);
    expect(soHang(1, 1)).toEqual([1]);
    // Bàn hẹp hơn tháp thì tháp bị cắt theo số cột.
    expect(soHang(5, 2)).toEqual([1, 2, 2]);
  });

  it('hàng ba có một người thì người đó ngồi ghế trái nhất, không chui vào giữa', () => {
    const bc = banCo(4, KHU);
    const hang3 = bc.ban.filter((o) => o.y === bc.nguoi[3]!.y);
    expect(hang3).toHaveLength(4);
    expect(bc.nguoi[3]!.x).toBe(Math.min(...hang3.map((o) => o.x)));
  });

  it('bàn tu luyện: từ hàng bốn mỗi hàng đủ 5 người', () => {
    const bc = banCo(17, { trai: 0, phai: 1000, day: 1800, tren: 900, toiDaCot: 6, cotLuoi: 5 });
    const theoHang = new Map<number, number>();
    for (const o of bc.nguoi) theoHang.set(o.y, (theoHang.get(o.y) ?? 0) + 1);
    expect([...theoHang.entries()].sort((a, b) => a[0] - b[0]).map(([, so]) => so)).toEqual([1, 2, 4, 5, 5]);
  });

  it('hai hàng đầu xếp từ giữa, từ hàng ba xếp từ trái sang', () => {
    const bc = banCo(12, KHU); // 4 cột: 1 + 2 + 4 + 4 + 1
    const hang3 = bc.nguoi.slice(3, 7).map((o) => o.x);
    expect(hang3).toEqual([...hang3].sort((a, b) => a - b));
    const cuoi = bc.nguoi[11]!;
    expect(cuoi.x).toBe(Math.min(...bc.ban.filter((o) => o.y === cuoi.y).map((o) => o.x)));
  });

  it('đỉnh tháp ngồi to hơn hàng lưới', () => {
    const bc = banCo(12, KHU);
    expect(bc.nguoi[0]!.ti).toBeGreaterThan(bc.nguoi[11]!.ti);
  });

  it('càng về sau danh sách càng ngồi thấp (y không bao giờ cao hơn người trước)', () => {
    const bc = banCo(17, KHU);
    for (let i = 1; i < bc.nguoi.length; i++) expect(bc.nguoi[i]!.y).toBeGreaterThanOrEqual(bc.nguoi[i - 1]!.y);
  });

  it('hàng thiếu người là hàng dưới cùng', () => {
    const bc = banCo(14, KHU); // 4 cột: 1 + 2 + 4 + 4 + 3
    const yDay = Math.max(...bc.ban.map((o) => o.y));
    expect(bc.nguoi.filter((o) => o.y === yDay)).toHaveLength(14 - 1 - 2 - 4 - 4);
  });

  it('không hai người chung một ghế', () => {
    const bc = banCo(23, KHU);
    expect(new Set(bc.nguoi.map((o) => `${o.x},${o.y}`)).size).toBe(23);
  });
});

describe('chức vụ', () => {
  it('mỗi phe đủ một chức cho mỗi cảnh giới', () => {
    expect(CHUC_VU.son).toHaveLength(CANH_GIOI.length);
    expect(CHUC_VU.thuy).toHaveLength(CANH_GIOI.length);
  });

  it('cảnh giới cao hơn thì bậc chức không thấp hơn', () => {
    for (let c = 1; c < CANH_GIOI.length; c++) expect(bacChuc(c)).toBeGreaterThanOrEqual(bacChuc(c - 1));
    expect(bacChuc(0)).toBe(0);
    expect(bacChuc(CANH_GIOI.length - 1)).toBe(3);
  });

  it('cảnh giới ngoài bảng không làm vỡ', () => {
    expect(chucVu('son', 99)).toBe('Lão tổ');
    expect(chucVu('thuy', -1)).toBe('Thủy dịch');
  });
});
