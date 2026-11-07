/** Ô `kho-truyen` ở tab Truyện: bảng các truyện phòng này đã kể, mỗi hàng một
 *  truyện. Máy chủ giữ nguyên văn VÀ ảnh đã vẽ (`kho_da_ke.rs`, tối đa 50
 *  truyện), nên tuần sau kể lại là có ngay — không tốn một lượt tìm truyện hay
 *  vẽ ảnh nào. Nút "Xem" mở modal đọc kỹ từng đoạn và ảnh. */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cacMoc } from '@live/contracts';
import type { ConfigField } from '@live/contracts';
import { useDesignId } from './Stage';

interface TruyenKho {
  title: string;
  passages: string;
  loai?: string;
  nguon?: string;
  moc?: unknown;
  luc?: number;
}

const chu = (v: unknown): string => (typeof v === 'string' ? v : '');

function ngayGon(ms: number | undefined): string {
  if (ms === undefined || ms <= 0) return '—';
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Số đoạn và số ảnh đã có của một truyện. */
function dem(t: TruyenKho): { doan: number; anh: number } {
  const doan = chu(t.passages)
    .split('\n')
    .filter((d) => d.trim() !== '').length;
  const anh = cacMoc(t.moc ?? []).filter((m) => m.anh !== '').length;
  return { doan, anh };
}

export function OKhoTruyen({ field: f, disabled }: { field: ConfigField; disabled: boolean }) {
  const id = useDesignId();
  const [ds, setDs] = useState<TruyenKho[] | null>(null);
  const [xem, setXem] = useState<TruyenKho | null>(null);
  const [dangLam, setDangLam] = useState('');
  const [loi, setLoi] = useState('');
  const o = useRef<HTMLDivElement>(null);

  const tai = () =>
    void fetch(`/s/truyen-kho/${id}`)
      .then((r) => (r.ok ? (r.json() as Promise<TruyenKho[]>) : []))
      .then(setDs)
      .catch(() => setDs([]));
  useEffect(tai, [id]);

  const lenh = (duong: string, ten: string) => {
    setDangLam(ten);
    setLoi('');
    void fetch(`/s/truyen-kho/${id}/${duong}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ten }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? 'lỗi');
        setXem(null);
        tai();
      })
      .catch((e: unknown) => setLoi(e instanceof Error ? e.message : 'không gọi được máy chủ'))
      .finally(() => setDangLam(''));
  };

  const ngan = o.current?.closest('.bx-ngan') ?? null;
  const tong = ds === null ? 0 : ds.reduce((n, t) => n + dem(t).anh, 0);

  return (
    <div className="bx-ds" ref={o}>
      <span className="bx-ds-nhan">{f.label}</span>
      {ds === null ? (
        <p className="bx-goi">Đang đọc kho truyện…</p>
      ) : ds.length === 0 ? (
        <p className="bx-goi">Chưa có truyện nào trong kho. Kể xong một truyện là nó được cất vào đây kèm ảnh.</p>
      ) : (
        <>
          <table className="bx-bang-truyen">
            <tbody>
              {ds.map((t) => {
                const { doan, anh } = dem(t);
                return (
                  <tr key={t.title}>
                    <td>
                      <b>{t.title}</b>
                      <small>
                        {ngayGon(t.luc)} · {doan} đoạn{anh > 0 ? ` · ${anh} ảnh` : ''}
                        {chu(t.loai) !== '' ? ` · ${chu(t.loai)}` : ''}
                      </small>
                    </td>
                    <td>
                      <button type="button" className="bx-muc-bo" onClick={() => setXem(t)}>
                        Xem
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <small className="bx-goi">
            {ds.length}/50 truyện{tong > 0 ? ` · ${tong} ảnh để dành` : ''} — kể lại không tốn lượt AI nào. Đầy thì
            truyện cũ nhất tự rời kho.
          </small>
        </>
      )}
      {loi !== '' ? <span className="bx-media-loi">{loi}</span> : null}
      {xem !== null && ngan !== null
        ? createPortal(
            <div className="bx-tam" role="dialog" aria-modal aria-label={`Truyện ${xem.title}`}>
              <div className="bx-modal">
                <div className="bx-dau2">
                  <span className="bx-icon">📖</span>
                  <span className="bx-ten">
                    <b>{xem.title}</b>
                    <small>
                      {ngayGon(xem.luc)} · {dem(xem).doan} đoạn · {dem(xem).anh} ảnh
                      {chu(xem.loai) !== '' ? ` · ${chu(xem.loai)}` : ''}
                      {chu(xem.nguon) !== '' ? ` · ${chu(xem.nguon)}` : ''}
                    </small>
                  </span>
                  <button type="button" className="bx-x" onClick={() => setXem(null)} aria-label="Đóng">
                    ✕
                  </button>
                </div>
                <div className="bx-than bx-xem-truyen">
                  {cacMoc(xem.moc ?? [])
                    .filter((m) => m.anh !== '')
                    .map((m) => (
                      <figure key={m.tu}>
                        <img src={m.anh} alt={`Ảnh đoạn ${m.tu}`} loading="lazy" />
                        <figcaption>Đoạn {m.tu}</figcaption>
                      </figure>
                    ))}
                  {chu(xem.passages)
                    .split('\n')
                    .filter((d) => d.trim() !== '')
                    .map((d, i) => (
                      <p key={i}>
                        <b>{i + 1}.</b> {d}
                      </p>
                    ))}
                </div>
                <div className="bx-chan2">
                  <button
                    type="button"
                    className="bx-muc-bo"
                    disabled={disabled || dangLam !== ''}
                    onClick={() => lenh('xoa', xem.title)}
                  >
                    Bỏ khỏi kho
                  </button>
                  <button
                    type="button"
                    className="bx-xong"
                    disabled={disabled || dangLam !== ''}
                    onClick={() => lenh('ke-lai', xem.title)}
                  >
                    {dangLam !== '' ? 'Đang đặt…' : 'Kể lại truyện này'}
                  </button>
                </div>
              </div>
            </div>,
            ngan,
          )
        : null}
    </div>
  );
}
