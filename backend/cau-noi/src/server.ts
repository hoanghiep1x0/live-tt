// Cầu nối TikTok LIVE: mỗi nick một kết nối (tiktok-live-connector), đẩy sự kiện đã chuẩn hoá
// (map.ts) cho mọi client đang nghe nick đó qua WebSocket. Backend tự bật tiến trình này
// (backend/src/source/tien_trinh.rs) — người vận hành không phải chạy tay. Xem docs/07-cau-noi-tiktok.md.
//
// Giao thức (khớp backend/src/source/bridge.rs):
//   client → cầu nối : { type: 'subscribe', channel }
//   cầu nối → client : sự kiện { kind, user, name, ... , ts }
//                      { type: 'status', channel, state, message, viewers } · { type: 'viewers', count, views? }
//   HTTP             : GET /status — trạng thái mọi kênh (backend hỏi để biết đã có cầu nối sống chưa)
//
// Biến môi trường: PORT (8787), HOST (127.0.0.1), EULER_API_KEY (tuỳ chọn — nới giới hạn ký),
// CAU_NOI_THEO_CHA=1 (backend đặt: stdin đóng = backend đã chết → tự tắt, không để tiến trình mồ côi giữ cổng).
import { createServer } from 'node:http';
import { ControlEvent, TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import { WebSocket, WebSocketServer } from 'ws';
import { classifyError, mapChat, mapGift, mapLike, mapLuotXem, mapMember, mapViewers, normChannel, STATE_TEXT, type BridgeEvent, type ChannelState } from './map.ts';

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '127.0.0.1';
const EULER_API_KEY = process.env.EULER_API_KEY?.trim() || undefined;
/** Kênh không còn ai nghe → ngắt sau ngần này (backend nối lại ngay thì khỏi nối TikTok lại từ đầu). */
const IDLE_STOP_MS = 30_000;
/** Thư viện có thể treo khi TikTok / máy chủ ký không trả lời. */
const CONNECT_TIMEOUT_MS = 30_000;

const log = (channel: string, text: string) =>
  console.log(`@${channel} ${text}`);

/** Thư viện báo lỗi có khi là Error, có khi là object `{ info, exception }` — in ra cho đọc được. */
function moTaLoi(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e !== null && typeof e === 'object') {
    const o = e as { info?: unknown; exception?: unknown; message?: unknown };
    const ngoai = o.exception instanceof Error ? o.exception.message : '';
    const chu = [o.info, o.message, ngoai].filter((x) => typeof x === 'string' && x !== '').join(' — ');
    if (chu !== '') return chu.slice(0, 300);
    try {
      return JSON.stringify(e).slice(0, 300);
    } catch {
      return 'không rõ';
    }
  }
  return String(e);
}

interface Client {
  ws: WebSocket;
  channel: string;
}

interface Hooks {
  event(ev: BridgeEvent): void;
  /** Số đang xem, kèm tổng lượt xem cả buổi nếu TikTok gửi. */
  viewers(n: number, luotXem: number | null): void;
  /** Mất kết nối giữa chừng / phiên live kết thúc. */
  dropped(state: ChannelState, message: string, retryMs: number): void;
}

/** Một kết nối tới phòng live của một nick. */
function tiktok(channel: string, h: Hooks) {
  let conn: TikTokLiveConnection | null = null;
  let stopping = false;
  const emit = (ev: BridgeEvent | null) => {
    if (ev !== null) h.event(ev);
  };
  return {
    async start() {
      stopping = false;
      conn = new TikTokLiveConnection(channel, {
        ...(EULER_API_KEY !== undefined ? { signApiKey: EULER_API_KEY } : {}),
        processInitialData: false, // bỏ tin dồn lại trước lúc nối — không cảm ơn lại quà cũ
        fetchRoomInfoOnConnect: true, // kênh chưa live → UserOfflineError ngay
        enableExtendedGiftInfo: false,
        // KHÔNG bật authenticateWs: tuỳ chọn đó gửi cookie đăng nhập TikTok cho máy chủ ký bên thứ ba.
      });
      conn.on(WebcastEvent.CHAT, (m) => emit(mapChat(m, Date.now())));
      conn.on(WebcastEvent.GIFT, (m) => emit(mapGift(m, Date.now())));
      conn.on(WebcastEvent.LIKE, (m) => emit(mapLike(m, Date.now())));
      conn.on(WebcastEvent.MEMBER, (m) => emit(mapMember(m, Date.now())));
      conn.on(WebcastEvent.ROOM_USER, (m) => {
        const n = mapViewers(m);
        if (n !== null) h.viewers(n, mapLuotXem(m));
      });
      conn.on(WebcastEvent.STREAM_END, () => {
        if (!stopping) h.dropped('offline', 'Phiên live của kênh đã kết thúc', 60_000);
      });
      conn.on(ControlEvent.DISCONNECTED, (d) => {
        if (!stopping) h.dropped('loi', `Mất kết nối (${d?.reason || d?.code || 'không rõ'})`, 5_000);
      });
      conn.on(ControlEvent.ERROR, (e) => log(channel, `lỗi: ${moTaLoi(e)}`));
      await conn.connect();
    },
    async stop() {
      stopping = true;
      const c = conn;
      conn = null;
      try {
        await c?.disconnect();
      } catch {
        /* đã ngắt */
      }
    },
  };
}

class Channel {
  readonly name: string;
  state: ChannelState = 'dang-noi';
  message = STATE_TEXT['dang-noi'];
  viewers = 0;
  lastEventAt = 0;
  private source: ReturnType<typeof tiktok> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private idle: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private running = false;

  constructor(name: string) {
    this.name = name;
  }

  subscribers(): Client[] {
    return [...clients].filter((c) => c.channel === this.name);
  }

  /** Có client nghe → bảo đảm đang nối; hết client nghe → ngắt sau IDLE_STOP_MS. */
  refresh() {
    if (this.subscribers().length > 0) {
      if (this.idle !== null) clearTimeout(this.idle);
      this.idle = null;
      if (!this.running) void this.connect();
    } else if (this.running && this.idle === null) {
      this.idle = setTimeout(() => void this.stop(), IDLE_STOP_MS);
    }
  }

  statusMessage() {
    return { type: 'status', channel: this.name, state: this.state, message: this.message, viewers: this.viewers };
  }

  private setState(state: ChannelState, message: string) {
    this.state = state;
    this.message = message;
    log(this.name, `${state}: ${message}`);
    this.broadcast(this.statusMessage());
  }

  private async connect() {
    this.running = true;
    if (this.retry !== null) clearTimeout(this.retry);
    this.retry = null;
    this.setState('dang-noi', STATE_TEXT['dang-noi']);
    const source = tiktok(this.name, {
      event: (ev) => {
        this.lastEventAt = Date.now();
        if (this.state !== 'dang-live') this.setState('dang-live', STATE_TEXT['dang-live']);
        this.broadcast(ev);
      },
      viewers: (n, luotXem) => {
        this.viewers = n;
        this.broadcast({ type: 'viewers', count: n, ...(luotXem !== null ? { views: luotXem } : {}) });
      },
      dropped: (state, message, retryMs) => {
        void this.source?.stop();
        this.source = null;
        this.setState(state, message);
        this.schedule(retryMs);
      },
    });
    this.source = source;
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Hết ${CONNECT_TIMEOUT_MS / 1000} giây vẫn chưa nối được (mạng chậm hoặc bị chặn)`)),
          CONNECT_TIMEOUT_MS,
        );
      });
      await Promise.race([source.start(), timeout]).finally(() => clearTimeout(timer));
      if (!this.running) return void source.stop();
      this.attempt = 0;
      this.setState('dang-live', STATE_TEXT['dang-live']);
    } catch (err) {
      void source.stop();
      if (this.source === source) this.source = null;
      if (!this.running) return;
      const c = classifyError(err, this.attempt++);
      this.setState(c.state, c.message);
      this.schedule(c.retryMs);
    }
  }

  private schedule(ms: number) {
    if (!this.running) return;
    if (this.retry !== null) clearTimeout(this.retry);
    this.retry = setTimeout(() => void this.connect(), ms);
  }

  async stop() {
    this.running = false;
    if (this.retry !== null) clearTimeout(this.retry);
    if (this.idle !== null) clearTimeout(this.idle);
    this.retry = this.idle = null;
    await this.source?.stop();
    this.source = null;
    channels.delete(this.name);
    log(this.name, 'đã ngắt (không còn ai nghe)');
  }

  broadcast(data: unknown) {
    const text = JSON.stringify(data);
    for (const c of this.subscribers()) if (c.ws.readyState === WebSocket.OPEN) c.ws.send(text);
  }
}

const clients = new Set<Client>();
const channels = new Map<string, Channel>();

function channelOf(name: string): Channel {
  let ch = channels.get(name);
  if (ch === undefined) {
    ch = new Channel(name);
    channels.set(name, ch);
  }
  return ch;
}

function onClientMessage(c: Client, raw: string) {
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return;
  }
  if (m.type !== 'subscribe') return;
  const channel = normChannel(m.channel);
  const before = c.channel;
  c.channel = channel;
  if (before !== '' && before !== channel) channels.get(before)?.refresh();
  if (channel === '') return;
  const ch = channelOf(channel);
  ch.refresh();
  c.ws.send(JSON.stringify(ch.statusMessage()));
}

const http = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://local');
  if (req.method === 'GET' && url.pathname === '/status') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ten: 'cau-noi',
        signKey: EULER_API_KEY !== undefined,
        channels: [...channels.values()].map((ch) => ({
          channel: ch.name,
          state: ch.state,
          message: ch.message,
          viewers: ch.viewers,
          lastEventAt: ch.lastEventAt || null,
          listeners: ch.subscribers().length,
        })),
      }),
    );
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Không có đường dẫn này. Dùng ws://…/ws/live hoặc GET /status' }));
});

const wss = new WebSocketServer({ server: http, path: '/ws/live' });
wss.on('connection', (ws) => {
  const c: Client = { ws, channel: '' };
  clients.add(c);
  ws.on('message', (data) => onClientMessage(c, data.toString()));
  ws.on('close', () => {
    clients.delete(c);
    if (c.channel !== '') channels.get(c.channel)?.refresh();
  });
});

http.on('error', (e: NodeJS.ErrnoException) => {
  // Cổng bận: thoát với mã riêng để backend biết là có tiến trình khác giữ cổng.
  console.error(e.code === 'EADDRINUSE' ? `Cổng ${PORT} đang bận` : `Lỗi máy chủ: ${e.message}`);
  process.exit(e.code === 'EADDRINUSE' ? 3 : 1);
});

http.listen(PORT, HOST, () => {
  console.log(`Cầu nối TikTok: ws://${HOST}:${PORT}/ws/live · khoá Euler: ${EULER_API_KEY !== undefined ? 'có' : 'không (giới hạn miễn phí)'}`);
});

let dangTat = false;
const shutdown = async () => {
  if (dangTat) return;
  dangTat = true;
  await Promise.all([...channels.values()].map((ch) => ch.stop()));
  process.exit(0);
};
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
if (process.env.CAU_NOI_THEO_CHA === '1') {
  // Backend giữ đầu kia của stdin. Backend chết (kể cả bị giết thẳng tay) là stdin đóng.
  process.stdin.on('end', () => void shutdown());
  process.stdin.on('error', () => void shutdown());
  process.stdin.resume();
}
