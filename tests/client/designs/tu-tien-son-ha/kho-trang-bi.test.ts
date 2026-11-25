import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { napHoSo, nhanTin, nhapMonThang, taoThe, xuatHoSo, type The } from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import {
  BIEN_THE_DS,
  GOC_PHAM,
  hinhDo,
  maDo,
  O_TRANG_BI,
  taoDo,
  TEN_BIEN_THE,
  tenDo,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/trang-bi';

const ASSETS = join(__dirname, '../../../../client/designs/tu-tien-son-ha/assets');

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const vao = (the: The, user: string, phe: 'son' | 'thuy', gioi: 'nam' | 'nu', rand: () => number) =>
  nhapMonThang(the, { kind: 'comment', user, ten: user.toUpperCase(), text: 'x' }, phe, gioi, 1000, rand);

describe('Kho trang bị: biến thể theo tông × giới', () => {
  it('nhập môn được ban 3 món Phàm phẩm đúng tông, giáp đúng giới, chỉ số Phàm ±15%', () => {
    const the = taoThe(0);
    const rand = lcg(7);
    vao(the, 'a', 'son', 'nu', rand);
    vao(the, 'b', 'thuy', 'nam', rand);
    for (const [u, tong, gioi] of [['a', 'son', 'nu'], ['b', 'thuy', 'nam']] as const) {
      const n = the.nguoi.get(u)!;
      for (const o of O_TRANG_BI) {
        const t = n.tb[o]!;
        expect(t).toBeDefined();
        expect(t.pham).toBe(0);
        expect(BIEN_THE_DS).toContain(t.bt);
        expect(t.tg).toBe(tong);
        expect(t.gi).toBe(gioi);
        expect(tenDo(t)).toBe(TEN_BIEN_THE[tong][0]![o][BIEN_THE_DS.indexOf(t.bt!)]);
        const g = t.cong + t.thu;
        expect(g).toBeGreaterThanOrEqual(Math.floor(GOC_PHAM[0] * 0.85) - 1);
        expect(g).toBeLessThanOrEqual(Math.ceil(GOC_PHAM[0] * 1.15) + 1);
      }
      expect(hinhDo(n.tb.ao!)).toBe(`do/kho/${maDo(n.tb.ao!)}-${tong}-${gioi}.webp`);
      expect(hinhDo(n.tb.vu!)).toBe(`do/kho/${maDo(n.tb.vu!)}-${tong}.webp`);
    }
  });

  it('biến thể bốc ngẫu nhiên: đủ cả a, b, c qua nhiều người', () => {
    const the = taoThe(0);
    const rand = lcg(11);
    const gap = new Set<string>();
    for (let i = 0; i < 30; i++) {
      vao(the, `u${i}`, i % 2 ? 'son' : 'thuy', 'nam', rand);
      gap.add(the.nguoi.get(`u${i}`)!.tb.vu!.bt!);
    }
    expect([...gap].sort()).toEqual(['a', 'b', 'c']);
  });

  it('không ban lại cho người đã có đồ; đổi tông thì món giữ nguyên biến thể, đổi tên theo tông mới', () => {
    const the = taoThe(0);
    const rand = lcg(3);
    vao(the, 'a', 'son', 'nam', rand);
    const n = the.nguoi.get('a')!;
    const vuCu = { ...n.tb.vu! };
    n.tb.vu = { ...vuCu, pham: 2, cong: 45 };
    delete n.tb.bao;
    // Đổi sang Thủy Tông (qua lệnh tông) sau thời gian chờ đổi phe.
    nhanTin(the, { kind: 'comment', user: 'a', ten: 'A', text: 'thủy' }, 1000 + 24 * 3600_000, rand);
    expect(n.phe).toBe('thuy');
    expect(n.tb.vu!.pham).toBe(2);
    expect(n.tb.vu!.bt).toBe(vuCu.bt);
    expect(n.tb.vu!.tg).toBe('thuy');
    expect(n.tb.bao!.pham).toBe(0);
    expect(n.tb.bao!.tg).toBe('thuy');
  });

  it('giáp y theo giới: đổi giới thì hình giáp đổi theo', () => {
    const the = taoThe(0);
    vao(the, 'a', 'thuy', 'nam', lcg(5));
    const n = the.nguoi.get('a')!;
    expect(hinhDo(n.tb.ao!)).toMatch(/-thuy-nam\.webp$/);
    nhanTin(the, { kind: 'comment', user: 'a', ten: 'A', text: 'nữ' }, 2000, lcg(6));
    expect(n.gioi).toBe('nu');
    expect(hinhDo(n.tb.ao!)).toMatch(/-thuy-nu\.webp$/);
  });

  it('lưu sổ rồi tải lại: giữ đúng biến thể, tên, hình (cả tên/ảnh riêng của kho người vận hành)', () => {
    const the = taoThe(0);
    const rand = lcg(9);
    vao(the, 'a', 'son', 'nu', rand);
    vao(the, 'b', 'thuy', 'nam', rand);
    const b = the.nguoi.get('b')!;
    b.tb.bao = { ...b.tb.bao!, ten: 'Ngọc Riêng', anh: 'https://x/y.webp' };
    const truoc = new Map([...the.nguoi.values()].map((n) => [n.user, O_TRANG_BI.map((o) => [tenDo(n.tb[o]!), hinhDo(n.tb[o]!), n.tb[o]!.anh])]));
    const so = JSON.parse(JSON.stringify(xuatHoSo(the)));
    const moi = taoThe(0);
    napHoSo(moi, so);
    for (const [u, ds] of truoc) {
      const n = moi.nguoi.get(u)!;
      expect(O_TRANG_BI.map((o) => [tenDo(n.tb[o]!), hinhDo(n.tb[o]!), n.tb[o]!.anh])).toEqual(ds);
      for (const o of O_TRANG_BI) expect(n.tb[o]!.bt).toBe(the.nguoi.get(u)!.tb[o]!.bt);
    }
    expect(tenDo(moi.nguoi.get('b')!.tb.bao!)).toBe('Ngọc Riêng');
  });

  it('đọc được sổ cũ chỉ có [phẩm, công, thủ]: món không biến thể, tên bảng gốc, hình chung', () => {
    const the = taoThe(0);
    napHoSo(the, { nguoi: { a: { t: 'A', p: 'son', k: 10, c: 1, v: [], d: 0, x: 'nam', g: { vu: [1, 21, 0] } } } });
    const t = the.nguoi.get('a')!.tb.vu!;
    expect(t.bt).toBeUndefined();
    expect(tenDo(t)).toBe('Mũi Lao Đồng');
    expect(hinhDo(t)).toBe('do/vu.webp');
  });

  it('đồ rơi bốc biến thể; về tay ai thì mang tông, giới người đó', () => {
    const t = taoDo('ao', 3, lcg(2), null, { phe: 'thuy', gioi: 'nu' });
    expect(BIEN_THE_DS).toContain(t.bt);
    expect(hinhDo(t)).toBe(`do/kho/G4${t.bt === 'a' ? '' : t.bt}-thuy-nu.webp`);
  });

  it('đủ 120 tranh kho trong assets/do/kho', () => {
    for (const tg of ['son', 'thuy'] as const)
      for (let p = 0; p < 5; p++)
        for (const o of O_TRANG_BI)
          for (const bt of BIEN_THE_DS)
            for (const gi of o === 'ao' ? (['nam', 'nu'] as const) : (['nam'] as const)) {
              const duong = hinhDo({ o, pham: p, cong: 0, thu: 0, bt, tg, gi });
              expect(existsSync(join(ASSETS, duong)), duong).toBe(true);
            }
  });
});
