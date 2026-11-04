import type { Ctx, ModuleCore } from '@live/contracts';
import type { Config } from './manifest';

export interface State {
  config: Config;
  /** Nick người đang giữ hạng nhất. Giữ lại để biết lúc nào có người vượt lên. */
  dauBang: string | null;
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, dauBang: null };
  },

  onTick(state, _now, ctx: Ctx<Config>) {
    const nhat = ctx.session.topGivers[0];
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
