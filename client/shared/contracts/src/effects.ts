/** Cửa ra. Module KHÔNG tự thực thi gì — chỉ trả về `Effect[]`.
 *  Nhờ vậy test được, ghi log được, và chặn được bằng cổng duyệt. */

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export type Priority = 'low' | 'normal' | 'high';

export type SfxName = 'gift' | 'join' | 'sad' | 'comfort' | 'fanfare' | 'tick';

/** Chỗ thiết kế chừa sẵn cho module cắm vào. Thiết kế khai báo slot nó có
 *  trong design.json; module khai báo slot nó cần trong manifest.
 *
 *  Tên slot nói **vai trí trong một phòng live**, không nói bối cảnh: phòng kể
 *  chuyện, đám cưới hay quán bar đều có khung chiếu, hàng vinh danh, vùng khán
 *  giả, góc chat. Nhờ vậy một module vẽ được ở mọi bối cảnh mà không phải biết
 *  mình đang ở phòng nào. */
export type SlotName =
  /** Dải trên cùng: tên phòng, chip LIVE, mã phiên. */
  | 'top-bar'
  /** Dải chữ chạy ngang. */
  | 'ticker'
  /** Khung chiếu chính: video, ảnh, chữ truyện. */
  | 'screen'
  /** Phủ bên trong khung chiếu, ví dụ bình luận trong khung. */
  | 'screen-overlay'
  /** Hàng vinh danh top. */
  | 'tops'
  /** Thanh mục tiêu, tiến độ. */
  | 'target'
  /** Canvas 3D. */
  | 'stage-3d'
  /** Vùng khán giả — thứ vẽ theo từng ghế. */
  | 'seats'
  /** Sàn diễn phía trước khán giả. */
  | 'floor'
  /** Bóng chat nổi. */
  | 'chat'
  /** Giữa màn: thẻ hướng dẫn, hộp đạt mốc. */
  | 'center'
  | 'corner-left'
  | 'corner-right'
  /** Chân màn: dòng cú pháp, câu minh bạch. */
  | 'bottom-bar'
  /** Phủ toàn màn: quà bay, pháo hoa. */
  | 'full';

export type Effect =
  /** Nói một câu. Đi qua hàng chờ giọng đọc; `high` chen lên trước.
   *
   *  `caption` mặc định bật: câu nói hiện luôn lên thẻ MC để người xem tắt
   *  tiếng vẫn theo được. Module nào đã tự vẽ chính câu đó lên màn thì đặt
   *  `false`, không màn sẽ ra hai lần một câu. */
  | { kind: 'say'; text: string; voice?: string; priority?: Priority; caption?: boolean }
  | { kind: 'sfx'; sound: SfxName; volume?: number }
  /** Vẽ vào một slot. Thiết kế không có slot đó thì bỏ qua và ghi log, không lỗi. */
  | { kind: 'overlay'; slot: SlotName; ttlMs?: number }
  | { kind: 'spawn'; actor: string; at?: { x: number; y: number }; action?: string }
  | { kind: 'record'; table: RecordTable; row: Json }
  /** Cửa duy nhất để tác động sang module khác hoặc sang phiên. */
  | { kind: 'command'; command: RoomCommand; reason: string };

export type RecordTable = 'gift' | 'vote' | 'raffle';

/** Whitelist lệnh dùng chung cho người vận hành, luật tự động và AI. */
export type RoomCommand =
  | { op: 'say'; text: string; voice?: string }
  | { op: 'set-module'; moduleId: string; on: boolean }
  | { op: 'set-config'; moduleId: string; patch: Json }
  | { op: 'set-design'; designId: string }
  /** Lựa chọn của chính thiết kế đang phát (khung dọc / ngang…), không thuộc
   *  module nào. Gộp vào cấu hình cũ chứ không thay cả cục. */
  | { op: 'set-design-config'; patch: Json }
  /** Nhân vật ảo: bật tắt và số lượng. Nội dung họ nói là của thiết kế
   *  (`crowd` trong design.json), lệnh này chỉ chỉnh số. */
  | { op: 'set-bot'; patch: Json }
  /** MC do AI dẫn: bật tắt, nhịp xem lại phòng, model, lời dặn thêm. Khoá API
   *  KHÔNG đi qua đây — nó nằm ở kho khoá của backend. */
  | { op: 'set-ai'; patch: Json }
  | { op: 'seed'; n: number }
  | { op: 'next-story' };

/** Kết quả cổng duyệt: làm ngay, chỉ gợi ý cho người, hoặc bỏ. */
export type Gate = 'lam' | 'goi-y' | 'bo';

/** Ai phát ra lệnh. Cổng duyệt xét khác nhau theo nguồn. */
export type CommandSource = 'nguoi' | 'luat' | 'ai';
