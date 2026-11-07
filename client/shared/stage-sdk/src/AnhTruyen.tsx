import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cacMoc, docNhanVat, moTaKetNoi, tinhTrangMoc } from '@live/contracts';
import type { ConfigField, Json, KetNoiAi, MocAnh, TinhTrangMoc } from '@live/contracts';
import { useStage } from './Stage';
import { nhaMacDinh, O_CO_ANH, oModel, oNha, suaAi } from './mc-cfg';
import type { OChung } from './McKeChuyen';
import { AI_MAC_DINH } from './state';

/** Ô `anh-truyen`: tiến độ ảnh minh hoạ của truyện — CHỈ ĐỂ XEM.
 *
 *  Máy chủ tự làm hết (`backend/src/anh_truyen.rs`): AI kể truyện lập hồ sơ,
 *  chọn đoạn, viết lời vẽ; máy chủ vẽ lần lượt và ghi từng ảnh vào cấu hình —
 *  ô này thấy ngay qua kênh cấu hình. Người vận hành chỉ có hai nút: vẽ lại một
 *  ảnh (xoá ảnh để máy chủ vẽ lại) và làm lại từ đầu (xoá dấu hồ sơ để máy chủ
 *  lập lại).
 *
 *  Đọc các ô khác qua khoá ở `field.truyen`, không biết tên module nào. */

const CHU_TINH_TRANG: Record<TinhTrangMoc, string> = {
  'chua-ve': 'đang chờ vẽ',
  'da-ve': 'đã vẽ',
  lech: 'đoạn này vừa sửa — sẽ vẽ lại',
};

function chu(v: Json | undefined): string {
  return typeof v === 'string' ? v : '';
}

export function OAnhTruyen({
  field: f,
  value,
  cfg,
  disabled,
  onChange,
  suaKhac,
}: {
  field: ConfigField;
  value: Json;
  cfg: Readonly<Record<string, Json>>;
  disabled: boolean;
  onChange(v: Json): void;
  suaKhac?: ((key: string, v: Json) => void) | undefined;
}) {
  const k = f.truyen ?? {
    doan: 'passages',
    phongCach: 'phongCach',
    hoSo: 'nhanVat',
    hoSoCua: 'hoSoCua',
    loi: 'anhLoi',
  };
  const bat = cfg['anhTuDong'] === true;
  const doan = chu(cfg[k.doan])
    .split('\n')
    .map((d) => d.trim().replace(/\s+/g, ' '))
    .filter((d) => d !== '');
  const moc = cacMoc(value);
  const loi = chu(cfg[k.loi]);
  const phongCach = chu(cfg[k.phongCach]);
  const hoSo = docNhanVat(chu(cfg[k.hoSo]));
  const daLap = chu(cfg[k.hoSoCua]) !== '';
  const tt = (m: MocAnh): TinhTrangMoc => tinhTrangMoc(m, doan);
  const daVe = moc.filter((m) => tt(m) === 'da-ve').length;

  const ai = cfg['anhMuse'] === true ? 'muse.ai' : 'AI';
  const tom = !bat
    ? moc.length === 0
      ? 'Đang tắt. Bật "AI tự tạo ảnh" là AI tự đọc truyện và làm ảnh.'
      : `Đang tắt — đã vẽ ${daVe}/${moc.length} ảnh. Bật lại là AI vẽ tiếp phần còn thiếu.`
    : doan.length === 0
      ? 'Chưa có truyện để vẽ.'
      : !daLap || moc.length === 0
        ? ai === 'muse.ai'
          ? 'muse.ai đang vẽ mỗi đoạn một ảnh (vài phút)…'
          : 'AI đang đọc truyện, lập hồ sơ nhân vật và chọn đoạn cần ảnh…'
        : daVe === moc.length
          ? `${ai} chọn ${moc.length} ảnh cho ${doan.length} đoạn — đã vẽ đủ.`
          : `${ai} chọn ${moc.length} ảnh cho ${doan.length} đoạn — đang vẽ ${daVe + 1}/${moc.length}…`;

  return (
    <div className="bx-ds bx-anh-truyen">
      <span className="bx-ds-nhan">{f.label}</span>
      <p className="bx-goi">{tom}</p>
      {bat && loi !== '' ? <span className="bx-media-loi">Lỗi gần nhất: {loi}</span> : null}

      {phongCach === '' && hoSo.length === 0 ? null : (
        <details className="bx-ho-so">
          <summary>Hồ sơ truyện AI lập ({hoSo.length} nhân vật)</summary>
          {phongCach === '' ? null : (
            <p>
              <b>Phong cách:</b> {phongCach}
            </p>
          )}
          {hoSo.map((n) => (
            <p key={n.ten}>
              <b>{n.ten}:</b> {n.ta}
            </p>
          ))}
        </details>
      )}

      {moc.map((m, i) => {
        const t = tt(m);
        const den = moc[i + 1]?.tu;
        return (
          <section key={`${m.tu}`} className="bx-muc-the bx-moc" data-tt={t}>
            <div className="bx-muc-the-dau">
              <b>
                Ảnh {i + 1} ·{' '}
                {den === undefined
                  ? `đoạn ${m.tu} tới hết`
                  : den - 1 > m.tu
                    ? `đoạn ${m.tu}–${den - 1}`
                    : `đoạn ${m.tu}`}
              </b>
              <small className="bx-moc-tt">{!bat && t !== 'da-ve' ? 'chưa vẽ' : CHU_TINH_TRANG[t]}</small>
              {m.anh === '' ? null : (
                <button
                  type="button"
                  className="bx-muc-bo"
                  disabled={disabled || !bat}
                  title="Bỏ ảnh này, AI vẽ lại"
                  onClick={() =>
                    onChange(moc.map((x, j) => (j === i ? { ...x, anh: '', dau: '' } : x)) as unknown as Json)
                  }
                >
                  Vẽ lại
                </button>
              )}
            </div>
            <div className="bx-moc-than">
              {m.anh === '' ? (
                <span className="bx-moc-anh bx-moc-trong">chưa có ảnh</span>
              ) : (
                <img className="bx-moc-anh" src={m.anh} alt="" loading="lazy" data-lech={t === 'lech'} />
              )}
              <p className="bx-moc-loi" title={m.ta}>
                {m.nhanVat.length === 0 ? null : <b>{m.nhanVat.join(', ')} · </b>}
                {m.ta}
              </p>
            </div>
          </section>
        );
      })}

      {suaKhac === undefined || !bat || !daLap ? null : (
        <button
          type="button"
          className="bx-nho"
          disabled={disabled}
          title="AI đọc lại truyện, lập hồ sơ và chọn đoạn từ đầu"
          onClick={() => suaKhac(k.hoSoCua, '')}
        >
          Làm lại từ đầu
        </button>
      )}
    </div>
  );
}

/** Ô `ket-noi`: chọn một kết nối trong kho làm được `field.viec`. Rỗng là
 *  "Mặc định" — kết nối đầu tiên làm được việc đó và có khoá, như máy chủ chọn
 *  (`secrets::tim`), ghi rõ tên để người vận hành biết thật ra là cái nào. */
export function OKetNoi({
  id,
  field: f,
  value,
  disabled,
  onChange,
}: {
  id: string;
  field: ConfigField;
  value: Json;
  disabled: boolean;
  onChange(v: Json): void;
}) {
  const [kho, setKho] = useState<KetNoiAi[]>([]);
  useEffect(() => {
    void fetch('/s/providers')
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((j: { providers?: KetNoiAi[] }) => setKho(j.providers ?? []))
      .catch(() => setKho([]));
  }, []);
  const viec = f.viec ?? 'chat';
  const ds = kho.filter((p) => p.uses.includes(viec));
  const md = ds.find((p) => p.hasKey);
  const dang = chu(value);
  return (
    <select className="bx-o" id={id} value={dang} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">
        {md === undefined ? 'Mặc định — chưa có kết nối nào làm được việc này' : `Mặc định — ${moTaKetNoi(md, viec)}`}
      </option>
      {ds.map((p) => (
        <option key={p.id} value={p.id}>
          {p.hasKey ? moTaKetNoi(p, viec) : `${moTaKetNoi(p, viec)} (thiếu khoá)`}
        </option>
      ))}
      {dang !== '' && !ds.some((p) => p.id === dang) ? (
        <option value={dang}>{dang} (không còn trong kho)</option>
      ) : null}
    </select>
  );
}

/** Ô `nguon-anh`: AI nào tạo ảnh — ghi rõ tên, không mơ hồ.
 *
 *  Công tắc hai phía: muse.ai (tab muse.ai đã đăng nhập trong app desktop, miễn
 *  phí, máy chủ `muse.rs`) ↔ API (kết nối vẽ ảnh trong kho, tính tiền từng ảnh).
 *  Dòng "Đang dùng" luôn nói đúng tên · nơi gọi · model đang vẽ. */
export function ONguonAnh({
  field: f,
  value,
  disabled,
  onChange,
  O,
}: {
  field: ConfigField;
  value: Json;
  disabled: boolean;
  onChange(v: Json): void;
  /** Ô cấu hình chung (`OConfig`), truyền vào để khỏi vòng import. */
  O: OChung;
}) {
  const s = useStage();
  const ai = s.ai ?? AI_MAC_DINH;
  const [kho, setKho] = useState<KetNoiAi[]>([]);
  const [coMuse, setCoMuse] = useState<boolean | null>(null);
  useEffect(() => {
    void fetch('/s/providers')
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((j: { providers?: KetNoiAi[] }) => setKho(j.providers ?? []))
      .catch(() => setKho([]));
    void fetch('/s/muse')
      .then((r) => (r.ok ? r.json() : { co: false }))
      .then((j: { co?: boolean }) => setCoMuse(j.co === true))
      .catch(() => setCoMuse(false));
  }, []);

  const muse = value === true;
  // API: MỘT bộ cài đặt ảnh của phòng (kết nối, model, kích thước) — dùng chung
  // cho ảnh truyện và nút "AI vẽ ảnh" của ô Ảnh chung.
  const chon = ai.anhProvider.trim();
  const ds = kho.filter((p) => p.uses.includes('image'));
  const api = chon !== '' ? ds.find((p) => p.id === chon) : nhaMacDinh(kho, 'image', 'anh');
  const dangDung = muse
    ? 'muse.ai · tab trình duyệt trong app · miễn phí'
    : api === undefined
      ? 'chưa có kết nối vẽ ảnh nào — thêm ở Kết nối AI'
      : `${moTaKetNoi(api, 'image')} · API, tính tiền mỗi ảnh${api.hasKey ? '' : ' · THIẾU KHOÁ'}`;

  return (
    <div className="bx-nguon-anh">
      <div className="bx-hai-phia" role="radiogroup" aria-label={f.label}>
        <button type="button" role="radio" aria-checked={muse} disabled={disabled} onClick={() => onChange(true)}>
          muse.ai
          <small>miễn phí · trong app</small>
        </button>
        <button type="button" role="radio" aria-checked={!muse} disabled={disabled} onClick={() => onChange(false)}>
          API
          <small>tính tiền mỗi ảnh</small>
        </button>
      </div>
      <p className="bx-goi bx-dang-dung">
        <b>Đang dùng:</b> {dangDung}
      </p>
      {muse ? (
        <>
          {coMuse === false ? (
            <span className="bx-media-loi">
              Máy chủ đang chạy ngoài app desktop nên không vẽ được bằng muse.ai — mở bằng app (npm run app).
            </span>
          ) : null}
          <p className="bx-goi">
            App đưa nguyên cốt truyện lên tab muse.ai, muse vẽ MỖI ĐOẠN MỘT ẢNH (miễn phí nên càng nhiều càng tốt);
            thiếu đoạn nào thì app tự hỏi bù. Đăng nhập một lần ở Trình duyệt → Đăng nhập muse.ai.
          </p>
        </>
      ) : (
        <>
          <O
            moduleId="mc"
            field={oNha('anhProvider', 'Kết nối vẽ ảnh', 'image', 'anh', kho, ai.anhProvider)}
            value={ai.anhProvider}
            disabled={disabled}
            onChange={(v) => suaAi('anhProvider', v)}
          />
          <O
            moduleId="mc"
            field={oModel('anhModel', 'Model vẽ ảnh', 'image', api?.id ?? '', kho)}
            value={ai.anhModel}
            disabled={disabled}
            onChange={(v) => suaAi('anhModel', v)}
          />
          <O
            moduleId="mc"
            field={O_CO_ANH}
            value={ai.anhSize}
            disabled={disabled}
            onChange={(v) => suaAi('anhSize', v)}
          />
        </>
      )}
    </div>
  );
}

/** Ô `truyen-sau`: truyện kế tiếp máy chủ chuẩn bị sẵn (`truyen_sau.rs`) —
 *  tên, thể loại, nguồn, các đoạn, ảnh vẽ sẵn. Nút "Đổi truyện khác" bỏ truyện
 *  này vào sổ (không lấy lại) để máy chủ chuẩn bị truyện khác. */
export function OTruyenSau({
  field: f,
  value,
  cfg,
  disabled,
  onChange,
  suaKhac,
}: {
  field: ConfigField;
  value: Json;
  cfg: Readonly<Record<string, Json>>;
  disabled: boolean;
  onChange(v: Json): void;
  suaKhac?: ((key: string, v: Json) => void) | undefined;
}) {
  const sau = value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const ten = chu(sau['title']);
  const doan = chu(sau['passages'])
    .split('\n')
    .map((d) => d.trim())
    .filter((d) => d !== '');
  const moc = cacMoc(sau['moc'] ?? []);
  const daVe = moc.filter((m) => m.anh !== '').length;
  const daKe = Array.isArray(cfg['daKe']) ? cfg['daKe'] : [];
  const anhBat = cfg['anhTuDong'] === true;

  const anh = !anhBat
    ? ''
    : chu(sau['hoSoCua']) === ''
      ? ' · ảnh: chờ vẽ sẵn (sau khi ảnh truyện đang kể đủ)'
      : ` · ảnh: đã vẽ ${daVe}/${moc.length}`;

  return (
    <div className="bx-ds bx-truyen-sau">
      <span className="bx-ds-nhan">{f.label}</span>
      {ten === '' ? (
        <p className="bx-goi">Đang chuẩn bị truyện kế tiếp…</p>
      ) : (
        <section className="bx-muc-the">
          <div className="bx-muc-the-dau">
            <b>{ten}</b>
            <small>{[chu(sau['loai']), chu(sau['nguon'])].filter((x) => x !== '').join(' · ')}</small>
          </div>
          <p className="bx-goi">
            {doan.length} đoạn{anh}
          </p>
          {chu(sau['anhLoi']) === '' ? null : <span className="bx-media-loi">Lỗi ảnh: {chu(sau['anhLoi'])}</span>}
          <details className="bx-ho-so">
            <summary>Xem các đoạn</summary>
            {doan.map((d, i) => (
              <p key={i}>
                <b>{i + 1}.</b> {d}
              </p>
            ))}
          </details>
          <button
            type="button"
            className="bx-muc-bo"
            disabled={disabled || suaKhac === undefined}
            title="Bỏ truyện này (không lấy lại), chuẩn bị truyện khác"
            onClick={() => {
              suaKhac?.('daKe', [...daKe, { ten, loai: chu(sau['loai']) }] as unknown as Json);
              onChange({});
            }}
          >
            Đổi truyện khác
          </button>
        </section>
      )}
      <small className="bx-goi">Đã kể {daKe.length} truyện ở phòng này — không kể lại.</small>
    </div>
  );
}

interface TrangThaiCli {
  co: boolean;
  dangNhap: boolean;
  chiTiet: string;
  /** Câu lệnh mở công cụ trên máy này. */
  lenh: string;
}

type CacCli = { codex: TrangThaiCli; claude: TrangThaiCli };

function taiTrangThai(moi: boolean): Promise<CacCli | null> {
  return fetch(moi ? '/s/ai-cli?moi=1' : '/s/ai-cli')
    .then((r) => (r.ok ? (r.json() as Promise<CacCli>) : null))
    .catch(() => null);
}

/** Một câu lệnh, kèm nút chép. */
function DongLenh({ lenh }: { lenh: string }) {
  const [da, setDa] = useState(false);
  return (
    <div className="bx-lenh">
      <code>{lenh}</code>
      <button
        type="button"
        className="bx-muc-bo"
        onClick={() => {
          void navigator.clipboard?.writeText(lenh).then(() => {
            setDa(true);
            setTimeout(() => setDa(false), 1500);
          });
        }}
      >
        {da ? 'Đã chép' : 'Chép'}
      </button>
    </div>
  );
}

/** Hộp hướng dẫn cài / đăng nhập Codex hay Claude Code, nút "Kiểm tra" ở cuối. */
/** Phiên đăng nhập chạy nền ở máy chủ (`ai_cli::XemPhien`). */
interface PhienDangNhap {
  cong: string;
  chay: boolean;
  ra: string;
  ma: number | null;
  link: string;
}

function HopHuongDan({
  cong,
  tt,
  dong,
  kiemTra,
}: {
  cong: 'codex' | 'claude';
  tt: TrangThaiCli | null;
  dong: () => void;
  kiemTra: () => Promise<void>;
}) {
  const [dangKiem, setDangKiem] = useState(false);
  const [daKiem, setDaKiem] = useState(false);
  const laClaude = cong === 'claude';
  const lenhMo = tt?.lenh !== undefined && tt.lenh !== '' ? tt.lenh : laClaude ? 'claude' : 'codex';
  const xong = tt !== null && tt.co && tt.dangNhap;
  // Phiên đăng nhập chạy NỀN ở máy chủ (`ai_cli.rs`): đóng hộp, tải lại trang
  // vẫn còn — mở lại là thấy đúng chỗ đang dở.
  const [phien, setPhien] = useState<PhienDangNhap | null>(null);
  const [loi, setLoi] = useState('');
  const [ma, setMa] = useState('');
  const khung = useRef<HTMLPreElement>(null);
  const cuaToi = phien !== null && phien.cong === cong;
  const chay = cuaToi && phien.chay;
  const goi = (duong: string, than?: unknown) =>
    fetch(duong, {
      method: than === undefined ? 'GET' : 'POST',
      ...(than === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(than) }),
    })
      .then(async (r) => {
        const v = (await r.json().catch(() => ({}))) as PhienDangNhap & { error?: string };
        if (!r.ok) throw new Error(v.error ?? 'lỗi');
        setLoi('');
        setPhien(v);
      })
      .catch((e: unknown) => setLoi(e instanceof Error ? e.message : 'không gọi được máy chủ'));
  useEffect(() => {
    void goi('/s/ai-cli/dang-nhap');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Đang chạy: xem lời in ra mỗi giây; vừa xong thì kiểm tra lại đăng nhập.
  useEffect(() => {
    if (!chay) return;
    const t = setInterval(() => void goi('/s/ai-cli/dang-nhap'), 1_000);
    return () => {
      clearInterval(t);
      void kiemTra().then(() => setDaKiem(true));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chay]);
  useEffect(() => {
    khung.current?.scrollTo({ top: khung.current.scrollHeight });
  }, [phien?.ra]);
  return (
    <div className="bx-tam" role="dialog" aria-modal aria-label="Hướng dẫn đăng nhập">
      <div className="bx-modal">
        <div className="bx-dau2">
          <span className="bx-icon">🔑</span>
          <span className="bx-ten">
            <b>{laClaude ? 'Đăng nhập Claude' : 'Đăng nhập Codex'}</b>
            <small>Đăng nhập một lần, app dùng tài khoản thay cho tiền API</small>
          </span>
          <button type="button" className="bx-x" onClick={dong} aria-label="Đóng">
            ✕
          </button>
        </div>
        <div className="bx-than bx-huong-dan">
          {xong ? (
            <p className="bx-goi">✓ {tt.chiTiet}</p>
          ) : tt !== null && !tt.co && laClaude ? null : (
            <div className="bx-mo-dang-nhap">
              <div className="bx-hang-nut">
                {chay ? (
                  <button type="button" className="bx-muc-bo" onClick={() => void goi('/s/ai-cli/dang-nhap/dung', {})}>
                    Dừng
                  </button>
                ) : (
                  <button type="button" className="bx-xong" onClick={() => void goi(`/s/ai-cli/dang-nhap/${cong}`, {})}>
                    {cuaToi ? 'Bắt đầu lại' : 'Bắt đầu đăng nhập'}
                  </button>
                )}
                {chay && phien.link !== '' ? (
                  <>
                    <button type="button" className="bx-muc-bo" onClick={() => window.open(phien.link, '_blank')}>
                      Mở trang đăng nhập
                    </button>
                    <button
                      type="button"
                      className="bx-muc-bo"
                      onClick={() => void navigator.clipboard?.writeText(phien.link)}
                    >
                      Chép link
                    </button>
                  </>
                ) : null}
              </div>
              <p className="bx-goi">
                {chay
                  ? `Đang chạy trong app. Trình duyệt mở trang đăng nhập ${laClaude ? 'Claude' : 'ChatGPT'} — đăng nhập rồi bấm cho phép. Trang đưa mã thì dán vào ô dưới.`
                  : `Chạy lệnh đăng nhập ${laClaude ? 'tài khoản Claude (gói Pro / Max)' : 'tài khoản ChatGPT'} ngay trong app, chạy nền — đóng hộp hay tải lại trang vẫn giữ.`}
              </p>
              {cuaToi && phien.ra.trim() !== '' ? (
                <pre className="bx-cli" ref={khung}>
                  {phien.ra}
                </pre>
              ) : null}
              {chay ? (
                <form
                  className="bx-hang-nut"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (ma.trim() === '') return;
                    void goi('/s/ai-cli/dang-nhap/nhap', { chu: ma }).then(() => setMa(''));
                  }}
                >
                  <input
                    className="bx-o"
                    value={ma}
                    placeholder="Dán mã đăng nhập vào đây"
                    onChange={(e) => setMa(e.target.value)}
                  />
                  <button type="submit" className="bx-muc-bo">
                    Gửi
                  </button>
                </form>
              ) : null}
              {cuaToi && !chay && phien.ma !== 0 && phien.ma !== null ? (
                <span className="bx-media-loi">Lệnh dừng (mã {phien.ma}) — chưa đăng nhập được, bấm Bắt đầu lại.</span>
              ) : null}
              {loi !== '' ? <span className="bx-media-loi">{loi}</span> : null}
            </div>
          )}
          <details className="bx-ho-so">
            <summary>Tự làm bằng tay</summary>
            {laClaude ? (
              <ol>
                <li>Mở PowerShell (bấm Start, gõ PowerShell) — cửa sổ riêng, không phải trong app này.</li>
                <li>
                  Dán và chạy lệnh mở Claude Code:
                  <DongLenh lenh={lenhMo} />
                </li>
                <li>
                  Trong Claude Code gõ <DongLenh lenh="/login" />
                  Chọn đăng nhập bằng <b>tài khoản Claude (gói Pro / Max)</b> — KHÔNG chọn Anthropic Console hay khoá
                  API.
                </li>
                <li>Trình duyệt mở trang đăng nhập Claude: đăng nhập rồi bấm cho phép.</li>
                <li>
                  Xong gõ <code>/exit</code> để thoát, quay lại đây bấm <b>Kiểm tra</b>.
                </li>
              </ol>
            ) : (
              <ol>
                {tt !== null && !tt.co ? (
                  <li>
                    Cài Codex — mở PowerShell rồi chạy:
                    <DongLenh lenh="npm i -g @openai/codex" />
                  </li>
                ) : null}
                <li>
                  Mở PowerShell (cửa sổ riêng), chạy:
                  <DongLenh lenh="codex login" />
                </li>
                <li>
                  Trình duyệt mở trang đăng nhập: đăng nhập bằng <b>tài khoản ChatGPT</b> của bạn.
                </li>
                <li>
                  Xong quay lại đây bấm <b>Kiểm tra</b>.
                </li>
              </ol>
            )}
          </details>
          {daKiem && tt !== null && !xong ? (
            tt.co && tt.dangNhap ? (
              <p className="bx-goi">✓ {tt.chiTiet}</p>
            ) : (
              <span className="bx-media-loi">{tt.chiTiet}</span>
            )
          ) : null}
        </div>
        <div className="bx-chan2">
          <button
            type="button"
            className="bx-xong"
            disabled={dangKiem}
            onClick={() => {
              setDangKiem(true);
              void kiemTra().finally(() => {
                setDangKiem(false);
                setDaKiem(true);
              });
            }}
          >
            {dangKiem ? 'Đang kiểm tra…' : 'Kiểm tra'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Ô `nguon-chu`: AI viết truyện & dẫn chuyện qua đâu — API (mặc định),
 *  Codex (tài khoản ChatGPT) hay Claude Code (tài khoản Claude). Hiện rõ trạng
 *  thái cài / đăng nhập của từng công cụ (máy chủ `ai_cli.rs`). */
export function ONguonChu({
  field: f,
  value,
  disabled,
  onChange,
  anDangDung = false,
  them,
}: {
  field: ConfigField;
  value: Json;
  disabled: boolean;
  onChange(v: Json): void;
  /** Nút phụ đứng cạnh nút trạng thái, cùng hàng (vd "Lịch sử CLI"). */
  them?: ReactNode;
  /** Nằm trong khối "Mình kể truyện" (đã có dòng "Đang chạy"): bỏ dòng riêng. */
  anDangDung?: boolean;
}) {
  const [tt, setTt] = useState<CacCli | null>(null);
  const [moHd, setMoHd] = useState(false);
  const o = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void taiTrangThai(false).then(setTt);
  }, []);
  const chon = value === 'codex' || value === 'claude' ? value : 'api';
  const muc: { id: 'api' | 'codex' | 'claude'; ten: string }[] = [
    { id: 'api', ten: 'API' },
    { id: 'codex', ten: 'Codex' },
    { id: 'claude', ten: 'Claude' },
  ];
  const cua = chon === 'api' ? null : (tt?.[chon] ?? null);
  const xong = cua !== null && cua.co && cua.dangNhap;
  const dangDung =
    chon === 'api'
      ? 'API — kết nối AI trong kho, tính tiền theo token'
      : chon === 'claude'
        ? 'Claude (tài khoản Claude) — chạy qua Claude Code, mỗi truyện một session'
        : 'Codex (tài khoản ChatGPT) — chạy qua codex exec, mỗi truyện một session';

  // Hộp hướng dẫn phủ cả ngăn bảng xem, như các hộp khác của bảng.
  const ngan = o.current?.closest('.bx-ngan') ?? null;
  return (
    <div className="bx-nguon-anh" ref={o}>
      <div className="bx-hai-phia bx-ba-phia" role="radiogroup" aria-label={f.label}>
        {muc.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={chon === m.id}
            disabled={disabled}
            onClick={() => onChange(m.id)}
          >
            {m.ten}
          </button>
        ))}
      </div>
      {anDangDung ? null : (
        <p className="bx-goi bx-dang-dung">
          <b>Đang dùng:</b> {dangDung}
        </p>
      )}
      {/* MỘT nút duy nhất, nhãn chính là trạng thái: bấm vào mở hộp đăng
          nhập / chi tiết. Câu giải thích dài để ở tooltip. */}
      {chon === 'api' ? null : (
        <div className="bx-can-lam">
          <button
            type="button"
            className="bx-trang-thai"
            data-tot={tt === null ? '' : xong ? '1' : '0'}
            title={tt === null ? 'Đang kiểm tra công cụ…' : (cua?.chiTiet ?? 'Không kiểm tra được công cụ')}
            onClick={() => setMoHd(true)}
          >
            {tt === null ? 'Đang kiểm tra…' : xong ? '✓ Đã kết nối' : '⚠ Cần kết nối'}
          </button>
          {them}
        </div>
      )}
      {moHd && chon !== 'api' && ngan !== null
        ? createPortal(
            <HopHuongDan
              cong={chon}
              tt={cua}
              dong={() => setMoHd(false)}
              kiemTra={() => taiTrangThai(true).then(setTt)}
            />,
            ngan,
          )
        : null}
    </div>
  );
}
