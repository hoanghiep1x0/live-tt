import type { Ctx, ModuleCore } from '@live/contracts';
import type { Config } from './manifest';

/** Đèn soi chuyển sang người kế trong top sau ngần này. */
const SOI_MOI_MS = 9_000;
/** Và soi sáng trong ngần này rồi tắt. */
const SOI_LAU_MS = 3_600;

export interface State {
  config: Config;
  /** Nick người đang giữ hạng nhất. Giữ lại để biết lúc nào có người vượt lên. */
  dauBang: string | null;
  /** Hạng đang được đèn soi, `-1` là đang tắt đèn. */
  dangSoi: number;
}

/** Đèn soi lần lượt từng người trong top, nghỉ giữa hai lượt.
 *  Thuần theo `now` nên hai cửa sổ xem cùng một phòng soi cùng một người. */
export function hangDangSoi(now: number, soNguoi: number): number {
  if (soNguoi <= 0) return -1;
  if (now % SOI_MOI_MS >= SOI_LAU_MS) return -1;
  return Math.floor(now / SOI_MOI_MS) % soNguoi;
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, dauBang: null, dangSoi: -1 };
  },

  onTick(state, now, ctx: Ctx<Config>) {
    const top = ctx.session.topGivers;
    state.dangSoi = hangDangSoi(now, Math.min(top.length, state.config.size));

    const nhat = top[0];
    if (nhat === undefined) return [];

    const cu = state.dauBang;
    if (nhat.user === cu) return [];
    state.dauBang = nhat.user;

    // Người đầu tiên lên bảng thì không phải "vượt lên" — chưa có ai để vượt.
    if (cu === null) return [];
    if (!state.config.announce) return [];

    return [
      { kind: 'say', text: state.config.template.replaceAll('{ten}', nhat.name), priority: 'high' },
      { kind: 'sfx', sound: 'fanfare' },
      { kind: 'overlay', slot: 'tops', ttlMs: 5000 },
    ];
  },

  onConfig(state, config) {
    state.config = config;
    return state;
  },
};
