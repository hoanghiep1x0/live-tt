import type { ModuleCore } from '@live/contracts';
import type { Config } from './manifest';

/** Dải rộng chừng này ký tự. Quãng trượt = bề rộng dải + độ dài câu, nên câu
 *  ngắn và câu dài trôi cùng một tốc độ, chỉ khác thời gian. */
const DAI_CH = 36;

/** Giữ nhiều hơn chừng này thì lời đầu hàng đã cũ tới mức chạy lên vô duyên. */
const CHO_TOI_DA = 8;

/** Hết lời nhắn thật thì dải nghỉ ngần này rồi mới chạy lời mời tiếp.
 *
 *  Không có quãng nghỉ thì lời mời nối nhau chạy suốt buổi, dải nằm chình ình
 *  giữa màn và người xem thôi nhìn nó. Có người nhắn thật thì cắt nghỉ ngay —
 *  chữ của khách không phải xếp hàng sau lời mời của máy. */
export const NGHI_MS = 25_000;

export interface Loi {
  /** Tăng dần. Phần vẽ dùng làm `key`, nhờ vậy dòng mới luôn chạy lại từ mép phải. */
  id: number;
  /** Nick, để lúc vẽ tra ra hạng hiện tại. Lời mời thì không có. */
  user?: string;
  name?: string;
  text: string;
}

export interface State {
  config: Config;
  /** Lời đang chờ tới lượt chạy. */
  cho: Loi[];
  dang: Loi | null;
  /** Mốc giờ dòng hiện tại bắt đầu chạy và lúc nó chạy hết.
   *
   *  Để ở lõi chứ không ở phần vẽ: hai cửa sổ cùng xem một phòng thì chữ chạy
   *  trùng nhau, và mở cửa sổ giữa chừng thì chữ vào đúng chỗ nó đang trôi. */
  batDau: number;
  ketThuc: number;
  /** Đang nghỉ tới mốc này thì chưa chạy dòng mới. */
  nghiDen: number;
  /** Lời mời kế tiếp sẽ chạy. */
  moi: number;
  dem: number;
}

/** Chữ thật sự trôi qua dải — dùng để tính thời gian, nên phải khớp với thứ
 *  phần vẽ đặt lên màn. */
export function chuHien(loi: Loi): string {
  return loi.name === undefined ? loi.text : `${loi.name}: ${loi.text}`;
}

export function thoiLuongMs(text: string, speed: number): number {
  return Math.round(((DAI_CH + [...text].length) / speed) * 1000);
}

function loiMoi(state: State): string[] {
  return state.config.invites
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

/** Dòng kế tiếp: lời nhắn trước, hết lời nhắn thì tới lời mời. */
function dongKe(state: State): Loi | null {
  const nhan = state.cho.shift();
  if (nhan !== undefined) return nhan;

  const ds = loiMoi(state);
  if (ds.length === 0) return null;
  const text = ds[state.moi % ds.length] as string;
  state.moi = (state.moi + 1) % ds.length;
  state.dem += 1;
  return { id: state.dem, text };
}

function doiDong(state: State, now: number): void {
  const ke = dongKe(state);
  state.dang = ke;
  state.batDau = now;
  state.ketThuc = ke === null ? now : now + thoiLuongMs(chuHien(ke), state.config.speed);
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, cho: [], dang: null, batDau: 0, ketThuc: 0, nghiDen: 0, moi: 0, dem: 0 };
  },

  hooks: {
    comment: {
      run(state, item, ctx) {
        const text = item.text.trim();
        if (text === '') return [];
        if (
          state.config.source === 'top' &&
          !ctx.session.topGivers.some((g) => g.user === item.user)
        ) {
          return [];
        }

        // Một người nhắn mấy câu liền thì chỉ giữ câu mới nhất: dải chỉ có một
        // dòng, để cả tràng của một người thì cả phòng phải xếp hàng sau họ.
        if (item.user !== undefined) {
          const cu = state.cho.findIndex((x) => x.user === item.user);
          if (cu >= 0) state.cho.splice(cu, 1);
        }

        state.dem += 1;
        const loi: Loi = { id: state.dem, name: item.name, text };
        if (item.user !== undefined) loi.user = item.user;
        state.cho.push(loi);
        if (state.cho.length > CHO_TOI_DA) state.cho.shift();
        // Khách vừa nhắn thì thôi nghỉ: chữ của họ lên ngay.
        state.nghiDen = 0;
        return [];
      },
    },
  },

  onTick(state, now) {
    // Đang chạy dở: xin thiết kế giữ dải sáng. Thiết kế dựa vào tin này để biết
    // lúc nào nên vẽ dải, lúc nào cất đi — nó không được biết lõi của mình.
    if (state.dang !== null && now < state.ketThuc) {
      return [{ kind: 'overlay', slot: 'ticker', ttlMs: 1_000 }];
    }

    if (state.dang !== null) {
      state.dang = null;
      // Hết lời nhắn thật thì nghỉ một lúc cho dải biến mất khỏi màn.
      if (state.cho.length === 0) {
        state.nghiDen = now + NGHI_MS;
        return [];
      }
    }
    if (state.cho.length === 0 && now < state.nghiDen) return [];

    doiDong(state, now);
    return state.dang === null ? [] : [{ kind: 'overlay', slot: 'ticker', ttlMs: 1_000 }];
  },

  onConfig(state, config) {
    state.config = config;

    // Đổi tốc độ giữa lúc đang live: tính lại hạn của chính dòng đang chạy,
    // không thì nó chạy nốt bằng tốc độ cũ rồi mới nghe lời.
    if (state.dang !== null) {
      state.ketThuc = state.batDau + thoiLuongMs(chuHien(state.dang), config.speed);
    }
    return state;
  },

  dispose(state) {
    state.cho.length = 0;
    state.dang = null;
  },
};
