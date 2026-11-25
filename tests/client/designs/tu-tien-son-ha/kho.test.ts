import { describe, expect, it } from 'vitest';
import { docKho, LUA_CHON } from '../../../../client/designs/tu-tien-son-ha/src/cai-dat';
import {
  buoc,
  CO_DUYEN_GOC,
  datKho,
  moSuKienTl,
  nhanTin,
  nhapMonThang,
  NHIP_LIVE,
  SU_KIEN_GOC,
  taoThe,
  type Su,
  type The,
} from '../../../../client/designs/tu-tien-son-ha/src/loi/core';
import { KHO_DO_GOC, taoDo, tenDo, TEN_DO, type MonDo } from '../../../../client/designs/tu-tien-son-ha/src/loi/trang-bi';

const t0 = 1_000_000_000_000;
const dem = (ds: number[]) => {
  let i = 0;
  return () => ds[Math.min(i++, ds.length - 1)]!;
};

function phong(): The {
  const the = taoThe(t0, NHIP_LIVE);
  nhapMonThang(the, { kind: 'comment', user: 'a', ten: 'A', text: 'x' }, 'son', 'nam', t0, () => 0.5);
  buoc(the, t0, () => 0.5);
  return the;
}

describe('Kho đồ sửa được', () => {
  it('kho gốc cho đúng món như bảng gốc, không tốn thêm số ngẫu nhiên', () => {
    const a = taoDo('vu', 2, dem([0.5]));
    const b = taoDo('vu', 2, dem([0.5]), KHO_DO_GOC);
    expect(b).toEqual(a);
    expect(tenDo(b)).toBe(TEN_DO.vu[2]);
  });

  it('sửa tên, chỉ số, ảnh thì món rơi ra mang tên, chỉ số, ảnh mới', () => {
    const kho: MonDo[] = KHO_DO_GOC.map((m) => (m.id === 'vu2' ? { ...m, ten: 'Rìu Thần', goc: 1000, anh: '/x.webp' } : m));
    const v = taoDo('vu', 2, dem([0.5]), kho);
    expect(tenDo(v)).toBe('Rìu Thần');
    expect(v.cong).toBe(1000);
    expect(v.anh).toBe('/x.webp');
  });

  it('xoá / tắt món của một phẩm thì rơi món phẩm gần nhất (ưu tiên thấp hơn); thêm món cùng phẩm thì bốc theo tỉ trọng', () => {
    const tat = KHO_DO_GOC.map((m) => (m.id === 'ao3' ? { ...m, bat: false } : m));
    expect(taoDo('ao', 3, dem([0.5]), tat).pham).toBe(2);
    const them: MonDo[] = [...KHO_DO_GOC, { id: 'moi', o: 'bao', pham: 4, ten: 'Ngọc Rồng', goc: 300, roi: 9, anh: '', bat: true }];
    expect(tenDo(taoDo('bao', 4, dem([0.99, 0.5]), them))).toBe('Ngọc Rồng');
    expect(tenDo(taoDo('bao', 4, dem([0.01, 0.5]), them))).toBe(TEN_DO.bao[4]);
  });

  it('một loại không còn món nào thì dùng lại bảng gốc; kho tắt hết thì bỏ kho', () => {
    const khongVu = KHO_DO_GOC.filter((m) => m.o !== 'vu');
    expect(tenDo(taoDo('vu', 1, dem([0.5]), khongVu))).toBe(TEN_DO.vu[1]);
    const the = phong();
    datKho(the, { do: KHO_DO_GOC.map((m) => ({ ...m, bat: false })) });
    expect(the.khoDo).toBeNull();
  });
});

describe('Kho cơ duyên và sự kiện', () => {
  it('phần thưởng tự thêm: gõ 6 trúng đúng món theo tỉ trọng', () => {
    const the = phong();
    datKho(the, { coDuyen: [{ id: 'x', loai: 'thach', ten: 'Rương Vàng', tu: 50, den: 50, tiLe: 1, hiem: true, hinh: '🧰', bat: true }] });
    const ra: Su[] = [];
    moSuKienTl(the, 'co-duyen', t0 + 1_000, ra);
    const n = the.nguoi.get('a')!;
    const truoc = n.tinChi;
    nhanTin(the, { kind: 'comment', user: 'a', ten: 'A', text: '6' }, t0 + 2_000, () => 0.5);
    expect(n.tinChi).toBe(truoc + 50);
    expect(the.hdMoi?.chu).toContain('Rương Vàng');
    expect(the.hdMoi?.hiem).toBe(true);
  });

  it('sự kiện tự đặt: tên và hệ số theo thẻ, mở luân phiên các mục đang bật', () => {
    const the = phong();
    datKho(the, {
      suKien: [
        { id: 'a', loai: 'linh-thao', ten: 'Mùa Sâm Núi', boi: 5, hinh: '🌱', bat: true },
        { id: 'b', loai: 'co-duyen', ten: 'Tắt', boi: 1, hinh: '✨', bat: false },
      ],
    });
    the.skTlKe = t0 + 1_000;
    const su = buoc(the, t0 + 1_000, () => 0.5);
    expect(the.skTl?.ten).toBe('Mùa Sâm Núi');
    expect(the.skTl?.boi).toBe(5);
    expect(su.some((x) => x.k === 'doc' && x.chu.includes('×5'))).toBe(true);
    datKho(the, { suKien: [], coDuyen: [] });
    expect(the.khoSuKien).toBe(SU_KIEN_GOC);
    expect(the.khoCoDuyen).toBe(CO_DUYEN_GOC);
  });
});

describe('Thẻ cài đặt kho', () => {
  it('chưa ai sửa thì đọc ra bảng gốc; mặc định trên thẻ khớp bảng gốc', () => {
    const k = docKho({});
    expect(k.do).toBeNull();
    expect(k.coDuyen).toEqual(CO_DUYEN_GOC);
    expect(k.suKien).toEqual(SU_KIEN_GOC);
    const macDinh: Record<string, unknown> = {};
    for (const c of LUA_CHON) for (const f of c.fields) macDinh[f.key] = f.value;
    const m = docKho(macDinh);
    expect(m.do).toEqual(KHO_DO_GOC);
    expect(m.coDuyen).toEqual(CO_DUYEN_GOC);
    expect(m.suKien).toEqual(SU_KIEN_GOC);
  });

  it('ô hỏng thì kẹp về giá trị hợp lệ', () => {
    const k = docKho({ khoDo: [{ o: 'la', pham: '9', goc: -5, ten: ' Kiếm ' }, 'rác'], khoCoDuyen: [{ loai: 'x', tu: 9, den: 2 }] });
    expect(k.do).toEqual([{ id: 'd0', o: 'vu', pham: 4, ten: 'Kiếm', goc: 1, roi: 1, anh: '', bat: true }]);
    expect(k.coDuyen[0]).toMatchObject({ loai: 'lk', tu: 9, den: 9, tiLe: 0 });
  });
});
