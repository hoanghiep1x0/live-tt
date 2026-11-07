import type { ModuleCore } from '@live/contracts';
import type { Config } from './manifest';

/** Một lượt phát: video nào, bắt đầu lúc nào. Phần vẽ lùi video về đúng
 *  `now - tu`, nên hai cửa sổ cùng xem một phòng thấy cùng một khung hình, và
 *  cửa sổ mở giữa chừng vào đúng đoạn đang phát. */
export interface LuotPhat {
  url: string;
  tu: number;
  /** Khoá lượt — đổi là thẻ video mới, phát lại từ đầu. */
  k: number;
}

export interface State {
  config: Config;
  phat: LuotPhat | null;
  /** Video mới vừa tải lên, chờ nhịp kế (có `now`) để bắt đầu phát. */
  cho: boolean;
  dem: number;
  /** Lúc lượt phát gần nhất kết thúc — đếm từ đây tới lượt hiện lại. */
  ketThuc: number;
}

function batDau(state: State, now: number): void {
  const url = state.config.video.trim();
  state.cho = false;
  if (url === '') {
    state.phat = null;
    return;
  }
  state.dem += 1;
  state.phat = { url, tu: now, k: state.dem };
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    // Mở trang không tự phát lại video cũ: chỉ phát khi có video MỚI tải lên
    // hay người vận hành bấm "Phát".
    return { config, phat: null, cho: false, dem: 0, ketThuc: 0 };
  },

  onTick(state, now) {
    if (state.cho) {
      batDau(state, now);
      return [];
    }
    const { phatPhut, lapPhut } = state.config;
    // Hết giờ phát thì ẩn — lõi tự biết lúc nào hết, không chờ phần vẽ báo về,
    // nên hai cửa sổ cùng phòng ẩn hiện cùng lúc.
    if (state.phat !== null && phatPhut > 0 && now - state.phat.tu >= phatPhut * 60_000) {
      state.phat = null;
      state.ketThuc = now;
      return [];
    }
    // Ẩn đủ lâu thì hiện lại: video người thật ghé qua từng lúc cho phòng đỡ
    // một màu, không nằm lì cả buổi.
    if (state.phat === null && !state.cho && lapPhut > 0 && state.ketThuc > 0) {
      if (now - state.ketThuc >= lapPhut * 60_000) batDau(state, now);
    }
    return [];
  },

  onAction(state, op, ctx) {
    if (op === 'phat') batDau(state, ctx.now);
    else if (op === 'tat') {
      // Người vận hành tắt tay: thôi hẳn, không tự hiện lại.
      state.phat = null;
      state.cho = false;
      state.ketThuc = 0;
    }
    return [];
  },

  onConfig(state, config) {
    const cu = state.config.video.trim();
    state.config = config;
    const moi = config.video.trim();
    if (moi !== cu) {
      // Đổi video GIỮA CHỪNG (đang có video chạy): thay bằng video mới ngay,
      // khỏi phải bấm Phát. Đang không chạy thì theo "Tải lên là phát ngay".
      const dangPhat = state.phat !== null;
      state.phat = null;
      state.cho = moi !== '' && (dangPhat || config.phatNgay);
    }
    return state;
  },

  dispose(state) {
    state.phat = null;
    state.cho = false;
    state.ketThuc = 0;
  },
};
