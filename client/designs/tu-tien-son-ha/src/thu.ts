/** Bản chơi thử (`?thu=1`): khách giả gõ lệnh để người vận hành xem trọn một vòng game
 *  mà không cần live. Không bao giờ chạy ở bản phát thật, không ghi sổ. */

import { nhapMonThang, type NguoiChoi, type The, type TinVao } from './loi/core';
import { bangTop, QUA_THACH } from './loi/loi-dai';
import { buocToi, huongToi } from './loi/me-cung';
import { AO, CANH_CP, CONG_PHAP, DAN, PET } from './loi/tang-bao';
import { CANH_GIOI, SO_DO_CHIEU } from './loi/the-gioi';

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô'];
const TEN = [
  'Lan', 'Hùng', 'Mai', 'Tuấn', 'Ngọc', 'Minh', 'Thảo', 'Khoa', 'Vy', 'Phúc', 'Trang', 'Long',
  'Hà', 'Quân', 'Linh', 'Bảo', 'My', 'Đạt', 'Yến', 'Sơn', 'Nhi', 'Huy', 'Châu', 'Tâm',
];
const NOI = ['hay quá', 'câu này dễ', 'phe núi đâu rồi', 'nước lên nước lên', 'ai thắng vậy', 'hihi', 'khó ghê'];
const ABC = ['a', 'b', 'c'];

interface Khach {
  user: string;
  ten: string;
  gioi: number;
  nhanh: number;
  daTra: number;
  /** Khách giả này sẽ nhập môn (còn lại đứng xem làm khách). */
  seVao: boolean;
}

/** Quà giả lập: tên quà TikTok thật (có ảnh trong danh mục chung), quà rẻ hay gặp, quà to hiếm. */
const QUA_THU: readonly { ten: string; xu: number; w: number }[] = [
  { ten: 'Rose', xu: 1, w: 30 },
  { ten: 'Finger Heart', xu: 5, w: 14 },
  { ten: 'Rosa', xu: 10, w: 12 },
  { ten: 'Perfume', xu: 20, w: 8 },
  { ten: 'Doughnut', xu: 30, w: 6 },
  { ten: 'Hand Heart', xu: 100, w: 4 },
  { ten: 'Corgi', xu: 299, w: 2 },
  { ten: 'Money Gun', xu: 500, w: 1.2 },
  { ten: 'Galaxy', xu: 1000, w: 0.6 },
  { ten: 'Meteor Shower', xu: 3000, w: 0.25 },
];
function quaThu(): { ten: string; xu: number } {
  let r = Math.random() * QUA_THU.reduce((a, q) => a + q.w, 0);
  for (const q of QUA_THU) if ((r -= q.w) <= 0) return q;
  return QUA_THU[0]!;
}

/** Khách giả chọn một món MUA ĐƯỢC ở Tàng Bảo Các (đủ linh thạch, đủ cảnh giới, chưa có): đan dược, công pháp,
 *  linh thú, trang phục — để bản thử thấy món rơi xuống, đổi áo, đổi chiêu. Không mua được gì thì null. */
function chonMua(n: NguoiChoi): string | null {
  const ds: string[] = [];
  const tc = n.tinChi;
  DAN.forEach((m, i) => {
    if (m.gia <= tc && n.canh >= m.can && !('day' in m.dung)) ds.push(`d${i + 1}`, `d${i + 1}`);
  });
  CONG_PHAP.forEach((m, i) => {
    if (m.gia <= tc && n.canh >= CANH_CP[m.bac]! && (n.cpCo & (1 << (i + 1))) === 0) ds.push(`c${i + 1}`, `c${i + 1}`);
  });
  PET.forEach((m, i) => {
    if (m.gia <= tc && (n.petCo & (1 << (i + 1))) === 0) ds.push(`p${i + 1}`);
  });
  AO.forEach((m, i) => {
    if (m.gia <= tc && n.canh >= m.can && (n.aoCo & (1 << (i + 1))) === 0) ds.push(`t${i + 1}`, `t${i + 1}`);
  });
  return ds.length === 0 ? null : ds[Math.floor(Math.random() * ds.length)]!;
}

export function taoKhachGia() {
  const ds: Khach[] = [];
  let ke = 0;
  let caoDaDat = false;
  /** Lần khách giả mua món gần nhất: cứ ~6 giây một người mua để bản thử luôn thấy món rơi. */
  let muaLuc = 0;

  function them(n: number) {
    for (let i = 0; i < n; i++) {
      const k = ke++;
      ds.push({
        user: `thu_${k}`,
        ten: `${HO[k % HO.length]} ${TEN[(k * 7) % TEN.length]}`,
        gioi: 0.45 + Math.random() * 0.45,
        nhanh: 0.15 + Math.random() * 0.5,
        daTra: -1,
        seVao: Math.random() < 0.75,
      });
    }
  }
  them(10);

  /** Gọi mỗi ~400ms, trả về các tin khách giả gõ trong nhịp này. */
  return function nhip(the: The, now: number): TinVao[] {
    const ra: TinVao[] = [];
    const go = (k: Khach, text: string) => ra.push({ kind: 'comment', user: k.user, ten: k.ten, text });
    if (ds.length < 42 && Math.random() < 0.04) them(1);

    // Cho vài người sẵn tu vi cao để thấy hào quang và độ kiếp ngay.
    if (!caoDaDat && ds.length >= 10) {
      caoDaDat = true;
      ds.slice(0, 4).forEach((k, i) => {
        go(k, 'chào cả nhà');
        queueMicrotask(() => {
          // Bản thử: bốn người này cho nhập môn thẳng (không qua ải) để thấy ngay hai phe.
          nhapMonThang(the, { kind: 'comment', user: k.user, ten: k.ten }, i % 2 ? 'thuy' : 'son', undefined, now, Math.random);
          const n = the.nguoi.get(k.user);
          if (n === undefined) return;
          n.canh = [3, 5, 6, 2][i]!;
          n.lk = CANH_GIOI[n.canh + 1]!.can - (i === 0 ? 4 : 40);
          n.linhVat = i === 1 ? ['chep', 'rua'] : i === 2 ? ['voi'] : [];
        });
      });
    }

    const pha = the.pha;
    for (const k of ds) {
      const r = Math.random();
      const toi = the.nguoi.get(k.user);
      // Đủ linh khí thì tự gõ "đột phá" (không ai lên cấp thay).
      if (toi && toi.phe !== null && !toi.choKiep && r < 0.08) {
        const ke = CANH_GIOI[toi.canh + 1];
        if (ke !== undefined && toi.lk >= ke.can && now >= toi.kiepLai) {
          go(k, 'đột phá');
          continue;
        }
      }
      // Khách muốn nhập môn: chờ Ải Nhập Môn mở rồi gõ chọn nhân vật trong 30 giây đầu.
      if (k.seVao && pha.k === 'nm' && now < pha.moLuc && toi?.phe == null && !pha.vt.has(k.user) && r < 0.08) {
        go(k, ['1', '2', '3', '4', '2 2', 'nam s'][Math.floor(Math.random() * 6)]!);
        continue;
      }
      // Lôi Đài: đệ tử giả thỉnh thoảng tặng quà khiêu chiến; đang đấu thì gõ 1 công · 2 thủ · 3 tuyệt kỹ (nộ đầy).
      if (toi?.phe != null && (pha.k === 'hoi' || pha.k === 'cho' || pha.k === 'dap')) {
        const tr = the.loiDai?.tran;
        const dau = tr == null ? null : tr.a.user === k.user ? tr.a : tr.b.user === k.user ? tr.b : null;
        if (dau !== null && r > 0.8) {
          go(k, dau.no >= 100 ? '3' : Math.random() < 0.8 ? '1' : '2');
          continue;
        }
        // Khiêu chiến bằng quà: tặng quà của hạng ngay trên mình (thỉnh thoảng gõ 8 xem bảng Top).
        if (dau === null && r > 0.997) {
          const top = bangTop(the, toi.phe);
          const h = top.findIndex((x) => x.user === k.user);
          const q = h > 0 ? QUA_THACH[Math.min(h - 1, QUA_THACH.length - 1)] : undefined;
          if (q !== undefined && h - 1 < QUA_THACH.length && Math.random() < 0.7) ra.push({ kind: 'gift', user: k.user, ten: k.ten, text: q.ten, count: 1, xu: q.xu });
          else go(k, '8');
          continue;
        }
      }
      // Đệ tử giả ghé Tàng Bảo Các lúc tu luyện / chợ: gõ mã món mua được (đan, công pháp, linh thú, trang phục).
      // Đặt TRƯỚC nhánh gõ số (r > 0.985) — trước đây nằm sau nên không bao giờ chạy tới.
      if (toi?.phe != null && the.loiDai?.tran == null && (pha.k === 'hoi' || pha.k === 'cho' || pha.k === 'dap' || pha.k === 'tt') && now - muaLuc > 6000 && r < 0.15) {
        // Bản thử: khách giả được cho thêm linh thạch để mua được món đắt (công pháp bậc cao, áo).
        if (toi.tinChi < 200) toi.tinChi += 150;
        const ma = chonMua(toi);
        if (ma !== null) {
          muaLuc = now;
          go(k, ma);
          continue;
        }
      }
      // Đệ tử giả chơi bảng gõ số lúc tu luyện (sự kiện Cơ Duyên thì gõ 6).
      if (toi?.phe != null && (pha.k === 'hoi' || pha.k === 'cho' || pha.k === 'dap') && r > 0.985) {
        const sk = the.skTl !== null && now < the.skTl.den ? the.skTl.loai : null;
        go(k, sk === 'co-duyen' && Math.random() < 0.5 ? '6' : ['1', '1', '2', '2', '3', '7'][Math.floor(Math.random() * 6)]!);
        continue;
      }
      // Đệ tử giả thỉnh thoảng ghé Tàng Bảo Các lúc tu luyện.
      if (toi?.phe != null && (pha.k === 'hoi' || pha.k === 'cho') && r > 0.9975) {
        go(k, `${'tdcp'[Math.floor(Math.random() * 4)]}${1 + Math.floor(Math.random() * 5)}`);
        continue;
      }
      if (toi?.phe == null && pha.k !== 'nm' && r < 0.004) {
        go(k, NOI[Math.floor(Math.random() * NOI.length)]!);
        continue;
      }
      switch (pha.k) {
        case 'hoi':
          if (k.daTra !== pha.so && r < k.nhanh * 0.12) {
            k.daTra = pha.so;
            go(k, Math.random() < k.gioi ? ABC[pha.cau.dung]! : ABC[(pha.cau.dung + 1 + Math.floor(Math.random() * 2)) % 3]!);
          } else if (r > 0.997) go(k, NOI[Math.floor(Math.random() * NOI.length)]!);
          break;
        case 'kiep':
          if (k.user !== pha.user && r < 0.03) go(k, ['1', '2', '3', 'độ', 'A'][Math.floor(Math.random() * 5)]!);
          break;
        case 'lu':
          if (r < 0.006) {
            const q = quaThu();
            ra.push({ kind: 'gift', user: k.user, ten: k.ten, text: q.ten, count: 1, xu: q.xu });
          } else if (r < 0.03) ra.push({ kind: 'like', user: k.user, ten: k.ten, count: 5 });
          else if (r < 0.2) go(k, Math.random() < 0.5 ? 'lên' : 'đẩy');
          break;
        case 'yeu':
          // Yêu tinh báo chiêu lớn: đệ tử giả gõ số đỡ (70% đúng số), còn lại gõ 5 đánh.
          if (pha.bao !== null && toi?.phe != null && r < 0.05) go(k, Math.random() < 0.7 ? SO_DO_CHIEU[pha.bao.chieu.loai] : String(1 + Math.floor(Math.random() * 4)));
          else if (r < 0.2) go(k, Math.random() < 0.7 ? '5' : 'đánh');
          break;
        case 'nm': {
          // Khách giả tìm đường tới cửa tông mình chọn; 15% đi nhầm.
          const v = pha.vt.get(k.user);
          if (v === undefined || v.qua || now < pha.moLuc || r > k.nhanh) break;
          const toiO = buocToi(pha.me, v.o, new Set([pha.cua[v.phe]]), Math.random);
          const h = toiO === null || Math.random() < 0.15 ? null : huongToi(pha.me, v.o, toiO);
          go(k, { len: 'lên', xuong: 'xuống', trai: 'trái', phai: 'phải' }[h ?? (['len', 'xuong', 'trai', 'phai'] as const)[Math.floor(Math.random() * 4)]!]);
          break;
        }
        case 'me': {
          // Khách giả nghĩ: túi rỗng thì đi tìm bảo vật, có đồ rồi thì chạy ra Cửa Ra; 15% đi nhầm.
          const v = pha.vt.get(k.user);
          if (v === undefined) {
            if (r < 0.02) go(k, 'vào');
            break;
          }
          if (v.thoat || r > k.nhanh) break;
          const dich = new Set(v.tui.length > 0 || pha.do.length === 0 ? [pha.ra] : pha.do.map((d) => d.o));
          const toi = buocToi(pha.me, v.o, dich, Math.random);
          const h = toi === null || Math.random() < 0.15 ? null : huongToi(pha.me, v.o, toi);
          go(k, { len: 'lên', xuong: 'xuống', trai: 'trái', phai: 'phải' }[h ?? (['len', 'xuong', 'trai', 'phai'] as const)[Math.floor(Math.random() * 4)]!]);
          break;
        }
        default:
          if (r > 0.996) go(k, NOI[Math.floor(Math.random() * NOI.length)]!);
      }
      if (r > 0.985 && r < 0.988) ra.push({ kind: 'like', user: k.user, ten: k.ten, count: 5 });
      if (r > 0.9993) {
        const q = quaThu();
        const so = q.xu < 10 ? 1 + Math.floor(Math.random() * 5) : 1;
        ra.push({ kind: 'gift', user: k.user, ten: k.ten, text: q.ten, count: so, xu: q.xu * so });
      }
      if (r < 0.0006) go(k, 'tôi');
    }
    return ra;
  };
}
