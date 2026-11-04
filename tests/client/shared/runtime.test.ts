import { describe, expect, it } from 'vitest';
import type { Ctx, Effect, FeedItem, LiveModule, ModuleManifest } from '@live/contracts';
import { hookKinds, runAction, runFeed, runTick, tickMs } from '@live/runtime';
import { ctx } from '../modules/_helper';

type Config = { on: boolean };
interface State {
  thay: string[];
}

function manifest(triggers: ModuleManifest<Config>['triggers']): ModuleManifest<Config> {
  return {
    id: 'thu-nghiem',
    name: 'Thử nghiệm',
    icon: '🧪',
    summary: 'Chỉ dùng trong test',
    triggers,
    configVersion: 1,
    // Schema thật không cần ở đây: runtime không bao giờ chạm vào nó.
    schema: { parse: (x: unknown) => x as Config } as ModuleManifest<Config>['schema'],
    fields: [],
  };
}

function ghiLai(nhan: string): Effect[] {
  return [{ kind: 'say', text: nhan }];
}

function mod(includeVirtual?: boolean): LiveModule<Config, State> {
  return {
    manifest: manifest(['gift', 'comment']),
    core: {
      init: () => ({ thay: [] }),
      hooks: {
        gift: {
          ...(includeVirtual === undefined ? {} : { includeVirtual }),
          run(state, item: FeedItem) {
            state.thay.push(`gift:${item.name}`);
            return ghiLai('quà');
          },
        },
        comment: {
          run(state, item: FeedItem) {
            state.thay.push(`comment:${item.name}`);
            return ghiLai('bình luận');
          },
        },
      },
      onTick: () => ghiLai('nhịp'),
      onAction: (_s, op: string) => ghiLai(op),
      tickMs: 250,
    },
  };
}

function muc(kind: FeedItem['kind'], over: { virtual?: boolean } = {}): FeedItem {
  return {
    id: 1,
    at: 0,
    kind,
    name: 'Hạnh',
    text: '',
    ...(over.virtual === undefined ? {} : { virtual: over.virtual }),
  };
}

const C: Ctx<Config> = ctx({ on: true });

describe('runFeed gọi đúng móc', () => {
  it('gọi móc khớp loại sự kiện', () => {
    const m = mod();
    const s = m.core.init({ on: true });
    expect(runFeed(m, s, muc('gift'), C)).toEqual(ghiLai('quà'));
    expect(runFeed(m, s, muc('comment'), C)).toEqual(ghiLai('bình luận'));
    expect(s.thay).toEqual(['gift:Hạnh', 'comment:Hạnh']);
  });

  it('loại không có móc thì không gọi gì', () => {
    const m = mod();
    const s = m.core.init({ on: true });
    expect(runFeed(m, s, muc('join'), C)).toEqual([]);
    expect(runFeed(m, s, muc('follow'), C)).toEqual([]);
    expect(s.thay).toEqual([]);
  });
});

describe('nhân vật ảo', () => {
  it('mặc định bị lọc trước khi tới móc', () => {
    const m = mod();
    const s = m.core.init({ on: true });
    expect(runFeed(m, s, muc('gift', { virtual: true }), C)).toEqual([]);
    expect(s.thay, 'móc không được chạy').toEqual([]);
  });

  it('module xin nhận thì vẫn nhận', () => {
    const m = mod(true);
    const s = m.core.init({ on: true });
    expect(runFeed(m, s, muc('gift', { virtual: true }), C)).toEqual(ghiLai('quà'));
  });
});

describe('các cửa còn lại', () => {
  it('runTick và runAction đi qua lõi', () => {
    const m = mod();
    const s = m.core.init({ on: true });
    expect(runTick(m, s, 0, C)).toEqual(ghiLai('nhịp'));
    expect(runAction(m, s, 'quay', C)).toEqual(ghiLai('quay'));
  });

  it('module không khai gì thì trả rỗng, không nổ', () => {
    const tron: LiveModule<Config, State> = {
      manifest: manifest([]),
      core: { init: () => ({ thay: [] }) },
    };
    const s = tron.core.init({ on: true });
    expect(runFeed(tron, s, muc('gift'), C)).toEqual([]);
    expect(runTick(tron, s, 0, C)).toEqual([]);
    expect(runAction(tron, s, 'x', C)).toEqual([]);
    expect(hookKinds(tron)).toEqual([]);
    expect(tickMs(tron), 'mặc định một giây').toBe(1000);
  });

  it('tickMs lấy theo module khi có khai', () => {
    expect(tickMs(mod())).toBe(250);
  });
});
