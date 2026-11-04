import { describe, expect, it } from 'vitest';
import type { Effect, FeedItem } from '@live/contracts';
import { runFeed, runTick } from '@live/runtime';
import { core, moduleGiftThanks as mod, schema } from '@live/mod-gift-thanks';
import { ctx, kiemModule } from '../_helper';

const MAC_DINH = schema.parse({});

/** Một câu duy nhất: phần lớn test ở đây nói về lúc nào MC mở miệng, không nói
 *  về việc chọn câu nào, nên bộ câu mặc định chỉ làm khó đọc. */
const DON = { ...MAC_DINH, templates: 'Cảm ơn {ten} đã tặng {qua}!' };

function qua(
  over: { name?: string; user?: string; coins?: number; count?: number; gift?: string } = {},
): FeedItem {
  return {
    id: 1,
    at: 0,
    kind: 'gift',
    name: over.name ?? 'Hạnh',
    text: 'tặng Hoa hồng',
    user: over.user ?? 'hanh.ng',
    gift: over.gift ?? 'Hoa hồng',
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

  it('mặc định có năm câu cảm ơn khác nhau', () => {
    const ds = MAC_DINH.templates.split('\n');
    expect(ds).toHaveLength(5);
    expect(new Set(ds).size).toBe(5);
    expect(MAC_DINH.repeats).toBe(5);
  });
});

describe('cảm ơn ngay khi tắt gộp combo', () => {
  const cfg = { ...DON, combo: false };

  it('đọc tên và tên quà', () => {
    const s = core.init(cfg);
    const ra = runFeed(mod, s, qua({ count: 3 }), ctx(cfg, 1_000));
    expect(loiNoi(ra)).toBe('Cảm ơn Hạnh đã tặng Hoa hồng!');
    expect(ra.some((e) => e.kind === 'sfx')).toBe(true);
  });

  it('điền được {soluong} khi câu mẫu có dùng', () => {
    const c = { ...cfg, templates: '{ten} tặng {soluong} {qua}' };
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

describe('nhắc lại sau món quà', () => {
  const cfg = { ...MAC_DINH, combo: false };

  it('đọc năm câu khác nhau ở 0 · 5 · 15 · 30 · 60 giây rồi thôi', () => {
    const s = core.init(cfg);
    const noi = [loiNoi(runFeed(mod, s, qua(), ctx(cfg, 0)))];
    for (const t of [5_000, 15_000, 30_000, 60_000]) {
      noi.push(loiNoi(runTick(mod, s, t, ctx(cfg, t))));
    }
    expect(noi.every((x) => x !== undefined && x.includes('Hạnh'))).toBe(true);
    expect(new Set(noi).size).toBe(5);
    expect(runTick(mod, s, 120_000, ctx(cfg, 120_000))).toEqual([]);
  });

  it('chưa tới hạn câu kế thì im', () => {
    const s = core.init(cfg);
    runFeed(mod, s, qua(), ctx(cfg, 0));
    expect(runTick(mod, s, 4_000, ctx(cfg, 4_000))).toEqual([]);
  });

  it('chuông và đèn chỉ kêu ở câu đầu', () => {
    const s = core.init(cfg);
    const dau = runFeed(mod, s, qua(), ctx(cfg, 0));
    expect(dau.some((e) => e.kind === 'sfx')).toBe(true);
    const sau = runTick(mod, s, 5_000, ctx(cfg, 5_000));
    expect(sau.some((e) => e.kind === 'say')).toBe(true);
    expect(sau.some((e) => e.kind === 'sfx')).toBe(false);
  });

  it('hạ số lần thì chỉ đọc ngần ấy câu', () => {
    const c = { ...cfg, repeats: 2 };
    const s = core.init(c);
    runFeed(mod, s, qua(), ctx(c, 0));
    expect(runTick(mod, s, 5_000, ctx(c, 5_000)).some((e) => e.kind === 'say')).toBe(true);
    expect(runTick(mod, s, 15_000, ctx(c, 15_000))).toEqual([]);
  });

  it('đang trong lượt mà tặng tiếp thì không mở lượt mới, câu sau nhắc món mới', () => {
    const c = { ...cfg, templates: 'một {qua}\nhai {qua}' };
    const s = core.init(c);
    expect(loiNoi(runFeed(mod, s, qua(), ctx(c, 0)))).toBe('một Hoa hồng');

    expect(runFeed(mod, s, qua({ gift: 'Nón lá' }), ctx(c, 3_000))).toEqual([]);
    expect(loiNoi(runTick(mod, s, 5_000, ctx(c, 5_000)))).toBe('hai Nón lá');
  });
});

describe('quà lớn', () => {
  const cfg = { ...MAC_DINH, combo: false };

  it('nhiều món một lúc thì dùng bộ câu phấn khích', () => {
    const s = core.init(cfg);
    const text = loiNoi(runFeed(mod, s, qua({ count: cfg.bigCount }), ctx(cfg, 0)));
    expect(cfg.bigTemplates.split('\n')[0]?.replace('{ten}', 'Hạnh')).toContain('Trời ơi');
    expect(text).toContain('Trời ơi');
  });

  it('nhiều xu cũng tính là quà lớn', () => {
    const s = core.init(cfg);
    expect(loiNoi(runFeed(mod, s, qua({ coins: cfg.bigCoins }), ctx(cfg, 0)))).toContain('Trời ơi');
  });

  it('quà lớn tới giữa lượt thì các câu còn lại chuyển sang bộ phấn khích', () => {
    const s = core.init(cfg);
    const thuong = loiNoi(runFeed(mod, s, qua(), ctx(cfg, 0)));
    expect(thuong).not.toContain('Trời ơi');

    runFeed(mod, s, qua({ coins: cfg.bigCoins }), ctx(cfg, 2_000));
    expect(loiNoi(runTick(mod, s, 5_000, ctx(cfg, 5_000)))).toContain('MC xúc động');
  });
});

describe('gộp combo', () => {
  it('ba lần tặng liên tiếp chỉ thành một lời cảm ơn', () => {
    const s = core.init(DON);
    for (const t of [0, 1_000, 2_000]) {
      expect(runFeed(mod, s, qua({ count: 2 }), ctx(DON, t))).toEqual([]);
    }
    // Chưa hết 5 giây kể từ lần cuối thì còn chờ.
    expect(runTick(mod, s, 6_000, ctx(DON, 6_000))).toEqual([]);

    const ra = runTick(mod, s, 7_000, ctx(DON, 7_000));
    expect(ra.filter((e) => e.kind === 'say')).toHaveLength(1);
  });

  it('cộng dồn số lượng của cả combo', () => {
    const c = { ...DON, templates: '{soluong}' };
    const s = core.init(c);
    runFeed(mod, s, qua({ count: 2 }), ctx(c, 0));
    runFeed(mod, s, qua({ count: 3 }), ctx(c, 1_000));
    expect(loiNoi(runTick(mod, s, 7_000, ctx(c, 7_000)))).toBe('5');
  });

  it('hai người tặng cùng lúc được cảm ơn riêng', () => {
    const s = core.init(DON);
    runFeed(mod, s, qua({ user: 'a', name: 'An' }), ctx(DON, 0));
    runFeed(mod, s, qua({ user: 'b', name: 'Bình' }), ctx(DON, 0));
    const noi = runTick(mod, s, 6_000, ctx(DON, 6_000)).filter((e) => e.kind === 'say');
    expect(noi).toHaveLength(2);
  });

  it('trùng tên hiển thị vẫn là hai người khác nhau', () => {
    const s = core.init(DON);
    runFeed(mod, s, qua({ user: 'a', name: 'Hạnh' }), ctx(DON, 0));
    runFeed(mod, s, qua({ user: 'b', name: 'Hạnh' }), ctx(DON, 0));
    expect(runTick(mod, s, 6_000, ctx(DON, 6_000)).filter((e) => e.kind === 'say')).toHaveLength(2);
  });
});

describe('đổi cấu hình giữa lúc đang live', () => {
  it('tắt gộp combo thì quà đang gom ra ngay ở nhịp kế tiếp', () => {
    const s = core.init(DON);
    runFeed(mod, s, qua(), ctx(DON, 10_000));
    expect(runTick(mod, s, 11_000, ctx(DON, 11_000))).toEqual([]);

    core.onConfig!(s, { ...DON, combo: false });

    const ra = runTick(mod, s, 11_100, ctx(DON, 11_100));
    expect(ra.filter((e) => e.kind === 'say')).toHaveLength(1);
  });

  it('đổi câu mẫu thì quà đang gom dùng câu mới', () => {
    const s = core.init(DON);
    runFeed(mod, s, qua(), ctx(DON, 0));
    core.onConfig!(s, { ...DON, templates: 'Xin cảm ơn {ten}' });
    expect(loiNoi(runTick(mod, s, 9_000, ctx(DON, 9_000)))).toBe('Xin cảm ơn Hạnh');
  });

  it('dispose bỏ hết quà đang gom và lượt đang chạy', () => {
    const s = core.init(DON);
    runFeed(mod, s, qua(), ctx(DON, 0));
    core.dispose!(s);
    expect(runTick(mod, s, 99_000, ctx(DON, 99_000))).toEqual([]);
  });
});
