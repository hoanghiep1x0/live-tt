import type { Ctx, FeedItem, Giver, ModuleCore } from '@live/contracts';
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
  /** Món quà gần nhất, để dựng dòng đua top. */
  quaCuoi: { user: string; name: string; xu: number; at: number } | null;
  /** Mốc tính nhịp ẩn hiện lúc chưa có quà nào — đặt ở nhịp đầu tiên. */
  moc: number;
}

/** Dòng đua top hiện một lượt dài rồi nghỉ, lượt sau dài hơn lượt trước
 *  (2 · 2,5 · 3 · 3,5 · 4 · 4,5 · 5 phút) rồi quay lại từ đầu. Chuyển nguyên
 *  nhịp của bản cũ (`raceVisible`): để dòng đỏ nằm đó suốt buổi thì người xem
 *  hết nhìn, mà chớp tắt liên tục thì rối mắt. */
const HIEN_MS = 2 * 60_000;
const HIEN_THEM_MS = 30_000;
const HIEN_TOI_DA_MS = 5 * 60_000;
const NGHI_MS = 30_000;
const CAC_LUOT = Array.from(
  { length: Math.floor((HIEN_TOI_DA_MS - HIEN_MS) / HIEN_THEM_MS) + 1 },
  (_, k) => HIEN_MS + k * HIEN_THEM_MS,
);
const VONG_MS = CAC_LUOT.reduce((n, d) => n + d + NGHI_MS, 0);

/** Dòng đua có đang hiện không, theo tuổi của mốc. Thuần theo tuổi nên hai cửa
 *  sổ xem cùng một phòng ẩn hiện cùng lúc. */
export function hienDua(tuoi: number): boolean {
  if (tuoi < 0) return false;
  let t = tuoi % VONG_MS;
  for (const lau of CAC_LUOT) {
    if (t < lau) return true;
    t -= lau;
    if (t < NGHI_MS) return false;
    t -= NGHI_MS;
  }
  return false;
}

/** Dòng đua top đang phải hiện, hoặc `null`. */
export interface Dua {
  /** Rỗng nghĩa là Top 1 còn trống — mời người xem lên. */
  name: string;
  xu: number;
  rank: number;
  /** Không phải báo quà vừa tặng, mà báo ai đang dẫn đầu. */
  lead?: true;
}

/** Dựng dòng đua từ bảng top hiện tại.
 *
 *  Người vừa tặng mà đang có tên trong bảng thì khoe món quà của họ, nhịp ẩn
 *  hiện tính từ lúc tặng. Không thì quay về báo người đang dẫn đầu, nhịp tính
 *  từ mốc mở phòng. Bản cũ dò lại cả feed mỗi lần vẽ; ở đây lõi nhớ sẵn món
 *  cuối nên phần vẽ không phải dò gì. */
export function dongDua(
  top: readonly Giver[],
  qua: State['quaCuoi'],
  now: number,
  moc: number,
): Dua | null {
  const i = qua === null ? -1 : top.findIndex((v) => v.user === qua.user);
  if (qua !== null && i >= 0) {
    return hienDua(now - qua.at) ? { name: qua.name, xu: qua.xu, rank: i + 1 } : null;
  }
  if (!hienDua(now - moc)) return null;
  const nhat = top[0];
  if (nhat !== undefined && nhat.xu > 0) {
    return { name: nhat.name, xu: nhat.xu, rank: 1, lead: true };
  }
  // Chưa ai tặng quà thì KHÔNG hiện dải nào, như bản cũ: dải "Top 1 đang chờ
  // bạn" nằm suốt buổi trên khung là lời mời chay, người xem chỉ thấy phòng
  // đang xin quà.
  return null;
}

/** Dải mời lên top / báo người dẫn đầu đổi kiểu sau ngần này. */
export const DOI_KIEU_MS = 8_000;

/** Kiểu của dải đua lúc `now`: dải báo QUÀ luôn đỏ, như bản cũ; dải mời lên
 *  top / báo người dẫn đầu thì thay phiên vàng và đỏ, để người xem thấy cả hai
 *  dáng của bản cũ chứ không chỉ một màu vàng nằm đó cả buổi. Thuần theo đồng
 *  hồ: hai cửa sổ cùng phòng đổi màu cùng lúc. */
export function kieuDua(dua: Dua, now: number): 'vang' | 'do' {
  if (dua.lead !== true) return 'do';
  return Math.floor(now / DOI_KIEU_MS) % 2 === 0 ? 'vang' : 'do';
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
    return { config, dauBang: null, dangSoi: -1, quaCuoi: null, moc: 0 };
  },

  hooks: {
    gift: {
      run(state, item: FeedItem, ctx: Ctx<Config>) {
        // Nhân vật minh hoạ không lên dòng đua: dòng này mời người xem thật
        // đua nhau, khoe quà của người máy tạo ra là nói dối họ.
        if (item.virtual === true) return [];
        const user = item.user;
        if (user === undefined) return [];
        state.quaCuoi = { user, name: item.name, xu: item.coins ?? item.xu ?? 0, at: ctx.now };
        return [];
      },
    },
  },

  onTick(state, now, ctx: Ctx<Config>) {
    if (state.moc === 0) state.moc = now;
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
      ...(state.config.voice
        ? [
            {
              kind: 'say' as const,
              text: state.config.template.replaceAll('{ten}', nhat.name),
              priority: 'high' as const,
            },
          ]
        : []),
      { kind: 'sfx', sound: 'fanfare' },
      { kind: 'overlay', slot: 'tops', ttlMs: 5000 },
    ];
  },

  onConfig(state, config) {
    state.config = config;
    return state;
  },
};
