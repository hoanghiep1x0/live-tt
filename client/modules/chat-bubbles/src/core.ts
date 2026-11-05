import type { Ctx, Effect, FeedItem, ModuleCore } from '@live/contracts';
import type { Config } from './manifest';

export interface Bong {
  id: number;
  name: string;
  text: string;
  /** Bóng quà vẽ khác bóng bình luận. */
  qua: boolean;
  at: number;
  /** Lùi vào trong một đoạn, xen kẽ với bóng ngay trước nó. Chốt lúc thêm nên
   *  bị đẩy lên bóng không nhảy ngang; tính theo bóng trước chứ không theo id
   *  vì giữa hai lời thường chen lượt thả tim, id hay trùng chẵn lẻ. */
  le: boolean;
}

/** Hai bóng lên cách nhau ít nhất ngần này. Bình luận dồn một lúc (phòng
 *  đông, hay mới mở trang mà phiên đã có sẵn chục câu) thì xếp hàng lên từng
 *  bóng một, có nhịp, chứ không bật cả chùm cùng lúc. */
export const NHIP_BONG_MS = 1_200;

/** Một bình luận đang chờ tới lượt lên bóng. */
interface Cho {
  bong: Omit<Bong, 'le' | 'at'>;
  /** Lúc vào hàng — chờ quá đời một bóng thì bỏ, lên muộn thế là nói chuyện cũ. */
  vao: number;
}

export interface State {
  config: Config;
  bong: Bong[];
  /** Đếm quà đã thấy, để chen bóng quà thưa ra. */
  demQua: number;
  /** Hàng chờ lên bóng, cũ trước mới sau. */
  cho: Cho[];
  /** Lúc bóng gần nhất lên. */
  lanCuoi: number;
}

function hien(state: State, b: Omit<Bong, 'le' | 'at'>, now: number): void {
  const truoc = state.bong[state.bong.length - 1];
  state.bong.push({ ...b, at: now, le: truoc === undefined ? false : !truoc.le });
  state.lanCuoi = now;
  // Quá số bóng cùng lúc thì bỏ bóng cũ nhất — màn hình chỉ có bấy nhiêu chỗ.
  while (state.bong.length > state.config.max) state.bong.shift();
}

/** Lên bóng ngay nếu đã đủ nhịp và không ai chờ trước, không thì vào hàng. */
function them(state: State, b: Omit<Bong, 'le' | 'at'>, now: number): Effect[] {
  if (state.cho.length === 0 && now - state.lanCuoi >= NHIP_BONG_MS) {
    hien(state, b, now);
    return [sang(state)];
  }
  state.cho.push({ bong: b, vao: now });
  // Hàng chờ dài hơn số bóng hiện được thì người đầu hàng sẽ bị đẩy khỏi màn
  // ngay khi vừa lên — bỏ từ đầu hàng, giữ những câu mới nhất.
  while (state.cho.length > state.config.max) state.cho.shift();
  return [];
}

function sang(state: State): Effect {
  return { kind: 'overlay', slot: 'chat', ttlMs: state.config.songSec * 1000 };
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, bong: [], demQua: 0, cho: [], lanCuoi: -Infinity };
  },

  hooks: {
    comment: {
      // Nhân vật ảo vào là để phòng đỡ trống; lời họ mà không lên bóng thì họ
      // nói vào khoảng không. Bóng chỉ hiện lời chứ không cảm ơn ai, nên không
      // dính cái bẫy bot tự cảm ơn chính nó mà runtime chặn mặc định.
      includeVirtual: true,
      run(state, item: FeedItem, ctx: Ctx<Config>) {
        // Câu đã cũ hơn đời một bóng (mở trang giữa chừng, phiên có sẵn câu từ
        // trước) thì thôi — lên bây giờ là nhắc lại chuyện đã qua.
        if (ctx.now - item.at > state.config.songSec * 1000) return [];
        return them(state, { id: item.id, name: item.name, text: item.text, qua: false }, ctx.now);
      },
    },
    gift: {
      run(state, item: FeedItem, ctx: Ctx<Config>) {
        state.demQua += 1;
        // Phòng đông quà thì bóng quà sẽ lấn hết bình luận thật; chen thưa ra.
        if (state.demQua % state.config.giftEvery !== 0) return [];
        if (ctx.now - item.at > state.config.songSec * 1000) return [];
        return them(
          state,
          {
            id: item.id,
            name: item.name,
            text: item.gift === undefined ? item.text : `tặng ${item.gift} ×${item.count ?? 1}`,
            qua: true,
          },
          ctx.now,
        );
      },
    },
  },

  onTick(state, now) {
    const han = state.config.songSec * 1000;
    state.bong = state.bong.filter((b) => now - b.at < han);
    // Chờ quá lâu thì bỏ: lên muộn thế là nói chuyện cũ.
    state.cho = state.cho.filter((c) => now - c.vao < han);
    const dau = state.cho[0];
    if (dau === undefined || now - state.lanCuoi < NHIP_BONG_MS) return [];
    state.cho.shift();
    hien(state, dau.bong, now);
    return [sang(state)];
  },

  onConfig(state, config) {
    state.config = config;
    // Rút số bóng xuống giữa lúc đang live: bỏ bớt ngay, không chờ bóng tự hết
    // hạn, nếu không màn hình vẫn đang chật đúng như trước.
    while (state.bong.length > config.max) state.bong.shift();
    while (state.cho.length > config.max) state.cho.shift();
    return state;
  },

  dispose(state) {
    state.bong = [];
    state.cho = [];
  },
};
