/** Cài đặt MC (cấu hình AI của phòng) dùng chung: hàm sửa, đọc kho kết nối,
 *  và các ô (nhịp, kết nối, model, sáng tạo, độ dài, giọng, lời dặn, ảnh).
 *  Thẻ "Người dẫn do AI" (`BangXem.tsx`) và khối "Mình kể truyện" của Kể chuyện
 *  (`McKeChuyen.tsx`) cùng dùng một bộ — một chỗ định nghĩa, không lệch nhau. */

import { useCallback, useEffect, useState } from 'react';
import { tenKetNoi } from '@live/contracts';
import type { ConfigField, Json, KetNoiAi, ViecAi } from '@live/contracts';
import { guiLenh } from './state';

export function suaAi(key: string, v: Json): void {
  const duoc = guiLenh({
    t: 'command',
    command: { op: 'set-ai', patch: { [key]: v } as Json },
    by: 'nguoi',
    reason: 'sửa người dẫn từ bảng xem thử',
  });
  if (!duoc) console.warn('[xem thử] chưa nối được máy chủ');
}

export const O_NHIP: ConfigField = {
  key: 'everySec',
  label: 'Nhịp khi không tự hẹn lượt sau',
  short: 'Nhịp (giây)',
  hint: 'Như bản cũ, mỗi lượt mình tự hẹn lượt sau 10–120 giây theo tình hình phòng (khách đang chờ thì nhanh, phòng im thì thưa). Ô này chỉ dùng cho lượt đầu và khi mình không hẹn.',
  type: 'number',
  min: 10,
  max: 300,
  unit: 'giây',
};

/** Một dòng kho kết nối AI, bản cho sân khấu: có địa chỉ để mở lại kết nối cũ,
 *  nhưng KHÔNG bao giờ có giá trị khoá. */
export type NhaAi = KetNoiAi;

/** Đọc kho kết nối AI một lần lúc mở bảng. Cắm thêm khoá thì mở thẻ Kết nối
 *  AI ở đầu ngăn; sửa đầy đủ hay xoá thì sang trang quản lý. */
export function useNhaAi(): NhaAi[] {
  const [ds] = useKhoAi();
  return ds;
}

/** Kho kết nối kèm hàm tải lại, cho thẻ nào vừa cắm thêm khoá. */
export function useKhoAi(): [NhaAi[], () => void] {
  const [ds, setDs] = useState<NhaAi[]>([]);
  const tai = useCallback(() => {
    void fetch('/s/providers')
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((j: { providers?: NhaAi[] }) => setDs(j.providers ?? []))
      .catch(() => setDs([]));
  }, []);
  useEffect(tai, [tai]);
  return [ds, tai];
}

/** Ô chọn kết nối, chỉ liệt kê kết nối làm được đúng loại việc này. Giá trị
 *  đang lưu mà không còn trong kho thì vẫn hiện, để người vận hành thấy nó hỏng
 *  chứ không lặng lẽ nhảy sang nhà khác. */
/** Kết nối mà "Mặc định" sẽ dùng — cùng luật với `secrets::tim` ở backend:
 *  kết nối mang tên mặc định cũ nếu còn, không thì kết nối đầu tiên làm được
 *  việc này và có khoá. */
export function nhaMacDinh(ds: readonly NhaAi[], use: ViecAi, cu: string): NhaAi | undefined {
  return (
    ds.find((p) => p.id === cu) ??
    [...ds].sort((a, b) => a.id.localeCompare(b.id)).find((p) => p.hasKey && p.uses.includes(use))
  );
}

export function oNha(
  key: string,
  label: string,
  use: ViecAi,
  macDinh: string,
  ds: readonly NhaAi[],
  dang: string,
): ConfigField {
  const hop = ds.filter((p) => p.uses.includes(use));
  const md = nhaMacDinh(ds, use, macDinh);
  const options = [
    {
      value: '',
      label:
        md === undefined
          ? 'Mặc định — chưa có kết nối nào làm được việc này'
          : `Mặc định — ${tenKetNoi(md)}`,
    },
    ...hop.map((p) => ({
      value: p.id,
      label: p.hasKey ? tenKetNoi(p) : `${tenKetNoi(p)} (thiếu khoá)`,
    })),
  ];
  if (dang !== '' && !hop.some((p) => p.id === dang)) {
    options.push({ value: dang, label: `${dang} (không có trong kho)` });
  }
  return {
    key,
    label,
    short: label,
    type: 'select',
    options,
    hint: 'Cắm thêm khoá ở thẻ Kết nối AI đầu ngăn này. Khoá không bao giờ về tới trang này.',
  };
}

/** Model của tính năng này. Để trống là theo model mặc định của kết nối —
 *  gợi ý ghi luôn đó là model nào. */
export function oModel(
  key: string,
  label: string,
  use: ViecAi,
  nha: string,
  ds: readonly NhaAi[],
): ConfigField {
  const md = ds.find((p) => p.id === nha)?.models[use];
  return {
    key,
    label,
    short: 'Model',
    type: 'text',
    hint:
      md === undefined || md === ''
        ? 'Để trống là theo model mặc định của kết nối.'
        : `Để trống là dùng ${md} — model mặc định của kết nối.`,
  };
}

export const O_SANG_TAO: ConfigField = {
  key: 'temperature',
  label: 'Độ sáng tạo',
  type: 'select',
  options: [
    { value: '', label: 'Theo nhà cung cấp' },
    { value: '0.2', label: 'Chắc chắn — bám sát tin phòng' },
    { value: '0.6', label: 'Cân bằng' },
    { value: '0.9', label: 'Bay bổng — nói nhiều kiểu hơn' },
  ],
};

export const O_TRAN: ConfigField = {
  key: 'maxTokens',
  label: 'Độ dài tối đa một lượt',
  type: 'number',
  min: 100,
  max: 4000,
  unit: 'token',
  hint: 'Thấp thì rẻ và gọn; mình chỉ nói tối đa 2 câu mỗi lượt nên 600 là đủ.',
};

export const O_GIONG_MC: ConfigField = {
  key: 'voiceId',
  label: 'Giọng chính của mình',
  type: 'voice',
  hint: 'Chỉ dùng khi phòng bật Đa giọng (trang quản lý, nút Giọng đọc). Trong câu, [id-giọng] đổi giọng, [-] quay về giọng chính.',
};

export const O_BAT_ANH: ConfigField = {
  key: 'anhEnabled',
  label: 'Cho nút "AI vẽ ảnh" gọi API',
  type: 'toggle',
  hint: 'Nút vẽ một ảnh lẻ ở ô ảnh/video. Tắt thì nút đó không gọi đi đâu — khỏi lỡ tay tốn tiền.',
};

export const O_CO_ANH: ConfigField = {
  key: 'anhSize',
  label: 'Kích thước ảnh',
  type: 'select',
  options: [
    { value: '', label: 'Vuông 1024×1024' },
    { value: '1536x1024', label: 'Ngang 1536×1024' },
    { value: '1024x1536', label: 'Dọc 1024×1536' },
    { value: '1792x1024', label: 'Ngang rộng 1792×1024' },
    { value: '1024x1792', label: 'Dọc cao 1024×1792' },
  ],
  hint: 'Mỗi nhà nhận một bộ kích thước khác nhau; chọn sai thì nhà cung cấp báo lỗi.',
};

export const O_DAN: ConfigField = {
  key: 'extra',
  label: 'Lời dặn thêm cho mình',
  type: 'textarea',
  hint: 'Ghép sau lời dặn gốc. Ví dụ: tên phòng, chủ đề tối nay, điều cần tránh',
};
