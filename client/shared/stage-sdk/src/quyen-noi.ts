/** Quyền đọc to: cả máy chỉ MỘT cửa sổ sân khấu được nói một lúc.
 *
 *  Mỗi cửa sổ có hàng đọc riêng (`HangGiong`), nên mở cùng lúc khung xem thử
 *  trong app, một tab trình duyệt và OBS là ba giọng đè nhau, đọc lệch nhau
 *  nửa giây — nghe như tranh nhau nói. Các cửa sổ cùng gốc (`127.0.0.1:47830`)
 *  bàn với nhau qua `BroadcastChannel`:
 *
 *  - Cửa sổ OBS luôn giữ quyền — tiếng của nó mới là tiếng lên sóng.
 *  - Không có OBS: cửa sổ mới mở, hay cửa sổ người vận hành vừa bấm vào, giành
 *    quyền; các cửa sổ khác im ngay. Hai lời giành cùng lúc thì lời sau thắng
 *    (`luc`, rồi `id`) — mọi cửa sổ so cùng một luật nên chỉ còn đúng một.
 *  - Cửa sổ đang nói cứ `NHIP_MS` lại báo một tiếng. Im quá `MAT_MS` (cửa sổ
 *    đóng, treo, OBS tắt) thì cửa sổ còn thấy được tự nhận quyền. Không trông
 *    vào tin "tôi đóng đây": trình duyệt đóng tab nhiều khi không kịp gửi.
 *
 *  Thuần với kênh, đồng hồ và hẹn giờ truyền vào, để test không cần trình duyệt.
 */

export interface KenhTin {
  postMessage(tin: unknown): void;
  /** Đăng ký nhận tin của các cửa sổ khác. */
  nghe(f: (tin: unknown) => void): void;
}

/** Hẹn chạy `f` sau `ms`; trả hàm huỷ hẹn. */
export type HenGio = (f: () => void, ms: number) => () => void;

/** Cửa sổ đang nói báo mỗi ngần này. */
export const NHIP_MS = 2_000;
/** Im lâu hơn ngần này là coi như cửa sổ đang nói đã mất. */
export const MAT_MS = 7_000;

type Tin = { t: 'toi'; id: string; obs: boolean; luc: number } | { t: 'roi'; id: string };

function laTin(x: unknown): x is Tin {
  if (typeof x !== 'object' || x === null) return false;
  const t = (x as { t?: unknown }).t;
  return (t === 'toi' || t === 'roi') && typeof (x as { id?: unknown }).id === 'string';
}

export class QuyenNoi {
  private coQuyen = false;
  /** Lúc cửa sổ này giành quyền — để so với lời giành của cửa sổ khác. */
  private luc = 0;
  /** Lần cuối nghe một cửa sổ khác nói mình đang giữ quyền. */
  private ngheLuc: number;
  private huy: (() => void) | null = null;

  /** `matQuyen` chạy khi cửa sổ khác giành quyền — để tắt ngay câu đang đọc. */
  constructor(
    private readonly kenh: KenhTin | null,
    private readonly id: string,
    private readonly laObs: boolean,
    private readonly matQuyen: () => void,
    private readonly henGio: HenGio,
    private readonly bayGio: () => number,
    /** Cửa sổ này còn đáng nhận quyền không khi cửa sổ đang nói mất. */
    private readonly conThay: () => boolean = () => true,
  ) {
    this.ngheLuc = bayGio();
    if (kenh === null) {
      // Không có kênh (trình duyệt cũ): một mình một cửa sổ, cứ nói.
      this.coQuyen = true;
      return;
    }
    kenh.nghe((tin) => this.nhan(tin));
  }

  duocNoi(): boolean {
    return this.coQuyen;
  }

  /** Giành quyền: lúc mở trang, lúc người vận hành bấm vào cửa sổ này. */
  gianh(): void {
    this.huyHen();
    this.coQuyen = true;
    this.luc = this.bayGio();
    this.bao();
  }

  /** Gọi đều đặn (mỗi `NHIP_MS`): đang giữ quyền thì báo; không thì xem cửa
   *  sổ đang nói còn sống không. */
  nhip(): void {
    if (this.kenh === null) return;
    if (this.coQuyen) {
      this.bao();
      return;
    }
    if (this.bayGio() - this.ngheLuc > MAT_MS && (this.laObs || this.conThay())) this.gianh();
  }

  /** Cửa sổ sắp đóng: trả quyền để cửa sổ khác nhận ngay, khỏi chờ `MAT_MS`. */
  tra(): void {
    if (!this.coQuyen) return;
    this.coQuyen = false;
    this.kenh?.postMessage({ t: 'roi', id: this.id } satisfies Tin);
  }

  private bao(): void {
    this.kenh?.postMessage({ t: 'toi', id: this.id, obs: this.laObs, luc: this.luc } satisfies Tin);
  }

  private nhan(x: unknown): void {
    if (!laTin(x) || x.id === this.id) return;
    if (x.t === 'toi') {
      this.ngheLuc = this.bayGio();
      this.huyHen();
      // OBS không nhường cửa sổ thường: giành lại ngay.
      if (this.laObs && !x.obs) {
        this.gianh();
        return;
      }
      if (!this.coQuyen) return;
      // Cửa sổ thường không giành được của OBS.
      const thang = (x.obs && !this.laObs) || x.luc > this.luc || (x.luc === this.luc && x.id > this.id);
      if (thang) {
        this.coQuyen = false;
        this.matQuyen();
      } else {
        // Mình giành sau: báo ngay để cửa sổ kia biết mà im.
        this.bao();
      }
      return;
    }
    // Cửa sổ đang nói vừa đóng. Ai còn thấy được thì xin quyền sau một quãng
    // ngẫu nhiên ngắn; tin `toi` của người nhanh nhất huỷ lượt chờ của mọi người.
    if (!this.conThay() && !this.laObs) return;
    this.huyHen();
    this.huy = this.henGio(() => this.gianh(), this.laObs ? 0 : 50 + Math.random() * 200);
  }

  private huyHen(): void {
    this.huy?.();
    this.huy = null;
  }
}
