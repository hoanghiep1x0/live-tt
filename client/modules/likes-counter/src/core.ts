import type { Ctx, ModuleCore } from '@live/contracts';
import type { Config } from './manifest';

export interface State {
  config: Config;
  /** Mốc phần trăm đã báo. Giữ lại để không báo đi báo lại cùng một mốc. */
  mocDaBao: number;
}

/** Mốc tròn gần nhất đã đạt, ví dụ 62% với bước 25 là 50. */
function moc(likes: number, c: Config): number {
  const pct = Math.min(100, Math.floor((likes / c.goal) * 100));
  return Math.floor(pct / c.stepPercent) * c.stepPercent;
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, mocDaBao: 0 };
  },

  hooks: {
    like: {
      // Tim của nhân vật ảo cũng là tim thật trên TikTok, nhưng ở đây tổng lấy
      // từ phiên nên không cộng hai lần — vẫn giữ mặc định bỏ qua cho nhất quán.
      run(state, _item, ctx: Ctx<Config>) {
        // Đọc tổng tim từ phiên thay vì tự cộng dồn: TikTok gửi tổng của cả phiên,
        // tin số của họ chắc hơn tin phép cộng của mình khi có tin bị mất.
        const m = moc(ctx.session.totals.likes, state.config);
        if (m <= state.mocDaBao) return [];
        state.mocDaBao = m;
        return [
          { kind: 'say', text: state.config.template.replaceAll('{phantram}', String(m)) },
          { kind: 'overlay', slot: 'top-bar', ttlMs: 6000 },
          { kind: 'sfx', sound: 'fanfare' },
        ];
      },
    },
  },

  onConfig(state, config) {
    // Nâng mục tiêu giữa lúc đang live thì phần trăm tụt xuống. Chỉ làm tròn mốc
    // đã báo theo bước mới, KHÔNG đưa về 0 — về 0 là đọc lại toàn bộ các mốc cũ.
    state.mocDaBao = Math.floor(state.mocDaBao / config.stepPercent) * config.stepPercent;
    state.config = config;
    return state;
  },
};
