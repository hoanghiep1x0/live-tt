/** Thông điệp WebSocket giữa backend, thiết kế và trang quản lý. */

import type { CommandSource, Json, RoomCommand } from './effects';
import type { FeedItem, SessionView } from './events';

/** Một khoản trong sổ chi phí (`backend/src/chi_phi.rs`). */
export interface KhoanChiPhi {
  lan: number;
  tokVao: number;
  tokRa: number;
  /** Số ký tự đã đọc (giọng đọc). */
  kyTu: number;
  usd: number;
  /** Số lượt nhà cung cấp không cho biết giá. */
  chuaRo: number;
}

/** Sổ chi phí của một buổi: mở lúc lên sóng, chốt lúc tắt sóng. `live` false
 *  là chi phí lúc xem thử, chưa lên sóng. */
export interface SoChiPhi {
  designId: string;
  batDau: number;
  ketThuc: number | null;
  live: boolean;
  /** Khoá: mc, viet, ke-hoach-anh, ve-anh, ve-anh-muse, giong. */
  khoan: Record<string, KhoanChiPhi>;
  tongUsd: number;
  chuaRo: number;
  /** Tên các truyện đã kể trong buổi, theo thứ tự. */
  truyen: string[];
}

/** Nguồn sự kiện live (`backend/src/source`). Một nguồn chung cho mọi thiết
 *  kế: thiết kế không tự nối TikTok, chỉ nhận `feed` / `session`.
 *  `bridge` = cầu nối TikTok (docs/07); `webview` còn trong backend nhưng không dùng. */
export type KieuNguon = 'tat' | 'mau' | 'bridge' | 'webview';

/** Trạng thái nguồn — `GET /api/source` và tin `{ t: 'source' }` cùng một dạng. */
export interface TrangThaiNguon {
  kind: KieuNguon;
  /** Địa chỉ cầu nối (`ws://127.0.0.1:8787/ws/live` là cầu nối backend tự bật). */
  url: string;
  /** Nick TikTok đang nghe. */
  channel: string;
  /** Nhịp của nguồn giả lập, mili-giây. */
  nhip: number;
  /** Đang chạy và không có lỗi = đang thật sự nhận dữ liệu. */
  running: boolean;
  /** Vì sao chưa nhận được dữ liệu: "Đang nối…", "Kênh chưa phát live", "Cần cài Node.js…". */
  problem?: string;
}

/** Backend gửi xuống. Thiết kế và manager nhận cùng một tập.
 *
 *  `designId` trên tin trạng thái phòng (config, modules, design, bot, ai) và
 *  tin phiên (session, feed): tin của một thiết kế CHƯA phát — bản xem trước
 *  của nó, kể cả phiên xem thử có nhân vật ảo. Chỉ cửa sổ của đúng thiết kế đó
 *  được áp; trang quản lý bỏ qua. Không có = tin của thiết kế đang phát. */
export type Down =
  | { t: 'feed'; items: FeedItem[]; designId?: string }
  | { t: 'session'; view: SessionView; designId?: string }
  /** Cấu hình đổi giữa lúc đang chạy — áp nóng, KHÔNG tải lại trang. */
  | { t: 'config'; moduleId: string; config: Json; designId?: string }
  | { t: 'modules'; enabled: string[]; designId?: string }
  /** Lựa chọn của thiết kế đang phát đổi — áp nóng, KHÔNG tải lại trang.
   *  Gửi cả cục chứ không gửi patch: client khỏi phải gộp. */
  | { t: 'design'; config: Json; designId?: string }
  /** Nhân vật ảo đổi — áp nóng. Thiết kế đọc để biết có phải ghi dòng minh bạch
   *  "có nhân vật minh họa" ở chân màn hay không. */
  | { t: 'bot'; cfg: Json; designId?: string }
  /** Người dẫn do AI đổi — áp nóng. Không bao giờ mang khoá API. */
  | { t: 'ai'; cfg: Json; designId?: string }
  /** Lượt MC gần nhất lỗi gì (hết hạn mức, sai khoá…); `null` là lượt vừa rồi
   *  ổn. Thẻ MC ở bảng xem hiện câu này để người vận hành biết phải sửa gì. */
  | { t: 'ai-loi'; loi: string | null; designId?: string }
  /** Sự cố đang diễn ra của phòng, khoá là loại sự cố. Phát lại cả danh sách
   *  mỗi lần đổi; rỗng là phòng ổn. */
  | { t: 'su-co'; ds: Record<string, string>; designId?: string }
  /** Sổ chi phí của buổi hiện tại (mỗi lượt gọi AI tốn bao nhiêu, số thật nhà
   *  cung cấp báo về). Phát lại cả sổ sau mỗi lượt gọi. */
  | { t: 'chi-phi'; so: SoChiPhi; designId?: string }
  /** Cài đặt giọng đọc đổi — áp nóng, KHÔNG tải lại trang. */
  | { t: 'voice'; cfg: Json }
  /** Người vận hành bấm nút của module (`ModuleUi.actions`). `id` tăng dần theo
   *  lần bấm để sân khấu chạy mỗi lần bấm đúng một lần. */
  | { t: 'action'; moduleId: string; op: string; id: number; designId?: string }
  | { t: 'live'; designId: string | null }
  /** Nguồn sự kiện đổi cấu hình hoặc trạng thái (đang nối → đang nhận, lỗi…).
   *  Phát mỗi khi đổi, để nút "Kết nối Studio" không phải đợi tải lại trang. */
  | { t: 'source'; source: TrangThaiNguon }
  | { t: 'error'; message: string }
  /** Tin "quyền nói" của một sân khấu, máy chủ chuyển tới mọi trang — để cả
   *  máy chỉ MỘT sân khấu đọc to, kể cả sân khấu mở ở trình duyệt khác. */
  | { t: 'quyen-noi'; tin: unknown };

/** Gửi lên backend. Thiết kế chỉ gửi lệnh do module sinh ra, kèm nhãn nguồn.
 *
 *  `designId` (trang thiết kế gửi): lệnh áp vào CHÍNH thiết kế đó, kể cả khi nó
 *  chưa phát — bảng xem thử bật tắt, sửa cấu hình được trước khi lên sóng. Thiếu
 *  (trang quản lý): áp vào thiết kế đang phát. `xem`: trang thiết kế khai mình là
 *  ai lúc nối, backend trả trạng thái riêng nếu nó chưa phát. */
export type Up =
  | { t: 'command'; command: RoomCommand; by: CommandSource; reason?: string; designId?: string }
  | { t: 'xem'; designId: string }
  /** Sân khấu vừa TỰ ĐỌC đoạn `doan` (đếm từ 0) của truyện `ten` thay MC
   *  (MC vắng quá lâu): máy chủ ghi tiến độ để MC kể tiếp từ đoạn sau, không
   *  kể lại đoạn phòng đã đọc. */
  | { t: 'tu-doc'; ten: string; doan: number; designId?: string }
  /** Tin "quyền nói" (`stage-sdk/src/quyen-noi.ts`) cho máy chủ chuyển tiếp. */
  | { t: 'quyen-noi'; tin: unknown }
  | { t: 'ping' };

export const WS_PATH = '/ws';

/** Cổng mặc định của HTTP server nội bộ. Bận thì lấy cổng trống kế tiếp
 *  và công bố qua agent-port.json. */
export const DEFAULT_PORT = 47830;
