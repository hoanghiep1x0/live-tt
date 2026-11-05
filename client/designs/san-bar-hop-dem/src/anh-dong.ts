// Nhân vật ảnh động (GIF / WebP động) đứng trên sàn: tấm ảnh dựng đứng, chân chạm sàn, luôn quay về camera, chạy đúng
// các khung của ảnh. Có ảnh nhiều góc (chéo, nghiêng, sau) thì đổi ảnh theo hướng camera nhìn người đó — như sprite 8
// hướng của game cũ: trông như 3D mà giữ nguyên nét vẽ (ChatGPT, họa sĩ). Góc bên kia lấy bằng lật gương.
// Thiết kế sàn bar nào cũng có một bản giống hệt (như canh.ts).
import * as THREE from 'three';
import type { AnhGoc } from '@live/contracts';

interface AnhDaGiai {
  khung: ImageBitmap[];
  /** Thời gian mỗi khung (giây). */
  tre: number[];
  /** Vùng có hình, chung cho mọi khung: [x, y, rộng, cao] theo px. */
  hop: [number, number, number, number];
}

/** Ảnh góc chéo / nghiêng vẽ người quay sang TRÁI màn hình (thấy bên trái người đó). Ảnh vẽ quay phải thì đổi -1. */
const HUONG_VE = 1;

const daGiai = new Map<string, Promise<AnhDaGiai | null>>();

/** Vùng alpha > 20 chung của mọi khung — cắt sát để chân đặt đúng mặt sàn và chiều cao đúng bằng người. */
function hopChung(khung: readonly ImageBitmap[]): [number, number, number, number] {
  const w = khung[0]!.width, h = khung[0]!.height;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (const k of khung) {
    g.clearRect(0, 0, w, h);
    g.drawImage(k, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if (d[(y * w + x) * 4 + 3]! > 20) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
  }
  return x1 < 0 ? [0, 0, w, h] : [x0, y0, x1 - x0 + 2, y1 - y0 + 2];
}

function giai(url: string): Promise<AnhDaGiai | null> {
  if (!daGiai.has(url)) {
    daGiai.set(url, (async () => {
      const r = await fetch(url);
      if (!r.ok) return null;
      const kieu = r.headers.get('content-type') ?? (url.endsWith('.gif') ? 'image/gif' : 'image/webp');
      const khung: ImageBitmap[] = [], tre: number[] = [];
      const W = window as unknown as { ImageDecoder?: new (o: { data: ArrayBuffer; type: string }) => {
        tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null };
        decode(o: { frameIndex: number }): Promise<{ image: VideoFrame }>;
        close(): void;
      } };
      if (W.ImageDecoder !== undefined) {
        // khung giải ra đã ghép đủ (không phải mảnh vá của GIF)
        const dec = new W.ImageDecoder({ data: await r.arrayBuffer(), type: kieu });
        await dec.tracks.ready;
        const n = dec.tracks.selectedTrack?.frameCount ?? 1;
        for (let i = 0; i < n; i++) {
          const { image } = await dec.decode({ frameIndex: i });
          khung.push(await createImageBitmap(image));
          tre.push(Math.max(0.03, (image.duration ?? 100_000) / 1e6));
          image.close();
        }
        dec.close();
      } else {
        // trình duyệt không có ImageDecoder: đứng yên ở khung đầu
        khung.push(await createImageBitmap(await r.blob()));
        tre.push(1e9);
      }
      return khung.length > 0 ? { khung, tre, hop: hopChung(khung) } : null;
    })().catch(() => null));
  }
  return daGiai.get(url)!;
}

type Goc = 'truoc' | 'cheo' | 'nghieng' | 'cheoSau' | 'sau';
/** Góc còn thiếu ảnh thì lấy góc gần nhất có ảnh. */
const THAY: Record<Goc, Goc[]> = {
  truoc: ['truoc'],
  cheo: ['cheo', 'truoc', 'nghieng'],
  nghieng: ['nghieng', 'cheo', 'cheoSau', 'truoc'],
  cheoSau: ['cheoSau', 'nghieng', 'sau', 'cheo', 'truoc'],
  sau: ['sau', 'cheoSau', 'nghieng', 'truoc'],
};

/** Một người ảnh động. `huong`: hướng người đó quay mặt (rad, như rotation.y của nhân vật 3D). `obj` đặt ở chỗ đứng
 *  (gốc = chân); `capNhat` mỗi khung hình. */
export function taoNguoiAnh(anh: AnhGoc | string, chieuCao: number, camera: THREE.Camera, huong = 0) {
  const bo: Partial<Record<Goc, string>> = typeof anh === 'string' ? { truoc: anh } : anh;
  const obj = new THREE.Group();
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d')!;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide, color: 0xe6e6e6 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), mat);
  m.visible = false;
  obj.add(m);
  const da: Partial<Record<Goc, AnhDaGiai>> = {};
  for (const [k, url] of Object.entries(bo)) if (url) void giai(url).then((a) => { if (a) da[k as Goc] = a; });

  let dang: AnhDaGiai | null = null, lat = false;
  let i = 0, con = 0, pha = Math.random(); // lệch pha: cả đám không nhảy y một khung
  const ve = (): void => {
    if (dang === null) return;
    const [hx, hy, hw, hh] = dang.hop;
    if (cv.width !== hw || cv.height !== hh) {
      cv.width = hw; cv.height = hh;
      tex.dispose(); // đổi cỡ canvas: texture cũ không giãn theo
      m.scale.set(chieuCao * (hw / hh), chieuCao, 1);
    }
    g.setTransform(lat ? -1 : 1, 0, 0, 1, lat ? hw : 0, 0);
    g.clearRect(0, 0, hw, hh);
    g.drawImage(dang.khung[i]!, hx, hy, hw, hh, 0, 0, hw, hh);
    tex.needsUpdate = true;
    m.visible = true;
  };

  return {
    obj,
    capNhat(dt: number): void {
      // xoay quanh trục đứng cho mặt ảnh nhìn camera
      const nhin = Math.atan2(camera.position.x - obj.position.x, camera.position.z - obj.position.z);
      obj.rotation.y = nhin;
      // camera lệch bao nhiêu so với hướng người đó quay mặt → chọn ảnh góc nào, có lật gương không
      let d = nhin - huong;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const a = Math.abs(d) * 180 / Math.PI;
      const goc: Goc = a < 22.5 ? 'truoc' : a < 67.5 ? 'cheo' : a < 112.5 ? 'nghieng' : a < 157.5 ? 'cheoSau' : 'sau';
      const chon = THAY[goc].find((k) => da[k] !== undefined);
      if (chon === undefined) return;
      const moi = da[chon]!;
      const latMoi = chon !== 'truoc' && chon !== 'sau' && d * HUONG_VE < 0;
      if (moi !== dang) {
        // đổi góc: giữ đúng nhịp điệu nhảy (cùng tỉ lệ thời gian trong vòng), không nhảy về khung đầu
        dang = moi;
        i = Math.floor(pha * moi.khung.length) % moi.khung.length;
        con = moi.tre[i]!;
        lat = latMoi;
        ve();
      } else if (latMoi !== lat) {
        lat = latMoi;
        ve();
      }
      if (dang.khung.length < 2) return;
      con -= dt;
      if (con > 0) return;
      i = (i + 1) % dang.khung.length;
      pha = i / dang.khung.length;
      con += dang.tre[i]!;
      if (con < 0) con = dang.tre[i]!; // tab ẩn lâu: đừng tua bù hàng loạt khung
      ve();
    },
    don(): void {
      obj.removeFromParent();
      tex.dispose();
      mat.dispose();
    },
  };
}
