/** Trạng thái một sân khấu thấy được, và đường nối tới backend.
 *
 *  Thiết kế KHÔNG tự đọc WebSocket, không tự giữ cấu hình, không đọc
 *  localStorage. Nó nhận mọi thứ qua đây, nên đổi cấu hình giữa lúc đang live là
 *  vẽ lại — không tải lại trang, không mất khán giả.
 */

import { WS_PATH } from '@live/contracts';
import type { Down, Json, SessionView, SoChiPhi, Up } from '@live/contracts';
import { VOICE_MAC_DINH } from './audio';
import type { VoiceCfg } from './audio';

export interface StageState {
  /** Thiết kế đang phát theo backend. Khác id của mình thì mình chỉ là bản xem trước. */
  live: string | null;
  session: SessionView;
  /** Module đang bật cho thiết kế này. */
  enabled: readonly string[];
  /** Cấu hình từng module, khoá là moduleId. */
  config: Readonly<Record<string, Json>>;
  /** Lựa chọn của chính thiết kế (khung dọc / ngang…). Rỗng nghĩa là chưa ai
   *  đụng tới — thiết kế lấy mặc định trong `DesignOption` của nó. */
  design: Readonly<Record<string, Json>>;
  voice: VoiceCfg;
  /** Nhân vật ảo: tắt bật và số lượng. Thiết kế đọc để biết có phải ghi dòng
   *  minh bạch ở chân màn không; bảng xem đọc để vẽ thẻ. */
  bot: BotCfg;
  /** Người dẫn do AI. Chỉ phần người vận hành chỉnh — khoá API không bao giờ ra
   *  khỏi backend. */
  ai: AiCfg;
  /** Lượt MC gần nhất lỗi gì, `null` là ổn. */
  aiLoi: string | null;
  /** Sổ chi phí của buổi hiện tại ở phòng này, `null` là chưa có lượt gọi nào. */
  chiPhi: SoChiPhi | null;
  noiDuoc: boolean;
  /** Các lần người vận hành bấm nút của module (`ModuleUi.actions`), cũ trước mới
   *  sau, giữ một đoạn ngắn. Runner chạy mỗi `id` đúng một lần. */
  hanhDong: readonly HanhDong[];
  /** Id thiết kế của chính trang này (null: trang không phải thiết kế, vd test).
   *  Trạng thái phòng chỉ nhận tin của đúng thiết kế này — đang phát phòng khác
   *  thì tin phát chung của phòng kia không được ghi đè bản xem trước. */
  cuaMinh: string | null;
}

/** Một lần bấm nút của module. */
export interface HanhDong {
  id: number;
  moduleId: string;
  op: string;
}

/** Người dẫn do AI. Câu MC về sân khấu qua feed (`kind: 'host'`), không phải qua
 *  đây — đây chỉ là mấy nút chỉnh. */
export interface AiCfg {
  enabled: boolean;
  everySec: number;
  /** Tên ngắn của nhà cung cấp lo phần chữ, đặt ở trang quản lý. Để trống là
   *  nhà mặc định "mc". */
  provider: string;
  /** Để trống là theo model của nhà cung cấp đó. */
  model: string;
  extra: string;
  /** Nhà cung cấp lo phần vẽ ảnh. Để trống là nhà mặc định "anh". */
  anhProvider: string;
  anhModel: string;
  /** Độ sáng tạo 0–1 của phần chữ. `null` là theo nhà cung cấp. */
  temperature?: number | null;
  /** Trần độ dài một lượt MC, tính bằng token. */
  maxTokens: number;
  /** Cho nhờ AI vẽ ảnh ở ô ảnh/video. */
  anhEnabled: boolean;
  /** Kích thước ảnh, dạng `1024x1024`. Rỗng là vuông 1024. */
  anhSize: string;
  /** Id giọng trong dàn để đọc câu MC. Rỗng là giọng mặc định của dàn. Ở phòng
   *  kể chuyện đây là giọng DẪN CHUYỆN — MC chính là người kể. */
  voiceId: string;
  /** Ai đọc gì (máy chủ `ai::VaiGiong`). Rỗng là MC tự chọn trong cả dàn. */
  vaiGiong: VaiGiong;
}

/** Phân vai giọng: mỗi việc một danh sách giọng, nhiều giọng thì thay phiên. */
export interface VaiGiong {
  /** Giọng giao cho nhân vật trong truyện — MC tự giao mỗi nhân vật một giọng. */
  nhanVat: string[];
  /** Chào khách mới vào. */
  chao: string[];
  /** Trò chuyện, đáp bình luận. */
  dap: string[];
  /** Cảm ơn quà — đọc thay giọng của tính năng Cảm ơn quà. */
  qua: string[];
  /** Cảm ơn người lên an ủi bé. */
  anUi: string[];
  /** Đã đặt mặc định / người vận hành đã chỉnh — máy không tự điền nữa. */
  daDat?: boolean;
}

export const VAI_GIONG_TRONG: VaiGiong = { nhanVat: [], chao: [], dap: [], qua: [], anUi: [] };

/** Một giọng cho việc `ds` (thay phiên, không lặp liền giọng `truoc`), hoặc ''
 *  khi chưa giao giọng nào. Thuần — `rand` truyền vào để test. */
export function giongChoViec(ds: readonly string[] | undefined, truoc: string, rand: () => number): string {
  const c = ds ?? [];
  const con = c.length > 1 ? c.filter((g) => g !== truoc) : c;
  return con[Math.floor(rand() * con.length)] ?? '';
}

/** Mặc định TẮT: bật là tiêu tiền API của người vận hành, và là để một cái máy
 *  nói chuyện với khán giả thay họ.
 *
 *  Nhà cung cấp và model để trống: backend tự lần theo thứ tự ô này → model
 *  của nhà → mặc định của giao thức. Nhờ vậy không ô nào ghi cứng tên một nhà
 *  cụ thể, đổi nhà là chạy được ngay. */
export const AI_MAC_DINH: AiCfg = {
  enabled: false,
  everySec: 30,
  provider: '',
  model: '',
  extra: '',
  anhProvider: '',
  anhModel: '',
  temperature: null,
  maxTokens: 600,
  anhEnabled: true,
  anhSize: '',
  voiceId: '',
  vaiGiong: VAI_GIONG_TRONG,
};

/** Nhân vật ảo minh hoạ. Nội dung họ nói nằm ở `crowd` trong design.json của
 *  từng phòng, không phải ở đây. */
export interface BotCfg {
  enabled: boolean;
  count: number;
}

/** Mặc định TẮT: dựng người xem giả mà người vận hành chưa bảo là tự ý làm
 *  thay họ một việc có thể bị hiểu là lừa khán giả. */
export const BOT_MAC_DINH: BotCfg = { enabled: false, count: 12 };

/** Phiên rỗng: thứ sân khấu thấy khi chưa phát phòng nào, hoặc phòng chưa có ai.
 *  Sân khấu phải lên hình đầy đủ ở trạng thái này. */
export const PHIEN_RONG: SessionView = {
  designId: null,
  startedAt: null,
  totals: { viewers: 0, likes: 0, gifts: 0, xu: 0, comments: 0 },
  topGivers: [],
  topTuongTac: [],
  seats: [],
  recentUsers: [],
  recentFeed: [],
};

export const BAN_DAU: StageState = {
  live: null,
  session: PHIEN_RONG,
  enabled: [],
  config: {},
  design: {},
  voice: VOICE_MAC_DINH,
  bot: BOT_MAC_DINH,
  ai: AI_MAC_DINH,
  aiLoi: null,
  chiPhi: null,
  noiDuoc: false,
  hanhDong: [],
  cuaMinh: null,
};

/** Tin trạng thái phòng này có phải của trang mình không. Tin gắn `designId` là tin
 *  trả riêng cho bản xem trước; tin không gắn là của thiết kế đang phát. */
function cuaToi(s: StageState, designId: string | undefined): boolean {
  if (s.cuaMinh === null) return true;
  return designId !== undefined ? designId === s.cuaMinh : s.live === s.cuaMinh;
}

/** Áp một tin từ backend lên trạng thái. Hàm thuần nên test được không cần WebSocket. */
export function apTin(s: StageState, d: Down): StageState {
  switch (d.t) {
    case 'live':
      // Phòng đang phát đổi thì phiên cũ không còn là của trang này nữa: phát
      // phòng khác là phiên của phòng kia, phát lại chính mình là phiên mới.
      return s.cuaMinh === null || d.designId === s.live
        ? { ...s, live: d.designId }
        : { ...s, live: d.designId, session: PHIEN_RONG };
    case 'session':
      // Phiên chỉ có ở phòng đang phát. Bản xem trước của phòng khác mà nhận nó
      // thì ghế, top và bình luận của phòng kia hiện sang đây.
      return s.cuaMinh === null || d.view.designId === s.cuaMinh ? { ...s, session: d.view } : s;
    case 'modules':
      return cuaToi(s, d.designId) ? { ...s, enabled: d.enabled } : s;
    case 'voice': {
      const c = d.cfg;
      if (typeof c !== 'object' || c === null || Array.isArray(c)) return s;
      return { ...s, voice: { ...VOICE_MAC_DINH, ...(c as Partial<VoiceCfg>) } };
    }
    case 'config':
      return cuaToi(s, d.designId) ? { ...s, config: { ...s.config, [d.moduleId]: d.config } } : s;
    case 'ai': {
      if (!cuaToi(s, d.designId)) return s;
      const c = d.cfg;
      if (typeof c !== 'object' || c === null || Array.isArray(c)) return s;
      return { ...s, ai: { ...AI_MAC_DINH, ...(c as Partial<AiCfg>) } };
    }
    case 'ai-loi':
      return cuaToi(s, d.designId) ? { ...s, aiLoi: d.loi } : s;
    case 'chi-phi':
      return cuaToi(s, d.designId) ? { ...s, chiPhi: d.so } : s;
    case 'bot': {
      if (!cuaToi(s, d.designId)) return s;
      const c = d.cfg;
      if (typeof c !== 'object' || c === null || Array.isArray(c)) return s;
      return { ...s, bot: { ...BOT_MAC_DINH, ...(c as Partial<BotCfg>) } };
    }
    case 'design': {
      if (!cuaToi(s, d.designId)) return s;
      const c = d.config;
      if (typeof c !== 'object' || c === null || Array.isArray(c)) return s;
      return { ...s, design: c as Record<string, Json> };
    }
    case 'feed': {
      // Feed của phòng khác mà lọt vào đây là module ở đây cảm ơn quà, chào
      // khách và đọc to lời MC của phòng kia.
      if (!cuaToi(s, d.designId)) return s;
      // Giữ một đoạn ngắn: sân khấu chỉ cần vài mục gần nhất để vẽ, không phải
      // cả phiên. Phiên đầy đủ là việc của backend.
      const giu = [...s.session.recentFeed, ...d.items].slice(-60);
      return { ...s, session: { ...s.session, recentFeed: giu } };
    }
    case 'action': {
      if (!cuaToi(s, d.designId)) return s;
      const moi: HanhDong = { id: d.id, moduleId: d.moduleId, op: d.op };
      return { ...s, hanhDong: [...s.hanhDong, moi].slice(-20) };
    }
    case 'source':
      // Trạng thái nguồn là việc của trang quản lý; sân khấu chỉ cần feed / phiên.
      return s;
    case 'error':
      return s;
    default:
      // Loại tin mới hơn bản sân khấu đã build: bỏ qua, giữ nguyên trạng thái.
      // Thiếu nhánh này thì `switch` trả `undefined` và sân khấu đang phát sập.
      return s;
  }
}

const CHO_DAU = 500;
const CHO_TRAN = 10_000;

/** Nối WebSocket và gọi `nhan` mỗi lần trạng thái đổi. Trả về hàm đóng. */
/** Socket đang mở, để gửi lệnh lên. Một sân khấu chỉ có một đường nối. */
let socket: WebSocket | null = null;
/** Thiết kế của trang này — gắn vào mọi lệnh để lệnh áp đúng phòng mình (docs/02 §10). */
let thietKe: string | null = null;

/** Gửi một lệnh lên backend. Backend mới là nơi quyết có làm hay không. */
export function guiLenh(up: Up): boolean {
  if (socket === null || socket.readyState !== WebSocket.OPEN) return false;
  const gui = up.t === 'command' && thietKe !== null && up.designId === undefined ? { ...up, designId: thietKe } : up;
  socket.send(JSON.stringify(gui));
  return true;
}

/** `designId`: thiết kế của trang (StageProvider). Có thì lúc nối khai mình bằng tin
 *  `xem` — chưa phát vẫn nhận được cấu hình của chính mình để xem thử, chỉnh thử. */
export function connectStage(nhan: (s: StageState) => void, designId: string | null = null): () => void {
  let s: StageState = { ...BAN_DAU, cuaMinh: designId };
  thietKe = designId;
  let ws: WebSocket | null = null;
  let dong = false;
  let cho = CHO_DAU;
  let hen: ReturnType<typeof setTimeout> | undefined;

  const dat = (moi: StageState): void => {
    s = moi;
    nhan(s);
  };

  const mo = (): void => {
    const giaoThuc = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${giaoThuc}://${location.host}${WS_PATH}`);
    socket = ws;

    ws.onopen = () => {
      cho = CHO_DAU;
      dat({ ...s, noiDuoc: true });
      if (designId !== null) ws?.send(JSON.stringify({ t: 'xem', designId } satisfies Up));
    };
    ws.onmessage = (e: MessageEvent<string>) => {
      try {
        dat(apTin(s, JSON.parse(e.data) as Down));
      } catch {
        // Tin lạ thì bỏ. Sân khấu đang live không được sập vì một tin hỏng.
      }
    };
    ws.onclose = () => {
      dat({ ...s, noiDuoc: false });
      if (dong) return;
      hen = setTimeout(mo, cho);
      cho = Math.min(cho * 2, CHO_TRAN);
    };
    ws.onerror = () => ws?.close();
  };

  mo();

  return () => {
    dong = true;
    socket = null;
    if (hen !== undefined) clearTimeout(hen);
    ws?.close();
  };
}
