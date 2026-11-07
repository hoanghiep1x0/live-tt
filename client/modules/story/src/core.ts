import { cachKeCua } from '@live/contracts';
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
  /** Lời MC vừa kể đoạn hiện tại (MC tự kể). Hiện làm phụ đề thay cho chữ gốc
   *  của đoạn, vì đó mới là câu người xem đang nghe. `null` khi tự đọc. */
  loiKe: string | null;
  /** Lần cuối MC kể một đoạn. */
  mcKeLuc: number;
  /** Nhịp đầu tiên module chạy — để biết MC đã vắng bao lâu từ lúc mở. */
  batDau: number;
}

/** MC tự kể mà vắng ngần này (tắt, hết hạn mức, lỗi) thì module tự đọc tiếp
 *  từng đoạn như trước — truyện không bao giờ đứng im trên sóng. */
export const CHO_MC_MS = 45_000;

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

/** Chữ phụ đề trong khung truyện: LUÔN là chữ gốc của đoạn đang kể — chỉ nội
 *  dung truyện. Lời MC diễn lại (có khi chêm câu đố, gọi cả nhà, mời thả tim)
 *  chỉ đọc thành tiếng, không bao giờ lên khung truyện. */
export function chuPhuDe(state: State): string | null {
  return doanHienTai(state);
}

function sang(state: State, i: number, now: number, ds: string[]): Effect[] {
  state.doan = i;
  state.tu = now;
  state.daDoc = true;
  state.loiKe = null;

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
    return {
      config,
      doan: -1,
      tu: 0,
      daDoc: false,
      hetTruyen: false,
      loiKe: null,
      mcKeLuc: 0,
      batDau: 0,
    };
  },

  hooks: {
    // MC tự kể (như bản cũ): mỗi câu kể của MC mang số đoạn — chuyển tới đúng
    // đoạn đó, hiện lời MC làm phụ đề. Không đọc gì ở đây: runner đã đọc câu
    // MC bằng nhiều giọng rồi.
    host: {
      run(state, item, ctx): Effect[] {
        if (cachKeCua(state.config) === 'tu-doc') return [];
        // MC nói câu nào (chuyển tiếp, chào giữa hai truyện…) cũng là MC đang
        // có mặt: đừng tự đọc thay — không thì đoạn đầu truyện mới bị đọc hai lần.
        state.mcKeLuc = ctx.now;
        if (item.ke === undefined) return [];
        if (item.ke < 0 || item.ke >= catDoan(state.config.passages).length) return [];
        state.doan = item.ke;
        state.tu = ctx.now;
        state.daDoc = true;
        state.loiKe = item.text;
        state.mcKeLuc = ctx.now;
        state.hetTruyen = false;
        return [{ kind: 'overlay', slot: 'screen', ttlMs: 2000 }];
      },
    },
  },

  onTick(state, now, ctx) {
    const ds = catDoan(state.config.passages);
    if (ds.length === 0 || state.hetTruyen) return [];

    if (cachKeCua(state.config) !== 'tu-doc') {
      if (state.batDau === 0) state.batDau = now;
      // MC đang kể (hoặc mới mở, chờ MC vào): đoạn do MC chuyển. Vắng quá
      // `CHO_MC_MS` thì rơi xuống tự đọc ở dưới, truyện vẫn chạy.
      if (now - Math.max(state.mcKeLuc, state.batDau) < CHO_MC_MS) return [];
    }

    // Tự đọc to: còn đang đọc (đoạn trước, hay câu MC) thì chưa sang đoạn —
    // khung đổi đoạn khi giọng đọc đoạn cũ còn dở là chữ, hình đi trước giọng.
    if (state.config.readAloud && ctx.dangNoi) return [];

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
    // Đổi truyện thì lời kể cũ không còn đúng đoạn nào nữa; và đếm lại thời
    // gian chờ MC từ đầu — MC đang chuyển truyện, sắp mở truyện mới.
    if (truoc.join('\n') !== sau.join('\n')) {
      state.loiKe = null;
      state.batDau = 0;
      state.mcKeLuc = 0;
    }
    if (sau.length > 0) state.hetTruyen = false;
    return state;
  },
};

/** "mm:ss" (hay "h:mm:ss") từ số giây. Hàm thuần. */
export function dongHo(giay: number): string {
  const g = Math.max(0, Math.floor(giay));
  const h = Math.floor(g / 3600);
  const p = String(Math.floor((g % 3600) / 60)).padStart(2, '0');
  const s = String(g % 60).padStart(2, '0');
  return h > 0 ? `${h}:${p}:${s}` : `${p}:${s}`;
}
