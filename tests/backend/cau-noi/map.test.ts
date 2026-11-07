// Ánh xạ tin TikTok → LiveEvent của cầu nối (backend/cau-noi/src/map.ts). Luật: docs/07 §6.
import { describe, expect, it } from 'vitest';
import {
  classifyError,
  mapChat,
  mapGift,
  mapLike,
  mapMember,
  mapLuotXem,
  mapUser,
  mapViewers,
  normChannel,
} from '../../../backend/cau-noi/src/map';

const user = {
  displayId: 'lan.99',
  nickname: 'Lan',
  avatarThumb: { urlList: ['http://x/a.jpg', 'https://p16/a.jpg'] },
};
const lan = { user: 'lan.99', name: 'Lan', avatar: 'https://p16/a.jpg' };

describe('người gửi', () => {
  it('nick làm khoá, tên hiển thị, ảnh https đầu tiên', () => {
    expect(mapUser(user)).toEqual(lan);
    expect(mapUser({ uniqueId: 'abc' })).toEqual({ user: 'abc', name: 'abc' });
  });

  it('thiếu nick thì bỏ', () => {
    expect(mapUser({ nickname: 'x' })).toBeNull();
    expect(mapUser(null)).toBeNull();
    expect(mapChat({ user: { nickname: 'x' }, content: 'chào' }, 1)).toBeNull();
    expect(mapGift({ user: {}, gift: { name: 'Rose', diamondCount: 1 } }, 1)).toBeNull();
  });
});

describe('bình luận, vào phòng', () => {
  it('bình luận cắt khoảng trắng; rỗng thì bỏ', () => {
    expect(mapChat({ user, content: ' ghế B4 ' }, 5)).toEqual({ kind: 'comment', ...lan, text: 'ghế B4', ts: 5 });
    expect(mapChat({ user, content: '   ' }, 1)).toBeNull();
  });

  it('vào phòng', () => {
    expect(mapMember({ user }, 7)).toEqual({ kind: 'join', ...lan, ts: 7 });
  });
});

describe('tim', () => {
  it('gửi kèm total — tổng cả phiên của TikTok', () => {
    expect(mapLike({ user, count: 15, total: 12_345 }, 1)).toEqual({ kind: 'like', ...lan, count: 15, total: 12_345, ts: 1 });
  });

  it('không có total thì không bịa', () => {
    expect(mapLike({ user, count: 3 }, 1)).not.toHaveProperty('total');
    expect(mapLike({ user, count: 0, total: 9 }, 1)).toBeNull();
  });
});

describe('quà', () => {
  const rose = { name: 'Rose', diamondCount: 1, type: 1 };

  it('quà nhấn giữ: giữa chuỗi bị bỏ, cuối chuỗi được nhận với số lượng = repeatCount', () => {
    expect(mapGift({ user, gift: rose, repeatCount: 3, repeatEnd: 0 }, 1)).toBeNull();
    expect(mapGift({ user, gift: rose, repeatCount: 5 }, 1)).toBeNull();
    expect(mapGift({ user, gift: rose, repeatCount: 7, repeatEnd: 1 }, 1)).toEqual({
      kind: 'gift', ...lan, gift: 'Rose', count: 7, xuEach: 1, ts: 1,
    });
  });

  it('gift.combo cũng là quà nhấn giữ', () => {
    const combo = { name: 'Tim', diamondCount: 5, type: 2, combo: true };
    expect(mapGift({ user, gift: combo, repeatCount: 2, repeatEnd: 0 }, 1)).toBeNull();
    expect(mapGift({ user, gift: combo, repeatCount: 2, repeatEnd: 1 }, 1)).toMatchObject({ count: 2 });
  });

  it('quà thường tính ngay; xu mỗi món = gift.diamondCount', () => {
    const lion = { name: 'Lion', diamondCount: 29_999, type: 2 };
    const q = mapGift({ user, gift: lion, repeatCount: 1, repeatEnd: 0 }, 1);
    expect(q).toMatchObject({ kind: 'gift', gift: 'Lion', count: 1, xuEach: 29_999 });
    expect(mapGift({ user, gift: lion }, 1)).toMatchObject({ count: 1 });
  });
});

describe('số người xem', () => {
  it('lấy total (đang xem), không lấy totalUser (tổng lượt ghé)', () => {
    expect(mapViewers({ total: 120, totalUser: 9_000 })).toBe(120);
    expect(mapViewers({ total: '1234' })).toBe(1234);
  });

  it('tổng lượt xem cả buổi lấy totalUser; thiếu hay vô lý thì null', () => {
    expect(mapLuotXem({ total: 2386, totalUser: 64_394 })).toBe(64_394);
    expect(mapLuotXem({ total: 0, totalUser: '50' })).toBe(50);
    expect(mapLuotXem({ total: 120 })).toBeNull();
    expect(mapLuotXem({ total: 500, totalUser: 10 })).toBeNull();
  });

  it('phòng vắng thật là 0; không có trường nào thì null', () => {
    expect(mapViewers({ total: 0, totalUser: 50 })).toBe(0);
    expect(mapViewers({ totalUser: 50 })).toBeNull();
    expect(mapViewers({})).toBeNull();
  });
});

describe('lỗi và nick', () => {
  it('lỗi → trạng thái và thời gian thử lại', () => {
    class UserOfflineError extends Error {}
    expect(classifyError(new UserOfflineError('x'), 0).state).toBe('offline');
    expect(classifyError(new Error('Rate limit exceeded 429'), 0).message).toMatch(/Euler/);
    expect(classifyError(new Error('boom'), 0).retryMs).toBe(15_000);
    expect(classifyError(new Error('boom'), 10).retryMs).toBe(5 * 60_000);
  });

  it('chuẩn hoá nick', () => {
    expect(normChannel(' @abc ')).toBe('abc');
    expect(normChannel('https://www.tiktok.com/@abc/live')).toBe('abc');
    expect(normChannel(5)).toBe('');
  });
});
