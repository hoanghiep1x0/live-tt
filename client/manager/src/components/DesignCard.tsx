import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Eye, Pencil, Puzzle, RotateCcw } from 'lucide-react';
import type { DesignInfo } from '@live/contracts';

interface Props {
  d: DesignInfo;
  /** Thiết kế đang phát, nếu có. Khác cái này thì nút phát bị khoá. */
  live: string | null;
  onBatLive(id: string): void;
  onTatLive(): void;
  onDoiTen(id: string, ten: string): void;
  onDatStudio(id: string, url: string): void;
  onReset(id: string): void;
  onToast(text: string, loi?: boolean): void;
  /** Sang tab Tính năng. Tab đó chỉ cấu hình thiết kế đang phát. */
  onSangTinhNang(): void;
}

export function DesignCard({
  d,
  live,
  onBatLive,
  onTatLive,
  onDoiTen,
  onDatStudio,
  onReset,
  onToast,
  onSangTinhNang,
}: Props) {
  const id = d.manifest.id;
  const dangPhat = live === id;
  const khoa = live !== null && !dangPhat;
  const chuaBuild = d.status === 'error';

  const [sua, setSua] = useState(false);
  const [ten, setTen] = useState(d.displayName);
  const [studio, setStudio] = useState(d.studioUrl ?? '');
  const o = useRef<HTMLInputElement>(null);

  // Tên và link có thể đổi từ cửa sổ quản lý khác; theo backend chứ không giữ
  // bản nháp cũ, trừ lúc người dùng đang gõ.
  useEffect(() => {
    if (!sua) setTen(d.displayName);
  }, [d.displayName, sua]);
  useEffect(() => setStudio(d.studioUrl ?? ''), [d.studioUrl]);
  useEffect(() => {
    if (sua) o.current?.select();
  }, [sua]);

  const luuTen = () => {
    const moi = ten.trim();
    setSua(false);
    if (moi === '' || moi === d.displayName) {
      setTen(d.displayName);
      return;
    }
    onDoiTen(id, moi);
  };

  const chep = () => {
    void navigator.clipboard
      ?.writeText(d.obsUrl)
      .then(() => onToast('Đã chép link OBS'))
      .catch(() => onToast('Trình duyệt không cho chép, hãy chọn và copy tay', true));
  };

  return (
    <article className="card design" data-phat={dangPhat}>
      <div className="design-name">
        <span className="art">{d.manifest.icon}</span>
        {sua ? (
          <input
            ref={o}
            className="input name-edit"
            value={ten}
            aria-label={`Tên thiết kế ${d.displayName}`}
            onChange={(e) => setTen(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') luuTen();
              if (e.key === 'Escape') {
                setTen(d.displayName);
                setSua(false);
              }
            }}
          />
        ) : (
          <b title={d.displayName}>{d.displayName}</b>
        )}
        <button
          type="button"
          className="badge live-btn"
          data-phat={dangPhat}
          disabled={khoa || (chuaBuild && !dangPhat)}
          title={
            khoa
              ? `Hãy tắt "${live}" trước khi phát phòng khác`
              : chuaBuild
                ? 'Thiết kế chưa build, chưa phát được'
                : dangPhat
                  ? 'Bấm để dừng phát'
                  : 'Bấm để bắt đầu phát'
          }
          onClick={() => (dangPhat ? onTatLive() : onBatLive(id))}
        >
          <span className="dot" />
          {dangPhat ? 'Đang phát' : 'Tắt Live'}
        </button>
      </div>

      <div className="field">
        <input className="input" readOnly value={d.obsUrl} aria-label={`Link OBS ${d.displayName}`} />
        <button
          type="button"
          className="btn btn-sm"
          onClick={chep}
          title="Chép link để dán vào Browser Source của OBS"
        >
          Kết nối OBS
        </button>
      </div>

      <div className="field">
        <input
          className="input"
          value={studio}
          placeholder="https://livestudio.tiktok.com/…"
          aria-label={`Link TikTok Studio ${d.displayName}`}
          onChange={(e) => setStudio(e.target.value)}
          onBlur={() => {
            if (studio !== (d.studioUrl ?? '')) onDatStudio(id, studio);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onDatStudio(id, studio);
          }}
        />
        <a
          className="btn btn-sm"
          href={studio === '' ? undefined : studio}
          target="_blank"
          rel="noopener"
          aria-disabled={studio === ''}
          title={studio === '' ? 'Dán link phòng trên TikTok LIVE Studio vào ô bên' : 'Mở TikTok LIVE Studio'}
          onClick={(e) => {
            if (studio === '') {
              e.preventDefault();
              onToast('Chưa có link Studio cho phòng này', true);
            }
          }}
        >
          Kết nối Studio
        </a>
      </div>

      {d.problem !== undefined ? (
        <div className="problem" title={d.problem}>
          <AlertTriangle size={14} />
          <span>{d.problem}</span>
        </div>
      ) : null}

      <div className="card-actions">
        <a
          className="btn"
          href={chuaBuild ? undefined : d.obsUrl}
          target="_blank"
          rel="noopener"
          aria-disabled={chuaBuild}
          title={chuaBuild ? 'Thiết kế chưa build, chưa xem được' : `Mở sân khấu ${d.displayName} ở tab mới`}
          onClick={(e) => {
            if (chuaBuild) {
              e.preventDefault();
              onToast('Thiết kế chưa build, chưa xem được', true);
            }
          }}
        >
          <Eye size={15} />
          Xem mẫu
        </a>
        <button
          type="button"
          className="btn"
          // Cấu hình tính năng luôn áp cho phòng đang phát; mở từ thẻ khác là
          // chỉnh nhầm phòng, nên chỉ thẻ đang phát mới bấm được.
          disabled={!dangPhat}
          title={
            dangPhat
              ? `Cấu hình tính năng của ${d.displayName}`
              : 'Bật Live phòng này để cấu hình tính năng'
          }
          onClick={onSangTinhNang}
        >
          <Puzzle size={15} />
          Tính năng
        </button>
        <button
          type="button"
          className="btn"
          title={`Xoá dữ liệu phiên của ${d.displayName}`}
          onClick={() => {
            if (
              window.confirm(
                `Xoá dữ liệu phiên của "${d.displayName}"?\n` +
                  'Bình luận, bảng xếp hạng của phiên sẽ mất. Sổ quà và cấu hình tính năng vẫn còn.',
              )
            ) {
              onReset(id);
            }
          }}
        >
          <RotateCcw size={15} />
          Reset dữ liệu
        </button>
        <button
          type="button"
          className={sua ? 'btn saving' : 'btn'}
          title={`Đổi tên ${d.displayName}`}
          onClick={() => (sua ? luuTen() : setSua(true))}
        >
          <Pencil size={15} />
          <span>{sua ? 'Lưu' : 'Sửa'}</span>
        </button>
      </div>
    </article>
  );
}
