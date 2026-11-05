/** Tiếng nói và tiếng động của sân khấu.
 *
 *  Đây là nơi `Effect` thành ra âm thanh thật. Khoá API không có ở đây: sân khấu
 *  gửi câu sang `POST /s/tts`, backend gắn khoá rồi gọi nhà cung cấp.
 */

import { tachVai } from '@live/contracts';
import type { DoanDoc, Priority, SfxName } from '@live/contracts';

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
const MAX_TEXT = 400;
/** Hàng chờ dài hơn thì bỏ câu cũ nhất: tin cũ đọc lên lúc này là lạc đề. */
const MAX_HANG = 4;

interface Cho {
  /** Các đoạn của một câu, mỗi đoạn một giọng. Cả câu là một mục trong hàng
   *  chờ: bỏ thì bỏ cả câu, không bao giờ cắt cụt giữa lời thoại. */
  doan: DoanDoc[];
  priority: Priority;
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

/** Hàng chờ đọc. Một câu một lúc, không chồng tiếng. */
export class HangGiong {
  private hang: Cho[] = [];
  private dangChay = false;
  private dungLai = false;
  private am: { ctx: AudioContext; src: AudioBufferSourceNode } | null = null;
  private cfg: VoiceCfg = VOICE_MAC_DINH;

  datCauHinh(c: VoiceCfg): void {
    this.cfg = c;
    if (!c.enabled) this.dung();
  }

  noi(text: string, priority: Priority = 'normal', voiceId = ''): void {
    if (!this.cfg.enabled) return;
    const doan = tachVai(text, voiceId, this.cfg.multi)
      .map((d) => ({ text: chuanHoa(d.text), voice: d.voice }))
      .filter((d) => d.text !== '');
    if (doan.length === 0) return;

    if (priority === 'high') {
      // Câu quan trọng chen lên trước, nhưng không cắt ngang câu đang đọc —
      // cắt giữa chừng nghe như máy hỏng.
      this.hang.unshift({ doan, priority });
    } else {
      this.hang.push({ doan, priority });
    }
    while (this.hang.length > MAX_HANG) {
      // Bỏ câu thường cũ nhất; câu `high` được giữ.
      const i = this.hang.findIndex((x) => x.priority !== 'high');
      this.hang.splice(i < 0 ? 0 : i, 1);
    }
    void this.chay();
  }

  /** Dừng hẳn: câu đang đọc tắt, hàng chờ bỏ. Bản cũ thiếu đúng hàm này, nên
   *  tắt đọc rồi mà vẫn còn nghe tiếng một lúc. */
  dung(): void {
    this.dungLai = true;
    this.hang = [];
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
        for (const d of c.doan) {
          if (this.dungLai || !this.cfg.enabled) break;
          await this.doc(d.text, d.voice);
        }
      }
    } finally {
      this.dangChay = false;
    }
  }

  private async doc(text: string, voiceId: string): Promise<void> {
    if (this.cfg.cast.length > 0) {
      // Đã có dàn giọng thì chỉ đọc bằng dàn. Giọng được gọi hỏng thì máy chủ
      // tự chuyển sang giọng đọc được kế tiếp trong dàn, như chuỗi giọng của
      // bản cũ; hỏng hết thì im. KHÔNG lui về giọng máy: máy không có giọng
      // tiếng Việt là nó đọc chữ Việt bằng giọng tiếng Anh, lên sóng còn tệ
      // hơn im lặng.
      try {
        await this.docQuaApi(text, voiceId);
      } catch (e) {
        console.warn('[giọng đọc] dàn giọng không đọc được câu này:', e);
      }
      return;
    }
    await this.docBangMay(text);
  }

  /** Chỉ gửi id giọng: việc tra ra nhà cung cấp nào, giọng nào là của backend.
   *  Sân khấu không cần biết dàn giọng được cấu hình ra sao. */
  private async docQuaApi(text: string, voiceId: string): Promise<void> {
    const res = await fetch('/s/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, voiceId, speed: this.cfg.speed }),
    });
    if (!res.ok) {
      const j: unknown = await res.json().catch(() => null);
      const m = (j as { error?: string } | null)?.error;
      throw new Error(m ?? `máy chủ trả ${res.status}`);
    }

    const bytes = await res.arrayBuffer();
    const ac = mayAm();
    if (ac === null) throw new Error('trình duyệt không cho mở máy âm');

    const buf = await ac.decodeAudioData(bytes);
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
