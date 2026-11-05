import { describe, expect, it } from 'vitest';
import type { FeedItem } from '@live/contracts';
import { boList, docVuCong3D, mucList, mucRoster, phuCauHinh, suaList, suaRoster, themList } from '@live/contracts';
import { runAction, runFeed, runTick } from '@live/runtime';
import {
  boKe,
  core,
  DIEU,
  DIEU_LUAN_PHIEN,
  KHO_DIEU,
  moduleVuCong3d as mod,
  NGAU_NHIEN,
  NHAN_VAT,
  THEO_NHOM,
  NUT,
  schema,
  TRANG_PHUC,
} from '@live/mod-vu-cong-3d';
import type { Config } from '@live/mod-vu-cong-3d';
import { ctx, kiemModule } from '../_helper';

const MAC_DINH = schema.parse({});

function qua(at: number, id = 1): FeedItem {
  return { id, at, kind: 'gift', name: 'Hạnh', text: 'tặng Hoa hồng', user: 'hanh', xu: 10 };
}

function cau(p: Partial<Config>): Config {
  return schema.parse({ ...MAC_DINH, ...p });
}

describe('manifest', () => {
  it('đúng mọi điều buộc với module', () => {
    kiemModule(mod);
  });

  it('cắm slot stage-3d, xếp vào phòng sàn bar', () => {
    expect(mod.manifest.slots).toEqual(['stage-3d']);
    expect(mod.manifest.needs).toEqual(['stage-3d']);
    expect(mod.manifest.room).toBe('san-bar');
  });

  it('mỗi bộ trang phục một ảnh nhỏ, đủ cả danh mục, chọn bộ đang mặc cũng bằng ảnh', () => {
    const o = mod.manifest.fields.find((f) => f.key === 'boBat');
    expect(o?.type).toBe('gallery');
    expect(o?.options?.map((x) => x.value)).toEqual(TRANG_PHUC.map((t) => t.id));
    for (const x of o?.options ?? []) expect(x.img).toBe(`/m/vu-cong-3d/thumbs/${x.value}.webp`);
    const chon = mod.manifest.fields.find((f) => f.key === 'boDangMac');
    expect(chon?.options?.every((x) => x.img !== undefined)).toBe(true);
  });

  it('bikini mặc định tắt, bộ đang mặc mặc định nằm trong các bộ bật', () => {
    expect(MAC_DINH.boBat).not.toContain('bikini');
    expect(MAC_DINH.boBat).toContain(MAC_DINH.boDangMac);
  });
});

describe('trang phục', () => {
  it('mặc đúng bộ đã chọn', () => {
    const s = core.init(cau({ boDangMac: 'the-thao' }));
    expect(s.bo).toBe('the-thao');
  });

  it('id lạ (GLB cũ, gõ tay) thì về bộ bật đầu tiên — không bao giờ để trần', () => {
    const s = core.init(cau({ boDangMac: 'khong-co', boBat: ['cong-so', 'bikini'] }));
    expect(s.bo).toBe('cong-so');
    const t = core.init(cau({ boDangMac: 'khong-co', boBat: [] }));
    expect(t.bo).toBe(TRANG_PHUC[0].id);
  });

  it('bộ kế tiếp đi theo thứ tự danh mục, vòng lại đầu, bỏ qua bộ tắt', () => {
    const c = cau({ boBat: ['bikini', 'ao-thun-short', 'cong-so'] });
    expect(boKe('ao-thun-short', c)).toBe('cong-so');
    expect(boKe('cong-so', c)).toBe('bikini');
    expect(boKe('bikini', c)).toBe('ao-thun-short');
    expect(boKe('the-thao', c)).toBe('ao-thun-short'); // đang mặc bộ đã tắt
    expect(boKe('the-thao', cau({ boBat: [] }))).toBe('the-thao');
  });

  it('có quà thì đổi đồ chỉ khi bật', () => {
    const tat = core.init(cau({ doiDoKhiCoQua: false }));
    runFeed(mod, tat, qua(1_000), ctx(tat.config, 1_000));
    expect(tat.bo).toBe('ao-thun-short');

    const bat = core.init(cau({ doiDoKhiCoQua: true }));
    runFeed(mod, bat, qua(1_000), ctx(bat.config, 1_000));
    expect(bat.bo).toBe('ao-thun-jeans');
  });

  it('tự đổi theo phút, tính từ nhịp đầu tiên', () => {
    const s = core.init(cau({ doiDoPhut: 2 }));
    runTick(mod, s, 10_000, ctx(s.config, 10_000));
    runTick(mod, s, 10_000 + 119_000, ctx(s.config, 129_000));
    expect(s.bo).toBe('ao-thun-short');
    runTick(mod, s, 130_000, ctx(s.config, 130_000));
    expect(s.bo).toBe('ao-thun-jeans');
  });

  it('đổi bộ trong cấu hình là mặc ngay, đang live không tải lại', () => {
    const s = core.init(MAC_DINH);
    core.onConfig?.(s, cau({ boDangMac: 'bikini' }));
    expect(s.bo).toBe('bikini');
  });

  it('tắt đúng bộ đang mặc khi phòng đang tự đổi đồ: sang bộ bật kế tiếp', () => {
    const c = cau({ doiDoKhiCoQua: true });
    const s = core.init(c);
    core.onConfig?.(s, cau({ doiDoKhiCoQua: true, boBat: ['the-thao', 'cong-so'] }));
    expect(s.bo).toBe('the-thao');
  });
});

describe('đồng diễn', () => {
  it('có quà thì cả nhóm cùng một điệu, hết giờ thì thôi', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(1_000), ctx(s.config, 1_000));
    expect(DIEU_LUAN_PHIEN).toContain(s.dongDien?.dieu);
    expect(s.dongDien?.den).toBe(1_000 + MAC_DINH.dongDienGiay * 1_000);
    runTick(mod, s, 1_000 + MAC_DINH.dongDienGiay * 1_000, ctx(s.config, 21_000));
    expect(s.dongDien).toBeNull();
  });

  it('quà dồn kéo dài màn đang nhảy, không nhảy sang điệu khác', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(1_000), ctx(s.config, 1_000));
    const dieu = s.dongDien?.dieu;
    runFeed(mod, s, qua(5_000, 2), ctx(s.config, 5_000));
    expect(s.dongDien).toEqual({ dieu, den: 5_000 + MAC_DINH.dongDienGiay * 1_000, tu: 1_000 });
  });

  it('ngẫu nhiên: đổi sang điệu khác sau mỗi doiDieuGiay, không lặp điệu đang nhảy', () => {
    const c = cau({ doiDieuGiay: 5, dongDienGiay: 60 });
    const s = core.init(c);
    runFeed(mod, s, qua(1_000), ctx(c, 1_000));
    const dau = s.dongDien?.dieu;
    runTick(mod, s, 5_000, ctx(c, 5_000));
    expect(s.dongDien?.dieu).toBe(dau);
    runTick(mod, s, 6_000, ctx(c, 6_000));
    expect(s.dongDien?.dieu).not.toBe(dau);
    expect(DIEU_LUAN_PHIEN).toContain(s.dongDien?.dieu);
    expect(s.dongDien?.tu).toBe(6_000);
  });

  it('điệu cố định thì không tự đổi', () => {
    const c = cau({ dieu: DIEU[3] as string, doiDieuGiay: 3 });
    const s = core.init(c);
    runFeed(mod, s, qua(1_000), ctx(c, 1_000));
    runTick(mod, s, 10_000, ctx(c, 10_000));
    expect(s.dongDien?.dieu).toBe(DIEU[3]);
  });

  it('tắt đồng diễn giữa màn quà thì dừng ngay', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(1_000), ctx(s.config, 1_000));
    core.onConfig?.(s, cau({ dongDienKhiCoQua: false }));
    expect(s.dongDien).toBeNull();
  });

  it('nhân vật ảo tặng quà không làm gì', () => {
    const s = core.init(cau({ doiDoKhiCoQua: true }));
    runFeed(mod, s, { ...qua(1_000), virtual: true }, ctx(s.config, 1_000));
    expect(s.bo).toBe('ao-thun-short');
    expect(s.dongDien).toBeNull();
  });
});

describe('hợp đồng slot stage-3d', () => {
  it('đọc lại đúng yêu cầu; sai dạng thì coi như không có', () => {
    expect(
      docVuCong3D(JSON.stringify({ model: '/m/x/a.glb', trangPhuc: 'bikini', dieu: null })),
    ).toEqual({
      model: '/m/x/a.glb',
      trangPhuc: 'bikini',
      dieu: null,
    });
    expect(
      docVuCong3D(JSON.stringify({ model: '/m/x/a.glb', dieu: null, tuDo: ['Samba Dancing'] }))
        ?.tuDo,
    ).toEqual(['Samba Dancing']);
    expect(docVuCong3D(JSON.stringify({ model: '/m/x/a.glb', tuDo: [1] }))?.tuDo).toBeUndefined();
    expect(docVuCong3D('{"model":""}')).toBeNull();
    expect(docVuCong3D('không phải json')).toBeNull();
    expect(docVuCong3D(null)).toBeNull();
  });
});

describe('nút trên thẻ', () => {
  it('manifest khai đúng các nút mà onAction nhận', () => {
    expect(mod.manifest.actions?.map((a) => a.op)).toEqual([NUT.nhay, NUT.thoi]);
  });

  it('"Nhảy ngay" nhảy mãi tới khi bấm "Thôi nhảy", kể cả khi tắt đồng diễn theo quà', () => {
    const s = core.init(cau({ dongDienKhiCoQua: false }));
    runAction(mod, s, NUT.nhay, ctx(s.config, 1_000));
    expect(s.dongDien?.den).toBeNull();
    runTick(mod, s, 3_600_000, ctx(s.config, 3_600_000));
    expect(s.dongDien).not.toBeNull();
    expect(core.trangThaiNut?.(s, 3_600_000).bat).toBe(NUT.nhay);
  });

  it('quà giữa màn bấm tay không biến nó thành màn hẹn giờ', () => {
    const s = core.init(MAC_DINH);
    runAction(mod, s, NUT.nhay, ctx(s.config, 1_000));
    runFeed(mod, s, qua(2_000), ctx(s.config, 2_000));
    expect(s.dongDien?.den).toBeNull();
  });

  it('bấm lại giữa màn là sang điệu khác', () => {
    const s = core.init(MAC_DINH);
    runAction(mod, s, NUT.nhay, ctx(s.config, 1_000));
    const dau = s.dongDien?.dieu;
    runAction(mod, s, NUT.nhay, ctx(s.config, 2_000));
    expect(s.dongDien?.dieu).not.toBe(dau);
  });

  it('"Thôi nhảy" dừng hẳn và đứng nghỉ; quà vẫn kéo dậy nhảy một màn rồi về nghỉ', () => {
    const s = core.init(MAC_DINH);
    expect(core.trangThaiNut?.(s, 0).bat).toBeNull();
    runAction(mod, s, NUT.nhay, ctx(s.config, 1_000));
    runAction(mod, s, 'khong-co', ctx(s.config, 1_500));
    expect(s.dongDien).not.toBeNull();
    runAction(mod, s, NUT.thoi, ctx(s.config, 2_000));
    expect(s.dongDien).toBeNull();
    expect(s.nghi).toBe(true);
    expect(core.trangThaiNut?.(s, 2_000).bat).toBe(NUT.thoi);
    runFeed(mod, s, qua(3_000), ctx(s.config, 3_000));
    expect(core.trangThaiNut?.(s, 3_000).bat).toBe(NUT.nhay);
    runTick(mod, s, 3_000 + s.config.dongDienGiay * 1_000, ctx(s.config, 23_000));
    expect(s.dongDien).toBeNull();
    expect(s.nghi).toBe(true);
  });

  it('chọn một điệu cố định thì quà và nút đều nhảy điệu đó', () => {
    const s = core.init(cau({ dieu: DIEU[3] as string }));
    runAction(mod, s, NUT.nhay, ctx(s.config, 1_000));
    expect(s.dongDien?.dieu).toBe(DIEU[3]);
    runAction(mod, s, NUT.nhay, ctx(s.config, 2_000));
    expect(s.dongDien?.dieu).toBe(DIEU[3]);
  });

  it('chọn điệu cố định giữa màn là nhảy điệu đó ngay, giữ giờ hết màn', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(1_000), ctx(s.config, 1_000));
    const den = s.dongDien?.den;
    core.onConfig?.(s, cau({ dieu: DIEU[5] as string }));
    expect(s.dongDien?.dieu).toBe(DIEU[5]);
    expect(s.dongDien?.den).toBe(den);
  });

  it('tắt công tắc đồng diễn theo quà không cắt màn người vận hành bấm', () => {
    const s = core.init(MAC_DINH);
    runAction(mod, s, NUT.nhay, ctx(s.config, 1_000));
    core.onConfig?.(s, cau({ dongDienKhiCoQua: false }));
    expect(s.dongDien).not.toBeNull();
  });

  it('mặc định nhảy ngẫu nhiên', () => {
    expect(MAC_DINH.dieu).toBe(NGAU_NHIEN);
  });

  it('ô Điệu hiện trên thẻ thành nút, hộp phụ có ô đổi điệu mỗi … giây', () => {
    expect(mod.manifest.quick?.slice(0, 2)).toEqual(['boDangMac', 'dieu']);
    const o = mod.manifest.fields.find((f) => f.key === 'dieu');
    expect(o?.popup).toEqual(['doiDieuGiay']);
  });
});

describe('kho điệu', () => {
  it('đủ 77 điệu của kho, không trùng tên', () => {
    expect(DIEU).toHaveLength(77);
    expect(new Set(DIEU).size).toBe(77);
  });

  it('vòng tự đổi bỏ đoạn nối và điệu cần dây, bắt đầu bằng hip hop', () => {
    const boRa = KHO_DIEU.filter((x) => x.noi === true || x.daoCu === true).map((x) => x.ten);
    expect(boRa).toContain('Headspin Start');
    expect(boRa).toContain('Rope Swinging');
    for (const t of boRa) expect(DIEU_LUAN_PHIEN).not.toContain(t);
    expect(DIEU_LUAN_PHIEN).toHaveLength(77 - boRa.length);
    expect(DIEU_LUAN_PHIEN[0]).toBe('Hip Hop Dancing');
  });

  it('ô chọn điệu có "ngẫu nhiên" và đủ mọi điệu, chọn tay được cả đoạn nối', () => {
    const o = mod.manifest.fields.find((f) => f.key === 'dieu');
    expect(o?.options?.map((x) => x.value)).toEqual([NGAU_NHIEN, ...DIEU]);
    const s = core.init(cau({ dieu: 'Headspin Start' }));
    runAction(mod, s, NUT.nhay, ctx(s.config, 1_000));
    expect(s.dongDien?.dieu).toBe('Headspin Start');
  });
});

describe('nhân vật', () => {
  it('mặc định mọi người có mặt, mặc theo cả nhóm', () => {
    for (const x of NHAN_VAT) expect(MAC_DINH.nhanVat[x.id]).toEqual({ co: true, bo: THEO_NHOM });
  });

  it('tab Nhân vật là ô roster: mỗi người một tab, có Có mặt và Bộ đồ', () => {
    const o = mod.manifest.fields.find((f) => f.key === 'nhanVat');
    expect(o?.type).toBe('roster');
    expect(o?.options?.map((x) => x.value)).toEqual(NHAN_VAT.map((x) => x.id));
    expect(o?.fields?.map((x) => x.key)).toEqual(['co', 'bo']);
    expect(o?.fields?.[1]?.options?.every((x) => x.img !== undefined)).toBe(true);
  });

  it('sửa một ô của một người không đụng người khác', () => {
    const v = suaRoster(MAC_DINH.nhanVat, 'dj', 'bo', 'bikini');
    expect(mucRoster(v, 'dj')).toEqual({ co: true, bo: 'bikini' });
    expect(mucRoster(v, 'man-chieu')).toEqual({ co: true, bo: THEO_NHOM });
    expect(mucRoster(null, 'dj')).toEqual({});
    expect(suaRoster(null, 'dj', 'co', false)).toEqual({ dj: { co: false } });
  });

  it('hợp đồng giữ được người vắng mặt và bộ riêng', () => {
    const v = docVuCong3D(
      JSON.stringify({ model: '/m/x/a.glb', dieu: null, an: ['dj'], boRieng: { 'vu-cong-2': 'bikini' } }),
    );
    expect(v?.an).toEqual(['dj']);
    expect(v?.boRieng).toEqual({ 'vu-cong-2': 'bikini' });
  });
});

describe('đám đông', () => {
  const o = mod.manifest.fields.find((f) => f.key === 'damDong');

  it('mặc định chưa có nhóm nào; ô là list, tối đa 6 nhóm, ở tab Đám đông', () => {
    expect(MAC_DINH.damDong).toEqual([]);
    expect(o?.type).toBe('list');
    expect(o?.max).toBe(6);
    expect(o?.tab).toBe('Đám đông');
  });

  it('thêm, sửa, bỏ nhóm', () => {
    if (o === undefined) throw new Error('thiếu ô damDong');
    let v = themList(o, [], 'a');
    v = themList(o, v, 'b');
    expect(mucList(v).map((x) => x['id'])).toEqual(['a', 'b']);
    v = suaList(v, 1, 'so', 20);
    expect(mucList(v)[1]?.['so']).toBe(20);
    expect(mucList(v)[0]?.['so']).toBe(o.moi?.['so']);
    v = boList(v, 0);
    expect(mucList(v).map((x) => x['id'])).toEqual(['b']);
    // Nhóm thêm ra phải qua được schema.
    expect(() => schema.parse({ damDong: v })).not.toThrow();
  });

  it('gộp cấu hình: nhóm thiếu ô lấy ô của nhóm mới, lưu sai dạng thì về rỗng', () => {
    const md = MAC_DINH as unknown as Record<string, never>;
    const ra = phuCauHinh(mod.manifest.fields, md, { damDong: [{ id: 'x', so: 3 }] });
    expect(ra['damDong']).toEqual([{ ...o?.moi, id: 'x', so: 3 }]);
    expect(phuCauHinh(mod.manifest.fields, md, { damDong: 'hỏng' })['damDong']).toEqual([]);
  });

  it('hợp đồng giữ được nhóm đám đông, bỏ nhóm sai dạng', () => {
    const nhom = { id: 'a', so: 5, khuVuc: 'quanh-san', bo: ['bikini'], theoNhom: true };
    const doc = (x: unknown) => docVuCong3D(JSON.stringify({ model: '/m/x/a.glb', dieu: null, damDong: x }));
    expect(doc([nhom])?.damDong).toEqual([nhom]);
    expect(doc([{ ...nhom, so: '5' }])?.damDong).toBeUndefined();
  });

  it('5 tab theo thứ tự: Cài đặt, Vai chính, Đám đông, Điệu nhảy, Trang phục', () => {
    const tabs: string[] = [];
    for (const f of mod.manifest.fields) {
      const t = f.tab ?? 'Cài đặt';
      if (!tabs.includes(t)) tabs.push(t);
    }
    expect(tabs).toEqual(['Cài đặt', 'Vai chính', 'Đám đông', 'Điệu nhảy', 'Trang phục']);
  });
});
