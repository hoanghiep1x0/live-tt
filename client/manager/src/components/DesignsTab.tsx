import { useState } from 'react';
import type { Manager } from '../lib/store';
import { DesignCard } from './DesignCard';

interface Props {
  m: Manager;
  onToast(t: string, loi?: boolean): void;
  onSangTinhNang(): void;
}

export function DesignsTab({ m, onToast, onSangTinhNang }: Props) {
  const [tim, setTim] = useState('');
  const q = tim.trim().toLowerCase();
  const hien = m.designs.filter(
    (d) => q === '' || d.displayName.toLowerCase().includes(q) || d.manifest.id.includes(q),
  );

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">Bộ sưu tập</div>
          <h1>Thiết kế</h1>
          <p>
            Mỗi thiết kế là một phòng live độc lập. Dán link OBS vào Browser Source, link Studio để
            mở phiên phát.
          </p>
        </div>
        <div className="tools">
          <input
            className="input"
            placeholder="Tìm thiết kế…"
            aria-label="Tìm thiết kế"
            value={tim}
            onChange={(e) => setTim(e.target.value)}
          />
        </div>
      </div>

      {m.designs.length === 0 ? (
        <div className="empty">
          <b>Chưa có thiết kế nào</b>
          Máy chủ quét <code>client/designs/*/design.json</code> mỗi lần tải. Thêm một thư mục thiết
          kế vào đó rồi bấm tải lại.
        </div>
      ) : hien.length === 0 ? (
        <div className="empty">
          <b>Không có thiết kế nào khớp “{tim}”</b>
        </div>
      ) : (
        <div className="grid-designs">
          {hien.map((d) => (
            <DesignCard
              key={d.manifest.id}
              d={d}
              live={m.live}
              onBatLive={m.batLive}
              onTatLive={m.tatLive}
              onDoiTen={m.doiTen}
              onDatStudio={m.datStudio}
              onReset={m.resetData}
              onToast={onToast}
              onSangTinhNang={onSangTinhNang}
            />
          ))}
        </div>
      )}
    </section>
  );
}
