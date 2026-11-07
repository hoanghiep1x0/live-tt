/** Nhịp cảnh an ủi và cách chọn người ôm.
 *
 *  Hai hàm này quyết định hai cửa sổ xem cùng một phòng có thấy CÙNG một lượt,
 *  cùng người ôm hay không — nên chúng phải thuần theo đồng hồ, không giữ trạng
 *  thái, không bốc ngẫu nhiên. Test giữ đúng điều đó.
 */

import { describe, expect, it } from 'vitest';
import type { Seat } from '@live/contracts';
import {
  AN_UI_MAC_DINH,
  CAM_ON_KHACH_MS,
  CAM_ON_TU_DONG_MS,
  CHAY_MS,
  OM_MS,
  camOnLuotNay,
  canhAnUi,
  loiCamOn,
  loiPopup,
  tenGon,
  docCauHinhAnUi,
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

describe('số người và cấu hình cảnh an ủi', () => {
  it('khách tự gõ "ôm" thì chỉ một mình họ lên', () => {
    expect(canhAnUi(50_000, { at: 49_000, user: 'lan' })?.soNguoi).toBe(1);
  });

  it('"lúc một lúc hai" thì có cả lượt một người lẫn lượt hai người', () => {
    const so = new Set<number>();
    for (let k = 0; k < 20; k += 1) so.add(canhAnUi(k * 60_000)?.soNguoi ?? 0);
    expect([...so].sort()).toEqual([1, 2]);
  });

  it('chọn một hay hai thì lượt nào cũng đúng số đó', () => {
    for (let k = 0; k < 10; k += 1) {
      expect(canhAnUi(k * 60_000, null, { ...AN_UI_MAC_DINH, soNguoi: 'don' })?.soNguoi).toBe(1);
      expect(canhAnUi(k * 60_000, null, { ...AN_UI_MAC_DINH, soNguoi: 'doi' })?.soNguoi).toBe(2);
    }
  });

  it('đổi chu kỳ thì lượt rơi đúng nhịp mới', () => {
    const cfg = { ...AN_UI_MAC_DINH, chuKyGiay: 120 };
    expect(canhAnUi(60_000, null, cfg), 'giữa chu kỳ 120 giây thì nghỉ').toBeNull();
    expect(canhAnUi(120_000, null, cfg)).not.toBeNull();
  });

  it('chu kỳ quá ngắn bị nâng lên, lượt không dính vào nhau', () => {
    const cfg = { ...AN_UI_MAC_DINH, chuKyGiay: 1 };
    expect(canhAnUi(TONG_MS + 1, null, cfg)).toBeNull();
  });

  it('chỉ ôm cậu bé, và tắt khách gõ thì khách gõ không gọi được', () => {
    const cfg = { ...AN_UI_MAC_DINH, ai: 'cau-be' as const, khachGoi: false };
    expect(canhAnUi(0, null, cfg)?.nhanVat).toBe('cau-be');
    expect(canhAnUi(60_000, null, cfg)?.nhanVat).toBe('cau-be');
    expect(canhAnUi(50_000, { at: 49_000, user: 'lan' }, cfg)).toBeNull();
  });

  it('giá trị lưu hỏng thì về mặc định', () => {
    expect(docCauHinhAnUi({ anUiGiay: 'abc', anUiSoNguoi: 'ba', anUiAi: 1 })).toEqual(AN_UI_MAC_DINH);
  });
});

describe('popup trên đầu và lời cảm ơn', () => {
  const canh = (t: number, o: Partial<Parameters<typeof loiPopup>[0]> = {}) => ({
    k: 3,
    nhanVat: 'cau-be' as const,
    t,
    soNguoi: 2 as const,
    ...o,
  });

  it('hai nhịp: đang ôm rồi cảm ơn, hết lượt thì tắt', () => {
    expect(loiPopup(canh(0))).toBe('🤗 Cả phòng đang ôm cậu bé');
    expect(loiPopup(canh(CHAY_MS + OM_MS))).toBe('Cậu bé cười rồi — cảm ơn cả nhà ❤');
    expect(loiPopup(canh(TONG_MS))).toBeNull();
  });

  it('khách tự gõ "ôm" thì gọi đúng tên gọn của họ', () => {
    const c = canh(100, { nguoiXin: 'u1', tenXin: 'Lâm Gia Hạo', nhanVat: 'be', soNguoi: 1 });
    expect(loiPopup(c)).toBe('🤗 Hạo lên ôm bé');
    expect(loiPopup({ ...c, t: CHAY_MS + OM_MS })).toBe('Bé cảm ơn Hạo ❤');
  });

  it('tên gọn: bỏ biểu tượng, tên mặc định của TikTok thì không gọi', () => {
    expect(tenGon('M48🌸 đang du học 🇹🇼')).toBe('M48🌸');
    expect(tenGon('user83920193')).toBe('');
  });

  it('lời cảm ơn gọi tên khách thật, không ai thì cảm ơn chung', () => {
    expect(loiCamOn(0, ['Lan', 'Minh'], 'be')).toBe('Ui, Lan và Minh chạy lên ôm bé kìa, thương ghê');
    expect(loiCamOn(0, [], 'cau-be')).toBe('Cảm ơn bạn đã chạy lên ôm cậu bé nha');
  });

  it('không phải lượt nào cũng đọc: khách mỗi phút, tự động thỉnh thoảng', () => {
    const khach = canh(0, { nguoiXin: 'u1' });
    expect(camOnLuotNay(khach, 0, CAM_ON_KHACH_MS - 1)).toBe(false);
    expect(camOnLuotNay(khach, 0, CAM_ON_KHACH_MS)).toBe(true);
    const doc = Array.from({ length: 30 }, (_, k) => camOnLuotNay(canh(0, { k }), 0, CAM_ON_TU_DONG_MS));
    const n = doc.filter(Boolean).length;
    expect(n).toBeGreaterThan(3);
    expect(n).toBeLessThan(20);
    expect(camOnLuotNay(canh(0, { k: doc.indexOf(true) }), 0, CAM_ON_TU_DONG_MS - 1)).toBe(false);
  });
});
