/** Cửa vào và bus chung. Mọi nguồn sự kiện chuẩn hoá về `LiveEvent`;
 *  mọi module đọc `FeedItem`. Xem docs/02-hop-dong.md. */

export interface EventUser {
  /** Nick TikTok — định danh duy nhất của một người xem. */
  user: string;
  /** Tên hiển thị, có thể trùng nhau giữa nhiều người. */
  name: string;
  avatar?: string;
}

export type LiveEvent = EventUser &
  (
    | { kind: 'gift'; gift: string; count: number; xuEach: number }
    /** `total` là tổng tim cả phiên do TikTok đếm; tin hơn cộng dồn phía mình. */
    | { kind: 'like'; count: number; total?: number }
    | { kind: 'comment'; text: string }
    | { kind: 'join' }
    | { kind: 'follow' }
    | { kind: 'share' }
    /** Hội viên trả phí. `months` là số tháng đã theo, TikTok có gửi thì mới có. */
    | { kind: 'subscribe'; months?: number }
    /** TikTok không gửi; chỉ đến từ giả lập hoặc cầu nối riêng. */
    | { kind: 'leave' }
  );

export type FeedKind =
  | LiveEvent['kind']
  | 'milestone'
  | 'system'
  | 'vote'
  | 'seat'
  | 'message'
  | 'host';

export interface FeedItem {
  id: number;
  at: number;
  kind: FeedKind;
  name: string;
  text: string;
  user?: string;
  /** Điểm sau khi quy đổi theo tỉ lệ của thiết kế. */
  xu?: number;
  /** Xu thật TikTok, giữ nguyên để đối soát sổ sách. */
  coins?: number;
  /** Tên quà và số lượng, chỉ có ở mục `gift`. Module cảm ơn quà cần cả hai để
   *  điền `{qua}` và `{soluong}` — nếu bus chỉ mang `text` thì nó phải đi phân
   *  tích lại câu chữ, việc đó hỏng ngay khi đổi cách viết câu. */
  gift?: string;
  count?: number;
  /** Nhân vật ảo: module phải bỏ qua, nếu không bot sẽ tự cảm ơn chính nó. */
  virtual?: boolean;
  /** Câu do agent viết cho nhân vật ảo. */
  scripted?: boolean;
  /** Giọng đọc dạng "nhà-cung-cấp:tên-giọng". */
  voice?: string;
  /** Tên chuyện đang kể, nếu câu này thuộc một chuyện. */
  story?: string;
}

/** Một chỗ đã có người. Chỗ thứ `i` nằm ở đâu là việc của thiết kế — phòng kể
 *  chuyện xếp hình quạt, phòng đám cưới xếp bàn tròn. */
export interface Seat {
  i: number;
  user: string;
  name: string;
  avatar?: string;
}

/** Bản rút gọn chỉ đọc của phiên mà module được phép thấy.
 *  Cố ý hẹp: không ai được phụ thuộc vào chi tiết nội bộ của phiên. */
export interface SessionView {
  readonly designId: string | null;
  readonly startedAt: number | null;
  readonly totals: Readonly<{
    viewers: number;
    likes: number;
    gifts: number;
    xu: number;
    comments: number;
  }>;
  readonly topGivers: readonly Giver[];
  readonly seats: readonly Seat[];
  readonly recentUsers: readonly EventUser[];
  readonly recentFeed: readonly FeedItem[];
}

export interface Giver {
  user: string;
  name: string;
  xu: number;
  coins: number;
}
