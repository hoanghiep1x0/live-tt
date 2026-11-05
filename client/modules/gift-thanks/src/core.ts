import type { Ctx, Effect, FeedItem, ModuleCore } from '@live/contracts';
import type { Config } from './manifest';

/** Giây sau món quà cho từng câu cảm ơn. Thưa dần: dồn cả năm câu vào mười giây
 *  đầu thì MC nói đè lên chính mình, còn rải ra thế này thì người tặng thỉnh
 *  thoảng lại nghe nhắc tên mình suốt một phút. */
export const OFFSET_S = [0, 5, 15, 30, 60] as const;

/** Quà của một người đang được gom lại. */
interface Gom {
  name: string;
  gift: string;
  count: number;
  coins: number;
  /** Lần cuối người này tặng — mốc để biết combo đã dứt chưa. */
  at: number;
}

/** Một lượt cảm ơn đang chạy: cùng một người, nhiều câu rải theo `OFFSET_S`. */
interface Luot {
  name: string;
  gift: string;
  count: number;
  big: boolean;
  /** Giờ câu đầu tiên được đọc; các câu sau tính từ đây. */
  t0: number;
  /** Câu kế tiếp sẽ đọc. */
  i: number;
}

export interface State {
  config: Config;
  /** Khoá là nick, không phải tên hiển thị: hai người có thể trùng tên. */
  gom: Map<string, Gom>;
  luot: Map<string, Luot>;
}

function cau(mau: string, l: Luot): string {
  return mau
    .replaceAll('{ten}', l.name)
    .replaceAll('{qua}', l.gift)
    .replaceAll('{soluong}', String(l.count));
}

function dong(mau: string): string[] {
  return mau
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

/** Câu thứ `i` của lượt. Hết câu thì dùng lại câu cuối, không quay vòng về câu
 *  đầu — câu đầu là câu chào món quà, nghe lại ở phút sau là vô duyên. */
export function loiCamOn(config: Config, l: Luot): string {
  const ds = dong(l.big ? config.bigTemplates : config.templates);
  if (ds.length === 0) return '';
  return cau(ds[Math.min(l.i, ds.length - 1)] as string, l);
}

function quaLon(config: Config, count: number, coins: number): boolean {
  return count >= config.bigCount || coins >= config.bigCoins;
}

/** Hiệu ứng cho một câu. Chuông và đèn chỉ ở câu đầu: mấy câu nhắc lại sau đó
 *  mà lần nào cũng kéo chuông thì phòng thành cái chợ. */
function hieuUng(config: Config, l: Luot): Effect[] {
  const text = loiCamOn(config, l);
  if (text === '') return [];
  const ra: Effect[] = config.voice ? [{ kind: 'say', text, priority: 'normal' }] : [];
  if (l.i === 0) {
    ra.push({ kind: 'sfx', sound: 'gift' }, { kind: 'overlay', slot: 'ticker', ttlMs: 4000 });
  }
  return ra;
}

/** Mở một lượt cảm ơn cho món quà vừa gom xong, và đọc ngay câu đầu.
 *
 *  Người đang trong lượt mà tặng tiếp thì KHÔNG mở lượt mới: các câu còn lại
 *  nhắc món mới nhất. Nếu không, một người tặng liên tục là MC chỉ còn đi cảm
 *  ơn họ, cả phòng không nghe được gì khác. */
function moLuot(state: State, key: string, g: Gom, now: number): Effect[] {
  const big = quaLon(state.config, g.count, g.coins);
  const dang = state.luot.get(key);
  if (dang !== undefined) {
    dang.gift = g.gift;
    dang.count = g.count;
    if (big) dang.big = true;
    return [];
  }

  const l: Luot = { name: g.name, gift: g.gift, count: g.count, big, t0: now, i: 0 };
  state.luot.set(key, l);
  const ra = hieuUng(state.config, l);
  l.i = 1;
  return ra;
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, gom: new Map(), luot: new Map() };
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

        if (!state.config.combo) return moLuot(state, key, moi, ctx.now);

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
    const ra: Effect[] = [];

    const cho = state.config.comboSec * 1000;
    for (const [key, g] of state.gom) {
      if (now - g.at < cho) continue;
      ra.push(...moLuot(state, key, g, now));
      state.gom.delete(key);
    }

    for (const [key, l] of state.luot) {
      if (l.i >= state.config.repeats) {
        state.luot.delete(key);
        continue;
      }
      if (now - l.t0 < (OFFSET_S[l.i] ?? 0) * 1000) continue;
      ra.push(...hieuUng(state.config, l));
      l.i += 1;
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
    state.luot.clear();
  },
};
