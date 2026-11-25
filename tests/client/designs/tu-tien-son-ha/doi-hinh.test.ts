import { describe, expect, it } from 'vitest';
import { banCo, chiaTuyen, DOI_HINH_DOI, SO_DO, soDoLuc, soHang } from '../../../../client/designs/tu-tien-son-ha/src/ve3d/doi-hinh';
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

import { chonHien } from '../../../../client/designs/tu-tien-son-ha/src/ve3d/doi-hinh';

describe('chonHien — phòng đông thì lật trang, ưu tiên người đang hoạt động', () => {
  const now = 1_000_000;
  const nguoi = (so: number, im: (i: number) => boolean) => Array.from({ length: so }, (_, i) => ({ id: i, lanCuoi: im(i) ? now - 200_000 : now - 1_000 }));

  it('vừa sức chứa thì hiện hết', () => {
    expect(chonHien(nguoi(20, () => false), now)).toHaveLength(20);
  });

  it('đông mà nhiều người im: chỉ người hoạt động được hiện, người im bị ẩn', () => {
    const ds = nguoi(40, (i) => i % 2 === 0);
    const ra = chonHien(ds, now);
    expect(ra).toHaveLength(21);
    expect(ra.filter((n) => n.id % 2 === 1)).toHaveLength(20);
  });

  it('đông mà ai cũng hoạt động: 6 ghế đầu cố định, hàng dưới lật trang, lần lượt ai cũng được hiện', () => {
    const ds = nguoi(50, () => false);
    const thay = new Set<number>();
    for (let k = 0; k < 4; k++) {
      const ra = chonHien(ds, now + k * 8_000);
      expect(ra.slice(0, 6).map((n) => n.id)).toEqual([0, 1, 2, 3, 4, 5]);
      for (const n of ra) thay.add(n.id);
    }
    expect(thay.size).toBe(50);
  });
});

describe('Đội hình tu luyện kiểu sân bóng: trưởng môn giữ vị trí thủ môn', () => {
  const KHU_TL = { trai: 30, phai: 1050, day: 1800, tren: 1150, toiDaCot: 12, coToiDa: 130, thapDan: 170 };
  it('sơ đồ nào cũng đủ ghế, nằm trong khung, không ai ngồi chồng nhau; thủ môn một mình trên cùng, chính giữa', () => {
    SO_DO.forEach((_, soDo) => {
      for (const n of [1, 2, 3, 6, 11, 15, 21, 27]) {
        const bc = banCo(n, { ...KHU_TL, soDo });
        expect(bc.nguoi).toHaveLength(n);
        for (const o of bc.nguoi) {
          expect(o.x).toBeGreaterThanOrEqual(KHU_TL.trai);
          expect(o.x).toBeLessThanOrEqual(KHU_TL.phai);
          expect(o.y).toBeGreaterThanOrEqual(KHU_TL.tren - 1);
          expect(o.y).toBeLessThanOrEqual(KHU_TL.day + 1);
        }
        for (let i = 0; i < n; i++)
          for (let j = i + 1; j < n; j++)
            expect(Math.hypot(bc.nguoi[i]!.x - bc.nguoi[j]!.x, bc.nguoi[i]!.y - bc.nguoi[j]!.y), `so do ${soDo} n=${n} ${i}-${j}`).toBeGreaterThan(bc.co * 0.6);
        const tm = bc.nguoi[0]!;
        expect(tm.x).toBeCloseTo(540, 3);
        expect(bc.nguoi.every((o) => o === tm || o.y > tm.y + 1)).toBe(true);
      }
    });
  });
  it('11 người: các tuyến đúng sơ đồ; ít / nhiều người hơn thì chia theo tỉ lệ', () => {
    expect(chiaTuyen(10, [4, 4, 2])).toEqual([4, 4, 2]);
    expect(chiaTuyen(5, [4, 4, 2])).toEqual([2, 2, 1]);
    expect(chiaTuyen(20, [4, 3, 3])).toEqual([8, 6, 6]);
    expect(chiaTuyen(1, [4, 2, 3, 1])).toEqual([1]);
  });
  it('sơ đồ đổi theo nhịp, ổn định trong một nhịp, qua nhiều nhịp thì dùng nhiều sơ đồ khác nhau', () => {
    expect(soDoLuc(5_000)).toBe(soDoLuc(DOI_HINH_DOI - 1));
    const k = new Set(Array.from({ length: 40 }, (_, i) => soDoLuc(i * DOI_HINH_DOI)));
    expect(k.size).toBeGreaterThanOrEqual(5);
    for (let i = 0; i < 5_000; i++) for (const lech of [0, 1]) expect(SO_DO[soDoLuc(1_795_000_000_000 + i * DOI_HINH_DOI, lech)]).toBeDefined();
  });
});
