import { AlertTriangle, LayoutGrid, Puzzle, Radio } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SessionView } from '@live/contracts';
import type { SourceKind, SourceStatus } from '../lib/api';

export type Tab = 'designs' | 'modules';

interface Props {
  tab: Tab;
  onTab(t: Tab): void;
  soThietKe: number;
  soBat: number;
  soModule: number;
  wsSong: boolean;
  tenLive: string | null;
  phien: SessionView | null;
  nguon: SourceStatus | null;
  onNguon(k: SourceKind): void;
  browserTrigger: ReactNode;
  voiceTrigger: ReactNode;
}

/** Nguồn chọn được ở thanh trên. `webview` còn trong backend nhưng không dùng
 *  (docs/07 §1) — nên không có trong danh sách. */
const TEN_NGUON: Partial<Record<SourceKind, string>> = {
  tat: 'Tắt',
  mau: 'Mẫu',
  bridge: 'TikTok (cầu nối)',
};

export function TopBar({
  tab,
  onTab,
  soThietKe,
  soBat,
  soModule,
  wsSong,
  tenLive,
  phien,
  nguon,
  onNguon,
  browserTrigger,
  voiceTrigger,
}: Props) {
  return (
    <header className="topbar">
      <div className="topbar-in">
        <div className="brand">
          <span className="brand-mark">✦</span>
          <span>
            Live Studio
            <small>Quản lý phòng</small>
          </span>
        </div>

        <nav className="tabs" aria-label="Điều hướng">
          {browserTrigger}
          <button
            type="button"
            className="tab"
            data-chon={tab === 'designs'}
            onClick={() => onTab('designs')}
          >
            <LayoutGrid size={15} />
            Thiết kế <span className="count">{soThietKe}</span>
          </button>
          <button
            type="button"
            className="tab"
            data-chon={tab === 'modules'}
            onClick={() => onTab('modules')}
          >
            <Puzzle size={15} />
            Tính năng{' '}
            <span className="count">
              {soBat}/{soModule}
            </span>
          </button>
        </nav>

        <div className="grow" />

        {phien !== null ? (
          <div
            className="conn"
            title="👥 đang xem · 👁 tổng lượt xem cả buổi · ❤ tổng tim · 🎁 xu — số do TikTok đếm"
          >
            👥 {phien.totals.viewers}
            {phien.totals.views !== undefined && phien.totals.views > 0 ? ` · 👁 ${phien.totals.views}` : ''} · ❤{' '}
            {phien.totals.likes} · 🎁 {phien.totals.xu}
          </div>
        ) : null}

        <label className="conn nguon" title={nguon?.problem ?? 'Nguồn sự kiện của phòng'}>
          {nguon?.problem !== undefined ? (
            <AlertTriangle size={14} className="canh-bao" />
          ) : (
            <Radio size={14} className={nguon?.running === true ? 'dang-chay' : ''} />
          )}
          Nguồn
          <select
            className="input input-xs"
            aria-label="Nguồn sự kiện"
            value={nguon?.kind ?? 'tat'}
            onChange={(e) => onNguon(e.target.value as SourceKind)}
          >
            {(Object.keys(TEN_NGUON) as SourceKind[]).map((k) => (
              <option key={k} value={k}>
                {TEN_NGUON[k]}
              </option>
            ))}
            {/* Cấu hình cũ còn nhớ nguồn không còn trong danh sách: vẫn hiện
                đúng tên, không giả vờ là "Tắt". */}
            {nguon !== null && TEN_NGUON[nguon.kind] === undefined ? (
              <option value={nguon.kind} disabled>
                Trang TikTok (cũ)
              </option>
            ) : null}
          </select>
        </label>

        {voiceTrigger}

        <div className="conn">
          <span className={wsSong ? 'dot ok' : 'dot'} />
          {wsSong ? (
            tenLive === null ? (
              'Chưa phát phòng nào'
            ) : (
              <>
                Đang phát · <b>{tenLive}</b>
              </>
            )
          ) : (
            'Mất kết nối máy chủ'
          )}
        </div>
      </div>
    </header>
  );
}
