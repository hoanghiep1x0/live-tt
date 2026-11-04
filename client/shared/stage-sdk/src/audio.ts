/** Tiếng nói và tiếng động của sân khấu.
 *
 *  Đây là nơi `Effect` thành ra âm thanh thật. Khoá API không có ở đây: sân khấu
 *  gửi câu sang `POST /s/tts`, backend gắn khoá rồi gọi nhà cung cấp.
 */

import type { Priority, SfxName } from '@live/contracts';

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

export interface VoiceCfg {
  enabled: boolean;
  /** Rỗng nghĩa là dùng giọng máy của trình duyệt. */
  provider: string;
  voice: string;
  speed: number;
  volume: number;
}

export const VOICE_MAC_DINH: VoiceCfg = {
  enabled: true,
  provider: '',
  voice: '',
  speed: 1,
  volume: 1,
};

/** Dài hơn thì nhà cung cấp cắt, mà đọc xong khán giả cũng quên mất chuyện gì. */
const MAX_TEXT = 400;
/** Hàng chờ dài hơn thì bỏ câu cũ nhất: tin cũ đọc lên lúc này là lạc đề. */
const MAX_HANG = 4;

interface Cho {
  text: string;
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

  noi(text: string, priority: Priority = 'normal'): void {
    const t = chuanHoa(text);
    if (t === '' || !this.cfg.enabled) return;

    if (priority === 'high') {
      // Câu quan trọng chen lên trước, nhưng không cắt ngang câu đang đọc —
      // cắt giữa chừng nghe như máy hỏng.
      this.hang.unshift({ text: t, priority });
    } else {
      this.hang.push({ text: t, priority });
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
        await this.doc(c.text);
      }
    } finally {
      this.dangChay = false;
    }
  }

  private async doc(text: string): Promise<void> {
    if (this.cfg.provider !== '' && this.cfg.voice !== '') {
      try {
        await this.docQuaApi(text);
        return;
      } catch (e) {
        // Nhà cung cấp hỏng thì vẫn phải đọc được, chứ không im bặt giữa live.
        console.warn('[giọng đọc] nhà cung cấp lỗi, dùng giọng máy:', e);
      }
    }
    await this.docBangMay(text);
  }

  private async docQuaApi(text: string): Promise<void> {
    const res = await fetch('/s/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: this.cfg.provider,
        voice: this.cfg.voice,
        text,
        speed: this.cfg.speed,
      }),
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

  /** Giọng máy của trình duyệt — dùng khi chưa cấu hình nhà cung cấp. */
  private async docBangMay(text: string): Promise<void> {
    if (typeof speechSynthesis === 'undefined') return;
    await new Promise<void>((xong) => {
      const u = new SpeechSynthesisUtterance(text);
      const vi = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('vi'));
      if (vi !== undefined) u.voice = vi;
      u.lang = 'vi-VN';
      u.rate = this.cfg.speed;
      u.volume = this.cfg.volume;
      u.onend = () => xong();
      u.onerror = () => xong();
      speechSynthesis.speak(u);
    });
  }
}
