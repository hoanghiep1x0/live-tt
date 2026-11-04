import { describe, expect, it } from 'vitest';
import type { Effect, FeedItem } from '@live/contracts';
import { runFeed, runTick } from '@live/runtime';
import { core, dongDua, hangDangSoi, hienDua, moduleTopGivers as mod, schema } from '@live/mod-top-givers';
import { ctx, kiemModule, nguoiTang } from '../_helper';

const MAC_DINH = schema.parse({});

function loiNoi(effects: Effect[]): string | undefined {
  const e = effects.find((x) => x.kind === 'say');
  return e?.kind === 'say' ? e.text : undefined;
}

describe('manifest', () => {
  it('đúng mọi điều buộc với module', () => {
    kiemModule(mod);
  });

  it('chỉ bắt quà, để nhớ ai vừa tặng gì cho dòng đua', () => {
    expect(mod.manifest.triggers).toEqual(['gift']);
    expect(mod.manifest.slots).toEqual(['tops']);
  });
});

describe('dòng đua top', () => {
  const an = nguoiTang('a', 'An', 900);
  const binh = nguoiTang('b', 'Bình', 500);

  function qua(over: { user?: string; name?: string; coins?: number } = {}): FeedItem {
    return {
      id: 1,
      at: 0,
      kind: 'gift',
      name: over.name ?? 'An',
      text: 'tặng Hoa hồng',
      user: over.user ?? 'a',
      gift: 'Hoa hồng',
      count: 1,
      coins: over.coins ?? 50,
    };
  }

  it('hiện một lượt dài rồi nghỉ nửa phút, lượt sau dài hơn', () => {
    expect(hienDua(0)).toBe(true);
    expect(hienDua(119_000)).toBe(true);
    expect(hienDua(121_000), 'hết hai phút thì nghỉ').toBe(false);
    expect(hienDua(151_000), 'nghỉ xong hiện lượt hai (2,5 phút)').toBe(true);
    expect(hienDua(302_000), 'hết lượt hai thì lại nghỉ').toBe(false);
  });

  it('lõi nhớ món quà cuối, phần vẽ không phải dò lại feed', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(), ctx(MAC_DINH, 7_000, 0, [an]));
    expect(s.quaCuoi).toEqual({ user: 'a', name: 'An', xu: 50, at: 7_000 });
  });

  it('bỏ qua quà của nhân vật minh hoạ', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, { ...qua(), virtual: true }, ctx(MAC_DINH, 0, 0, [an]));
    expect(s.quaCuoi).toBeNull();
  });

  it('khoe quà của người đang có tên trong bảng', () => {
    expect(dongDua([binh, an], { user: 'a', name: 'An', xu: 50, at: 1_000 }, 2_000, 0)).toEqual({
      name: 'An',
      xu: 50,
      rank: 2,
    });
  });

  it('người tặng không có trong bảng thì quay về báo người dẫn đầu', () => {
    expect(dongDua([an], { user: 'z', name: 'Zét', xu: 5, at: 1_000 }, 2_000, 0)).toEqual({
      name: 'An',
      xu: 900,
      rank: 1,
      lead: true,
    });
  });

  it('chưa ai tặng thì mời người xem lên top 1', () => {
    expect(dongDua([], null, 0, 0)).toEqual({ name: '', xu: 0, rank: 1, lead: true });
  });

  it('tới lượt nghỉ thì không có dòng nào', () => {
    expect(dongDua([an], { user: 'a', name: 'An', xu: 50, at: 0 }, 125_000, 0)).toBeNull();
    expect(dongDua([an], null, 125_000, 0)).toBeNull();
  });

  it('nhịp ẩn hiện tính từ lúc tặng, không phải từ lúc mở phòng', () => {
    const qua1 = { user: 'a', name: 'An', xu: 50, at: 125_000 };
    expect(dongDua([an], qua1, 125_000, 0), 'mốc mở phòng đang nghỉ, quà mới vẫn hiện').toEqual({
      name: 'An',
      xu: 50,
      rank: 1,
    });
  });
});

describe('đèn soi', () => {
  it('tắt khi chưa có ai trong top', () => {
    expect(hangDangSoi(0, 0)).toBe(-1);
  });

  it('soi một lúc rồi nghỉ, chứ không sáng suốt buổi', () => {
    expect(hangDangSoi(0, 3)).toBe(0);
    expect(hangDangSoi(3_000, 3)).toBe(0);
    expect(hangDangSoi(5_000, 3), 'quá 3,6 giây thì nghỉ').toBe(-1);
  });

  it('lần lượt chuyển sang người kế', () => {
    expect(hangDangSoi(9_000, 3)).toBe(1);
    expect(hangDangSoi(18_000, 3)).toBe(2);
    expect(hangDangSoi(27_000, 3), 'hết vòng thì quay lại người đầu').toBe(0);
  });

  it('không soi quá số người đang có', () => {
    for (let t = 0; t < 60_000; t += 500) {
      expect(hangDangSoi(t, 2)).toBeLessThan(2);
    }
  });

  it('lõi ghi lại hạng đang soi để phần vẽ dùng', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0, 0, [nguoiTang('a', 'An', 10)]));
    expect(s.dangSoi).toBe(0);
    runTick(mod, s, 5_000, ctx(MAC_DINH, 5_000, 0, [nguoiTang('a', 'An', 10)]));
    expect(s.dangSoi).toBe(-1);
  });
});

describe('báo đổi ngôi', () => {
  it('im lặng khi chưa ai lên bảng', () => {
    const s = core.init(MAC_DINH);
    expect(runTick(mod, s, 0, ctx(MAC_DINH, 0, 0, []))).toEqual([]);
  });

  it('người đầu tiên lên bảng không phải là "vượt lên"', () => {
    const s = core.init(MAC_DINH);
    const top = [nguoiTang('a', 'An', 100)];
    expect(runTick(mod, s, 0, ctx(MAC_DINH, 0, 0, top))).toEqual([]);
  });

  it('có người vượt lên hạng nhất thì báo một lần', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0, 0, [nguoiTang('a', 'An', 100)]));

    const moi = [nguoiTang('b', 'Bình', 500), nguoiTang('a', 'An', 100)];
    expect(loiNoi(runTick(mod, s, 1, ctx(MAC_DINH, 1, 0, moi)))).toBe(
      'Bình vừa vươn lên dẫn đầu!',
    );
    // Vẫn người đó dẫn thì không nhắc lại.
    expect(runTick(mod, s, 2, ctx(MAC_DINH, 2, 0, moi))).toEqual([]);
  });

  it('đòi lại ngôi đầu thì báo tiếp', () => {
    const s = core.init(MAC_DINH);
    const a = nguoiTang('a', 'An', 100);
    const b = nguoiTang('b', 'Bình', 500);
    runTick(mod, s, 0, ctx(MAC_DINH, 0, 0, [a]));
    runTick(mod, s, 1, ctx(MAC_DINH, 1, 0, [b, a]));
    expect(loiNoi(runTick(mod, s, 2, ctx(MAC_DINH, 2, 0, [nguoiTang('a', 'An', 900), b])))).toBe(
      'An vừa vươn lên dẫn đầu!',
    );
  });

  it('tắt báo đổi ngôi thì bảng vẫn chạy nhưng im lặng', () => {
    const c = { ...MAC_DINH, announce: false };
    const s = core.init(c);
    runTick(mod, s, 0, ctx(c, 0, 0, [nguoiTang('a', 'An', 100)]));
    expect(runTick(mod, s, 1, ctx(c, 1, 0, [nguoiTang('b', 'Bình', 500)]))).toEqual([]);
  });

  it('tắt báo giữa chừng rồi bật lại thì không báo dồn người cũ', () => {
    const s = core.init(MAC_DINH);
    runTick(mod, s, 0, ctx(MAC_DINH, 0, 0, [nguoiTang('a', 'An', 100)]));

    const tat = { ...MAC_DINH, announce: false };
    core.onConfig!(s, tat);
    runTick(mod, s, 1, ctx(tat, 1, 0, [nguoiTang('b', 'Bình', 500)]));

    core.onConfig!(s, MAC_DINH);
    expect(
      runTick(mod, s, 2, ctx(MAC_DINH, 2, 0, [nguoiTang('b', 'Bình', 500)])),
      'Bình đã dẫn từ lúc đang tắt, bật lại không phải tin mới',
    ).toEqual([]);
  });
});
