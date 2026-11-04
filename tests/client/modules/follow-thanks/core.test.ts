import { describe, expect, it } from 'vitest';
import type { Effect, FeedItem } from '@live/contracts';
import { runFeed } from '@live/runtime';
import { core, moduleFollowThanks as mod, schema } from '@live/mod-follow-thanks';
import { ctx, kiemModule } from '../_helper';

const MAC_DINH = schema.parse({});

function su(kind: 'follow' | 'subscribe', name = 'Hạnh', user = 'hanh.ng'): FeedItem {
  return { id: 1, at: 0, kind, name, text: '', user };
}

function loiNoi(effects: Effect[]): string | undefined {
  const e = effects.find((x) => x.kind === 'say');
  return e?.kind === 'say' ? e.text : undefined;
}

describe('manifest', () => {
  it('đúng mọi điều buộc với module', () => {
    kiemModule(mod);
  });

  it('bắt cả theo dõi và hội viên', () => {
    expect([...mod.manifest.triggers].sort()).toEqual(['follow', 'subscribe']);
  });
});

describe('cảm ơn', () => {
  it('theo dõi và hội viên dùng hai câu khác nhau', () => {
    const s = core.init(MAC_DINH);
    expect(loiNoi(runFeed(mod, s, su('follow'), ctx(MAC_DINH)))).toBe('Cảm ơn Hạnh đã theo dõi!');
    expect(loiNoi(runFeed(mod, s, su('subscribe', 'An', 'an'), ctx(MAC_DINH)))).toBe(
      'Cảm ơn An đã thành hội viên!',
    );
  });

  it('theo dõi rồi bỏ rồi theo lại chỉ cảm ơn một lần', () => {
    const s = core.init(MAC_DINH);
    expect(runFeed(mod, s, su('follow'), ctx(MAC_DINH))).not.toEqual([]);
    expect(runFeed(mod, s, su('follow'), ctx(MAC_DINH, 60_000))).toEqual([]);
  });

  it('bỏ qua nhân vật ảo', () => {
    const s = core.init(MAC_DINH);
    const item: FeedItem = { ...su('follow'), virtual: true };
    expect(runFeed(mod, s, item, ctx(MAC_DINH))).toEqual([]);
  });

  it('không chạy khi chỉ có người vào phòng', () => {
    const s = core.init(MAC_DINH);
    const vao: FeedItem = { id: 2, at: 0, kind: 'join', name: 'Hạnh', text: '' };
    expect(runFeed(mod, s, vao, ctx(MAC_DINH))).toEqual([]);
  });

  it('tắt đọc to thì chỉ còn tiếng chuông', () => {
    const c = { ...MAC_DINH, voice: false };
    const s = core.init(c);
    const ra = runFeed(mod, s, su('follow'), ctx(c));
    expect(ra.some((e) => e.kind === 'say')).toBe(false);
    expect(ra.some((e) => e.kind === 'sfx')).toBe(true);
  });
});
