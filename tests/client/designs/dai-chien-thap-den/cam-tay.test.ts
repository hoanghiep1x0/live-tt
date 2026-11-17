import { describe, expect, it } from 'vitest';
import { khoaKeTiep, tenCamNv, type CamNv } from '../../../../client/designs/dai-chien-thap-den/src/cam-tay';

const nv = (khoa: string, that = true, trung = false): CamNv => ({ khoa, ten: khoa.toUpperCase(), that, cap: 2, trung });
const ds = [nv('a'), nv('b'), nv('c')];

describe('khoaKeTiep', () => {
  it('đi tới và đi lui trong danh sách', () => {
    expect(khoaKeTiep(ds, 'a', 1)).toBe('b');
    expect(khoaKeTiep(ds, 'b', -1)).toBe('a');
  });

  it('vòng lại ở hai đầu', () => {
    expect(khoaKeTiep(ds, 'c', 1)).toBe('a');
    expect(khoaKeTiep(ds, 'a', -1)).toBe('c');
  });

  it('chưa giữ ai: Sau lấy người đầu, Trước lấy người cuối', () => {
    expect(khoaKeTiep(ds, '', 1)).toBe('a');
    expect(khoaKeTiep(ds, '', -1)).toBe('c');
  });

  it('sân trống thì không có ai', () => {
    expect(khoaKeTiep([], '', 1)).toBeNull();
  });
});

describe('tenCamNv', () => {
  it('đánh dấu nhân vật máy và trứng', () => {
    expect(tenCamNv(nv('a'))).toBe('A · cấp 2');
    expect(tenCamNv(nv('b', false))).toBe('🤖 B · cấp 2');
    expect(tenCamNv(nv('c', true, true))).toBe('C · trứng');
  });
});
