import type { Effect, ModuleCore } from '@live/contracts';
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

/** Mỗi ngần này làm một động tác nghỉ, giữ trong `NGHI_LAU_MS`.
 *  Lấy đúng `IDLE_EVERY_MS` của bản cũ. */
const NGHI_MOI_MS = 16_000;
const NGHI_LAU_MS = 3_200;
/** Người này lệch người kia ngần này: chia đều vòng 16 giây cho đủ số chỗ, nhờ
 *  vậy nhiều lắm là hai người cùng nghỉ một lúc, sàn luôn còn người đứng thẳng. */
const NGHI_LECH_MS = NGHI_MOI_MS / TOI_DA;

/** Quà dồn không cắt ngang màn đang nhảy: màn sau chờ hết màn trước + ngần này.
 *  Bản cũ gộp hai số thành `DANCE_GAP_MS`; tách ra vì thời lượng nhảy giờ là
 *  cấu hình, người vận hành đổi nó thì quãng nghỉ không việc gì phải đổi theo. */
const NGHI_GIUA_MAN_MS = 20_000;

export type Dang = 'dung' | 'nghi' | 'nhay';

export interface NguoiSan {
  /** Chỉ số chỗ đứng. Vừa là key lúc vẽ, vừa quyết chỗ và kiểu nhân vật. */
  cho: number;
  x: number;
  chan: number;
  co: number;
  kieu: number;
  dang: Dang;
  /** Mốc bắt đầu động tác hiện tại. Phần vẽ lùi hoạt ảnh về đúng quãng đã
   *  chạy, nhờ vậy hai cửa sổ cùng xem một phòng thấy họ nhún cùng nhịp. */
  tu: number;
}

export interface State {
  config: Config;
  /** Mốc bắt đầu và kết thúc màn nhảy. `nhayDen` bằng 0 là chưa có màn nào. */
  nhayTu: number;
  nhayDen: number;
  nguoi: NguoiSan[];
}

/** Động tác của người ở chỗ thứ `i` tại thời điểm `now`.
 *
 *  Thuần theo `now`: không giữ bộ đếm riêng, không gọi `rand`. Hai cửa sổ mở
 *  cách nhau nửa tiếng vẫn thấy cùng một người đang cúi chào. */
export function dangCua(
  i: number,
  now: number,
  nhayTu: number,
  nhayDen: number,
): { dang: Dang; tu: number } {
  if (nhayDen > now) return { dang: 'nhay', tu: nhayTu };
  const lech = i * NGHI_LECH_MS;
  const moc = Math.floor((now + lech) / NGHI_MOI_MS) * NGHI_MOI_MS - lech;
  return now - moc < NGHI_LAU_MS ? { dang: 'nghi', tu: moc } : { dang: 'dung', tu: 0 };
}

/** Cả sàn tại thời điểm `now`. */
export function xepSan(config: Config, now: number, nhayTu: number, nhayDen: number): NguoiSan[] {
  const n = Math.min(Math.max(config.count, 0), TOI_DA);
  return Array.from({ length: n }, (_, i) => {
    const cho = CHO_DUNG[i] as (typeof CHO_DUNG)[number];
    return { cho: i, ...cho, kieu: KIEU[i] as number, ...dangCua(i, now, nhayTu, nhayDen) };
  });
}

/** Mở một màn nhảy từ `now`. */
function batDauNhay(state: State, now: number): Effect[] {
  state.nhayTu = now;
  state.nhayDen = now + state.config.danceSec * 1_000;
  state.nguoi = xepSan(state.config, now, state.nhayTu, state.nhayDen);
  // Xin sáng slot sàn suốt màn nhảy: thiết kế nào muốn hắt thêm đèn xuống sàn,
  // hay cho khán giả hô "Tung hoa!", thì đọc `useSlotSang('floor')`.
  return [{ kind: 'overlay', slot: 'floor', ttlMs: state.config.danceSec * 1_000 }];
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, nhayTu: 0, nhayDen: 0, nguoi: xepSan(config, 0, 0, 0) };
  },

  hooks: {
    gift: {
      run(state, _item, ctx): Effect[] {
        if (!state.config.danceOnGift) return [];
        // Quà dồn thì bỏ qua: cắt ngang màn đang nhảy để bắt đầu lại từ đầu
        // chỉ làm cả nhóm giật về tư thế cũ giữa chừng.
        if (state.nhayDen > 0 && ctx.now < state.nhayDen + NGHI_GIUA_MAN_MS) return [];

        return batDauNhay(state, ctx.now);
      },
    },
  },

  // Người vận hành bấm "Nhảy ngay": như "Quà ảo: cho 3 chibi lên nhảy" của
  // bản cũ. Không chờ quãng nghỉ giữa hai màn và không cần bật "nhảy khi có
  // quà" — người bấm là người quyết.
  onAction(state, op, ctx) {
    if (op !== 'nhay') return [];
    return batDauNhay(state, ctx.now);
  },

  onTick(state, now) {
    state.nguoi = xepSan(state.config, now, state.nhayTu, state.nhayDen);
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
      state.nguoi = state.nguoi.map((n) =>
        n.dang === 'nhay' ? { ...n, dang: 'dung', tu: 0 } : n,
      );
    } else if (state.nhayDen > 0 && config.danceSec !== cu.danceSec) {
      // Đổi thời lượng giữa chừng: tính lại hạn của chính màn đang chạy, không
      // thì màn này chạy nốt theo số cũ rồi mới nghe lời.
      state.nhayDen = state.nhayTu + config.danceSec * 1_000;
    }

    // Bớt người thì bỏ ngay. Thêm người thì nhịp sau (≤ 250 ms) họ có mặt —
    // `onConfig` không có `now` nên chưa dựng nổi động tác đúng mốc.
    if (state.nguoi.length > config.count) state.nguoi = state.nguoi.slice(0, config.count);
    return state;
  },

  dispose(state) {
    state.nguoi = [];
    state.nhayTu = 0;
    state.nhayDen = 0;
  },
};
