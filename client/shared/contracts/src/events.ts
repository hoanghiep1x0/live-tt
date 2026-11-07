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
  /** Lệnh khách gõ trong bình luận, máy chủ đã đọc và áp (`backend/src/lenh.rs`).
   *  Module và thiết kế đọc ô này, không tự đọc lại chữ. */
  lenh?: LenhGo;
  /** Câu MC này là lời KỂ đoạn thứ mấy của truyện (đếm từ 0) — MC tự kể như
   *  bản cũ. Module Kể chuyện bắt nó để chuyển đoạn và hiện làm phụ đề. */
  ke?: number;
  /** Câu MC thuộc mạch truyện (lời kể, câu mở truyện): sân khấu đọc trước mọi
   *  lời chào; câu chào đang dài thì nhường. */
  truyen?: boolean;
  /** Câu MC nói VỚI KHÁCH (chào người mới vào, đáp bình luận). Đang kể thì đọc
   *  CHỒNG lên lời kể, nhỏ tiếng hơn — khách không phải chờ hết đoạn; không kể
   *  thì đọc bình thường, to rõ. Chỉ chồng khi khác giọng người đang kể. */
  khach?: boolean;
  /** Câu CHÀO người mới vào (khác câu ĐÁP bình luận): sân khấu vẫn đọc,
   *  nhưng không hiện lên thẻ giữa màn. */
  chao?: boolean;
}

/** Lệnh gõ trong bình luận. Lệnh dùng mã ghế chỉ có ở thiết kế khai `seatRows`. */
export type LenhGo =
  /** "ghế B4": `ok` là đã ngồi; không thì `lyDo`. */
  | { loai: 'ghe'; ma: string; i?: number; ok: boolean; lyDo?: string }
  /** "chỗ của tôi" / "chỗ K12": thiết kế làm ghế `i` sáng lên. */
  | { loai: 'cho'; ma: string; i?: number }
  /** "gửi: …": lời nhắn chạy trên dải chữ. */
  | { loai: 'gui'; chu: string }
  /** "nhảy" / "quẩy": người gõ lên sàn nhảy. */
  | { loai: 'nhay' }
  /** "ghét Lan" / "đánh B4": người ở ghế `tu` chạy tới "đánh yêu" người ở ghế `den`. */
  | { loai: 'treu'; dich: string; tu?: number; den?: number };

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
    /** Số người ĐANG xem. */
    viewers: number;
    /** Tổng lượt xem cả buổi live (TikTok `totalUser`), kể cả người đã rời.
     *  Thiếu khi nguồn không gửi (nguồn mẫu, máy chủ cũ). */
    views?: number;
    likes: number;
    gifts: number;
    xu: number;
    comments: number;
  }>;
  readonly topGivers: readonly Giver[];
  /** Bảng vinh danh theo TƯƠNG TÁC (quà, bình luận, tim), lấp bằng người đang
   *  trong phòng khi chưa ai tương tác — nên luôn có ảnh thật để hiện. Chưa
   *  phát thì rỗng. */
  readonly topTuongTac: readonly Giver[];
  readonly seats: readonly Seat[];
  readonly recentUsers: readonly EventUser[];
  readonly recentFeed: readonly FeedItem[];
}

export interface Giver {
  user: string;
  name: string;
  xu: number;
  coins: number;
  avatar?: string;
}
