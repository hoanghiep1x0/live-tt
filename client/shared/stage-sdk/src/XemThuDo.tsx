/** Khung thử đồ 3D trên đầu tab tủ đồ: nhân vật mặc đúng bộ sẽ lên sóng (kể cả đồ lót tự kèm), bấm món là đổi ngay.
 *
 *  Cách gắn món giống sân khấu (`macMon` trong canh.ts của thiết kế sàn bar): buộc lưới món vào xương thân theo tên
 *  xương, ẩn da dưới món bằng mặt nạ UV gộp. three nạp lười — chỉ tải khi có tủ đồ để mở, không đè gói sân khấu. */
import { useEffect, useRef, useState } from 'react';

type Three = typeof import('three');
type Gltf = { scene: import('three').Group; animations: import('three').AnimationClip[] };

interface Canh {
  T: Three;
  napGlb: (url: string) => Promise<Gltf>;
  goc: import('three').Object3D;
  than: import('three').SkinnedMesh | null;
  xuong: Map<string, import('three').Bone>;
  matNa: { value: import('three').Texture | null };
  coMat: { value: number };
  mon: import('three').Object3D[];
  /** id các bộ dựng sẵn trong GLB (`extras.outfits` dạng mảng của xương) */
  boGlb: string[];
}

/** GLB đã nạp, dùng chung cho mọi khung trên trang (thân 90+ MB: nạp một lần, mỗi khung một bản sao). */
const daNap = new Map<string, Promise<Gltf>>();

type PropsXem = { url: string; mon: readonly string[]; bo?: string | null };

/** `url`: GLB thân của module. `mon`: URL thư mục từng món (kết thúc bằng `/`), đúng bộ sẽ lên sóng. `bo`: bộ dựng
 *  sẵn mặc khi chưa có món nào (id không có trong GLB — "theo cả nhóm", "ngẫu nhiên" — thì bộ đầu).
 *
 *  Chỉ dựng khi khung đang hiện trên màn hình (kho nhân vật có hàng chục thẻ — mỗi khung một WebGL context, trình
 *  duyệt chỉ cho ~16); lướt khỏi thì dọn. */
export function XemThuDo(p: PropsXem) {
  const vo = useRef<HTMLDivElement>(null);
  const [thay, setThay] = useState(false);
  useEffect(() => {
    const el = vo.current;
    if (el === null) return;
    const io = new IntersectionObserver(([x]) => setThay(x?.isIntersecting === true), { rootMargin: '150px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={vo} className="bx-thu-do-vo">
      {thay ? <KhungThuDo {...p} /> : <div className="bx-thu-do"><span className="bx-thu-do-tt">Thử đồ</span></div>}
    </div>
  );
}

function KhungThuDo({ url, mon, bo = null }: PropsXem) {
  const hop = useRef<HTMLDivElement>(null);
  const canh = useRef<Canh | null>(null);
  const [trangThai, setTrangThai] = useState<'nap' | 'xong' | 'loi'>('nap');
  const [lan, setLan] = useState(0); // tăng khi thân đã dựng xong → áp lại bộ đồ

  useEffect(() => {
    const el = hop.current;
    if (el === null) return;
    let dung = false;
    let khung = 0;
    const don: (() => void)[] = [];
    void (async () => {
      try {
        const T = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const { clone } = await import('three/examples/jsm/utils/SkeletonUtils.js');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        if (dung) return;
        const nap = new GLTFLoader();
        const napGlb = (u: string) => nap.loadAsync(u) as Promise<Gltf>;
        if (!daNap.has(url)) daNap.set(url, napGlb(url).catch((e: unknown) => { daNap.delete(url); throw e; }));
        const g = await daNap.get(url)!;
        if (dung) return;

        const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = T.SRGBColorSpace;
        el.appendChild(renderer.domElement);
        don.push(() => { renderer.dispose(); renderer.domElement.remove(); });
        const scene = new T.Scene();
        scene.add(new T.HemisphereLight(0xffffff, 0x8a8078, 2.2));
        const den = new T.DirectionalLight(0xffffff, 2.4);
        den.position.set(1.5, 3, 2.5);
        scene.add(den);
        const camera = new T.PerspectiveCamera(30, 1, 0.05, 50);
        const ctl = new OrbitControls(camera, renderer.domElement);
        ctl.enablePan = false;
        ctl.autoRotate = true;
        ctl.autoRotateSpeed = 1.2;
        don.push(() => ctl.dispose());

        // Thân: ẩn bộ dựng sẵn (nút có `extras.outfits`), da theo mặt nạ món.
        const goc = clone(g.scene) as import('three').Group; // bản sao: khung khác đang dùng cùng GLB
        let boGlb: string[] = [];
        let than: import('three').SkinnedMesh | null = null;
        const matNa = { value: null as import('three').Texture | null };
        const coMat = { value: 0 };
        goc.traverse((o) => {
          const ds = (o.userData as { outfits?: unknown }).outfits;
          if (typeof ds === 'string' && ds.startsWith('[')) boGlb = (JSON.parse(ds) as { id: string }[]).map((x) => x.id);
          const m = o as import('three').SkinnedMesh;
          if (!m.isMesh) return;
          m.frustumCulled = false;
          const vl = (m.material = (m.material as import('three').MeshStandardMaterial).clone());
          vl.transparent = false;
          vl.depthWrite = true;
          if (/hair|eyebrow|eyelash|high-poly/i.test(m.name)) { vl.alphaTest = 0.45; vl.side = T.DoubleSide; }
          if (m.geometry.attributes._cover !== undefined) {
            than = m;
            vl.onBeforeCompile = (sh) => {
              sh.uniforms.uMat = matNa;
              sh.uniforms.uCoMat = coMat;
              sh.fragmentShader = 'uniform sampler2D uMat;\nuniform float uCoMat;\n' + sh.fragmentShader.replace(
                'void main() {',
                'void main() {\n#ifdef USE_MAP\n  if (uCoMat > 0.5 && texture2D(uMat, vMapUv).r > 0.5) discard;\n#endif');
            };
            vl.customProgramCacheKey = () => 'thu-do-da';
          }
        });
        scene.add(goc);
        const xuong = new Map<string, import('three').Bone>();
        goc.traverse((o) => { if ((o as import('three').Bone).isBone) xuong.set(o.name, o as import('three').Bone); });

        // Nhún nhẹ tại chỗ: điệu chậm, khoá Hips theo x/z (như sân khấu lúc nghỉ).
        const mixer = new T.AnimationMixer(goc);
        // điệu đứng (không có điệu sàn, breakdance: cúi rạp thì không thấy đồ)
        const clip = ['Hip Hop Dancing', 'Dancing', 'Shuffling', 'Silly Dancing']
          .map((t) => g.animations.find((c) => c.name === t))
          .find((c) => c !== undefined) ?? g.animations[0];
        if (clip !== undefined) {
          const tracks = clip.tracks.filter((t) => !t.name.endsWith('.scale') && (!t.name.endsWith('.position') || /Hips/.test(t.name)));
          for (const t of tracks) {
            if (!t.name.endsWith('.position')) continue;
            const v = t.values, x0 = v[0] ?? 0, z0 = v[2] ?? 0;
            for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
          }
          const act = mixer.clipAction(new T.AnimationClip(clip.name, clip.duration, tracks));
          act.timeScale = 0.35;
          act.play();
        }

        // khung nhìn: cả người, nhìn hơi từ trên
        const box = new T.Box3().setFromObject(goc);
        const tam = box.getCenter(new T.Vector3());
        const cao = box.max.y - box.min.y;
        ctl.target.copy(tam);
        camera.position.set(tam.x, tam.y + cao * 0.08, tam.z + cao * 2.5);
        ctl.update();

        const coGian = (): void => {
          const w = el.clientWidth, h = el.clientHeight;
          renderer.setSize(w, h, false);
          camera.aspect = w / Math.max(h, 1);
          camera.updateProjectionMatrix();
        };
        coGian();
        const ro = new ResizeObserver(coGian);
        ro.observe(el);
        don.push(() => ro.disconnect());
        const dongHo = new T.Clock();
        const ve = (): void => {
          khung = requestAnimationFrame(ve);
          mixer.update(dongHo.getDelta());
          ctl.update();
          renderer.render(scene, camera);
        };
        ve();
        don.push(() => cancelAnimationFrame(khung));

        canh.current = { T, napGlb, goc, than, xuong, matNa, coMat, mon: [], boGlb };
        setTrangThai('xong');
        setLan((x) => x + 1);
      } catch {
        if (!dung) setTrangThai('loi');
      }
    })();
    return () => {
      dung = true;
      canh.current = null;
      for (const f of don.reverse()) f();
    };
  }, [url]);

  const khoa = mon.join('|');
  useEffect(() => {
    const c = canh.current;
    if (c === null) return;
    let huy = false;
    void (async () => {
      const { T } = c;
      const ds = (
        await Promise.all(
          mon.map((u) =>
            Promise.all([c.napGlb(`${u}mon.glb`), new T.TextureLoader().loadAsync(`${u}mat-na.png`)])
              .then(([g, t]) => ({ g, t, mong: /\/(toc|mu|kinh|gang-tay|phu-kien)\//.test(u), dau: /\/(toc|mu|kinh)\//.test(u) }))
              .catch(() => null),
          ),
        )
      ).filter((x) => x !== null);
      if (huy || canh.current !== c) return;
      for (const m of c.mon) m.removeFromParent();
      c.mon = [];
      // bộ dựng sẵn: có món thì ẩn hết; chưa có món thì mặc bộ `bo` (không có trong GLB thì bộ đầu)
      const boMac = ds.length > 0 ? null : bo !== null && c.boGlb.includes(bo) ? bo : (c.boGlb[0] ?? null);
      c.goc.traverse((o) => {
        const t = (o.userData as { outfits?: unknown }).outfits;
        if (typeof t === 'string' && !t.startsWith('[')) o.visible = boMac !== null && t.split(',').includes(boMac);
      });
      // tóc của GLB: mặc tóc tủ đồ thì ẩn
      const coToc = mon.some((u) => u.includes('/toc/'));
      c.goc.traverse((o) => {
        if ((o as import('three').Mesh).isMesh && /hair/i.test(o.name) && (o.userData as { outfits?: unknown }).outfits === undefined) o.visible = !coToc;
      });
      const than = c.than;
      if (than === null) return;
      for (const { g, mong, dau } of ds) {
        g.scene.traverse((src) => {
          const s = src as import('three').SkinnedMesh;
          if (!s.isSkinnedMesh) return;
          // `neutral_bone` (đỉnh không gắn xương, bộ xuất glTF tự thêm): buộc vào đầu / hông như sân khấu (canh.ts)
          const inv = s.skeleton.boneInverses.slice();
          const bones = s.skeleton.bones.map((b, i) => {
            const x = c.xuong.get(b.name);
            if (x !== undefined || b.name !== 'neutral_bone') return x;
            const y = c.xuong.get(dau ? 'mixamorigHead' : 'mixamorigHips');
            const j = y === undefined ? -1 : than.skeleton.bones.indexOf(y);
            const nghich = than.skeleton.boneInverses[j];
            if (nghich !== undefined) inv[i] = nghich;
            return y;
          });
          if (bones.some((b) => b === undefined)) return; // xương lạ: món không thuộc thân này
          const m = s.clone();
          m.frustumCulled = false;
          if (mong) (m.material as import('three').Material).side = T.DoubleSide;
          than.parent?.add(m);
          m.bind(new T.Skeleton(bones as import('three').Bone[], inv), than.bindMatrix);
          c.mon.push(m);
        });
      }
      // gộp mặt nạ da của mọi món (sáng hơn thắng)
      const cv = document.createElement('canvas');
      cv.width = cv.height = 512;
      const g2 = cv.getContext('2d');
      if (g2 !== null) {
        g2.fillStyle = '#000';
        g2.fillRect(0, 0, 512, 512);
        g2.globalCompositeOperation = 'lighten';
        for (const { t } of ds) g2.drawImage(t.image as CanvasImageSource, 0, 0, 512, 512);
      }
      c.matNa.value?.dispose();
      const tex = new T.CanvasTexture(cv);
      tex.flipY = false; // mặt nạ xếp theo UV glTF, như hoa văn thân
      c.matNa.value = tex;
      c.coMat.value = ds.length > 0 ? 1 : 0;
    })();
    return () => { huy = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoa, lan, bo]);

  return (
    <div className="bx-thu-do" ref={hop} aria-label="Thử đồ">
      {trangThai === 'xong' ? null : (
        <span className="bx-thu-do-tt">{trangThai === 'nap' ? 'Đang dựng nhân vật…' : 'Không dựng được nhân vật để thử đồ'}</span>
      )}
      {trangThai === 'xong' ? <span className="bx-thu-do-goi">Kéo để xoay</span> : null}
    </div>
  );
}
