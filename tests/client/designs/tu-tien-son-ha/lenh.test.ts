import { describe, expect, it } from 'vitest';
import { docLenh } from '../../../../client/designs/tu-tien-son-ha/src/loi/lenh';

describe('docLenh', () => {
  it.each([
    ['núi', { k: 'phe', phe: 'son' }],
    ['Sơn Tinh', { k: 'phe', phe: 'son' }],
    ['nui', { k: 'phe', phe: 'son' }],
    ['NƯỚC!!!', { k: 'phe', phe: 'thuy' }],
    ['thuy tinh', { k: 'phe', phe: 'thuy' }],
    ['A', { k: 'dap', chon: 0 }],
    ['b.', { k: 'dap', chon: 1 }],
    ['đáp án C', { k: 'dap', chon: 2 }],
    ['c c c', { k: 'dap', chon: 2 }],
    ['đánh', { k: 'danh' }],
    ['ĐÁNH NÓ ĐI', { k: 'danh' }],
    ['độ', { k: 'ho' }],
    ['độ độ độ', { k: 'ho' }],
    ['hộ pháp', { k: 'ho' }],
    ['tôi', { k: 'toi' }],
    ['tu vi', { k: 'toi' }],
  ])('%s', (chu, lenh) => {
    expect(docLenh(chu)).toEqual(lenh);
  });

  it.each(['abc', 'a b', 'chào cả nhà', 'nước mắt', 'ai thắng vậy'])('"%s" chỉ là lời nói', (chu) => {
    expect(docLenh(chu)).toEqual({ k: 'noi' });
  });
});
