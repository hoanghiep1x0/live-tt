import { useState } from 'react';
import { BrowserDialog } from './components/BrowserDialog';
import { VoiceDialog } from './components/VoiceDialog';
import { DesignsTab } from './components/DesignsTab';
import { ModulesTab } from './components/ModulesTab';
import { TopBar } from './components/TopBar';
import type { Tab } from './components/TopBar';
import { MODULES } from './lib/registry';
import { useManager } from './lib/store';

export function App() {
  const m = useManager();
  const [tab, setTab] = useState<Tab>('designs');
  const [toastTay, setToastTay] = useState<{ text: string; loi: boolean } | null>(null);

  const toast = toastTay ?? m.toast;
  const tenLive = m.designs.find((d) => d.manifest.id === m.live)?.displayName ?? null;
  const soBat = MODULES.filter((r) => m.mods[r.ui.id]?.enabled === true).length;

  const noi = (text: string, loi = false) => {
    setToastTay({ text, loi });
    setTimeout(() => setToastTay(null), 2400);
  };

  return (
    <>
      <TopBar
        tab={tab}
        onTab={setTab}
        soThietKe={m.designs.length}
        soBat={soBat}
        soModule={MODULES.length}
        wsSong={m.wsSong}
        tenLive={tenLive}
        phien={m.phien}
        nguon={m.nguon}
        onNguon={m.doiNguon}
        browserTrigger={<BrowserDialog tenLive={tenLive} />}
        voiceTrigger={<VoiceDialog onToast={noi} />}
      />

      <main>
        {m.mat !== null ? (
          <div className="empty" style={{ marginBottom: 22 }}>
            <b>Không nối được máy chủ</b>
            {m.mat}
            <div style={{ marginTop: 14 }}>
              Mở backend rồi thử lại: <code>cd backend &amp;&amp; cargo run</code>
            </div>
            <div style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-gold" onClick={m.tai}>
                Thử lại
              </button>
            </div>
          </div>
        ) : null}

        {m.dangTai && m.designs.length === 0 && m.mat === null ? (
          <div className="empty">Đang đọc danh sách thiết kế…</div>
        ) : tab === 'designs' ? (
          <DesignsTab m={m} onToast={noi} />
        ) : (
          <ModulesTab m={m} onSangThietKe={() => setTab('designs')} />
        )}
      </main>

      {toast !== null ? (
        <div className="toast" data-loi={toast.loi} role="status">
          {toast.text}
        </div>
      ) : null}
    </>
  );
}
