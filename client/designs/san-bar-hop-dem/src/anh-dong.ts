// Nhân vật ảnh động (GIF / WebP động) đứng trên sàn: tấm ảnh dựng đứng, chân chạm sàn, luôn quay về camera, chạy đúng
// các khung của ảnh. Có ảnh nhiều góc (chéo, nghiêng, sau) thì đổi ảnh theo hướng camera nhìn người đó — như sprite 8
// hướng của game cũ: trông như 3D mà giữ nguyên nét vẽ (ChatGPT, họa sĩ). Góc bên kia lấy bằng lật gương.
// Nhân vật có nhiều bộ đồ (`NguoiAnh`): mỗi bộ một bộ ảnh nhiều góc, đổi bộ thì chớp sáng rồi mờ chéo sang bộ mới.
// Thiết kế sàn bar nào cũng có một bản giống hệt (như canh.ts).
import * as THREE from 'three';
import type { AnhGoc, NguoiAnh } from '@live/contracts';

interface AnhDaGiai {
  /** Số khung. */
  n: number;
  /** Thời gian mỗi khung (giây). */
  tre: number[];
  /** Cỡ khung đã cắt sát người, đã thu theo `CAO_TOI_DA` (px). */
  rong: number;
  cao: number;
  /** Khung `i` nếu đã giải; chưa thì bắt đầu giải và trả `null` (gọi lại khung hình sau). */
  khung(i: number): ImageBitmap | null;
}

/** Ảnh góc chéo / nghiêng vẽ người quay sang TRÁI màn hình (thấy bên trái người đó). Ảnh vẽ quay phải thì đổi -1. */
const HUONG_VE = 1;

const daGiai = new Map<string, Promise<AnhDaGiai | null>>();

/** Khung vẽ ra cao tối đa chừng này px, cắt sát người — đủ nét cho cảnh cận trên màn dọc 1080×1920. */
const CAO_TOI_DA = 1024;
/** Số khung đã giải giữ lại mỗi ảnh. Giải hết sẵn 64 khung × 8 góc ở cỡ này là gần 1 GB một người — máy phát live
 *  không chịu nổi; nên giữ dữ liệu nén, khung nào sắp chiếu thì giải khung đó (giải trước một khung). */
const GIU = 12;

type BoGiai = {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null };
  decode(o: { frameIndex: number }): Promise<{ image: VideoFrame }>;
  close(): void;
};

/** Vùng alpha > 20 của một khung (ảnh thu nhỏ `t` lần), gộp vào `hop` [x0, y0, x1, y1] theo px gốc. */
function gopHop(anh: ImageBitmap, t: number, g: CanvasRenderingContext2D, hop: number[]): void {
  const w = anh.width, h = anh.height;
  g.canvas.width = w; g.canvas.height = h;
  g.drawImage(anh, 0, 0);
  const d = g.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3]! > 20) {
        if (x * t < hop[0]!) hop[0] = x * t; if ((x + 1) * t > hop[2]!) hop[2] = (x + 1) * t;
        if (y * t < hop[1]!) hop[1] = y * t; if ((y + 1) * t > hop[3]!) hop[3] = (y + 1) * t;
      }
    }
  }
}

function giai(url: string): Promise<AnhDaGiai | null> {
  if (!daGiai.has(url)) {
    daGiai.set(url, (async () => {
      const r = await fetch(url);
      if (!r.ok) return null;
      const kieu = r.headers.get('content-type') ?? (url.endsWith('.gif') ? 'image/gif' : 'image/webp');
      const W = window as unknown as { ImageDecoder?: new (o: { data: ArrayBuffer; type: string }) => BoGiai };
      if (W.ImageDecoder === undefined) {
        // trình duyệt không có ImageDecoder: đứng yên ở khung đầu
        const b = await createImageBitmap(await r.blob());
        return { n: 1, tre: [1e9], rong: b.width, cao: b.height, khung: () => b };
      }
      // khung giải ra đã ghép đủ (không phải mảnh vá của GIF)
      const dec = new W.ImageDecoder({ data: await r.arrayBuffer(), type: kieu });
      await dec.tracks.ready;
      const n = dec.tracks.selectedTrack?.frameCount ?? 1;
      // lượt đầu: thời gian từng khung + vùng có hình chung (đo trên ảnh thu nhỏ 4 lần — chỉ cần biên)
      const tre: number[] = [], hop = [Infinity, Infinity, -1, -1];
      const g = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
      let rongGoc = 0, caoGoc = 0;
      for (let i = 0; i < n; i++) {
        const { image } = await dec.decode({ frameIndex: i });
        rongGoc = image.displayWidth; caoGoc = image.displayHeight;
        const nho = await createImageBitmap(image, { resizeWidth: Math.ceil(rongGoc / 4), resizeHeight: Math.ceil(caoGoc / 4) });
        gopHop(nho, 4, g, hop);
        nho.close();
        tre.push(Math.max(0.03, (image.duration ?? 100_000) / 1e6));
        image.close();
      }
      const [x0, y0] = hop[2]! < 0 ? [0, 0] : [Math.max(0, hop[0]! - 4), Math.max(0, hop[1]! - 4)];
      const [x1, y1] = hop[2]! < 0 ? [rongGoc, caoGoc] : [Math.min(rongGoc, hop[2]! + 4), Math.min(caoGoc, hop[3]! + 4)];
      const s = Math.min(1, CAO_TOI_DA / (y1 - y0));
      const rong = Math.round((x1 - x0) * s), cao = Math.round((y1 - y0) * s);
      // khung đã giải (Map giữ thứ tự dùng gần nhất), khung đang giải; giải lần lượt từng khung một
      const da = new Map<number, ImageBitmap>(), dangGiai = new Set<number>();
      let hang = Promise.resolve();
      const giaiKhung = (i: number): void => {
        if (da.has(i) || dangGiai.has(i)) return;
        dangGiai.add(i);
        hang = hang.then(async () => {
          const { image } = await dec.decode({ frameIndex: i });
          const b = await createImageBitmap(image, x0, y0, x1 - x0, y1 - y0, {
            resizeWidth: rong, resizeHeight: cao, resizeQuality: 'high',
          });
          image.close();
          da.set(i, b);
          while (da.size > GIU) {
            const [k, cu] = da.entries().next().value!;
            da.delete(k); cu.close(); // canvas đã chép điểm ảnh lúc vẽ — đóng khung cũ không mất hình đang hiện
          }
        }).catch(() => undefined).finally(() => dangGiai.delete(i));
      };
      giaiKhung(0);
      return {
        n, tre, rong, cao,
        khung(i: number): ImageBitmap | null {
          giaiKhung((i + 1) % n); // giải trước khung kế
          const b = da.get(i);
          if (b === undefined) { giaiKhung(i); return null; }
          da.delete(i); da.set(i, b); // vừa dùng: xếp cuối, bỏ sau cùng
          return b;
        },
      };
    })().catch(() => null));
  }
  return daGiai.get(url)!;
}

type Goc = 'truoc' | 'cheo' | 'nghieng' | 'cheoSau' | 'sau' | 'cheoP' | 'nghiengP' | 'cheoSauP';
/** Góc còn thiếu ảnh thì lấy góc gần nhất có ảnh. Bên phải (…P) thiếu ảnh thì lật gương góc bên trái tương ứng — chỉ
 *  đúng với dáng đối xứng; dáng nhảy lệch tay chân cần ảnh thật cả hai bên. */
const THAY: Record<Goc, Goc[]> = {
  truoc: ['truoc'],
  cheo: ['cheo', 'truoc', 'nghieng'],
  nghieng: ['nghieng', 'cheo', 'cheoSau', 'truoc'],
  cheoSau: ['cheoSau', 'nghieng', 'sau', 'cheo', 'truoc'],
  sau: ['sau', 'cheoSau', 'cheoSauP', 'nghieng', 'truoc'],
  cheoP: ['cheoP', 'cheo', 'truoc', 'nghiengP', 'nghieng'],
  nghiengP: ['nghiengP', 'nghieng', 'cheoP', 'cheo', 'cheoSauP', 'truoc'],
  cheoSauP: ['cheoSauP', 'cheoSau', 'nghiengP', 'nghieng', 'sau', 'truoc'],
};
const BEN_TRAI: Record<string, Goc> = { cheoP: 'cheo', nghiengP: 'nghieng', cheoSauP: 'cheoSau' };

/** Thời gian (giây) hai ảnh góc mờ chồng lên nhau khi camera vòng qua ranh giới góc — đổi phắt trông như lật bài. */
const MO = 0.22;
/** Đổi bộ đồ: chớp sáng (giây) rồi mờ chéo chậm hơn đổi góc — cho khách thấy rõ là vừa thay đồ. */
const CHOP = 0.7, MO_DOI_DO = 0.5;
/** Ảnh tự sáng bao nhiêu (phần còn lại do đèn sân khấu chiếu vào): đèn đổi màu thì người ảnh cũng ám màu như người 3D. */
const TU_SANG = 0.62;

let bongChan: THREE.Texture | null = null;
/** Bóng mờ tròn dưới chân — thiếu nó người ảnh trông như dán lên cảnh. */
function texBong(): THREE.Texture {
  if (bongChan === null) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(0,0,0,0.75)');
    r.addColorStop(0.55, 'rgba(0,0,0,0.35)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    bongChan = new THREE.CanvasTexture(c);
  }
  return bongChan;
}

/** Một lớp ảnh: canvas vẽ khung hiện tại + mặt phẳng dựng đứng. Mỗi người có hai lớp để mờ chéo khi đổi góc. */
function taoLop(chieuCao: number) {
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d')!;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshLambertMaterial({
    map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: TU_SANG, color: 0x8c8c8c,
    transparent: true, alphaTest: 0.08, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), mat);
  m.visible = false;
  let anh: AnhDaGiai | null = null, lat = false;
  return {
    m, mat,
    get anh() { return anh; },
    /** Vẽ khung `i`; khung chưa giải xong thì giữ hình cũ và trả `false` (gọi lại khung hình sau). */
    ve(a: AnhDaGiai, i: number, latMoi: boolean): boolean {
      const k = a.khung(i);
      if (k === null) return false;
      anh = a; lat = latMoi;
      const { rong: hw, cao: hh } = a;
      if (cv.width !== hw || cv.height !== hh) {
        cv.width = hw; cv.height = hh;
        tex.dispose(); // đổi cỡ canvas: texture cũ không giãn theo
        m.scale.set(chieuCao * (hw / hh), chieuCao, 1);
      }
      g.setTransform(lat ? -1 : 1, 0, 0, 1, lat ? hw : 0, 0);
      g.clearRect(0, 0, hw, hh);
      g.drawImage(k, 0, 0);
      tex.needsUpdate = true;
      m.visible = true;
      return true;
    },
    don(): void { tex.dispose(); mat.dispose(); m.geometry.dispose(); },
  };
}

/** Một người ảnh động. `huong`: hướng người đó quay mặt (rad, như rotation.y của nhân vật 3D). `obj` đặt ở chỗ đứng
 *  (gốc = chân); `capNhat` mỗi khung hình; `doiBo` sang bộ đồ kế tiếp (người nhiều bộ). Bộ mặc đầu tiên bốc theo
 *  `rand` — đám đông cùng một nhân vật không mặc giống nhau. */
export function taoNguoiAnh(
  anh: AnhGoc | NguoiAnh | string, chieuCao: number, camera: THREE.Camera, huong = 0, rand: () => number = Math.random,
) {
  const cacBo: readonly Partial<Record<Goc, string>>[] =
    typeof anh === 'string' ? [{ truoc: anh }] : 'bo' in anh ? anh.bo : [anh];
  let soBo = Math.floor(rand() * cacBo.length) % cacBo.length;
  const obj = new THREE.Group();
  const quay = new THREE.Group(); // phần xoay theo camera; bóng chân nằm ngoài, không xoay
  obj.add(quay);
  // lớp đang hiện ở trước, lớp đang mờ đi lùi sau một chút cho khỏi giành điểm ảnh
  let moi = taoLop(chieuCao), cu = taoLop(chieuCao);
  quay.add(moi.m, cu.m);
  const matBong = new THREE.MeshBasicMaterial({ map: texBong(), transparent: true, depthWrite: false });
  const bong = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.6).rotateX(-Math.PI / 2), matBong);
  bong.position.y = 0.012;
  bong.renderOrder = 1;
  obj.add(bong);
  // ảnh từng góc của bộ đang mặc; chỉ giải bộ đang mặc (bộ khác tới lượt mới giải)
  let da: Partial<Record<Goc, AnhDaGiai>> = {};
  const napBo = (i: number): Partial<Record<Goc, AnhDaGiai>> => {
    const d: Partial<Record<Goc, AnhDaGiai>> = {};
    for (const [k, url] of Object.entries(cacBo[i]!)) if (url) void giai(url).then((a) => { if (a) d[k as Goc] = a; });
    return d;
  };
  da = napBo(soBo);
  let cho: { d: Partial<Record<Goc, AnhDaGiai>>; con: number } | null = null; // bộ mới đang tải, `con` giây chờ trước khi đổi
  let chop = 0, moLan = MO;

  let dang: AnhDaGiai | null = null, lat = false, choVe = false; // choVe: khung cần vẽ chưa giải xong
  let i = 0, con = 0, pha = Math.random(); // lệch pha: cả đám không nhảy y một khung
  let mo = 0; // giây còn lại của lần mờ chéo
  const doMo = (): void => {
    const t = mo > 0 ? 1 - mo / moLan : 1;
    const sang = TU_SANG + 1.6 * Math.max(0, chop / CHOP) ** 2;
    moi.mat.emissiveIntensity = sang; cu.mat.emissiveIntensity = sang;
    moi.mat.opacity = t; moi.m.position.z = 0; moi.m.renderOrder = 3;
    cu.mat.opacity = 1 - t; cu.m.position.z = -0.01; cu.m.renderOrder = 2;
    cu.m.visible = mo > 0 && cu.anh !== null;
  };

  return {
    obj,
    /** Sang bộ đồ kế tiếp sau `tre` giây (đám đông đổi lệch nhau, không cả sàn cùng chớp một lúc). Một bộ thì thôi. */
    doiBo(tre = 0): void {
      if (cacBo.length < 2) return;
      soBo = (soBo + 1) % cacBo.length;
      cho = { d: napBo(soBo), con: tre };
    },
    capNhat(dt: number): void {
      // bộ mới: chờ đủ trễ và đã giải xong mặt trước thì chớp sáng, mờ chéo sang
      if (cho !== null) {
        cho.con -= dt;
        if (cho.con <= 0 && cho.d.truoc !== undefined) { da = cho.d; cho = null; chop = CHOP; }
      }
      if (chop > 0) chop = Math.max(0, chop - dt);
      // xoay quanh trục đứng cho mặt ảnh nhìn camera
      const nhin = Math.atan2(camera.position.x - obj.position.x, camera.position.z - obj.position.z);
      quay.rotation.y = nhin;
      // camera lệch bao nhiêu so với hướng người đó quay mặt → chọn ảnh góc nào, có lật gương không
      let d = nhin - huong;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const a = Math.abs(d) * 180 / Math.PI;
      // góc bên trái (ảnh vẽ quay sang trái màn hình) khi d · HUONG_VE > 0; bên kia là các góc …P
      const ben = a < 22.5 ? 'truoc' : a < 67.5 ? 'cheo' : a < 112.5 ? 'nghieng' : a < 157.5 ? 'cheoSau' : 'sau';
      const goc = (d * HUONG_VE < 0 && ben !== 'truoc' && ben !== 'sau' ? `${ben}P` : ben) as Goc;
      const chon = THAY[goc].find((k) => da[k] !== undefined);
      if (chon === undefined) return;
      const anhMoi = da[chon]!;
      // lật gương khi phải dùng ảnh bên trái cho góc bên phải (hoặc ngược lại)
      const benChon = BEN_TRAI[chon] !== undefined ? 'P' : chon === 'truoc' || chon === 'sau' ? '' : 'T';
      const latMoi = benChon !== '' && (benChon === 'P') !== goc.endsWith('P');
      let veLai = false;
      if (anhMoi !== dang || latMoi !== lat) {
        // đổi góc: lớp cũ giữ nguyên khung đang hiện và mờ dần, lớp kia vẽ góc mới; giữ đúng nhịp điệu nhảy (cùng tỉ lệ
        // thời gian trong vòng), không nhảy về khung đầu
        if (dang !== null) { [moi, cu] = [cu, moi]; moLan = chop > 0 ? MO_DOI_DO : MO; mo = moLan; }
        dang = anhMoi;
        lat = latMoi;
        i = Math.floor(pha * anhMoi.n) % anhMoi.n;
        con = anhMoi.tre[i]!;
        veLai = true;
      }
      if (mo > 0) mo = Math.max(0, mo - dt);
      doMo();
      if (dang.n > 1) {
        con -= dt;
        if (con <= 0) {
          i = (i + 1) % dang.n;
          pha = i / dang.n;
          con += dang.tre[i]!;
          if (con < 0) con = dang.tre[i]!; // tab ẩn lâu: đừng tua bù hàng loạt khung
          veLai = true;
        }
      }
      if (veLai || choVe) choVe = !moi.ve(dang, i, lat);
    },
    don(): void {
      obj.removeFromParent();
      moi.don(); cu.don();
      matBong.dispose(); bong.geometry.dispose();
    },
  };
}
