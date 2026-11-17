import { useEffect, useRef, useState } from 'react';
import { guiLenh, useAsset, useDesignId, useStage } from '@live/stage-sdk';
import { khoaKeTiep, tenCamNv, type CamNv } from './cam-tay';
import { buocToast, type ToastNoi, type TrangThaiNoi } from './toast-ket-noi';

/** `/d/<phòng>/?thu=1`: bản chơi thử dùng chung bảng ⚙ với bản live, game chạy nhân vật giả
 *  và không nhận dữ liệu thật. */
export const THU = new URLSearchParams(location.search).has('thu');

const SO_SAN = '/s/so/dai-chien-thap-den/san';
const SO_NHAC = '/s/so/dai-chien-thap-den/nhac';
const TOI_DA_BUOC = 12;

interface San {
  gio: string;
  gioDen?: number;
  phutGio: number;
  truyenBat: boolean;
  truyenGiay: number;
  truyenChu: string | null;
  truyenLenh?: { id: number; hien: boolean };
  lenhReset?: { id: number; kieu: 'tran' | 'all' };
}
interface Nhac {
  bat: boolean;
  vol: number;
}

const kep = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const nhanGio = (d: Date) =>
  `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`;
const docSo = (u: string): Promise<Record<string, unknown>> =>
  fetch(u)
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, unknown>>) : {}))
    .catch(() => ({}));
const ghiSo = (u: string, d: unknown) =>
  void fetch(u, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(d),
  }).catch(() => undefined);
const tachDong = (chu: string) =>
  chu
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

function guiGame(v: Record<string, unknown>) {
  document
    .querySelector<HTMLIFrameElement>('iframe.dai-chien-game')
    ?.contentWindow?.postMessage({ ngo: 'dai-chien', ...v }, location.origin);
}

function HopCotTruyen({
  chu,
  giay,
  macDinh,
  dong,
  luu,
}: {
  chu: string;
  giay: number;
  macDinh: string;
  dong: () => void;
  luu: (chu: string, giay: number) => void;
}) {
  const nap = (c: string) => {
    const d = tachDong(c);
    return { ten: d[0] ?? '', ds: d.slice(1) };
  };
  const [nhap, setNhap] = useState(() => nap(chu));
  const [so, setSo] = useState(giay);
  const [loi, setLoi] = useState('');

  const gon = () => ({
    ten: nhap.ten.trim(),
    ds: nhap.ds.map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean),
    giay: kep(Math.round(so) || 60, 10, 180),
  });
  const hopLe = () => {
    const k = gon();
    if (k.ten === '' || k.ds.length === 0) {
      setLoi('Cần có tiêu đề và ít nhất một bước');
      return null;
    }
    setLoi('');
    return { chu: [k.ten, ...k.ds].join('\n'), giay: k.giay };
  };
  const doi = (i: number, v: string) => setNhap({ ...nhap, ds: nhap.ds.map((x, k) => (k === i ? v : x)) });

  return (
    <div className="bx-tam" role="dialog" aria-modal aria-label="Sửa cốt truyện">
      <div className="bx-modal">
        <div className="bx-dau2">
          <span className="bx-icon">📖</span>
          <span className="bx-ten">
            <b>Sửa cốt truyện</b>
            <small>
              {nhap.ds.length} bước, mỗi bước khoảng {Math.round(so / Math.max(1, nhap.ds.length))} giây
            </small>
          </span>
          <button type="button" className="bx-x" onClick={dong} aria-label="Đóng">
            ✕
          </button>
        </div>
        <div className="bx-than">
          <label>
            Tiêu đề
            <input
              className="bx-o"
              maxLength={60}
              value={nhap.ten}
              onChange={(e) => setNhap({ ...nhap, ten: e.target.value })}
            />
          </label>
          {nhap.ds.map((v, i) => (
            <div key={i} className="sd-buoc">
              <b>{i + 1}</b>
              <textarea
                className="bx-o"
                rows={3}
                maxLength={220}
                aria-label={`Nội dung bước ${i + 1}`}
                value={v}
                onChange={(e) => doi(i, e.target.value)}
              />
              <button
                type="button"
                className="bx-kho-sua"
                aria-label={`Xoá bước ${i + 1}`}
                onClick={() => setNhap({ ...nhap, ds: nhap.ds.filter((_, k) => k !== i) })}
              >
                ✕
              </button>
            </div>
          ))}
          <div>
            <button
              type="button"
              className="bx-kho-sua"
              disabled={nhap.ds.length >= TOI_DA_BUOC}
              onClick={() => setNhap({ ...nhap, ds: [...nhap.ds, ''] })}
            >
              + Thêm bước
            </button>
          </div>
          <label>
            Thời gian đọc (giây)
            <input
              className="bx-o"
              type="number"
              min={10}
              max={180}
              step={5}
              value={so}
              onChange={(e) => setSo(Number(e.target.value))}
            />
          </label>
          {loi === '' ? null : <small role="alert">{loi}</small>}
        </div>
        <div className="bx-chan2 sd-chan">
          {THU ? (
            <button
              type="button"
              className="bx-kho-sua"
              onClick={() => {
                const k = hopLe();
                if (k !== null) guiGame({ t: 'thu', v: { k: 'truyen', chu: k.chu, giay: k.giay } });
              }}
            >
              Xem thử
            </button>
          ) : null}
          <button
            type="button"
            className="bx-kho-sua"
            onClick={() => {
              setNhap(nap(macDinh));
              setSo(60);
            }}
          >
            Về mặc định
          </button>
          <button
            type="button"
            className="bx-xong"
            onClick={() => {
              const k = hopLe();
              if (k !== null) luu(k.chu, k.giay);
            }}
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

const LUA_SAN = [
  ['tu-dong', 'Tự động theo giờ'],
  ['0', 'Sơ Cấp'],
  ['1', 'Trung Cấp'],
  ['2', 'Cao Cấp'],
  ['3', 'Hoàng Kim'],
] as const;
const LUA_GIAY = [
  ['240', '4 phút'],
  ['600', '10 phút'],
  ['1800', '30 phút'],
  ['3600', '1 giờ'],
  ['7200', '2 giờ'],
  ['10800', '3 giờ'],
  ['18000', '5 giờ'],
  ['tu-nhap', 'Tự nhập'],
] as const;

/** Sàn và thời lượng. Tắt "áp dụng ngay" thì đổi xong phải bấm Áp dụng: đổi thời lượng
 *  là mở lại phiên, không để lỡ tay giữa buổi live. */
function ThePhienDau({ san, luuSan }: { san: San; luuSan: (moi: San) => void }) {
  const s = useStage();
  const roi = !s.noiDuoc;
  const ngay = s.design['apDungNgay'] === true;
  const daLuu = {
    san: String(s.design['sanDau'] ?? 'tu-dong'),
    giay: String(s.design['giayPhien'] ?? '600'),
    phut: Number(s.design['phutTuy']) || 20,
    gioKieu: (san.gioDen ?? 0) > Date.now() ? 'tay' : 'lich',
  };
  const khoa = `${daLuu.san}|${daLuu.giay}|${daLuu.phut}|${daLuu.gioKieu}`;
  const [nhap, setNhap] = useState(daLuu);
  useEffect(() => setNhap(daLuu), [khoa]);

  const gui = (patch: Record<string, string | number | boolean>) =>
    guiLenh({
      t: 'command',
      command: { op: 'set-design-config', patch },
      by: 'nguoi',
      reason: 'sửa phiên đấu từ bảng xem thử',
    });
  const apDung = (n: typeof nhap) => {
    const phut = kep(Math.round(n.phut) || 20, 1, 720);
    gui({ sanDau: n.san, giayPhien: n.giay, phutTuy: phut });
    if (n.gioKieu === 'tay') {
      const f = n.giay === 'tu-nhap' ? phut : Number(n.giay) / 60;
      const a = new Date();
      const den = a.getTime() + f * 60000;
      luuSan({ ...san, phutGio: f, gioDen: den, gio: `${nhanGio(a)} đến ${nhanGio(new Date(den))}` });
    } else if ((san.gioDen ?? 0) > 0) {
      luuSan({ ...san, gioDen: 0 });
    }
  };
  const doi = (m: Partial<typeof nhap>) => {
    const n = { ...nhap, ...m };
    setNhap(n);
    if (ngay) apDung(n);
  };
  const chuaAp = `${nhap.san}|${nhap.giay}|${nhap.phut}|${nhap.gioKieu}` !== khoa;

  return (
    <article className="bx-the bx-the-thietke" data-bat="true">
      <div className="bx-the-dau">
        <span className="bx-icon">⏱️</span>
        <span className="bx-ten">
          <b>Phiên đấu</b>
          <small>{ngay ? 'Đổi là áp dụng ngay' : chuaAp ? 'Có thay đổi chưa áp dụng' : 'Đổi xong bấm Áp dụng'}</small>
        </span>
        <input
          type="checkbox"
          className="bx-cong"
          aria-label="Áp dụng ngay khi đổi"
          title="Áp dụng ngay khi đổi"
          checked={ngay}
          disabled={roi}
          onChange={(e) => gui({ apDungNgay: e.target.checked })}
        />
      </div>
      <div className="bx-the-nhanh">
        <span className="bx-q bx-q-select">
          <span className="bx-q-nhan">Sàn đấu</span>
          <select
            className="bx-o bx-o-nho"
            aria-label="Sàn đấu"
            value={nhap.san}
            disabled={roi}
            onChange={(e) => doi({ san: e.target.value })}
          >
            {LUA_SAN.map(([v, ten]) => (
              <option key={v} value={v}>
                {ten}
              </option>
            ))}
          </select>
        </span>
        <span className="bx-q bx-q-select">
          <span className="bx-q-nhan">Thời lượng</span>
          <select
            className="bx-o bx-o-nho"
            aria-label="Thời lượng phiên"
            value={nhap.giay}
            disabled={roi}
            onChange={(e) => doi({ giay: e.target.value })}
          >
            {LUA_GIAY.map(([v, ten]) => (
              <option key={v} value={v}>
                {ten}
              </option>
            ))}
          </select>
        </span>
        {nhap.giay === 'tu-nhap' ? (
          <span className="bx-q bx-q-number">
            <span className="bx-q-nhan">Số phút</span>
            <input
              className="bx-o bx-o-nho"
              type="number"
              min={1}
              max={720}
              aria-label="Số phút tự nhập"
              value={nhap.phut}
              disabled={roi}
              onChange={(e) => doi({ phut: Number(e.target.value) })}
            />
          </span>
        ) : null}
        <span className="bx-q bx-q-select">
          <span className="bx-q-nhan">Dòng giờ</span>
          <select
            className="bx-o bx-o-nho"
            aria-label="Dòng giờ trên màn hình"
            value={nhap.gioKieu}
            disabled={roi}
            onChange={(e) => doi({ gioKieu: e.target.value })}
          >
            <option value="lich">Theo lịch sàn</option>
            <option value="tay">Từ bây giờ + thời lượng</option>
          </select>
        </span>
        {ngay ? null : (
          <button type="button" className="bx-kho-sua" disabled={roi || !chuaAp} onClick={() => apDung(nhap)}>
            Áp dụng
          </button>
        )}
      </div>
      {daLuu.gioKieu === 'tay' ? <small className="sd-ghi">Đang hiện: {san.gio}</small> : null}
    </article>
  );
}

/** Nút phải bấm hai lần: lần đầu chỉ hỏi lại, 4 giây không bấm tiếp thì thôi. */
function NutHaiLan({
  chu,
  nguy,
  disabled,
  lam,
}: {
  chu: string;
  nguy?: boolean;
  disabled: boolean;
  lam: () => void;
}) {
  const [hoi, setHoi] = useState(false);
  const [xong, setXong] = useState(false);
  useEffect(() => {
    if (!hoi) return;
    const t = setTimeout(() => setHoi(false), 4000);
    return () => clearTimeout(t);
  }, [hoi]);
  useEffect(() => {
    if (!xong) return;
    const t = setTimeout(() => setXong(false), 3500);
    return () => clearTimeout(t);
  }, [xong]);
  return (
    <button
      type="button"
      className={`bx-kho-sua${nguy === true ? ' sd-nguy' : ''}`}
      disabled={disabled || xong}
      onClick={() => {
        if (!hoi) {
          setHoi(true);
          return;
        }
        setHoi(false);
        setXong(true);
        lam();
      }}
    >
      {xong ? '✓ Đã gửi lệnh' : hoi ? 'Bấm lần nữa để xác nhận' : chu}
    </button>
  );
}

/** Chọn tay nhân vật cho camera. Giữ tới khi bấm Tự động hoặc người đó rời sân. */
function TheCamera() {
  const s = useStage();
  const [tin, setTin] = useState<{ ds: readonly CamNv[]; dang: string }>({ ds: [], dang: '' });
  useEffect(() => {
    const nhan = (ev: MessageEvent<{ ngo?: string; t?: string; ds?: CamNv[]; dang?: string }>) => {
      const khung = document.querySelector<HTMLIFrameElement>('iframe.dai-chien-game');
      if (ev.source !== khung?.contentWindow || ev.origin !== location.origin) return;
      if (ev.data?.ngo === 'dai-chien' && ev.data.t === 'cam-ds') setTin({ ds: ev.data.ds ?? [], dang: ev.data.dang ?? '' });
    };
    window.addEventListener('message', nhan);
    return () => window.removeEventListener('message', nhan);
  }, []);

  const phien = s.session.startedAt;
  const muon = THU ? tin.dang : s.design['camTayPhien'] === phien ? String(s.design['camTay'] ?? '') : '';
  const chon = (khoa: string) => {
    if (THU) {
      guiGame({ t: 'cam-tay', khoa });
      return;
    }
    guiLenh({
      t: 'command',
      command: { op: 'set-design-config', patch: { camTay: khoa, camTayPhien: phien ?? 0 } },
      by: 'nguoi',
      reason: 'chuyển camera bấm tay',
    });
  };
  const buoc = (b: 1 | -1) => {
    const k = khoaKeTiep(tin.ds, muon, b);
    if (k !== null) chon(k);
  };
  const dang = tin.ds.find((x) => x.khoa === tin.dang);
  const khoa = (!THU && !s.noiDuoc) || tin.ds.length === 0;

  return (
    <article className="bx-the bx-the-thietke" data-bat="true">
      <div className="bx-the-dau">
        <span className="bx-icon">🎥</span>
        <span className="bx-ten">
          <b>Camera</b>
          <small>
            {dang !== undefined
              ? `Đang giữ trên ${dang.ten}`
              : muon !== ''
                ? 'Nhân vật đã chọn không còn trên sân, camera đang tự động'
                : 'Tự động theo diễn biến trận'}
          </small>
        </span>
      </div>
      <div className="bx-the-nhanh">
        <button type="button" className="bx-kho-sua" disabled={khoa} onClick={() => buoc(-1)}>
          ◀ Trước
        </button>
        <button type="button" className="bx-kho-sua" disabled={khoa} onClick={() => buoc(1)}>
          Sau ▶
        </button>
        <button type="button" className="bx-kho-sua" disabled={muon === ''} onClick={() => chon('')}>
          Tự động
        </button>
      </div>
      <div className="bx-the-nhanh">
        <span className="bx-q bx-q-select">
          <span className="bx-q-nhan">Xem nhân vật</span>
          <select
            className="bx-o bx-o-nho"
            aria-label="Chọn nhân vật cho camera"
            style={{ minWidth: 190 }}
            value={tin.dang}
            disabled={khoa}
            onChange={(e) => chon(e.target.value)}
          >
            <option value="">Tự động</option>
            {tin.ds.map((x) => (
              <option key={x.khoa} value={x.khoa}>
                {tenCamNv(x)}
              </option>
            ))}
          </select>
        </span>
      </div>
    </article>
  );
}

function TheThuNghiem() {
  const [chu, setChu] = useState('');
  const thu = (v: Record<string, unknown>) => guiGame({ t: 'thu', v });
  const guiChat = () => {
    if (chu.trim() === '') return;
    thu({ k: 'chat', text: chu });
    setChu('');
  };
  return (
    <article className="bx-the bx-the-thietke" data-bat="true">
      <div className="bx-the-dau">
        <span className="bx-icon">🧪</span>
        <span className="bx-ten">
          <b>{THU ? 'Thử nghiệm' : 'Điều phối'}</b>
          <small>
            {THU ? 'Chỉ tác động lên game thử, không tính vào dữ liệu thật' : 'Chạy bằng nhân vật Chủ phòng, không tính vào Bảng Vàng và hồ sơ'}
          </small>
        </span>
      </div>
      <div className="bx-the-nhanh">
        <button type="button" className="bx-kho-sua" onClick={() => thu({ k: 'tim' })}>
          ♥ Thả tim
        </button>
        {[1, 10, 100, 1000].map((xu) => (
          <button key={xu} type="button" className="bx-kho-sua" onClick={() => thu({ k: 'qua', xu })}>
            🎁 {xu}
          </button>
        ))}
      </div>
      <div className="bx-the-nhanh">
        {(
          [
            ['c', 'Chạy'],
            ['v', 'Đuổi'],
            ['b', 'Stop'],
            ['x', 'X'],
            ['z', 'Z'],
            ['m', 'Măm'],
          ] as const
        ).map(([ma, ten]) => (
          <button key={ma} type="button" className="bx-kho-sua" onClick={() => thu({ k: 'lenh', ma })}>
            {ten}
          </button>
        ))}
        <button type="button" className="bx-kho-sua" onClick={() => thu({ k: 'map' })}>
          Bốc map mới
        </button>
      </div>
      <div className="bx-the-nhanh sd-hang">
        <input
          className="bx-o"
          placeholder="Chat thử: tìm Bông Gòn, chọn 3, chạy"
          aria-label="Chat thử"
          value={chu}
          onChange={(e) => setChu(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') guiChat();
          }}
        />
        <button type="button" className="bx-kho-sua sd-gui" onClick={guiChat}>
          Gửi
        </button>
      </div>
    </article>
  );
}

/** Thẻ riêng của phòng trong bảng ⚙. Lưu ở sổ của phòng, game tự đọc lại sau vài giây. */
export function TheSanDau() {
  const asset = useAsset();
  const roi = !useStage().noiDuoc;
  const [san, setSan] = useState<San>({
    gio: '10h đến 12h',
    phutGio: 120,
    truyenBat: true,
    truyenGiay: 60,
    truyenChu: null,
  });
  const [nhac, setNhac] = useState<Nhac>({ bat: true, vol: 10 });
  const [macDinh, setMacDinh] = useState('');
  const [sua, setSua] = useState(false);

  useEffect(() => {
    void Promise.all([
      docSo(SO_SAN),
      docSo(SO_NHAC),
      fetch(asset('game/index.html'))
        .then((r) => r.text())
        .catch(() => ''),
    ]).then(([a, b, t]) => {
      const m = /const TRUYEN_MAC_DINH=`([\s\S]*?)`;/.exec(t);
      setMacDinh(m?.[1] ?? '');
      setSan((c) => {
        const moi = { ...c, ...(a as Partial<San>) };
        return moi;
      });
      if (typeof b['bat'] === 'boolean') setNhac({ bat: b['bat'], vol: kep(Number(b['vol']) || 0, 0, 100) });
    });
  }, [asset]);

  const luuSan = (moi: San) => {
    setSan(moi);
    ghiSo(SO_SAN, moi);
  };
  const luuNhac = (moi: Nhac) => {
    setNhac(moi);
    ghiSo(SO_NHAC, moi);
  };
  const chuHienTai = san.truyenChu ?? macDinh;
  const soBuoc = Math.max(0, tachDong(chuHienTai).length - 1);
  // Bản chơi thử chỉ điều khiển game thử, không đẩy cốt truyện lên màn hình đang phát.
  const reset = (kieu: 'tran' | 'all') => {
    // Luôn đánh vào phiên live thật, kể cả bấm từ bản chơi thử; game thử reset theo cho khớp.
    if (THU) guiGame({ t: 'thu', v: { k: 'reset', kieu } });
    luuSan({ ...san, lenhReset: { id: Date.now(), kieu } });
  };
  const lenh = (hien: boolean) => {
    if (THU) {
      guiGame({ t: 'thu', v: hien ? { k: 'truyen', chu: chuHienTai, giay: san.truyenGiay } : { k: 'truyen-tat' } });
      return;
    }
    luuSan({ ...san, truyenLenh: { id: Date.now(), hien } });
  };

  return (
    <>
      <ThePhienDau san={san} luuSan={luuSan} />

      <article className="bx-the bx-the-thietke" data-bat="true">
        <div className="bx-the-dau">
          <span className="bx-icon">🏁</span>
          <span className="bx-ten">
            <b>Trận đấu</b>
            <small>Tác động trực tiếp lên phiên live thật</small>
          </span>
        </div>
        <div className="bx-the-nhanh">
          <NutHaiLan chu="Reset trận này" disabled={roi} lam={() => reset('tran')} />
          <NutHaiLan chu="Reset tất cả" nguy disabled={roi} lam={() => reset('all')} />
        </div>
        <small className="sd-ghi">Trận này: cả sân chơi lại, giữ khách và Bảng Vàng. Tất cả: xoá sạch sân và Bảng Vàng, vẫn giữ kết nối TikTok.</small>
      </article>

      <TheCamera />

      <TheThuNghiem />

      <article className="bx-the bx-the-thietke" data-bat={san.truyenBat}>
        <div className="bx-the-dau">
          <span className="bx-icon">📖</span>
          <span className="bx-ten">
            <b>Cốt truyện</b>
            <small>
              {soBuoc} bước · {san.truyenGiay} giây · {san.truyenBat ? 'tự hiện đầu phiên' : 'chỉ hiện khi bấm'}
            </small>
          </span>
          <input
            type="checkbox"
            className="bx-cong"
            aria-label="Tự hiện đầu mỗi phiên"
            checked={san.truyenBat}
            disabled={roi}
            onChange={(e) => luuSan({ ...san, truyenBat: e.target.checked })}
          />
        </div>
        <div className="bx-the-nhanh">
          <button type="button" className="bx-kho-sua" disabled={roi} onClick={() => lenh(true)}>
            Hiện lên màn hình
          </button>
          <button type="button" className="bx-kho-sua" disabled={roi} onClick={() => lenh(false)}>
            Tắt
          </button>
          <button type="button" className="bx-kho-sua" disabled={roi} onClick={() => setSua(true)}>
            Sửa cốt truyện
          </button>
        </div>
      </article>

      <article className="bx-the bx-the-thietke" data-bat={nhac.bat}>
        <div className="bx-the-dau">
          <span className="bx-icon">🎵</span>
          <span className="bx-ten">
            <b>Nhạc nền</b>
            <small>{nhac.bat ? `Âm lượng ${nhac.vol}%, tự hạ khi MC nói` : 'Đang tắt'}</small>
          </span>
          <input
            type="checkbox"
            className="bx-cong"
            aria-label="Bật nhạc nền"
            checked={nhac.bat}
            disabled={roi}
            onChange={(e) => luuNhac({ ...nhac, bat: e.target.checked })}
          />
        </div>
        <div className="bx-the-nhanh">
          <input
            className="sd-vol"
            type="range"
            min={0}
            max={100}
            step={5}
            aria-label="Âm lượng nhạc nền"
            value={nhac.vol}
            disabled={roi || !nhac.bat}
            onChange={(e) => setNhac({ ...nhac, vol: Number(e.target.value) })}
            onPointerUp={() => ghiSo(SO_NHAC, nhac)}
            onKeyUp={() => ghiSo(SO_NHAC, nhac)}
          />
        </div>
      </article>

      {sua ? (
        <HopCotTruyen
          chu={chuHienTai}
          giay={san.truyenGiay}
          macDinh={macDinh}
          dong={() => setSua(false)}
          luu={(chu, giay) => {
            luuSan({ ...san, truyenGiay: giay, truyenChu: chu === macDinh ? null : chu });
            setSua(false);
          }}
        />
      ) : null}
    </>
  );
}

const CUA_SO_BAM_MS = 30_000;
const GIU_TOAST_MS: Record<ToastNoi['loai'], number> = { cho: 25_000, xong: 6_000, loi: 7_000 };
const ICON_TOAST: Record<ToastNoi['loai'], string> = { cho: '⏳', xong: '✅', loi: '⚠' };

/** Báo kết quả nút Kết nối trong thẻ Link phát sóng. Không hiện trên OBS. */
export function ToastKetNoi() {
  const designId = useDesignId();
  const [toast, setToast] = useState<ToastNoi | null>(null);
  const cu = useRef<TrangThaiNoi | null>(null);
  const bamLuc = useRef(0);
  const trenObs = 'obsstudio' in window || new URLSearchParams(location.search).get('obs') === '1';

  useEffect(() => {
    if (trenObs) return;
    const khiBam = (ev: MouseEvent) => {
      const nut = (ev.target as Element | null)?.closest?.('.bx-link-nut');
      if (nut?.textContent?.trim() === 'Kết nối') bamLuc.current = Date.now();
    };
    document.addEventListener('click', khiBam, true);
    let ws: WebSocket | null = null;
    let hen = 0;
    let dung = false;
    const noi = () => {
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
      ws.onopen = () => ws?.send(JSON.stringify({ t: 'xem', designId }));
      ws.onclose = () => {
        if (!dung) hen = window.setTimeout(noi, 3000);
      };
      ws.onmessage = (ev) => {
        const m = JSON.parse(String(ev.data)) as { t?: string; source?: TrangThaiNoi };
        if (m.t !== 'source' || m.source === undefined) return;
        const vuaBam = Date.now() - bamLuc.current < CUA_SO_BAM_MS;
        const moi = buocToast(cu.current, m.source, vuaBam);
        cu.current = m.source;
        if (moi === undefined) return;
        if (moi.loai !== 'cho') bamLuc.current = 0;
        setToast(moi);
      };
    };
    noi();
    return () => {
      dung = true;
      clearTimeout(hen);
      ws?.close();
      document.removeEventListener('click', khiBam, true);
    };
  }, [designId, trenObs]);

  useEffect(() => {
    if (toast === null) return;
    const hen = setTimeout(() => setToast(null), GIU_TOAST_MS[toast.loai]);
    return () => clearTimeout(hen);
  }, [toast]);

  if (trenObs || toast === null) return null;
  return (
    <div className="bx-toasts sd-toast-noi">
      <div className={`bx-toast sd-toast-${toast.loai}`} role="status">
        <span className="bx-toast-icon" aria-hidden>
          {ICON_TOAST[toast.loai]}
        </span>
        <div className="bx-toast-than">
          <b>{toast.tieuDe}</b>
          <p title={toast.chu}>{toast.chu}</p>
        </div>
        <button type="button" className="bx-toast-x" aria-label="Ẩn thông báo" onClick={() => setToast(null)}>
          ✕
        </button>
      </div>
    </div>
  );
}
