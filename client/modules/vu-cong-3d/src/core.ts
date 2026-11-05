import type { Effect, ModuleCore } from '@live/contracts';
import type { Config } from './manifest';

/** Các bộ trang phục có trong `assets/model-1.glb`, đúng thứ tự `extras.outfits` của xương.
 *
 *  Id phải khớp từng chữ với GLB — GLB dựng bằng `rig_base --outfits` từ
 *  `D:\Assets\parts\trang-phuc\model-1.json` (docs/phong/san-bar/nhan-vat/05-mo-rong.md).
 *  Thêm bộ = dựng lại GLB rồi thêm một dòng ở đây + ảnh `assets/thumbs/<id>.webp`. */
export const TRANG_PHUC = [
  { id: 'ao-thun-short', ten: 'Áo thun + short jeans' },
  { id: 'ao-thun-jeans', ten: 'Áo thun + quần jeans' },
  { id: 'the-thao', ten: 'Đồ thể thao' },
  { id: 'cong-so', ten: 'Sơ mi + chân váy' },
  { id: 'bikini', ten: 'Bikini đỏ' },
] as const;

export type TrangPhucId = (typeof TRANG_PHUC)[number]['id'];

/** Nhóm điệu, theo bảng ở docs/phong/san-bar/nhan-vat/04-dieu-nhay.md §2. */
export const NHOM_DIEU = {
  'hip-hop': 'Hip hop',
  latin: 'Latin, múa',
  trend: 'Vui, trend',
  retro: 'Retro, swing',
  breakdance: 'Breakdance',
  thriller: 'Thriller',
  'du-day': 'Đu dây',
} as const;

/** Một điệu trong GLB. `ten` là tên animation, khớp từng chữ với tên file FBX trong kho.
 *  `noi`: đoạn nối ngắn (Start, End, To Idle…) để ghép chuỗi, phát lặp một mình trông cụt.
 *  `daoCu`: cần đạo cụ (dây) mà phòng không có — tay túm khoảng không. Hai loại này vẫn
 *  chọn tay được, nhưng không vào vòng tự đổi điệu. */
interface Dieu {
  ten: string;
  nhom: keyof typeof NHOM_DIEU;
  noi?: true;
  daoCu?: true;
}

const d = (nhom: Dieu['nhom'], ...ten: string[]): Dieu[] => ten.map((t) => ({ ten: t, nhom }));
const noi = (nhom: Dieu['nhom'], ...ten: string[]): Dieu[] =>
  ten.map((t) => ({ ten: t, nhom, noi: true }));

/** Mọi điệu trong `assets/model-1.glb` (77 điệu — GLB dựng bằng `rig_base` không ghi tên
 *  điệu, tức lấy cả kho). Thêm điệu = dựng lại GLB rồi thêm tên vào đúng nhóm ở đây. */
export const KHO_DIEU: readonly Dieu[] = [
  ...d(
    'hip-hop',
    'Hip Hop Dancing',
    'Wave Hip Hop Dance',
    'Arms Hip Hop Dance',
    'Booty Hip Hop Dance',
    'Locking Hip Hop Dance',
    'Robot Hip Hop Dance',
    'Slide Hip Hop Dance',
    'Slide Hip Hop Walk',
    'Snake Hip Hop Dance',
    'Tut Hip Hop Dance',
    'Dancing Running Man',
    'Shuffling',
    'House Dancing',
  ),
  ...d(
    'latin',
    'Samba Dancing',
    'Salsa Dancing',
    'Belly Dance',
    'Bellydancing',
    'Rumba Dancing',
    'Butterfly Twirl',
  ),
  ...d(
    'trend',
    'Gangnam Style',
    'Macarena Dance',
    'Ymca Dance',
    'Chicken Dance',
    'Hokey Pokey',
    'Silly Dancing',
    'Shopping Cart Dance',
    'Dancing Twerk',
    'Dancing',
  ),
  ...d(
    'retro',
    'Twist Dance',
    'Moonwalk',
    'Northern Soul Dance',
    'Northern Soul Spin',
    'Northern Soul Spin Combo',
    'Northern Soul Floor Combo',
    'Northern Soul Floor Spin',
    'Swing Dancing',
    'Jazz Dancing',
    'Dancing Maraschino Step',
  ),
  ...d(
    'breakdance',
    'Bboy Hip Hop Move',
    'Bboy Uprock',
    'Breakdance 1990',
    'Breakdance Swipes',
    'Breakdance Uprock',
    'Breakdance Uprock Var 1',
    'Breakdance Uprock Var 2',
    'Breakdance Footwork 1',
    'Breakdance Footwork 2',
    'Breakdance Footwork 3',
    'Breakdance Freezes',
    'Breakdance Freeze Var 1',
    'Breakdance Freeze Var 2',
    'Breakdance Freeze Var 3',
    'Breakdance Freeze Var 4',
    'Crossleg Freeze',
    'Flair',
    'Head Spinning',
  ),
  ...noi(
    'breakdance',
    'Bboy Uprock Start',
    'Breakdance Ready',
    'Breakdance Uprock To Ground',
    'Breakdance Uprock Var 1 Start',
    'Breakdance Uprock Var 1 End',
    'Breakdance Footwork To Freeze',
    'Breakdance Footwork To Idle',
    'Breakdance Ending 1',
    'Breakdance Ending 2',
    'Breakdance Ending 3',
    'Headspin Start',
    'Headspin End',
  ),
  ...d('thriller', 'Thriller Part 1', 'Thriller Part 2', 'Thriller Part 3', 'Thriller Part 4'),
  ...noi('thriller', 'Thriller Idle'),
  ...['Rope Swinging', 'Start Swinging', 'Swinging', 'Run And Swing'].map((ten): Dieu => ({
    ten,
    nhom: 'du-day',
    daoCu: true,
  })),
];

/** Tên mọi điệu chọn tay được. */
export const DIEU: readonly string[] = KHO_DIEU.map((x) => x.ten);

/** Các điệu vào vòng tự đổi: đồng diễn "ngẫu nhiên" và lúc vũ công nhảy tự do. Bỏ đoạn nối
 *  và điệu cần đạo cụ. Thứ tự: hip hop, latin, trend trước — hợp sàn bar nhất. */
export const DIEU_LUAN_PHIEN: readonly string[] = KHO_DIEU.filter(
  (x) => x.noi !== true && x.daoCu !== true,
).map((x) => x.ten);

/** Nhãn điệu cho ô chọn: nhóm trước, ghi chú nếu là đoạn nối hay cần đạo cụ. */
export function nhanDieu(x: Dieu): string {
  const ghi = x.noi === true ? ' (đoạn nối)' : x.daoCu === true ? ' (cần dây)' : '';
  return `${NHOM_DIEU[x.nhom]} · ${x.ten}${ghi}`;
}

/** Giá trị ô "Điệu" nghĩa là bốc ngẫu nhiên trong `DIEU_LUAN_PHIEN`, đổi điệu mỗi
 *  `doiDieuGiay`. Giá trị lạ (vd `lan-luot` của bản cũ) cũng hiểu là ngẫu nhiên. */
export const NGAU_NHIEN = 'ngau-nhien';

/** Điệu phát thật chậm lúc nghỉ — thành nhún nhẹ tại chỗ. GLB không có điệu đứng nghỉ. */
export const DIEU_NGHI = 'Hip Hop Dancing';

/** Những người có thể có mặt trong phòng, theo đúng các chỗ đứng mà thiết kế sàn bar
 *  dựng (hợp đồng `VuCong3D.an`): ba vũ công trên sàn từ trái sang phải, DJ sau quầy,
 *  người nhảy trên màn chiếu. */
export const NHAN_VAT = [
  { id: 'vu-cong-2', ten: 'Chính (giữa)' },
  { id: 'vu-cong-1', ten: 'Bên trái' },
  { id: 'vu-cong-3', ten: 'Bên phải' },
  { id: 'dj', ten: 'DJ' },
  { id: 'man-chieu', ten: 'Màn chiếu' },
] as const;

/** Giá trị ô "Bộ đồ" của một nhân vật nghĩa là mặc đúng bộ cả nhóm đang mặc. */
export const THEO_NHOM = '';

/** Nút trên thẻ (`manifest.actions`) — đúng các `op` mà `onAction` nhận. */
export const NUT = { nhay: 'nhay', thoi: 'thoi' } as const;

export const MODEL = 'model-1.glb';

/** Nhân vật trong MODEL: id thân (tủ đồ của nó ở `assets/tu-do/<id>/`) và tuổi. Phòng sàn bar chỉ dựng nhân vật người
 *  lớn — đổi sang một model khác không phải người lớn thì phần vẽ không dựng gì (chính sách TikTok). */
export const NHAN_VAT_MAU = { than: 'model-1', tuoi: 'nguoi-lon' } as const;

const LA_BO = new Set<string>(TRANG_PHUC.map((t) => t.id));

export interface State {
  config: Config;
  /** Bộ đang mặc. Luôn là một id có trong `TRANG_PHUC` — GLB không có "không mặc gì". */
  bo: string;
  /** Mốc đổi bộ gần nhất; 0 = chưa có nhịp nào (đồng hồ chưa chạy). */
  boTu: number;
  /** Đồng diễn đang chạy: mọi vũ công cùng một điệu tới `den` (`null` = tới khi bấm
   *  "Thôi nhảy"). `tu` là lúc vào điệu này, để chế độ ngẫu nhiên biết khi nào đổi. */
  dongDien: { dieu: string; den: number | null; tu: number } | null;
  /** Người vận hành đã bấm "Thôi nhảy": hết đồng diễn thì đứng nhún nhẹ, không nhảy tự do. */
  nghi: boolean;
}

/** Các bộ được phép mặc theo cấu hình, đúng thứ tự `TRANG_PHUC`. */
export function boBat(config: Config): string[] {
  return TRANG_PHUC.map((t) => t.id).filter((id) => config.boBat.includes(id));
}

/** Bộ hợp lệ gần nhất với `muon`: chính nó nếu có trong GLB, không thì bộ bật đầu tiên,
 *  không có bộ nào bật thì bộ đầu tiên của GLB. Không bao giờ trả về id lạ. */
export function boHopLe(muon: string, config: Config): string {
  if (LA_BO.has(muon)) return muon;
  return boBat(config)[0] ?? TRANG_PHUC[0].id;
}

/** Bộ kế tiếp trong các bộ đang bật. Bộ đang mặc không nằm trong số bật (người vận hành
 *  vừa tắt nó) thì lấy bộ bật đầu tiên. Chỉ bật một bộ hoặc không bộ nào thì đứng yên. */
export function boKe(hienTai: string, config: Config): string {
  const ds = boBat(config);
  if (ds.length === 0) return hienTai;
  const i = ds.indexOf(hienTai);
  return ds[(i + 1) % ds.length] as string;
}

function doiBo(state: State, now: number): void {
  state.bo = boKe(state.bo, state.config);
  state.boTu = now;
}

/** Đang chọn một điệu cố định, hay ngẫu nhiên. */
function dieuCoDinh(config: Config): string | null {
  return DIEU.includes(config.dieu) ? config.dieu : null;
}

/** Điệu cho màn đồng diễn mới, hoặc lượt đổi điệu kế tiếp: đúng điệu đã chọn, hoặc bốc
 *  ngẫu nhiên một điệu khác điệu đang nhảy. */
function dieuMoi(state: State, rand: () => number): string {
  const coDinh = dieuCoDinh(state.config);
  if (coDinh !== null) return coDinh;
  const dang = state.dongDien?.dieu;
  const ds = DIEU_LUAN_PHIEN.filter((x) => x !== dang);
  return ds[Math.floor(rand() * ds.length) % ds.length] as string;
}

/** Mở màn đồng diễn. `giay` null = nhảy tới khi bấm "Thôi nhảy". */
function batDauMan(state: State, now: number, rand: () => number, giay: number | null): void {
  state.dongDien = {
    dieu: dieuMoi(state, rand),
    den: giay === null ? null : now + giay * 1_000,
    tu: now,
  };
}

export const core: ModuleCore<Config, State> = {
  init(config) {
    return { config, bo: boHopLe(config.boDangMac, config), boTu: 0, dongDien: null, nghi: false };
  },

  hooks: {
    gift: {
      run(state, _item, ctx): Effect[] {
        if (state.config.doiDoKhiCoQua) doiBo(state, ctx.now);
        if (state.config.dongDienKhiCoQua) {
          // Quà dồn khi đang đồng diễn: kéo dài màn đang nhảy, không nhảy sang điệu khác
          // giữa chừng — đổi điệu liên tục trông như giật hình. Màn người vận hành bấm
          // (không hẹn giờ) thì quà không đụng vào.
          const dd = state.dongDien;
          if (dd !== null) {
            if (dd.den !== null) dd.den = Math.max(dd.den, ctx.now + state.config.dongDienGiay * 1_000);
          } else {
            batDauMan(state, ctx.now, ctx.rand, state.config.dongDienGiay);
          }
        }
        return [];
      },
    },
  },

  onTick(state, now, ctx) {
    if (state.boTu === 0) state.boTu = now;
    const phut = state.config.doiDoPhut;
    if (phut > 0 && now - state.boTu >= phut * 60_000) doiBo(state, now);
    const dd = state.dongDien;
    if (dd !== null && dd.den !== null && now >= dd.den) state.dongDien = null;
    else if (
      dd !== null &&
      dieuCoDinh(state.config) === null &&
      now - dd.tu >= state.config.doiDieuGiay * 1_000
    ) {
      dd.dieu = dieuMoi(state, ctx.rand);
      dd.tu = now;
    }
    return [];
  },

  // Người vận hành bấm nút trên thẻ. "Nhảy ngay": cả nhóm vào nhảy và nhảy mãi tới khi
  // bấm "Thôi nhảy" (bấm lại giữa chừng là sang điệu khác). "Thôi nhảy": dừng, đứng nhún
  // nhẹ. Không phụ thuộc công tắc "có quà thì đồng diễn": công tắc đó nói về quà, nút là
  // người vận hành tự quyết.
  onAction(state, op, ctx) {
    if (op === NUT.nhay) {
      state.nghi = false;
      batDauMan(state, ctx.now, ctx.rand, null);
    } else if (op === NUT.thoi) {
      state.nghi = true;
      state.dongDien = null;
    }
    return [];
  },

  trangThaiNut(state, now) {
    const dd = state.dongDien;
    if (dd !== null) {
      const con = dd.den === null ? '' : ` · còn ${Math.max(0, Math.ceil((dd.den - now) / 1_000))}s`;
      return { bat: NUT.nhay, chu: `Đang nhảy: ${dd.dieu}${con}` };
    }
    if (state.nghi) return { bat: NUT.thoi, chu: 'Đang nghỉ — đứng nhún nhẹ' };
    return { bat: null, chu: 'Nhảy tự do — mỗi người một điệu' };
  },

  onConfig(state, config) {
    const truoc = state.config;
    state.config = config;
    // Người vận hành chọn bộ khác: mặc ngay, tính lại giờ tự đổi từ lúc này.
    if (config.boDangMac !== truoc.boDangMac) {
      state.bo = boHopLe(config.boDangMac, config);
      state.boTu = 0;
    } else if (
      !config.boBat.includes(state.bo) &&
      boBat(config).length > 0 &&
      (config.doiDoKhiCoQua || config.doiDoPhut > 0)
    ) {
      // Tắt đúng bộ đang mặc giữa lúc phòng đang tự đổi đồ: sang bộ bật kế tiếp.
      state.bo = boKe(state.bo, config);
      state.boTu = 0;
    }
    // Vừa tắt đồng diễn khi có quà: dừng màn đang nhảy. Chỉ lúc công tắc vừa chuyển sang tắt —
    // không thì sửa ô khác lúc công tắc đang tắt sẽ cắt ngang màn người vận hành vừa bấm.
    // Màn người vận hành bấm (không hẹn giờ) thì để yên — tắt nó là việc của nút "Thôi nhảy".
    if (truoc.dongDienKhiCoQua && !config.dongDienKhiCoQua && state.dongDien?.den !== null) {
      state.dongDien = null;
    }
    // Chọn một điệu cố định giữa màn: nhảy ngay điệu đó, giữ nguyên giờ hết màn.
    const coDinh = dieuCoDinh(config);
    if (state.dongDien !== null && config.dieu !== truoc.dieu && coDinh !== null) {
      state.dongDien.dieu = coDinh;
    }
    return state;
  },
};
