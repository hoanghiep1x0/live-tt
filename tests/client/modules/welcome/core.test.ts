import { describe, expect, it } from 'vitest';
import type { Effect, FeedItem } from '@live/contracts';
import { runFeed } from '@live/runtime';
import { core, moduleWelcome as mod, schema } from '@live/mod-welcome';
import { ctx, kiemModule } from '../_helper';

const MAC_DINH = schema.parse({});

function vao(name: string, user = name.toLowerCase()): FeedItem {
  return { id: 1, at: 0, kind: 'join', name, text: 'vào phòng', user };
}

function loiNoi(effects: Effect[]): string | undefined {
  const e = effects.find((x) => x.kind === 'say');
  return e?.kind === 'say' ? e.text : undefined;
}

describe('manifest', () => {
  it('đúng mọi điều buộc với module', () => {
    kiemModule(mod);
  });

  it('chạy khi có người vào phòng', () => {
    expect(mod.manifest.triggers).toEqual(['join']);
  });
});

describe('chào người vào', () => {
  it('gọi tên người vào', () => {
    const s = core.init(MAC_DINH);
    expect(loiNoi(runFeed(mod, s, vao('Hạnh'), ctx(MAC_DINH, 1_000)))).toBe(
      'Chào Hạnh ghé phòng nha!',
    );
  });

  it('một người ra vào nhiều lần chỉ được chào một lần', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, vao('Hạnh'), ctx(MAC_DINH, 0));
    expect(runFeed(mod, s, vao('Hạnh'), ctx(MAC_DINH, 60_000))).toEqual([]);
  });

  it('giữ giãn cách: người vào ngay sau đó bị bỏ qua', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, vao('An'), ctx(MAC_DINH, 1_000));
    expect(runFeed(mod, s, vao('Bình'), ctx(MAC_DINH, 5_000))).toEqual([]);
    // 12 giây sau lời chào đầu thì chào tiếp được.
    expect(runFeed(mod, s, vao('Chi'), ctx(MAC_DINH, 14_000))).not.toEqual([]);
  });

  it('chào người đầu tiên ngay, không chờ hết một khoảng giãn', () => {
    const s = core.init(MAC_DINH);
    expect(runFeed(mod, s, vao('An'), ctx(MAC_DINH, 0))).not.toEqual([]);
  });

  it('bỏ qua tên mặc định kiểu user123…', () => {
    const s = core.init(MAC_DINH);
    expect(runFeed(mod, s, vao('user1234567', 'u1'), ctx(MAC_DINH, 0))).toEqual([]);
    expect(runFeed(mod, s, vao('user_88.12', 'u2'), ctx(MAC_DINH, 0))).toEqual([]);
    // Tên thật có chữ "user" ở đầu thì vẫn chào.
    expect(runFeed(mod, s, vao('Userwind Nguyễn', 'u3'), ctx(MAC_DINH, 0))).not.toEqual([]);
  });

  it('tắt bỏ-qua-tên-mặc-định thì chào cả user123', () => {
    const c = { ...MAC_DINH, skipDefault: false };
    const s = core.init(c);
    expect(runFeed(mod, s, vao('user1234567', 'u1'), ctx(c, 0))).not.toEqual([]);
  });

  it('bỏ qua nhân vật ảo', () => {
    const s = core.init(MAC_DINH);
    const item: FeedItem = { ...vao('Bot'), virtual: true };
    expect(runFeed(mod, s, item, ctx(MAC_DINH, 0))).toEqual([]);
  });

  it('tắt đọc to thì chỉ còn tiếng chuông, không đọc câu nào', () => {
    const c = { ...MAC_DINH, voice: false };
    const s = core.init(c);
    const ra = runFeed(mod, s, vao('Hạnh'), ctx(c, 0));
    expect(ra.some((e) => e.kind === 'say')).toBe(false);
    expect(ra.some((e) => e.kind === 'sfx')).toBe(true);
  });
});

describe('đổi cấu hình giữa lúc đang live', () => {
  it('rút ngắn giãn cách thì người kế tiếp được chào ngay', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, vao('An'), ctx(MAC_DINH, 10_000));
    const c = { ...MAC_DINH, gapSec: 2 };
    core.onConfig!(s, c);
    expect(runFeed(mod, s, vao('Bình'), ctx(c, 10_500))).not.toEqual([]);
  });

  it('nới giãn cách thì vẫn phải chờ', () => {
    const s = core.init(MAC_DINH);
    runFeed(mod, s, vao('An'), ctx(MAC_DINH, 10_000));
    const c = { ...MAC_DINH, gapSec: 60 };
    core.onConfig!(s, c);
    expect(runFeed(mod, s, vao('Bình'), ctx(c, 20_000))).toEqual([]);
  });
});
