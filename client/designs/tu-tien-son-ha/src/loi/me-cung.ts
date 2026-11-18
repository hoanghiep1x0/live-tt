/** Lưới mê cung Địa Cung — THUẦN. Ô đánh số `o = hang * cot + c`; mỗi ô giữ bốn bit tường.
 *  Đào bằng quay lui (mê cung hoàn hảo) rồi đục thêm vài lỗ cho có đường vòng — mê cung hoàn hảo
 *  thì đông người dễ tắc cả đám trong một ngõ cụt. Giữa là sảnh lõi 3×3 để Rương Đồng nằm. */

export type Huong = 'len' | 'xuong' | 'trai' | 'phai';

export const BIT: Record<Huong, number> = { len: 1, phai: 2, xuong: 4, trai: 8 };
const NGUOC: Record<Huong, Huong> = { len: 'xuong', xuong: 'len', trai: 'phai', phai: 'trai' };
export const HUONG: readonly Huong[] = ['len', 'phai', 'xuong', 'trai'];

export interface MeCung {
  cot: number;
  hang: number;
  /** Bit tường của từng ô (BIT). 15 là kín bốn phía. */
  tuong: number[];
}

export const xyCua = (me: MeCung, o: number) => ({ c: o % me.cot, h: Math.floor(o / me.cot) });

function canh(me: MeCung, o: number, h: Huong): number | null {
  const { c, h: r } = xyCua(me, o);
  if (h === 'len') return r > 0 ? o - me.cot : null;
  if (h === 'xuong') return r < me.hang - 1 ? o + me.cot : null;
  if (h === 'trai') return c > 0 ? o - 1 : null;
  return c < me.cot - 1 ? o + 1 : null;
}

function duc(me: MeCung, o: number, h: Huong) {
  const k = canh(me, o, h);
  if (k === null) return;
  me.tuong[o]! &= ~BIT[h];
  me.tuong[k]! &= ~BIT[NGUOC[h]];
}

export const oGiua = (me: MeCung) => Math.floor(me.hang / 2) * me.cot + Math.floor(me.cot / 2);

export function taoMe(cot: number, hang: number, rand: () => number, thung = 0.12, sanh = true): MeCung {
  const me: MeCung = { cot, hang, tuong: new Array<number>(cot * hang).fill(15) };
  const da = new Array<boolean>(cot * hang).fill(false);
  const ngan = [Math.floor(rand() * cot * hang)];
  da[ngan[0]!] = true;
  while (ngan.length > 0) {
    const o = ngan[ngan.length - 1]!;
    const mo = HUONG.filter((h) => {
      const k = canh(me, o, h);
      return k !== null && !da[k];
    });
    if (mo.length === 0) {
      ngan.pop();
      continue;
    }
    const h = mo[Math.floor(rand() * mo.length)]!;
    duc(me, o, h);
    const k = canh(me, o, h)!;
    da[k] = true;
    ngan.push(k);
  }
  // Đường vòng.
  for (let o = 0; o < cot * hang; o++) {
    for (const h of ['phai', 'xuong'] as const) {
      if (canh(me, o, h) !== null && (me.tuong[o]! & BIT[h]) !== 0 && rand() < thung) duc(me, o, h);
    }
  }
  if (sanh) moSanh(me);
  return me;
}

/** Sảnh lõi 3×3 thông thoáng (chỗ Rương Đồng). */
function moSanh(me: MeCung) {
  const cot = me.cot;
  const { c, h } = xyCua(me, oGiua(me));
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const o = (h + dy) * cot + (c + dx);
      if (dx < 1) duc(me, o, 'phai');
      if (dy < 1) duc(me, o, 'xuong');
    }
  }
}

/** Mê cung đối xứng gương trái – phải (số cột lẻ): đào nửa trái kèm cột giữa, rồi soi gương sang nửa
 *  phải. Hai cửa vào ở hai góc dưới vì thế giống hệt nhau — không phe nào được đường dễ hơn. */
export function taoMeDoiXung(cot: number, hang: number, rand: () => number, thung = 0.12): MeCung {
  const nua = Math.ceil(cot / 2);
  const tr = taoMe(nua, hang, rand, thung, false);
  const me: MeCung = { cot, hang, tuong: new Array<number>(cot * hang).fill(15) };
  const doi = (t: number) => (t & (BIT.len | BIT.xuong)) | (t & BIT.trai ? BIT.phai : 0) | (t & BIT.phai ? BIT.trai : 0);
  for (let h = 0; h < hang; h++) {
    for (let c = 0; c < nua; c++) {
      const t = tr.tuong[h * nua + c]!;
      me.tuong[h * cot + c] = t;
      if (c < nua - 1 || cot % 2 === 0) me.tuong[h * cot + (cot - 1 - c)] = doi(t);
    }
    if (cot % 2 === 1) {
      // Cột giữa: tường phải soi theo tường trái của chính nó.
      const o = h * cot + (nua - 1);
      const t = me.tuong[o]!;
      me.tuong[o] = (t & ~BIT.phai) | (t & BIT.trai ? BIT.phai : 0);
    }
  }
  moSanh(me);
  return me;
}

/** Ô soi gương trái – phải. */
export const oGuong = (me: MeCung, o: number) => {
  const { c, h } = xyCua(me, o);
  return h * me.cot + (me.cot - 1 - c);
};

/** Ô kế bên theo hướng, nếu không có tường chắn. */
export function ke(me: MeCung, o: number, h: Huong): number | null {
  if ((me.tuong[o]! & BIT[h]) !== 0) return null;
  return canh(me, o, h);
}

export function lanCan(me: MeCung, o: number): number[] {
  const ra: number[] = [];
  for (const h of HUONG) {
    const k = ke(me, o, h);
    if (k !== null) ra.push(k);
  }
  return ra;
}

/** Bước kế tiếp trên đường ngắn nhất tới đích gần nhất. `null` khi đã đứng trên đích hoặc không tới được. */
export function buocToi(me: MeCung, tu: number, dich: ReadonlySet<number>, rand: () => number): number | null {
  if (dich.size === 0 || dich.has(tu)) return null;
  const truoc = new Map<number, number>([[tu, -1]]);
  const hang = [tu];
  for (let i = 0; i < hang.length; i++) {
    const o = hang[i]!;
    const kes = lanCan(me, o);
    // Xáo thứ tự: nhiều người cùng đuổi một món thì toả ra nhiều ngả, không đi thành một hàng.
    for (let j = kes.length - 1; j > 0; j--) {
      const r = Math.floor(rand() * (j + 1));
      [kes[j], kes[r]] = [kes[r]!, kes[j]!];
    }
    for (const k of kes) {
      if (truoc.has(k)) continue;
      truoc.set(k, o);
      if (dich.has(k)) {
        let x = k;
        while (truoc.get(x) !== tu) x = truoc.get(x)!;
        return x;
      }
      hang.push(k);
    }
  }
  return null;
}

/** Độ gần lõi 0..1 (1 là ô giữa) — đồ rơi gần lõi quý hơn. */
export function doGan(me: MeCung, o: number): number {
  const a = xyCua(me, o);
  const g = xyCua(me, oGiua(me));
  const xa = Math.abs(a.c - g.c) + Math.abs(a.h - g.h);
  return 1 - xa / (Math.floor(me.cot / 2) + Math.floor(me.hang / 2));
}

/** Cửa của Địa Cung: phe Núi vào ở góc dưới trái, phe Nước góc dưới phải, Cửa Ra giữa mép trên.
 *  Tường phía ngoài ở ba ô này được mở (chỉ để vẽ khe cửa — đi ra ngoài khung vẫn không được). */
export function cuaMe(me: MeCung): { vao: { son: number; thuy: number }; ra: number } {
  const vao = { son: (me.hang - 1) * me.cot, thuy: me.hang * me.cot - 1 };
  const ra = Math.floor(me.cot / 2);
  me.tuong[vao.son]! &= ~BIT.xuong;
  me.tuong[vao.thuy]! &= ~BIT.xuong;
  me.tuong[ra]! &= ~BIT.len;
  return { vao, ra };
}

/** Số bước đi ngắn nhất giữa hai ô. */
export function khoang(me: MeCung, a: number, b: number): number {
  if (a === b) return 0;
  const xa = new Map<number, number>([[a, 0]]);
  const hang = [a];
  for (let i = 0; i < hang.length; i++) {
    const o = hang[i]!;
    for (const k of lanCan(me, o)) {
      if (xa.has(k)) continue;
      const d = xa.get(o)! + 1;
      if (k === b) return d;
      xa.set(k, d);
      hang.push(k);
    }
  }
  return Infinity;
}

/** Hướng đi từ ô `a` sang ô kề `b`. */
export function huongToi(me: MeCung, a: number, b: number): Huong | null {
  for (const h of HUONG) if (ke(me, a, h) === b) return h;
  return null;
}

/** Ô trên viền mê cung, chia nửa trái cho phe Núi và nửa phải cho phe Nước. */
export function oCua(me: MeCung, phe: 'son' | 'thuy'): number[] {
  const ra: number[] = [];
  const nua = me.cot / 2;
  for (let o = 0; o < me.cot * me.hang; o++) {
    const { c, h } = xyCua(me, o);
    const vien = c === 0 || h === 0 || c === me.cot - 1 || h === me.hang - 1;
    if (vien && (phe === 'son' ? c < nua - 0.5 : c > nua - 0.5)) ra.push(o);
  }
  return ra;
}
