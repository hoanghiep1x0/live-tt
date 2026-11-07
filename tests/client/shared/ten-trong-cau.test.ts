import { describe, expect, it } from 'vitest';
import { tachTenTrongCau } from '../../../client/shared/stage-sdk/src/ten-trong-cau';

const tenCua = (ds: ReturnType<typeof tachTenTrongCau>) => ds.filter((d) => d.ten).map((d) => d.chu);

describe('tách tên người xem trong lời MC', () => {
  it('tô đúng tên, phần còn lại là chữ thường, ghép lại ra nguyên câu', () => {
    const cau = '𝐘𝐔𝐋𝐎𝐍𝐆🐈 ơi, Rose xinh xỉu luôn á, mình thương bạn ghê ❤';
    const ds = tachTenTrongCau(cau, ['𝐘𝐔𝐋𝐎𝐍𝐆🐈', 'Hạnh']);
    expect(tenCua(ds)).toEqual(['𝐘𝐔𝐋𝐎𝐍𝐆🐈']);
    expect(ds.map((d) => d.chu).join('')).toBe(cau);
  });

  it('tên có khoảng trắng ở giữa câu', () => {
    const ds = tachTenTrongCau('Cả phòng ơi, vỗ tay cảm ơn qua đó đã làm được giùm mình nha 👏', ['qua đó đã làm được']);
    expect(tenCua(ds)).toEqual(['qua đó đã làm được']);
  });

  it('tên dài thắng tên ngắn trùng đầu', () => {
    expect(tenCua(tachTenTrongCau('Cảm ơn Lan Anh nha', ['Lan', 'Lan Anh']))).toEqual(['Lan Anh']);
  });

  it('không tô tên nằm lẫn trong một chữ khác', () => {
    expect(tenCua(tachTenTrongCau('Anh em ơi chào nha', ['An']))).toEqual([]);
    expect(tenCua(tachTenTrongCau('Chào An, chào Bình', ['An', 'Bình']))).toEqual(['An', 'Bình']);
  });

  it('MC gọi gọn: chữ đầu của tên nhiều chữ, tên bỏ emoji', () => {
    const cau = 'Yazmín thương lại nha, châm kẹp tóc xinh ghê. Gấu live hoa biết ơi';
    expect(tenCua(tachTenTrongCau(cau, ['Yazmín Domínguez', 'châm', 'Gấu live hoa biết 🐻']))).toEqual([
      'Yazmín',
      'châm',
      'Gấu live hoa biết',
    ]);
  });

  it('không gọi gọn bằng chữ xưng hô', () => {
    expect(tenCua(tachTenTrongCau('Anh em ơi, chào Tuấn', ['Anh Tuấn']))).toEqual([]);
    expect(tenCua(tachTenTrongCau('Bé ngoan quá', ['Bé Na']))).toEqual([]);
  });

  it('bỏ tên một ký tự và tên rỗng; không có tên thì nguyên câu là chữ thường', () => {
    expect(tachTenTrongCau('A ơi chào', ['A', '', '  '])).toEqual([{ chu: 'A ơi chào', ten: false }]);
    expect(tachTenTrongCau('', ['An'])).toEqual([]);
  });
});
