/** Vòng hào quang lớn sau lưng nhân vật ở các màn điểm nhấn (đột phá, vinh danh, tuyệt kỹ): ảnh vòng
 *  `fx/halo.png` tô màu, xoay chậm; tia sáng xoay ngược; quầng sáng nhịp thở phía sau. Đặt làm con
 *  ĐẦU TIÊN của khung nhân vật để nằm sau tranh. `tre`: hiện muộn (đột phá: sau chớp sáng). */

import type { CSSProperties } from 'react';

export function VongHao({ asset, mau, tre }: { asset: (p: string) => string; mau: string; tre?: number }) {
  const kieu = {
    '--anh-hao': `url("${asset('fx/halo.png')}")`,
    '--mau-vh': mau,
    ...(tre !== undefined ? { animationDelay: `${tre}s` } : {}),
  } as CSSProperties;
  return (
    <div className="sh-vh" style={kieu} aria-hidden="true">
      <em />
      <i />
      <b />
    </div>
  );
}
