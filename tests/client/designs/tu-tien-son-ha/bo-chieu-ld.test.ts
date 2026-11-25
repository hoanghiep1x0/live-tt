import { describe, expect, it } from 'vitest';
import { nhapMonThang, taoThe } from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import { boChieu, TEN_DON, TEN_TUYET } from '../../../../client/designs/tu-tien-son-ha/src/loi/loi-dai';
import { CONG_PHAP, HE_CP } from '../../../../client/designs/tu-tien-son-ha/src/loi/tang-bao';

const r = () => 0.5;

function nguoi(phe: 'son' | 'thuy') {
  const the = taoThe(0);
  nhapMonThang(the, { kind: 'comment', user: 'a', ten: 'A', text: 'x' }, phe, 'nam', 1000, r);
  const n = the.nguoi.get('a')!;
  n.cp = 0;
  n.cpCo = 0;
  n.vo = 0;
  return { the, n };
}
const so = (ten: string) => CONG_PHAP.findIndex((m) => m.ten.son === ten) + 1;

describe('Lôi Đài: bộ chiêu theo công pháp đã mua lúc tu luyện', () => {
  it('chưa mua công pháp: chiêu mặc định của tông', () => {
    const { the } = nguoi('son');
    const b = boChieu(the, { user: 'a' }, 'son');
    expect(b.cong.ten).toBe(TEN_DON.son);
    expect(b.thu.ten).toBe('Hộ Thể');
    expect(b.tuyet.ten).toBe(TEN_TUYET.son);
    expect([b.cong.mua, b.thu.mua, b.tuyet.mua]).toEqual([false, false, false]);
  });

  it('mua môn đánh, hộ thể: ô 1 môn đang dùng, ô 2 hộ thể, ô 3 môn đánh bậc cao nhất; hệ số theo môn', () => {
    const { the, n } = nguoi('thuy');
    const c1 = so('Sơn Ưng Tiễn');
    const c4 = so('Xuyên Vân Tiễn');
    const c6 = so('Tản Viên Hộ Thể');
    const c9 = so('Sơn Thần Vạn Tiễn');
    n.cpCo = (1 << c1) | (1 << c4) | (1 << c6) | (1 << c9);
    n.cp = c4;
    const b = boChieu(the, { user: 'a' }, 'thuy');
    const m4 = CONG_PHAP[c4 - 1]!;
    const m9 = CONG_PHAP[c9 - 1]!;
    const m6 = CONG_PHAP[c6 - 1]!;
    expect(b.cong.ten).toBe(m4.ten.thuy);
    expect(b.cong.heSo).toBeCloseTo(1 + HE_CP[m4.he].don * m4.bac);
    expect(b.thu.ten).toBe(m6.ten.thuy);
    expect(b.thu.giam).toBeLessThan(0.5);
    expect(b.tuyet.ten).toBe(m9.ten.thuy);
    expect(b.tuyet.heSo).toBeCloseTo(4 * (1 + HE_CP[m9.he].don * m9.bac));
    expect(b.cong.mo).toContain(`C${c4}`);
  });

  it('chỉ có môn hồi (hệ y): ô 2 thủ kèm hồi máu', () => {
    const { the, n } = nguoi('son');
    const c3 = so('Linh Chi Quyết');
    n.cpCo = 1 << c3;
    const b = boChieu(the, { user: 'a' }, 'son');
    expect(b.thu.ten).toBe('Linh Chi Quyết');
    expect(b.thu.hoi).toBeGreaterThan(0);
    expect(b.cong.ten).toBe(TEN_DON.son);
  });
});
