import type { Effect, ModuleCore } from '@live/contracts';
import type { Config } from './manifest';

export interface State {
  config: Config;
  /** Đoạn đang kể. `-1` là chưa bắt đầu. */
  doan: number;
  /** Mốc lúc chuyển sang đoạn hiện tại. */
  tu: number;
  /** Đoạn hiện tại đã được đọc chưa.
   *
   *  Cần một cờ riêng chứ không mượn `tu`: nạp truyện mới giữa chừng thì chữ
   *  phải lên màn ngay, nhưng `onConfig` không biết bây giờ là mấy giờ nên chưa
   *  đặt được mốc — việc đọc để nhịp kế tiếp lo. */
  daDoc: boolean;
  /** Kể hết truyện rồi và không lặp lại. */
  hetTruyen: boolean;
}

/** Cắt khối chữ thành từng đoạn. Dòng trống bị bỏ, khoảng trắng thừa nén lại. */
export function catDoan(passages: string): string[] {
  return passages
    .split('\n')
    .map((d) => d.trim().replace(/\s+/g, ' '))
    .filter((d) => d !== '');
}

/** Đoạn đang kể, để phần vẽ dùng. */
export function doanHienTai(state: State): string | null {
  const ds = catDoan(state.config.passages);
  return ds[state.doan] ?? null;
}

function sang(state: State, i: number, now: number, ds: string[]): Effect[] {
  state.doan = i;
  state.tu = now;
  state.daDoc = true;

  const d = ds[i];
  if (d === undefined) return [];
  // Hiện chữ là việc của phần vẽ; ở đây chỉ lo đọc to và nhấn khung chiếu lên.
  const ra: Effect[] = [{ kind: 'overlay', slot: 'screen', ttlMs: 2000 }];
  if (state.config.readAloud) {
    // `caption: false`: đoạn truyện đã nằm trên khung chiếu rồi, để thẻ MC
    // nhắc lại nữa là màn ra hai lần cùng một câu.
    ra.unshift({ kind: 'say', text: d, priority: 'normal', caption: false });
  }
  return ra;
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, doan: -1, tu: 0, daDoc: false, hetTruyen: false };
  },

  onTick(state, now) {
    const ds = catDoan(state.config.passages);
    if (ds.length === 0 || state.hetTruyen) return [];

    if (state.doan < 0 || !state.daDoc) {
      const i = Math.max(0, Math.min(state.doan, ds.length - 1));
      return sang(state, i, now, ds);
    }

    if (now - state.tu < state.config.secPerPassage * 1000) return [];

    const ke = state.doan + 1;
    if (ke < ds.length) return sang(state, ke, now, ds);

    if (state.config.loop) return sang(state, 0, now, ds);
    state.hetTruyen = true;
    return [];
  },

  onAction(state, op, ctx) {
    if (op !== 'next') return [];
    const ds = catDoan(state.config.passages);
    if (ds.length === 0) return [];
    state.hetTruyen = false;
    return sang(state, (state.doan + 1) % ds.length, ctx.now, ds);
  },

  onConfig(state, config) {
    const truoc = catDoan(state.config.passages);
    const sau = catDoan(config.passages);
    state.config = config;

    // Sửa truyện giữa lúc đang kể: giữ chỗ đang đứng nếu vẫn còn đoạn đó, còn
    // không thì kể lại từ đầu. Nhảy lung tung giữa buổi thì người nghe mất mạch.
    if (truoc[state.doan] !== sau[state.doan]) {
      state.doan = sau.length === 0 ? -1 : 0;
      state.tu = 0;
      state.daDoc = false;
    }
    if (sau.length > 0) state.hetTruyen = false;
    return state;
  },
};
