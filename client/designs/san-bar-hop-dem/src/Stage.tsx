import { useEffect, useRef, useState } from 'react';
import { CANH3D_ATTR, docVuCong3D } from '@live/contracts';
import type { VuCong3D } from '@live/contracts';
import { Slot, useAsset } from '@live/stage-sdk';
import * as khongGian from './khong-gian/hop-dem';
import { start } from './canh';

/** Chạy thử vũ công khi chưa bật module: `?model=/m/<module>/<file>.glb`. Chỉ nhận asset của module do chính
 *  backend phục vụ (`/m/…`), không nạp URL ngoài. Bật module vũ công (slot `stage-3d`) thì module quyết. */
function modelThu(): string | null {
  const m = new URLSearchParams(location.search).get('model');
  return m !== null && /^\/m\/[a-z][a-z0-9-]*\/[\w./-]+\.glb$/.test(m) && !m.includes('..') ? m : null;
}

/** Sàn bar · Hộp đêm: cảnh 3D phủ kín khung, chỉ một slot `stage-3d` cho vũ công.
 *
 *  Cảnh chạy được khi không có module nào (quy ước 04 §1): đèn, LED, laser, màn chiếu theo nhịp;
 *  vũ công 3D là việc của module cắm vào slot `stage-3d`. */
export function Stage() {
  const asset = useAsset();
  const khung = useRef<HTMLDivElement>(null);
  const lop3d = useRef<HTMLDivElement>(null);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    const mount = khung.current;
    if (mount === null) return;
    const lop = lop3d.current;
    let don: (() => void) | null = null;
    let quan: MutationObserver | null = null;
    let huy = false;
    start({ space: khongGian, mount, tex: asset('tex/') })
      .then((c) => {
        if (huy) return c.don();
        don = c.don;
        // Module ở slot `stage-3d` khai vũ công bằng `data-canh3d` (docs/02 §5b). Không có module nào thì
        // `?model=` (chạy thử) hoặc sàn trống. So chuỗi để nhịp vẽ lại 250 ms của SDK không làm dựng lại gì.
        let cu = '';
        const doc = (): void => {
          const raw = lop?.querySelector(`[${CANH3D_ATTR}]`)?.getAttribute(CANH3D_ATTR) ?? null;
          const thu = modelThu();
          const v: VuCong3D | null = docVuCong3D(raw) ?? (thu === null ? null : { model: thu, trangPhuc: null, dieu: null });
          const chuoi = JSON.stringify(v);
          if (chuoi === cu) return;
          cu = chuoi;
          c.vuCong(v);
        };
        doc();
        if (lop !== null) {
          quan = new MutationObserver(doc);
          quan.observe(lop, { subtree: true, childList: true, attributes: true, attributeFilter: [CANH3D_ATTR] });
        }
      })
      .catch((e: unknown) => setLoi(e instanceof Error ? e.message : String(e)));
    return () => {
      huy = true;
      quan?.disconnect();
      don?.();
    };
  }, [asset]);

  return (
    <div className="stage">
      <div className="canh" ref={khung} />
      {loi !== null && <div className="loi-canh">Không dựng được cảnh: {loi}</div>}
      <div className="lop-3d" ref={lop3d}>
        <Slot name="stage-3d" />
      </div>
    </div>
  );
}
