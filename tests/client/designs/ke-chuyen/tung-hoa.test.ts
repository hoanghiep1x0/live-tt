import { describe, expect, it } from 'vitest';
import type { Seat } from '@live/contracts';
import { dungGhe } from '../../../../client/designs/ke-chuyen/src/parts/ghe';
import { NHIP_MS, tiengHo } from '../../../../client/designs/ke-chuyen/src/parts/tung-hoa';

const ghe = dungGhe(3);
function ngoi(n: number): Map<number, Seat> {
  return new Map(Array.from({ length: n }, (_, i) => [i, { i, user: `u${i}`, name: `N${i}` }]));
}

describe('khán giả hô tung hoa', () => {
  it('rạp trống thì không ai hô', () => {
    expect(tiengHo(new Map(), ghe, 10_000)).toEqual([]);
  });

  it('hai tiếng hô so le, mỗi nhịp đổi một ghế', () => {
    const a = tiengHo(ngoi(8), ghe, NHIP_MS * 5 + 10);
    expect(a.map((h) => h.k)).toEqual([4, 5]);
    const b = tiengHo(ngoi(8), ghe, NHIP_MS * 6 + 10);
    expect(b[0]).toEqual(a[1]);
  });

  it('chỉ hô ở ghế đang có người, và hai cửa sổ thấy như nhau', () => {
    const s = ngoi(5);
    const ra = tiengHo(s, ghe, 77_777);
    for (const h of ra) expect(ghe.some((g) => g.flat < 5 && g.x === h.x && g.y === h.y)).toBe(true);
    expect(tiengHo(s, ghe, 77_777)).toEqual(ra);
  });
});
