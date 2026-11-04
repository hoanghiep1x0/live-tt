import { describe, expect, it } from 'vitest';
import type { Effect, FeedItem } from '@live/contracts';
import { runFeed, runTick } from '@live/runtime';
import { core, moduleGiftThanks as mod, schema } from '@live/mod-gift-thanks';
import { ctx, kiemModule } from '../_helper';

const MAC_DINH = schema.parse({});

function qua(over: { name?: string; user?: string; coins?: number; count?: number } = {}): FeedItem {
  return {
    id: 1,
    at: 0,
    kind: 'gift',
    name: over.name ?? 'Hạnh',
    text: 'tặng Hoa hồng',
    user: over.user ?? 'hanh.ng',
    gift: 'Hoa hồng',
    count: over.count ?? 1,
    coins: over.coins ?? 10,
  };
}

/** Câu nói đầu tiên trong danh sách hiệu ứng. */
function loiNoi(effects: Effect[]): string | undefined {
  const e = effects.find((x) => x.kind === 'say');
  return e?.kind === 'say' ? e.text : undefined;
}

describe('manifest', () => {
  it('đúng mọi điều buộc với module', () => {
    kiemModule(mod);
  });

  it('chạy khi có quà', () => {
    expect(mod.manifest.triggers).toEqual(['gift']);
  });

  it('bật gộp combo theo mặc định', () => {
    expect(MAC_DINH.combo).toBe(true);
    expect(MAC_DINH.minCoins).toBe(1);
  });
});

describe('cảm ơn ngay khi tắt gộp combo', () => {
  const cfg = { ...MAC_DINH, combo: false };

  it('đọc tên và tên quà', () => {
    const s = core.init(cfg);
    const ra = runFeed(mod, s, qua({ count: 3 }), ctx(cfg, 1_000));
    expect(loiNoi(ra)).toBe('Cảm ơn Hạnh đã tặng Hoa hồng!');
    expect(ra.some((e) => e.kind === 'sfx')).toBe(true);
  });

  it('điền được {soluong} khi câu mẫu có dùng', () => {
    const c = { ...cfg, template: '{ten} tặng {soluong} {qua}' };
    const s = core.init(c);
    expect(loiNoi(runFeed(mod, s, qua({ count: 5 }), ctx(c, 0)))).toBe('Hạnh tặng 5 Hoa hồng');
  });

  it('bỏ quà nhỏ hơn mức tối thiểu', () => {
    const c = { ...cfg, minCoins: 50 };
    const s = core.init(c);
    expect(runFeed(mod, s, qua({ coins: 10 }), ctx(c, 0))).toEqual([]);
    expect(runFeed(mod, s, qua({ coins: 99 }), ctx(c, 0))).not.toEqual([]);
  });

  it('bỏ qua quà của nhân vật ảo', () => {
    const s = core.init(cfg);
    const item: FeedItem = { ...qua(), virtual: true };
    expect(runFeed(mod, s, item, ctx(cfg, 0))).toEqual([]);
  });

  it('không chạy với sự kiện khác quà', () => {
    const s = core.init(cfg);
    const binhLuan: FeedItem = { id: 2, at: 0, kind: 'comment', name: 'Hạnh', text: 'chào' };
    expect(runFeed(mod, s, binhLuan, ctx(cfg, 0))).toEqual([]);
  });
});

describe('gộp combo', () => {
  it('ba lần tặng liên tiếp chỉ thành một lời cảm ơn', () => {
    const s = core.init(MAC_DINH);
    for (const t of [0, 1_000, 2_000]) {
      expect(runFeed(mod, s, qua({ count: 2 }), ctx(MAC_DINH, t))).toEqual([]);
    }
    // Chưa hết 5 giây kể từ lần cuối thì còn chờ.
    expect(runTick(mod, s, 6_000, ctx(MAC_DINH, 6_000))).toEqual([]);

    const ra = runTick(mod, s, 7_000, ctx(MAC_DINH, 7_000));
    expect(ra.filter((e) => e.kind === 'say')).toHaveLength(1);
  });

  it('cộng dồn số lượng của cả combo', () => {
    const c = { ...MAC_DINH, template: '{soluong}' };
    const s = core.init(c);
    runFeed(mod, s, qua({ count: 2 }), ctx(c, 0));
    runFeed(mod, s, qua({ count: 3 }), ctx(c, 1_000));
    expect(loiNoi(runTick(mod, s, 7_000, ctx(c, 7_000)))).toBe('5');
  });

  it('hai người tặng cùng lúc được cảm ơn riêng', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua({ user: 'a', name: 'An' }), ctx(MAC_DINH, 0));
    runFeed(mod, s, qua({ user: 'b', name: 'Bình' }), ctx(MAC_DINH, 0));
    const noi = runTick(mod, s, 6_000, ctx(MAC_DINH, 6_000)).filter((e) => e.kind === 'say');
    expect(noi).toHaveLength(2);
  });

  it('trùng tên hiển thị vẫn là hai người khác nhau', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua({ user: 'a', name: 'Hạnh' }), ctx(MAC_DINH, 0));
    runFeed(mod, s, qua({ user: 'b', name: 'Hạnh' }), ctx(MAC_DINH, 0));
    expect(
      runTick(mod, s, 6_000, ctx(MAC_DINH, 6_000)).filter((e) => e.kind === 'say'),
    ).toHaveLength(2);
  });
});

describe('đổi cấu hình giữa lúc đang live', () => {
  it('tắt gộp combo thì quà đang gom ra ngay ở nhịp kế tiếp', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(), ctx(MAC_DINH, 10_000));
    expect(runTick(mod, s, 11_000, ctx(MAC_DINH, 11_000))).toEqual([]);

    core.onConfig!(s, { ...MAC_DINH, combo: false });

    const ra = runTick(mod, s, 11_100, ctx(MAC_DINH, 11_100));
    expect(ra.filter((e) => e.kind === 'say')).toHaveLength(1);
  });

  it('đổi câu mẫu thì quà đang gom dùng câu mới', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(), ctx(MAC_DINH, 0));
    core.onConfig!(s, { ...MAC_DINH, template: 'Xin cảm ơn {ten}' });
    expect(loiNoi(runTick(mod, s, 9_000, ctx(MAC_DINH, 9_000)))).toBe('Xin cảm ơn Hạnh');
  });

  it('dispose bỏ hết quà đang gom', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, qua(), ctx(MAC_DINH, 0));
    core.dispose!(s);
    expect(runTick(mod, s, 99_000, ctx(MAC_DINH, 99_000))).toEqual([]);
  });
});
