import { describe, expect, it } from 'vitest';
import { bo, chuan, ghep, goiY, laMoi, tach, them } from '../../../client/shared/stage-sdk/src/chon-them';

const NGUON = ['cổ tích Việt Nam', 'truyện cười', 'ngụ ngôn'];

describe('ô chọn nhiều mục: tìm được, thêm được', () => {
  it('đọc và ghi lại đúng chuỗi ngăn bằng dấu phẩy', () => {
    expect(tach('truyện cười, cổ tích Việt Nam')).toEqual(['truyện cười', 'cổ tích Việt Nam']);
    // Khoảng trắng thừa và ô rỗng bị bỏ — máy chủ cũng đọc y như vậy.
    expect(tach('  a ,, b ,  ')).toEqual(['a', 'b']);
    expect(tach('')).toEqual([]);
    expect(tach(undefined)).toEqual([]);
    expect(tach(123)).toEqual([]);
    expect(ghep(['a', 'b'])).toBe('a, b');
    expect(ghep([])).toBe('');
  });

  it('không thêm trùng, kể cả khác hoa thường', () => {
    expect(them(['truyện cười'], 'Truyện Cười')).toEqual(['truyện cười']);
    expect(them(['truyện cười'], '  truyện   cười  ')).toEqual(['truyện cười']);
    expect(them(['a'], 'b')).toEqual(['a', 'b']);
    expect(them(['a'], '   ')).toEqual(['a'], 'gõ khoảng trắng không tạo mục rỗng');
  });

  it('bỏ mục không phân biệt hoa thường', () => {
    expect(bo(['truyện cười', 'ngụ ngôn'], 'Truyện Cười')).toEqual(['ngụ ngôn']);
    expect(bo(['a'], 'khong-co')).toEqual(['a']);
  });

  it('gợi ý lọc theo chữ đang gõ và bỏ mục đã chọn', () => {
    expect(goiY(NGUON, [], '')).toEqual(NGUON);
    expect(goiY(NGUON, [], 'cười')).toEqual(['truyện cười']);
    expect(goiY(NGUON, [], 'TRUYỆN')).toEqual(['truyện cười'], 'tìm không phân biệt hoa thường');
    expect(goiY(NGUON, ['truyện cười'], 'truyện')).toEqual([], 'đã chọn thì thôi gợi ý');
  });

  it('chữ lạ thì mời thêm, chữ đã có thì không', () => {
    expect(laMoi(NGUON, [], 'truyện ma')).toBe(true);
    expect(laMoi(NGUON, [], 'Truyện Cười')).toBe(false, 'đã có trong gợi ý');
    expect(laMoi(NGUON, ['truyện ma'], 'truyện ma')).toBe(false, 'đã chọn rồi');
    expect(laMoi(NGUON, [], '   ')).toBe(false);
  });

  it('chuẩn hoá gộp khoảng trắng và hoa thường', () => {
    expect(chuan('  Truyện   Cười ')).toBe('truyện cười');
  });
});
