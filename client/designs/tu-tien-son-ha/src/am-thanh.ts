/** Tiếng hiệu ứng tổng hợp bằng WebAudio — không cần file. Nhỏ và thưa để không lấn giọng MC. */

let ac: AudioContext | null = null;

function lay(): AudioContext | null {
  if (ac === null) {
    try {
      ac = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ac.state === 'suspended') void ac.resume().catch(() => undefined);
  return ac;
}

function not(tan: number, dai: number, kieu: OscillatorType, to: number, luc = 0, truot?: number) {
  const a = lay();
  if (a === null) return;
  const t = a.currentTime + luc;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = kieu;
  o.frequency.setValueAtTime(tan, t);
  if (truot !== undefined) o.frequency.exponentialRampToValueAtTime(truot, t + dai);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(to, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dai);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dai + 0.05);
}

function on(dai: number, to: number, loc: number) {
  const a = lay();
  if (a === null) return;
  const n = Math.floor(a.sampleRate * dai);
  const b = a.createBuffer(1, n, a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.5);
  const s = a.createBufferSource();
  s.buffer = b;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = loc;
  const g = a.createGain();
  g.gain.value = to;
  s.connect(f).connect(g).connect(a.destination);
  s.start();
}

export type Tieng = 'cau' | 'dap' | 'dot-pha' | 'set' | 'trung' | 'lu' | 'yeu' | 'qua' | 'trong' | 'trong-lon';

/** Một tiếng trống đồng: nhịp trầm trượt xuống + tiếng da bịt ngắn. */
function trong(luc: number, to: number) {
  not(78, 0.55, 'sine', 0.22 * to, luc, 42);
  not(156, 0.18, 'triangle', 0.05 * to, luc, 90);
  const a = lay();
  if (a !== null) setTimeout(() => on(0.12, 0.18 * to, 1200), luc * 1000);
}

export function phat(tieng: Tieng) {
  switch (tieng) {
    case 'cau':
      // Tiếng chuông chùa nhẹ: mở câu hỏi.
      not(196, 2.2, 'sine', 0.12);
      not(392, 1.6, 'sine', 0.05);
      break;
    case 'dap':
      not(784, 0.25, 'triangle', 0.08);
      not(1175, 0.4, 'triangle', 0.07, 0.12);
      break;
    case 'dot-pha':
      [523, 659, 784, 1047].forEach((f, i) => not(f, 0.5, 'triangle', 0.08, i * 0.09));
      break;
    case 'set':
      on(1.6, 0.5, 900);
      break;
    case 'trung':
      not(140, 0.18, 'square', 0.04, 0, 70);
      break;
    case 'lu':
      on(2.5, 0.25, 500);
      not(110, 1.2, 'sawtooth', 0.04, 0, 70);
      break;
    case 'yeu':
      not(98, 1.4, 'sawtooth', 0.07, 0, 49);
      not(103, 1.4, 'sawtooth', 0.05, 0, 51);
      break;
    case 'qua':
      not(1319, 0.6, 'sine', 0.06);
      not(1760, 0.8, 'sine', 0.04, 0.1);
      break;
    case 'trong':
      trong(0, 1);
      break;
    case 'trong-lon':
      // Ba hồi trống dồn: đấu tướng, đảo chiều, quyết chiến.
      trong(0, 1.2);
      trong(0.18, 1);
      trong(0.36, 1.4);
      break;
  }
}
