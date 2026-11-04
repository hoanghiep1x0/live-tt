import type { Ctx, Effect, FeedItem, ModuleCore } from '@live/contracts';
import type { Config } from './manifest';

/** Quà của một người đang được gom lại. */
interface Gom {
  name: string;
  gift: string;
  count: number;
  coins: number;
  /** Lần cuối người này tặng — mốc để biết combo đã dứt chưa. */
  at: number;
}

export interface State {
  config: Config;
  /** Khoá là nick, không phải tên hiển thị: hai người có thể trùng tên. */
  gom: Map<string, Gom>;
}

function cau(mau: string, g: Gom): string {
  return mau
    .replaceAll('{ten}', g.name)
    .replaceAll('{qua}', g.gift)
    .replaceAll('{soluong}', String(g.count));
}

function camOn(mau: string, g: Gom): Effect[] {
  return [
    { kind: 'say', text: cau(mau, g), priority: 'normal' },
    { kind: 'sfx', sound: 'gift' },
    { kind: 'overlay', slot: 'ticker', ttlMs: 4000 },
  ];
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, gom: new Map() };
  },

  hooks: {
    gift: {
      run(state, item: FeedItem, ctx: Ctx<Config>) {
        const coins = item.coins ?? item.xu ?? 0;
        if (coins < state.config.minCoins) return [];

        const key = item.user ?? item.name;
        const moi: Gom = {
          name: item.name,
          gift: item.gift ?? 'quà',
          count: item.count ?? 1,
          coins,
          at: ctx.now,
        };

        if (!state.config.combo) return camOn(state.config.template, moi);

        const cu = state.gom.get(key);
        state.gom.set(
          key,
          cu ? { ...moi, count: cu.count + moi.count, coins: cu.coins + coins } : moi,
        );
        return [];
      },
    },
  },

  onTick(state, now) {
    if (state.gom.size === 0) return [];
    const ra: Effect[] = [];
    const cho = state.config.comboSec * 1000;
    for (const [key, g] of state.gom) {
      if (now - g.at < cho) continue;
      ra.push(...camOn(state.config.template, g));
      state.gom.delete(key);
    }
    return ra;
  },

  onConfig(state, config) {
    state.config = config;
    // Người vận hành tắt gộp combo giữa lúc đang live: số quà đang gom phải ra
    // ngay ở nhịp kế tiếp, nếu không nó nằm đó mãi và người tặng không được cảm ơn.
    if (!config.combo) {
      for (const g of state.gom.values()) g.at = 0;
    }
    return state;
  },

  dispose(state) {
    state.gom.clear();
  },
};
