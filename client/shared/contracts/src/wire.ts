/** Thông điệp WebSocket giữa backend, thiết kế và trang quản lý. */

import type { CommandSource, Json, RoomCommand } from './effects';
import type { FeedItem, SessionView } from './events';

/** Backend gửi xuống. Thiết kế và manager nhận cùng một tập. */
export type Down =
  | { t: 'feed'; items: FeedItem[] }
  | { t: 'session'; view: SessionView }
  /** Cấu hình đổi giữa lúc đang chạy — áp nóng, KHÔNG tải lại trang. */
  | { t: 'config'; moduleId: string; config: Json }
  | { t: 'modules'; enabled: string[] }
  /** Lựa chọn của thiết kế đang phát đổi — áp nóng, KHÔNG tải lại trang.
   *  Gửi cả cục chứ không gửi patch: client khỏi phải gộp. */
  | { t: 'design'; config: Json }
  /** Nhân vật ảo đổi — áp nóng. Thiết kế đọc để biết có phải ghi dòng minh bạch
   *  "có nhân vật minh họa" ở chân màn hay không. */
  | { t: 'bot'; cfg: Json }
  /** MC do AI dẫn đổi — áp nóng. Không bao giờ mang khoá API. */
  | { t: 'ai'; cfg: Json }
  /** Cài đặt giọng đọc đổi — áp nóng, KHÔNG tải lại trang. */
  | { t: 'voice'; cfg: Json }
  | { t: 'live'; designId: string | null }
  | { t: 'error'; message: string };

/** Gửi lên backend. Thiết kế chỉ gửi lệnh do module sinh ra, kèm nhãn nguồn. */
export type Up =
  | { t: 'command'; command: RoomCommand; by: CommandSource; reason?: string }
  | { t: 'ping' };

export const WS_PATH = '/ws';

/** Cổng mặc định của HTTP server nội bộ. Bận thì lấy cổng trống kế tiếp
 *  và công bố qua agent-port.json. */
export const DEFAULT_PORT = 47830;
