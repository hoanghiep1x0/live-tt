/** Tách một câu (lời MC, lời cảm ơn) thành các đoạn để tô riêng phần là TÊN
 *  NGƯỜI XEM. Hàm thuần — test chạy ở Node, thiết kế nào cũng dùng được.
 *
 *  Câu MC là chữ trơn do máy chủ / AI viết, không đánh dấu tên ở đâu. Nên dò
 *  theo tên của những người đang có mặt trong phiên (ghế, top quà, feed gần
 *  đây): khớp nguyên chữ, ưu tiên tên dài trước ("Lan Anh" thắng "Lan"), và
 *  phải đứng riêng — không tô "An" nằm giữa chữ "Anh". */

export interface DoanCau {
  chu: string;
  /** Đoạn này là tên một người trong phòng. */
  ten: boolean;
}

const CHU_HOAC_SO = /[\p{L}\p{N}]/u;

/** Tên ngắn hơn chừng này dễ trùng chữ thường trong câu ("A", "Bé"…) — bỏ qua. */
const TEN_NGAN_NHAT = 2;

function dungRieng(text: string, dau: number, cuoi: number): boolean {
  const truoc = dau > 0 ? text.slice(0, dau).at(-1) : undefined;
  const sau = text.slice(cuoi, cuoi + 2).charAt(0);
  return (truoc === undefined || !CHU_HOAC_SO.test(truoc)) && (sau === '' || !CHU_HOAC_SO.test(sau));
}

/** Chữ xưng hô / chữ thường gặp ở đầu câu: tên bắt đầu bằng chúng ("Anh Tuấn")
 *  thì không lấy riêng chữ đầu làm tên gọi gọn, kẻo tô nhầm "Anh em ơi". */
const KHONG_GOI_GON = new Set(
  'anh em chị chi cô co chú chu bác bac bé be ông ong bà ba mình minh bạn ban cả ca con cháu chau thầy thay mẹ me bố bo ba ní ni'.split(' '),
);

/** Các cách MC hay gọi một người: nguyên tên; tên bỏ emoji / ký hiệu hai đầu
 *  ("Gấu live 🐻" → "Gấu live"); chữ đầu của tên nhiều chữ ("Yazmín Domínguez"
 *  → "Yazmín") nếu chữ đó đủ dài và không phải chữ xưng hô. Hàm thuần. */
export function cachGoi(ten: string): string[] {
  const goc = ten.trim();
  const gon = goc.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim();
  const ra = [goc, gon];
  const chu = gon.split(/\s+/);
  const dau = chu[0] ?? '';
  if (chu.length >= 2 && [...dau].length >= 3 && !KHONG_GOI_GON.has(dau.toLowerCase())) ra.push(dau);
  return ra;
}

export function tachTenTrongCau(text: string, tenCo: Iterable<string>): DoanCau[] {
  const ds = [
    ...new Set([...tenCo].flatMap(cachGoi).filter((t) => [...t].length >= TEN_NGAN_NHAT)),
  ].sort(
    (a, b) => b.length - a.length,
  );
  if (ds.length === 0 || text === '') return text === '' ? [] : [{ chu: text, ten: false }];

  const ra: DoanCau[] = [];
  let thuong = '';
  let i = 0;
  while (i < text.length) {
    const ten = ds.find((t) => text.startsWith(t, i) && dungRieng(text, i, i + t.length));
    if (ten === undefined) {
      thuong += text[i];
      i += 1;
      continue;
    }
    if (thuong !== '') ra.push({ chu: thuong, ten: false });
    thuong = '';
    ra.push({ chu: ten, ten: true });
    i += ten.length;
  }
  if (thuong !== '') ra.push({ chu: thuong, ten: false });
  return ra;
}
