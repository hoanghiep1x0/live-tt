import { useEffect, useMemo, useState } from 'react';
import { AI_MAC_DINH } from './state';
import { SO_MODULE } from './registry';
import { useStage } from './Stage';
import { dsSuCo, loiAnhCua } from './su-co';

/** Mới mở trang nào cũng có một nhịp chưa nối; đứt thật mới báo. */
const CHO_MAT_NOI_MS = 5000;

/** Toast sự cố, góc phải trên, ngay dưới nút ⚙.
 *
 *  Toast đứng yên chừng nào sự cố còn: người vận hành đang lo buổi live, tự tắt
 *  sau vài giây là họ dễ bỏ lỡ. Hết sự cố thì tự biến mất; bấm ✕ thì ẩn tới khi
 *  sự cố đó hết rồi tái phát. Chỉ dựng từ `BangXem`, nên OBS không thấy. */
export function ToastSuCo() {
  const s = useStage();
  const [matNoi, datMatNoi] = useState(false);
  const [daAn, datDaAn] = useState<readonly string[]>([]);

  useEffect(() => {
    if (s.noiDuoc) {
      datMatNoi(false);
      return;
    }
    const hen = setTimeout(() => datMatNoi(true), CHO_MAT_NOI_MS);
    return () => clearTimeout(hen);
  }, [s.noiDuoc]);

  const ai = s.ai ?? AI_MAC_DINH;
  const ds = useMemo(
    () =>
      dsSuCo({
        matNoi,
        aiBat: ai.enabled,
        aiLoi: s.aiLoi,
        loiAnh: loiAnhCua(SO_MODULE, s.enabled, s.config),
        mayChu: s.suCo,
      }),
    [matNoi, ai.enabled, s.aiLoi, s.enabled, s.config, s.suCo],
  );

  // Sự cố đã hết thì quên dấu ✕, lần sau tái phát còn báo lại.
  const dangCo = ds.map((x) => x.id).join('|');
  useEffect(() => {
    const con = dangCo.split('|');
    datDaAn((cu) => (cu.every((id) => con.includes(id)) ? cu : cu.filter((id) => con.includes(id))));
  }, [dangCo]);

  const hien = ds.filter((x) => !daAn.includes(x.id));
  if (hien.length === 0) return null;

  return (
    <div className="bx-toasts">
      {hien.map((x) => (
        <div key={x.id} className="bx-toast" role="alert">
          <span className="bx-toast-icon" aria-hidden>
            ⚠
          </span>
          <div className="bx-toast-than">
            <b>{x.tieuDe}</b>
            <p title={x.chu}>{x.chu}</p>
          </div>
          <button
            type="button"
            className="bx-toast-x"
            aria-label={`Ẩn thông báo ${x.tieuDe}`}
            onClick={() => datDaAn((cu) => [...cu, x.id])}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
