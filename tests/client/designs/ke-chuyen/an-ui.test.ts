/** Nhịp cảnh an ủi và cách chọn người ôm.
 *
 *  Hai hàm này quyết định hai cửa sổ xem cùng một phòng có thấy CÙNG một lượt,
 *  cùng người ôm hay không — nên chúng phải thuần theo đồng hồ, không giữ trạng
 *  thái, không bốc ngẫu nhiên. Test giữ đúng điều đó.
 */

import { describe, expect, it } from 'vitest';
import type { Seat } from '@live/contracts';
import {
  canhAnUi,
  chonNguoiOm,
  khachXinOm,
  TONG_MS,
  xinOm,
} from '../../../../client/designs/ke-chuyen/src/parts/an-ui';
import type { FeedItem } from '@live/contracts';
import type { ChoNgoi } from '../../../../client/designs/ke-chuyen/src/parts/ghe';

const CHU_KY_MS = 60_000;

function ghe(n: number): ChoNgoi[] {
  return Array.from({ length: n }, (_, i) => ({
    key: `0-${i}`,
    r: Math.floor(i / 4),
    flat: i,
    x: 20 + i * 5,
    y: 10 + Math.floor(i / 4) * 5.5,
    scale: 1,
  }));
}

function ngoi(n: number): Map<number, Seat> {
  return new Map(
    Array.from({ length: n }, (_, i) => [i, { i, user: `u${i}`, name: `Người ${i}` }]),
  );
}

describe('nhịp cảnh an ủi', () => {
  it('mỗi chu kỳ một lượt, hết lượt thì nghỉ', () => {
    expect(canhAnUi(0)).not.toBeNull();
    expect(canhAnUi(TONG_MS - 1)).not.toBeNull();
    expect(canhAnUi(TONG_MS + 1), 'xong lượt thì nghỉ hết chu kỳ').toBeNull();
    expect(canhAnUi(CHU_KY_MS)).not.toBeNull();
  });

  it('cùng một mốc đồng hồ thì ra cùng một lượt', () => {
    // Hai cửa sổ xem gọi cùng `now` phải ra y hệt nhau — không có ngẫu nhiên.
    expect(canhAnUi(CHU_KY_MS * 3 + 1_000)).toEqual(canhAnUi(CHU_KY_MS * 3 + 1_000));
  });

  it('luân phiên bé và cậu bé', () => {
    expect(canhAnUi(0)?.nhanVat).toBe('be');
    expect(canhAnUi(CHU_KY_MS)?.nhanVat).toBe('cau-be');
    expect(canhAnUi(CHU_KY_MS * 2)?.nhanVat).toBe('be');
  });
});

describe('chọn người ôm', () => {
  it('rạp trống thì không ai chạy lên — không dựng người từ hư không', () => {
    expect(chonNguoiOm(new Map(), ghe(8), 0, 2)).toEqual([]);
  });

  it('cùng một lượt thì cùng một nhóm, lượt khác thì đổi người', () => {
    const g = ghe(8);
    const s = ngoi(8);
    expect(chonNguoiOm(s, g, 5, 2)).toEqual(chonNguoiOm(s, g, 5, 2));
    const a = chonNguoiOm(s, g, 5, 2).map((x: { user: string }) => x.user);
    const b = chonNguoiOm(s, g, 6, 2).map((x: { user: string }) => x.user);
    expect(a).not.toEqual(b);
  });

  it('không chọn trùng một người hai chỗ', () => {
    const ra = chonNguoiOm(ngoi(8), ghe(8), 2, 2);
    expect(new Set(ra.map((x: { user: string }) => x.user)).size).toBe(ra.length);
  });

  it('rạp chỉ có một người thì chỉ một người chạy lên', () => {
    expect(chonNguoiOm(ngoi(1), ghe(8), 0, 2)).toHaveLength(1);
  });

  it('mang theo chỗ ngồi để còn biết chạy từ đâu', () => {
    const ra = chonNguoiOm(ngoi(8), ghe(8), 1, 2);
    for (const n of ra) {
      expect(typeof n.x).toBe('number');
      expect(typeof n.y).toBe('number');
    }
  });
});

describe('khách gõ xin ôm', () => {
  function chu(text: string, over: Partial<FeedItem> = {}): FeedItem {
    return { id: 1, at: 1_000, kind: 'comment', name: 'Lan', text, user: 'lan', ...over };
  }

  it('nhận ra lời xin, không bắt nhầm chữ khác', () => {
    expect(xinOm('ôm')).toBe(true);
    expect(xinOm('cho mình ÔM bé với')).toBe(true);
    expect(xinOm('an ủi bé đi')).toBe(true);
    expect(xinOm('thương bé quá')).toBe(true);
    expect(xinOm('hôm nay trời đẹp'), '"hôm" không phải "ôm"').toBe(false);
    expect(xinOm('nghe hay quá')).toBe(false);
  });

  it('chỉ nhận lời của khách thật, không nhận của nhân vật ảo', () => {
    expect(khachXinOm([chu('ôm')], 2_000)?.user).toBe('lan');
    expect(khachXinOm([chu('ôm', { virtual: true })], 2_000)).toBeNull();
  });

  it('lời cũ quá thì thôi', () => {
    expect(khachXinOm([chu('ôm')], 1_000 + TONG_MS + 1)).toBeNull();
  });

  it('lấy lời mới nhất', () => {
    const ds = [chu('ôm', { id: 1, at: 1_000, user: 'a', name: 'A' }), chu('ôm', { id: 2, at: 2_000, user: 'b', name: 'B' })];
    expect(khachXinOm(ds, 2_500)?.user).toBe('b');
  });

  it('lượt của khách đè lên lượt định kỳ, và nhắm vào bé', () => {
    const c = canhAnUi(50_000, { at: 49_000, user: 'lan' });
    expect(c?.nguoiXin).toBe('lan');
    expect(c?.nhanVat).toBe('be');
    expect(c?.t).toBe(1_000);
  });

  it('chính người xin phải là người chạy lên', () => {
    const g = ghe(8);
    const s = ngoi(8);
    const ra = chonNguoiOm(s, g, 3, 2, 'u5');
    expect(ra[0]?.user, 'người xin đứng đầu').toBe('u5');
    expect(ra).toHaveLength(2);
    expect(new Set(ra.map((x: { user: string }) => x.user)).size).toBe(2);
  });

  it('người xin đã rời ghế thì lượt vẫn chạy với người khác', () => {
    const ra = chonNguoiOm(ngoi(4), ghe(8), 3, 2, 'khong-co-ai');
    expect(ra).toHaveLength(2);
  });
});
