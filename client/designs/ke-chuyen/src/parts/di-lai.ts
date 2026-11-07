/** Lượt người ra vào ở lối đi — phần THUẦN, không React, không DOM.
 *
 *  Tách ra để test chạy được ở Node (quy ước 01 §5). Phần vẽ nằm ở `LoiDi.tsx`.
 */

import type { FeedItem } from '@live/contracts';
import { AISLES_X } from '../seats';
import { kieuChibi } from './ghe';

/** Một lượt đi hết ngần này. Lấy đúng `WALK_MS` của bản cũ. */
export const DI_MS = 5_200;
/** Trên cùng một lối, người sau xuất phát cách người trước ngần này — không dồn cục. */
const CACH_MS = 1_400;
/** Chờ lượt quá lâu thì bỏ: phòng quá đông thì không xếp hàng vô tận. */
const CHO_TOI_DA_MS = 6_000;
/** Nhiều hơn ngần này người cùng đi là rối mắt. */
const TOI_DA = 6;
/** Người đứng cao chừng này (cqw): ảnh rộng 6,4cqw, cao gấp rưỡi bề rộng.
 *
 *  Rạp cắt phần tràn ra ngoài (`.stage-hall { overflow-y: auto }`), nên điểm
 *  dừng phải cách mép TRÊN của rạp ít nhất ngần này. Trước đây ai chưa có ghế
 *  thì đi tới `y = 6cqw`, tức đầu họ ở `-4cqw` — khách thấy một người cụt đầu
 *  đi lên đỉnh rạp rồi tắt. */
export const CAO_NGUOI = 11.5;

/** Một điểm trong lòng rạp. */
export interface Diem {
  x: number;
  y: number;
}

/** Vừa đủ để chọn chỗ: hàng, số ghế phẳng và toạ độ. `ChoNgoi` của `./ghe` khớp
 *  thẳng vào đây; khai riêng để phần thuần này không phải biết tới phần vẽ. */
export interface GheToiThieu {
  r: number;
  flat: number;
  x: number;
  y: number;
}

/** Băm nick ra một số ổn định: hai cửa sổ xem cùng một phòng phải thấy cùng một
 *  người đi vào cùng một chỗ. */
function bam(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 100_003;
  return h;
}

/** Chỗ người này đi tới trong rạp.
 *
 *  Biết ghế thật thì về đúng ghế đó. KHÔNG biết — phòng nghìn người mà rạp chỉ
 *  có tám mươi tư ghế, nên hầu hết khách không bao giờ có ghế — thì chọn một
 *  ghế ở HAI HÀNG CUỐI theo nick. Nhờ vậy họ đi lên tới hàng của mình rồi RẼ
 *  NGANG vào hàng, thay vì đi thẳng tuột lên đỉnh rạp.
 *
 *  Chỉ nhìn NICK và rạp, KHÔNG nhìn ghế nào đang có người: ai đang ngồi là
 *  thứ đổi mỗi nửa giây và hai cửa sổ thấy khác nhau, nên đưa nó vào đây thì
 *  cùng một người mỗi lúc lại nhắm một chỗ, và hai cửa sổ cho họ đi hai đường.
 *  Người đi vào mờ hẳn trước khi tới nơi nên có trùng ghế cũng không ai thấy.
 *
 *  `y` luôn kẹp ở `CAO_NGUOI` để không ai bị mép rạp cắt mất đầu.
 *  Hàm thuần.
 */
export function choDen(ai: string, biet: Diem | undefined, ghe: readonly GheToiThieu[]): Diem {
  if (biet !== undefined) return { x: biet.x, y: Math.max(biet.y, CAO_NGUOI) };
  if (ghe.length === 0) return { x: 50, y: CAO_NGUOI };
  let cuoi = 0;
  for (const g of ghe) cuoi = Math.max(cuoi, g.r);
  const sau = ghe.filter((g) => g.r >= cuoi - 1);
  const g = sau[bam(ai) % sau.length];
  if (g === undefined) return { x: 50, y: CAO_NGUOI };
  return { x: g.x, y: Math.max(g.y, CAO_NGUOI) };
}

export interface LuotDi {
  key: string;
  loi: number;
  vao: boolean;
  tu: number;
  kieu: number;
  /** Nick, để tra chỗ ngồi. */
  ai: string;
  /** Tên hiện trên nhãn đi theo đầu. */
  ten: string;
  /** Chỗ trong rạp mà lượt này đi tới (hay đứng dậy từ đó). Chốt ở đây chứ
   *  không để phần vẽ tự tra lại: `loi` đã chọn theo chính điểm này, hai bên mà
   *  lệch nhau thì người đi lên một lối rồi rẽ sang lối khác. */
  cho: Diem;
}

/** Tên dài thì lấy một chữ cho vừa nhãn. Cùng ý `shortName` của bản cũ. */
export function tenNgan(name: string): string {
  const tu = name.trim().split(/\s+/).filter(Boolean);
  const dayDu = tu.length > 1 && tu.every((w) => /^\p{Lu}/u.test(w));
  const lay = (dayDu ? tu[tu.length - 1] : tu[0]) ?? name.trim();
  return Array.from(lay).slice(0, 10).join('');
}

/** Lối gần ghế này nhất. Người rời ghế đi ngang ra lối gần nhất rồi mới xuống,
 *  chứ không bước xuyên qua cả rạp. */
export function loiGan(x: number): number {
  let tot = 0;
  for (let i = 1; i < AISLES_X.length; i += 1) {
    if (Math.abs((AISLES_X[i] ?? 50) - x) < Math.abs((AISLES_X[tot] ?? 50) - x)) tot = i;
  }
  return tot;
}

/** Các lượt đang đi, tính thuần từ feed. Chuyển nguyên cách xếp lượt của bản
 *  cũ: mỗi lối một hàng chờ, người sau cách người trước `CACH_MS`. */
export function cacLuot(
  feed: readonly FeedItem[],
  now: number,
  choCua: (ai: string) => Diem,
): LuotDi[] {
  const ranh = AISLES_X.map(() => 0);
  const ra: LuotDi[] = [];
  // Feed của phiên xếp cũ → mới, mà hàng chờ phải tính theo thứ tự thời gian.
  for (const f of feed) {
    if (f.kind !== 'join' && f.kind !== 'leave') continue;
    const ai = f.user ?? f.name;
    // Ai cũng có chỗ để đi tới (`choDen` tự bịa chỗ khi chưa có ghế thật), nên
    // lối luôn là lối GẦN chỗ đó — đi lên đoạn ngắn nhất rồi rẽ vào hàng.
    const cho = choCua(ai);
    const loi = loiGan(cho.x);
    const tu = Math.max(f.at, ranh[loi] ?? 0);
    if (tu - f.at > CHO_TOI_DA_MS) continue;
    ranh[loi] = tu + CACH_MS;
    if (now >= tu && now < tu + DI_MS) {
      ra.push({
        key: `${f.kind}:${f.id}`,
        loi,
        vao: f.kind === 'join',
        tu,
        kieu: kieuChibi(ai),
        ai,
        ten: tenNgan(f.name),
        cho,
      });
    }
  }
  return ra.slice(-TOI_DA);
}

