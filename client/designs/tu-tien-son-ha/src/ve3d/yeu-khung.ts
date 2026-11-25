/** Yêu tinh hoạt ảnh thật: bốn đoạn WebP động dựng bằng FramePack trên hpc (scripts/phong/tu-tien/yeu-dong/),
 *  mỗi con một bộ `assets/yeu/dong/<id>-<đoạn>.webp`:
 *    tho   — đứng thở, lặp mãi (dáng nền)
 *    chieu — ra chiêu, chạy một lần rồi về dáng nền (phản đòn, chiêu lớn, đồ sát)
 *    trung — trúng đòn nặng, một lần (thưa: không chạy lại trong TRUNG_CACH)
 *    cuong — Cuồng Bạo, lặp mãi thay dáng nền
 *  Con nào chưa có đoạn `tho` thì trả `co() = false` — nơi gọi giữ lưới WebGL (yeu-dong.ts) như cũ; thiếu đoạn
 *  khác thì đoạn đó lấy dáng nền. Mỗi lần chạy một đoạn tạo URL blob mới để ảnh động chạy lại từ khung đầu. */

export type DoanYeu = 'tho' | 'chieu' | 'trung' | 'cuong';
const DOAN: readonly DoanYeu[] = ['tho', 'chieu', 'trung', 'cuong'];
/** Đoạn một lần dài bao lâu khi trình duyệt không đọc được (không có ImageDecoder). */
const LAU_MAC_DINH = 2_800;
/** Trúng đòn liên tục: đoạn trúng chạy lại cách nhau ít nhất chừng này sau khi đoạn một lần trước xong. */
const TRUNG_CACH = 6_000;

interface Doan {
  blob: Blob;
  lau: number;
}

/** Tổng thời lượng một ảnh động (ms), đọc bằng ImageDecoder nếu trình duyệt có. */
async function doLau(blob: Blob): Promise<number> {
  const ID = (globalThis as { ImageDecoder?: new (o: { data: ReadableStream; type: string }) => {
    tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null };
    decode(o: { frameIndex: number }): Promise<{ image: { duration: number | null; close(): void } }>;
    close(): void;
  } }).ImageDecoder;
  if (ID === undefined) return LAU_MAC_DINH;
  try {
    const d = new ID({ data: blob.stream(), type: blob.type || 'image/webp' });
    await d.tracks.ready;
    const n = d.tracks.selectedTrack?.frameCount ?? 0;
    let tong = 0;
    for (let i = 0; i < n; i++) {
      const f = await d.decode({ frameIndex: i });
      tong += (f.image.duration ?? 66_000) / 1000;
      f.image.close();
    }
    d.close();
    return tong > 0 ? tong : LAU_MAC_DINH;
  } catch {
    return LAU_MAC_DINH;
  }
}

export interface YeuKhung {
  el: HTMLImageElement;
  /** Đổi sang con `id` (tải bộ đoạn nếu chưa có). */
  dat(id: string): void;
  /** Con hiện tại đã có đoạn đứng thở chưa. */
  co(): boolean;
  /** Mỗi khung hình: `chieu` / `trung` là lúc (ms) sự kiện gần nhất — đổi thì chạy đoạn tương ứng. */
  ve(now: number, s: { cuong: boolean; chieu: number; trung: number }): void;
}

export function taoYeuKhung(asset: (p: string) => string): YeuKhung {
  const el = document.createElement('img');
  el.className = 'sh-yeu-khung';
  el.alt = '';
  const kho = new Map<string, Map<DoanYeu, Doan>>();
  let id = '';
  let dang: { doan: DoanYeu; den: number } | null = null;
  let nen: DoanYeu | null = null;
  let url = '';
  let chieuCu = -1;
  let trungCu = -1;
  let motXong = -Infinity;

  function tai(ma: string) {
    if (kho.has(ma)) return;
    const bo = new Map<DoanYeu, Doan>();
    kho.set(ma, bo);
    for (const d of DOAN) {
      fetch(asset(`yeu/dong/${ma}-${d}.webp`))
        .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('image') ? r.blob() : null))
        .then(async (b) => {
          if (b !== null) bo.set(d, { blob: b, lau: d === 'tho' || d === 'cuong' ? 0 : await doLau(b) });
        })
        .catch(() => undefined);
    }
  }

  function chay(d: Doan) {
    if (url !== '') URL.revokeObjectURL(url);
    url = URL.createObjectURL(d.blob);
    el.src = url;
  }

  return {
    el,
    dat(ma) {
      if (ma === id) return;
      id = ma;
      dang = null;
      nen = null;
      tai(ma);
    },
    co: () => kho.get(id)?.has('tho') ?? false,
    ve(now, s) {
      const bo = kho.get(id);
      if (bo === undefined || !bo.has('tho')) return;
      const muonNen: DoanYeu = s.cuong && bo.has('cuong') ? 'cuong' : 'tho';
      if (s.chieu !== chieuCu) {
        chieuCu = s.chieu;
        const d = bo.get('chieu');
        if (d !== undefined && s.chieu > 0) {
          dang = { doan: 'chieu', den: now + d.lau };
          chay(d);
        }
      }
      if (s.trung !== trungCu) {
        trungCu = s.trung;
        const d = bo.get('trung');
        if (d !== undefined && dang === null && now - motXong > TRUNG_CACH) {
          dang = { doan: 'trung', den: now + d.lau };
          chay(d);
        }
      }
      if (dang !== null && now >= dang.den) {
        dang = null;
        motXong = now;
        nen = null;
      }
      if (dang === null && nen !== muonNen) {
        nen = muonNen;
        chay(bo.get(muonNen)!);
      }
    },
  };
}
