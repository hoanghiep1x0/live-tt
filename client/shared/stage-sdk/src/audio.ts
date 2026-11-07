/** Tiếng nói và tiếng động của sân khấu.
 *
 *  Đây là nơi `Effect` thành ra âm thanh thật. Khoá API không có ở đây: sân khấu
 *  gửi câu sang `POST /s/tts`, backend gắn khoá rồi gọi nhà cung cấp.
 */

import { GIONG_XOAY, giongXoay, tachVai } from '@live/contracts';
import type { DoanDoc, Priority, SfxName } from '@live/contracts';
import { NHIP_MS, QuyenNoi } from './quyen-noi';
import { canBo, choChen, nghiTruoc, quaCu } from './hang-doc';
import type { MucDoc } from './hang-doc';

// ---- Tiếng động: tổng hợp, không cần file ----

let ctx: AudioContext | null = null;

function mayAm(): AudioContext | null {
  if (ctx === null) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Một tiếng sine với bao âm: lên nhanh 20 ms rồi tắt dần. */
function tone(ac: AudioContext, freq: number, start: number, dur: number, gain: number): void {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

/** Tiếng động của phòng.
 *
 *  Tổng hợp tại chỗ thay vì phát file: không có file nào phải tải, không lệ
 *  thuộc assets, và đổi bối cảnh cũng không phải đi kiếm bộ tiếng mới.
 *  Chuyển nguyên bốn tiếng của bản cũ; `fanfare` và `tick` là hai tiếng mới mà
 *  hợp đồng `Effect` có khai. */
export function playSfx(kind: SfxName, volume = 1): void {
  const ac = mayAm();
  if (ac === null || volume <= 0) return;
  const v = Math.min(1, volume);
  const t = ac.currentTime + 0.01;

  if (kind === 'gift') {
    // Chuông ngân ba tiếng.
    tone(ac, 880, t, 1.6, 0.18 * v);
    tone(ac, 1320, t + 0.12, 1.4, 0.12 * v);
    tone(ac, 1760, t + 0.24, 1.2, 0.08 * v);
  } else if (kind === 'sad') {
    // Hộp nhạc trầm buồn đi xuống, La thứ.
    [880, 784, 659, 587, 523, 440].forEach((f, i) => tone(ac, f, t + i * 0.42, 1.4, 0.07 * v));
    tone(ac, 220, t, 3, 0.05 * v);
  } else if (kind === 'comfort') {
    // Hợp âm ấm đi lên, Đô trưởng rải.
    [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, t + i * 0.16, 1.8, 0.08 * v));
    tone(ac, 262, t, 2.4, 0.05 * v);
  } else if (kind === 'fanfare') {
    // Kèn mừng ngắn: quãng năm rồi lên quãng tám.
    [523, 784, 1047].forEach((f, i) => tone(ac, f, t + i * 0.1, 0.9, 0.14 * v));
    tone(ac, 1568, t + 0.3, 1.4, 0.1 * v);
  } else if (kind === 'tick') {
    tone(ac, 2093, t, 0.12, 0.06 * v);
  } else {
    // 'join': một tiếng ting nhẹ.
    tone(ac, 1568, t, 0.5, 0.1 * v);
  }
}

// ---- Giọng đọc ----

/** Một nhân vật trong dàn giọng. Một phiên có nhiều nhân vật, mỗi người một giọng. */
export interface CastVoice {
  id: string;
  provider: string;
  voice: string;
  role: string;
}

export interface VoiceCfg {
  enabled: boolean;
  speed: number;
  volume: number;
  /** Id giọng dùng khi câu không nói rõ đọc bằng giọng nào. */
  default: string;
  cast: CastVoice[];
  /** Đa giọng: tính năng đọc bằng giọng chính của nó, `[id]` trong câu đổi
   *  giọng. Tắt là đơn giọng — cả phòng một giọng mặc định. */
  multi: boolean;
}

export const VOICE_MAC_DINH: VoiceCfg = {
  enabled: true,
  speed: 1,
  volume: 1,
  default: '',
  cast: [],
  multi: false,
};

/** Dài hơn thì nhà cung cấp cắt, mà đọc xong khán giả cũng quên mất chuyện gì. */
/** Phòng của trang đang mở, đọc từ đường dẫn `/d/<id>/`. Trang khác (quản lý,
 *  chạy thử) thì `undefined` — máy chủ chỉ không ghi sổ chi phí. */
function phongCuaTrang(): string | undefined {
  if (typeof location === 'undefined') return undefined;
  return /^\/d\/([a-z0-9-]+)\//.exec(location.pathname)?.[1];
}

const MAX_TEXT = 400;

interface Cho {
  /** Các đoạn của một câu, mỗi đoạn một giọng. Cả câu là một mục trong hàng
   *  chờ: bỏ thì bỏ cả câu, không bao giờ cắt cụt giữa lời thoại. */
  doan: DoanDoc[];
  priority: Priority;
  /** Mức trong hàng (`hang-doc.ts`): lời kể truyện đi trước câu chào. */
  muc: MucDoc;
  luc: number;
  /** Gọi đúng một lần khi câu BẮT ĐẦU phát (hay bị bỏ / hỏng) — để khung
   *  truyện đổi ảnh và chữ cùng lúc với giọng. */
  batDau?: (() => void) | undefined;
  /** Tiếng đã xin trước cho từng đoạn (lời kể): tới lượt là phát ngay. */
  tai?: Promise<ArrayBuffer>[] | undefined;
}

/** Tuỳ chọn của một câu đọc. */
export interface TuyDoc {
  /** Câu thuộc mạch truyện: đọc trước mọi câu chào, câu chào đang dài thì nhường. */
  truyen?: boolean;
  /** Câu nói với khách (chào, đáp): chen vào khoảng nghỉ NGAY SAU đoạn đang
   *  đọc, trước các đoạn kể còn chờ (`hang-doc.ts`). Không bao giờ đọc chồng
   *  lên lời kể — hai giọng cùng lúc là khách mất mạch truyện lẫn lời chào. */
  khach?: boolean;
  /** Gọi khi câu bắt đầu phát (xem `Cho.batDau`). */
  batDau?: () => void;
}

function motLan(f: (() => void) | undefined): (() => void) | undefined {
  if (f === undefined) return undefined;
  let da = false;
  return () => {
    if (da) return;
    da = true;
    f();
  };
}

/** Bỏ emoji trước khi đưa cho máy đọc, nếu không nó đọc luôn cả tên emoji. */
export function chuanHoa(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[‍️]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT);
}

/** Danh sách giọng máy. Lần đầu trình duyệt hay trả rỗng rồi mới nạp xong,
 *  nên chờ `voiceschanged` một chút trước khi kết luận máy không có giọng. */
function cacGiongMay(): Promise<SpeechSynthesisVoice[]> {
  const co = speechSynthesis.getVoices();
  if (co.length > 0) return Promise.resolve(co);
  return new Promise((xong) => {
    const het = setTimeout(() => xong(speechSynthesis.getVoices()), 1_000);
    speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        clearTimeout(het);
        xong(speechSynthesis.getVoices());
      },
      { once: true },
    );
  });
}

/** Mọi hàng đọc đang sống trong cửa sổ này — để mất quyền nói là tắt hết. */
const cacHang = new Set<HangGiong>();
let quyen: QuyenNoi | null = null;

/** Quyền đọc của cửa sổ này, dựng một lần khi có hàng đọc đầu tiên. Ngoài
 *  trình duyệt (test) thì không bàn với ai, cứ nói. */
function quyenNoi(): QuyenNoi | null {
  if (quyen !== null || typeof window === 'undefined') return quyen;
  const laObs =
    'obsstudio' in window || new URLSearchParams(location.search).get('obs') === '1';
  const bc = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('live-giong-doc');
  const kenh =
    bc === null
      ? null
      : {
          postMessage: (t: unknown) => bc.postMessage(t),
          nghe: (f: (t: unknown) => void) => {
            bc.onmessage = (e) => f(e.data);
          },
        };
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const q = new QuyenNoi(
    kenh,
    id,
    laObs,
    () => cacHang.forEach((h) => h.dung()),
    (f, ms) => {
      const h = setTimeout(f, ms);
      return () => clearTimeout(h);
    },
    () => Date.now(),
    () => document.visibilityState === 'visible',
  );
  q.gianh();
  setInterval(() => q.nhip(), NHIP_MS);
  // Người vận hành bấm vào cửa sổ nào thì cửa sổ đó nói (trừ khi có OBS).
  window.addEventListener('focus', () => q.gianh());
  window.addEventListener('pointerdown', () => q.gianh(), { capture: true });
  window.addEventListener('pagehide', () => q.tra());
  quyen = q;
  return q;
}

/** Cửa sổ này có đang giữ quyền nói không (`quyen-noi.ts`). Mở một phòng ở
 *  nhiều cửa sổ (OBS + bảng xem) thì chỉ cửa sổ đang nói mới nên ghi sổ sách
 *  của phòng — không thì mỗi bình luận được cộng hai lần. Ngoài trình duyệt
 *  (test) thì luôn có. */
export function duocNoi(): boolean {
  const q = quyenNoi();
  return q === null || q.duocNoi();
}

/** Hàng chờ đọc. Một câu một lúc, không chồng tiếng — và cả máy chỉ một cửa
 *  sổ được đọc (`quyen-noi.ts`). */
export class HangGiong {
  private hang: Cho[] = [];
  private dangChay = false;
  private dungLai = false;
  /** Tăng mỗi lần `dung()`: câu nào tải xong tiếng sau mốc đó thì không phát —
   *  không thì bấm dừng giữa lúc đang tải, câu vẫn bật lên vài giây sau. */
  private theHe = 0;
  /** Giọng câu trước của "Tự đổi giọng", để câu sau không lặp liền. */
  private giongTruoc = '';
  private am: { ctx: AudioContext; src: AudioBufferSourceNode } | null = null;
  private cfg: VoiceCfg = VOICE_MAC_DINH;
  /** Mức câu vừa đọc xong — cho nhịp nghỉ giữa lời kể và câu chào. */
  private mucTruoc: MucDoc | null = null;


  constructor() {
    cacHang.add(this);
    quyenNoi();
  }

  datCauHinh(c: VoiceCfg): void {
    this.cfg = c;
    if (!c.enabled) this.dung();
  }

  /** `daGiong`: đọc nhiều giọng theo dấu `[id]` cho riêng câu này — lời kể
   *  của MC. Bỏ trống thì theo cài đặt Đa giọng của dàn. `tuy`: câu thuộc mạch
   *  truyện, và hàm gọi lúc câu bắt đầu phát. */
  noi(text: string, priority: Priority = 'normal', voiceId = '', daGiong?: boolean, tuy: TuyDoc = {}): void {
    const batDau = motLan(tuy.batDau);
    // Không đọc được (tắt, hay cửa sổ khác đang giữ quyền nói): khung truyện
    // vẫn đổi ngay, đừng để nó chờ một giọng sẽ không bao giờ tới.
    if (!this.cfg.enabled || (quyen !== null && !quyen.duocNoi())) {
      batDau?.();
      return;
    }
    // "Tự đổi giọng": mỗi câu một giọng khác trong dàn. Chỉ khi phòng bật đa
    // giọng — đơn giọng là cả phòng một giọng, như người vận hành đã chọn.
    let giong = voiceId;
    if (giong === GIONG_XOAY) {
      giong = this.cfg.multi ? giongXoay(this.cfg.cast.map((g) => g.id), this.giongTruoc, Math.random) : '';
      this.giongTruoc = giong;
    }
    const doan = tachVai(text, giong, daGiong ?? this.cfg.multi)
      .map((d) => ({ text: chuanHoa(d.text), voice: d.voice }))
      .filter((d) => d.text !== '');
    if (doan.length === 0) {
      batDau?.();
      return;
    }

    // Câu nói với khách chen vào khoảng nghỉ sau đoạn đang đọc (mức `khach`),
    // không đọc chồng: một giọng một lúc.
    const muc: MucDoc =
      tuy.truyen === true ? 'truyen' : tuy.khach === true ? 'khach' : priority === 'high' ? 'cao' : 'thuong';
    const cho: Cho = { doan, priority, muc, luc: Date.now(), batDau };
    // Lời kể và câu với khách: xin tiếng ngay lúc vào hàng — tới lượt là phát
    // liền. Không thì giữa đoạn kể và câu chào hở ba, bốn giây chờ tải tiếng,
    // phòng như bị đứng.
    if ((muc === 'truyen' || muc === 'khach') && this.cfg.cast.length > 0) {
      cho.tai = doan.map((d) => {
        const t = this.taiTieng(d.text, d.voice);
        t.catch(() => undefined);
        return t;
      });
    }
    // Câu quan trọng chen lên trước, nhưng lời kể vẫn đứng đầu.
    this.hang.splice(choChen(this.hang, muc), 0, cho);
    for (let i = canBo(this.hang); i >= 0; i = canBo(this.hang)) {
      // Câu chào cũ bị đẩy ra khỏi hàng: bỏ luôn chữ.
      this.hang.splice(i, 1);
    }
    void this.chay();
  }

  /** Đang đọc hoặc còn câu chờ. Lõi module đọc qua `ctx.dangNoi` để chạy theo
   *  nhịp giọng — vd lớp học dừng đồng hồ trong lúc cô đọc đề. */
  ban(): boolean {
    return this.dangChay || this.hang.length > 0;
  }

  /** Dừng hẳn: câu đang đọc tắt, hàng chờ bỏ. Bản cũ thiếu đúng hàm này, nên
   *  tắt đọc rồi mà vẫn còn nghe tiếng một lúc. */
  dung(): void {
    this.dungLai = true;
    this.theHe += 1;
    // Câu bị bỏ vẫn báo "bắt đầu": khung truyện đổi ngay, không chờ giọng
    // sẽ không bao giờ tới.
    const bo = this.hang;
    this.hang = [];
    for (const c of bo) c.batDau?.();
    if (this.am !== null) {
      try {
        this.am.src.stop();
      } catch {
        // Đã dừng rồi thì thôi.
      }
      this.am = null;
    }
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    this.dungLai = false;
  }

  private async chay(): Promise<void> {
    if (this.dangChay) return;
    this.dangChay = true;
    try {
      while (this.hang.length > 0 && !this.dungLai && this.cfg.enabled) {
        const c = this.hang.shift();
        if (c === undefined) break;
        // Câu chào chờ quá lâu: bỏ hẳn, KHÔNG hiện chữ — chữ mà không có giọng
        // là lệch nhịp (`quaCu` chỉ bỏ câu chào, không bao giờ bỏ lời kể).
        if (quaCu(c, Date.now())) continue;
        // Nhịp nghỉ giữa lời kể và câu chào sau nó.
        const nghi = nghiTruoc(this.mucTruoc, c.muc);
        if (nghi > 0) {
          await new Promise((r) => setTimeout(r, nghi));
          // Trong lúc nghỉ có lời kể mới chen lên đầu hàng: đọc lời kể trước —
          // trừ câu với khách, nó vốn được chen vào đúng khoảng nghỉ này.
          const dau = this.hang[0];
          if (dau !== undefined && dau.muc === 'truyen' && c.muc !== 'truyen' && c.muc !== 'khach') {
            this.hang.splice(choChen(this.hang, c.muc), 0, c);
            continue;
          }
        }
        for (const [i, d] of c.doan.entries()) {
          if (this.dungLai || !this.cfg.enabled) break;
          await this.doc(d.text, d.voice, i === 0 ? c.batDau : undefined, c.tai?.[i]);
        }
        c.batDau?.();
        this.mucTruoc = c.muc;
      }
    } finally {
      this.dangChay = false;
    }
  }

  private async doc(text: string, voiceId: string, batDau?: () => void, tai?: Promise<ArrayBuffer>): Promise<void> {
    if (this.cfg.cast.length > 0) {
      // Đã có dàn giọng thì chỉ đọc bằng dàn. Giọng được gọi hỏng thì máy chủ
      // tự chuyển sang giọng đọc được kế tiếp trong dàn, như chuỗi giọng của
      // bản cũ; hỏng hết thì im. KHÔNG lui về giọng máy: máy không có giọng
      // tiếng Việt là nó đọc chữ Việt bằng giọng tiếng Anh, lên sóng còn tệ
      // hơn im lặng.
      try {
        await this.docQuaApi(text, voiceId, batDau, tai);
      } catch (e) {
        batDau?.();
        console.warn('[giọng đọc] dàn giọng không đọc được câu này:', e);
      }
      return;
    }
    batDau?.();
    await this.docBangMay(text);
  }

  /** Xin tiếng của một câu từ máy chủ. */
  private async taiTieng(text: string, voiceId: string): Promise<ArrayBuffer> {
    const res = await fetch('/s/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // `designId`: máy chủ ghi câu này vào sổ chi phí của đúng phòng.
      body: JSON.stringify({ text, voiceId, speed: this.cfg.speed, designId: phongCuaTrang() }),
    });
    if (!res.ok) {
      const j: unknown = await res.json().catch(() => null);
      const m = (j as { error?: string } | null)?.error;
      throw new Error(m ?? `máy chủ trả ${res.status}`);
    }
    return res.arrayBuffer();
  }

  /** Chỉ gửi id giọng: việc tra ra nhà cung cấp nào, giọng nào là của backend.
   *  Sân khấu không cần biết dàn giọng được cấu hình ra sao. `tai`: tiếng đã
   *  xin trước. `batDau`: gọi đúng lúc tiếng bắt đầu phát. */
  private async docQuaApi(
    text: string,
    voiceId: string,
    batDau?: () => void,
    tai?: Promise<ArrayBuffer>,
  ): Promise<void> {
    const theHe = this.theHe;
    const bytes = await (tai ?? this.taiTieng(text, voiceId));
    const ac = mayAm();
    if (ac === null) throw new Error('trình duyệt không cho mở máy âm');

    const buf = await ac.decodeAudioData(bytes);
    // Đã bấm dừng (hay mất quyền nói) trong lúc tải: bỏ câu này.
    if (theHe !== this.theHe) {
      batDau?.();
      return;
    }
    await new Promise<void>((xong) => {
      const src = ac.createBufferSource();
      src.buffer = buf;
      // Nén nhẹ để câu to câu nhỏ nghe đều nhau trên sóng.
      const nen = ac.createDynamicsCompressor();
      nen.threshold.value = -30;
      nen.knee.value = 10;
      nen.ratio.value = 6;
      const g = ac.createGain();
      g.gain.value = Math.min(1.8, 1.8 * this.cfg.volume);
      src.connect(nen).connect(g).connect(ac.destination);
      src.onended = () => {
        this.am = null;
        xong();
      };
      this.am = { ctx: ac, src };
      src.start();
      batDau?.();
    });
  }

  /** Giọng máy của trình duyệt — dùng khi chưa cấu hình dàn giọng, và CHỈ khi
   *  máy có giọng tiếng Việt. */
  private async docBangMay(text: string): Promise<void> {
    if (typeof speechSynthesis === 'undefined') return;
    const vi = (await cacGiongMay()).find((v) => v.lang.toLowerCase().startsWith('vi'));
    if (vi === undefined) {
      console.warn('[giọng đọc] máy không có giọng tiếng Việt và chưa có dàn giọng — không đọc');
      return;
    }
    await new Promise<void>((xong) => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = vi;
      u.lang = 'vi-VN';
      u.rate = this.cfg.speed;
      u.volume = this.cfg.volume;
      u.onend = () => xong();
      u.onerror = () => xong();
      speechSynthesis.speak(u);
    });
  }
}
