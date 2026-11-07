import { describe, expect, it } from 'vitest';
import type { FeedItem, LenhGo } from '@live/contracts';
import { dungGhe } from '../../../../client/designs/ke-chuyen/src/parts/ghe';
import { gheSang, SANG_MS, treuDangChay, TREU_MS } from '../../../../client/designs/ke-chuyen/src/parts/lenh-ghe';

const GHE = dungGhe(7);
const muc = (id: number, at: number, lenh: LenhGo, name = 'Lan'): FeedItem => ({
  id,
  at,
  kind: 'comment',
  name,
  text: '',
  lenh,
});

describe('lệnh gõ về ghế', () => {
  it('"chỗ của tôi" làm ghế sáng một lúc rồi tắt', () => {
    const feed = [muc(1, 1_000, { loai: 'cho', ma: 'B4', i: 11 })];
    expect(gheSang(feed, GHE, 2_000)[0]?.chu).toBe('📍 B4 · Lan');
    expect(gheSang(feed, GHE, 1_000 + SANG_MS + 1)).toEqual([]);
  });

  it('"ghế B4" xin không được thì báo đã có người', () => {
    const feed = [muc(1, 0, { loai: 'ghe', ma: 'B4', i: 11, ok: false, lyDo: 'ghế đã có người' })];
    const [g] = gheSang(feed, GHE, 100);
    expect(g?.loi).toBe(true);
    expect(g?.chu).toBe('B4 đã có người');
  });

  it('đánh yêu bay giữa hai ghế; thiếu ghế thì thôi', () => {
    const co = [muc(1, 0, { loai: 'treu', dich: 'Minh', tu: 0, den: 19 })];
    expect(treuDangChay(co, GHE, 500)).toHaveLength(1);
    expect(treuDangChay(co, GHE, TREU_MS + 1)).toEqual([]);
    const thieu = [muc(2, 0, { loai: 'treu', dich: 'ai đó', tu: 0 })];
    expect(treuDangChay(thieu, GHE, 500)).toEqual([]);
  });
});
