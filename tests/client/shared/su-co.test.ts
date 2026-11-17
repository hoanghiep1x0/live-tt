import { describe, expect, it } from 'vitest';
import type { ConfigField } from '@live/contracts';
import { apTin, BAN_DAU } from '../../../client/shared/stage-sdk/src/state';
import { dienGiaiLoiAi, dsSuCo, loiAnhCua } from '../../../client/shared/stage-sdk/src/su-co';

const OK = { matNoi: false, aiBat: true, aiLoi: null, loiAnh: '', mayChu: {} };

describe('diễn giải lỗi AI', () => {
  it('khoá sai ra câu tiếng Việt, không còn địa chỉ API', () => {
    const c = dienGiaiLoiAi('https://api.anthropic.com/v1/messages trả mã 401: invalid x-api-key');
    expect(c).toContain('Khoá API bị từ chối');
    expect(c).not.toContain('https://');
  });

  it('đang chạy bằng lượt dự phòng thì nói truyện vẫn chạy', () => {
    const c = dienGiaiLoiAi('https://x/v1 trả mã 401: invalid x-api-key (đang dùng lượt dự phòng)');
    expect(c).toContain('Khoá API bị từ chối');
    expect(c).toContain('Truyện vẫn chạy');
    expect(c).not.toContain('(đang dùng');
  });

  it('lỗi chưa biết giữ nguyên chữ gốc', () => {
    expect(dienGiaiLoiAi('công cụ không trả lời sau 120 giây')).toBe('công cụ không trả lời sau 120 giây');
  });
});

describe('danh sách sự cố', () => {
  it('phòng ổn thì không báo gì', () => {
    expect(dsSuCo(OK)).toEqual([]);
  });

  it('MC đang tắt thì lỗi cũ của MC không báo', () => {
    expect(dsSuCo({ ...OK, aiBat: false, aiLoi: 'lỗi' })).toEqual([]);
  });

  it('mất máy chủ đứng đầu, rồi tới MC, rồi việc máy chủ báo', () => {
    const ds = dsSuCo({
      matNoi: true,
      aiBat: true,
      aiLoi: 'lỗi',
      loiAnh: 'muse.ai hỏng',
      mayChu: { 'o-cung': 'Ổ C: chỉ còn 151 MB', giong: 'hỏng' },
    });
    expect(ds.map((x) => x.id)).toEqual(['may-chu', 'ai', 'anh', 'o-cung', 'giong']);
    expect(ds.find((x) => x.id === 'o-cung')?.tieuDe).toBe('Ổ cứng sắp đầy');
  });

  it('loại sự cố bản này chưa biết vẫn hiện, không bị nuốt', () => {
    expect(dsSuCo({ ...OK, mayChu: { 'loai-moi': 'có chuyện' } })[0]).toMatchObject({
      tieuDe: 'Phòng gặp sự cố',
      chu: 'có chuyện',
    });
  });
});

describe('lỗi vẽ ảnh đọc theo khai báo của manifest', () => {
  const o: ConfigField = {
    key: 'moc',
    label: 'Ảnh',
    type: 'anh-truyen',
    truyen: { doan: 'passages', phongCach: 'p', hoSo: 'h', hoSoCua: 'c', loi: 'anhLoi' },
  } as ConfigField;
  const mods = [{ id: 'story', ui: { fields: [o] } }];

  it('tính năng bật và có lỗi thì lấy lỗi', () => {
    expect(loiAnhCua(mods, ['story'], { story: { anhLoi: ' muse.ai hỏng ' } })).toBe('muse.ai hỏng');
  });

  it('tính năng tắt, hay ô lỗi trống, thì không báo', () => {
    expect(loiAnhCua(mods, [], { story: { anhLoi: 'hỏng' } })).toBe('');
    expect(loiAnhCua(mods, ['story'], { story: { anhLoi: '' } })).toBe('');
    expect(loiAnhCua(mods, ['story'], {})).toBe('');
  });
});

describe('tin sự cố từ máy chủ', () => {
  it('thay cả danh sách của phòng mình', () => {
    const s = apTin({ ...BAN_DAU, cuaMinh: 'a', live: 'a' }, { t: 'su-co', ds: { nguon: 'đứt' } });
    expect(s.suCo).toEqual({ nguon: 'đứt' });
    expect(apTin(s, { t: 'su-co', ds: {} }).suCo).toEqual({});
  });

  it('tin của phòng khác không đè lên trang này', () => {
    const s = apTin({ ...BAN_DAU, cuaMinh: 'a', live: 'b' }, { t: 'su-co', ds: { nguon: 'đứt' } });
    expect(s.suCo).toEqual({});
  });
});
