export interface TrangThaiNoi {
  channel?: string | null;
  running?: boolean;
  problem?: string | null;
}

export interface ToastNoi {
  loai: 'cho' | 'xong' | 'loi';
  tieuDe: string;
  chu: string;
}

const DANG_NOI = /Đang nối|Chưa nối được cầu nối|đang thử lại/;

/** Toast kế tiếp khi trạng thái nguồn đổi. `undefined` là giữ nguyên toast đang hiện.
 *  Toast chờ và toast lỗi chỉ hiện sau lúc người vận hành vừa bấm Kết nối, để nhịp
 *  tự thử lại mỗi phút không làm phiền; nối được thì lúc nào cũng báo. */
export function buocToast(
  cu: TrangThaiNoi | null,
  moi: TrangThaiNoi,
  vuaBam: boolean,
): ToastNoi | undefined {
  if (cu === null) return undefined;
  const kenh = (moi.channel ?? '').trim().replace(/^@/, '');
  const ten = kenh === '' ? 'kênh' : `@${kenh}`;
  const loi = (moi.problem ?? '').trim();
  if (loi !== '' && DANG_NOI.test(loi)) {
    return vuaBam ? { loai: 'cho', tieuDe: `Đang nối ${ten}`, chu: 'Chờ TikTok trả lời…' } : undefined;
  }
  if (loi === '' && moi.running === true && (cu.problem ?? '').trim() !== '') {
    return { loai: 'xong', tieuDe: `Đã kết nối ${ten}`, chu: 'Đang nhận dữ liệu TikTok' };
  }
  if (loi !== '' && vuaBam) return { loai: 'loi', tieuDe: `Chưa nối được ${ten}`, chu: loi };
  return undefined;
}
