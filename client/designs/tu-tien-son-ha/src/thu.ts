/** Bản chơi thử (`?thu=1`): khách giả gõ lệnh để người vận hành xem trọn một vòng game
 *  mà không cần live. Không bao giờ chạy ở bản phát thật, không ghi sổ. */

import type { The, TinVao } from './loi/core';
import { buocToi, huongToi } from './loi/me-cung';
import { CANH_GIOI } from './loi/the-gioi';

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

export function taoKhachGia() {
  const ds: Khach[] = [];
  let ke = 0;
  let caoDaDat = false;

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
        go(k, i % 2 ? 'nước' : 'núi');
        queueMicrotask(() => {
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
      if (k.seVao && the.nguoi.get(k.user)?.phe == null && r < 0.06) {
        go(k, ["núi nam", "núi nữ", "nước nữ", "nước nam", "vào", "nữ", "nam"][Math.floor(Math.random() * 7)]!);
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
          if (k.user === pha.user) {
            if (pha.chon === null && r < 0.05) go(k, Math.random() < 0.6 ? ABC[pha.cau.dung]! : ABC[(pha.cau.dung + 1) % 3]!);
          } else if (r < 0.03) go(k, 'độ');
          break;
        case 'lu':
          if (r < 0.025) go(k, ['hồi', 'thủ', 'công', 'phá'][Math.floor(Math.random() * 4)]!);
          else if (r < 0.3) go(k, Math.random() < 0.5 ? 'lên' : 'đẩy');
          break;
        case 'yeu':
          if (r < 0.02) go(k, ['hồi', 'thủ', 'công', 'phá'][Math.floor(Math.random() * 4)]!);
          else if (r < 0.2) go(k, 'đánh');
          break;
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
      if (r > 0.9993) ra.push({ kind: 'gift', user: k.user, ten: k.ten, text: 'Hoa hồng', count: 1 + Math.floor(Math.random() * 5), xu: 5 });
      if (r < 0.0006) go(k, 'tôi');
    }
    return ra;
  };
}
