import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Plus, RotateCw, X } from 'lucide-react';
import { docOThemTab, laApp, nhanTab, tabWeb, TRANG_CO_SAN } from '../lib/desktop';
import type { TabWeb } from '../lib/desktop';
import { ngheMoTrang } from '../lib/mo-trang';
import type { YeuCauMoTrang } from '../lib/mo-trang';
import { Dialog, DialogBody, DialogTrigger } from './ui/dialog';

interface Props {
  tenLive: string | null;
}

const DANG_NHAP_TIKTOK = TRANG_CO_SAN.find((t) => t.id === 'tiktok')!;
const DANG_NHAP_MUSE = TRANG_CO_SAN.find((t) => t.id === 'muse')!;

/** Nhãn tab: tab trang live của kênh thì "@nick", còn lại theo `nhanTab`. */
function nhan(t: TabWeb): string {
  if (t.id.startsWith('kenh-')) {
    const m = /tiktok\.com\/@([^/?#]+)/.exec(t.url);
    if (m?.[1] !== undefined) return `@${m[1]}`;
  }
  return nhanTab(t);
}

/** Trình duyệt trong app desktop — theo đúng hộp "Trang TikTok" của bản cũ
 *  (D:\Live\client\src\components\TikTokPanel.tsx): nút đăng nhập trên cùng,
 *  hàng tab đang mở (✕ từng tab, "＋ Thêm tab"), thanh địa chỉ, khung trang.
 *
 *  Mỗi tab là một khung web do vỏ app tạo (`desktop/src/trinh_duyet.rs`), đặt
 *  chồng khít vào khung `.tt-viewport`; đổi cỡ thì tự đặt lại. Đóng hộp thì
 *  mọi trang dời ra ngoài màn hình nhưng VẪN CHẠY — đăng nhập giữ nguyên. */
function TrinhDuyetApp({ thuGon, yeuCau }: { thuGon(): void; yeuCau: YeuCauMoTrang | null }) {
  const [tabs, setTabs] = useState<TabWeb[]>([]);
  const [dang, setDang] = useState('');
  const [loi, setLoi] = useState<string | null>(null);
  const khung = useRef<HTMLDivElement>(null);

  // Danh sách tab: hỏi vỏ mỗi 2 giây (tiêu đề, địa chỉ thật đang xem).
  useEffect(() => {
    let song = true;
    const tai = () =>
      tabWeb.ds().then(
        (ds) => {
          if (!song) return;
          setTabs(ds);
          setDang((d) => (d !== '' && ds.some((t) => t.id === d) ? d : (ds[0]?.id ?? '')));
        },
        () => undefined,
      );
    void tai();
    const h = window.setInterval(tai, 2_000);
    return () => {
      song = false;
      window.clearInterval(h);
    };
  }, []);

  // Đặt trang của tab đang chọn đúng vào khung; gỡ hộp thì dời mọi trang ra ngoài.
  useLayoutEffect(() => {
    const el = khung.current;
    if (el === null || dang === '') {
      void tabWeb.an().catch(() => undefined);
      return;
    }
    const dat = () => {
      const r = el.getBoundingClientRect();
      void tabWeb
        .hien(dang, { x: r.left, y: r.top, width: r.width, height: r.height })
        .catch((e: unknown) => setLoi(String(e)));
    };
    dat();
    const ro = new ResizeObserver(dat);
    ro.observe(el);
    window.addEventListener('resize', dat);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', dat);
    };
  }, [dang, tabs.length]);
  useEffect(() => () => void tabWeb.an().catch(() => undefined), []);

  // Ô địa chỉ: theo trang đang xem, trừ lúc đang gõ.
  const [diaChi, setDiaChi] = useState('');
  const [go, setGo] = useState(false);
  const urlDang = tabs.find((t) => t.id === dang)?.url ?? '';
  useEffect(() => {
    if (!go) setDiaChi(urlDang);
  }, [urlDang, go]);

  const lam = (p: Promise<unknown>) => {
    setLoi(null);
    void p.catch((e: unknown) => setLoi(String(e)));
  };

  const mo = (id: string, url: string) =>
    lam(
      tabWeb.mo(id, url).then(async () => {
        setDang(id);
        setTabs(await tabWeb.ds());
      }),
    );

  // Thẻ thiết kế bấm "Kết nối Studio": mở đúng trang đó và chọn luôn tab, để
  // người vận hành thấy ngay trang live chứ không phải tự đi tìm tab.
  useEffect(() => {
    if (yeuCau === null) return;
    mo(yeuCau.id, yeuCau.url);
    // `mo` dựng lại mỗi lượt vẽ; chỉ chạy khi có yêu cầu MỚI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yeuCau]);

  const [them, setThem] = useState(false);
  const [oThem, setOThem] = useState('');
  const themTab = () => {
    const p = docOThemTab(oThem, Date.now());
    if (p === null) {
      setLoi('Nhập nick kênh (vd: @abc123) hoặc địa chỉ trang web (vd: google.com).');
      return;
    }
    setThem(false);
    setOThem('');
    mo(p.id, p.url);
  };

  const dongTab = (id: string) =>
    lam(
      tabWeb.dong(id).then(() => {
        setTabs((ds) => ds.filter((t) => t.id !== id));
        setDang((d) => (d === id ? '' : d));
      }),
    );

  return (
    <div className="tt">
      <div className="tt-nut">
        <button type="button" className="btn" onClick={() => mo(DANG_NHAP_TIKTOK.id, DANG_NHAP_TIKTOK.url)}>
          Đăng nhập TikTok
        </button>
        <button type="button" className="btn" onClick={() => mo(DANG_NHAP_MUSE.id, DANG_NHAP_MUSE.url)}>
          Đăng nhập muse.ai
        </button>
        <button
          type="button"
          className="btn btn-ghost tt-thu-gon"
          title="Ẩn tạm — các trang vẫn chạy nền, bấm nút nổi góc dưới để mở lại"
          onClick={thuGon}
        >
          — Thu gọn
        </button>
      </div>

      <div className="tt-tabs" role="tablist" aria-label="Trang đang mở">
        {tabs.map((t) => (
          <span key={t.id} className="tt-tab" data-chon={t.id === dang}>
            <button type="button" role="tab" aria-selected={t.id === dang} onClick={() => setDang(t.id)}>
              {nhan(t)}
            </button>
            <button
              type="button"
              className="tt-tab-x"
              aria-label={`Đóng trang ${nhan(t)}`}
              title="Đóng trang (vẫn giữ đăng nhập)"
              onClick={() => dongTab(t.id)}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {them ? (
          <form
            className="tt-tab-moi"
            onSubmit={(e) => {
              e.preventDefault();
              themTab();
            }}
          >
            <input
              className="input"
              autoFocus
              aria-label="Nick kênh hoặc link"
              placeholder="Nick kênh (@abc123) hoặc link trang web bất kỳ"
              value={oThem}
              onChange={(e) => setOThem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setThem(false);
                }
              }}
            />
            <button type="submit" className="btn btn-gold">
              Mở
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setThem(false)}>
              Huỷ
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="btn btn-ghost"
            title="Mở thêm trang: nick kênh hoặc link trang web bất kỳ"
            onClick={() => setThem(true)}
          >
            <Plus size={14} />
            Thêm tab
          </button>
        )}
        {tabs.length === 0 ? (
          <span className="tt-trong">Chưa có trang nào. Bấm “Đăng nhập TikTok” hoặc “＋ Thêm tab”.</span>
        ) : null}
      </div>

      {dang === '' ? null : (
        <form
          className="tt-dia-chi"
          onSubmit={(e) => {
            e.preventDefault();
            setGo(false);
            lam(tabWeb.di(dang, diaChi));
          }}
        >
          <button
            type="button"
            className="btn btn-icon"
            title="Lùi lại"
            aria-label="Lùi lại"
            onClick={() => lam(tabWeb.lichSu(dang, 'lui'))}
          >
            ←
          </button>
          <button
            type="button"
            className="btn btn-icon"
            title="Tải lại trang này"
            aria-label="Tải lại trang này"
            onClick={() => lam(tabWeb.lichSu(dang, 'tai-lai'))}
          >
            <RotateCw size={14} />
          </button>
          <input
            className="input"
            value={diaChi}
            spellCheck={false}
            aria-label="Địa chỉ trang"
            onChange={(e) => {
              setDiaChi(e.target.value);
              setGo(true);
            }}
            onFocus={(e) => {
              setGo(true);
              e.target.select();
            }}
            onBlur={() => setGo(false)}
          />
          <button type="submit" className="btn">
            Đi
          </button>
        </form>
      )}

      {loi === null ? null : (
        <p className="notice notice-warn" role="alert">
          {loi}
        </p>
      )}

      <div ref={khung} className="tt-viewport" aria-label="Khung trang web">
        {dang === '' ? <p className="tt-trong">Trang sẽ hiện ở đây.</p> : null}
      </div>
      <p className="tt-ghi">
        Đăng nhập một lần là app giữ luôn. Đóng hộp này, trang vẫn chạy nền để app tiếp tục làm việc
        với nó.
      </p>
    </div>
  );
}

/** Mở trang quản lý bằng trình duyệt thường: không có vỏ app nên không mở được
 *  trang web ở đây — như bản cũ (nút "Trang TikTok" chỉ có ở bản desktop). */
function TrinhDuyetNgoai() {
  return (
    <div className="tt">
      <div className="tt-viewport tt-ngoai">
        <div>
          <div className="globe">🌐</div>
          <b>Chỉ có trong app desktop</b>
          <p>
            Trang quản lý đang mở bằng trình duyệt thường nên không mở được trang web ở đây. Chạy app
            desktop (<code>npm run app</code>) để đăng nhập TikTok, muse.ai một lần và giữ luôn.
          </p>
          <p>
            Dữ liệu live khi chạy bằng trình duyệt thường lấy qua cầu nối: chọn <b>Nguồn → Cầu nối</b> ở
            góc trên.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Nút nổi góc dưới phải khi hộp đang thu gọn — như bản cũ: trình duyệt luôn
 *  sẵn sàng, các trang chạy nền, bấm một cái là hiện lại. Chỉ có trong app. */
function NutNoi({ mo }: { mo(): void }) {
  const [tabs, setTabs] = useState<TabWeb[]>([]);
  useEffect(() => {
    let song = true;
    const tai = () => tabWeb.ds().then((ds) => song && setTabs(ds), () => undefined);
    void tai();
    const h = window.setInterval(tai, 3_000);
    return () => {
      song = false;
      window.clearInterval(h);
    };
  }, []);
  const coMuse = tabs.some((t) => t.id === 'muse');
  return (
    <button type="button" className="btn tt-noi" onClick={mo} title="Mở lại trình duyệt">
      <Globe size={15} />
      Trình duyệt · {tabs.length} trang chạy nền
      <span className="tt-noi-muse" data-san={coMuse} title={coMuse ? 'muse.ai sẵn sàng vẽ ảnh' : 'muse.ai chưa mở'}>
        muse.ai
      </span>
    </button>
  );
}

export function BrowserDialog({ tenLive: _tenLive }: Props) {
  const [mo, setMo] = useState(false);
  const [yeuCau, setYeuCau] = useState<YeuCauMoTrang | null>(null);
  const app = laApp();

  // Chỗ khác trong trang nhờ mở một địa chỉ (thẻ thiết kế → "Kết nối Studio").
  // Vật thể mới mỗi lần nhờ, để hộp biết đây là yêu cầu mới chứ không phải
  // lượt vẽ lại.
  useEffect(
    () =>
      ngheMoTrang((yc) => {
        setYeuCau({ ...yc });
        setMo(true);
      }),
    [],
  );

  return (
    <>
      <Dialog open={mo} onOpenChange={setMo}>
        <DialogTrigger className="tab">
          <Globe size={15} />
          Trình duyệt
        </DialogTrigger>
        <DialogBody
          size="lg"
          icon={<Globe size={15} />}
          title="Trình duyệt"
          desc="Đăng nhập một lần, phiên được giữ lại. Thu gọn hay đóng hộp này thì trang vẫn chạy nền."
        >
          {app ? <TrinhDuyetApp thuGon={() => setMo(false)} yeuCau={yeuCau} /> : <TrinhDuyetNgoai />}
        </DialogBody>
      </Dialog>
      {/* Cổng ra body: thanh đầu trang có backdrop-filter, giữ `position: fixed`
          trong nó thì nút dính lên đầu trang chứ không nổi ở góc dưới. */}
      {app && !mo ? createPortal(<NutNoi mo={() => setMo(true)} />, document.body) : null}
    </>
  );
}
