// Màn thay đồ VIP (`VuCong3D.thayDo`): khung cửa vàng trồi lên quanh vũ công, rèm khép lại, đèn chớp + khói, đổi đồ sau
// rèm, rèm bung ra cùng pháo hoa, lấp lánh quanh người, vòng sáng dưới chân, chữ cảm ơn khách; hết màn cửa chìm xuống.
// Các mốc thời gian do module gửi (`moc`) — canh.ts lo việc đổi đồ đúng mốc `doiDo`, file này chỉ lo phần nhìn.
// Thiết kế sàn bar nào cũng có một bản giống hệt (như canh.ts).
import * as THREE from 'three';
import type { ThayDo3D } from '@live/contracts';

const DO_CUA = '#ffcf6b';
const MAU_PHAO = ['#ff3d8b', '#ffd23d', '#3df2ff', '#b66bff', '#ffffff'].map((c) => new THREE.Color(c));
const N_PHAO = 700;
const N_KHOI = 160;

const em = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x)); // smoothstep

/** Ảnh tròn mờ dần — hạt pháo hoa / khói không vuông. */
function anhHat(): THREE.Texture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d')!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

function chu(text: string): THREE.Sprite {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 256;
  const g = cv.getContext('2d')!;
  g.font = 'bold 84px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const gr = g.createLinearGradient(0, 60, 0, 200);
  gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.5, '#ffcf6b'); gr.addColorStop(1, '#ff6fae');
  g.shadowColor = '#ff2d8a'; g.shadowBlur = 28;
  g.lineWidth = 10; g.strokeStyle = 'rgba(60,0,30,0.85)';
  g.strokeText(text, 512, 128, 980);
  g.fillStyle = gr; g.fillText(text, 512, 128, 980);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
}

/** Một hệ hạt: vị trí, vận tốc, tuổi; màu nhân theo tuổi còn lại (cộng sáng nên tối = trong suốt). */
function heHat(n: number, size: number, tex: THREE.Texture) {
  const pos = new Float32Array(n * 3), mau = new Float32Array(n * 3);
  const v = new Float32Array(n * 3), goc = new Float32Array(n * 3), tuoi = new Float32Array(n), tho = new Float32Array(n);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(mau, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  pts.frustumCulled = false;
  let ke = 0;
  return {
    pts,
    ban(x: number, y: number, z: number, vx: number, vy: number, vz: number, c: THREE.Color, song: number): void {
      const i = ke; ke = (ke + 1) % n;
      pos.set([x, y, z], i * 3); v.set([vx, vy, vz], i * 3); goc.set([c.r, c.g, c.b], i * 3);
      tuoi[i] = song; tho[i] = song;
    },
    capNhat(dt: number, trong: number, keo: number): void {
      for (let i = 0; i < n; i++) {
        if (tuoi[i]! <= 0) { mau[i * 3] = mau[i * 3 + 1] = mau[i * 3 + 2] = 0; continue; }
        tuoi[i]! -= dt;
        const k = Math.max(0, tuoi[i]! / tho[i]!);
        v[i * 3 + 1]! -= keo * dt;
        const can = Math.exp(-trong * dt);
        for (let j = 0; j < 3; j++) { v[i * 3 + j]! *= can; pos[i * 3 + j]! += v[i * 3 + j]! * dt; mau[i * 3 + j] = goc[i * 3 + j]! * k; }
      }
      geo.attributes.position!.needsUpdate = true;
      geo.attributes.color!.needsUpdate = true;
    },
  };
}

/** `chieuCao`: chiều cao nhân vật (m) — khung cửa cao theo đó. */
export function taoManThayDo(scene: THREE.Scene, camera: THREE.Camera, chieuCao: number) {
  const tex = anhHat();
  const nhom = new THREE.Group();
  nhom.visible = false;
  scene.add(nhom);
  const cua = new THREE.Group();
  nhom.add(cua);
  const vang = new THREE.MeshStandardMaterial({ color: DO_CUA, emissive: DO_CUA, emissiveIntensity: 2.2, metalness: 0.6, roughness: 0.25 });
  const cot = new THREE.BoxGeometry(1, 1, 1);
  const trai = new THREE.Mesh(cot, vang), phai = new THREE.Mesh(cot, vang), tren = new THREE.Mesh(cot, vang);
  cua.add(trai, phai, tren);
  const vai = new THREE.MeshStandardMaterial({ color: '#9c0f4a', emissive: '#4a0322', emissiveIntensity: 1.2, roughness: 0.55, side: THREE.DoubleSide });
  const nua = new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0); // gốc ở mép trái, dưới
  const remT = new THREE.Mesh(nua, vai), remP = new THREE.Mesh(nua, vai), remSau = new THREE.Mesh(nua, vai);
  cua.add(remT, remP, remSau);
  const vong = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.8, 64),
    new THREE.MeshBasicMaterial({ color: '#ffcf6b', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  vong.rotation.x = -Math.PI / 2;
  nhom.add(vong);
  const den = new THREE.PointLight('#ff4fa3', 0, 8, 1.5);
  nhom.add(den);
  const phao = heHat(N_PHAO, 0.08, tex), khoi = heHat(N_KHOI, 0.5, tex);
  scene.add(phao.pts, khoi.pts);
  let loi: THREE.Sprite | null = null;

  let td: ThayDo3D | null = null;
  let daNo = false; // pháo hoa lúc mở cửa đã bắn chưa
  // khung cố định theo chiều cao nhân vật — tính theo đầu thì lúc cúi / nhảy sàn cửa tụt xuống
  const cao = chieuCao * 1.3, rong = cao * 0.62;
  const tam = new THREE.Vector3(), tmp = new THREE.Vector3();
  const trang = new THREE.Color('#6e6880'), xam = new THREE.Color('#3a3346'); // khói cộng sáng: màu tối = mờ

  function dat(t: ThayDo3D | null): void {
    if (t?.id === td?.id) { td = t; return; }
    td = t; daNo = false;
    if (loi) { nhom.remove(loi); loi.material.map?.dispose(); loi.material.dispose(); loi = null; }
    if (t !== null) {
      loi = chu(t.khach ? `✨ Cảm ơn ${t.khach} ✨` : '✨ ĐỒ VIP ✨');
      loi.visible = false;
      nhom.add(loi);
    }
  }

  /** Gọi mỗi khung: `a` là vũ công đang thay đồ (hoặc null). */
  function capNhat(nowMs: number, dt: number, a: { obj: THREE.Object3D; floorY: number } | null): void {
    phao.capNhat(dt, 0.9, 2.2);
    khoi.capNhat(dt, 0.6, -0.15);
    const t = td;
    if (t === null || a === null || nowMs >= t.tu + t.moc.het || nowMs < t.tu) { nhom.visible = false; den.intensity = 0; return; }
    const e = nowMs - t.tu, m = t.moc;
    nhom.visible = true;
    // đứng đúng chỗ vũ công, mặt cửa quay về camera
    a.obj.getWorldPosition(tam);
    tam.y = a.floorY;
    nhom.position.copy(tam);
    tmp.copy(camera.position); tmp.y = tam.y;
    nhom.lookAt(tmp);
    // khung cửa: trồi lên 0.6 s đầu, chìm xuống 0.8 s cuối
    const len = em(e / 600) * (1 - em((e - (m.het - 800)) / 800));
    cua.position.y = (len - 1) * (cao + 0.3);
    const day = 0.09;
    trai.scale.set(day, cao, day); trai.position.set(-rong / 2, cao / 2, 0.2);
    phai.scale.set(day, cao, day); phai.position.set(rong / 2, cao / 2, 0.2);
    tren.scale.set(rong + day * 2, day * 1.4, day); tren.position.set(0, cao, 0.2);
    vang.emissiveIntensity = 2.2 + Math.sin(e * 0.012) * 0.8;
    // rèm: khép từ 600 ms tới dongCua, bung ra 400 ms sau moCua; lúc kín thì rung theo tiếng nổ
    const kep = em((e - 600) / (m.dongCua - 600)) * (1 - em((e - m.moCua) / 400));
    const rung = e > m.dongCua && e < m.moCua ? 1 + Math.sin(e * 0.06) * 0.04 : 1;
    remT.scale.set((rong / 2) * kep * rung, cao, 1); remT.position.set(-rong / 2, 0, 0.24);
    remP.scale.set((rong / 2) * kep * rung, cao, 1); remP.position.set(rong / 2, 0, 0.24); remP.rotation.y = Math.PI;
    remT.visible = remP.visible = kep > 0.01;
    remSau.scale.set(rong, cao, 1); remSau.position.set(-rong / 2, 0, -0.35);
    remSau.visible = len > 0.05;
    // lúc cửa kín: đèn chớp hồng + khói cuộn quanh chân cửa
    if (e > m.dongCua - 200 && e < m.moCua + 200) {
      den.position.set(0, cao * 0.7, 0.8);
      den.intensity = Math.sin(e * 0.045) > 0.2 ? 14 : 2;
      for (let i = 0; i < 3; i++) {
        const g = Math.random() * Math.PI * 2, r = rong * (0.4 + Math.random() * 0.5);
        tmp.set(Math.cos(g) * r, 0.1 + Math.random() * 0.4, Math.sin(g) * r * 0.6 + 0.3).applyMatrix4(nhom.matrixWorld);
        khoi.ban(tmp.x, tmp.y, tmp.z, (Math.random() - 0.5) * 0.4, 0.5 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4,
          Math.random() < 0.5 ? trang : xam, 1.6 + Math.random());
      }
    } else den.intensity = Math.max(0, den.intensity - dt * 30);
    // mở cửa: pháo hoa nổ tung từ đỉnh cửa
    if (!daNo && e >= m.moCua) {
      daNo = true;
      for (const [dx, dy] of [[0, cao + 0.3], [-rong, cao * 0.8], [rong, cao * 0.8]] as const) {
        tmp.set(dx, dy, 0.3).applyMatrix4(nhom.matrixWorld);
        for (let i = 0; i < 180; i++) {
          const u = Math.random() * 2 - 1, g = Math.random() * Math.PI * 2, s = 2.5 + Math.random() * 2.5;
          const q = Math.sqrt(1 - u * u);
          phao.ban(tmp.x, tmp.y, tmp.z, q * Math.cos(g) * s, u * s + 1.2, q * Math.sin(g) * s,
            MAU_PHAO[(Math.random() * MAU_PHAO.length) | 0]!, 1.2 + Math.random() * 0.9);
        }
      }
      den.intensity = 20; den.color.set('#ffd23d');
    }
    // sau khi mở: lấp lánh bay quanh người, vòng sáng dưới chân, chữ cảm ơn
    const sau = e >= m.moCua && e < m.het - 600;
    if (sau) {
      for (let i = 0; i < 4; i++) {
        const g = e * 0.004 + i * 1.57 + Math.random() * 0.4, r = rong * 0.55;
        tmp.set(Math.cos(g) * r, Math.random() * cao, Math.sin(g) * r).applyMatrix4(nhom.matrixWorld);
        phao.ban(tmp.x, tmp.y, tmp.z, 0, 0.6 + Math.random() * 0.5, 0, MAU_PHAO[(Math.random() * 3) | 0]!, 0.9);
      }
    }
    const vm = vong.material as THREE.MeshBasicMaterial;
    vm.opacity = sau ? 0.55 + Math.sin(e * 0.01) * 0.25 : Math.max(0, vm.opacity - dt * 2);
    vong.scale.setScalar(rong * (1 + Math.sin(e * 0.006) * 0.08));
    vong.position.y = 0.02;
    if (loi) {
      loi.visible = e >= m.moCua;
      const bat = em((e - m.moCua) / 350);
      const tat = 1 - em((e - (m.het - 700)) / 700);
      loi.scale.set(rong * 2.6 * (0.6 + 0.4 * bat), rong * 0.65 * (0.6 + 0.4 * bat), 1);
      loi.material.opacity = bat * tat;
      loi.position.set(0, cao + 0.45 + Math.sin(e * 0.004) * 0.05, 0);
    }
  }

  function don(): void {
    scene.remove(nhom, phao.pts, khoi.pts);
    tex.dispose();
  }

  return { dat, capNhat, don };
}
