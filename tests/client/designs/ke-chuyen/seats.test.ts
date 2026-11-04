/** Hàng ghế hình quạt. Thuần số học nên test được không cần DOM.
 *
 *  Đây là đồ đạc của phòng kể chuyện, chuyển từ `seatLayout` của mã cũ. Test giữ
 *  cho hình quạt không bị méo khi ai đó sửa hằng số.
 */

import { describe, expect, it } from 'vitest';
import {
  AISLE_GAP,
  GHE_MAC_DINH,
  HALL_FIRST_Y,
  HALL_ROW_H,
  ROW_WIDTHS,
  SEAT_ROWS,
  hallContentH,
  hallRowsFor,
  rowName,
  seatLayout,
  seatsInRow,
  tierOf,
} from '../../../../client/designs/ke-chuyen/src/seats';

describe('số hàng và số ghế', () => {
  it('sáu hàng đầu giữ dáng rạp, hẹp dần về trước', () => {
    expect(SEAT_ROWS.map((r) => r.count)).toEqual([8, 10, 12, 12, 14, 14]);
  });

  it('phòng mặc định 84 ghế là bảy hàng A–G', () => {
    expect(hallRowsFor(GHE_MAC_DINH)).toBe(7);
    expect(rowName(6)).toBe('G');
    expect(seatsInRow(6)).toBe(14);
  });

  it('dưới 70 ghế thì vẫn đủ sáu hàng đầu, không bớt hàng', () => {
    expect(hallRowsFor(10)).toBe(6);
    expect(hallRowsFor(70)).toBe(6);
  });

  it('sức chứa lớn thì nối thêm hàng mỗi 14 ghế', () => {
    expect(hallRowsFor(84)).toBe(7);
    expect(hallRowsFor(85)).toBe(8);
    expect(hallRowsFor(1000)).toBe(6 + Math.ceil(930 / 14));
  });

  it('hạng ghế: A–B vàng, C–D hồng, còn lại trắng', () => {
    expect([0, 1].map(tierOf)).toEqual(['vang', 'vang']);
    expect([2, 3].map(tierOf)).toEqual(['hong', 'hong']);
    expect([4, 5, 6, 20].map(tierOf)).toEqual(['trang', 'trang', 'trang', 'trang']);
  });
});

describe('xoè hình quạt', () => {
  it('hàng sau rộng hơn hàng trước', () => {
    const rong = (r: number) => {
      const n = seatsInRow(r);
      const xs = Array.from({ length: n }, (_, i) => seatLayout(r, i).x);
      return Math.max(...xs) - Math.min(...xs);
    };
    for (let r = 1; r < 7; r += 1) {
      expect(rong(r), `hàng ${rowName(r)} phải rộng hơn hàng trước`).toBeGreaterThan(rong(r - 1));
    }
  });

  it('mọi ghế nằm trong bề rộng hàng của nó', () => {
    for (let r = 0; r < 7; r += 1) {
      const w = ROW_WIDTHS[Math.min(r, ROW_WIDTHS.length - 1)]!;
      for (let i = 0; i < seatsInRow(r); i += 1) {
        const { x } = seatLayout(r, i);
        expect(x).toBeGreaterThanOrEqual(50 - w / 2 - 0.001);
        expect(x).toBeLessThanOrEqual(50 + w / 2 + 0.001);
      }
    }
  });

  it('chừa lối đi giữa: không ghế nào nằm trong khoảng lối', () => {
    for (let r = 0; r < 7; r += 1) {
      for (let i = 0; i < seatsInRow(r); i += 1) {
        const { x } = seatLayout(r, i);
        expect(
          Math.abs(x - 50) >= AISLE_GAP / 2 - 0.001,
          `hàng ${rowName(r)} ghế ${i} rơi vào lối giữa (x=${x})`,
        ).toBe(true);
      }
    }
  });

  it('hàng ghế cong như rạp: hai mép nằm cao hơn giữa hàng', () => {
    // y lệch `−(t − 0.5)² × ROW_CURVE`, nên ghế càng xa tâm hàng thì y càng nhỏ,
    // tức càng cao trên màn. Đó là dáng hàng ghế nhìn từ sân khấu.
    for (let r = 0; r < 7; r += 1) {
      const n = seatsInRow(r);
      const giua = seatLayout(r, Math.floor(n / 2) - 1).y;
      const mep = seatLayout(r, 0).y;
      expect(mep, `hàng ${rowName(r)} phải cong, mép cao hơn giữa`).toBeLessThan(giua);
    }
  });

  it('hai góc quạt chéo dần xuống phía hàng G', () => {
    // FAN_DROP kéo ghế mép xuống mạnh hơn ở hàng sau, nên độ nhô của mép so với
    // mốc hàng của nó giảm dần: −1,83cqw ở hàng A còn −0,84cqw ở hàng G.
    const nho = (r: number) => seatLayout(r, 0).y - (HALL_FIRST_Y + r * HALL_ROW_H);
    for (let r = 1; r < 7; r += 1) {
      expect(nho(r), `góc quạt hàng ${rowName(r)} phải chéo xuống thêm`).toBeGreaterThan(nho(r - 1));
    }
    expect(nho(0)).toBeCloseTo(-1.83, 1);
    expect(nho(6)).toBeCloseTo(-0.84, 1);
  });

  it('hàng sau nằm thấp hơn hàng trước đúng một bước', () => {
    const mocHang = (r: number) => HALL_FIRST_Y + r * HALL_ROW_H;
    for (let r = 1; r < 7; r += 1) {
      expect(mocHang(r) - mocHang(r - 1)).toBeCloseTo(HALL_ROW_H);
    }
  });

  it('ghế hàng sau to hơn một chút, nhưng chỉ tới hàng F', () => {
    expect(seatLayout(0, 0).scale).toBeCloseTo(0.92);
    expect(seatLayout(5, 0).scale).toBeCloseTo(1.02);
    expect(seatLayout(6, 0).scale).toBeCloseTo(seatLayout(5, 0).scale);
  });

  it('hai ghế khác nhau không trùng chỗ', () => {
    const cho = new Set<string>();
    for (let r = 0; r < 7; r += 1) {
      for (let i = 0; i < seatsInRow(r); i += 1) {
        const { x, y } = seatLayout(r, i);
        const k = `${x.toFixed(3)}:${y.toFixed(3)}`;
        expect(cho.has(k), `trùng chỗ ở hàng ${rowName(r)} ghế ${i}`).toBe(false);
        cho.add(k);
      }
    }
  });
});

describe('vùng cuộn', () => {
  it('chiều cao nội dung đủ chứa hàng cuối', () => {
    const rows = 7;
    const yCuoi = Math.max(
      ...Array.from({ length: seatsInRow(rows - 1) }, (_, i) => seatLayout(rows - 1, i).y),
    );
    expect(hallContentH(rows)).toBeGreaterThan(yCuoi);
  });
});
