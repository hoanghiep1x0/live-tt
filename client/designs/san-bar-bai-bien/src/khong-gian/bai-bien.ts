// @ts-nocheck — chuyển nguyên từ bản dựng thử (D:/Live-bar/client/public/bar/space-beach.js).
// Không gian "Bờ biển": hoàng hôn, bãi cát rộng, sân khấu gỗ lớn, dừa, đuốc, lửa trại, dây đèn.
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const name = 'Bờ biển hoàng hôn';

export function build(ctx) {
  const TEX = ctx.tex;
  const { THREE, scene, renderer, add, strip, glow, neon, pbr, lacquer, chrome, envFromScene, PALETTE } = ctx;
  renderer.toneMappingExposure = 0.36;
  // trời sáng: chỉ cho vật thật sáng (đèn, lửa) toả quầng
  ctx.bloom.strength = 0.45; ctx.bloom.threshold = 0.95; ctx.bloom.radius = 0.4;

  // ---------- trời + mặt trời thấp ----------
  // mặt trời sát chân trời, chếch sang trái phía biển (không nằm ngay sau sân khấu để khỏi loá)
  const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(88.5), THREE.MathUtils.degToRad(235));
  const sky = new Sky(); sky.scale.setScalar(350); // nằm trong tầm xa của camera (400)
  sky.material.uniforms.turbidity.value = 2.5;
  sky.material.uniforms.rayleigh.value = 3.2;
  sky.material.uniforms.mieCoefficient.value = 0.0025;
  sky.material.uniforms.mieDirectionalG.value = 0.72;
  sky.material.uniforms.sunPosition.value.copy(sun);
  scene.add(sky);
  const envScene = new THREE.Scene(); const sky2 = sky.clone(); envScene.add(sky2);
  envFromScene(envScene, 0.9);
  scene.fog = new THREE.Fog('#d98a6a', 90, 340);

  const sunLight = new THREE.DirectionalLight('#ff9a60', 1.6);
  sunLight.position.copy(sun).multiplyScalar(80); sunLight.position.y = Math.max(sunLight.position.y, 14);
  sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 200 });
  sunLight.shadow.bias = -0.0004;
  scene.add(sunLight);
  scene.add(new THREE.HemisphereLight('#ffb8a8', '#8a5a48', 1.1)); // ánh chiều hồng cam, đổ bóng dịu

  // ---------- biển ----------
  const normals = new THREE.TextureLoader().load(`${TEX}waternormals.jpg`, (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
  const water = new Water(new THREE.PlaneGeometry(2000, 2000), {
    textureWidth: 512, textureHeight: 512, waterNormals: normals,
    sunDirection: sun.clone(), sunColor: '#ffd2a0', waterColor: '#0a3a5a', distortionScale: 3.2, fog: true,
  });
  water.rotation.x = -Math.PI / 2; water.position.set(0, -0.15, -1000); // nước phủ tới z = 0, cát nhô lên khỏi mặt nước từ z ≈ -5.25
  scene.add(water);

  // ---------- bãi cát (dốc nhẹ xuống biển) ----------
  const sandGeo = new THREE.PlaneGeometry(240, 120, 120, 60);
  const sp = sandGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), y = sp.getY(i); // y của plane = -z thế giới
    const zWorld = -y;
    // gợn cát nhẹ, phẳng dần về khu nhảy giữa bãi để chân nhân vật chạm đúng
    const flat = THREE.MathUtils.smoothstep(Math.hypot(x, zWorld - 6), 14, 26);
    let h = flat * (0.08 * Math.sin(x * 0.3) * Math.cos(y * 0.25) + 0.05 * Math.sin(x * 1.3 + y));
    if (zWorld < -4) h -= (-4 - zWorld) * 0.12; // thoải xuống mép nước
    sp.setZ(i, h);
  }
  sandGeo.computeVertexNormals();
  const sand = new THREE.Mesh(sandGeo, pbr('coast_sand_01', 40, 20, { color: '#f2d6b0', roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.z = 40; sand.receiveShadow = true;
  scene.add(sand);
  // cao độ cát tại (x, z), cùng công thức với lưới ở trên — để cua, vỏ sò nằm đúng mặt cát
  const sandH = (x, z) => {
    const flat = THREE.MathUtils.smoothstep(Math.hypot(x, z - 6), 14, 26);
    const y = 40 - z; // toạ độ y của plane (plane đặt ở z = 40)
    let h = flat * (0.08 * Math.sin(x * 0.3) * Math.cos(y * 0.25) + 0.05 * Math.sin(x * 1.3 + y));
    if (z < -4) h -= (-4 - z) * 0.12;
    return h;
  };
  const SHORE_Z = -4 - 0.15 / 0.12; // nơi cát gặp mặt nước (≈ -5.25)

  // ---------- sóng nhỏ xô bờ: dải bọt trắng trườn lên rồi rút, để lại vệt cát ướt ----------
  const foamTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 64;
    const g = cv.getContext('2d');
    for (let i = 0; i < 1600; i++) {
      const x = Math.random() * 1024, y = 8 + Math.random() * 40 * Math.random();
      g.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.6})`;
      g.beginPath(); g.ellipse(x, y, 4 + Math.random() * 14, 1 + Math.random() * 3, 0, 0, Math.PI * 2); g.fill();
    }
    const fade = g.createLinearGradient(0, 0, 0, 64);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(0.2, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = fade; g.fillRect(0, 0, 1024, 64);
    const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.repeat.set(12, 1); return t;
  })();
  const waves = [];
  for (let k = 0; k < 3; k++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(240, 1.4),
      new THREE.MeshBasicMaterial({ map: foamTex.clone(), transparent: true, depthWrite: false, color: '#ffffff' }));
    m.material.map.repeat.set(12, 1); m.material.map.offset.x = k * 0.37;
    m.rotation.x = -Math.PI / 2 + Math.atan(0.12); m.renderOrder = 3; scene.add(m);
    waves.push({ m, phase: k / 3 });
  }
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(240, 3),
    new THREE.MeshPhysicalMaterial({ color: '#7a5a42', roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.55, depthWrite: false }));
  wet.rotation.x = -Math.PI / 2 + Math.atan(0.12); wet.position.set(0, -0.05, SHORE_Z + 0.6); scene.add(wet);
  function updateWaves(t) {
    for (const w of waves) {
      const p = (t / 7 + w.phase) % 1;                       // mỗi con sóng ~7 giây
      const reach = p < 0.45 ? Math.sin((p / 0.45) * Math.PI / 2) : Math.cos(((p - 0.45) / 0.55) * Math.PI / 2);
      const z = SHORE_Z - 1.6 + reach * 2.6;
      w.m.position.set(0, Math.max(-0.14, sandH(0, z)) + 0.03, z);
      w.m.material.opacity = p < 0.45 ? 0.85 : 0.85 * (1 - (p - 0.45) / 0.55);
      w.m.material.map.offset.x += 0.0004;
    }
  }

  // ---------- nhảy thẳng trên cát (không sàn gỗ); chỉ DJ đứng bục thấp ----------
  const DECK = { d: 16, z: 6, h: 0 };
  const deckMat = pbr('dark_wood', 2, 1, { color: '#c9925e', roughness: 0.95, specularIntensity: 0.15 });
  // vòng sáng đổi màu in trên cát giữa bãi
  const ledCv = document.createElement('canvas'); ledCv.width = ledCv.height = 512;
  const ledTex = new THREE.CanvasTexture(ledCv); ledTex.colorSpace = THREE.SRGBColorSpace;
  const dance = new THREE.Mesh(new THREE.CircleGeometry(9, 64),
    new THREE.MeshBasicMaterial({ map: ledTex, transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  dance.rotation.x = -Math.PI / 2; dance.position.set(0, 0.02, DECK.z - 1); scene.add(dance);
  function drawDance(t, beat) {
    const g = ledCv.getContext('2d');
    g.clearRect(0, 0, 512, 512);
    for (let r = 0; r < 8; r++) {
      const c = PALETTE[(r + Math.floor(beat)) % 4].getHexString();
      g.globalAlpha = 0.12 + 0.35 * Math.max(0, Math.sin(r * 0.9 - t * 4));
      g.strokeStyle = `#${c}`; g.lineWidth = 18;
      g.beginPath(); g.arc(256, 256, 30 + r * 28, 0, Math.PI * 2); g.stroke();
    }
    g.globalAlpha = 1; ledTex.needsUpdate = true;
  }

  // ---------- quầy DJ + khung màn hình phía sau (hướng ra biển ngược lại: nhìn về khán giả) ----------
  const back = DECK.z - DECK.d / 2 + 1.2;
  add(new THREE.BoxGeometry(6, 0.4, 3.2), deckMat, 0, 0.2, back + 0.9); // bục DJ
  add(new RoundedBoxGeometry(4, 1.15, 1.2, 4, 0.08), lacquer('#14100c'), 0, 0.4 + 0.575, back + 1.4);
  strip(3.9, 0.04, 0.04, 0, 0.4 + 0.9, back + 2.02, 0.1);
  for (const x of [-1.1, 1.1]) add(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32), lacquer('#151515'), x, 0.4 + 1.18, back + 1.35);
  // khung màn LED trên giàn tre/thép
  for (const x of [-5.4, 5.4]) add(new THREE.BoxGeometry(0.3, 7.5, 0.3), chrome, x, DECK.h + 3.75, back);
  add(new THREE.BoxGeometry(11.1, 0.3, 0.3), chrome, 0, DECK.h + 7.4, back);
  const scrCv = document.createElement('canvas'); scrCv.width = 512; scrCv.height = 256;
  const scrTex = new THREE.CanvasTexture(scrCv); scrTex.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.BoxGeometry(10.2, 5.4, 0.15), lacquer('#050505'), 0, DECK.h + 4.3, back);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(9.8, 5.0), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }));
  scr.position.set(0, DECK.h + 4.3, back + 0.09); scene.add(scr);
  function drawScreen(t, beat) {
    const g = scrCv.getContext('2d'), W = 512, H = 256;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#2a0a3a'); sky.addColorStop(0.6, '#ff5a7a'); sky.addColorStop(1, '#ffb050');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(W / 2, H * 0.7, 46 + Math.sin(beat * Math.PI) * 4, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(42,10,58,${0.5 + i * 0.08})`; g.fillRect(0, H * 0.7 + i * 9, W, 4); }
    g.font = '800 34px "Segoe UI", system-ui'; g.textAlign = 'center';
    g.fillStyle = '#fff'; g.fillText('SUNSET BEACH PARTY', W / 2, 40);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    for (let x = 0; x < W; x += 4) g.fillRect(x, 0, 1, H);
    scrTex.needsUpdate = true;
  }

  // ---------- dây đèn bóng tròn giăng trên sân khấu ----------
  const poles = [[-12, 0], [12, 0], [-12, 12], [12, 12]];
  for (const [x, z] of poles) add(new THREE.CylinderGeometry(0.1, 0.12, 6, 10), pbr('dark_wood', 1, 3, { color: '#6a4a30' }), x, 3, z);
  const bulbs = [];
  const bulbMat = glow('#ffd890', 2.2);
  function swag(a, b) {
    const n = 26;
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      const p = new THREE.Vector3(a[0] + (b[0] - a[0]) * u, 5.9 - Math.sin(u * Math.PI) * 1.4, a[1] + (b[1] - a[1]) * u);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), bulbMat);
      m.position.copy(p); scene.add(m); bulbs.push(m);
    }
  }
  swag(poles[0], poles[3]); swag(poles[1], poles[2]); swag(poles[0], poles[1]); swag(poles[2], poles[3]);
  swag(poles[0], poles[2]); swag(poles[1], poles[3]);
  // đèn sân khấu chiếu từ phía khán giả để nhân vật không bị ngược sáng
  for (const x of [-9, 9]) {
    const fl = new THREE.SpotLight('#ffe2c8', 140, 40, 0.5, 0.6, 1.2);
    fl.position.set(x, 9, 22); fl.target.position.set(0, 1, DECK.z - 2);
    scene.add(fl, fl.target);
    add(new THREE.CylinderGeometry(0.08, 0.1, 9, 8), chrome, x, 4.5, 22.4);
  }

  // ---------- dừa ----------
  const leafTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256;
    const g = cv.getContext('2d');
    g.fillStyle = '#3f7a2a';
    g.beginPath(); g.moveTo(32, 0);
    for (let y = 0; y <= 256; y += 16) { const w = Math.sin((y / 256) * Math.PI) * 30; g.lineTo(32 + w, y); g.lineTo(32 + w * 0.6, y + 8); }
    for (let y = 256; y >= 0; y -= 16) { const w = Math.sin((y / 256) * Math.PI) * 30; g.lineTo(32 - w * 0.6, y + 8); g.lineTo(32 - w, y); }
    g.fill();
    g.strokeStyle = '#2a5418'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 0); g.lineTo(32, 256); g.stroke();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  const trunkMat = pbr('dark_wood', 1, 1, { color: '#8a6a4a', roughness: 0.9 });
  function palm(x, z, h, lean, rotY) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
    const segs = 12; let px = 0, py = 0;
    for (let s = 0; s < segs; s++) {
      const u = s / segs, r = 0.24 - u * 0.1;
      const nx = Math.pow((s + 1) / segs, 2) * lean, ny = ((s + 1) / segs) * h;
      const len = Math.hypot(nx - px, ny - py);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, len * 1.02, 10), trunkMat);
      seg.position.set((px + nx) / 2, (py + ny) / 2, 0);
      seg.rotation.z = -Math.atan2(nx - px, ny - py);
      seg.castShadow = true; g.add(seg); px = nx; py = ny;
    }
    for (let k = 0; k < 9; k++) {
      const geo = new THREE.PlaneGeometry(0.9, 3.6, 1, 10);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const v = (p.getY(i) + 1.8) / 3.6; p.setZ(i, -v * v * 1.6); }
      geo.translate(0, 1.8, 0); geo.computeVertexNormals();
      const leaf = new THREE.Mesh(geo, leafMat);
      leaf.position.set(px, py, 0);
      leaf.rotation.set(-0.9 + Math.random() * 0.3, (k / 9) * Math.PI * 2, 0, 'YXZ');
      leaf.castShadow = true; g.add(leaf);
    }
    for (let c = 0; c < 3; c++) add(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: '#5a3a1a' }), px + Math.cos(c * 2) * 0.2, py - 0.25, Math.sin(c * 2) * 0.2, { parent: g });
    g.updateMatrixWorld(true);
    return g.localToWorld(new THREE.Vector3(px, py - 0.6, 0)); // chỗ treo đèn, ngay dưới tán lá
  }
  const palmSpots = [[-18, 4], [-21, 10], [-16, 16], [18, 3], [21, 9], [17, 17], [-30, -2], [30, -1], [-26, 22], [27, 24], [-8, 26], [9, 28]];
  const palmTops = palmSpots.map(([x, z], i) => palm(x, z, 7 + (i % 3) * 1.4, 1.2 + (i % 2) * 0.8, i * 1.7));

  // ---------- đèn moving head treo trên dừa: xoay đủ hướng như hộp đêm ----------
  const beamFade = fadeTexture(THREE), poolTex = radialTexture(THREE);
  const heads = [];
  // kind: 'palm' treo dưới tán dừa · 'ground' đặt trên cát, bắn tia lên trời · 'plane' treo dưới máy bay
  function makeHead(parent, at, kind, realLight) {
    const i = heads.length;
    const top = at;
    const body = new THREE.Group(); body.position.copy(at); parent.add(body);
    if (kind === 'ground') body.rotation.x = Math.PI; // lật ngược: "dưới" của đèn thành hướng lên trời
    add(new THREE.BoxGeometry(0.34, 0.12, 0.34), lacquer('#111'), 0, 0.12, 0, { parent: body }); // giá kẹp / đế
    const pan = new THREE.Group(); body.add(pan);           // xoay ngang 360°
    const tilt = new THREE.Group(); pan.add(tilt);          // gật lên xuống
    add(new THREE.CylinderGeometry(0.15, 0.2, 0.42, 16), lacquer('#151515'), 0, -0.15, 0, { parent: tilt });
    const lens = add(new THREE.CircleGeometry(0.13, 20), glow('#ffffff', 2), 0, -0.37, 0, { parent: tilt, shadow: false });
    lens.rotation.x = Math.PI / 2;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.9, 16, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: '#fff', alphaMap: beamFade, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
    beam.geometry.translate(0, -8.3, 0); tilt.add(beam);
    let spot = null;
    if (realLight) { // vài đèn có ánh sáng thật cho nhẹ máy
      spot = new THREE.SpotLight('#fff', 160, 30, 0.14, 0.5, 1.3);
      spot.position.set(0, -0.35, 0); tilt.add(spot);
      const tgt = new THREE.Object3D(); tgt.position.set(0, -10, 0); tilt.add(tgt); spot.target = tgt;
    }
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(3, 3),
      new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    pool.rotation.x = -Math.PI / 2; pool.renderOrder = 2; scene.add(pool);
    // hướng mặc định: quay về phía khu nhảy
    const toCenter = Math.atan2(-top.x, 5 - top.z);
    heads.push({ pan, tilt, beam, lens, spot, pool, i, toCenter, kind });
  }
  palmTops.slice(0, 6).concat(palmTops.slice(10)).forEach((top, i) => makeHead(scene, top, 'palm', i % 3 === 0));
  // hàng đèn dưới đất quanh khu nhảy, bắn tia lên trời đan chéo nhau
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const x = Math.cos(a) * 11, z = 5 + Math.sin(a) * 8;
    if (z < 0.5) continue; // chừa chỗ màn chiếu phía sau
    add(new THREE.CylinderGeometry(0.3, 0.35, 0.18, 16), lacquer('#111'), x, 0.09, z);
    makeHead(scene, new THREE.Vector3(x, 0.45, z), 'ground', false);
  }

  // ---------- máy bay nhỏ bay vòng trên đầu, treo đèn chiếu xuống ----------
  const planes = [];
  const planeMat = new THREE.MeshStandardMaterial({ color: '#e8ecf2', metalness: 0.3, roughness: 0.4 });
  const planeAccent = new THREE.MeshStandardMaterial({ color: '#ff2d95', roughness: 0.5 });
  for (let p = 0; p < 2; p++) {
    const g = new THREE.Group(); scene.add(g);
    const hull = add(new THREE.CylinderGeometry(0.35, 0.18, 4.2, 14), planeMat, 0, 0, 0, { parent: g });
    hull.rotation.x = Math.PI / 2;
    add(new THREE.SphereGeometry(0.35, 14, 10), planeMat, 0, 0, 2.1, { parent: g });
    add(new THREE.BoxGeometry(6.2, 0.08, 1.0), planeMat, 0, 0.1, 0.3, { parent: g });       // cánh
    add(new THREE.BoxGeometry(2.0, 0.06, 0.6), planeMat, 0, 0.05, -1.9, { parent: g });     // đuôi ngang
    add(new THREE.BoxGeometry(0.06, 0.9, 0.7), planeAccent, 0, 0.45, -1.9, { parent: g });  // đuôi đứng
    add(new THREE.BoxGeometry(6.2, 0.02, 0.2), planeAccent, 0, 0.15, 0.7, { parent: g });   // sọc cánh
    const prop = add(new THREE.BoxGeometry(1.4, 0.08, 0.04), lacquer('#222'), 0, 0, 2.45, { parent: g });
    const navL = add(new THREE.SphereGeometry(0.08, 8, 6), glow('#ff2020', 3), -3.1, 0.1, 0.3, { parent: g, shadow: false });
    const navR = add(new THREE.SphereGeometry(0.08, 8, 6), glow('#20ff40', 3), 3.1, 0.1, 0.3, { parent: g, shadow: false });
    const strobe = add(new THREE.SphereGeometry(0.1, 8, 6), glow('#ffffff', 4), 0, 0.95, -2.1, { parent: g, shadow: false });
    makeHead(g, new THREE.Vector3(0, -0.5, 0.3), 'plane', true);
    planes.push({ g, prop, strobe, r: 28 + p * 8, h: 20 + p * 4, speed: 0.12 - p * 0.03, phase: p * Math.PI });
  }
  function updatePlanes(t) {
    for (const p of planes) {
      const a = t * p.speed + p.phase;
      p.g.position.set(Math.cos(a) * p.r, p.h + Math.sin(t * 0.5 + p.phase) * 1.5, 5 + Math.sin(a) * p.r * 0.7);
      // mũi máy bay hướng theo chiều bay, nghiêng cánh vào vòng
      p.g.rotation.set(0, Math.atan2(-Math.sin(a) * p.r, Math.cos(a) * p.r * 0.7), 0.35);
      p.prop.rotation.z = t * 40;
      p.strobe.visible = (t * 1.5 + p.phase) % 1 < 0.08;
    }
  }
  const beamDir = new THREE.Vector3(), lensPos = new THREE.Vector3(), tiltQ = new THREE.Quaternion();
  function updateHeads(t, beat, pulse, bar4) {
    const mode = bar4 % 4;
    for (const h of heads) {
      let panA, tiltA;
      if (mode === 0) { panA = h.toCenter + Math.sin(t * 0.9 + h.i) * 0.6; tiltA = 0.55 + Math.sin(t * 1.3 + h.i) * 0.25; }          // quét qua khu nhảy
      else if (mode === 1) { panA = t * 1.4 + h.i * 1.05; tiltA = 0.9 + Math.sin(t * 2 + h.i) * 0.3; }                                 // xoay vòng đủ hướng
      else if (mode === 2) { panA = h.toCenter + Math.sin(t * 2.6 + (h.i % 2) * Math.PI) * 1.2; tiltA = 1.1; }                        // quét chéo nhau
      else { panA = t * -0.8 + h.i; tiltA = 1.35 + Math.sin(t * 3) * 0.15; }                                                          // chĩa lên trời
      if (h.kind === 'ground') { // tia gần thẳng đứng, xoè quạt và xoay vòng
        panA = (mode % 2 ? t * 1.2 : Math.sin(t * 1.1) * 1.5) + h.i * 0.6;
        tiltA = 0.25 + (mode === 2 ? 0.45 : 0.25) * (0.5 + 0.5 * Math.sin(t * 1.7 + h.i));
      } else if (h.kind === 'plane') { // từ trên trời rọi xuống, quét quanh khu nhảy
        panA = t * 0.9 + h.i; tiltA = 0.15 + 0.3 * (0.5 + 0.5 * Math.sin(t * 0.8 + h.i));
      }
      h.pan.rotation.y = panA; h.tilt.rotation.x = tiltA;
      const c = PALETTE[(h.i + bar4) % 4];
      h.beam.material.color.copy(c).multiplyScalar(1.6);
      h.beam.material.opacity = 0.1 + pulse * 0.1;
      h.lens.material.color.copy(c).multiplyScalar(2 + pulse * 2);
      if (h.spot) h.spot.color.copy(c);
      // vệt màu nơi tia chạm cát (ẩn khi tia chĩa lên trời)
      h.tilt.updateMatrixWorld(); h.tilt.getWorldQuaternion(tiltQ); h.lens.getWorldPosition(lensPos);
      beamDir.set(0, -1, 0).applyQuaternion(tiltQ);
      if (beamDir.y < -0.15) {
        const k = (0.05 - lensPos.y) / beamDir.y;
        const px = lensPos.x + beamDir.x * k, pz = lensPos.z + beamDir.z * k;
        h.pool.visible = true;
        h.pool.position.set(px, sandH(px, pz) + 0.04, pz);
        const tl = 1 / Math.max(0.3, -beamDir.y);
        h.pool.scale.set(1 + Math.abs(beamDir.x) * tl, 1 + Math.abs(beamDir.z) * tl, 1);
        h.pool.material.color.copy(c);
        h.pool.material.opacity = 0.45 + pulse * 0.35;
      } else h.pool.visible = false;
    }
  }

  // ---------- đuốc tiki + lửa trại ----------
  const flameTex = radialTexture(THREE);
  const flames = [];
  function flame(x, y, z, s, color = '#ff8a2a') {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.position.set(x, y, z); m.scale.set(s * 0.7, s, 1); scene.add(m);
    flames.push({ m, s, seed: Math.random() * 10, y });
    return m;
  }
  for (const [x, z] of [[-13.5, -1.5], [13.5, -1.5], [-13.5, 14.5], [13.5, 14.5], [-6, 15.5], [6, 15.5]]) {
    add(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 8), trunkMat, x, 1.1, z);
    add(new THREE.CylinderGeometry(0.14, 0.1, 0.3, 10), new THREE.MeshStandardMaterial({ color: '#3a2a1a' }), x, 2.3, z);
    flame(x, 2.65, z, 0.7); flame(x, 2.6, z, 0.4, '#ffe08a');
  }
  const fireLights = [];
  for (const [x, z] of [[-9, 22], [10, 21]]) {
    for (let k = 0; k < 6; k++) {
      const log = add(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8), trunkMat, x, 0.15, z);
      log.rotation.set(Math.PI / 2 - 0.3, (k / 6) * Math.PI * 2, 0);
    }
    flame(x, 0.8, z, 2.2); flame(x, 0.6, z, 1.4, '#ffe08a');
    const pl = new THREE.PointLight('#ff8a3a', 25, 12, 1.5); pl.position.set(x, 1.2, z); scene.add(pl); fireLights.push(pl);
    for (let s = 0; s < 6; s++) { // ghế khúc gỗ quanh lửa
      const a = (s / 6) * Math.PI * 2;
      const seat = add(new THREE.CylinderGeometry(0.25, 0.25, 1.4, 10), trunkMat, x + Math.cos(a) * 2.4, 0.2, z + Math.sin(a) * 2.4);
      seat.rotation.set(0, -a, Math.PI / 2);
    }
  }

  // ---------- dù che nắng + ghế nằm ----------
  const umbColors = ['#ff5a7a', '#18b6d6', '#ffcf4a', '#ffffff'];
  for (let i = 0; i < 10; i++) {
    const x = (i < 5 ? -1 : 1) * (24 + (i % 5) * 4), z = 30 + (i % 3) * 3 - (i % 5);
    add(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), chrome, x, 1.3, z);
    add(new THREE.ConeGeometry(1.6, 0.6, 12), new THREE.MeshStandardMaterial({ color: umbColors[i % 4], roughness: 0.8 }), x, 2.6, z);
    const lounger = add(new RoundedBoxGeometry(0.7, 0.12, 1.9, 3, 0.04), new THREE.MeshStandardMaterial({ color: '#f4f0e8' }), x + 1.2, 0.35, z + 0.5);
    lounger.rotation.x = -0.12;
  }

  // ---------- cua bò ngang trên cát ----------
  const crabMat = new THREE.MeshStandardMaterial({ color: '#e0502a', roughness: 0.55 });
  const crabDark = new THREE.MeshStandardMaterial({ color: '#a8301a', roughness: 0.6 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.2 });
  const crabs = [];
  function makeCrab() {
    const g = new THREE.Group();
    const body = add(new THREE.SphereGeometry(0.16, 14, 10), crabMat, 0, 0.09, 0, { parent: g });
    body.scale.set(1.3, 0.5, 1);
    const legs = [];
    for (const side of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const leg = new THREE.Group(); leg.position.set(side * 0.14, 0.08, -0.08 + k * 0.08); g.add(leg);
        const seg = add(new THREE.CylinderGeometry(0.012, 0.01, 0.16, 5), crabDark, side * 0.07, -0.03, 0, { parent: leg });
        seg.rotation.z = side * 1.0;
        legs.push({ leg, side, k });
      }
      // càng
      const claw = add(new THREE.SphereGeometry(0.06, 10, 8), crabMat, side * 0.12, 0.1, 0.17, { parent: g });
      claw.scale.set(0.8, 0.6, 1.2);
      // mắt trên cuống
      add(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 4), crabDark, side * 0.05, 0.16, 0.1, { parent: g });
      add(new THREE.SphereGeometry(0.02, 8, 6), eyeMat, side * 0.05, 0.2, 0.1, { parent: g });
    }
    scene.add(g);
    return { g, legs, dir: Math.random() < 0.5 ? -1 : 1, speed: 0.4 + Math.random() * 0.5, turn: 0, pause: 0, seed: Math.random() * 10 };
  }
  for (let i = 0; i < 18; i++) {
    const c = makeCrab();
    const a = Math.random() * Math.PI * 2, r = 11 + Math.random() * 18;
    c.g.position.set(Math.cos(a) * r, 0, 6 + Math.sin(a) * r * 0.7);
    if (i < 6) c.g.position.z = SHORE_Z + 1 + Math.random() * 3; // vài con gần mép nước
    c.g.rotation.y = Math.random() * Math.PI * 2;
    crabs.push(c);
  }
  const crabSide = new THREE.Vector3();
  function updateCrabs(t, dt) {
    for (const c of crabs) {
      if (c.pause > 0) { c.pause -= dt; continue; }
      if (Math.random() < dt * 0.25) { c.pause = 0.5 + Math.random() * 2; c.dir *= Math.random() < 0.5 ? -1 : 1; continue; }
      c.g.rotation.y += Math.sin(t * 0.3 + c.seed) * dt * 0.3;
      crabSide.set(c.dir, 0, 0).applyQuaternion(c.g.quaternion); // cua đi ngang
      c.g.position.addScaledVector(crabSide, c.speed * dt);
      const p = c.g.position;
      const dc = Math.hypot(p.x, p.z - 5);            // tránh khu nhảy giữa bãi
      if (dc < 10) { p.x += (p.x / dc) * dt * 2; p.z += ((p.z - 5) / dc) * dt * 2; c.dir *= -1; }
      p.x = THREE.MathUtils.clamp(p.x, -45, 45); p.z = THREE.MathUtils.clamp(p.z, SHORE_Z + 0.6, 40);
      p.y = sandH(p.x, p.z);
      for (const { leg, side, k } of c.legs) leg.rotation.x = Math.sin(t * 18 + k * 2 + side) * 0.5;
    }
  }

  // ---------- hải âu lượn trên biển ----------
  const gullMat = new THREE.MeshStandardMaterial({ color: '#f4f2ee', side: THREE.DoubleSide, roughness: 0.8 });
  const gulls = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(); scene.add(g);
    add(new THREE.SphereGeometry(0.12, 8, 6), gullMat, 0, 0, 0, { parent: g }).scale.set(0.8, 0.7, 2);
    const wings = [-1, 1].map((s) => {
      const w = new THREE.Group(); w.position.x = s * 0.05; g.add(w);
      const geo = new THREE.PlaneGeometry(0.7, 0.22); geo.translate(s * 0.35, 0, 0);
      add(geo, gullMat, 0, 0, 0, { parent: w }).rotation.x = -Math.PI / 2;
      return { w, s };
    });
    gulls.push({ g, wings, r: 12 + Math.random() * 25, h: 9 + Math.random() * 9, speed: 0.15 + Math.random() * 0.12, phase: Math.random() * 6, cx: -20 + Math.random() * 40, cz: -25 - Math.random() * 20 });
  }
  function updateGulls(t) {
    for (const s of gulls) {
      const a = t * s.speed + s.phase;
      s.g.position.set(s.cx + Math.cos(a) * s.r, s.h + Math.sin(t * 0.7 + s.phase) * 1.2, s.cz + Math.sin(a) * s.r * 0.6);
      s.g.rotation.y = -a; s.g.rotation.z = 0.25;
      const flap = Math.sin(t * 7 + s.phase) * 0.6;
      for (const { w, s: side } of s.wings) w.rotation.z = side * flap;
    }
  }

  // ---------- sao biển, vỏ sò rải trên cát ----------
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.05 : 0.14, a = (i / 10) * Math.PI * 2;
    i ? starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
  const shellGeo = new THREE.SphereGeometry(0.08, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let i = 0; i < 60; i++) {
    const x = (Math.random() - 0.5) * 80, z = SHORE_Z + 0.8 + Math.random() * 30;
    if (Math.hypot(x, z - 5) < 10) continue;
    const isStar = i % 3 === 0;
    const m = add(isStar ? starGeo : shellGeo,
      new THREE.MeshStandardMaterial({ color: isStar ? ['#ff8a4a', '#e85a8a', '#ffb84a'][i % 3] : ['#f4e8dc', '#e8c8b0', '#fff4ea'][i % 3], roughness: 0.6 }),
      x, sandH(x, z) + 0.01, z);
    m.rotation.set(isStar ? -Math.PI / 2 : 0, Math.random() * 6, 0);
    m.scale.setScalar(0.7 + Math.random() * 0.8);
  }

  // ---------- chữ neon ----------
  const sign = neon('Sunset Beach', '#ff4fa3', 6, 1.4, 170, 'italic 700 "Segoe Script", "Brush Script MT", cursive');
  sign.position.set(0, DECK.h + 7.9, back + 0.2); scene.add(sign);

  return {
    name,
    floorY: DECK.h,
    spots: [[-2.4, 3.6], [0, 2.4], [2.4, 3.6]],
    // Đám đông (`VuCong3D.damDong`): các ô [x0, x1, z0, z1] trên cát, quay mặt về `nhin`.
    khuVuc: {
      'quanh-san': [[-7.5, -3.8, 0.8, 7], [3.8, 7.5, 0.8, 7]],
      'phia-truoc': [[-5, 5, 6.2, 9.5]],
    },
    nhin: [0, 3],
    dj: { x: 0, z: back + 0.7, floorY: 0.4, rotY: 0 },
    screen: { w: 5.0, h: 2.8, pos: [0, DECK.h + 3.9, back + 0.1] },
    camera: {
      pos: [0, 4.2, 22], target: [0, 2.6, 2], minD: 8, maxD: 30,
      minPolar: Math.PI * 0.32, maxPolar: Math.PI * 0.49, azimuth: [-0.45, 0.45], // luôn đứng trước màn chiếu
      bounds: { min: [-60, 0.8, -8], max: [60, 40, 60] },
    },
    update(t, beat, pulse, bar4) {
      updatePlanes(t);
      updateHeads(t, beat, pulse, bar4);
      const dt = Math.min(0.05, t - (this.lastT ?? t)); this.lastT = t;
      water.material.uniforms.time.value = t * 0.6;
      updateWaves(t);
      updateCrabs(t, dt);
      updateGulls(t);
      drawDance(t, beat);
      if (Math.floor(t * 10) % 2 === 0) drawScreen(t, beat);
      for (const f of flames) {
        const k = 0.85 + Math.sin(t * 13 + f.seed) * 0.08 + Math.sin(t * 7.3 + f.seed * 2) * 0.07;
        f.m.scale.set(f.s * 0.7 * k, f.s * (k + 0.1), 1);
        f.m.position.y = f.y + (k - 0.85) * 0.2;
      }
      fireLights.forEach((l, i) => { l.intensity = 22 + Math.sin(t * 11 + i) * 4 + Math.random() * 3; });
      bulbs.forEach((b, i) => b.scale.setScalar(0.9 + (((i + Math.floor(beat * 2)) % 6 === 0) ? 0.5 * pulse : 0)));
    },
  };
}

// Chép từ kiểu Hộp đêm (quy ước 01 §12: kiểu này không trỏ sang thư mục kiểu khác).
export function fadeTexture(THREE) {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256;
  const g = cv.getContext('2d');
  const v = g.createLinearGradient(0, 0, 0, 256);
  v.addColorStop(0, '#fff'); v.addColorStop(0.35, '#888'); v.addColorStop(1, '#000');
  g.fillStyle = v; g.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(cv);
}
export function radialTexture(THREE) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
}
