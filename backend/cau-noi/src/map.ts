// Ánh xạ thuần: tin TikTok LIVE (schema `tiktok-live-proto` v3, đúng bản mà
// `tiktok-live-connector@2.5.0` dùng) → JSON đúng `LiveEvent` của backend
// (`backend/src/events.rs`). Không I/O, không import gì — test chạy thẳng ở Node.
//
// Chuyển từ bản cũ `D:\Live\client\src\lib\tiktokMap.ts`. Luật phải giữ:
// docs/07-cau-noi-tiktok.md §6.

/** Một sự kiện gửi sang backend. Tên trường khớp `LiveEvent` (serde của Rust). */
export type BridgeEvent =
  | { kind: 'gift'; user: string; name: string; avatar?: string; gift: string; count: number; xuEach: number; ts: number }
  | { kind: 'like'; user: string; name: string; avatar?: string; count: number; total?: number; ts: number }
  | { kind: 'comment'; user: string; name: string; avatar?: string; text: string; ts: number }
  | { kind: 'join'; user: string; name: string; avatar?: string; ts: number };

/** Trạng thái một kênh: đang nối · đang nhận dữ liệu · kênh chưa phát live · lỗi (sẽ thử lại).
 *  Backend chỉ coi `dang-live` là "đã nối" — nút "Kết nối Studio" chỉ xanh lúc đó. */
export type ChannelState = 'dang-noi' | 'dang-live' | 'offline' | 'loi';

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v !== null && typeof v === 'object' ? (v as Obj) : {});
const str = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'bigint' ? String(v) : '';
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' || typeof v === 'bigint' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};

/** Người gửi: nick (`displayId` / `uniqueId`) làm khoá, tên hiển thị, ảnh đại diện https đầu tiên.
 *  Thiếu nick → null (tin đó bị bỏ). */
export function mapUser(raw: unknown): { user: string; name: string; avatar?: string } | null {
  const u = obj(raw);
  const user = (str(u.displayId) || str(u.uniqueId)).trim();
  if (user === '') return null;
  const name = (str(u.nickname).trim() || user).slice(0, 80);
  const urls = [obj(u.avatarThumb).urlList, obj(u.avatarMedium).urlList].flatMap((l) => (Array.isArray(l) ? l : []));
  const avatar = urls.find((x): x is string => typeof x === 'string' && /^https:\/\//i.test(x));
  return { user: user.slice(0, 80), name, ...(avatar !== undefined ? { avatar } : {}) };
}

export function mapChat(raw: unknown, ts: number): BridgeEvent | null {
  const m = obj(raw);
  const who = mapUser(m.user);
  const text = (str(m.content) || str(m.comment)).trim().slice(0, 300);
  return who !== null && text !== '' ? { kind: 'comment', ...who, text, ts } : null;
}

/** Tim. Gửi kèm `total` — tổng tim cả phiên do TikTok đếm (kể cả tim trước lúc app mở);
 *  backend lấy `max`, không cộng dồn mù. */
export function mapLike(raw: unknown, ts: number): BridgeEvent | null {
  const m = obj(raw);
  const who = mapUser(m.user);
  const count = Math.floor(num(m.count) || num(m.likeCount));
  const total = Math.floor(num(m.total) || num(m.totalLikeCount));
  return who !== null && count > 0 ? { kind: 'like', ...who, count, ...(total > 0 ? { total } : {}), ts } : null;
}

export function mapMember(raw: unknown, ts: number): BridgeEvent | null {
  const who = mapUser(obj(raw).user);
  return who !== null ? { kind: 'join', ...who, ts } : null;
}

/** Số người ĐANG xem (tin roomUser: `total`; schema cũ: `viewerCount`). Không đọc `totalUser` —
 *  đó là tổng lượt đã ghé từ đầu phiên. Phòng vắng thật là 0. Không có trường nào → null. */
export function mapViewers(raw: unknown): number | null {
  const m = obj(raw);
  const v = m.total ?? m.viewerCount;
  if (v === undefined || v === null || v === '') return null;
  return Math.max(0, Math.floor(num(v)));
}

/** Tổng lượt xem cả buổi live (tin roomUser: `totalUser`) — mọi người đã ghé, kể cả đã rời.
 *  Khác số đang xem (`mapViewers`). Không có, hay nhỏ hơn số đang xem (vô lý) → null. */
export function mapLuotXem(raw: unknown): number | null {
  const m = obj(raw);
  if (m.totalUser === undefined || m.totalUser === null || m.totalUser === '') return null;
  const t = Math.max(0, Math.floor(num(m.totalUser)));
  const dangXem = mapViewers(raw);
  return dangXem !== null && t < dangXem ? null : t;
}

/** Quà. Quà nhấn giữ (`gift.type === 1` hoặc `gift.combo`) bắn nhiều tin trong một chuỗi với
 *  `repeatCount` tăng dần: chỉ nhận tin kết thúc chuỗi (`repeatEnd === 1`), số lượng = `repeatCount`
 *  — không thì một món bị đếm nhiều lần. Xu mỗi món = `gift.diamondCount`. */
export function mapGift(raw: unknown, ts: number): BridgeEvent | null {
  const m = obj(raw);
  const who = mapUser(m.user);
  if (who === null) return null;
  const g = obj(m.gift);
  const streakable = num(g.type) === 1 || g.combo === true;
  if (streakable && num(m.repeatEnd) !== 1) return null;
  const count = Math.max(1, Math.floor(num(m.repeatCount) || num(m.comboCount) || 1));
  const xuEach = Math.max(0, Math.floor(num(g.diamondCount) || num(m.diamondCount)));
  const gift = (str(g.name).trim() || str(m.giftName).trim() || 'Quà').slice(0, 60);
  return { kind: 'gift', ...who, gift, count: Math.min(count, 1_000_000), xuEach, ts };
}

export const STATE_TEXT: Record<ChannelState, string> = {
  'dang-noi': 'Đang nối tới phòng live…',
  'dang-live': 'Đang nhận dữ liệu live',
  offline: 'Kênh chưa phát live — sẽ tự thử lại',
  loi: 'Lỗi kết nối — sẽ tự thử lại',
};

/** Lỗi thư viện → trạng thái + câu dễ hiểu + bao lâu thì thử lại (ms). */
export function classifyError(err: unknown, attempt: number): { state: ChannelState; message: string; retryMs: number } {
  // Tên lớp lỗi của thư viện (UserOfflineError, SignatureRateLimitError…) có thể nằm ở constructor hoặc .name
  const name = `${err instanceof Error ? err.constructor.name : ''} ${str(obj(err).name)}`;
  const msg = err instanceof Error ? err.message : str(err);
  const backoff = Math.min(5 * 60_000, 15_000 * 2 ** Math.min(attempt, 5));
  if (/UserOffline/i.test(name) || /offline|not.*live|isn'?t live/i.test(msg))
    return { state: 'offline', message: 'Kênh chưa phát live — tự thử lại mỗi phút', retryMs: 60_000 };
  if (/InvalidUniqueId|UserNotFound/i.test(name) || /not found|invalid unique/i.test(msg))
    return { state: 'loi', message: 'Không tìm thấy nick TikTok này — kiểm tra lại link live của phòng', retryMs: 10 * 60_000 };
  if (/RateLimit/i.test(name) || /rate.?limit|429/i.test(msg))
    return { state: 'loi', message: 'Máy chủ ký Euler Stream đang giới hạn — đặt khoá Euler để nới giới hạn', retryMs: Math.max(backoff, 2 * 60_000) };
  if (/captcha|blocked|403/i.test(msg))
    return { state: 'loi', message: 'TikTok tạm chặn IP hoặc đòi Captcha — sẽ thử lại sau', retryMs: Math.max(backoff, 5 * 60_000) };
  return { state: 'loi', message: `Lỗi kết nối: ${msg.slice(0, 160) || name.trim() || 'không rõ'}`, retryMs: backoff };
}

/** Nick từ thứ người dùng gõ: `@abc`, `abc`, `https://www.tiktok.com/@abc/live`. */
export const normChannel = (v: unknown): string =>
  typeof v === 'string'
    ? v
        .trim()
        .replace(/^https?:\/\/(www\.)?tiktok\.com\//i, '')
        .replace(/^@/, '')
        .replace(/\/live\/?$/i, '')
        .slice(0, 60)
    : '';
