import { describe, expect, it } from 'vitest';
import { anhChoDoan, cacMoc, docNhanVat, tinhTrangMoc } from '@live/contracts';
import type { MocAnh } from '@live/contracts';

const DOAN = ['Cậu bé bỏ nhà đi.', 'Cậu lang thang.', 'Cậu về nhà.', 'Cây mọc lên.', 'Sữa trào ra.'];

const moc = (tu: number, anh = ''): MocAnh => ({
  tu,
  ta: `cảnh ${tu}`,
  nhanVat: ['Cậu bé'],
  anh,
  dau: anh === '' ? '' : (DOAN[tu - 1] ?? ''),
});

describe('hồ sơ nhân vật', () => {
  it('mỗi dòng "Tên: ngoại hình", dòng lạc bị bỏ', () => {
    expect(docNhanVat('Cậu bé: áo nâu\nghi chú lạc\nMẹ: áo tím').map((n) => n.ten)).toEqual([
      'Cậu bé',
      'Mẹ',
    ]);
  });
});

describe('mốc ảnh trong cấu hình', () => {
  it('mục hỏng bị bỏ, không sập', () => {
    expect(cacMoc([null, { tu: 2, ta: 'x' }, 'rác', { ta: 'thiếu đoạn' }])).toHaveLength(1);
    expect(cacMoc('rác')).toEqual([]);
  });
});

describe('ảnh hiện theo đoạn', () => {
  it('ảnh giữ từ mốc của nó tới mốc kế tiếp — không đoạn nào cũng cần ảnh', () => {
    const ds = [moc(1, '/u/a.png'), moc(4, '/u/d.png')];
    expect(anhChoDoan(ds, 0, DOAN)).toBe('/u/a.png');
    expect(anhChoDoan(ds, 2, DOAN)).toBe('/u/a.png');
    expect(anhChoDoan(ds, 3, DOAN)).toBe('/u/d.png');
  });

  it('mốc chưa vẽ thì giữ ảnh trước', () => {
    expect(anhChoDoan([moc(1, '/u/a.png'), moc(3)], 4, DOAN)).toBe('/u/a.png');
  });

  it('sửa đoạn của mốc thì ảnh lệch và thôi hiện', () => {
    const ds = [moc(1, '/u/a.png')];
    const truyenMoi = ['Ngày xưa có một nàng công chúa.', ...DOAN.slice(1)];
    expect(tinhTrangMoc(ds[0] as MocAnh, truyenMoi)).toBe('lech');
    expect(anhChoDoan(ds, 0, truyenMoi)).toBe('');
  });

  it('chưa vẽ thì là chưa vẽ', () => {
    expect(tinhTrangMoc(moc(2), DOAN)).toBe('chua-ve');
  });
});
