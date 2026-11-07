/** Phần thuần của hộp Trình duyệt — không chạm `window` hay DOM, nên test
 *  chạy được ở Node (tsconfig.json). Lệnh gọi vỏ app nằm ở `desktop.ts`. */

export interface TabWeb {
  id: string;
  url: string;
  title: string;
}

/** Tên miền (chữ thường, không cổng) của một địa chỉ http(s). Hàm thuần. */
function tenMien(url: string): string | undefined {
  return /^https?:\/\/(?:[^@/?#]*@)?([^/?#:]+)/i.exec(url.trim())?.[1]?.toLowerCase();
}

/** Trang có sẵn trong hộp Trình duyệt. `id` cố định: mở lần hai là về đúng tab
 *  đang có chứ không mở thêm. */
export interface TrangCoSan {
  id: string;
  nhom: string;
  fav: string;
  ten: string;
  moTa: string;
  url: string;
}

export const TRANG_CO_SAN: readonly TrangCoSan[] = [
  { id: 'tiktok', nhom: 'Tài khoản', fav: '♪', ten: 'TikTok', moTa: 'đăng nhập tài khoản phát live', url: 'https://www.tiktok.com/login' },
  { id: 'live-studio', nhom: 'Tài khoản', fav: '▶', ten: 'LIVE Studio', moTa: 'mở phiên phát trên TikTok LIVE Studio', url: 'https://livestudio.tiktok.com' },
  { id: 'phong-live', nhom: 'Trang lấy dữ liệu', fav: '●', ten: 'Phòng live của tôi', moTa: 'bình luận, quà, lượt xem', url: 'https://www.tiktok.com/live' },
  { id: 'bang-dieu-khien', nhom: 'Trang lấy dữ liệu', fav: '◆', ten: 'Bảng điều khiển live', moTa: 'thống kê phiên', url: 'https://www.tiktok.com/live/dashboard' },
  { id: 'muse', nhom: 'Tạo ảnh', fav: '🎨', ten: 'muse.ai', moTa: 'đăng nhập để app nhờ tạo ảnh truyện', url: 'https://muse.ai/' },
];

/** Nick kênh trong một link trang live TikTok, hay chính một nick gõ trần.
 *  Chấp cả link có đuôi `?enter_from_merge=…` mà TikTok gắn vào lúc chia sẻ.
 *  Không phải link kênh (ví dụ link LIVE Studio) → `null`. Hàm thuần. */
export function nickTuLink(raw: string): string | null {
  const t = raw.trim();
  if (t === '') return null;
  const live = /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([A-Za-z0-9._]{1,60})(?:\/live)?\/?(?:[?#].*)?$/i.exec(t);
  if (live?.[1] !== undefined) return live[1].toLowerCase();
  if (/^@?[A-Za-z0-9._]{1,60}$/.test(t) && !DUOI_TEN_MIEN.test(t) && !/^www\./i.test(t)) {
    return t.replace(/^@/, '').toLowerCase();
  }
  return null;
}

/** Id cho tab mở thêm (nút "＋ Thêm tab"). Hàm thuần. */
export function idTabMoi(now: number): string {
  return `xem-${now % 1_000_000_000}`;
}

/** Nhãn của một tab: trang có sẵn thì tên của nó, tab thêm thì tiêu đề trang
 *  (không có thì tên miền). Hàm thuần. */
export function nhanTab(t: Pick<TabWeb, 'id' | 'url' | 'title'>): string {
  const san = TRANG_CO_SAN.find((x) => x.id === t.id);
  if (san !== undefined) return san.ten;
  if (t.title.trim() !== '') return t.title.trim().slice(0, 40);
  return tenMien(t.url)?.replace(/^www\./, '') ?? 'Trang mới';
}

/** Đuôi tên miền hay gặp: "abc.vn" là trang web, còn "linh.nguyen" là nick. */
const DUOI_TEN_MIEN =
  /\.(com|net|org|vn|ai|io|co|me|app|dev|tv|info|xyz|edu|gov|uk|us|jp|kr|cn|tw|hk|sg|th|id|my|ph|in|au|ca|de|fr|ru|it|es|nl|eu|biz|site|online|store|shop|tech|cloud|gg|ly|to|so|sh|fm|art|link|live|pro|top|asia|blog|news|page|studio|video|music|game|games|club|fun|space|website|ws|cc|im|is|ac)$/i;

/** Ô "＋ Thêm tab" (chuyển từ `parseTabInput` của bản cũ):
 *  - nick kênh ("abc123", "@abc123") hay link trang live của kênh → tab trang
 *    live của kênh đó, id theo nick (mở lần hai là về đúng tab đang có);
 *  - link trang web bất kỳ (http/https, có hay không "https://") → tab mới;
 *  - còn lại → `null`. Hàm thuần. */
export function docOThemTab(raw: string, now: number): { id: string; url: string } | null {
  const t = raw.trim();
  if (t === '') return null;
  const live = /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([A-Za-z0-9._]{1,60})\/live\/?(?:[?#].*)?$/i.exec(t);
  const nick = live?.[1] ?? (/^@?[A-Za-z0-9._]{1,60}$/.test(t) && !DUOI_TEN_MIEN.test(t) && !/^www\./i.test(t) ? t.replace(/^@/, '') : null);
  if (nick !== null) {
    const id = `kenh-${nick.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 40).replace(/-+$/, '');
    return { id, url: `https://www.tiktok.com/@${nick}/live` };
  }
  if (/\s/.test(t)) return null;
  // Lược đồ khác http(s) ("file:", "javascript:"…) thì không mở.
  if (!/^https?:\/\//i.test(t) && /^[a-z][a-z0-9+.-]*:(?!\d)/i.test(t)) return null;
  const url = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  const host = tenMien(url);
  if (host === undefined || (!host.includes('.') && host !== 'localhost')) return null;
  return { id: idTabMoi(now), url };
}
