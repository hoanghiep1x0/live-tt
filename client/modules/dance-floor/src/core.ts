import type { Effect, FeedItem, ModuleCore } from '@live/contracts';
import type { Config } from './manifest';

/** Chỗ đứng trên sàn, tính TRONG LÒNG slot `floor` chứ không theo toạ độ màn:
 *  `x` là % bề rộng slot, `chan` là cqw từ mép trên slot xuống tới gót chân,
 *  `co` là cỡ người (xa thì nhỏ). Thiết kế nào có slot `floor` cũng đặt được,
 *  không phải đi sửa lại số cho từng bối cảnh.
 *
 *  Đúng chỗ của bản cũ (`FLOOR_SPOTS`): ba người đầu đứng giữa sàn, đông hơn
 *  thì lan dần ra hai bên. Thẻ MC rộng 62cqw nằm đè lên chính chỗ đó, nên
 *  thiết kế phải giấu thẻ trong lúc sàn đang nhảy — bản cũ cũng giấu. Hai mép
 *  ngoài cùng chừa trống: thiết kế hay dựng ảnh người đứng hai bên sàn. */
export const CHO_DUNG = [
  { x: 38, chan: 9.4, co: 1 },
  { x: 62, chan: 9.4, co: 1 },
  { x: 50, chan: 10.3, co: 1.06 },
  { x: 26, chan: 10.3, co: 1.06 },
  { x: 74, chan: 10.3, co: 1.06 },
  { x: 16, chan: 9.4, co: 1 },
  { x: 84, chan: 9.4, co: 1 },
] as const;

/** Tối đa ngần này người trên sàn — hết chỗ đứng thì thôi. */
export const TOI_DA = CHO_DUNG.length;

/** Kiểu nhân vật cho từng chỗ. Ba chỗ đầu giữ nguyên bộ ba của bản cũ
 *  (`DANCE_VARIANTS = [5, 2, 1]` xếp vào x 38 / 62 / 50): nam mũ lưỡi trai ·
 *  nữ tóc dài · nam tóc rối. */
const KIEU = [5, 2, 1, 4, 3, 6, 2] as const;

/** Chạy từ lối giữa rạp lên chỗ đứng / từ chỗ đứng xuống lại lối giữa. Đủ
 *  cho cả nhóm xuất phát lệch nhau (`CHAM_MS` mỗi người) mà vẫn kịp tới nơi. */
export const LEN_MS = 3_200;
export const XUONG_MS = 3_200;
/** Người sau xuất phát chậm hơn người trước ngần này — cả nhóm ùa lên chứ
 *  không như một khối dịch chuyển. Phải khớp `stage.css`. */
export const CHAM_MS = 120;
/** Khách gõ "nhảy": được nhảy thêm ngần này — đúng `FLOOR_MS` của bản cũ. */
export const KHACH_NHAY_MS = 30_000;
/** Mỗi khách phải chờ ngần này mới gọi lên sàn lại được (`FLOOR_USER_GAP_MS`). */
export const KHACH_CHO_MS = 90_000;

/** `len`: đang chạy lên sàn · `nhay`: đang nhảy · `xuong`: nhảy xong, chạy xuống. */
export type Dang = 'len' | 'nhay' | 'xuong';

export interface NguoiSan {
  /** Chỉ số chỗ đứng. Vừa là key lúc vẽ, vừa quyết chỗ và kiểu nhân vật. */
  cho: number;
  x: number;
  chan: number;
  co: number;
  kieu: number;
  dang: Dang;
  /** Tên khách đứng ở chỗ này (gõ "nhảy"), hiện trên đầu. Không có là người
   *  nhảy minh hoạ của màn quà. */
  ten?: string;
  /** Mốc bắt đầu chặng hiện tại. Phần vẽ lùi hoạt ảnh về đúng quãng đã chạy,
   *  nhờ vậy hai cửa sổ cùng xem một phòng thấy họ cùng nhịp. */
  tu: number;
}

export interface State {
  config: Config;
  /** Mốc bắt đầu chạy lên, và mốc hết nhảy. `nhayDen` bằng 0 là chưa có màn
   *  nào. Hết nhảy thì còn `XUONG_MS` chạy xuống rồi sàn trống. */
  nhayTu: number;
  nhayDen: number;
  nguoi: NguoiSan[];
  /** Khách đã gõ "nhảy" trong màn này, theo thứ tự lên — người thứ i đứng chỗ i. */
  khach: { user: string; ten: string }[];
  /** Lần cuối mỗi khách được gọi lên, để giãn cách `KHACH_CHO_MS`. */
  lanGoi: Record<string, number>;
}

/** Cả nhóm đang ở chặng nào lúc `now`, hoặc `null` khi sàn trống. Thuần theo
 *  đồng hồ: hai cửa sổ mở cách nhau nửa tiếng vẫn thấy cùng một chặng. */
export function chang(
  now: number,
  nhayTu: number,
  nhayDen: number,
): { dang: Dang; tu: number } | null {
  if (nhayDen <= 0 || now < nhayTu) return null;
  if (now < nhayTu + LEN_MS) return { dang: 'len', tu: nhayTu };
  if (now < nhayDen) return { dang: 'nhay', tu: nhayTu + LEN_MS };
  if (now < nhayDen + XUONG_MS) return { dang: 'xuong', tu: nhayDen };
  return null;
}

/** Cả sàn tại thời điểm `now`. Không có màn nào thì sàn trống — như bản cũ,
 *  người chỉ lên sàn khi có quà. */
export function xepSan(
  config: Config,
  now: number,
  nhayTu: number,
  nhayDen: number,
  khach: readonly { ten: string }[] = [],
): NguoiSan[] {
  const c = chang(now, nhayTu, nhayDen);
  if (c === null) return [];
  const n = Math.min(Math.max(config.count, 0), TOI_DA);
  return Array.from({ length: n }, (_, i) => {
    const cho = CHO_DUNG[i] as (typeof CHO_DUNG)[number];
    const k = khach[i];
    return { cho: i, ...cho, kieu: KIEU[i] as number, ...c, ...(k === undefined ? {} : { ten: k.ten }) };
  });
}

/** Khách gõ "nhảy" (máy chủ đã đọc lệnh, `item.lenh`): chibi của họ lên sàn,
 *  tên hiện trên đầu, nhảy thêm `KHACH_NHAY_MS`. Như bản cũ: mỗi người chờ
 *  `KHACH_CHO_MS` mới gọi lại được; sàn hết chỗ thì thôi, không chen ai xuống.
 *  Nhân vật ảo gõ thì không tính — chỗ trên sàn là của khách thật. */
export function khachGoiNhay(state: State, item: FeedItem, now: number): Effect[] {
  if (item.lenh?.loai !== 'nhay' || item.virtual === true) return [];
  const user = item.user ?? item.name;
  if (user === '' || state.khach.some((k) => k.user === user)) return [];
  if (now - (state.lanGoi[user] ?? -Infinity) < KHACH_CHO_MS) return [];
  if (state.khach.length >= Math.min(state.config.count, TOI_DA)) return [];
  state.lanGoi[user] = now;
  state.khach.push({ user, ten: item.name });
  return moMan(state, now, KHACH_NHAY_MS);
}

/** Có quà (hay bấm "Nhảy ngay"):
 *  - sàn trống → cả nhóm chạy lên rồi nhảy;
 *  - đang chạy lên hoặc đang nhảy → nhảy thêm, khỏi xuống (quà nối tiếp);
 *  - đang chạy xuống → quay lại nhảy luôn, khỏi chạy lên lại từ đầu. */
export function moMan(state: State, now: number, dai = state.config.danceSec * 1_000): Effect[] {
  const c = chang(now, state.nhayTu, state.nhayDen);
  if (c === null) {
    state.nhayTu = now;
    state.nhayDen = now + LEN_MS + dai;
  } else if (c.dang === 'xuong') {
    state.nhayTu = now - LEN_MS;
    state.nhayDen = now + dai;
  } else {
    state.nhayDen = Math.max(state.nhayDen, now + dai);
  }
  state.nguoi = xepSan(state.config, now, state.nhayTu, state.nhayDen, state.khach);
  // Xin sáng slot sàn tới hết màn: khán giả hô "Tung hoa!" và thẻ MC tự ẩn
  // theo `useSlotSang('floor')`. Nối dài màn thì xin lại cho đủ hạn mới.
  return [{ kind: 'overlay', slot: 'floor', ttlMs: state.nhayDen - now }];
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, nhayTu: 0, nhayDen: 0, nguoi: [], khach: [], lanGoi: {} };
  },

  hooks: {
    comment: {
      run(state, item, ctx): Effect[] {
        return khachGoiNhay(state, item, ctx.now);
      },
    },
    gift: {
      run(state, _item, ctx): Effect[] {
        if (!state.config.danceOnGift) return [];
        return moMan(state, ctx.now);
      },
    },
  },

  // Người vận hành bấm "Nhảy ngay": như "Quà ảo: cho 3 chibi lên nhảy" của
  // bản cũ, không cần bật "nhảy khi có quà" — người bấm là người quyết.
  onAction(state, op, ctx) {
    if (op !== 'nhay') return [];
    return moMan(state, ctx.now);
  },

  onTick(state, now) {
    // Sàn trống thì người đã lên xong lượt: màn sau xếp khách lại từ đầu.
    if (chang(now, state.nhayTu, state.nhayDen) === null) state.khach = [];
    state.nguoi = xepSan(state.config, now, state.nhayTu, state.nhayDen, state.khach);
    return [];
  },

  onConfig(state, config) {
    const cu = state.config;
    state.config = config;

    if (!config.danceOnGift) {
      // Tắt giữa lúc đang nhảy: dừng ngay. Bấm tắt mà sàn còn nhún thêm hai
      // phút thì người vận hành tưởng nút hỏng.
      state.nhayTu = 0;
      state.nhayDen = 0;
      state.nguoi = [];
      state.khach = [];
    } else if (state.nhayDen > 0 && config.danceSec !== cu.danceSec) {
      // Đổi thời lượng giữa chừng: tính lại hạn của chính màn đang chạy, không
      // thì màn này chạy nốt theo số cũ rồi mới nghe lời.
      state.nhayDen = state.nhayTu + LEN_MS + config.danceSec * 1_000;
    }

    // Bớt người thì bỏ ngay. Thêm người thì nhịp sau (≤ 250 ms) họ có mặt —
    // `onConfig` không có `now` nên chưa dựng nổi chặng đúng mốc.
    if (state.nguoi.length > config.count) state.nguoi = state.nguoi.slice(0, config.count);
    return state;
  },

  dispose(state) {
    state.nguoi = [];
    state.khach = [];
    state.nhayTu = 0;
    state.nhayDen = 0;
  },
};
