/** Thế giới Sơn Hà Tiên Lộ — chỉ dữ liệu, không logic. Đổi bối cảnh là đổi file này. */

export type Phe = 'son' | 'thuy';

export interface ThongTinPhe {
  id: Phe;
  ten: string;
  tenNgan: string;
  chu: string;
  khauHieu: string;
  /** Màu chính và màu sáng, dùng cho cả cảnh lẫn chữ. */
  mau: string;
  mauSang: string;
}

export const PHE: Record<Phe, ThongTinPhe> = {
  son: {
    id: 'son',
    ten: 'Sơn Tông Núi Thánh',
    tenNgan: 'Sơn Tông',
    chu: 'Sơn Tinh',
    khauHieu: 'Nước dâng bao nhiêu, núi cao bấy nhiêu',
    mau: '#3f8f5a',
    mauSang: '#f2c94c',
  },
  thuy: {
    id: 'thuy',
    ten: 'Thủy Tông Long Cung',
    tenNgan: 'Thủy Tông',
    chu: 'Thủy Tinh',
    khauHieu: 'Nước chảy đá mòn',
    mau: '#1f6fb2',
    mauSang: '#5ee0e6',
  },
};

export interface CanhGioi {
  ten: string;
  /** Linh khí tích luỹ cần để vào cảnh giới này. */
  can: number;
  /** Số hộ pháp đủ để chắc chắn qua kiếp (thiếu thì trông vào vận, `KIEP_TU`). 0 là không cần độ kiếp. */
  hoPhap: number;
  /** Màu hào quang. */
  hao: string;
}

export const CANH_GIOI: readonly CanhGioi[] = [
  { ten: 'Phàm Nhân', can: 0, hoPhap: 0, hao: '#c9c2b8' },
  { ten: 'Luyện Khí', can: 30, hoPhap: 0, hao: '#9ad17a' },
  { ten: 'Trúc Cơ', can: 90, hoPhap: 0, hao: '#4fc3a1' },
  { ten: 'Kết Đan', can: 200, hoPhap: 0, hao: '#58a6ff' },
  { ten: 'Nguyên Anh', can: 360, hoPhap: 3, hao: '#8f7bff' },
  { ten: 'Hóa Thần', can: 600, hoPhap: 4, hao: '#c86bff' },
  { ten: 'Luyện Hư', can: 950, hoPhap: 5, hao: '#ff6bb5' },
  { ten: 'Đại Thừa', can: 1450, hoPhap: 6, hao: '#ff8a4c' },
  { ten: 'Chân Tiên', can: 2150, hoPhap: 7, hao: '#ffd24c' },
  { ten: 'Bất Tử', can: 3100, hoPhap: 8, hao: '#fff6c8' },
];

/** Chức vụ trong môn phái theo cảnh giới — cảnh giới càng cao, chức càng lớn, ngồi càng cao.
 *  Sơn Tông là môn phái tu tiên trên núi Tản; Thủy Tông là triều đình dưới nước của Long Cung,
 *  nên chức mang tên quan võ đáy biển. Mỗi cấp một dòng, khớp CANH_GIOI. */
export const CHUC_VU: Record<Phe, readonly string[]> = {
  son: [
    'Tạp dịch',
    'Ngoại môn',
    'Nội môn',
    'Chân truyền',
    'Chấp sự',
    'Trưởng lão',
    'Đại trưởng lão',
    'Hộ sơn tôn giả',
    'Thái thượng',
    'Lão tổ',
  ],
  thuy: [
    'Thủy dịch',
    'Thủy binh',
    'Thủy vệ',
    'Đô thống',
    'Tuần hải sứ',
    'Thủy tướng',
    'Thừa tướng',
    'Trấn hải tôn giả',
    'Thái thượng',
    'Lão tổ',
  ],
};

export function chucVu(phe: Phe, canh: number): string {
  const ds = CHUC_VU[phe];
  return ds[Math.max(0, Math.min(ds.length - 1, canh))]!;
}

/** Bậc chức để vẽ ghế: 0 đệ tử (dưới Nguyên Anh), 1 chấp sự, 2 trưởng lão, 3 tôn giả trở lên. */
export function bacChuc(canh: number): 0 | 1 | 2 | 3 {
  return canh >= 7 ? 3 : canh >= 5 ? 2 : canh >= 4 ? 1 : 0;
}

/** Chiêu thức Đại Chiến theo phe và bậc cảnh giới (mỗi hai cảnh một chiêu). Lấy từ phép của hai
 *  thần trong truyền thuyết: Sơn Tinh bốc đồi dời núi, Thủy Tinh hô mưa gọi gió dâng nước. */
export const CHIEU: Record<Phe, readonly string[]> = {
  son: ['Ném Đá', 'Bốc Đồi', 'Dời Núi', 'Sơn Băng Địa Liệt', 'Tản Viên Thần Lực'],
  thuy: ['Té Nước', 'Hô Mưa', 'Gọi Gió', 'Băng Phong Vạn Lý', 'Thủy Long Ngâm'],
};

export const chieuCua = (phe: Phe, canh: number) => CHIEU[phe][Math.max(0, Math.min(4, Math.floor(canh / 2)))]!;

/** Danh hiệu ba hàng đỉnh kim tự tháp mỗi phe. Hàng 1: người đứng đầu phe. Hàng 2: Tả, Hữu Hộ Pháp
 *  (trái, phải). Hàng 3, bốn trụ cột, đọc từ trái sang: Sơn Tông là Tứ Trấn giữ bốn mặt núi Ba Vì;
 *  Thủy Tông là Tứ Tuần canh bốn thủy vực sông, hồ, đầm, biển. */
export const DANH_HIEU: Record<Phe, { dau: string; hoPhap: readonly [string, string]; truCot: readonly string[] }> = {
  son: { dau: 'Chưởng Môn', hoPhap: ['Tả Hộ Pháp', 'Hữu Hộ Pháp'], truCot: ['Trấn Đông', 'Trấn Tây', 'Trấn Nam', 'Trấn Bắc'] },
  thuy: { dau: 'Long Soái', hoPhap: ['Tả Hộ Pháp', 'Hữu Hộ Pháp'], truCot: ['Tuần Giang', 'Tuần Hồ', 'Tuần Đầm', 'Tuần Hải'] },
};

/** Danh hiệu theo thứ hạng trong phe (0 là đứng đầu); ngoài ba hàng đỉnh tháp thì không có. Hạng 1
 *  ngồi bên trái hàng hai, hạng 2 bên phải; hạng 3–6 ngồi hàng ba từ trái sang. */
export function danhHieu(phe: Phe, hang: number): { chu: string; bac: 1 | 2 | 3 } | null {
  const d = DANH_HIEU[phe];
  if (hang === 0) return { chu: d.dau, bac: 1 };
  if (hang <= 2) return { chu: d.hoPhap[hang - 1]!, bac: 2 };
  if (hang <= 6) return { chu: d.truCot[hang - 3]!, bac: 3 };
  return null;
}

/** Danh hiệu lúc PK / đánh yêu. PK: đỉnh tháp là Chủ Tướng (người ra trận chính của phe); đánh yêu:
 *  người sát thương cao nhất là Tiên Phong. */
export function danhHieuChien(hang: number, pk = false): { chu: string; bac: 1 | 2 | 3 } | null {
  if (hang === 0) return { chu: pk ? 'Chủ Tướng' : 'Tiên Phong', bac: 1 };
  if (hang === 1) return { chu: 'Tả Tướng', bac: 2 };
  if (hang === 2) return { chu: 'Hữu Tướng', bac: 2 };
  return null;
}

/** Bốn trận pháp của mỗi phe — cùng tác dụng, tên theo lore của phe (lệ Sơn Hà). */
export type Ky = 'hoi' | 'thu' | 'cong' | 'pha';
export const KY_DS: readonly Ky[] = ['hoi', 'thu', 'cong', 'pha'];
export const KY_LENH: Record<Ky, string> = { hoi: 'hồi', thu: 'thủ', cong: 'công', pha: 'phá' };
export const KY_HINH: Record<Ky, string> = { hoi: '💚', thu: '🛡', cong: '⚔', pha: '💥' };
export const TRAN_PHAP: Record<Phe, Record<Ky, string>> = {
  son: { hoi: 'Linh Chi Ba Vì', thu: 'Thạch Bích Hộ Sơn', cong: 'Trống Đồng Thúc Quân', pha: 'Rìu Đồng Phá Trận' },
  thuy: { hoi: 'Ngọc Trai Hồi Xuân', thu: 'Vảy Rồng Hộ Thể', cong: 'Tù Và Long Cung', pha: 'Thuồng Luồng Xé Giáp' },
};
/** Tác dụng ngắn gọn (hiện trên màn). */
export const KY_PK: Record<Ky, string> = {
  hoi: 'hồi trận khí',
  thu: 'đòn địch ×0,7',
  cong: 'đòn mình ×1,3',
  pha: 'phá khiên địch',
};
export const KY_YEU: Record<Ky, string> = {
  hoi: 'tỉnh choáng, miễn phản đòn',
  thu: 'đỡ phản đòn +30%',
  cong: 'sát thương ×1,3',
  pha: 'yêu tinh nhận ×1,2',
};

/** Căn cơ: mỗi đệ tử một căn cơ (tự chia khi nhập môn), ưu nhược riêng, bổ trợ nhau. */
export type CanCo = 'tuong' | 've' | 'y' | 'quan';
export const CAN_CO_DS: readonly CanCo[] = ['tuong', 've', 'y', 'quan'];
export const CAN_CO: Record<CanCo, { ten: string; hinh: string; ky: Ky; uu: string; nhuoc: string }> = {
  tuong: { ten: 'Chiến Tướng', hinh: '⚔', ky: 'cong', uu: 'đòn ×1,2 · hô "công" 2 phiếu · trả lời nhanh thưởng ×1,5', nhuoc: 'đỡ phản đòn −20%' },
  ve: { ten: 'Hộ Vệ', hinh: '🛡', ky: 'thu', uu: 'đỡ phản đòn +30% · hô "thủ" 2 phiếu · trả lời sai không mất chuỗi', nhuoc: 'đòn ×0,85' },
  y: { ten: 'Y Sư', hinh: '💚', ky: 'hoi', uu: 'hô "hồi" 2 phiếu, hồi mạnh thêm · độ kiếp hộ pháp tính 2', nhuoc: 'đòn ×0,85' },
  quan: { ten: 'Phá Quân', hinh: '🗡', ky: 'pha', uu: 'hô "phá" 2 phiếu · bạo kích 20% · tuyệt kỹ dễ ra · trả lời đúng Linh Mạch +2', nhuoc: 'đỡ phản đòn −20%' },
};

/** Trận tu luyện của phe lên cấp nhờ quà của môn đồ (lệ Sơn Hà). Mỗi cấp một tên; trận càng cao thì
 *  mỗi câu đáp đúng môn đồ càng được nhiều linh thạch, và cộng hưởng linh khí càng lớn. */
export const TRAN_TU: readonly { ten: string; can: number }[] = [
  { ten: 'Tụ Linh Trận', can: 0 },
  { ten: 'Lạc Điểu Trận', can: 100 },
  { ten: 'Đồng Cổ Trận', can: 300 },
  { ten: 'Thiên Phù Trận', can: 800 },
  { ten: 'Sơn Hà Đại Trận', can: 2000 },
];
/** Mốc xu để nhánh trận của một môn đồ lên cấp (1–4). Mỗi lần nhánh lên cấp đẩy thêm 20 trận lực cho trận phe. */
export const NHANH_MOC: readonly number[] = [10, 50, 200, 500];
export const NHANH_DAY = 20;

/** Võ công: mỗi căn cơ một môn (tên theo phe), 5 tầng, học bằng linh thạch. Mỗi môn hỗ trợ một kiểu
 *  khi PK và đánh yêu tinh (lệ Sơn Hà). */
export const VO_CONG: Record<CanCo, { ten: Record<Phe, string>; ta: string }> = {
  tuong: { ten: { son: 'Phá Sơn Phủ Pháp', thuy: 'Nộ Triều Thương Pháp' }, ta: 'đòn +8% mỗi tầng' },
  ve: { ten: { son: 'Thạch Bích Công', thuy: 'Long Lân Hộ Thể' }, ta: 'đỡ phản đòn +5% mỗi tầng, đòn +3%' },
  y: { ten: { son: 'Linh Chi Quyết', thuy: 'Hồi Xuân Thủy Pháp' }, ta: 'mỗi đòn tiếp sức hồi trận khí cho phe, đòn +3%' },
  quan: { ten: { son: 'Xuyên Vân Tiễn', thuy: 'Xé Sóng Đao' }, ta: 'bạo kích +3% mỗi tầng, đòn +5%' },
};
/** Giá linh thạch để lên từng tầng võ công (tầng 1 → 5). */
export const VO_GIA: readonly number[] = [30, 60, 120, 240, 480];
/** Tụ Khí Đan: 20 linh thạch một viên, luyện hoá được 25 linh khí. */
export const DAN_GIA = 20;
export const DAN_LK = 25;

/** Hệ số linh thạch (mốc neo: 1 xu quà = 1 linh thạch). Mọi nguồn và mọi giá phải quy về bảng này —
 *  xem docs/phong/tu-tien/ban-do.md §3b trước khi thêm nguồn hay món mới. */
export const THACH = {
  /** Quà: mỗi xu. */
  xu: 1,
  /** Đột phá: người đột phá được hệ số này × cảnh giới mới. */
  dotPha: 5,
  /** Đột phá: mỗi người đang online trong phòng được hệ số này × cảnh giới mới của người đột phá. */
  phong: 1,
  /** Tim trong một buổi: [số tim, linh thạch thưởng khi chạm mốc]. */
  timMoc: [
    [50, 2],
    [200, 5],
    [500, 10],
    [1000, 20],
  ] as readonly (readonly [number, number])[],
} as const;

export type Gioi = 'nam' | 'nu';

/** Trưởng lão NPC ngồi trận tu luyện khi phe chưa đủ 6 đệ tử thật — truyện bắt đầu được từ một người.
 *  Cao Sơn, Quý Minh là hai vị thánh em của Tản Viên trong tín ngưỡng Tam vị Đức Thánh Tản; các tên còn
 *  lại và cả dàn thủy tộc là lệ Sơn Hà. Cảnh giới dừng ở Đại Thừa: đệ tử thật vượt lên được. */
export interface Npc {
  id: string;
  ten: string;
  canh: number;
  gioi: Gioi;
  canCo: CanCo;
}
export const SO_NPC = 6;
export const NPC_TRUONG_LAO: Record<Phe, readonly Npc[]> = {
  son: [
    { id: 'npc_son_1', ten: 'Cao Sơn', canh: 7, gioi: 'nam', canCo: 'tuong' },
    { id: 'npc_son_2', ten: 'Quý Minh', canh: 7, gioi: 'nam', canCo: 've' },
    { id: 'npc_son_3', ten: 'Thạch Lão', canh: 6, gioi: 'nam', canCo: 've' },
    { id: 'npc_son_4', ten: 'Mộc Nương', canh: 6, gioi: 'nu', canCo: 'y' },
    { id: 'npc_son_5', ten: 'Vân Đồng', canh: 5, gioi: 'nam', canCo: 'quan' },
    { id: 'npc_son_6', ten: 'Lạc Sứ', canh: 5, gioi: 'nu', canCo: 'y' },
  ],
  thuy: [
    { id: 'npc_thuy_1', ten: 'Quy Lão', canh: 7, gioi: 'nam', canCo: 've' },
    { id: 'npc_thuy_2', ten: 'Lý Ngư Tướng', canh: 7, gioi: 'nam', canCo: 'tuong' },
    { id: 'npc_thuy_3', ten: 'Giao Nương', canh: 6, gioi: 'nu', canCo: 'quan' },
    { id: 'npc_thuy_4', ten: 'Bạng Nương', canh: 6, gioi: 'nu', canCo: 'y' },
    { id: 'npc_thuy_5', ten: 'Hải Mã Sứ', canh: 5, gioi: 'nam', canCo: 'quan' },
    { id: 'npc_thuy_6', ten: 'Thủy Vệ', canh: 5, gioi: 'nu', canCo: 've' },
  ],
};

/** Tranh đang có: phe Núi vẽ nam, phe Nước vẽ nữ. Chọn giới kia thì dùng tranh `<phe>-<giới>-c<cảnh>`
 *  (vẽ dần), chưa có thì tạm mượn tranh giới mặc định. */
export const GIOI_GOC: Record<Phe, Gioi> = { son: 'nam', thuy: 'nu' };

/** Các tranh thử lần lượt cho một nhân vật, tốt nhất trước. Khách (chưa nhập môn) là phàm nhân. */
/** Trang phục cơ bản (nhận lúc nhập môn) mặc tới hết Kết Đan; từ Nguyên Anh đổi sang áo cảnh giới. */
export const CANH_HET_AO = 4;

/** Tên bộ trang phục cơ bản theo phe (tranh `<nhân vật>-tp<1..5>`). */
export const TEN_AO: Record<Phe, readonly string[]> = {
  son: ['Sơn Dã Y', 'Hộ Sơn Giáp', 'Bạch Vân Bào', 'Hồng Hội Bào', 'Dạ Hành Y'],
  thuy: ['Ngư Gia Y', 'Ngân Lân Giáp', 'Bạch Châu Bào', 'San Hô Bào', 'Nguyệt Dạ Y'],
};

/** Đuôi tên tranh theo trang phục T1–T9 (chỉ số = mã T): T1–T5 bộ cơ bản `tp1`…`tp5`, T6–T9 pháp y cảnh giới. */
export const DUOI_AO = ['', 'tp1', 'tp2', 'tp3', 'tp4', 'tp5', 'c1', 'c4', 'c6', 'c9'] as const;
/** Tên nhân vật trong tên file tranh: giới gốc của phe là `son` / `thuy`, giới kia `son-nu` / `thuy-nam`. */
export const tenNv = (phe: Phe, gioi: Gioi | null) => ((gioi ?? GIOI_GOC[phe]) === GIOI_GOC[phe] ? phe : `${phe}-${gioi}`);
/** Dáng chiến (Đại Chiến) đúng trang phục đang mặc: `nhan-vat/chien-<nhân vật>-<đuôi áo>` (+ `-2` khung ra đòn).
 *  Chưa vẽ bộ đó thì nơi gọi lùi về dáng chiến chung `chien-<phe>-<giới>`. */
export const duongChienAo = (phe: Phe, gioi: Gioi | null, ao: number): string | null => {
  const d = DUOI_AO[ao];
  return d ? `nhan-vat/chien-${tenNv(phe, gioi)}-${d}` : null;
};

export function duongTranh(phe: Phe | null, gioi: Gioi | null, canh: number, ao = 0): string[] {
  if (phe === null) {
    const g = gioi ?? 'nam';
    return [`nhan-vat/khach-${g}.webp`, g === 'nam' ? 'nhan-vat/son-c0.webp' : 'nhan-vat/thuy-c0.webp'];
  }
  const g = gioi ?? GIOI_GOC[phe];
  const ra: string[] = [];
  const tran = Math.max(0, Math.min(9, canh));
  // Trang phục người chơi tự chọn (T1–T9) luôn được mặc: T1–T5 bộ cơ bản, T6–T9 pháp y cảnh giới.
  const duoiAo = DUOI_AO[ao];
  if (duoiAo) ra.push(`nhan-vat/${g === GIOI_GOC[phe] ? phe : `${phe}-${g}`}-${duoiAo}.webp`);
  if (g !== GIOI_GOC[phe]) for (let c = tran; c >= 0; c--) ra.push(`nhan-vat/${phe}-${g}-c${c}.webp`);
  for (let c = tran; c >= 0; c--) ra.push(`nhan-vat/${phe}-c${c}.webp`);
  return ra;
}

export type YeuId = 'ngu' | 'moc' | 'ho' | 'tam' | 'chan' | 'bang' | 'cop' | 'giai';

/** Chiêu lớn của yêu tinh — báo trước vài giây, phe gõ đúng số kịp thì đỡ được:
 *  `quet` đánh cả đội → 2 thủ · `choang` choáng / độc nhiều người → 3 hồi · `giap` yêu tinh khoác giáp → 4 phá ·
 *  `hut` yêu tinh hút máu hồi sức → 1 công. */
export type LoaiChieuYeu = 'quet' | 'choang' | 'giap' | 'hut';

export interface ChieuYeu {
  ten: string;
  loai: LoaiChieuYeu;
}

/** Số gõ để đỡ từng loại chiêu (khớp 1 công · 2 thủ · 3 hồi · 4 phá). */
export const SO_DO_CHIEU: Record<LoaiChieuYeu, '1' | '2' | '3' | '4'> = { hut: '1', quet: '2', choang: '3', giap: '4' };

export interface ThongTinYeu {
  id: YeuId;
  ten: string;
  /** Một dòng hiện dưới tên khi xuất thế. */
  loi: string;
  /** Phe đánh trúng mạnh hơn; `null` là không sợ ai. Theo Kinh Thư §1: Ngư Tinh chết vì sắt
   *  nung (núi), Hồ Tinh bị dâng nước phá hang (nước); Mộc Tinh truyền thuyết không nói. */
  khac: Phe | null;
  /** Tỉ lệ đòn trượt. */
  truot: number;
  /** Chiêu phản đòn đầu tiên (lệ Sơn Hà). */
  chieu: string;
  /** Các chiêu ra luân phiên mỗi lần phản đòn (chiêu đầu là `chieu`). */
  chieuDs: readonly string[];
  /** Ba chiêu lớn báo trước (gõ số đỡ), ra luân phiên. */
  chieuLon: readonly ChieuYeu[];
}

export const YEU: Record<YeuId, ThongTinYeu> = {
  ngu: {
    id: 'ngu',
    ten: 'Ngư Tinh Biển Đông',
    loi: 'Cá trăm năm nuốt thuyền — xưa chết vì khối sắt nung, nay vẫn sợ đá núi',
    khac: 'son',
    truot: 0,
    chieu: 'Sóng Dữ Biển Đông',
    chieuDs: ['Sóng Dữ Biển Đông', 'Vảy Thép Xoáy Nước', 'Ngư Long Phun Thủy'],
    chieuLon: [{ ten: 'Sóng Thần Nuốt Thuyền', loai: 'quet' }, { ten: 'Vảy Thép Hộ Thân', loai: 'giap' }, { ten: 'Xoáy Nước Hút Hồn', loai: 'hut' }],
  },
  ho: {
    id: 'ho',
    ten: 'Hồ Tinh Chín Đuôi',
    loi: 'Cáo chín đuôi đáy Hồ Tây — xưa bị dâng nước phá hang, nay vẫn sợ nước',
    khac: 'thuy',
    truot: 0,
    chieu: 'Mê Hồn Hồ Ly',
    chieuDs: ['Mê Hồn Hồ Ly', 'Cửu Vĩ Hồ Hỏa', 'Ảo Ảnh Chín Đuôi'],
    chieuLon: [{ ten: 'Mê Hồn Nhãn', loai: 'choang' }, { ten: 'Cửu Vĩ Hồ Hỏa', loai: 'quet' }, { ten: 'Hút Tinh Khí', loai: 'hut' }],
  },
  moc: {
    id: 'moc',
    ten: 'Mộc Tinh Rừng Già',
    loi: 'Cây chiên đàn nghìn năm thành tinh — rễ quấn chân, một phần đòn đánh trượt',
    khac: null,
    truot: 0.2,
    chieu: 'Rễ Cổ Quấn Chân',
    chieuDs: ['Rễ Cổ Quấn Chân', 'Lá Độc Cuốn Gió', 'Thân Gỗ Đè Núi'],
    chieuLon: [{ ten: 'Rễ Cổ Trói Chân', loai: 'choang' }, { ten: 'Vỏ Gỗ Nghìn Năm', loai: 'giap' }, { ten: 'Thân Gỗ Đè Núi', loai: 'quet' }],
  },
  tam: {
    id: 'tam',
    ten: 'Tam Yêu Hợp Thể',
    loi: 'Ba oán khí hợp làm một — không sợ ai, máu gấp ba',
    khac: null,
    truot: 0.1,
    chieu: 'Tam Yêu Loạn Kích',
    chieuDs: ['Tam Yêu Loạn Kích', 'Hắc Thủy Cuồng Lôi', 'Vạn Yêu Triều Bái'],
    chieuLon: [{ ten: 'Tam Yêu Loạn Kích', loai: 'quet' }, { ten: 'Vạn Yêu Hộ Thể', loai: 'giap' }, { ten: 'Hắc Thủy Hút Hồn', loai: 'hut' }],
  },

  chan: {
    id: 'chan',
    ten: 'Chằn Tinh Hang Núi',
    loi: 'Trăn khổng lồ ăn thịt người — xưa chết dưới lưỡi rìu Thạch Sanh, nay vẫn sợ rìu đồng Sơn Tông',
    khac: 'son',
    truot: 0,
    chieu: 'Quật Đuôi',
    chieuDs: ['Quật Đuôi', 'Nanh Độc', 'Siết Mồi'],
    chieuLon: [{ ten: 'Quật Đuôi Đổ Núi', loai: 'quet' }, { ten: 'Phun Độc Mù Trời', loai: 'choang' }, { ten: 'Lột Xác Hồi Sinh', loai: 'hut' }],
  },
  bang: {
    id: 'bang',
    ten: 'Đại Bàng Tinh',
    loi: 'Chim khổng lồ cắp người lên núi — bay cao, một phần đòn đánh hụt',
    khac: null,
    truot: 0.15,
    chieu: 'Vuốt Sắt',
    chieuDs: ['Vuốt Sắt', 'Mỏ Đồng Mổ', 'Cắp Người Bay'],
    chieuLon: [{ ten: 'Bão Cánh Cuốn Trời', loai: 'quet' }, { ten: 'Lông Sắt Hộ Thân', loai: 'giap' }, { ten: 'Tiếng Rít Xé Hồn', loai: 'choang' }],
  },
  cop: {
    id: 'cop',
    ten: 'Hổ Tinh Rừng Thiêng',
    loi: 'Ông Ba Mươi trăm tuổi thành tinh — hổ dữ sợ nước, Thủy Tông đánh đau',
    khac: 'thuy',
    truot: 0,
    chieu: 'Vồ Mồi',
    chieuDs: ['Vồ Mồi', 'Móng Hổ Xé Gió', 'Đuôi Sắt Quất'],
    chieuLon: [{ ten: 'Gầm Rung Núi Rừng', loai: 'choang' }, { ten: 'Hổ Uy Hộ Thể', loai: 'giap' }, { ten: 'Uống Máu Hồi Sức', loai: 'hut' }],
  },
  giai: {
    id: 'giai',
    ten: 'Giải Tinh Biển Sâu',
    loi: 'Cua khổng lồ mai đen như đá — đá núi đập vỡ mai, Sơn Tông đánh đau',
    khac: 'son',
    truot: 0,
    chieu: 'Càng Thép Kẹp',
    chieuDs: ['Càng Thép Kẹp', 'Bọt Độc', 'Mai Đá Húc'],
    chieuLon: [{ ten: 'Càng Thép Quét Ngang', loai: 'quet' }, { ten: 'Mai Đá Bất Hoại', loai: 'giap' }, { ten: 'Bọt Độc Mê Man', loai: 'choang' }],
  },
};

/** Yêu tinh thường bốc ngẫu nhiên (không trùng con vừa đánh); Tam Yêu chỉ ra ở sự kiện Đại Yêu Dạ. */
export const THU_TU_YEU: readonly YeuId[] = ['ngu', 'ho', 'moc', 'chan', 'bang', 'cop', 'giai'];

export interface LinhVat {
  id: string;
  ten: string;
  hinh: string;
  /** Thần của phe nào ban. Kinh Thư §4: chỉ nhận linh vật của phe mình. */
  phe: Phe;
}

export const LINH_VAT: readonly LinhVat[] = [
  { id: 'voi', ten: 'Voi Chín Ngà', hinh: '🐘', phe: 'son' },
  { id: 'ga', ten: 'Gà Chín Cựa', hinh: '🐓', phe: 'son' },
  { id: 'ngua', ten: 'Ngựa Chín Hồng Mao', hinh: '🐎', phe: 'son' },
  { id: 'lac', ten: 'Chim Lạc', hinh: '🕊️', phe: 'son' },
  { id: 'thuong', ten: 'Thuồng Luồng', hinh: '🐍', phe: 'thuy' },
  { id: 'chep', ten: 'Cá Chép Hóa Rồng', hinh: '🐟', phe: 'thuy' },
  { id: 'rua', ten: 'Rùa Thần', hinh: '🐢', phe: 'thuy' },
  { id: 'giao', ten: 'Giao Long', hinh: '🐉', phe: 'thuy' },
];

export type LoaiDacBiet =
  | 'dai-yeu'
  | 'dai-lu'
  | 'hoi-thi'
  | 'phuc-loc'
  | 'ai'
  | 'dia-cung'
  | 'pk'
  | 'cho'
  | 'loi-dai'
  | 'yeu-ngu'
  | 'yeu-ho'
  | 'yeu-moc';

export const DAC_BIET: Record<LoaiDacBiet, { ten: string; loi: string }> = {
  'dai-yeu': { ten: 'Đại Yêu Dạ', loi: 'Tam Yêu Hợp Thể — máu gấp ba, top 3 sát thương nhận linh vật' },
  'dai-lu': { ten: 'Đại Hồng Thủy', loi: 'Kéo co hai phút, thắng đẩy thế trận hai bậc' },
  'hoi-thi': { ten: 'Hội thi Ngọc Phả', loi: 'Tám câu khó liền, linh khí nhân đôi' },
  'phuc-loc': { ten: 'Giờ Linh Khí', loi: 'Mỵ Nương rải phúc — mười câu nhân đôi linh khí' },
  ai: { ten: 'Thử Thách Nhập Môn', loi: 'Mê cung cấp 1 — phàm nhân vượt ải để nhập tông' },
  'dia-cung': { ten: 'Tranh Đoạt Bảo Vật', loi: 'Mê cung cấp 2 — đệ tử giành bảo vật' },
  pk: { ten: 'Nước Dâng Đoạt Mị Nương', loi: 'Hai tông PK tới khi một bên cạn trận khí — quà ra chiêu' },
  cho: { ten: 'Thành Trì Tự Do', loi: 'Chợ chung hai tông: Đan Các bán đan dược, Tàng Kinh Các bán bí kíp' },
  'loi-dai': { ten: 'Tỉ Thí Lôi Đài', loi: 'Đồng môn so tài — lời khiêu chiến đã xếp hàng lên đài lần lượt' },
  'yeu-ngu': { ten: 'Ngư Tinh Biển Đông', loi: 'Yêu tinh xuất thế' },
  'yeu-ho': { ten: 'Hồ Tinh Chín Đuôi', loi: 'Yêu tinh xuất thế' },
  'yeu-moc': { ten: 'Mộc Tinh Rừng Già', loi: 'Yêu tinh xuất thế' },
};

/** Biểu tượng từng loại dòng lịch trình (bảng Lịch trình trên màn). */
export const HINH_LICH: Record<LoaiDacBiet, string> = {
  'dai-yeu': '👹',
  'dai-lu': '🌊',
  'hoi-thi': '📜',
  'phuc-loc': '✨',
  ai: '🚪',
  'dia-cung': '🏺',
  pk: '⚔️',
  cho: '🏯',
  'loi-dai': '🏆',
  'yeu-ngu': '👹',
  'yeu-ho': '👹',
  'yeu-moc': '👹',
};

/** Dòng sử thi. `{ten}` là người chơi, các khoá khác tuỳ việc. Nhiều câu cho một việc để
 *  dải chữ không lặp lại y nguyên cả buổi. */
export const SU_THI = {
  nhapSon: ['{ten} lên núi Tản bái sư.', '{ten} vác đá theo Sơn Tinh.', 'Sơn Tông có thêm {ten}, núi cao thêm một tấc.'],
  nhapThuy: ['{ten} xuống Long Cung nhận ấn rồng.', '{ten} theo sóng về Thủy Tông.', 'Thủy Tông đón {ten}, sóng vỗ ba lần chào.'],
  dotPha: ['{ten} đột phá {canh}! Linh khí cuồn cuộn.', '{ten} bước vào {canh}.', 'Mây tụ trên đầu {ten}: {canh} đã thành.'],
  binhCanh: ['{ten} chạm bình cảnh {canh}. Trời bắt đầu nổi sấm…'],
  quaKiep: ['Sét đánh chín lần, {ten} vẫn đứng. Một vị {canh} ra đời — Mỵ Nương rải phúc!', '{ten} nuốt trọn lôi kiếp, thành {canh}! Hoa vàng rơi khắp núi Tản.'],
  quaKiepNhoHo: ['{so} đồng đạo che sét cho {ten}. {canh} — qua, cả phòng hưởng phúc!'],
  ngaKiep: ['{ten} ngã dưới lôi kiếp… hẹn ngày tái chiến.', 'Sét đánh trúng {ten}. Tóc xoăn tít, ba phút nữa thử lại.'],
  yeuHien: ['{yeu} xuất thế! Hai phe tạm gác thù, cùng ra tay.'],
  yeuChet: ['{ten} tung đòn cuối — {yeu} hóa khói!', '{yeu} gục dưới tay {ten}.'],
  yeuChay: ['{yeu} cười khẩy rồi lặn mất. Lần sau đông người hơn nhé.'],
  linhVatSon: ['Sơn Tinh ban cho {ten} {lv}.'],
  linhVatThuy: ['Thủy Tinh ban cho {ten} {lv}.'],
  dacBiet: ['{ten} bắt đầu! {loi}.'],
  luBatDau: ['Thủy Tinh hô mưa gọi gió — nước bắt đầu dâng!'],
  luSon: ['Nước rút! Sơn Tông giữ vững chân núi.', 'Núi mọc cao thêm, Thủy Tông đành lui sóng.'],
  luThuy: ['Nước tràn lên sườn núi — Thủy Tông thắng trận lũ này!', 'Sóng vỗ tới lưng chừng núi Tản. Thủy Tông thắng!'],
  luHoa: ['Nước và núi giằng co bất phân thắng bại.'],
  muaSon: ['Hết năm thứ {nam}: Sơn Tông thắng mùa lũ! Núi Tản vững như bàn thạch.'],
  muaThuy: ['Hết năm thứ {nam}: Thủy Tông thắng mùa lũ! Phù sa phủ khắp đồng bằng.'],
  muaHoa: ['Hết năm thứ {nam}: hai phe hòa nhau. Năm sau đánh tiếp!'],
  qua: ['{ten} thắp {so} {qua} dâng hương.'],
  meMo: ['Tranh Đoạt Bảo Vật! Nước lũ rút, bảo khố Đồng Cổ lộ ra — đồ đồng vua Hùng rơi khắp lối!', 'Lò đúc đồng cổ mở cửa. Hai phe tranh nhau xuống nhặt!'],
  meRuong: ['Rương Đồng hiện giữa mê cung — ai tới trước được đồ quý!'],
  meNhat: ['{ten} nhặt được {vat}!', '{ten} lượm {vat} trong đống tro lò đúc.'],
  meRuongMo: ['{ten} mở Rương Đồng: {vat}!'],
  duLinhKhi: ['{ten} đã đủ linh khí — gõ "đột phá" để lên {canh}!', 'Linh khí của {ten} đã đầy. Gõ "đột phá" để bước vào {canh}.'],
  xuatMon: ['{ten} bỏ bê tu luyện quá lâu, bị xuất môn làm khách.', '{ten} lâu không tiến bộ, trưởng lão cho về làm khách.'],
  hocVo: ['{ten} luyện {vo} lên tầng {tang}.'],
  tranLen: ['{phe} nâng trận lên {tran}! Mỗi câu đáp đúng thêm {thach} linh thạch.'],
  congHuong: ['{so} đồng môn {phe} cùng đáp đúng — Tụ Linh Trận sáng rực!', 'Linh khí {so} người {phe} hoà làm một dòng.'],
  nmMo: ['Ải Nhập Môn mở cửa! Phàm nhân nào muốn theo tiên lộ, ba mươi giây để bước vào.', 'Mê cung Nhập Môn hiện ra giữa mây — hai cửa, hai tông, ai tới được thì thành đệ tử.'],
  muaMon: ['{ten} đổi linh thạch lấy {mon} ({ma}).', 'Tàng Bảo Các: {ten} vừa mua {mon}.'],
  dungMon: ['{ten} đổi sang {mon}.'],
  choMo: ['Cửa Thành Trì Tự Do mở! Đan Các đỏ lửa lò, Tàng Kinh Các rộng cửa — đệ tử hai tông cùng xuống chợ.'],
  nmBiKip: ['Hên quá! {ten} nhặt được bí kíp võ công giữa Ải Nhập Môn!', 'Bí kíp thất truyền rơi xuống tay {ten} — vượt ải là lĩnh ngộ!'],
  nmQua: ['{ten} vượt Ải Nhập Môn thứ {thu}, bái nhập {phe}!', 'Ải Nhập Môn: {ten} tới cửa {phe} — một đồng môn mới!'],
  kyNgo: ['Kỳ ngộ! {ten} giành được {vat} lúc tranh đoạt bảo vật, bước vào tiên lộ {phe}.', '{ten} vốn phàm nhân, lượm được {vat} — duyên tu tiên bắt đầu ở {phe}.'],
  thayTuong: ['{ten} lên thay làm Chủ Tướng {phe}!'],
  ketTran: ['{phe} kết trận {tran}!', '{phe} đồng thanh hô — {tran} thành!'],
  meThoat: ['{ten} ra cửa thứ {thu}, mang theo {so} bảo vật!', '{ten} lao ra Cửa Ra — hạng {thu}!'],
  meDong: ['Tranh Đoạt Bảo Vật kết thúc. {ten} ra đầu tiên, {so} người ra kịp.'],
  yeuCuong: ['{yeu} chưa chết — cuồng bạo sống lại, đồ sát khắp trận!'],
  yeuThuong: ['{phe} hạ {yeu}! Mỗi đệ tử ra tay được {thach} linh thạch.'],
  yeuDoSat: ['{yeu} cuồng bạo đồ sát cả đội — trận này yêu tinh thắng.'],
  tpHa: ['{ten} — tiên phong {phe} — bị hạ giữa trận!'],
  tpHiSinh: ['{ten} liều mình tung đòn hi sinh cho {phe} — cả chiến trường chấn động!'],
  meVang: ['Tranh Đoạt Bảo Vật kết thúc, chưa ai kịp ra — bảo vật giành được vẫn mang về.'],
  yeuRoi: ['{yeu} rơi ra {vat} — {ten} chộp được!'],
  tuyetKy: ['{ten} tung tuyệt kỹ {chieu}!'],
} as const;

export type LoaiSuThi = keyof typeof SU_THI;
