/** Thông điệp WebSocket giữa backend, thiết kế và trang quản lý. */

import type { CommandSource, Json, RoomCommand } from './effects';
import type { FeedItem, SessionView } from './events';

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
  /** MC do AI dẫn đổi — áp nóng. Không bao giờ mang khoá API. */
  | { t: 'ai'; cfg: Json; designId?: string }
  /** Lượt MC gần nhất lỗi gì (hết hạn mức, sai khoá…); `null` là lượt vừa rồi
   *  ổn. Thẻ MC ở bảng xem hiện câu này để người vận hành biết phải sửa gì. */
  | { t: 'ai-loi'; loi: string | null; designId?: string }
  /** Cài đặt giọng đọc đổi — áp nóng, KHÔNG tải lại trang. */
  | { t: 'voice'; cfg: Json }
  /** Người vận hành bấm nút của module (`ModuleUi.actions`). `id` tăng dần theo
   *  lần bấm để sân khấu chạy mỗi lần bấm đúng một lần. */
  | { t: 'action'; moduleId: string; op: string; id: number; designId?: string }
  | { t: 'live'; designId: string | null }
  | { t: 'error'; message: string };

/** Gửi lên backend. Thiết kế chỉ gửi lệnh do module sinh ra, kèm nhãn nguồn.
 *
 *  `designId` (trang thiết kế gửi): lệnh áp vào CHÍNH thiết kế đó, kể cả khi nó
 *  chưa phát — bảng xem thử bật tắt, sửa cấu hình được trước khi lên sóng. Thiếu
 *  (trang quản lý): áp vào thiết kế đang phát. `xem`: trang thiết kế khai mình là
 *  ai lúc nối, backend trả trạng thái riêng nếu nó chưa phát. */
export type Up =
  | { t: 'command'; command: RoomCommand; by: CommandSource; reason?: string; designId?: string }
  | { t: 'xem'; designId: string }
  | { t: 'ping' };

export const WS_PATH = '/ws';

/** Cổng mặc định của HTTP server nội bộ. Bận thì lấy cổng trống kế tiếp
 *  và công bố qua agent-port.json. */
export const DEFAULT_PORT = 47830;
