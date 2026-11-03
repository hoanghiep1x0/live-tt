/** Cửa ra. Module KHÔNG tự thực thi gì — chỉ trả về `Effect[]`.
 *  Nhờ vậy test được, ghi log được, và chặn được bằng cổng duyệt. */

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export type Priority = 'low' | 'normal' | 'high';

export type SfxName = 'gift' | 'join' | 'sad' | 'comfort' | 'fanfare' | 'tick';

/** Chỗ thiết kế chừa sẵn cho module cắm vào. Thiết kế khai báo slot nó có
 *  trong design.json; module khai báo slot nó cần trong manifest. */
export type SlotName =
  | 'top-bar'
  | 'bottom-bar'
  | 'left'
  | 'right'
  | 'center'
  | 'full'
  | 'ticker'
  | 'stage-3d';

export type Effect =
  /** Nói một câu. Đi qua hàng chờ giọng đọc; `high` chen lên trước. */
  | { kind: 'say'; text: string; voice?: string; priority?: Priority }
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
  | { op: 'seed'; n: number }
  | { op: 'next-story' };

/** Kết quả cổng duyệt: làm ngay, chỉ gợi ý cho người, hoặc bỏ. */
export type Gate = 'lam' | 'goi-y' | 'bo';

/** Ai phát ra lệnh. Cổng duyệt xét khác nhau theo nguồn. */
export type CommandSource = 'nguoi' | 'luat' | 'ai';
