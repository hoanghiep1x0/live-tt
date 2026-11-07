import { describe, expect, it } from 'vitest';
import type { FeedItem } from '@live/contracts';
import { HIEN_MS, nguoiMoiVao } from '../../../../client/designs/ke-chuyen/src/parts/vao-phong';

function vao(id: number, at: number, name: string, virtual = false): FeedItem {
  return { id, at, kind: 'join', name, text: 'vào phòng', user: `u${id}`, ...(virtual ? { virtual } : {}) };
}

describe('báo người mới vào phòng', () => {
  const ten = (kq: { dong: readonly (readonly FeedItem[])[] }) =>
    kq.dong.map((d) => d.map((f) => f.name));

  it('phòng đông: mỗi dòng hai tên, hết chỗ thì gộp "và N người khác"', () => {
    // Tám người vào trong một nhịp 4 giây.
    const feed = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((t, i) => vao(i + 1, i * 100, t));
    const kq = nguoiMoiVao(feed, 800);
    expect(ten(kq)).toEqual([
      ['H', 'G'],
      ['F', 'E'],
      ['D', 'C'],
    ]);
    expect(kq.them).toBe(2);
  });

  it('phòng vắng thì chỉ báo đúng người vừa vào, một dòng', () => {
    const kq = nguoiMoiVao([vao(1, 0, 'A'), vao(2, 100, 'B')], 200);
    expect(ten(kq)).toEqual([['B', 'A']]);
    expect(kq.them).toBe(0);
  });

  it('một người vào thì một dòng một tên', () => {
    expect(ten(nguoiMoiVao([vao(1, 0, 'A')], 100))).toEqual([['A']]);
  });

  it('hết thời gian thì thôi báo', () => {
    expect(nguoiMoiVao([vao(1, 0, 'A')], HIEN_MS).dong).toEqual([]);
  });

  it('không báo nhân vật ảo, không báo mục khác', () => {
    const binhLuan: FeedItem = { id: 2, at: 0, kind: 'comment', name: 'B', text: 'chào' };
    expect(nguoiMoiVao([vao(1, 0, 'A', true), binhLuan], 10).dong).toEqual([]);
  });
});
