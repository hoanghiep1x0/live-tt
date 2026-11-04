import { describe, expect, it } from 'vitest';
import type { FeedItem } from '@live/contracts';
import { runFeed, runTick } from '@live/runtime';
import { chuHien, core, moduleTicker as mod, NGHI_MS, schema, thoiLuongMs } from '@live/mod-ticker';
import { ctx, kiemModule, nguoiTang } from '../_helper';

const MAC_DINH = schema.parse({});
const MOI = MAC_DINH.invites.split('\n');

const HANH = nguoiTang('hanh', 'Hạnh', 5_000);

function noi(user: string, name: string, text: string, id = 1): FeedItem {
  return { id, at: 0, kind: 'comment', name, text, user };
}

/** Chạy một nhịp rồi trả về chữ đang hiện trên dải. */
function dang(state: ReturnType<typeof core.init>, now: number, top = [HANH]): string | null {
  runTick(mod, state, now, ctx(state.config, now, 0, top));
  return state.dang === null ? null : chuHien(state.dang);
}

describe('manifest', () => {
  it('đúng mọi điều buộc với module', () => {
    kiemModule(mod);
  });

  it('chạy khi có bình luận, và dùng chung cho mọi loại phòng', () => {
    expect(mod.manifest.triggers).toEqual(['comment']);
    expect(mod.manifest.room).toBeUndefined();
  });
});

describe('lời mời khi chưa ai nhắn', () => {
  it('chạy lần lượt từng câu rồi quay vòng, giữa hai câu có nghỉ', () => {
    const s = core.init(MAC_DINH);
    expect(dang(s, 0)).toBe(MOI[0]);

    // Chưa hết giờ của câu đang chạy thì không đổi câu.
    expect(dang(s, 500)).toBe(MOI[0]);

    let t = s.ketThuc;
    for (const cau of [...MOI.slice(1), MOI[0]]) {
      // Hết câu là dải nghỉ, không nối ngay câu sau.
      expect(dang(s, t), 'vừa hết câu thì dải trống').toBeNull();
      expect(dang(s, t + NGHI_MS - 1), 'còn trong giờ nghỉ thì vẫn trống').toBeNull();
      expect(dang(s, t + NGHI_MS)).toBe(cau);
      t = s.ketThuc;
    }
  });

  it('xin thiết kế giữ dải sáng trong lúc chữ còn trôi, nghỉ thì thôi', () => {
    const s = core.init(MAC_DINH);
    const sang = (now: number) =>
      runTick(mod, s, now, ctx(s.config, now, 0, [HANH])).some(
        (e) => e.kind === 'overlay' && e.slot === 'ticker',
      );
    expect(sang(0), 'bắt đầu chạy thì xin sáng').toBe(true);
    expect(sang(500), 'đang chạy thì vẫn xin').toBe(true);
    const t = s.ketThuc;
    expect(sang(t), 'hết câu, vào giờ nghỉ thì thôi xin').toBe(false);
    expect(sang(t + 1_000)).toBe(false);
  });

  it('khách nhắn thật thì cắt giờ nghỉ, chữ của họ lên ngay', () => {
    const s = core.init(MAC_DINH);
    dang(s, 0);
    const t = s.ketThuc;
    expect(dang(s, t)).toBeNull();
    runFeed(mod, s, noi('hanh', 'Hạnh', 'nghe hay quá'), ctx(s.config, t, 0, [HANH]));
    expect(dang(s, t + 1), 'không phải chờ hết nghỉ').toBe('Hạnh: nghe hay quá');
  });

  it('bỏ trống ô lời mời thì dải im hẳn, không chạy dòng rỗng', () => {
    const c = { ...MAC_DINH, invites: '  \n\n ' };
    const s = core.init(c);
    expect(dang(s, 0)).toBeNull();
  });
});

describe('lời nhắn người xem', () => {
  it('chen lên trước lời mời, kèm tên người nhắn', () => {
    const s = core.init(MAC_DINH);
    dang(s, 0);
    runFeed(mod, s, noi('hanh', 'Hạnh', 'chuyện hay quá'), ctx(MAC_DINH, 10, 0, [HANH]));
    expect(dang(s, s.ketThuc)).toBe('Hạnh: chuyện hay quá');
  });

  it('chỉ lấy lời của top khi để nguồn "top"', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, noi('la', 'Lạ', 'xin chào'), ctx(MAC_DINH, 10, 0, [HANH]));
    expect(s.cho).toHaveLength(0);
  });

  it('để nguồn "tất cả" thì ai nhắn cũng lên dải', () => {
    const c = { ...MAC_DINH, source: 'tatca' as const };
    const s = core.init(c);
    runFeed(mod, s, noi('la', 'Lạ', 'xin chào'), ctx(c, 10, 0, [HANH]));
    expect(s.cho).toHaveLength(1);
  });

  it('một người nhắn liền mấy câu thì chỉ giữ câu mới nhất', () => {
    const c = { ...MAC_DINH, source: 'tatca' as const };
    const s = core.init(c);
    runFeed(mod, s, noi('la', 'Lạ', 'câu một', 1), ctx(c, 10, 0, []));
    runFeed(mod, s, noi('la', 'Lạ', 'câu hai', 2), ctx(c, 20, 0, []));
    expect(s.cho).toHaveLength(1);
    expect(s.cho[0]?.text).toBe('câu hai');
  });

  it('bỏ qua bình luận chỉ có khoảng trắng', () => {
    const c = { ...MAC_DINH, source: 'tatca' as const };
    const s = core.init(c);
    runFeed(mod, s, noi('la', 'Lạ', '   '), ctx(c, 10, 0, []));
    expect(s.cho).toHaveLength(0);
  });
});

describe('tốc độ chạy', () => {
  it('câu dài hơn thì chạy lâu hơn, cùng một tốc độ', () => {
    const ngan = thoiLuongMs('ngắn', MAC_DINH.speed);
    const dai = thoiLuongMs('một câu dài hơn hẳn câu kia', MAC_DINH.speed);
    expect(dai).toBeGreaterThan(ngan);
    expect(thoiLuongMs('ngắn', MAC_DINH.speed * 2)).toBeLessThan(ngan);
  });

  it('đổi tốc độ giữa lúc đang live thì dòng đang chạy tính lại hạn ngay', () => {
    const s = core.init(MAC_DINH);
    dang(s, 0);
    const cu = s.ketThuc;
    core.onConfig!(s, { ...MAC_DINH, speed: 10 });
    expect(s.ketThuc).toBeLessThan(cu);
    expect(s.batDau).toBe(0);
  });
});
