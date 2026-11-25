/** Yêu tinh "sống": một tranh 2D vẽ lên lưới WebGL rồi uốn lưới theo thời gian — thân thở phập phồng, đuôi,
 *  vây, tóc, cánh (phần xa tâm) uốn lượn như sóng chạy, đầu và thân khẽ xoay qua lại như có chiều sâu (phần
 *  giữa tranh dịch nhiều hơn rìa), phần rìa trễ lại phía sau khi cả con di chuyển, chỗ sáng (mắt, ngọc, tà
 *  khí) lấp lánh. Theo trạng thái trận: tụ lực thì co mình ngả ra sau và run, ra chiêu thì chồm tới phía
 *  người chơi, trúng đòn thì giật lùi, Cuồng Bạo thì quẫy mạnh và nhanh, ửng đỏ.
 *
 *  Mọi trạng thái đều được LÀM MƯỢT ở đây (tiến dần tới đích theo thời gian), nơi gọi chỉ cần đưa đích —
 *  không có chuyển động nào bật / tắt tức thì, nên không khựng như robot.
 *
 *  Canvas rộng hơn tranh (`LE` mỗi bên) để lúc chồm tới không bị cắt. Máy không có WebGL thì trả null —
 *  nơi gọi giữ ảnh <img> tĩnh như cũ. */

export interface TrangThaiYeu {
  /** 0–1: đang tụ lực trước khi ra chiêu. */
  tu: number;
  /** 0–1–0: nhịp chồm tới khi ra chiêu. */
  lao: number;
  /** 0–1: vừa trúng đòn. */
  trung: number;
  /** 0 hoặc 1: Cuồng Bạo. */
  cuong: number;
  /** Vận tốc cả con trên màn, tính bằng "bề ngang tranh mỗi giây" — phần rìa trễ lại ngược hướng này. */
  vx: number;
  vy: number;
}

export interface YeuDong {
  el: HTMLCanvasElement;
  dat(anh: HTMLImageElement): void;
  ve(t: number, s: TrangThaiYeu): void;
}

/** Số ô lưới mỗi chiều: càng dày uốn càng mượt. */
const LUOI = 56;
/** Lề quanh tranh (theo phần khung canvas) để chồm tới, quẫy mạnh không chạm mép. */
export const LE = 0.125;
const CO = 900;

const VS = `
attribute vec2 aP;
uniform float uT, uNhanh, uManh, uTu, uLao, uTrung, uLe;
uniform vec2 uV, uHuong;
varying vec2 vUv;
void main() {
  vec2 p = aP;
  vec2 c = vec2(0.5, 0.52);
  vec2 d = p - c;
  float r = length(d);
  // w: phần càng xa tâm (đuôi, vây, cánh, tóc) càng uốn nhiều. g: phần giữa (đầu, ngực) "gần" người xem.
  float w = smoothstep(0.06, 0.55, r);
  float g = 1.0 - smoothstep(0.0, 0.42, r);
  float t = uT * uNhanh;

  // Thở: ngực nở ra, nhịp không đều tuyệt đối (hai sóng lệch tần số).
  float tho = sin(t * 2.1) * 0.020 + sin(t * 1.3 + 0.7) * 0.008;
  vec2 q = c + d * (1.0 + tho * (1.0 - 0.5 * w));

  // Xoay đầu / nghiêng thân giả chiều sâu: phần giữa dịch nhiều hơn rìa. Ra chiêu thì cúi về người chơi.
  float xoay = sin(t * 0.62) * 0.6 + sin(t * 1.07 + 2.1) * 0.4;
  float ngua = sin(t * 0.81 + 1.2) * 0.6 + sin(t * 0.47) * 0.4;
  q.x += xoay * 0.020 * g;
  q.y += (ngua * 0.012 - 0.015 * uTu) * g;
  q += uHuong * 0.43 * uLao * g;

  // Sóng chạy dọc thân ra đuôi, vây; thêm lớp rung nhanh ở chóp.
  q.x += sin(t * 1.7 + p.y * 6.0 + sin(t * 0.4) * 1.5) * 0.022 * w * uManh;
  q.y += sin(t * 2.3 + p.x * 7.0 + 1.3) * 0.017 * w * uManh;
  q += vec2(sin(t * 5.1 + p.y * 14.0), cos(t * 4.4 + p.x * 12.0)) * 0.006 * w * w * uManh;

  // Trễ theo quán tính: cả con dịch chuyển thì phần rìa bị kéo lại phía sau.
  q -= uV * 0.11 * w;

  // Tụ lực: co mình, ngả ra sau, run (sóng nhanh, không phải số ngẫu nhiên).
  q = c + (q - c) * (1.0 - 0.08 * uTu);
  q.y -= 0.035 * uTu;
  q.x += (sin(uT * 47.0) * 0.6 + sin(uT * 71.0) * 0.4) * 0.006 * uTu;
  // Ra chiêu: chồm tới (to ra, sà xuống phía người chơi), phần giữa lao trước.
  q = c + (q - c) * (1.0 + 0.16 * uLao + 0.05 * uLao * g);
  q += uHuong * uLao;
  // Trúng đòn: giật lùi, rìa văng theo.
  q.y -= 0.028 * uTrung;
  q.x += sin(uT * 55.0) * 0.010 * uTrung * (0.4 + w);
  // Thu tranh vào giữa canvas, chừa lề.
  q = q * (1.0 - 2.0 * uLe) + uLe;
  gl_Position = vec4(q.x * 2.0 - 1.0, 1.0 - q.y * 2.0, 0.0, 1.0);
  vUv = p;
}`;

const FS = `
precision mediump float;
uniform sampler2D uTex;
// uT dùng chung với shader đỉnh (mặc định highp): phải khai cùng độ chính xác, không thì không nối được.
uniform highp float uT;
uniform float uDo, uSang, uLoe;
varying vec2 vUv;
void main() {
  // Lấp lánh nhẹ như tà khí lưu chuyển trên thân.
  vec2 uv = vUv + vec2(sin(vUv.y * 40.0 + uT * 3.0), cos(vUv.x * 36.0 + uT * 2.6)) * 0.0012;
  vec4 c = texture2D(uTex, uv);
  float a = max(c.a, 0.0001);
  vec3 m = c.rgb / a;
  // Chỗ vốn sáng rực (mắt, ngọc, tia tà khí) nhịp sáng như đang cháy: mắt nhìn "có hồn".
  float sang = max(m.r, max(m.g, m.b));
  float ruc = smoothstep(0.72, 0.98, sang);
  m += m * ruc * (0.22 + 0.18 * sin(uT * 3.3 + vUv.x * 9.0) + 0.5 * uLoe);
  m *= uSang;
  m = mix(m, m * vec3(1.35, 0.62, 0.5), uDo);
  gl_FragColor = vec4(m * c.a, c.a);
}`;

function bien(gl: WebGLRenderingContext, loai: number, nguon: string): WebGLShader | null {
  const s = gl.createShader(loai);
  if (s === null) return null;
  gl.shaderSource(s, nguon);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

/** `huong`: hướng chồm tới khi ra chiêu, theo phần khung tranh — mặc định sà xuống phía người chơi (yêu tinh);
 *  hai vị thần Đại Chiến thì vươn ngang về phía đối thủ. */
export function taoYeuDong(huong: readonly [number, number] = [0, 0.07]): YeuDong | null {
  const el = document.createElement('canvas');
  el.width = el.height = CO;
  el.className = 'sh-yeu-dong';
  const gl = el.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
  if (gl === null) return null;
  const vs = bien(gl, gl.VERTEX_SHADER, VS);
  const fs = bien(gl, gl.FRAGMENT_SHADER, FS);
  const ct = gl.createProgram();
  if (vs === null || fs === null || ct === null) return null;
  gl.attachShader(ct, vs);
  gl.attachShader(ct, fs);
  gl.linkProgram(ct);
  if (!gl.getProgramParameter(ct, gl.LINK_STATUS)) return null;
  gl.useProgram(ct);

  // Lưới (LUOI+1)² đỉnh, hai tam giác mỗi ô.
  const dinh = new Float32Array((LUOI + 1) * (LUOI + 1) * 2);
  let k = 0;
  for (let j = 0; j <= LUOI; j++) {
    for (let i = 0; i <= LUOI; i++) {
      dinh[k++] = i / LUOI;
      dinh[k++] = j / LUOI;
    }
  }
  const chi = new Uint16Array(LUOI * LUOI * 6);
  k = 0;
  for (let j = 0; j < LUOI; j++) {
    for (let i = 0; i < LUOI; i++) {
      const a = j * (LUOI + 1) + i;
      const b = a + 1;
      const c = a + LUOI + 1;
      const d = c + 1;
      chi.set([a, b, c, b, d, c], k);
      k += 6;
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, dinh, gl.STATIC_DRAW);
  const aP = gl.getAttribLocation(ct, 'aP');
  gl.enableVertexAttribArray(aP);
  gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, chi, gl.STATIC_DRAW);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const u = (ten: string) => gl.getUniformLocation(ct, ten);
  const uT = u('uT');
  const uNhanh = u('uNhanh');
  const uManh = u('uManh');
  const uTu = u('uTu');
  const uLao = u('uLao');
  const uTrung = u('uTrung');
  const uLe = u('uLe');
  const uDo = u('uDo');
  const uSang = u('uSang');
  const uLoe = u('uLoe');
  const uV = u('uV');
  gl.uniform1f(uLe, LE);
  gl.uniform2f(u('uHuong'), huong[0], huong[1]);
  let co = false;

  // Trạng thái đã làm mượt. `pha` là đồng hồ riêng của sóng: tốc độ đổi (Cuồng Bạo nhanh hơn) thì đồng hồ
  // chạy nhanh dần chứ không nhảy pha — nhân thẳng thời gian với tốc độ sẽ làm cả con giật một cái.
  const m = { tu: 0, lao: 0, trung: 0, cuong: 0, vx: 0, vy: 0 };
  let tTruoc = -1;
  let pha = 0;
  /** Tiến `a` về `b`: lên với tốc độ `len`/giây, xuống với `xuong`/giây (hàm mũ, không phụ thuộc số khung hình). */
  const toi = (a: number, b: number, len: number, xuong: number, dt: number) => a + (b - a) * (1 - Math.exp(-(b > a ? len : xuong) * dt));

  return {
    el,
    dat(anh) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, anh);
      co = true;
    },
    ve(t, s) {
      if (!co) return;
      const dt = tTruoc < 0 ? 0.016 : Math.min(0.1, Math.max(0, t - tTruoc));
      tTruoc = t;
      m.tu = toi(m.tu, s.tu, 7, 9, dt);
      m.lao = toi(m.lao, s.lao, 22, 7, dt);
      m.trung = toi(m.trung, s.trung, 40, 9, dt);
      m.cuong = toi(m.cuong, s.cuong, 1.6, 1.6, dt);
      m.vx = toi(m.vx, s.vx, 6, 6, dt);
      m.vy = toi(m.vy, s.vy, 6, 6, dt);
      pha += dt * (1 + 0.7 * m.cuong);
      gl.viewport(0, 0, CO, CO);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uT, pha);
      gl.uniform1f(uNhanh, 1);
      gl.uniform1f(uManh, 1 + 0.9 * m.cuong + 0.4 * m.tu);
      gl.uniform1f(uTu, m.tu);
      gl.uniform1f(uLao, m.lao);
      gl.uniform1f(uTrung, m.trung);
      gl.uniform2f(uV, Math.max(-1.5, Math.min(1.5, m.vx)), Math.max(-1.5, Math.min(1.5, m.vy)));
      gl.uniform1f(uDo, 0.22 * m.cuong);
      gl.uniform1f(uLoe, Math.min(1, m.tu + m.lao));
      gl.uniform1f(uSang, 1 + 0.05 * Math.sin(pha * 2.1) + 0.22 * m.tu + 0.3 * m.trung);
      gl.drawElements(gl.TRIANGLES, chi.length, gl.UNSIGNED_SHORT, 0);
    },
  };
}
