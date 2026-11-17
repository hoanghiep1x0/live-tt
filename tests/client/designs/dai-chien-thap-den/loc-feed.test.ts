import { describe, expect, it } from 'vitest';
import type { FeedItem } from '@live/contracts';
import { locFeedMoi } from '../../../../client/designs/dai-chien-thap-den/src/loc-feed';

const muc = (id: number): FeedItem => ({ id, at: id, kind: 'join', name: `K${id}`, text: 'vào phòng' });
const ids = (ds: readonly FeedItem[]) => ds.map((f) => f.id);

describe('locFeedMoi', () => {
  it('chỉ lấy tin chưa đưa vào game', () => {
    const kq = locFeedMoi({ phien: 100, id: 2 }, 100, [muc(1), muc(2), muc(3), muc(4)]);
    expect(ids(kq.moi)).toEqual([3, 4]);
    expect(kq.moc).toEqual({ phien: 100, id: 4 });
    expect(kq.phienMoi).toBe(false);
  });

  it('bản phiên đến trễ có id thấp hơn thì không xoá trận, không tính lại', () => {
    const kq = locFeedMoi({ phien: 100, id: 10 }, 100, [muc(8), muc(9)]);
    expect(kq.phienMoi).toBe(false);
    expect(kq.moi).toEqual([]);
    expect(kq.moc.id).toBe(10);
  });

  it('đổi startedAt là phiên mới: báo xoá và lấy lại từ đầu', () => {
    const kq = locFeedMoi({ phien: 100, id: 50 }, 200, [muc(1), muc(2)]);
    expect(kq.phienMoi).toBe(true);
    expect(ids(kq.moi)).toEqual([1, 2]);
    expect(kq.moc).toEqual({ phien: 200, id: 2 });
  });

  it('phiên mới còn trống vẫn báo xoá', () => {
    const kq = locFeedMoi({ phien: 100, id: 50 }, 200, []);
    expect(kq.phienMoi).toBe(true);
    expect(kq.moc).toEqual({ phien: 200, id: 0 });
  });
});
