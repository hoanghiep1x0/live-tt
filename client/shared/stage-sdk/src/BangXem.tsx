import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KIEU_LAM_DUOC,
  LOAI_PHONG,
  MAU_NHA,
  TAB_GIONG,
  TEN_KIEU,
  TINH_NANG_HE,
  VIEC_AI,
  batViec,
  chonMau,
  doiKieu,
  loiNhap,
  nanId,
  nhapMoi,
  nhapTu,
  oChonGiong,
  tenKetNoi,
  tenViec,
  thanGhi,
  thuocPhong,
} from '@live/contracts';
import type { ConfigField, Json, KetNoiAi, KieuNha, NhapKetNoi, ViecAi } from '@live/contracts';
import { AI_MAC_DINH, BOT_MAC_DINH } from './state';
import { ONhanh, OConfig } from './OConfig';
import { SO_MODULE, timDangKy } from './registry';
import { guiLenh } from './state';
import { NutModule } from './NutModule';
import { ModalGiong, TheGiong } from './GiongDoc';
import { useHopThietKe, useLoaiPhong, useLuaChonThietKe, useStage, useThietKe } from './Stage';
import './bang-xem.css';

/** Trong OBS thì KHÔNG hiện.
 *
 *  OBS Browser Source gắn `window.obsstudio` vào trang. Bảng này là chỗ người
 *  vận hành bật tắt và sửa tính năng để xem thử — nó mà lọt lên sóng thì khán
 *  giả thấy một đống nút. Thêm một đường chặn nữa: `?obs=1` cũng ẩn.
 */
function trongObs(): boolean {
  if (typeof window === 'undefined') return true;
  if ('obsstudio' in window) return true;
  try {
    return new URLSearchParams(location.search).get('obs') === '1';
  } catch {
    return false;
  }
}

function batModule(id: string, on: boolean): void {
  const duoc = guiLenh({
    t: 'command',
    command: { op: 'set-module', moduleId: id, on },
    by: 'nguoi',
    reason: 'bật tắt từ bảng xem thử',
  });
  if (!duoc) console.warn('[xem thử] chưa nối được máy chủ');
}

function suaCauHinh(id: string, key: string, v: Json): void {
  const duoc = guiLenh({
    t: 'command',
    command: { op: 'set-config', moduleId: id, patch: { [key]: v } as Json },
    by: 'nguoi',
    reason: 'sửa cấu hình từ bảng xem thử',
  });
  if (!duoc) console.warn('[xem thử] chưa nối được máy chủ');
}

function suaThietKe(key: string, v: Json): void {
  const duoc = guiLenh({
    t: 'command',
    command: { op: 'set-design-config', patch: { [key]: v } as Json },
    by: 'nguoi',
    reason: 'sửa lựa chọn thiết kế từ bảng xem thử',
  });
  if (!duoc) console.warn('[xem thử] chưa nối được máy chủ');
}

function suaBot(key: string, v: Json): void {
  const duoc = guiLenh({
    t: 'command',
    command: { op: 'set-bot', patch: { [key]: v } as Json },
    by: 'nguoi',
    reason: 'sửa nhân vật ảo từ bảng xem thử',
  });
  if (!duoc) console.warn('[xem thử] chưa nối được máy chủ');
}

/** Cấu hình đang có hiệu lực của một module: mặc định của schema, phủ bằng thứ
 *  backend đã lưu. */
function cauHinhCua(id: string, luu: Json | undefined): Record<string, Json> {
  const dk = timDangKy(id);
  if (dk === undefined) return {};
  return dk.hopCauHinh(luu ?? null) as Record<string, Json>;
}

/** Gom ô theo `tab`, giữ thứ tự xuất hiện. Ô không khai tab về tab đầu. */
function chiaTab(fields: readonly ConfigField[]): { ten: string; fields: ConfigField[] }[] {
  const ra: { ten: string; fields: ConfigField[] }[] = [];
  for (const f of fields) {
    const ten = f.tab ?? TAB_DAU;
    let nhom = ra.find((t) => t.ten === ten);
    if (nhom === undefined) {
      nhom = { ten, fields: [] };
      if (ten === TAB_DAU) ra.unshift(nhom);
      else ra.push(nhom);
    }
    nhom.fields.push(f);
  }
  if (ra.length === 0) ra.push({ ten: TAB_DAU, fields: [] });
  return ra;
}

const TAB_DAU = 'Cài đặt';

function oNhanhCua(fields: readonly ConfigField[], quick: readonly string[]): ConfigField[] {
  return quick
    .map((k) => fields.find((f) => f.key === k))
    .filter((f): f is ConfigField => f !== undefined);
}

/** Modal cấu hình đầy đủ của một tính năng, dựng từ `fields` của manifest.
 *
 *  Không có nút "Lưu": mỗi ô đổi là đẩy thẳng xuống phiên đang live ngay, y như
 *  trang quản lý. Giữ một nút Lưu ở đây chỉ tạo cảm giác an toàn giả. */
function Modal({
  id,
  o,
  dong,
  moGiong,
}: {
  id: string;
  o?: string;
  dong: () => void;
  /** Mở hộp dàn giọng, từ ô chọn giọng của tính năng. */
  moGiong: () => void;
}) {
  const s = useStage();
  const [tabChon, setTab] = useState('');
  const dk = timDangKy(id);
  if (dk === undefined) return null;

  const ui = dk.ui;
  const cfg = cauHinhCua(id, s.config[id]);
  // Chỉ khoá khi mất nối máy chủ: chưa phát vẫn chỉnh được — lệnh áp vào chính phòng của trang (docs/02 §10).
  const roi = !s.noiDuoc;
  // Mở từ nút có hộp phụ (`popup`) trên thẻ: chỉ ô đó và các ô phụ của nó, không chia tab.
  const goc = o === undefined ? undefined : ui.fields.find((f) => f.key === o);
  const tabs =
    goc === undefined
      ? chiaTab(ui.fields)
      : [{ ten: '', fields: oNhanhCua(ui.fields, [goc.key, ...(goc.popup ?? [])]) }];
  const tab = tabs.some((t) => t.ten === tabChon) ? tabChon : (tabs[0]?.ten ?? '');
  const oCuaTab = tabs.find((t) => t.ten === tab)?.fields ?? [];

  return (
    // Nằm TRONG ngăn phải, không phải giữa màn.
    //
    // Modal phủ giữa màn thì nó đè lên khung sân khấu — ai quay bằng Display
    // Capture hay Window Capture là khán giả thấy cả bảng cấu hình. Giữ mọi thứ
    // của người vận hành ở ngoài mép khung thì không phụ thuộc vào việc dò
    // được OBS hay không.
    <div className="bx-tam" role="dialog" aria-modal aria-label={ui.name}>
      <div className="bx-modal">
        <div className="bx-dau2">
          <span className="bx-icon">{ui.icon}</span>
          <span className="bx-ten">
            <b>{goc === undefined ? ui.name : goc.label}</b>
            <small>{goc === undefined ? ui.summary : ui.name}</small>
          </span>
          <button type="button" className="bx-x" onClick={dong} aria-label="Đóng">
            ✕
          </button>
        </div>

        {tabs.length < 2 ? null : (
          <div className="bx-tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.ten}
                type="button"
                role="tab"
                className="bx-tab"
                aria-selected={tab === t.ten}
                onClick={() => setTab(t.ten)}
              >
                {t.ten}
              </button>
            ))}
          </div>
        )}

        <div className="bx-than">
          {goc !== undefined || tab !== tabs[0]?.ten ? null : (
            <label className="bx-dong bx-dong-chinh" htmlFor={`xem-bat-${id}`}>
              <span>
                <b>Bật tính năng</b>
                <small>Tắt thì thiết kế vẫn chạy bình thường, chỉ thiếu tính năng này</small>
              </span>
              <input
                type="checkbox"
                id={`xem-bat-${id}`}
                checked={s.enabled.includes(id)}
                disabled={roi}
                onChange={(e) => batModule(id, e.target.checked)}
              />
            </label>
          )}

          {oCuaTab.map((f) => (
            <div key={f.key}>
              <OConfig
                moduleId={id}
                field={oChonGiong(f, s.voice.cast, cfg[f.key])}
                value={cfg[f.key] ?? null}
                disabled={roi}
                onChange={(v) => suaCauHinh(id, f.key, v)}
              />
              {/* Ô chọn giọng chỉ chọn trong dàn; giọng nào đọc bằng kết nối
                  nào thì sửa ở dàn giọng — mở thẳng từ đây, khỏi đi tìm. */}
              {f.type !== 'voice' ? null : (
                <button type="button" className="bx-kho-sua bx-mo-giong" onClick={moGiong}>
                  🗣 Sửa dàn giọng — chọn kết nối và tên giọng
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="bx-chan2">
          <button type="button" className="bx-xong" onClick={dong}>
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}

/** Một thẻ tính năng trong ngăn: bật tắt và vài ô chỉnh nhanh ngay trên thẻ,
 *  bấm vào thẻ thì mở cấu hình đầy đủ. */
function The({ id, mo }: { id: string; mo: (o?: string) => void }) {
  const s = useStage();
  const dk = timDangKy(id);
  if (dk === undefined) return null;

  const ui = dk.ui;
  const cfg = cauHinhCua(id, s.config[id]);
  const bat = s.enabled.includes(id);
  // Chỉ khoá khi mất nối máy chủ: chưa phát vẫn chỉnh được — lệnh áp vào chính phòng của trang (docs/02 §10).
  const roi = !s.noiDuoc;
  const nhanh = oNhanhCua(ui.fields, ui.quick ?? []);

  return (
    <article className="bx-the" data-bat={bat}>
      {/* Cả mặt thẻ là một nút phủ lên, nằm dưới các ô chỉnh nhanh: bấm chỗ
          trống thì mở modal, bấm trúng ô thì chỉnh ngay tại chỗ. */}
      <button
        type="button"
        className="bx-cham"
        aria-label={`Cấu hình ${ui.name}`}
        onClick={() => mo()}
      />

      <div className="bx-the-dau">
        <span className="bx-icon">{ui.icon}</span>
        <span className="bx-ten">
          <b>{ui.name}</b>
          <small>{ui.summary}</small>
        </span>
        <input
          type="checkbox"
          className="bx-cong"
          checked={bat}
          disabled={roi}
          aria-label={`Bật ${ui.name}`}
          onChange={(e) => batModule(id, e.target.checked)}
        />
      </div>

      {nhanh.length === 0 ? null : (
        <div className="bx-the-nhanh">
          {nhanh.map((f) =>
            f.popup === undefined ? (
              <ONhanh
                key={f.key}
                field={oChonGiong(f, s.voice.cast, cfg[f.key])}
                value={cfg[f.key] ?? null}
                disabled={roi}
                onChange={(v) => suaCauHinh(id, f.key, v)}
              />
            ) : (
              <button
                key={f.key}
                type="button"
                className="bx-q bx-q-popup"
                title={f.label}
                disabled={roi}
                onClick={() => mo(f.key)}
              >
                <span className="bx-q-nhan">{f.short ?? f.label}</span>
                <b>{f.options?.find((x) => x.value === cfg[f.key])?.label ?? String(cfg[f.key] ?? '')}</b>
                <span aria-hidden>▸</span>
              </button>
            ),
          )}
        </div>
      )}
      <NutModule id={id} />
    </article>
  );
}

/** Thẻ lựa chọn của chính thiết kế — khung dọc hay ngang, đồ đạc của phòng.
 *
 *  Đứng riêng trên đầu, KHÔNG nằm lẫn với các thẻ tính năng: tắt một tính năng
 *  thì phòng vẫn thế, còn đổi mấy ô này là đổi hình hài căn phòng. Thiết kế nào
 *  không khai lựa chọn nào thì thẻ không hiện. */
function TheThietKe() {
  const s = useStage();
  const luaChon = useLuaChonThietKe();
  const cfg = useThietKe();
  // Chỉ khoá khi mất nối máy chủ: chưa phát vẫn chỉnh được — lệnh áp vào chính phòng của trang (docs/02 §10).
  const roi = !s.noiDuoc;

  return (
    <>
      {luaChon.map((the) => {
        const bat = the.toggle === undefined ? true : cfg[the.toggle.key] !== false;
        return (
          <article key={the.id} className="bx-the bx-the-thietke" data-bat={bat}>
            <div className="bx-the-dau">
              <span className="bx-icon">{the.icon}</span>
              <span className="bx-ten">
                <b>{the.name}</b>
                <small>{the.summary}</small>
              </span>
              {the.toggle === undefined ? null : (
                <input
                  type="checkbox"
                  className="bx-cong"
                  checked={bat}
                  disabled={roi}
                  aria-label={the.toggle.label}
                  onChange={(e) => suaThietKe(the.toggle?.key ?? '', e.target.checked)}
                />
              )}
            </div>
            {the.fields.length === 0 ? null : (
              <div className="bx-the-nhanh">
                {the.fields.map((o) => (
                  <ONhanh
                    key={o.key}
                    field={o}
                    value={cfg[o.key] ?? null}
                    disabled={roi || !bat}
                    onChange={(v) => suaThietKe(o.key, v)}
                  />
                ))}
              </div>
            )}
          </article>
        );
      })}
    </>
  );
}

function suaAi(key: string, v: Json): void {
  const duoc = guiLenh({
    t: 'command',
    command: { op: 'set-ai', patch: { [key]: v } as Json },
    by: 'nguoi',
    reason: 'sửa MC từ bảng xem thử',
  });
  if (!duoc) console.warn('[xem thử] chưa nối được máy chủ');
}

const O_NHIP: ConfigField = {
  key: 'everySec',
  label: 'Nhịp khi MC không tự hẹn lượt sau',
  short: 'Nhịp (giây)',
  hint: 'Như bản cũ, mỗi lượt MC tự hẹn lượt sau 10–120 giây theo tình hình phòng (khách đang chờ thì nhanh, phòng im thì thưa). Ô này chỉ dùng cho lượt đầu và khi MC không hẹn.',
  type: 'number',
  min: 10,
  max: 300,
  unit: 'giây',
};

/** Một dòng kho kết nối AI, bản cho sân khấu: có địa chỉ để mở lại kết nối cũ,
 *  nhưng KHÔNG bao giờ có giá trị khoá. */
type NhaAi = KetNoiAi;

/** Đọc kho kết nối AI một lần lúc mở bảng. Cắm thêm khoá thì mở thẻ Kết nối
 *  AI ở đầu ngăn; sửa đầy đủ hay xoá thì sang trang quản lý. */
function useNhaAi(): NhaAi[] {
  const [ds] = useKhoAi();
  return ds;
}

/** Kho kết nối kèm hàm tải lại, cho thẻ nào vừa cắm thêm khoá. */
function useKhoAi(): [NhaAi[], () => void] {
  const [ds, setDs] = useState<NhaAi[]>([]);
  const tai = useCallback(() => {
    void fetch('/s/providers')
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((j: { providers?: NhaAi[] }) => setDs(j.providers ?? []))
      .catch(() => setDs([]));
  }, []);
  useEffect(tai, [tai]);
  return [ds, tai];
}

/** Ô chọn kết nối, chỉ liệt kê kết nối làm được đúng loại việc này. Giá trị
 *  đang lưu mà không còn trong kho thì vẫn hiện, để người vận hành thấy nó hỏng
 *  chứ không lặng lẽ nhảy sang nhà khác. */
/** Kết nối mà "Mặc định" sẽ dùng — cùng luật với `secrets::tim` ở backend:
 *  kết nối mang tên mặc định cũ nếu còn, không thì kết nối đầu tiên làm được
 *  việc này và có khoá. */
function nhaMacDinh(ds: readonly NhaAi[], use: ViecAi, cu: string): NhaAi | undefined {
  return (
    ds.find((p) => p.id === cu) ??
    [...ds].sort((a, b) => a.id.localeCompare(b.id)).find((p) => p.hasKey && p.uses.includes(use))
  );
}

function oNha(
  key: string,
  label: string,
  use: ViecAi,
  macDinh: string,
  ds: readonly NhaAi[],
  dang: string,
): ConfigField {
  const hop = ds.filter((p) => p.uses.includes(use));
  const md = nhaMacDinh(ds, use, macDinh);
  const options = [
    {
      value: '',
      label:
        md === undefined
          ? 'Mặc định — chưa có kết nối nào làm được việc này'
          : `Mặc định — ${tenKetNoi(md)}`,
    },
    ...hop.map((p) => ({
      value: p.id,
      label: p.hasKey ? tenKetNoi(p) : `${tenKetNoi(p)} (thiếu khoá)`,
    })),
  ];
  if (dang !== '' && !hop.some((p) => p.id === dang)) {
    options.push({ value: dang, label: `${dang} (không có trong kho)` });
  }
  return {
    key,
    label,
    short: label,
    type: 'select',
    options,
    hint: 'Cắm thêm khoá ở thẻ Kết nối AI đầu ngăn này. Khoá không bao giờ về tới trang này.',
  };
}

/** Model của tính năng này. Để trống là theo model mặc định của kết nối —
 *  gợi ý ghi luôn đó là model nào. */
function oModel(
  key: string,
  label: string,
  use: ViecAi,
  nha: string,
  ds: readonly NhaAi[],
): ConfigField {
  const md = ds.find((p) => p.id === nha)?.models[use];
  return {
    key,
    label,
    short: 'Model',
    type: 'text',
    hint:
      md === undefined || md === ''
        ? 'Để trống là theo model mặc định của kết nối.'
        : `Để trống là dùng ${md} — model mặc định của kết nối.`,
  };
}

const O_SANG_TAO: ConfigField = {
  key: 'temperature',
  label: 'Độ sáng tạo',
  type: 'select',
  options: [
    { value: '', label: 'Theo nhà cung cấp' },
    { value: '0.2', label: 'Chắc chắn — bám sát tin phòng' },
    { value: '0.6', label: 'Cân bằng' },
    { value: '0.9', label: 'Bay bổng — nói nhiều kiểu hơn' },
  ],
};

const O_TRAN: ConfigField = {
  key: 'maxTokens',
  label: 'Độ dài tối đa một lượt',
  type: 'number',
  min: 100,
  max: 4000,
  unit: 'token',
  hint: 'Thấp thì rẻ và gọn; MC chỉ nói tối đa 2 câu mỗi lượt nên 600 là đủ.',
};

const O_GIONG_MC: ConfigField = {
  key: 'voiceId',
  label: 'Giọng chính của MC',
  type: 'voice',
  hint: 'Chỉ dùng khi phòng bật Đa giọng (trang quản lý, nút Giọng đọc). Trong câu, [id-giọng] đổi giọng, [-] quay về giọng chính.',
};

const O_BAT_ANH: ConfigField = {
  key: 'anhEnabled',
  label: 'Cho nhờ AI vẽ ảnh',
  type: 'toggle',
  hint: 'Tắt thì nút vẽ ảnh ở ô ảnh/video không gọi đi đâu — khỏi lỡ tay tốn tiền.',
};

const O_CO_ANH: ConfigField = {
  key: 'anhSize',
  label: 'Kích thước ảnh',
  type: 'select',
  options: [
    { value: '', label: 'Vuông 1024×1024' },
    { value: '1536x1024', label: 'Ngang 1536×1024' },
    { value: '1024x1536', label: 'Dọc 1024×1536' },
    { value: '1792x1024', label: 'Ngang rộng 1792×1024' },
    { value: '1024x1792', label: 'Dọc cao 1024×1792' },
  ],
  hint: 'Mỗi nhà nhận một bộ kích thước khác nhau; chọn sai thì nhà cung cấp báo lỗi.',
};

const O_DAN: ConfigField = {
  key: 'extra',
  label: 'Lời dặn thêm cho MC',
  type: 'textarea',
  hint: 'Ghép sau lời dặn gốc. Ví dụ: tên phòng, chủ đề tối nay, điều cần tránh',
};

/** Trang quản lý mở ở đâu. Sân khấu mở từ nút "Xem mẫu" của trang quản lý
 *  (tab mới, `rel="noopener"` — vẫn còn referrer), nên lấy luôn gốc đó thay vì
 *  ghi cứng một cổng. Mở thẳng trong OBS thì không có referrer: lúc ấy không
 *  vẽ nút, chỉ nói chỗ cắm khoá.
 *
 *  Cắm khoá thì làm được ngay tại thẻ bên dưới; đây là lối phụ cho ai muốn
 *  sửa đầy đủ (đổi địa chỉ, xoá kết nối, xem cả bốn loại việc).
 *
 *  Gốc đó được nhớ lại: lần sau mở thẳng (tab mới, dán link, tải lại) không còn
 *  referrer mà nút vẫn biết đường về. */
function trangQuanLy(kho: string): string | null {
  const goc = gocQuanLy();
  return goc === null ? null : `${goc}/?kho=${kho}`;
}

const NHO_QUAN_LY = 'bx-trang-quan-ly';

function gocQuanLy(): string | null {
  try {
    const u = new URL(document.referrer);
    if (u.origin !== window.location.origin && /^https?:$/.test(u.protocol)) {
      try {
        localStorage.setItem(NHO_QUAN_LY, u.origin);
      } catch {
        // Không nhớ được thì lần này vẫn về được, chỉ lần sau là không.
      }
      return u.origin;
    }
  } catch {
    // Không có referrer: thử chỗ đã nhớ.
  }
  try {
    const nho = localStorage.getItem(NHO_QUAN_LY);
    return nho !== null && /^https?:\/\/[^/]+$/.test(nho) ? nho : null;
  } catch {
    return null;
  }
}

/** Thẻ kho kết nối AI. Mọi tính năng dùng AI đều lấy khoá từ kho này.
 *
 *  Cắm được khoá ngay tại đây (`PUT /s/secrets/:id`). Lối đó CHỈ GHI: danh
 *  sách trả về không bao giờ có giá trị khoá, nên trang này không đọc lại được
 *  thứ vừa cắm. Đánh đổi của lối không-token ghi ở `backend/src/lib.rs`. Xoá
 *  kết nối vẫn phải sang trang quản lý. */
function TheKhoAi({ mo }: { mo: () => void }) {
  const ds = useNhaAi();
  const s = useStage();
  const ai = s.ai ?? AI_MAC_DINH;

  const thieu = ds.filter((p) => !p.hasKey).length;
  const tom =
    ds.length === 0
      ? 'Chưa có kết nối nào — chưa tính năng AI nào chạy được'
      : thieu === 0
        ? `${ds.length} kết nối, đủ khoá`
        : `${ds.length} kết nối, ${thieu} cái thiếu khoá`;

  return (
    <article className="bx-the bx-the-kho" data-bat={ds.length > 0 && thieu === 0}>
      <button type="button" className="bx-cham" aria-label="Cấu hình kết nối AI" onClick={mo} />
      <div className="bx-the-dau">
        <span className="bx-icon">🔑</span>
        <span className="bx-ten">
          <b>Kết nối AI</b>
          <small>{tom}</small>
        </span>
      </div>

      {ds.length === 0 ? null : (
        <ul className="bx-kho-ds">
          {ds.map((p) => (
            <li key={p.id} data-co={p.hasKey}>
              <b>{tenKetNoi(p)}</b>
              <span className="bx-kho-viec">{p.uses.map(tenViec).join(' · ')}</span>
              <span className="bx-kho-trangthai">{p.hasKey ? 'có khoá' : 'thiếu khoá'}</span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="bx-kho-mo" onClick={mo}>
        {ds.length === 0 ? 'Cắm khoá đầu tiên' : 'Cắm thêm khoá'}
      </button>

      {/* Không dặn dò gì thêm ở đây: thẻ chỉ nói tình trạng kho. Lời giải
          thích dài nằm trong modal, chỗ người vận hành đang thực sự cắm. */}
      {ai.enabled && ds.length > 0 && ds.every((p) => !p.hasKey) ? (
        <p className="bx-the-nhac">MC đang bật nhưng chưa kết nối nào có khoá — MC sẽ im lặng.</p>
      ) : null}
    </article>
  );
}

/** Nút quay về trang quản lý, góc trái trên — đối xứng với nút bánh răng.
 *
 *  Sân khấu mở ở tab mới nên không có nút Back của trình duyệt để bấm; mở từ
 *  "Xem mẫu" thì `document.referrer` chỉ đúng chỗ cần về. Mở thẳng trong OBS
 *  thì không có referrer, lúc ấy không vẽ nút: OBS không cần nút nào, mà thu
 *  được một nút lạ lên sóng thì càng dở. */
function NutVe() {
  const link = trangQuanLy('');
  if (link !== null) {
    return (
      <a
        className="bx-nut bx-nut-ve"
        href={link}
        title="Về trang quản lý"
        aria-label="Về trang quản lý"
      >
        ←
      </a>
    );
  }
  // Tải lại trang là mất referrer, nhưng lịch sử tab vẫn còn: lùi một bước là
  // về đúng chỗ vừa đến từ đó.
  if (window.history.length <= 1) return null;
  return (
    <button
      type="button"
      className="bx-nut bx-nut-ve"
      title="Quay lại trang trước"
      aria-label="Quay lại trang trước"
      onClick={() => window.history.back()}
    >
      ←
    </button>
  );
}

/** Modal kho kết nối AI — cùng cơ chế với hộp Kết nối AI ở trang quản lý:
 *  bảng danh sách (số thứ tự, tên, nút sửa), bấm Sửa mới mở form của dòng đó,
 *  "+ Thêm kết nối" mở form trống để tạo bản ghi mới. Luật chung (mẫu
 *  provider, việc nào provider nào làm được, nắn tên, báo trùng) nằm ở
 *  `@live/contracts`, không chép ở đây. */
function ModalKho({ dong }: { dong: () => void }) {
  const [ds, taiLai] = useKhoAi();
  const link = trangQuanLy('chat');

  /** Form chỉ hiện khi đã chọn việc. */
  const [mo, setMo] = useState(false);
  /** Id kết nối đang sửa; null là đang tạo mới. */
  const [suaId, setSuaId] = useState<string | null>(null);
  const [n, setN] = useState<NhapKetNoi>(() => nhapMoi());
  const [hienKhoa, setHienKhoa] = useState(false);
  const [bao, setBao] = useState('');
  const oTen = useRef<HTMLInputElement>(null);
  /** Id đang mở, đọc được trong callback tải khoá. */
  const dangSua = useRef<string | null>(null);

  const daCo = suaId === null ? undefined : ds.find((p) => p.id === suaId);

  const themMoi = (): void => {
    setMo(true);
    setSuaId(null);
    dangSua.current = null;
    setN(nhapMoi());
    setHienKhoa(false);
    setBao('');
    setTimeout(() => oTen.current?.focus(), 0);
  };

  /** Mở một kết nối cũ. Khoá thì không điền được — máy chủ không bao giờ trả
   *  giá trị — nên để trống, nghĩa là giữ. */
  const moLai = (p: NhaAi): void => {
    setMo(true);
    setSuaId(p.id);
    dangSua.current = p.id;
    setN(nhapTu(p));
    setHienKhoa(false);
    setBao('');
    if (!p.hasKey) return;
    // Khoá đã cắm hiện sẵn dưới dạng chấm, bấm con mắt là thấy lại. Chỉ tải
    // lúc bấm Sửa; bấm sang dòng khác hay đã gõ khoá mới thì bỏ kết quả.
    void fetch(`/s/secrets/${encodeURIComponent(p.id)}/key`)
      .then((r) => (r.ok ? (r.json() as Promise<{ key?: string }>) : {}))
      .then((j: { key?: string }) => {
        const key = j.key ?? '';
        if (key === '' || dangSua.current !== p.id) return;
        setN((cu) => (cu.key === '' ? { ...cu, key } : cu));
      })
      .catch(() => {});
  };

  const luu = (): void => {
    const loi = loiNhap(n, ds, suaId);
    if (loi !== null) {
      setBao(loi);
      return;
    }
    setBao('đang lưu…');
    const id = suaId ?? nanId(n.name);
    void fetch(`/s/secrets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thanGhi(n)),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `máy chủ trả mã ${r.status}`);
        }
        const j = (await r.json().catch(() => ({}))) as { provider?: { id?: string } };
        // Vừa tạo xong thì form chuyển sang sửa chính bản ghi đó.
        setSuaId(j.provider?.id ?? id);
        // Khoá chỉ sống trong ô cho tới lúc gửi đi: xoá ngay để nó không nằm
        // lại trong trang mà OBS đang thu.
        setN((cu) => ({ ...cu, key: '' }));
        setBao(`Đã lưu “${n.name.trim()}”`);
        taiLai();
      })
      .catch((e: unknown) => setBao(e instanceof Error ? e.message : 'không lưu được'));
  };

  const lamDuoc = KIEU_LAM_DUOC[n.kind];

  return (
    <div className="bx-tam" role="dialog" aria-modal aria-label="Kết nối AI">
      <div className="bx-modal">
        <div className="bx-dau2">
          <span className="bx-icon">🔑</span>
          <span className="bx-ten">
            <b>Kết nối AI</b>
            <small>Cắm một lần, dùng chung cho MC, nhờ AI viết, vẽ ảnh và giọng đọc</small>
          </span>
          <button type="button" className="bx-x" onClick={dong} aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="bx-than">
          <div className="bx-kho-dau">
            <b>Kết nối đang có</b>
            <button type="button" className="bx-kho-sua" onClick={themMoi}>
              + Thêm kết nối
            </button>
          </div>

          {ds.length === 0 ? (
            <p className="bx-kho-trong">
              Chưa có kết nối nào. Bấm “+ Thêm kết nối” để cắm khoá đầu tiên.
            </p>
          ) : (
            <table className="bx-kho-bang">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tên</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {ds.map((p, i) => (
                  <tr key={p.id} data-dang={mo && p.id === suaId}>
                    <td className="bx-kho-stt">{i + 1}</td>
                    <td>
                      <b>{tenKetNoi(p)}</b>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="bx-kho-sua"
                        aria-label={`Sửa kết nối ${tenKetNoi(p)}`}
                        onClick={() => moLai(p)}
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!mo ? null : (
            <>
              <div className="bx-kho-dau">
                <b>{daCo === undefined ? 'Kết nối mới' : `Sửa “${tenKetNoi(daCo)}”`}</b>
                <button type="button" className="bx-kho-sua" onClick={() => setMo(false)}>
                  Đóng
                </button>
              </div>

              <div className="bx-kho-form">
                <label>
                  <span>Provider</span>
                  <select
                    className="bx-o bx-o-nho"
                    value={n.mau}
                    aria-label="Nhà cung cấp"
                    onChange={(e) => setN(chonMau(n, e.target.value))}
                  >
                    {MAU_NHA.map((m) => (
                      <option key={m.ma} value={m.ma}>
                        {m.ten}
                      </option>
                    ))}
                  </select>
                </label>
                {n.mau !== 'khac' ? null : (
                  <label>
                    <span>Giao thức</span>
                    <select
                      className="bx-o bx-o-nho"
                      value={n.kind}
                      aria-label="Giao thức"
                      onChange={(e) => setN(doiKieu(n, e.target.value as KieuNha))}
                    >
                      {(Object.keys(TEN_KIEU) as KieuNha[]).map((k) => (
                        <option key={k} value={k}>
                          {TEN_KIEU[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  <span>Tên ngắn</span>
                  <input
                    ref={oTen}
                    className="bx-o bx-o-nho"
                    value={n.name}
                    placeholder="MC"
                    aria-label="Tên ngắn của kết nối"
                    onChange={(e) => setN({ ...n, name: e.target.value })}
                  />
                </label>
                <label>
                  <span>Địa chỉ</span>
                  <input
                    className="bx-o bx-o-nho"
                    value={n.baseUrl}
                    placeholder="trống là địa chỉ gốc của nhà"
                    aria-label="Địa chỉ nhà cung cấp"
                    onChange={(e) => setN({ ...n, baseUrl: e.target.value })}
                  />
                </label>
                <label>
                  <span>Khoá</span>
                  <span className="bx-kho-khoa">
                    <input
                      className="bx-o bx-o-nho"
                      type={hienKhoa ? 'text' : 'password'}
                      value={n.key}
                      autoComplete="off"
                      placeholder={
                        daCo === undefined
                          ? 'dán khoá'
                          : daCo.hasKey
                            ? 'trống là giữ khoá cũ'
                            : 'chưa có khoá'
                      }
                      aria-label="Khoá API"
                      onChange={(e) => setN({ ...n, key: e.target.value })}
                    />
                    <button
                      type="button"
                      className="bx-kho-mat"
                      aria-label={hienKhoa ? 'Giấu khoá' : 'Hiện khoá'}
                      aria-pressed={hienKhoa}
                      title={hienKhoa ? 'Giấu khoá' : 'Hiện khoá'}
                      onClick={() => setHienKhoa(!hienKhoa)}
                    >
                      {hienKhoa ? '🙈' : '👁'}
                    </button>
                  </span>
                </label>

                <div className="bx-kho-viec-o">
                  <span>Dùng cho</span>
                  <div className="bx-kho-viec-ds">
                    {VIEC_AI.map((v) => {
                      const bat = n.uses.includes(v.id);
                      // Việc giao thức không làm được vẫn hiện, chỉ mờ đi và nói
                      // vì sao — ẩn hẳn thì trông như provider này thiếu cấu hình.
                      const duoc = lamDuoc.includes(v.id);
                      return (
                        <div className="bx-kho-viec-dong" key={v.id} data-bat={bat}>
                          <label className="bx-kho-tick" data-tat={!duoc}>
                            <input
                              type="checkbox"
                              checked={bat}
                              disabled={!duoc}
                              onChange={(e) => setN(batViec(n, v.id, e.target.checked))}
                            />
                            {v.ten}
                          </label>
                          {!duoc ? (
                            <small className="bx-kho-khong">không hỗ trợ</small>
                          ) : !bat ? null : (
                            <input
                              className="bx-o bx-o-nho"
                              value={n.models[v.id] ?? ''}
                              placeholder="model"
                              aria-label={`Model ${v.ten}`}
                              onChange={(e) =>
                                setN({ ...n, models: { ...n.models, [v.id]: e.target.value } })
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bx-kho-nut">
                  <button type="button" className="bx-xong" onClick={luu}>
                    {daCo === undefined ? 'Thêm kết nối' : 'Lưu kết nối'}
                  </button>
                  {link === null ? null : (
                    <a className="bx-kho-huy" href={link} target="_blank" rel="noopener">
                      Mở trang quản lý
                    </a>
                  )}
                </div>
                {bao === '' ? null : <p className="bx-kho-bao">{bao}</p>}
              </div>

              <p className="bx-kho-nhac">
                Gọi theo <b>{TEN_KIEU[n.kind]}</b>.{' '}
                Khoá nằm ở máy chủ; bấm con mắt để xem khoá đang dùng. Xoá kết nối thì sang trang
                quản lý.
              </p>
            </>
          )}
        </div>

        <div className="bx-chan2">
          <button type="button" className="bx-xong" onClick={dong}>
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}

/** Thẻ MC do AI dẫn.
 *
 *  Khoá API KHÔNG có ở đây và không bao giờ đi qua đây: nó nằm trong kho khoá
 *  của backend (nhà cung cấp "mc"), thêm ở trang quản lý. Bản cũ để khoá trong
 *  localStorage của trang đang live — đúng cái trang mà OBS đang thu. */
function TheMc({ mo }: { mo: () => void }) {
  const s = useStage();
  // Chỉ khoá khi mất nối máy chủ: chưa phát vẫn chỉnh được — lệnh áp vào chính phòng của trang (docs/02 §10).
  const roi = !s.noiDuoc;
  const ai = s.ai ?? AI_MAC_DINH;
  const ds = useNhaAi();

  return (
    <article className="bx-the bx-the-mc" data-bat={ai.enabled}>
      <button type="button" className="bx-cham" aria-label="Cấu hình MC" onClick={mo} />
      <div className="bx-the-dau">
        <span className="bx-icon">🎙</span>
        <span className="bx-ten">
          <b>MC do AI dẫn</b>
          <small>Đọc tin phòng rồi nói chuyện với khách theo tên, kể chuyện từng nhịp</small>
        </span>
        <input
          type="checkbox"
          className="bx-cong"
          checked={ai.enabled}
          disabled={roi}
          aria-label="Bật MC do AI dẫn"
          onChange={(e) => suaAi('enabled', e.target.checked)}
        />
      </div>
      <div className="bx-the-nhanh">
        <ONhanh
          field={O_NHIP}
          value={ai.everySec}
          disabled={roi || !ai.enabled}
          onChange={(v) => suaAi('everySec', v)}
        />
        <ONhanh
          field={oNha('provider', 'Kết nối', 'chat', 'mc', ds, ai.provider)}
          value={ai.provider}
          disabled={roi || !ai.enabled}
          onChange={(v) => suaAi('provider', v)}
        />
      </div>
      {s.aiLoi === null || !ai.enabled ? null : (
        <p className="bx-the-nhac bx-the-loi">Lượt MC vừa rồi lỗi: {s.aiLoi}</p>
      )}
      <p className="bx-the-nhac">
        Kết nối lấy từ kho AI dùng chung ở trang quản lý. Model, độ sáng tạo, độ dài và phần vẽ ảnh
        chỉnh ở nút cấu hình. Khoá không bao giờ rời máy chủ.
      </p>
    </article>
  );
}

/** Modal lời dặn thêm cho MC. Textarea dài nên không nhét lên thẻ được. */
/** Ba nhóm việc của MC, mỗi nhóm một tab cho modal khỏi phải cuộn. */
const TAB_MC = [
  { id: 'chu', nhan: 'Phần chữ' },
  { id: 'dan', nhan: 'Lời dặn' },
  { id: 'anh', nhan: 'Vẽ ảnh' },
  { id: 'giong', nhan: TAB_GIONG },
] as const;
type TabMc = (typeof TAB_MC)[number]['id'];

function ModalMc({ dong }: { dong: () => void }) {
  const [tab, setTab] = useState<TabMc>('chu');
  const s = useStage();
  const ai = s.ai ?? AI_MAC_DINH;
  // Chỉ khoá khi mất nối máy chủ: chưa phát vẫn chỉnh được — lệnh áp vào chính phòng của trang (docs/02 §10).
  const roi = !s.noiDuoc;
  const ds = useNhaAi();
  const nhaChu = ai.provider.trim() === '' ? (nhaMacDinh(ds, 'chat', 'mc')?.id ?? '') : ai.provider.trim();
  const nhaAnh =
    ai.anhProvider.trim() === '' ? (nhaMacDinh(ds, 'image', 'anh')?.id ?? '') : ai.anhProvider.trim();

  return (
    <div className="bx-tam" role="dialog" aria-modal aria-label="MC do AI dẫn">
      <div className="bx-modal">
        <div className="bx-dau2">
          <span className="bx-icon">🎙</span>
          <span className="bx-ten">
            <b>MC do AI dẫn</b>
            <small>Nhà cung cấp, model, nhịp và lời dặn thêm của riêng phòng này</small>
          </span>
          <button type="button" className="bx-x" onClick={dong} aria-label="Đóng">
            ✕
          </button>
        </div>
        <div className="bx-tabs" role="tablist">
          {TAB_MC.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              className="bx-tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.nhan}
              {t.id === 'anh' ? <i className="bx-tab-cham" data-bat={ai.anhEnabled} /> : null}
            </button>
          ))}
        </div>
        <div className="bx-than" role="tabpanel">
          {tab === 'chu' ? (
            <>
              <OConfig
                moduleId="mc"
                field={O_NHIP}
                value={ai.everySec}
                disabled={roi}
                onChange={(v) => suaAi('everySec', v)}
              />
              <OConfig
                moduleId="mc"
                field={oNha('provider', 'Kết nối cho phần chữ', 'chat', 'mc', ds, ai.provider)}
                value={ai.provider}
                disabled={roi}
                onChange={(v) => suaAi('provider', v)}
              />
              <OConfig
                moduleId="mc"
                field={oModel('model', 'Model cho phần chữ', 'chat', nhaChu, ds)}
                value={ai.model}
                disabled={roi}
                onChange={(v) => suaAi('model', v)}
              />
              <OConfig
                moduleId="mc"
                field={O_SANG_TAO}
                value={
                  ai.temperature === null || ai.temperature === undefined
                    ? ''
                    : String(ai.temperature)
                }
                disabled={roi}
                onChange={(v) => suaAi('temperature', v === '' ? null : Number(v))}
              />
              <OConfig
                moduleId="mc"
                field={O_TRAN}
                value={ai.maxTokens}
                disabled={roi}
                onChange={(v) => suaAi('maxTokens', v)}
              />
            </>
          ) : null}
          {tab === 'dan' ? (
            <OConfig
              moduleId="mc"
              field={O_DAN}
              value={ai.extra}
              disabled={roi}
              onChange={(v) => suaAi('extra', v)}
            />
          ) : null}
          {tab === 'giong' ? (
            <OConfig
              moduleId="mc"
              field={oChonGiong(O_GIONG_MC, s.voice.cast, ai.voiceId)}
              value={ai.voiceId}
              disabled={roi}
              onChange={(v) => suaAi('voiceId', v)}
            />
          ) : null}
          {/* Vẽ ảnh khai riêng một kết nối: người vận hành thường cắm một nhà
              cho chữ, một nhà cho ảnh — hai thứ ít khi cùng một nơi. */}
          {tab === 'anh' ? (
            <>
              <OConfig
                moduleId="mc"
                field={O_BAT_ANH}
                value={ai.anhEnabled}
                disabled={roi}
                onChange={(v) => suaAi('anhEnabled', v)}
              />
              <OConfig
                moduleId="mc"
                field={oNha('anhProvider', 'Kết nối vẽ ảnh', 'image', 'anh', ds, ai.anhProvider)}
                value={ai.anhProvider}
                disabled={roi || !ai.anhEnabled}
                onChange={(v) => suaAi('anhProvider', v)}
              />
              <OConfig
                moduleId="mc"
                field={oModel('anhModel', 'Model vẽ ảnh', 'image', nhaAnh, ds)}
                value={ai.anhModel}
                disabled={roi || !ai.anhEnabled}
                onChange={(v) => suaAi('anhModel', v)}
              />
              <OConfig
                moduleId="mc"
                field={O_CO_ANH}
                value={ai.anhSize}
                disabled={roi || !ai.anhEnabled}
                onChange={(v) => suaAi('anhSize', v)}
              />
            </>
          ) : null}
        </div>
        <div className="bx-chan2">
          <button type="button" className="bx-xong" onClick={dong}>
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}

const O_SO_NGUOI: ConfigField = {
  key: 'count',
  label: 'Số nhân vật ảo giữ trong phòng',
  short: 'Số người',
  type: 'number',
  min: 1,
  max: 60,
};

/** Thẻ nhân vật ảo. Không phải module và cũng không phải lựa chọn thiết kế:
 *  đây là thứ của chính phiên live, như cài đặt giọng đọc — nó sinh ra sự kiện
 *  chứ không vẽ gì, nên không có chỗ cắm nào để làm module.
 *
 *  Câu họ nói là của thiết kế (`crowd` trong design.json), nên cùng một công
 *  tắc này ở phòng kể chuyện và phòng sàn bar cho ra hai đám đông khác hẳn. */
function TheNhanVatAo() {
  const s = useStage();
  // Chỉ khoá khi mất nối máy chủ: chưa phát vẫn chỉnh được — lệnh áp vào chính phòng của trang (docs/02 §10).
  const roi = !s.noiDuoc;
  const bot = s.bot ?? BOT_MAC_DINH;

  return (
    <article className="bx-the bx-the-ao" data-bat={bot.enabled}>
      <div className="bx-the-dau">
        <span className="bx-icon">🎭</span>
        <span className="bx-ten">
          <b>Nhân vật ảo</b>
          <small>Người xem minh hoạ vào ngồi ghế, bình luận, thả tim cho phòng đỡ trống</small>
        </span>
        <input
          type="checkbox"
          className="bx-cong"
          checked={bot.enabled}
          disabled={roi}
          aria-label="Bật nhân vật ảo"
          onChange={(e) => suaBot('enabled', e.target.checked)}
        />
      </div>
      <div className="bx-the-nhanh">
        <ONhanh
          field={O_SO_NGUOI}
          value={bot.count}
          disabled={roi || !bot.enabled}
          onChange={(v) => suaBot('count', v)}
        />
      </div>
      <p className="bx-the-nhac">
        Họ không tặng quà và không lên bảng top. Tắt thì họ đi ra dần chứ không biến mất một lúc.
      </p>
    </article>
  );
}

/** Bảng xem thử: một ngăn bên phải, cuộn được, mỗi tính năng một thẻ.
 *
 *  Lệnh đi lên bằng kênh `RoomCommand` của hợp đồng, không phải một cửa REST
 *  riêng — cùng đường mà luật tự động và AI sẽ dùng sau này. Nên mọi thay đổi ở
 *  đây tác động thẳng vào phiên đang live, không phải một bản xem trước. */
export function BangXem() {
  const s = useStage();
  const [mo, setMo] = useState(false);
  const [sua, setSua] = useState<{ id: string; o?: string } | null>(null);
  const [suaMc, setSuaMc] = useState(false);
  const [suaKho, setSuaKho] = useState(false);
  const [suaGiong, setSuaGiong] = useState(false);
  const [an] = useState(trongObs);
  const loaiPhong = useLoaiPhong();
  const hop = useHopThietKe();

  if (an) return null;

  // Nút bánh răng cố định ở góc phải trên, lớp 10001 — tức là NẰM TRÊN cả modal.
  // Đang mở modal thì nó đè đúng chỗ nút đóng của modal: hai dấu ✕ chồng nhau,
  // bấm trúng cái ngoài là đóng cả bảng. Mở modal thì giấu nó đi; đóng modal
  // xong nó về chỗ cũ.
  const dangMoModal = sua !== null || suaMc || suaKho || suaGiong;

  return (
    <>
      {dangMoModal ? null : <NutVe />}

      {dangMoModal ? null : (
        <button
          type="button"
          className="bx-nut"
          title={mo ? 'Đóng bảng xem thử' : 'Bật tắt tính năng để xem thử'}
          aria-expanded={mo}
          onClick={() => setMo(!mo)}
        >
          {mo ? '✕' : '⚙'}
        </button>
      )}

      {!mo ? null : (
        <aside className="bx-ngan" aria-label="Xem thử tính năng">
          <div className="bx-ngan-dau">
            <b>Xem thử — ngăn này không lên sóng</b>
            <small>
              {s.live !== null && s.live === s.cuaMinh
                ? 'phòng này đang phát — chỉnh là áp thẳng vào phiên đang live'
                : `phòng này chưa phát — chỉnh thử trước khi lên sóng${s.live === null ? '' : ` (đang phát ${s.live})`}`}
            </small>
          </div>

          <div className="bx-ngan-than">
            {/* Dùng chung lên trên (chỉ còn Kết nối AI), rồi mọi thứ của
                riêng loại phòng này: lựa chọn của thiết kế, MC, nhân vật ảo và
                tính năng. Cùng cách xếp với trang quản lý, để người vận hành
                không phải học hai bố cục. */}
            <h3 className="bx-muc">Tính năng chung</h3>
            <TheKhoAi mo={() => setSuaKho(true)} />
            <TheGiong mo={() => setSuaGiong(true)} />

            {/* Chỉ loại phòng của chính thiết kế này: tính năng của loại khác
                không chạy được ở đây (`hopPhong`), hiện ra chỉ làm rối. */}
            {LOAI_PHONG.filter((p) => p.id === loaiPhong).map((p) => {
              const ds = SO_MODULE.filter((m) => thuocPhong(m.ui, p.id) && hop(m.ui));
              const coMc = thuocPhong(TINH_NANG_HE.mc, p.id);
              const coAo = thuocPhong(TINH_NANG_HE.nhanVatAo, p.id);
              return (
                <div key={p.id} className="bx-muc-phong">
                  <h3 className="bx-muc">Tính năng dành riêng cho “{p.name}”</h3>
                  <TheThietKe />
                  {coMc ? <TheMc mo={() => setSuaMc(true)} /> : null}
                  {coAo ? <TheNhanVatAo /> : null}
                  {ds.length === 0 && !coMc && !coAo ? (
                    <p className="bx-muc-trong">Chưa có tính năng nào riêng cho loại phòng này.</p>
                  ) : (
                    ds.map((m) => (
                      <The
                        key={m.id}
                        id={m.id}
                        mo={(o) => setSua(o === undefined ? { id: m.id } : { id: m.id, o })}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>

          <p className="bx-ngan-chan">
            Bấm vào thẻ để cấu hình đầy đủ. Mọi thay đổi tác động thẳng vào phiên đang live.
          </p>

          {sua === null ? null : (
            <Modal
              key={`${sua.id}/${sua.o ?? ''}`}
              {...sua}
              dong={() => setSua(null)}
              moGiong={() => {
                setSua(null);
                setSuaGiong(true);
              }}
            />
          )}
          {!suaMc ? null : <ModalMc dong={() => setSuaMc(false)} />}
          {!suaKho ? null : <ModalKho dong={() => setSuaKho(false)} />}
          {!suaGiong ? null : <ModalGiong dong={() => setSuaGiong(false)} />}
        </aside>
      )}
    </>
  );
}
