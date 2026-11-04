import type { Ctx, FeedItem, ModuleCore } from '@live/contracts';
import type { Config } from './manifest';

export interface Bong {
  id: number;
  name: string;
  text: string;
  /** Bóng quà vẽ khác bóng bình luận. */
  qua: boolean;
  at: number;
}

export interface State {
  config: Config;
  bong: Bong[];
  /** Đếm quà đã thấy, để chen bóng quà thưa ra. */
  demQua: number;
}

function them(state: State, b: Bong): void {
  state.bong.push(b);
  // Quá số bóng cùng lúc thì bỏ bóng cũ nhất — màn hình chỉ có bấy nhiêu chỗ.
  while (state.bong.length > state.config.max) state.bong.shift();
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, bong: [], demQua: 0 };
  },

  hooks: {
    comment: {
      run(state, item: FeedItem, ctx: Ctx<Config>) {
        them(state, {
          id: item.id,
          name: item.name,
          text: item.text,
          qua: false,
          at: ctx.now,
        });
        return [{ kind: 'overlay', slot: 'chat', ttlMs: state.config.songSec * 1000 }];
      },
    },
    gift: {
      run(state, item: FeedItem, ctx: Ctx<Config>) {
        state.demQua += 1;
        // Phòng đông quà thì bóng quà sẽ lấn hết bình luận thật; chen thưa ra.
        if (state.demQua % state.config.giftEvery !== 0) return [];
        them(state, {
          id: item.id,
          name: item.name,
          text: item.gift === undefined ? item.text : `tặng ${item.gift} ×${item.count ?? 1}`,
          qua: true,
          at: ctx.now,
        });
        return [{ kind: 'overlay', slot: 'chat', ttlMs: state.config.songSec * 1000 }];
      },
    },
  },

  onTick(state, now) {
    const han = state.config.songSec * 1000;
    state.bong = state.bong.filter((b) => now - b.at < han);
    return [];
  },

  onConfig(state, config) {
    state.config = config;
    // Rút số bóng xuống giữa lúc đang live: bỏ bớt ngay, không chờ bóng tự hết
    // hạn, nếu không màn hình vẫn đang chật đúng như trước.
    while (state.bong.length > config.max) state.bong.shift();
    return state;
  },

  dispose(state) {
    state.bong = [];
  },
};
