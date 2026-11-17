import { describe, expect, it } from 'vitest';
import { hienO } from '@live/contracts';
import type { TheTach } from '@live/contracts';
import { manifest, schema } from '../../../client/modules/story/src/manifest';
import { dongTrangThai, duongApDung, oDaTach } from '../../../client/shared/stage-sdk/src/the-tach';

const THE: TheTach = {
  id: 'the-loai',
  name: 'Thể loại truyện',
  icon: '🏷️',
  summary: 'x',
  congTac: 'theoTheLoai',
  fields: ['theLoai'],
  trangThai: { nhan: 'Truyện kế tiếp', o: 'truyenSau', khoa: ['title', 'loai'], khiTrong: 'đang tìm…' },
};

describe('các thẻ tách của Kể truyện', () => {
  it('xếp ngay sau Kể truyện: thể loại, giao lưu, ảnh hoặc đồng hồ', () => {
    expect((manifest.theTach ?? []).map((t) => t.id)).toEqual(['the-loai', 'giao-luu', 'anh-hoac-dong-ho']);
  });

  it('hộp cấu hình không còn các ô đã tách', () => {
    const da = oDaTach(manifest);
    for (const k of ['giaoLuuBat', 'giaoLuuSau', 'giaoLuuGiay', 'anhHoacDongHo']) expect(da.has(k)).toBe(true);
  });

  it('phòng cũ chưa có công tắc giao lưu vẫn đang bật, ảnh/đồng hồ vẫn tắt', () => {
    const c = schema.parse({});
    expect(c.giaoLuuBat).toBe(true);
    expect(c.anhHoacDongHo).toBe(false);
  });

  it('tắt giao lưu thì ẩn hai ô số trên thẻ', () => {
    const o = manifest.fields.filter((f) => f.key === 'giaoLuuSau' || f.key === 'giaoLuuGiay');
    expect(o).toHaveLength(2);
    for (const f of o) {
      expect(hienO(f, { cachKe: 'mc-day-du', giaoLuuBat: true })).toBe(true);
      expect(hienO(f, { cachKe: 'mc-day-du', giaoLuuBat: false })).toBe(false);
    }
  });
});

describe('thẻ riêng tách từ cấu hình module', () => {
  it('hộp cấu hình không hiện lại ô đã có thẻ riêng', () => {
    expect([...oDaTach({ theTach: [THE] })].sort()).toEqual(['theLoai', 'theoTheLoai']);
    expect(oDaTach({}).size).toBe(0);
  });

  it('dòng trạng thái ghép tên và thể loại của truyện kế tiếp', () => {
    expect(dongTrangThai(THE, { truyenSau: { title: 'Tấm Cám', loai: 'cổ tích' } })).toBe(
      'Truyện kế tiếp: Tấm Cám · cổ tích',
    );
    expect(dongTrangThai(THE, { truyenSau: { title: 'Tấm Cám', loai: '  ' } })).toBe('Truyện kế tiếp: Tấm Cám');
  });

  it('chưa có truyện thì báo đang tìm', () => {
    expect(dongTrangThai(THE, { truyenSau: {} })).toBe('Truyện kế tiếp: đang tìm…');
    expect(dongTrangThai(THE, {})).toBe('Truyện kế tiếp: đang tìm…');
  });

  it('thẻ không khai trạng thái thì không có dòng nào', () => {
    expect(dongTrangThai({}, { truyenSau: { title: 'A' } })).toBe('');
  });

  it('điền id thiết kế vào đường áp dụng', () => {
    expect(duongApDung('/s/truyen-sau/{id}/ap-dung', 'ke-chuyen')).toBe('/s/truyen-sau/ke-chuyen/ap-dung');
  });
});
