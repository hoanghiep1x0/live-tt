/** Giờ nghỉ giữa hai truyện — phần THUẦN, không React, không DOM.
 *
 *  Tách ra để test chạy được ở Node (quy ước 01 §5). Màn chờ vẽ ở `Stage.tsx`.
 */

/** Khung giữ đoạn cuối thêm ngần này rồi mới nhường chỗ cho màn chờ. PHẢI khớp
 *  `GIU_DOAN_CUOI_MS` ở `backend/src/truyen_sau.rs`. */
export const GIU_DOAN_CUOI_MS = 5_000;

export interface GiaiLao {
  /** Tên truyện sắp kể. */
  truyenSau: string;
  /** "chuyen" — nghỉ giữa hai truyện; "anh" / "ket-noi" — nghỉ vì sự cố. */
  lyDo: string;
  /** Lúc mở giờ nghỉ (ms). */
  tu: number;
  /** Giờ chờ máy chủ đã chốt cho lần này (ms), co theo số người trong phòng.
   *  0 là bản cũ chưa ghi ô này — khi ấy về mốc 40 giây. */
  han: number;
  /** Giờ nghỉ này là NHỊP GIAO LƯU (máy chủ `giao_luu.rs`): MC chào khách
   *  mới liên tục, nên sân khấu tạm nghỉ phần tự chào của mình. */
  giaoLuu: boolean;
}

/** Ô `giaiLao` trong cấu hình module Kể truyện; sai kiểu thì coi như không có. */
export function giaiLaoCua(cfg: unknown): GiaiLao | null {
  if (typeof cfg !== 'object' || cfg === null || Array.isArray(cfg)) return null;
  const g = (cfg as Record<string, unknown>)['giaiLao'];
  if (typeof g !== 'object' || g === null || Array.isArray(g)) return null;
  const o = g as Record<string, unknown>;
  const tu = typeof o['tu'] === 'number' ? o['tu'] : 0;
  if (tu <= 0) return null;
  return {
    truyenSau: typeof o['truyenSau'] === 'string' ? o['truyenSau'] : '',
    lyDo: typeof o['lyDo'] === 'string' ? o['lyDo'] : 'chuyen',
    tu,
    han: typeof o['han'] === 'number' && o['han'] > 0 ? o['han'] : 0,
    giaoLuu: o['giaoLuu'] === true,
  };
}

/** Mấy giây ĐẦU của giờ nghỉ đổi truyện: khung còn giữ đoạn cuối và ảnh của
 *  nó, màn chờ chưa được lên.
 *
 *  Kể xong câu cuối mà khung tắt ngay thì câu kết chưa kịp đọng lại — người
 *  xem đang đọc dở đã thấy đồng hồ. Giữ vài giây cho hết câu rồi mới chuyển.
 *
 *  Chỉ với giờ nghỉ ĐỔI TRUYỆN. Giờ nghỉ sự cố ("anh", "ket-noi") không có
 *  "đoạn cuối" nào vừa kể xong để mà giữ.
 */
export function dangGiuDoanCuoi(g: GiaiLao | null, now: number): boolean {
  if (g === null || g.lyDo !== 'chuyen') return false;
  const da = now - g.tu;
  return da >= 0 && da < GIU_DOAN_CUOI_MS;
}

/** Tên truyện SẮP kể, để màn chờ không chỉ có đồng hồ trống.
 *
 *  Lấy ở `truyenSau.title` — truyện máy chủ đã chuẩn bị xong (`truyen_sau.rs`),
 *  tên này là tên sẽ lên khung ngay sau màn chờ.
 *
 *  Trả rỗng ở hai chỗ, để không bao giờ hiện hai lần hay hiện sai:
 *  - Giờ nghỉ CÓ tên: module Kể truyện đã tự vẽ dải "Truyện tiếp theo" đè lên
 *    khung rồi (`modules/story/src/stage.tsx`), màn chờ vẽ thêm là nhân đôi.
 *  - Đang có truyện trên khung (`title` còn chữ): lúc ấy màn chờ bị khung che,
 *    nhưng giữa hai nhịp dựng lại nó lộ ra chớp một cái — và chớp ra cái tên
 *    của truyện KHÁC với truyện đang kể thì người xem đọc nhầm.
 */
export function tenTruyenSau(cfg: unknown): string {
  if (typeof cfg !== 'object' || cfg === null || Array.isArray(cfg)) return '';
  const o = cfg as Record<string, unknown>;

  const g = giaiLaoCua(cfg);
  if (g !== null && g.truyenSau.trim() !== '') return '';
  if (typeof o['title'] === 'string' && o['title'].trim() !== '') return '';

  const sau = o['truyenSau'];
  if (typeof sau !== 'object' || sau === null || Array.isArray(sau)) return '';
  const ten = (sau as Record<string, unknown>)['title'];
  return typeof ten === 'string' ? ten.trim() : '';
}

/** Cách gọi người nghe trên màn chờ. PHẢI khớp `CACH_GOI` ở
 *  `backend/src/xung_ho.rs` — hai nơi lệch nhau thì màn chờ gọi một kiểu, MC
 *  nói một kiểu, nghe như hai người.
 *
 *  Xen kẽ hai lối: gọi cả phòng ("cả nhà", "cả phòng", "mọi người") và gọi
 *  một người đang ngồi xem ("bạn", "các bạn"). Ai xem live cũng đang ngồi một
 *  mình với cái điện thoại, nên lối sau nghe như có người kể riêng cho họ. */
export const CACH_GOI = ['cả nhà', 'bạn', 'cả phòng', 'các bạn', 'mọi người'] as const;

/** Chỗ đi CÙNG ai: "nghe trọn câu chuyện cùng …". PHẢI khớp `CUNG` ở
 *  `backend/src/xung_ho.rs`.
 *
 *  Ở chỗ này "tớ", "mình", "chúng mình" đều đặt lọt vì đứng sau chữ "cùng".
 *  Chỗ KHÔNG lọt là chỗ gọi người nghe — "Chào tớ" mới vô nghĩa. Và đừng đặt
 *  từ ở đây làm CHỦ NGỮ: "cả nhà kể tiếp chuyện khác" hoá ra khán giả kể. */
export const CUNG = ['mình', 'tớ', 'chúng mình', 'cả nhà'] as const;

/** Câu giữ chân dưới đồng hồ. `{nha}` là chỗ điền cách gọi; mấy câu không có
 *  `{nha}` là lối RỦ NGHE CÙNG MC — cố ý trộn vào cho đỡ đều. */
export const CAU_CHO = [
  'Truyện sắp bắt đầu rồi, {nha} ngồi lại nghe cùng {cung} ❤',
  'Chút xíu nữa thôi, ngồi lại nghe cùng {cung} ❤',
  '{nha} ngồi xuống đây, chuyện hay sắp kể rồi 😊',
  'Truyện mới sắp lên rồi, {nha} nghe tiếp cùng {cung} nào ❤',
  'Đừng đi đâu, {nha} ở lại nghe trọn câu chuyện cùng {cung} 😊',
  'Chuẩn bị xíu thôi, lát nữa {nha} nghe cùng {cung} cho vui 😊',
  'Sắp kể rồi, {nha} ở lại nghe cùng {cung} ❤',
] as const;

/** Lời chào trên màn chờ: "Chào cả nhà", "Chào bạn"… Hàm thuần. */
export function loiChao(thuTu: number): string {
  return `Chào ${CACH_GOI[mod(thuTu, CACH_GOI.length)]}`;
}

/** Câu giữ chân, đã điền cách gọi. Hàm thuần.
 *
 *  Ba vòng xoay (7 câu, 5 cách gọi, 4 từ đi cùng) phải KHÔNG CHIA HẾT cho
 *  nhau thì mới thật sự nhân lên: chia hết là chúng bước song song, thêm bao
 *  nhiêu từ cũng vô ích. 7 × 5 × 4 nên rất lâu mới gặp lại đúng một lời. */
export function cauCho(thuTu: number): string {
  const mau = CAU_CHO[mod(thuTu, CAU_CHO.length)] ?? '';
  const ra = mau
    .replace('{nha}', CACH_GOI[mod(thuTu, CACH_GOI.length)] ?? '')
    .replace('{cung}', CUNG[mod(thuTu, CUNG.length)] ?? '');
  // Chỗ trống đứng đầu câu thì chữ thay vào là chữ thường ("cả phòng ngồi
  // xuống đây…"). Viết hoa lại — câu mẫu nào cũng mở đầu bằng chữ hoa.
  return hoaDau(ra);
}

/** Viết hoa chữ cái đầu. Hàm thuần. */
export function hoaDau(s: string): string {
  return s === '' ? '' : s[0]!.toUpperCase() + s.slice(1);
}

/** Mốc xoay vòng của màn chờ: giữ NGUYÊN suốt một lượt chờ rồi mới đổi.
 *
 *  Lấy theo lúc mở giờ nghỉ; chưa có giờ nghỉ (buổi vừa mở) thì theo lúc
 *  truyện bắt đầu. Đừng lấy theo đồng hồ hiện tại — chữ đổi ngay trước mắt
 *  người đang đọc thì khó chịu hơn hẳn việc nó lặp. Hàm thuần. */
export function thuTuCho(cfg: unknown, g: GiaiLao | null): number {
  if (g !== null && g.tu > 0) return Math.floor(g.tu / 1000);
  if (typeof cfg === 'object' && cfg !== null && !Array.isArray(cfg)) {
    const b = (cfg as Record<string, unknown>)['batDau'];
    if (typeof b === 'number' && b > 0) return Math.floor(b / 1000);
  }
  return 0;
}

/** Chia lấy dư không bao giờ ra số âm. Hàm thuần. */
function mod(a: number, n: number): number {
  // Mốc lạ (NaN, vô cực) thì về 0 — màn chờ phải luôn có chữ, không được
  // rơi ra chuỗi rỗng rồi hiện một dòng trống giữa sân khấu.
  if (!Number.isFinite(a) || n <= 0) return 0;
  return ((Math.trunc(a) % n) + n) % n;
}
