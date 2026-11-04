import type { Effect, FeedItem, ModuleCore } from '@live/contracts';
import type { Config } from './manifest';

export interface State {
  config: Config;
  /** Theo dõi rồi bỏ rồi theo lại là chuyện thường; cảm ơn một lần là đủ. */
  daCamOn: Set<string>;
}

function noi(state: State, item: FeedItem, mau: string): Effect[] {
  const key = item.user ?? item.name;
  if (state.daCamOn.has(key)) return [];
  state.daCamOn.add(key);

  const text = mau.replaceAll('{ten}', item.name);
  const ra: Effect[] = state.config.voice
    ? [{ kind: 'say', text, priority: 'low' }]
    : [{ kind: 'sfx', sound: 'join' }];
  ra.push({ kind: 'overlay', slot: 'ticker', ttlMs: 4000 });
  return ra;
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, daCamOn: new Set() };
  },

  hooks: {
    follow: {
      run(state, item) {
        return noi(state, item, state.config.followTemplate);
      },
    },
    subscribe: {
      run(state, item) {
        return noi(state, item, state.config.subscribeTemplate);
      },
    },
  },

  onConfig(state, config) {
    state.config = config;
    return state;
  },

  dispose(state) {
    state.daCamOn.clear();
  },
};
