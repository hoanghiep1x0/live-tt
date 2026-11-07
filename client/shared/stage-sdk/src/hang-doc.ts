/** Luật xếp hàng đọc — thuần, không chạm loa hay DOM, để test được.
 *
 *  Một giọng một lúc, không bao giờ hai giọng chồng nhau: khách đang nghe
 *  truyện mà có câu chào đè lên là mất mạch cả hai.
 *
 *  - Câu nói với khách (`khach`: chào, đáp) chen vào KHOẢNG NGHỈ ngay sau đoạn
 *    đang đọc — đứng trước các đoạn kể còn chờ, nên khách được gọi tên trong
 *    vài giây mà truyện chỉ dừng một nhịp. Tối đa `MAX_KHACH` câu chen giữa
 *    hai đoạn; phòng đông thì bỏ câu cũ nhất, truyện không bị kéo dài.
 *  - Mạch truyện (`truyen`) đi trước mọi câu khác: chen lên trước mọi câu chào
 *    thường đang CHỜ, giữ đúng thứ tự giữa các lời kể với nhau.
 *  - Câu đang đọc thì không bao giờ ngắt — MC nói hết câu cho tự nhiên.
 *  - Câu chào chờ lâu thì bỏ. Giữa lời kể và câu không phải lời kể luôn có
 *    một nhịp nghỉ, cả hai chiều.
 */

/** Mức của một câu trong hàng đọc. */
export type MucDoc = 'khach' | 'truyen' | 'cao' | 'thuong';

export interface MucHang {
  muc: MucDoc;
  /** Lúc vào hàng (ms). */
  luc: number;
}

/** Câu chào chờ quá ngần này thì bỏ: đọc lúc này là lạc nhịp. */
export const CU_MS = 20_000;
/** Nghỉ giữa lời kể và câu nói ngay sau nó. */
export const NGHI_SAU_TRUYEN_MS = 1_200;
/** Nghỉ giữa câu nói với khách và đoạn kể tiếp theo: tách ý, rồi mới kể tiếp. */
export const NGHI_TRUOC_TRUYEN_MS = 600;
/** Hàng dài hơn thì bỏ câu chào cũ nhất (lời kể không bao giờ bỏ). */
export const MAX_HANG = 6;
/** Tối đa ngần này câu nói với khách chen giữa hai đoạn kể. */
export const MAX_KHACH = 2;

function hang(m: MucDoc): number {
  return m === 'khach' ? 0 : m === 'truyen' ? 1 : m === 'cao' ? 2 : 3;
}

/** Chỗ chèn câu mức `muc` vào hàng: sau mọi câu cùng mức hoặc mức trên nó,
 *  trước câu mức dưới. Câu với khách vì thế đứng đầu hàng (đọc ngay sau câu
 *  đang phát), lời kể xếp sau lời kể trước đó, câu chào thường xếp cuối. */
export function choChen(ds: readonly MucHang[], muc: MucDoc): number {
  const i = ds.findIndex((x) => hang(x.muc) > hang(muc));
  return i < 0 ? ds.length : i;
}

/** Câu này đã cũ, bỏ không đọc (câu chào thường và câu với khách). */
export function quaCu(m: MucHang, now: number): boolean {
  return (m.muc === 'thuong' || m.muc === 'khach') && now - m.luc > CU_MS;
}

/** Nghỉ bao lâu trước câu `sau`, khi câu vừa đọc là `truoc`. */
export function nghiTruoc(truoc: MucDoc | null, sau: MucDoc): number {
  if (truoc === 'truyen' && sau !== 'truyen') return NGHI_SAU_TRUYEN_MS;
  if (truoc !== null && truoc !== 'truyen' && sau === 'truyen') return NGHI_TRUOC_TRUYEN_MS;
  return 0;
}

/** Hàng quá đầy: vị trí câu nên bỏ, hay -1 nếu không bỏ. Quá `MAX_KHACH` câu
 *  với khách thì bỏ câu khách cũ nhất; hàng quá dài thì bỏ câu chào thường cũ
 *  nhất. Lời kể không bao giờ bỏ. */
export function canBo(ds: readonly MucHang[]): number {
  if (ds.filter((x) => x.muc === 'khach').length > MAX_KHACH) {
    return ds.findIndex((x) => x.muc === 'khach');
  }
  if (ds.length <= MAX_HANG) return -1;
  return ds.findIndex((x) => x.muc === 'thuong');
}
