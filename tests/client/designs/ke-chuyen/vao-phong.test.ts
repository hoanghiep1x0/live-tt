import { describe, expect, it } from 'vitest';
import type { FeedItem } from '@live/contracts';
import { HIEN_MS, nguoiMoiVao } from '../../../../client/designs/ke-chuyen/src/parts/vao-phong';

function vao(id: number, at: number, name: string, virtual = false): FeedItem {
  return { id, at, kind: 'join', name, text: 'vào phòng', user: `u${id}`, ...(virtual ? { virtual } : {}) };
}

describe('báo người mới vào phòng', () => {
  it('mới nhất trước, tối đa hai tên, còn lại gộp', () => {
    const feed = [vao(1, 0, 'A'), vao(2, 100, 'B'), vao(3, 200, 'C')];
    const kq = nguoiMoiVao(feed, 300);
    expect(kq.hien.map((f) => f.name)).toEqual(['C', 'B']);
    expect(kq.them).toBe(1);
  });

  it('hết thời gian thì thôi báo', () => {
    expect(nguoiMoiVao([vao(1, 0, 'A')], HIEN_MS).hien).toEqual([]);
  });

  it('không báo nhân vật ảo, không báo mục khác', () => {
    const binhLuan: FeedItem = { id: 2, at: 0, kind: 'comment', name: 'B', text: 'chào' };
    expect(nguoiMoiVao([vao(1, 0, 'A', true), binhLuan], 10).hien).toEqual([]);
  });
});
