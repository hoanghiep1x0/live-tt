import { describe, expect, it } from 'vitest';
import { nhanTin, nhapMonThang, nhayTuLuyen, NHIP_LIVE, taoThe, type The } from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import { TM_LAU, TM_XU, truongMonCua } from '../../../../client/designs/tu-tien-son-ha/src/loi/truong-mon';

function hat(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function phong() {
  const r = hat(7);
  const the = taoThe(0, NHIP_LIVE);
  for (const u of ['a', 'b', 'c']) nhapMonThang(the, { kind: 'comment', user: u, ten: u.toUpperCase(), text: 'x' }, 'son', 'nam', 10, r);
  nhayTuLuyen(the, 1_000, r, 'son');
  return { the, r };
}
const qua = (the: The, u: string, xu: number, now: number, r: () => number) =>
  nhanTin(the, { kind: 'gift', user: u, ten: u.toUpperCase(), text: 'Quà', xu, count: 1 }, now, r);

describe('Ghế trưởng môn: ai cũng ngồi được nhờ quà', () => {
  it('quà nhỏ không lên ghế; quà từ TM_XU thì lên, dù cảnh giới thấp nhất', () => {
    const { the, r } = phong();
    the.nguoi.get('a')!.canh = 5;
    qua(the, 'c', TM_XU - 1, 2_000, r);
    expect(truongMonCua(the, 'son', 2_000)).toBeNull();
    const ra = qua(the, 'c', TM_XU, 3_000, r);
    expect(ra.some((s) => s.k === 'truong-mon' && s.user === 'c' && !s.cuop)).toBe(true);
    expect(truongMonCua(the, 'son', 3_000)?.user).toBe('c');
  });

  it('giành ghế phải tặng lớn hơn người đang giữ; người giữ tặng thêm thì cộng dồn', () => {
    const { the, r } = phong();
    qua(the, 'c', 30, 2_000, r);
    qua(the, 'b', 30, 3_000, r);
    expect(truongMonCua(the, 'son', 3_000)?.user).toBe('c');
    qua(the, 'c', 20, 4_000, r);
    qua(the, 'b', 50, 5_000, r);
    expect(truongMonCua(the, 'son', 5_000)?.user).toBe('c');
    const ra = qua(the, 'b', 51, 6_000, r);
    expect(ra.some((s) => s.k === 'truong-mon' && s.user === 'b' && s.cuop)).toBe(true);
    expect(truongMonCua(the, 'son', 6_000)?.user).toBe('b');
  });

  it('hết hạn thì ghế về lại top 1', () => {
    const { the, r } = phong();
    qua(the, 'c', 100, 2_000, r);
    expect(truongMonCua(the, 'son', 2_000 + TM_LAU - 1)?.user).toBe('c');
    expect(truongMonCua(the, 'son', 2_000 + TM_LAU)).toBeNull();
  });
});
