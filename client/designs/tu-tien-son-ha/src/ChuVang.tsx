/** Chữ tiêu đề kiểu game tiên hiệp: lớp sau là viền sẫm + hào quang, lớp trước là màu tô gradient.
 *  Hai lớp là hai phần tử chồng nhau (grid cùng ô) — dùng ::before thì lớp viền đè lên màu tô
 *  (background-clip: text vẽ nền trước con có z-index âm) và chữ hoá màu nâu. */

import type { CSSProperties } from 'react';

export function ChuVang({ chu, lop, to, sang }: { chu: string; lop?: string; to?: string | undefined; sang?: string | undefined }) {
  const kieu = { ...(to ? { '--to': to } : {}), ...(sang ? { '--sang': sang } : {}) } as CSSProperties;
  return (
    <span className={`chu-vang${lop ? ` ${lop}` : ''}`} style={kieu}>
      <span className="vien" aria-hidden="true">
        {chu}
      </span>
      <span className="mat">{chu}</span>
    </span>
  );
}
