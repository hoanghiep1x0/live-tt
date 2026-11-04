import { LayoutGrid, Puzzle } from 'lucide-react';
import type { ReactNode } from 'react';

export type Tab = 'designs' | 'modules';

interface Props {
  tab: Tab;
  onTab(t: Tab): void;
  soThietKe: number;
  soBat: number;
  soModule: number;
  wsSong: boolean;
  tenLive: string | null;
  browserTrigger: ReactNode;
}

export function TopBar({
  tab,
  onTab,
  soThietKe,
  soBat,
  soModule,
  wsSong,
  tenLive,
  browserTrigger,
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
