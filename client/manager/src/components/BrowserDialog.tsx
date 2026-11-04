import { useState } from 'react';
import { ChevronLeft, ChevronRight, Globe, Plug, RotateCw } from 'lucide-react';
import { Dialog, DialogBody, DialogTrigger } from './ui/dialog';

interface Trang {
  nhom: string;
  fav: string;
  ten: string;
  mo_ta: string;
  url: string;
  daDangNhap: boolean;
}

/** Những trang phòng live cần tới. Chỉ TikTok — webview trong bản đóng gói giữ
 *  cookie đăng nhập, nên whitelist này cũng là ranh giới an toàn. */
const TRANG: readonly Trang[] = [
  {
    nhom: 'Tài khoản',
    fav: '♪',
    ten: 'TikTok',
    mo_ta: 'đăng nhập tài khoản phát live',
    url: 'https://www.tiktok.com/login',
    daDangNhap: false,
  },
  {
    nhom: 'Tài khoản',
    fav: '▶',
    ten: 'LIVE Studio',
    mo_ta: 'mở phiên phát trên TikTok LIVE Studio',
    url: 'https://livestudio.tiktok.com',
    daDangNhap: false,
  },
  {
    nhom: 'Trang lấy dữ liệu',
    fav: '●',
    ten: 'Phòng live của tôi',
    mo_ta: 'bình luận, quà, lượt xem',
    url: 'https://www.tiktok.com/live',
    daDangNhap: false,
  },
  {
    nhom: 'Trang lấy dữ liệu',
    fav: '◆',
    ten: 'Bảng điều khiển live',
    mo_ta: 'thống kê phiên',
    url: 'https://www.tiktok.com/live/dashboard',
    daDangNhap: false,
  },
];

const NHOM = [...new Set(TRANG.map((t) => t.nhom))];

interface Props {
  tenLive: string | null;
}

export function BrowserDialog({ tenLive }: Props) {
  const [chon, setChon] = useState(0);
  const trang = TRANG[chon] ?? TRANG[0]!;
  const [url, setUrl] = useState(trang.url);

  return (
    <Dialog>
      <DialogTrigger className="tab">
        <Globe size={15} />
        Trình duyệt
      </DialogTrigger>
      <DialogBody
        size="lg"
        icon={<Globe size={15} />}
        title="Trình duyệt"
        desc="Đăng nhập một lần, phiên được giữ lại. Thiết kế lấy dữ liệu từ trang đang kết nối."
      >
        <div className="browser">
          <aside className="browser-side">
            {NHOM.map((n) => (
              <div key={n}>
                {TRANG.map((t, i) =>
                  t.nhom !== n ? null : (
                    <button
                      type="button"
                      className="site"
                      key={t.ten}
                      title={t.mo_ta}
                      data-chon={chon === i}
                      onClick={() => {
                        setChon(i);
                        setUrl(t.url);
                      }}
                    >
                      <span className="fav">{t.fav}</span>
                      <span>{t.ten}</span>
                      <span className={t.daDangNhap ? 'dot ok' : 'dot'} />
                    </button>
                  ),
                )}
              </div>
            ))}
          </aside>

          <div className="browser-main">
            <div className="urlbar">
              <button type="button" className="btn btn-icon" aria-label="Lùi" disabled>
                <ChevronLeft size={15} />
              </button>
              <button type="button" className="btn btn-icon" aria-label="Tiến" disabled>
                <ChevronRight size={15} />
              </button>
              <button type="button" className="btn btn-icon" aria-label="Tải lại" disabled>
                <RotateCw size={15} />
              </button>
              <input
                className="input"
                value={url}
                aria-label="Địa chỉ"
                onChange={(e) => setUrl(e.target.value)}
              />
              <a className="btn btn-gold" href={url} target="_blank" rel="noopener">
                Mở
              </a>
            </div>

            <div className="viewport">
              <div>
                <div className="globe">🌐</div>
                <b>Chưa có webview</b>
                Vỏ Tauri chưa dựng, nên trang chưa hiện được ở đây. Nút “Mở” mở bằng trình duyệt
                ngoài — phiên đăng nhập sẽ không dùng lại được cho phòng live.
              </div>
            </div>

            <div className="linkrow">
              <span className="lbl">
                <Plug size={14} />
                Dữ liệu trang này đưa vào thiết kế đang phát:
              </span>
              <b className="live-target">{tenLive ?? 'chưa phát phòng nào'}</b>
            </div>
          </div>
        </div>
      </DialogBody>
    </Dialog>
  );
}
