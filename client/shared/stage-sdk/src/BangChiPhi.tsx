import { useEffect, useState } from 'react';
import type { SoChiPhi } from '@live/contracts';
import { useStage } from './Stage';

/** Bảng chi phí của buổi, góc phải dưới — vùng ngoài khung 9:16, không lên
 *  sóng (BangXem tự ẩn trong OBS, bảng này nằm trong đó).
 *
 *  Số là số THẬT nhà cung cấp báo về sau mỗi lượt gọi (`backend/src/chi_phi.rs`),
 *  cộng dồn từ lúc lên sóng tới lúc tắt. Lượt nào nhà không cho biết giá thì
 *  ghi riêng "chưa rõ giá", không gộp thành 0. */

/** Tỷ giá ước tính để đọc nhanh bằng tiền Việt. */
export const TY_GIA = 26_000;

const TEN_KHOAN: Record<string, string> = {
  mc: 'Người dẫn truyện',
  viet: 'AI viết',
  'ke-hoach-anh': 'Lập kế hoạch ảnh',
  've-anh': 'Vẽ ảnh',
  've-anh-muse': 'Vẽ ảnh (muse.ai)',
  giong: 'Giọng đọc',
};
const THU_TU = ['mc', 'viet', 'ke-hoach-anh', 've-anh', 've-anh-muse', 'giong'];

/** Số tiền Việt gọn: "0đ", "180đ", "12.400đ". */
export function chuVnd(usd: number): string {
  const d = Math.round(usd * TY_GIA);
  return `${d.toLocaleString('vi-VN')}đ`;
}

/** USD nhỏ vẫn đọc được: $0.000023 thay vì $0.00. */
export function chuUsd(usd: number): string {
  if (usd === 0) return '$0';
  return `$${usd < 0.01 ? Number(usd.toPrecision(2)).toString() : usd.toFixed(2)}`;
}

function chuToken(n: number): string {
  return n >= 10_000 ? `${Math.round(n / 1000)}k` : n.toLocaleString('vi-VN');
}

function gio(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Thời lượng đồng hồ: "4:07", "1:02:09". */
export function chuThoiLuong(ms: number): string {
  const g = Math.max(0, Math.floor(ms / 1000));
  const hai = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(g / 3600);
  const m = Math.floor((g % 3600) / 60);
  return h > 0 ? `${h}:${hai(m)}:${hai(g % 60)}` : `${m}:${hai(g % 60)}`;
}

/** Dòng trạng thái của buổi. Thuần, để test được. */
export function trangThaiBuoi(so: SoChiPhi): string {
  if (so.ketThuc !== null) return `Buổi đã kết thúc · ${gio(so.batDau)}–${gio(so.ketThuc)}`;
  if (so.live) return `Đang live từ ${gio(so.batDau)}`;
  return `Xem thử, chưa lên sóng · từ ${gio(so.batDau)}`;
}

export function BangChiPhi() {
  const s = useStage();
  const [mo, setMo] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // Đồng hồ buổi nhảy từng giây. Số tiền thì không cần đếm: máy chủ phát lại
    // cả sổ ngay sau mỗi lượt gọi AI (tin `chi-phi`).
    const h = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(h);
  }, []);

  const so = s.chiPhi;
  if (so === null) return null;
  const khoan = THU_TU.filter((k) => so.khoan[k] !== undefined).concat(
    Object.keys(so.khoan).filter((k) => !THU_TU.includes(k)),
  );

  return (
    <section className="bx-chi-phi" data-mo={mo} aria-label="Chi phí buổi live">
      <button type="button" className="bx-cp-dau" aria-expanded={mo} onClick={() => setMo(!mo)}>
        <span className="bx-cp-nhan">Tổng chi phí</span>
        <b className="bx-cp-tong">{chuVnd(so.tongUsd)}</b>
        <small className="bx-cp-usd">{chuUsd(so.tongUsd)}</small>
        <span className="bx-cp-mui" aria-hidden>
          {mo ? '▾' : '▴'}
        </span>
      </button>
      <div className="bx-cp-so">
        <span title={so.truyen.at(-1)}>
          📖 <b>{so.truyen.length}</b> truyện đã kể
          {so.truyen.length === 0 ? null : <small>{so.truyen.at(-1)}</small>}
        </span>
        <span>
          ⏱ <b>{chuThoiLuong((so.ketThuc ?? now) - so.batDau)}</b>
        </span>
      </div>
      <p className="bx-cp-tt" data-live={so.live && so.ketThuc === null}>
        {trangThaiBuoi(so)}
      </p>
      {so.chuaRo > 0 ? <p className="bx-cp-chua-ro">Chưa rõ giá {so.chuaRo} lượt — không cộng vào tổng</p> : null}

      {!mo ? null : (
        <>
          {so.truyen.length < 2 ? null : (
            <ol className="bx-cp-truyen">
              {so.truyen.map((t, i) => (
                <li key={`${i}-${t}`}>{t}</li>
              ))}
            </ol>
          )}
          <table className="bx-cp-bang">
            <tbody>
              {khoan.map((k) => {
                const x = so.khoan[k];
                if (x === undefined) return null;
                return (
                  <tr key={k}>
                    <th scope="row">
                      {TEN_KHOAN[k] ?? k}
                      <small>
                        {x.lan} lượt
                        {x.tokVao + x.tokRa > 0 ? ` · ${chuToken(x.tokVao)} vào / ${chuToken(x.tokRa)} ra` : ''}
                        {x.kyTu > 0 ? ` · ${chuToken(x.kyTu)} ký tự` : ''}
                        {x.chuaRo > 0 ? ` · chưa rõ giá ${x.chuaRo} lượt` : ''}
                      </small>
                    </th>
                    <td>
                      {chuVnd(x.usd)}
                      <small>{chuUsd(x.usd)}</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="bx-cp-goi">
            Số nhà cung cấp báo về sau mỗi lượt gọi. Tiền Việt theo tỷ giá ước tính{' '}
            {TY_GIA.toLocaleString('vi-VN')}đ/USD. Tắt sóng là sổ được lưu vào chi-phi.jsonl.
          </p>
        </>
      )}
    </section>
  );
}
