/** Chào khách vừa vào phòng bằng GIỌNG, ngay lúc họ vào — phần THUẦN, không
 *  React, không DOM.
 *
 *  Vì sao tách khỏi lời chào của MC: MC chỉ nói mỗi lượt một lần, mà phòng
 *  đông thì mỗi 4 giây có năm sáu người vào — tới lượt MC họ đã đi mất. Câu
 *  chào ở đây vào HÀNG ĐỌC CHÍNH, nên nó đọc ngay sau câu kể đang dở thay vì
 *  phải chờ tới lượt MC. Chủ phòng đã nghe thử bản chạy song song hai giọng và
 *  chốt bỏ: hai giọng cùng lúc nghe ra cái máy chứ không ra người dẫn truyện.
 *
 *  Phần vẽ và phần phát tiếng nằm ở `Stage.tsx`.
 */

import type { FeedItem } from '@live/contracts';

/** Hai lời chào cách nhau ít nhất ngần này. Phòng đông mà chào liên tục thì
 *  thành tiếng ồn, và đè mất lời kể. */
export const CACH_MAC_DINH_GIAY = 3;
/** Khách vào lâu hơn ngần này rồi thì thôi, không chào vuốt đuôi nữa. */
export const QUA_CU_MS = 15_000;

export const MOI_DOT = 3;
/** Chào xong một đợt đủ người thì NGHỈ ngần này rồi mới chào tiếp.
 *
 *  Phòng đông thì người vào không bao giờ hết; chào liền tù tì là giọng chào
 *  đè lên lời kể suốt buổi. Chào ba người rồi im một nhịp cho người xem nghe
 *  truyện, xong mới chào tiếp. */
export const NGHI_MS = 10_000;
/** Mỗi lời chào gọi nhiều nhất ngần này tên. Ba tên là vừa một hơi đọc; bốn
 *  tên trở lên thì câu dài lê thê, mà người đầu danh sách đã nghe xong tên
 *  mình từ lâu. */

/** Trạng thái của bộ chào: ai đã chào rồi và lần chào gần nhất lúc nào. */
export interface SoChao {
  /** Id mục feed đã chào (hay đã bỏ qua) — feed cho id riêng từng mục nên
   *  không nhầm người. */
  daChao: Set<string>;
  /** Mốc lời chào gần nhất (ms); 0 là chưa chào ai lần nào. */
  lanCuoi: number;
  /** Đếm số lời đã chào — để xoay vòng câu và giọng. */
  dem: number;
  /** Đang nghỉ tới mốc này (ms); 0 là không nghỉ. */
  nghiToi: number;
}

export function soChaoMoi(): SoChao {
  return { daChao: new Set(), lanCuoi: 0, dem: 0, nghiToi: 0 };
}

/** Tên gọn để đọc: bỏ ký tự trang trí, còn chữ và số. Tên TikTok hay có
 *  vương miện, trái tim — đọc nguyên văn thì giọng đọc ra một tràng vô nghĩa.
 *  Hàm thuần. */
export function tenDocDuoc(s: string): string {
  let ra = '';
  for (const c of s) {
    if (/[\p{L}\p{N}]/u.test(c)) ra += c;
    else if (!ra.endsWith(' ')) ra += ' ';
  }
  return ra.trim();
}

/** Câu chào cho một hay nhiều người: "Chào A vào phòng", "Chào A, B, C vào
 *  phòng". Tên không đọc được thì bỏ khỏi danh sách; không còn ai thì trả
 *  rỗng. Hàm thuần. */
export function cauChao(ten: readonly string[]): string {
  const ds = ten.map(tenDocDuoc).filter((t) => t !== '');
  if (ds.length === 0) return '';
  return `Chào ${ds.join(', ')} vào phòng`;
}

/** Nhóm người cần chào lượt này (1–`MOI_DOT` người), rỗng nếu chưa chào ai.
 *
 *  Gộp mấy người vào MỘT lời chào thay vì chào từng người: "Chào A, B, C vào
 *  phòng". Phòng đông thì chào từng người không bao giờ đuổi kịp — mỗi lời
 *  chào mất mấy giây, mà cứ 2 giây lại có người mới.
 *
 *  Chào đủ nhóm (tức phòng đang đông) thì NGHỈ `NGHI_MS` cho người xem nghe
 *  truyện. Hết nghỉ, ai vào trong lúc nghỉ mà chưa được chào thì BỎ
 *  QUA — chào người mới vào còn kịp giữ chân họ, chứ chào người đã ngồi xem
 *  cả phút thì vô duyên.
 *
 *  Hàm thuần: `so` bị sửa tại chỗ (nó là sổ của cửa sổ này).
 */
export function aiCanChao(
  feed: readonly FeedItem[],
  now: number,
  so: SoChao,
  cachGiay: number,
): FeedItem[] {
  // Đang nghỉ: im hẳn, không chào ai.
  if (so.nghiToi !== 0 && now < so.nghiToi) return [];

  // Vừa hết nghỉ: bỏ qua những người vào TRƯỚC lúc hết nghỉ mà chưa được chào.
  if (so.nghiToi !== 0) {
    for (const f of feed) {
      if (f.kind === 'join' && f.at < so.nghiToi) so.daChao.add(String(f.id));
    }
    so.nghiToi = 0;
  }

  const cach = Math.max(0, cachGiay) * 1000;
  // `lanCuoi === 0` là chưa chào ai lần nào: chào NGAY, đừng bắt người đầu
  // tiên của buổi đợi hết một nhịp giãn cách.
  if (so.lanCuoi !== 0 && now - so.lanCuoi < cach) return [];

  const nhom: FeedItem[] = [];
  // Feed xếp cũ → mới: chào người vào TRƯỚC trước, cho đúng thứ tự họ bước vào.
  for (const f of feed) {
    if (f.kind !== 'join' || f.virtual === true) continue;
    const id = String(f.id);
    if (so.daChao.has(id)) continue;
    // Quá cũ: đánh dấu đã xét rồi bỏ, không chào vuốt đuôi.
    if (now - f.at >= QUA_CU_MS) {
      so.daChao.add(id);
      continue;
    }
    if (tenDocDuoc(f.name) === '') {
      // Tên chỉ toàn biểu tượng: không đọc được, nhưng cũng đừng xét lại mãi.
      so.daChao.add(id);
      continue;
    }
    nhom.push(f);
    so.daChao.add(id);
    if (nhom.length >= MOI_DOT) break;
  }
  if (nhom.length === 0) return [];

  so.lanCuoi = now;
  so.dem += 1;
  // Chào đủ nhóm nghĩa là phòng đang đông: nghỉ cho người xem nghe truyện.
  if (nhom.length >= MOI_DOT) so.nghiToi = now + NGHI_MS;
  // Sổ chỉ cần nhớ đủ lâu để không chào lại; phòng đông thì nó phình mãi.
  if (so.daChao.size > 400) {
    so.daChao = new Set([...so.daChao].slice(-200));
  }
  return nhom;
}
