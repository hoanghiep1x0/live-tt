// @ts-nocheck — chuyển nguyên từ bản dựng thử (D:/Live-bar/client/public/bar/space-luxe.js).
// Không gian "Luxe": hộp đêm hiện đại sang trọng, phòng kín 4 mặt.
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const name = 'Luxe Club';

export function build(ctx) {
  const { THREE, scene, add, strip, glow, neon, pbr, lacquer, gold, chrome, velvet, glass, loadHDR, PALETTE } = ctx;

  scene.background = new THREE.Color('#05040a');
  scene.fog = new THREE.FogExp2('#0a0612', 0.028);
  loadHDR('dancing_hall_1k.hdr', 0.25);
  ctx.renderer.toneMappingExposure = 1.0;

  scene.add(new THREE.HemisphereLight('#6a5a9a', '#120a10', 0.55));
  const key = new THREE.DirectionalLight('#ffe6cc', 0.7);
  key.position.set(3, 9, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
  key.shadow.bias = -0.0005;
  scene.add(key);

  // ---------- vỏ phòng kín: x -8.5..8.5, z -6.4..7 ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30),
    pbr('granite_tile', 10, 10, { color: '#3a3a44', clearcoat: 0.6, clearcoatRoughness: 0.15 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const ROOM = { x: 8.5, zBack: -6.4, zFront: 7 };
  const roomD = ROOM.zFront - ROOM.zBack, roomZ = (ROOM.zFront + ROOM.zBack) / 2;
  const wallMat = pbr('dark_wood', 4, 2, { color: '#2a2230', clearcoat: 0.3 });
  add(new THREE.BoxGeometry(18, 7.5, 0.3), wallMat, 0, 3.75, ROOM.zBack);
  add(new THREE.BoxGeometry(18, 7.5, 0.3), wallMat, 0, 3.75, ROOM.zFront);
  const sideMat = pbr('marble_01', 3, 2, { color: '#4a4258', clearcoat: 0.8 });
  add(new THREE.BoxGeometry(0.3, 7.5, roomD), sideMat, -ROOM.x, 3.75, roomZ);
  add(new THREE.BoxGeometry(0.3, 7.5, roomD), sideMat, ROOM.x, 3.75, roomZ);
  add(new THREE.BoxGeometry(18, 0.3, roomD), lacquer('#08070c'), 0, 7.4, roomZ, { shadow: false });
  for (const [y, ph] of [[0.08, 0], [7.2, 0.5]]) {
    strip(17.6, 0.05, 0.05, 0, y, ROOM.zBack + 0.2, ph); strip(17.6, 0.05, 0.05, 0, y, ROOM.zFront - 0.2, ph + 0.5);
    strip(0.05, 0.05, roomD - 0.4, -ROOM.x + 0.2, y, roomZ, ph + 0.25); strip(0.05, 0.05, roomD - 0.4, ROOM.x - 0.2, y, roomZ, ph + 0.75);
  }
  strip(7.6, 0.04, 0.04, 0, 7.22, -3.9, 0.2); strip(7.6, 0.04, 0.04, 0, 7.22, 0.7, 0.2);
  strip(0.04, 0.04, 4.6, -3.8, 7.22, -1.6, 0.2); strip(0.04, 0.04, 4.6, 3.8, 7.22, -1.6, 0.2);
  // tường trước: cửa vào viền vàng
  add(new THREE.BoxGeometry(2.4, 3.4, 0.2), lacquer('#020203'), 0, 1.7, ROOM.zFront - 0.12);
  for (const [w, h, x, y] of [[2.6, 0.1, 0, 3.45], [0.1, 3.45, -1.25, 1.72], [0.1, 3.45, 1.25, 1.72]])
    add(new THREE.BoxGeometry(w, h, 0.12), glow('#ffcf7a', 1.8), x, y, ROOM.zFront - 0.2, { shadow: false });
  for (const x of [-6.5, -4, 4, 6.5]) {
    add(new THREE.BoxGeometry(1.6, 5.4, 0.08), lacquer('#120f18'), x, 3.2, ROOM.zFront - 0.2);
    strip(0.04, 5.2, 0.04, x - 0.82, 3.2, ROOM.zFront - 0.26, x * 0.1);
    strip(0.04, 5.2, 0.04, x + 0.82, 3.2, ROOM.zFront - 0.26, x * 0.1);
  }
  for (const z of [3, 5.2]) for (const sx of [-1, 1]) strip(0.04, 5.6, 0.04, sx * (ROOM.x - 0.18), 3.2, z, z * 0.1);
  for (const x of [-7, -5.8, 5.8, 7]) strip(0.06, 7, 0.06, x, 3.6, -6.2, x * 0.1);

  // ---------- tường LED (nền equalizer; vũ công do core chiếu đè lên) ----------
  const ledCv = document.createElement('canvas'); ledCv.width = 512; ledCv.height = 224;
  const ledTex = new THREE.CanvasTexture(ledCv); ledTex.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.BoxGeometry(8.4, 3.9, 0.15), lacquer('#050505'), 0, 3.6, -6.2);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.5), new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false }));
  screen.position.set(0, 3.6, -6.1); scene.add(screen);
  function drawScreen(t, beat) {
    const g = ledCv.getContext('2d'), W = 512, H = 224;
    const c1 = PALETTE[Math.floor(beat / 4) % 4], c2 = PALETTE[(Math.floor(beat / 4) + 1) % 4];
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, `#${c1.clone().multiplyScalar(0.3).getHexString()}`);
    bg.addColorStop(1, `#${c2.clone().multiplyScalar(0.3).getHexString()}`);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const bars = 32, bw = W / bars;
    for (let i = 0; i < bars; i++) {
      if (i > 10 && i < 21) continue; // chừa giữa cho vũ công
      const v = 0.25 + 0.75 * Math.abs(Math.sin(t * 3 + i * 0.6) * Math.sin(t * 1.3 + i * 0.25)) * (1 - (beat % 1) * 0.4);
      const h = v * H * 0.75;
      const grad = g.createLinearGradient(0, H - h, 0, H);
      grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.15, `#${c1.getHexString()}`); grad.addColorStop(1, `#${c2.getHexString()}`);
      g.fillStyle = grad; g.fillRect(i * bw + 2, H - h, bw - 4, h);
    }
    g.font = '700 30px "Segoe UI", system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillText('L U X E', W / 2, 22);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x = 0; x < W; x += 4) g.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
    ledTex.needsUpdate = true;
  }

  // ---------- quầy DJ ----------
  add(new RoundedBoxGeometry(3.6, 1.15, 1.1, 4, 0.08), lacquer('#0b0b10'), 0, 0.575, -4.9);
  strip(3.5, 0.04, 0.04, 0, 0.9, -4.33, 0.1); strip(3.5, 0.04, 0.04, 0, 0.25, -4.33, 0.6);
  add(new THREE.BoxGeometry(3.7, 0.05, 1.2), gold, 0, 1.17, -4.9);
  for (const x of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32), lacquer('#151515'), x, 1.22, -4.95);
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 24), glow('#18d6ff', 1.5), x, 1.24, -4.95, { shadow: false });
  }
  add(new THREE.BoxGeometry(0.9, 0.06, 0.5), lacquer('#1a1a1a'), 0, 1.22, -4.95);

  // ---------- sàn nhảy kính đen + lưới LED ----------
  const DF = { w: 7, d: 4.4, z: -1.6 };
  add(new THREE.BoxGeometry(DF.w + 0.3, 0.08, DF.d + 0.3), gold, 0, 0.04, DF.z);
  const mirror = new Reflector(new THREE.PlaneGeometry(DF.w, DF.d), { textureWidth: 512, textureHeight: 512, color: '#2a2a33' });
  mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, 0.085, DF.z); scene.add(mirror);
  const gridCv = document.createElement('canvas'); gridCv.width = 700; gridCv.height = 440;
  const gridTex = new THREE.CanvasTexture(gridCv); gridTex.colorSpace = THREE.SRGBColorSpace;
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(DF.w, DF.d),
    new THREE.MeshBasicMaterial({ map: gridTex, transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  grid.rotation.x = -Math.PI / 2; grid.position.set(0, 0.088, DF.z); scene.add(grid);
  function drawGrid(t, beat) {
    const g = gridCv.getContext('2d'), W = 700, H = 440, cell = 55;
    g.clearRect(0, 0, W, H);
    for (let x = 0; x < W; x += cell) for (let y = 0; y < H; y += cell) {
      const r = Math.hypot(x + cell / 2 - W / 2, y + cell / 2 - H / 2) / cell;
      const wave = Math.max(0, Math.sin(r * 0.9 - t * 5));
      const c = PALETTE[(Math.floor(r - beat) % 4 + 4) % 4].getHexString();
      g.globalAlpha = 0.04 + wave * 0.3; g.fillStyle = `#${c}`; g.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      g.globalAlpha = 0.35; g.strokeStyle = `#${c}`; g.lineWidth = 1.5; g.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
    }
    g.globalAlpha = 1;
    gridTex.needsUpdate = true;
  }

  // ---------- moving head: tia mờ dần + vệt màu chạm sàn ----------
  const beamFade = fadeTexture(THREE);
  const poolTex = radialTexture(THREE);
  for (const z of [-3.6, 0.4]) add(new THREE.BoxGeometry(12, 0.25, 0.25), chrome, 0, 6.6, z);
  const heads = [];
  for (let i = 0; i < 8; i++) {
    const body = new THREE.Group(); body.position.set(-5.25 + i * 1.5, 6.35, i % 2 ? -3.6 : 0.4); scene.add(body);
    add(new THREE.BoxGeometry(0.3, 0.2, 0.3), lacquer('#111'), 0, 0.12, 0, { parent: body });
    const yoke = new THREE.Group(); body.add(yoke);
    add(new THREE.CylinderGeometry(0.14, 0.18, 0.38, 16), lacquer('#151515'), 0, -0.12, 0, { parent: yoke });
    const lens = add(new THREE.CircleGeometry(0.12, 20), glow('#ffffff', 2), 0, -0.32, 0, { parent: yoke, shadow: false });
    lens.rotation.x = Math.PI / 2;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.55, 8, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: '#fff', alphaMap: beamFade, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
    beam.geometry.translate(0, -4.3, 0); yoke.add(beam);
    let spot = null;
    if (i === 1 || i === 4 || i === 6) { // chỉ 3 đèn có ánh sáng thật cho nhẹ
      spot = new THREE.SpotLight('#fff', 30, 14, 0.16, 0.5, 1.2);
      spot.position.set(0, -0.3, 0); yoke.add(spot);
      const tgt = new THREE.Object3D(); tgt.position.set(0, -8, 0); yoke.add(tgt); spot.target = tgt;
    }
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    pool.rotation.x = -Math.PI / 2; pool.renderOrder = 2; scene.add(pool);
    heads.push({ yoke, beam, spot, lens, pool, i });
  }
  const beamDir = new THREE.Vector3(), lensPos = new THREE.Vector3(), yokeQ = new THREE.Quaternion();

  // ---------- laser ----------
  const lasers = [];
  for (let i = 0; i < 10; i++) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 14, 6, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 ? '#2bff88' : '#18d6ff').multiplyScalar(3), transparent: true, opacity: 0.7, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    l.geometry.translate(0, 7, 0);
    l.position.set(0, 1.3, -5.3); scene.add(l); lasers.push(l);
  }

  // ---------- quầy bar đá phát sáng (phải) ----------
  const bar = new THREE.Group(); bar.position.set(6.3, 0, -0.8); bar.rotation.y = -0.3; scene.add(bar);
  const onyx = pbr('marble_01', 2, 0.5, { color: '#ffffff', roughness: 0.2, clearcoat: 1 });
  onyx.emissiveMap = onyx.map; onyx.emissive = new THREE.Color('#ffb070'); onyx.emissiveIntensity = 0.9;
  add(new THREE.BoxGeometry(0.9, 1.1, 5.4), onyx, 0, 0.6, 0, { parent: bar });
  add(new RoundedBoxGeometry(1.3, 0.08, 5.6, 3, 0.03), lacquer('#050507'), 0, 1.19, 0, { parent: bar });
  add(new THREE.BoxGeometry(0.05, 0.05, 5.6), gold, -0.66, 1.12, 0, { parent: bar });
  add(new THREE.CylinderGeometry(0.03, 0.03, 5.4, 12), gold, -0.62, 0.22, 0, { parent: bar }).rotation.x = Math.PI / 2;
  for (let k = 0; k < 4; k++) {
    const z = -2 + k * 1.3;
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.78, 12), gold, -1.05, 0.39, z, { parent: bar });
    add(new THREE.CylinderGeometry(0.22, 0.26, 0.03, 32), gold, -1.05, 0.01, z, { parent: bar });
    add(new RoundedBoxGeometry(0.5, 0.12, 0.5, 3, 0.05), velvet('#5a1030'), -1.05, 0.84, z, { parent: bar });
  }
  add(new THREE.BoxGeometry(0.4, 3.2, 5.6), pbr('dark_wood', 1, 2, { color: '#3a2a22', clearcoat: 0.6 }), 1.55, 1.9, 0, { parent: bar });
  add(new THREE.PlaneGeometry(5.4, 2.8), glow('#ffb36b', 0.28), 1.34, 2.05, 0, { parent: bar, shadow: false }).rotation.y = -Math.PI / 2;
  for (let s = 0; s < 3; s++) {
    const y = 1.0 + s * 0.85;
    add(new THREE.BoxGeometry(0.45, 0.03, 5.4), glass('#ffffff'), 1.2, y, 0, { parent: bar });
    strip(0.03, 0.02, 5.4, 1.0, y - 0.03, 0, 0.3, bar);
    for (let k = 0; k < 11; k++) {
      const c = new THREE.Color().setHSL(0.06 + (k % 4) * 0.03, 0.85, 0.45 + (k % 3) * 0.08);
      const bt = add(new THREE.CylinderGeometry(0.06, 0.08, 0.4, 16), glass(c), 1.2, y + 0.22, -2.4 + k * 0.48, { parent: bar });
      add(new THREE.CylinderGeometry(0.025, 0.04, 0.12, 12), glass(c), 0, 0.26, 0, { parent: bt });
    }
  }

  // ---------- khu VIP sofa nhung (trái) ----------
  for (const z of [-2.6, 0.6]) {
    const sofa = new THREE.Group(); sofa.position.set(-6.2, 0, z); sofa.rotation.y = Math.PI / 2; scene.add(sofa);
    add(new RoundedBoxGeometry(2.4, 0.42, 0.9, 4, 0.12), velvet('#3c1a66'), 0, 0.3, 0, { parent: sofa });
    add(new RoundedBoxGeometry(2.4, 0.75, 0.25, 4, 0.1), velvet('#3c1a66'), 0, 0.75, -0.42, { parent: sofa });
    add(new THREE.BoxGeometry(2.5, 0.06, 1.0), gold, 0, 0.06, 0, { parent: sofa });
    strip(2.3, 0.02, 0.02, 0, 0.04, 0.5, 0.8, sofa);
    add(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 32), glass('#ffffff'), 0, 0.5, 1.1, { parent: sofa });
    add(new THREE.CylinderGeometry(0.03, 0.08, 0.48, 16), gold, 0, 0.25, 1.1, { parent: sofa });
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 12), glow('#ffcf7a', 2.5), 0, 0.57, 1.1, { parent: sofa, shadow: false });
  }

  const sign = neon('Luxe Bar', '#ff2d95', 3.6, 1.1, 190, 'italic 700 "Segoe Script", "Brush Script MT", cursive');
  sign.position.set(-8.3, 3.6, -1); sign.rotation.y = Math.PI / 2; scene.add(sign);
  const welcome = neon('Welcome to LUXE', '#18d6ff', 4.4, 0.8, 120, '700 "Segoe UI", system-ui');
  welcome.position.set(0, 4.3, ROOM.zFront - 0.2); welcome.rotation.y = Math.PI; scene.add(welcome);

  return {
    name,
    floorY: 0.088,
    spots: [[-1.8, -1.2], [0, -2.4], [1.8, -1.2]],
    // Đám đông (`VuCong3D.damDong`): các ô [x0, x1, z0, z1] trên sàn, quay mặt về `nhin`.
    khuVuc: {
      'quanh-san': [[-7.4, -3.2, -4, 1.5], [3.2, 7.4, -4, 1.5]],
      'phia-truoc': [[-3.5, 3.5, 0.6, 3.2]],
    },
    nhin: [0, -1.6],
    dj: { x: 0, z: -5.75, floorY: 0, rotY: 0 },
    screen: { w: 3.6, h: 2.0, pos: [0, 3.35, -6.05] },
    camera: {
      pos: [0, 2.2, 5.8], target: [0, 1.9, -1.2], minD: 3, maxD: 7,
      minPolar: Math.PI * 0.32, maxPolar: Math.PI * 0.52, azimuth: [-0.55, 0.55], // luôn đứng trước màn LED
      bounds: { min: [-8.1, 0.5, -6.0], max: [8.1, 6.9, 6.6] },
    },
    update(t, beat, pulse, bar4) {
      drawScreen(t, beat);
      drawGrid(t, beat);
      for (const { yoke, beam, spot, lens, pool, i } of heads) {
        const mode = bar4 % 3;
        const sweep = mode === 0 ? Math.sin(t * 1.2 + i * 0.6) : mode === 1 ? Math.sin(t * 2.4 + (i % 2) * Math.PI) : Math.sin(t * 0.8) * (i % 2 ? 1 : -1);
        yoke.rotation.set(0.35 * Math.cos(t * 0.9 + i), 0, 0.55 * sweep);
        const c = PALETTE[(i + bar4) % 4];
        if (spot) spot.color.copy(c);
        beam.material.color.copy(c).multiplyScalar(1.5);
        lens.material.color.copy(c).multiplyScalar(2 + pulse * 2);
        beam.material.opacity = 0.08 + pulse * 0.08;
        yoke.updateMatrixWorld();
        yoke.getWorldQuaternion(yokeQ); lens.getWorldPosition(lensPos);
        beamDir.set(0, -1, 0).applyQuaternion(yokeQ);
        const k = (0.1 - lensPos.y) / beamDir.y;
        pool.position.set(lensPos.x + beamDir.x * k, 0.1, lensPos.z + beamDir.z * k);
        const tilt = 1 / Math.max(0.35, -beamDir.y);
        pool.scale.set(1 + Math.abs(beamDir.x) * tilt, 1 + Math.abs(beamDir.z) * tilt, 1);
        pool.material.color.copy(c);
        pool.material.opacity = 0.4 + pulse * 0.35;
      }
      lasers.forEach((l, i) => {
        l.visible = (bar4 % 4) >= 2;
        l.rotation.set(-1.25 + Math.sin(t * 1.5 + i) * 0.08, 0, (i - 4.5) * 0.12 + Math.sin(t * 2) * 0.25);
      });
      sign.material.opacity = Math.random() < 0.01 ? 0.5 : 1;
    },
  };
}

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
