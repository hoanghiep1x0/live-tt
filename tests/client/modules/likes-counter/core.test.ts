import { describe, expect, it } from 'vitest';
import type { Effect, FeedItem } from '@live/contracts';
import { runFeed } from '@live/runtime';
import { core, moduleLikesCounter as mod, schema } from '@live/mod-likes-counter';
import { ctx, kiemModule } from '../_helper';

const MAC_DINH = schema.parse({});

const TIM: FeedItem = { id: 1, at: 0, kind: 'like', name: 'Hạnh', text: 'thả tim', user: 'hanh' };

function loiNoi(effects: Effect[]): string | undefined {
  const e = effects.find((x) => x.kind === 'say');
  return e?.kind === 'say' ? e.text : undefined;
}

describe('manifest', () => {
  it('đúng mọi điều buộc với module', () => {
    kiemModule(mod);
  });

  it('chạy khi có tim, và dùng chung cho mọi loại phòng', () => {
    expect(mod.manifest.triggers).toEqual(['like']);
    expect(mod.manifest.room).toBeUndefined();
  });
});

describe('báo mốc', () => {
  it('im lặng khi chưa tới mốc nào', () => {
    const s = core.init(MAC_DINH);
    expect(runFeed(mod, s, TIM, ctx(MAC_DINH, 0, 2_400))).toEqual([]);
  });

  it('báo đúng mốc 25% và không báo lại mốc đó', () => {
    const s = core.init(MAC_DINH);
    expect(loiNoi(runFeed(mod, s, TIM, ctx(MAC_DINH, 0, 2_500)))).toBe(
      'Đã 25% mục tiêu tim, cảm ơn cả phòng!',
    );
    expect(runFeed(mod, s, TIM, ctx(MAC_DINH, 1_000, 3_000))).toEqual([]);
  });

  it('nhảy vọt thì chỉ báo mốc cao nhất, không đọc dồn cả bốn mốc', () => {
    const s = core.init(MAC_DINH);
    const ra = runFeed(mod, s, TIM, ctx(MAC_DINH, 0, 9_000));
    expect(ra.filter((e) => e.kind === 'say')).toHaveLength(1);
    expect(loiNoi(ra)).toContain('75%');
  });

  it('vượt mục tiêu thì dừng ở 100%', () => {
    const s = core.init(MAC_DINH);
    expect(loiNoi(runFeed(mod, s, TIM, ctx(MAC_DINH, 0, 30_000)))).toContain('100%');
    expect(runFeed(mod, s, TIM, ctx(MAC_DINH, 1_000, 90_000))).toEqual([]);
  });
});

describe('đổi cấu hình giữa lúc đang live', () => {
  it('nâng mục tiêu không làm đọc lại các mốc cũ', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, TIM, ctx(MAC_DINH, 0, 5_000)); // 50%
    const c = { ...MAC_DINH, goal: 20_000 };
    core.onConfig!(s, c);
    // 5.000 tim trên mục tiêu mới là 25% — đã báo rồi, phải im.
    expect(runFeed(mod, s, TIM, ctx(c, 1_000, 5_000))).toEqual([]);
    // Lên 75% của mục tiêu mới thì báo tiếp.
    expect(loiNoi(runFeed(mod, s, TIM, ctx(c, 2_000, 15_000)))).toContain('75%');
  });

  it('đổi bước báo thì làm tròn mốc đã báo theo bước mới', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, TIM, ctx(MAC_DINH, 0, 7_500)); // mốc 75 với bước 25
    const c = { ...MAC_DINH, stepPercent: 10 };
    core.onConfig!(s, c);
    expect(runFeed(mod, s, TIM, ctx(c, 1_000, 7_500))).toEqual([]);
    expect(loiNoi(runFeed(mod, s, TIM, ctx(c, 2_000, 8_000)))).toContain('80%');
  });
});
