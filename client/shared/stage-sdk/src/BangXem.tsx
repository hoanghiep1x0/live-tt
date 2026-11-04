import { useState } from 'react';
import { LOAI_PHONG } from '@live/contracts';
import type { ConfigField, Json } from '@live/contracts';
import { AI_MAC_DINH, BOT_MAC_DINH } from './state';
import { ONhanh, OConfig } from './OConfig';
import { SO_MODULE, timDangKy } from './registry';
import { guiLenh } from './state';
import { useLuaChonThietKe, useStage, useThietKe } from './Stage';
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

function oNhanhCua(fields: readonly ConfigField[], quick: readonly string[]): ConfigField[] {
  return quick
    .map((k) => fields.find((f) => f.key === k))
    .filter((f): f is ConfigField => f !== undefined);
}

/** Modal cấu hình đầy đủ của một tính năng, dựng từ `fields` của manifest.
 *
 *  Không có nút "Lưu": mỗi ô đổi là đẩy thẳng xuống phiên đang live ngay, y như
 *  trang quản lý. Giữ một nút Lưu ở đây chỉ tạo cảm giác an toàn giả. */
function Modal({ id, dong }: { id: string; dong: () => void }) {
  const s = useStage();
  const dk = timDangKy(id);
  if (dk === undefined) return null;

  const ui = dk.ui;
  const cfg = cauHinhCua(id, s.config[id]);
  const roi = s.live === null;

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
            <b>{ui.name}</b>
            <small>{ui.summary}</small>
          </span>
          <button type="button" className="bx-x" onClick={dong} aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="bx-than">
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

          {ui.fields.map((f) => (
            <OConfig
              key={f.key}
              moduleId={id}
              field={f}
              value={cfg[f.key] ?? null}
              disabled={roi}
              onChange={(v) => suaCauHinh(id, f.key, v)}
            />
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
function The({ id, mo }: { id: string; mo: () => void }) {
  const s = useStage();
  const dk = timDangKy(id);
  if (dk === undefined) return null;

  const ui = dk.ui;
  const cfg = cauHinhCua(id, s.config[id]);
  const bat = s.enabled.includes(id);
  const roi = s.live === null;
  const nhanh = oNhanhCua(ui.fields, ui.quick ?? []);

  return (
    <article className="bx-the" data-bat={bat}>
      {/* Cả mặt thẻ là một nút phủ lên, nằm dưới các ô chỉnh nhanh: bấm chỗ
          trống thì mở modal, bấm trúng ô thì chỉnh ngay tại chỗ. */}
      <button type="button" className="bx-cham" aria-label={`Cấu hình ${ui.name}`} onClick={mo} />

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
          {nhanh.map((f) => (
            <ONhanh
              key={f.key}
              field={f}
              value={cfg[f.key] ?? null}
              disabled={roi}
              onChange={(v) => suaCauHinh(id, f.key, v)}
            />
          ))}
        </div>
      )}
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
  if (luaChon.length === 0) return null;
  const roi = s.live === null;

  return (
    <article className="bx-the bx-the-thietke" data-bat="true">
      <div className="bx-the-dau">
        <span className="bx-icon">🖼</span>
        <span className="bx-ten">
          <b>Khung phòng</b>
          <small>Lựa chọn của riêng thiết kế này, không phải tính năng</small>
        </span>
      </div>
      <div className="bx-the-nhanh">
        {luaChon.map((o) => (
          <ONhanh
            key={o.key}
            field={o}
            value={cfg[o.key] ?? null}
            disabled={roi}
            onChange={(v) => suaThietKe(o.key, v)}
          />
        ))}
      </div>
    </article>
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
  label: 'Mấy giây MC xem lại phòng một lượt',
  short: 'Nhịp (giây)',
  type: 'number',
  min: 10,
  max: 300,
  unit: 'giây',
};

const O_MODEL: ConfigField = {
  key: 'model',
  label: 'Model',
  short: 'Model',
  type: 'select',
  options: [
    { value: 'claude-opus-5-5', label: 'Opus 5.5 — giỏi nhất, đắt nhất' },
    { value: 'claude-sonnet-5-5', label: 'Sonnet 5.5 — cân bằng' },
    { value: 'claude-haiku-5-5', label: 'Haiku 5.5 — nhanh, rẻ' },
  ],
};

const O_DAN: ConfigField = {
  key: 'extra',
  label: 'Lời dặn thêm cho MC',
  type: 'textarea',
  hint: 'Ghép sau lời dặn gốc. Ví dụ: tên phòng, chủ đề tối nay, điều cần tránh',
};

/** Thẻ MC do AI dẫn.
 *
 *  Khoá API KHÔNG có ở đây và không bao giờ đi qua đây: nó nằm trong kho khoá
 *  của backend (nhà cung cấp "mc"), thêm ở trang quản lý. Bản cũ để khoá trong
 *  localStorage của trang đang live — đúng cái trang mà OBS đang thu. */
function TheMc({ mo }: { mo: () => void }) {
  const s = useStage();
  const roi = s.live === null;
  const ai = s.ai ?? AI_MAC_DINH;

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
          field={O_MODEL}
          value={ai.model}
          disabled={roi || !ai.enabled}
          onChange={(v) => suaAi('model', v)}
        />
      </div>
      <p className="bx-the-nhac">
        Khoá API đặt ở trang quản lý, nhà cung cấp “mc”. Khoá không bao giờ rời máy chủ.
      </p>
    </article>
  );
}

/** Modal lời dặn thêm cho MC. Textarea dài nên không nhét lên thẻ được. */
function ModalMc({ dong }: { dong: () => void }) {
  const s = useStage();
  const ai = s.ai ?? AI_MAC_DINH;
  const roi = s.live === null;

  return (
    <div className="bx-tam" role="dialog" aria-modal aria-label="MC do AI dẫn">
      <div className="bx-modal">
        <div className="bx-dau2">
          <span className="bx-icon">🎙</span>
          <span className="bx-ten">
            <b>MC do AI dẫn</b>
            <small>Lời dặn gốc đã có sẵn; đây là phần dặn thêm của riêng phòng</small>
          </span>
          <button type="button" className="bx-x" onClick={dong} aria-label="Đóng">
            ✕
          </button>
        </div>
        <div className="bx-than">
          <OConfig
            moduleId="mc"
            field={O_NHIP}
            value={ai.everySec}
            disabled={roi}
            onChange={(v) => suaAi('everySec', v)}
          />
          <OConfig
            moduleId="mc"
            field={O_MODEL}
            value={ai.model}
            disabled={roi}
            onChange={(v) => suaAi('model', v)}
          />
          <OConfig
            moduleId="mc"
            field={O_DAN}
            value={ai.extra}
            disabled={roi}
            onChange={(v) => suaAi('extra', v)}
          />
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
  const roi = s.live === null;
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
  const [sua, setSua] = useState<string | null>(null);
  const [suaMc, setSuaMc] = useState(false);
  const [an] = useState(trongObs);

  if (an) return null;

  // Nút bánh răng cố định ở góc phải trên, lớp 10001 — tức là NẰM TRÊN cả modal.
  // Đang mở modal thì nó đè đúng chỗ nút đóng của modal: hai dấu ✕ chồng nhau,
  // bấm trúng cái ngoài là đóng cả bảng. Mở modal thì giấu nó đi; đóng modal
  // xong nó về chỗ cũ.
  const dangMoModal = sua !== null || suaMc;

  return (
    <>
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
            <small>{s.live === null ? 'chưa phát phòng nào' : `đang phát ${s.live}`}</small>
          </div>

          <div className="bx-ngan-than">
            {/* Dùng chung lên trên, đặc thù từng loại phòng xuống dưới — cùng
                cách xếp với trang quản lý, để người vận hành không phải học
                hai bố cục. */}
            <TheThietKe />
            <TheMc mo={() => setSuaMc(true)} />
            <TheNhanVatAo />

            <h3 className="bx-muc">Chỉnh nhanh</h3>
            {SO_MODULE.filter((m) => m.ui.room === undefined).map((m) => (
              <The key={m.id} id={m.id} mo={() => setSua(m.id)} />
            ))}

            {LOAI_PHONG.map((p) => {
              const ds = SO_MODULE.filter((m) => m.ui.room === p.id);
              return (
                <div key={p.id} className="bx-muc-phong">
                  <h3 className="bx-muc">Tính năng dành riêng cho “{p.name}”</h3>
                  {ds.length === 0 ? (
                    <p className="bx-muc-trong">Chưa có tính năng nào riêng cho loại phòng này.</p>
                  ) : (
                    ds.map((m) => <The key={m.id} id={m.id} mo={() => setSua(m.id)} />)
                  )}
                </div>
              );
            })}
          </div>

          <p className="bx-ngan-chan">
            Bấm vào thẻ để cấu hình đầy đủ. Mọi thay đổi tác động thẳng vào phiên đang live.
          </p>

          {sua === null ? null : <Modal id={sua} dong={() => setSua(null)} />}
          {!suaMc ? null : <ModalMc dong={() => setSuaMc(false)} />}
        </aside>
      )}
    </>
  );
}
