// @ts-nocheck — chuyển nguyên từ bản dựng thử (D:/Live-bar/client/public/bar/core.js); thêm kiểu dần khi sửa.
// Lõi dựng cảnh của loại Sàn bar: renderer, hậu kỳ, vật liệu, vũ công (tuỳ chọn), DJ, màn hình chiếu vũ công.
// Mỗi kiểu (khong-gian/*.ts) chỉ dựng cảnh và trả về thông số + hàm update theo nhịp — giao kèo ở
// docs/phong/san-bar/hop-dem.md. Bản sao RIÊNG của kiểu này (quy ước 01 §12): sửa ở đây không đụng kiểu khác.
import type { VuCong3D } from '@live/contracts';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const DANCER_HEIGHT = 1.65;
const SWITCH_SECONDS = 16;
import { BANG_MAU, BPM, nhipTai } from './nhip';
const PALETTE = BANG_MAU.map((c) => new THREE.Color(c));

/** Dựng cảnh vào `mount`. `tex` = đường dẫn thư mục texture của kiểu (qua useAsset). `model` (tuỳ chọn) = GLB vũ công
 *  có các điệu nhảy — không có thì cảnh vẫn chạy đủ đèn, LED, màn chiếu, chỉ sàn trống (quy ước 04 §1).
 *  Trả về `don` (dừng vòng vẽ, giải phóng WebGL — quy ước 04 §8) và `vuCong` (áp yêu cầu `VuCong3D` của module ở
 *  slot `stage-3d`: GLB, bộ đồ, điệu đồng diễn; null = sàn trống). */
export async function start({ space, model = null, mount, tex }: {
  space: { name: string; build: (ctx: unknown) => unknown };
  model?: string | null;
  mount: HTMLElement;
  tex: string;
}): Promise<{ don: () => void; vuCong: (v: VuCong3D | null) => void }> {
  const inspect = new URLSearchParams(location.search).has('inspect');
  // ---------- renderer + hậu kỳ ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.6, 0.75);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------- vật liệu ----------
  const texLoader = new THREE.TextureLoader();
  function pbrMaps(id, rx, ry = rx) {
    const load = (m, srgb) => {
      const t = texLoader.load(`${tex}${id}_${m}_1k.jpg`);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    return { map: load('diff', true), normalMap: load('nor_gl'), roughnessMap: load('rough') };
  }
  const pbr = (id, rx, ry, extra = {}) => new THREE.MeshPhysicalMaterial({ ...pbrMaps(id, rx, ry), ...extra });
  const lacquer = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 });
  const gold = new THREE.MeshStandardMaterial({ color: '#d9a94a', metalness: 1, roughness: 0.22 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#d8dce6', metalness: 1, roughness: 0.12 });
  const velvet = (color, rx = 2, ry = 2) => new THREE.MeshPhysicalMaterial({
    ...pbrMaps('velour_velvet', rx, ry), color, sheen: 1, sheenRoughness: 0.35,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.35),
  });
  // Kính "giả": trong suốt + phản chiếu môi trường; nhẹ hơn nhiều so với transmission thật.
  const glassCache = new Map();
  const glass = (color) => {
    const key = new THREE.Color(color).getHexString();
    if (!glassCache.has(key)) glassCache.set(key, new THREE.MeshStandardMaterial({
      color, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.55, envMapIntensity: 2.5,
      emissive: color, emissiveIntensity: 0.25,
    }));
    return glassCache.get(key);
  };
  const glow = (color, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });

  function add(geo, m, x, y, z, { shadow = true, parent = scene } = {}) {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = shadow;
    parent.add(mesh);
    return mesh;
  }
  // dải LED đổi màu theo nhịp (core tô màu mỗi khung)
  const ledStrips = [];
  function strip(w, h, d, x, y, z, phase = 0, parent = scene) {
    const m = add(new THREE.BoxGeometry(w, h, d), glow('#ffffff'), x, y, z, { shadow: false, parent });
    ledStrips.push({ m, phase });
    return m;
  }
  function neon(text, color, w, h, size, font) {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = Math.round(1024 * h / w);
    const g = cv.getContext('2d');
    g.font = `${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 30; g.strokeStyle = color; g.lineWidth = 10;
    g.strokeText(text, 512, cv.height / 2);
    g.shadowBlur = 0; g.fillStyle = new THREE.Color(color).lerp(new THREE.Color('#fff'), 0.6).getStyle();
    g.fillText(text, 512, cv.height / 2);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  function loadHDR(file, intensity) {
    new RGBELoader().load(`${tex}${file}`, (hdr) => {
      scene.environment = pmrem.fromEquirectangular(hdr).texture;
      scene.environmentIntensity = intensity;
      hdr.dispose();
    });
  }
  function envFromScene(envScene, intensity) {
    scene.environment = pmrem.fromScene(envScene).texture;
    scene.environmentIntensity = intensity;
  }

  const ctx = {
    tex, THREE, renderer, scene, camera, controls, bloom, PALETTE, BPM,
    add, strip, glow, neon, pbr, pbrMaps, lacquer, gold, chrome, velvet, glass, loadHDR, envFromScene,
  };

  // ---------- dựng không gian ----------
  const S = space.build(ctx);
  camera.position.set(...S.camera.pos);
  controls.target.set(...S.camera.target);
  controls.minDistance = S.camera.minD; controls.maxDistance = S.camera.maxD;
  controls.maxPolarAngle = S.camera.maxPolar ?? Math.PI * 0.5;
  controls.minPolarAngle = S.camera.minPolar ?? 0;
  // Kéo chuột xoay đủ 360° quanh sàn; góc dọc và khung phòng (`bounds`) vẫn giữ để camera không chui xuống
  // sàn hay ra ngoài tường. `azimuth` của không gian chỉ còn là cung camera tự đung đưa khi không ai cầm.
  // ?inspect=1: bỏ giới hạn camera để soi cận nhân vật khi dựng
  if (inspect) {
    controls.minDistance = 0.3; controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity;
    controls.minPolarAngle = 0; controls.maxPolarAngle = Math.PI;
  }
  // Phóng về đúng chỗ con trỏ (cuộn trên mặt vũ công là tới mặt vũ công), lại gần được tới cận mặt.
  controls.zoomToCursor = true;
  controls.minDistance = Math.min(controls.minDistance, 0.35);
  const B = S.camera.bounds;
  function keepInside() {
    const p = camera.position;
    p.x = THREE.MathUtils.clamp(p.x, B.min[0], B.max[0]);
    p.y = THREE.MathUtils.clamp(p.y, B.min[1], B.max[1]);
    p.z = THREE.MathUtils.clamp(p.z, B.min[2], B.max[2]);
  }

  // ---------- nhân vật ----------
  function prepClip(clip) {
    // bỏ scale; khoá Hips theo x/z để nhảy tại chỗ, giữ nhún lên xuống
    const tracks = [];
    for (const t of clip.tracks) {
      if (t.name.endsWith('.scale')) continue;
      if (t.name.endsWith('.position')) {
        if (!/Hips/.test(t.name)) continue;
        const v = t.values, x0 = v[0], z0 = v[2];
        for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
      }
      tracks.push(t);
    }
    return new THREE.AnimationClip(clip.name, clip.duration, tracks);
  }

  // Vũ công nạp lúc chạy, theo yêu cầu của module ở slot `stage-3d` (hợp đồng `VuCong3D`, docs/02 §5b):
  // đổi GLB, đổi bộ đồ, đồng diễn không phải dựng lại cảnh.
  let gltf = null;
  let clips = [];
  let tuDo = null; // tên các điệu được tự chọn (module khai, `VuCong3D.tuDo`); null = mọi điệu
  // Điệu cho lúc nhảy tự do: lọc theo `tuDo`, lọc ra rỗng (GLB khác danh sách) thì dùng mọi điệu.
  const dieuTuDo = () => {
    const ds = tuDo ? clips.filter((c) => tuDo.includes(c.name)) : clips;
    return ds.length > 0 ? ds : clips;
  };
  let BO = [];                 // id các bộ trang phục trong GLB, đúng thứ tự bit của `_cover`
  let dancers = [];
  let djActor = null;
  let an = []; // người không có mặt (`VuCong3D.an`)
  let boRieng = {}; // người mặc bộ riêng (`VuCong3D.boRieng`): id người → id bộ
  let monChung = []; // món rời cả nhóm mặc (`VuCong3D.mon`): URL thư mục món
  let damDong = [], kyDamDong = '', dongDam = []; // nhóm đám đông (`VuCong3D.damDong`) và người đã dựng
  const TOI_DA_DAM_DONG = 40; // mỗi người là một nhân vật có xương: hơn số này máy phát live vẽ không nổi
  let modelUrl = null, boChon = null, dieuChung = null, nghi = false, luotNap = 0, dung = false;
  const TOC_NGHI = 0.3; // nghỉ: phát điệu chung chậm cỡ này → nhún nhẹ tại chỗ
  const bonePos = new THREE.Vector3();
  const actors = [];

  // Da dưới đồ: GLB nhiều bộ giữ nguyên thân, đỉnh có `_cover` (bit i = bộ i che đỉnh này) → bỏ tam giác bị
  // bộ đang mặc che. Không bỏ thì da lòi qua áo khi cúi, xoay (rig_base --outfits).
  // + mặt nạ món rời (tủ đồ, `VuCong3D.mon`): ảnh theo UV của thân, trắng = da dưới món → bỏ. mn = { mat, co }.
  function cheDa(m, u, mn) {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uBo = u;
      sh.uniforms.uMat = mn.mat;
      sh.uniforms.uCoMat = mn.co;
      sh.vertexShader = 'attribute float _cover;\nuniform float uBo;\nvarying float vChe;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vChe = uBo > 0.5 ? mod(floor(_cover / uBo + 0.001), 2.0) : 0.0;');
      sh.fragmentShader = 'varying float vChe;\nuniform sampler2D uMat;\nuniform float uCoMat;\n' + sh.fragmentShader.replace(
        'void main() {', 'void main() {\n  if (vChe > 0.001) discard;\n#ifdef USE_MAP\n  if (uCoMat > 0.5 && texture2D(uMat, vMapUv).r > 0.5) discard;\n#endif');
    };
    m.customProgramCacheKey = () => 'che-da';
  }

  function makeActor(color, parent, floorY) {
    const obj = SkeletonUtils.clone(gltf.scene);
    const che = [];
    let than = null; // lưới thân (có `_cover`): món rời buộc vào cùng xương, cùng bindMatrix với nó
    const mn = { mat: { value: null }, co: { value: 0 } };
    obj.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        if (o.name.startsWith('Beta_')) { // hình nộm X Bot: tô màu phân biệt
          o.material = o.name.includes('Surface')
            ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.6 })
            : new THREE.MeshStandardMaterial({ color: '#1a1a22', metalness: 0.6, roughness: 0.3 });
        } else {
          // MPFB xuất mọi vật liệu ở chế độ BLEND → vẽ chồng sai thứ tự. Da/mắt: đặc; tóc, mày, mi, đồ alpha cắt
          // (glTF MASK, vd bikini): cắt theo alpha.
          const m = o.material = o.material.clone();
          const cutout = m.alphaTest > 0 || /long|hair|bob|ponytail|braid|short|eyebrow|eyelash|high-poly|low-poly/i.test(o.name); // high-poly = mắt (giác mạc trong)
          if (/long|hair|bob|ponytail|braid|short|eyebrow|eyelash/i.test(o.name)) m.color.set('#3a2c26'); // tóc, mày đen kiểu donghua
          m.transparent = false; m.depthWrite = true;
          m.alphaTest = cutout ? 0.45 : 0;
          m.side = cutout ? THREE.DoubleSide : THREE.FrontSide;
          if (!cutout && m.map) m.map.format = THREE.RGBAFormat;
          if (!cutout) m.alphaMap = null;
          o.renderOrder = cutout ? 1 : 0;
          if (o.geometry.attributes._cover) {
            const u = { value: 0 };
            cheDa(m, u, mn);
            che.push(u);
            than = o;
          }
        }
      }
    });
    obj.updateMatrixWorld(true);
    let top = null;
    let head = null;
    obj.traverse((o) => { if (o.isBone && /HeadTop_End$/.test(o.name)) top = o; if (o.isBone && /Head$/.test(o.name)) head = o; });
    // xương MPFB không có HeadTop_End: lấy đỉnh đầu ≈ gốc xương Head + 0.22 m (theo tỉ lệ)
    const h = top ? top.getWorldPosition(new THREE.Vector3()).y
      : head ? head.getWorldPosition(new THREE.Vector3()).y * 1.14 : 1.8;
    obj.scale.multiplyScalar(DANCER_HEIGHT / h);
    parent.add(obj);
    const bones = [];
    obj.traverse((o) => { if (o.isBone) bones.push(o); });
    const a = { obj, bones, dau: head, floorY, che, than, mn, mon: [], monKhoa: '', mixer: new THREE.AnimationMixer(obj), action: null, name: '', next: Infinity };
    actors.push(a);
    return a;
  }
  // Mặc bộ `id` (không có trong GLB → bộ đầu). Món thuộc bộ nào ghi ở `extras.outfits` của từng nút ("a,b");
  // GLB một bộ (không có extras) thì để nguyên.
  function mac(a, id) {
    if (!BO.length) return;
    const i = Math.max(0, BO.indexOf(id));
    a.obj.traverse((o) => {
      const ds = o.userData?.outfits;
      if (typeof ds === 'string' && !ds.startsWith('[')) o.visible = ds.split(',').includes(BO[i]);
    });
    for (const u of a.che) u.value = 2 ** i;
  }
  // hạ/nâng cả người để điểm thấp nhất chạm đúng mặt sàn (chân, gối, tay khi breakdance)
  function ground(a) {
    a.obj.updateMatrixWorld(true);
    let low = Infinity;
    for (const b of a.bones) { b.getWorldPosition(bonePos); if (bonePos.y < low) low = bonePos.y; }
    const target = a.obj.position.y + (a.floorY + 0.03 - low);
    a.obj.position.y += (target - a.obj.position.y) * 0.5;
  }
  function play(a, name, auto = true) {
    const clip = clips.find((c) => c.name === name);
    if (!clip) return;
    const act = a.mixer.clipAction(clip);
    act.reset().setLoop(THREE.LoopRepeat).fadeIn(0.4).play();
    act.timeScale = 1;
    if (a.action && a.action !== act) a.action.fadeOut(0.4);
    a.action = act; a.name = name;
    a.next = auto ? performance.now() / 1000 + SWITCH_SECONDS : Infinity;
  }
  const randomClip = (except) => {
    const tat = dieuTuDo();
    const pool = tat.length > 1 ? tat.filter((c) => c.name !== except) : tat;
    return pool[Math.floor(Math.random() * pool.length)].name;
  };
  const has = (n) => clips.some((c) => c.name === n);
  // Cả nhóm vào điệu chung từ đầu cho khớp nhịp; đang nghỉ thì phát chậm thành nhún nhẹ.
  function vaoDieuChung(a) {
    play(a, dieuChung, false);
    if (a.action) a.action.timeScale = nghi ? TOC_NGHI : 1;
  }

  // Màn hình chiếu vũ công: cảnh riêng + camera riêng render ra texture
  let screenRT = null, screenScene, screenCam, screenDancer = null, screenOverlay = null;
  if (S.screen) {
    screenRT = new THREE.WebGLRenderTarget(512, 288, { samples: 4 });
    screenRT.texture.colorSpace = THREE.SRGBColorSpace;
    screenScene = new THREE.Scene();
    screenScene.add(new THREE.HemisphereLight('#ffd6f0', '#301040', 1.6));
    const rim = new THREE.DirectionalLight('#18d6ff', 2.5); rim.position.set(-2, 3, -2); screenScene.add(rim);
    const front = new THREE.DirectionalLight('#ffffff', 1.5); front.position.set(1, 2, 3); screenScene.add(front);
    screenCam = new THREE.PerspectiveCamera(30, 512 / 288, 0.1, 20);
    screenCam.position.set(0, 0.95, 3.0); screenCam.lookAt(0, 0.85, 0);
    screenOverlay = new THREE.Mesh(new THREE.PlaneGeometry(S.screen.w, S.screen.h),
      new THREE.MeshBasicMaterial({ map: screenRT.texture, transparent: true, toneMapped: false }));
    screenOverlay.position.set(...S.screen.pos); screenOverlay.rotation.y = S.screen.rotY ?? 0;
    screenOverlay.visible = false;
    scene.add(screenOverlay);
  }
  // Những người nhảy theo điệu chung: vai chính, người trên màn chiếu, đám đông "theo cả nhóm".
  const nhomNhay = () => [...dancers, ...(screenDancer ? [screenDancer] : []), ...dongDam.filter((a) => !a.tuDo)];

  function boHet() {
    for (const a of actors.splice(0)) {
      a.mixer.stopAllAction();
      a.obj.removeFromParent();
      a.obj.traverse((o) => { if (o.isMesh) o.material.dispose(); });
    }
    dancers = []; screenDancer = null; djActor = null; dongDam = []; kyDamDong = '';
    if (screenOverlay) screenOverlay.visible = false;
  }

  // Dựng lại toàn bộ người (vũ công, DJ, người trên màn chiếu) từ GLB mới. url null = sàn trống.
  async function datModel(url) {
    const luot = ++luotNap;
    const g = url ? await new GLTFLoader().loadAsync(url) : null;
    if (luot !== luotNap || dung) return;                       // đã có yêu cầu mới hơn / cảnh đã dọn
    boHet();
    if (gltf) gltf.scene.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    gltf = g; modelUrl = url;
    clips = gltf ? gltf.animations.map(prepClip).sort((x, y) => x.name.localeCompare(y.name)) : [];
    BO = [];
    if (!gltf) return;
    gltf.scene.traverse((o) => {
      const ds = o.userData?.outfits;
      if (typeof ds === 'string' && ds.startsWith('[')) BO = JSON.parse(ds).map((x) => x.id);
    });
    // vũ công chính. Chọn điệu bằng tay là việc của trang quản lý / module, không vẽ lên sóng.
    const colors = ['#e8e2f0', '#f0d9b5', '#d9e6f2'];
    dancers = S.spots.map(([x, z], i) => {
      const a = makeActor(colors[i % colors.length], scene, S.floorY);
      a.id = `vu-cong-${i + 1}`;
      a.obj.position.set(x, S.floorY, z);
      a.obj.rotation.y = S.facing ?? 0;
      const ds = dieuTuDo();
      play(a, ds[(i * 7) % ds.length].name);
      return a;
    });
    // DJ đứng sau quầy: nhún nhẹ, tay đánh đĩa (che phần dưới bằng quầy). Mặc bộ đầu của GLB, không theo vũ công.
    if (S.dj) {
      const dj = djActor = makeActor('#2b2b33', scene, S.dj.floorY);
      dj.id = 'dj';
      dj.obj.position.set(S.dj.x, S.dj.floorY, S.dj.z);
      dj.obj.rotation.y = S.dj.rotY ?? 0;
      play(dj, ['Hip Hop Dancing', 'Silly Dancing', 'Shuffling'].find(has) ?? clips[0].name, false);
      dj.action.timeScale = 0.6;
    }
    if (screenRT) {
      screenDancer = makeActor('#ff9ecf', screenScene, 0);
      screenDancer.id = 'man-chieu';
      play(screenDancer, ['Dancing Twerk', 'Belly Dance', 'Samba Dancing', 'Hip Hop Dancing'].find(has) ?? clips[0].name);
      screenOverlay.visible = true;
    }
    macHet();
    if (dieuChung) for (const a of nhomNhay()) vaoDieuChung(a);
    apAn();
    datDamDong();
  }

  function boNguoi(a) {
    a.mixer.stopAllAction();
    a.obj.removeFromParent();
    a.obj.traverse((o) => { if (o.isMesh) o.material.dispose(); });
    const i = actors.indexOf(a);
    if (i >= 0) actors.splice(i, 1);
  }

  // Số giả ngẫu nhiên theo id nhóm: sửa nhóm khác hay tải lại trang thì đám đông vẫn mặc y bộ cũ, nhảy y pha cũ.
  function rngTu(chuoi) {
    let h = 2166136261;
    for (const c of chuoi) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
      h = (h + 0x6d2b79f5) | 0;
      let t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Xếp `n` chỗ đứng trong các ô chữ nhật [x0, x1, z0, z1] của khu vực theo ô bàn cờ: lưới chung cho mọi nhóm
  // (cách đều `O_CO`), chỉ đứng ô cùng màu nên hàng sau lọt khe hàng trước. Lấp từ ô gần giữa sàn ra ngoài.
  // Cả khối cùng quay một hướng: từ tâm ô chữ nhật về giữa sàn.
  function raiCho(o, n, daCo) {
    const O_CO = 0.8;
    const ds = [];
    for (const [x0, x1, z0, z1] of o) {
      const goc = Math.atan2(S.nhin[0] - (x0 + x1) / 2, S.nhin[1] - (z0 + z1) / 2);
      for (let i = Math.ceil(x0 / O_CO); i * O_CO <= x1; i++) {
        for (let j = Math.ceil(z0 / O_CO); j * O_CO <= z1; j++) {
          if ((i + j) % 2 === 0) ds.push([i * O_CO, j * O_CO, goc]);
        }
      }
    }
    const xa = ([x, z]) => Math.hypot(x - S.nhin[0], z - S.nhin[1]);
    ds.sort((a, b) => xa(a) - xa(b) || a[0] - b[0] || a[1] - b[1]);
    const ra = [];
    for (const [x, z, goc] of ds) {
      if (ra.length >= n) break;
      if ([...daCo, ...ra].every(([px, pz]) => Math.hypot(px - x, pz - z) > 0.75)) ra.push([x, z, goc]);
    }
    return ra;
  }

  // Dựng lại đám đông theo các nhóm. Chỉ chạy khi nhóm đổi (số người, khu vực, đồ, cách nhảy), không mỗi nhịp.
  function datDamDong() {
    for (const a of dongDam) boNguoi(a);
    dongDam = [];
    kyDamDong = JSON.stringify(damDong);
    if (!gltf || !S.khuVuc) return;
    const daCo = S.spots.map(([x, z]) => [x, z]);
    let con = TOI_DA_DAM_DONG;
    const ds = dieuTuDo();
    for (const n of damDong) {
      const o = S.khuVuc[n.khuVuc];
      if (!o || con <= 0) continue;
      const rand = rngTu(n.id);
      const cho = raiCho(o, Math.min(n.so, con), daCo);
      con -= cho.length;
      for (const [x, z, goc] of cho) {
        const a = makeActor('#d9d2c8', scene, S.floorY);
        a.id = `dam-dong:${n.id}`;
        a.dam = dongDam.length; // số thứ tự trong đám đông: chia lượt việc nặng giữa các khung hình
        a.cho = 0;              // giây chuyển động còn nợ (đám đông cập nhật nửa nhịp)
        // Đám đông không đổ bóng: bóng của vài chục người là vẽ lại cả bấy nhiêu xương thêm một lần.
        a.obj.traverse((o) => { if (o.isMesh) o.castShadow = false; });
        a.tuDo = !n.theoNhom;
        a.boCo = n.bo[Math.floor(rand() * n.bo.length)] ?? null;
        a.obj.position.set(x, S.floorY, z);
        a.obj.rotation.y = goc;
                mac(a, a.boCo);
        if (dieuChung && !a.tuDo) vaoDieuChung(a);
        else {
          play(a, ds[Math.floor(rand() * ds.length)].name);
          a.action.time = rand() * a.action.getClip().duration; // lệch pha, không ai nhảy y hệt ai
        }
        daCo.push([x, z]);
        dongDam.push(a);
      }
    }
  }

  // Bộ của từng người: bộ riêng nếu có, không thì theo cả nhóm. DJ không theo nhóm: mặc bộ đầu của GLB.
  function macHet() {
    for (const a of nhomNhay()) {
      // món rời cho cả nhóm, trừ người có bộ riêng và đám đông (đám đông giữ bộ dựng sẵn của nhóm nó)
      if (monChung.length > 0 && !boRieng[a.id] && a.dam === undefined) void macMon(a, monChung);
      else { void macMon(a, []); mac(a, boRieng[a.id] ?? a.boCo ?? boChon); }
    }
    if (djActor) mac(djActor, boRieng.dj ?? BO[0]);
  }

  // ---------- món rời (tủ đồ) ----------
  const khoMon = new Map(); // url thư mục món → Promise<{ g: gltf, t: Texture mặt nạ } | null>
  function napMon(url) {
    if (!khoMon.has(url)) {
      khoMon.set(url, Promise.all([
        new GLTFLoader().loadAsync(url + 'mon.glb'),
        new THREE.TextureLoader().loadAsync(url + 'mat-na.png'),
      ]).then(([g, t]) => ({ g, t })).catch(() => null)); // món hỏng / đã xoá: bỏ món đó, không hỏng cả bộ
    }
    return khoMon.get(url);
  }
  const matNaGop = new Map(); // khoá bộ → CanvasTexture gộp mặt nạ mọi món
  function gopMatNa(khoa, ts) {
    if (!matNaGop.has(khoa)) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 512;
      const g = cv.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
      g.globalCompositeOperation = 'lighten';
      for (const t of ts) g.drawImage(t.image, 0, 0, 512, 512);
      const tex = new THREE.CanvasTexture(cv);
      tex.flipY = false; // ảnh mặt nạ xếp theo UV glTF (hàng trên = v nhỏ), như hoa văn của thân
      matNaGop.set(khoa, tex);
    }
    return matNaGop.get(khoa);
  }
  async function macMon(a, urls) {
    const khoa = urls.join('|');
    if (a.monKhoa === khoa) return;
    a.monKhoa = khoa;
    for (const m of a.mon) m.removeFromParent();
    a.mon = [];
    a.mn.co.value = 0;
    if (!urls.length || !a.than) return;
    const ds = (await Promise.all(urls.map(napMon))).filter(Boolean);
    if (a.monKhoa !== khoa || !a.obj.parent) return; // đổi bộ giữa lúc tải, hoặc người đã bị dọn (màn chiếu ở cảnh riêng)
    // ẩn bộ dựng sẵn trong GLB (mọi món có `extras.outfits`); da theo mặt nạ món thay cho `_cover`
    a.obj.traverse((o) => { const t = o.userData?.outfits; if (typeof t === 'string' && !t.startsWith('[')) o.visible = false; });
    for (const u of a.che) u.value = 0;
    const xuong = new Map(a.bones.map((b) => [b.name, b]));
    for (const { g } of ds) {
      g.scene.traverse((src) => {
        if (!src.isSkinnedMesh) return;
        const bones = src.skeleton.bones.map((b) => xuong.get(b.name));
        if (bones.some((b) => !b)) return; // xương lạ: món không thuộc nhân vật này
        const m = src.clone();
        m.frustumCulled = false; // khung bao lưới có xương không theo điệu nhảy
        m.castShadow = a.dam === undefined;
        a.than.parent.add(m);
        m.bind(new THREE.Skeleton(bones, src.skeleton.boneInverses), a.than.bindMatrix);
        a.mon.push(m);
      });
    }
    a.mn.mat.value = gopMatNa(khoa, ds.map((d) => d.t));
    a.mn.co.value = 1;
  }

  // Ẩn người không có mặt. Vẫn giữ họ trong cảnh (mixer chạy tiếp): cho vào lại là hiện ngay, khớp nhịp.
  function apAn() {
    dancers.forEach((a, i) => { a.obj.visible = !an.includes(`vu-cong-${i + 1}`); });
    if (djActor) djActor.obj.visible = !an.includes('dj');
    // màn chiếu không người thì về ảnh nền của màn
    if (screenDancer && screenOverlay) screenOverlay.visible = !an.includes('man-chieu');
  }

  /** Áp yêu cầu của module (`VuCong3D`; null = không có module vũ công → sàn trống). */
  function vuCong(v) {
    const url = v?.model ?? null;
    boChon = v?.trangPhuc ?? null;
    const dieu = v?.dieu ?? null;
    tuDo = v?.tuDo ?? null;
    const nghiMoi = v?.nghi === true;
    an = v?.an ?? [];
    boRieng = v?.boRieng ?? {};
    monChung = v?.mon ?? [];
    damDong = v?.damDong ?? [];
    if (url !== modelUrl) { dieuChung = dieu; nghi = nghiMoi; void datModel(url); return; }
    macHet();
    apAn();
    if (JSON.stringify(damDong) !== kyDamDong) datDamDong();
    if (dieu !== dieuChung || nghiMoi !== nghi) {
      dieuChung = dieu;
      nghi = nghiMoi;
      // đồng diễn: mọi người cùng vào điệu từ đầu cho khớp nhịp; hết thì mỗi người tự đổi, lệch nhau
      const ds = dieuTuDo();
      nhomNhay().forEach((a, i) => (dieu ? vaoDieuChung(a) : play(a, ds[(i * 7 + 3) % ds.length].name)));
    }
  }
  if (model) vuCong({ model, trangPhuc: null, dieu: null });

  if (inspect) window.__bar = { scene, camera, controls, actors, vuCong };

  // ---------- vòng lặp ----------
  function resize() {
    const w = Math.max(1, mount.clientWidth), h = Math.max(1, mount.clientHeight);
    renderer.setSize(w, h); composer.setSize(w, h); bloom.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(mount); resize();
  // Người vận hành kéo chuột / chạm để xoay, cuộn để phóng. Không ai cầm (lên sóng qua OBS) thì camera tự đung
  // đưa chậm quanh góc đang đứng; buông tay NGHI_TAY giây thì đung đưa tiếp từ đúng góc người vừa để lại.
  // ?inspect=1: chỉ xoay tay, không tự đung đưa.
  const NGHI_TAY = 8;
  controls.enabled = true;
  let dangCam = false, buongLuc = -Infinity, dungDua = true, dungDuaTu = 0;
  const goc0 = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  const lac = S.camera.azimuth ? Math.min(Math.abs(S.camera.azimuth[0]), Math.abs(S.camera.azimuth[1])) * 0.6 : 0.25;
  controls.addEventListener('start', () => { dangCam = true; dungDua = false; keoGan = false; });
  controls.addEventListener('end', () => { dangCam = false; buongLuc = clock.elapsedTime; });

  // Nháy đúp vào một vũ công: camera bay tới cận mặt người đó và bám theo khi họ nhảy. Nháy đúp chỗ trống: thôi bám.
  const CAN_MAT = 1.1; // khoảng cách tới mặt khi lấy nét (m)
  let bam = null, keoGan = false;
  const dauO = new THREE.Vector3(), lech = new THREE.Vector3();
  const trongCanh = (o) => { while (o.parent) o = o.parent; return o === scene; };
  function chonVuCong(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * 2 - 1, y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    let gan = null, kc = 0.12; // bán kính bắt, theo toạ độ màn hình chuẩn hoá
    for (const a of actors) {
      if (!a.dau || !a.obj.visible || !trongCanh(a.obj)) continue;
      const v = a.dau.getWorldPosition(dauO).project(camera);
      if (v.z > 1) continue; // sau lưng camera
      const k = Math.hypot(v.x - x, (v.y - y) * (r.height / r.width));
      if (k < kc) { kc = k; gan = a; }
    }
    bam = gan; keoGan = gan !== null;
    dungDua = false; buongLuc = clock.elapsedTime;
  }
  renderer.domElement.addEventListener('dblclick', chonVuCong);

  const clock = new THREE.Clock();
  const tmp = new THREE.Color();
  let frame = 0;
  let nhipDam = 0; // đếm khung hình cho việc chia lượt của đám đông
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta(), t = clock.elapsedTime;
    const { beat, pulse, bar4 } = nhipTai(t, BPM);
    if (bam && !trongCanh(bam.obj)) bam = null;
    // Đang bám thì cuộn là phóng thẳng vào mặt; phóng theo con trỏ sẽ kéo tâm lệch khỏi mặt rồi bị kéo về, giật.
    controls.zoomToCursor = !bam;
    if (bam) {
      // Dời tâm theo đầu vũ công, camera dời cùng một đoạn: góc nhìn giữ nguyên, mặt luôn ở giữa khung.
      {
        bam.dau.getWorldPosition(dauO).y += 0.06 * (DANCER_HEIGHT / 1.7); // gốc xương Head ở gáy, mặt cao hơn chút
        lech.copy(dauO).sub(controls.target).multiplyScalar(0.15);
        controls.target.add(lech); camera.position.add(lech);
        if (keoGan) {
          lech.copy(camera.position).sub(controls.target);
          const len = lech.length();
          lech.setLength(len + (CAN_MAT - len) * 0.12);
          camera.position.copy(controls.target).add(lech);
          if (Math.abs(len - CAN_MAT) < 0.02) keoGan = false;
        }
      }
    }
    if (!inspect && !dangCam && !dungDua && t - buongLuc > NGHI_TAY) {
      // Lấy góc đang đứng làm tâm mới; sin(0) = 0 nên camera đi tiếp êm, không giật về góc cũ.
      goc0.setFromVector3(camera.position.clone().sub(controls.target));
      dungDua = true; dungDuaTu = t;
    }
    if (!inspect && dungDua) {
      const sp = goc0.clone(); sp.theta += Math.sin((t - dungDuaTu) * 0.08) * lac;
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sp));
    }
    nhipDam++;
    for (const a of actors) {
      if (a.dam === undefined) {
        a.mixer.update(dt);
        ground(a);
      } else {
        // Đám đông: chuyển động nửa nhịp, dò chân chạm đất mỗi 8 khung một người — dò từng xương rất tốn.
        a.cho += dt;
        if ((nhipDam + a.dam) % 2 === 0) { a.mixer.update(a.cho); a.cho = 0; }
        if ((nhipDam + a.dam) % 8 === 0) ground(a);
      }
      if (t > a.next && clips.length > 1 && (!dieuChung || a.tuDo)) play(a, randomClip(a.name));
    }
    for (const { m, phase } of ledStrips) {
      const k = ((bar4 + Math.round(phase * 4)) % 4 + 4) % 4;
      tmp.copy(PALETTE[k]).lerp(PALETTE[(k + 1) % 4], (beat / 4) % 1);
      m.material.color.copy(tmp).multiplyScalar(1.6 + pulse * 1.2);
    }
    S.update(t, beat, pulse, bar4);
    if (screenDancer && (frame++ % 2 === 0)) {
      screenDancer.obj.rotation.y = Math.sin(t * 0.4) * 0.5;
      renderer.setRenderTarget(screenRT);
      renderer.setClearColor(0x000000, 0); renderer.clear();
      renderer.render(screenScene, screenCam);
      renderer.setRenderTarget(null);
    }
    controls.update();
    keepInside();
    composer.render();
  });

  const don = () => {
    dung = true;
    renderer.setAnimationLoop(null);
    ro.disconnect();
    renderer.domElement.removeEventListener('dblclick', chonVuCong);
    controls.dispose();
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      for (const m of [].concat(o.material ?? [])) { for (const v of Object.values(m)) v?.isTexture && v.dispose(); m.dispose?.(); }
    });
    screenRT?.dispose();
    pmrem.dispose(); composer.dispose?.(); renderer.dispose();
    renderer.domElement.remove();
  };
  return { don, vuCong };
}
