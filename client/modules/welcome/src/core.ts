import type { Ctx, Effect, FeedItem, ModuleCore } from '@live/contracts';
import type { Config } from './manifest';

/** Tên TikTok tự sinh khi người dùng chưa đặt: "user1234567". Gọi tên kiểu này
 *  nghe như đọc số máy, nên mặc định bỏ qua. */
const TEN_MAC_DINH = /^user[0-9._]{3,}$/i;

export interface State {
  config: Config;
  /** Mốc lời chào gần nhất, để giữ giãn cách. */
  lastAt: number;
  /** Đã chào trong phiên này rồi thì không chào lại — người xem hay ra vào. */
  daChao: Set<string>;
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, lastAt: 0, daChao: new Set() };
  },

  hooks: {
    join: {
      run(state, item: FeedItem, ctx: Ctx<Config>) {
        const key = item.user ?? item.name;
        if (state.daChao.has(key)) return [];
        if (state.config.skipDefault && TEN_MAC_DINH.test(item.name)) return [];

        // Quá dày thì bỏ hẳn lời chào này, không xếp hàng chờ: chào một người đã
        // vào từ ba phút trước thì vô nghĩa.
        if (state.lastAt > 0 && ctx.now - state.lastAt < state.config.gapSec * 1000) return [];

        state.daChao.add(key);
        state.lastAt = ctx.now;

        const text = state.config.template.replaceAll('{ten}', item.name);
        const ra: Effect[] = state.config.voice
          ? [{ kind: 'say', text, priority: 'low' }]
          : [{ kind: 'sfx', sound: 'join' }];
        ra.push({ kind: 'overlay', slot: 'ticker', ttlMs: 4000 });
        return ra;
      },
    },
  },

  onConfig(state, config) {
    // Giãn cách rút ngắn giữa lúc đang live: bỏ mốc cũ để người kế tiếp được chào
    // ngay, chứ không phải chờ hết khoảng giãn cũ vốn đã dài hơn.
    if (config.gapSec < state.config.gapSec) state.lastAt = 0;
    state.config = config;
    return state;
  },

  dispose(state) {
    state.daChao.clear();
  },
};
