import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Bot, Eye, EyeOff, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import {
  KIEU_LAM_DUOC,
  MAU_NHA,
  TEN_KIEU,
  VIEC_AI,
  batViec,
  chonMau,
  doiKieu,
  loiNhap,
  nanId,
  nhapMoi,
  nhapTu,
  tenKetNoi,
  thanGhi,
} from '@live/contracts';
import type { KieuNha, NhapKetNoi } from '@live/contracts';
import { api } from '../lib/api';
import type { AiUse, ProviderInfo } from '../lib/api';
import { Dialog, DialogBody, DialogClose, DialogTrigger } from './ui/dialog';

/** Kho kết nối AI dùng chung.
 *
 *  Cùng cơ chế với modal Kết nối AI trên sân khấu: bảng danh sách (số thứ tự,
 *  tên, nút sửa), bấm Sửa mới mở form của dòng đó, "+ Thêm kết nối" mở form
 *  trống để tạo bản ghi mới. Một kết nối = provider + tên + địa chỉ + khoá, và
 *  những việc nó làm (chat, ảnh, giọng đọc…) mỗi việc một model. Tính năng nào
 *  cần AI thì chọn kết nối theo tên rồi tự giữ tham số riêng của nó.
 *
 *  Luật chung — mẫu provider, việc nào provider nào làm được, nắn tên, báo
 *  trùng — nằm ở `@live/contracts` (ket-noi-ai.ts), không chép ở đây. */

export const TAB_AI: readonly { id: AiUse; ten: string; goiY: string }[] = VIEC_AI.map((v) => ({
  ...v,
  goiY: {
    chat: 'Người dẫn do AI, nhờ AI viết nội dung.',
    image: 'Nhờ AI vẽ ảnh cho khung chiếu.',
    tts: 'Dàn giọng đọc to lời dẫn và lời chào.',
    video: 'Chưa có tính năng nào dùng — khai sẵn được, bật lên khi có.',
  }[v.id],
}));

interface Props {
  onToast(text: string, loi?: boolean): void;
  /** Việc của chỗ mở hộp này. Kết nối mới tạo từ đây bật sẵn việc đó. */
  tab?: AiUse;
  trigger: ReactNode;
  /** Kho vừa đổi — chỗ gọi tải lại danh sách để ô chọn thấy kết nối mới. */
  onDoi?(ds: ProviderInfo[]): void;
  /** Mở sẵn ngay khi dựng. Bảng xem thử trên sân khấu mở trang này kèm
   *  `?kho=…` để người vận hành bấm một nhát là tới đúng chỗ cắm khoá. */
  moNgay?: boolean;
}

export function AiKhoDialog({ onToast, tab, trigger, onDoi, moNgay = false }: Props) {
  const [mo, setMo] = useState(moNgay);
  const [ds, setDs] = useState<ProviderInfo[]>([]);
  /** Form chỉ hiện khi đã chọn việc. */
  const [moForm, setMoForm] = useState(false);
  /** Id kết nối đang sửa; null là đang tạo mới. */
  const [suaId, setSuaId] = useState<string | null>(null);
  const [n, setN] = useState<NhapKetNoi>(() => nhapMoi(tab));
  const [hienKhoa, setHienKhoa] = useState(false);
  const [bao, setBao] = useState('');
  const oTen = useRef<HTMLInputElement>(null);
  /** Id đang mở, đọc được trong callback tải khoá. */
  const dangSua = useRef<string | null>(null);

  const tai = (): void => {
    void (async () => {
      try {
        const kq = await api.secrets();
        setDs(kq.providers);
        onDoi?.(kq.providers);
      } catch (e) {
        onToast(e instanceof Error ? e.message : 'không đọc được kho AI', true);
      }
    })();
  };

  useEffect(() => {
    if (!mo) return;
    setMoForm(false);
    setBao('');
    tai();
    // Mỗi lần mở là đọc lại: kho có thể vừa đổi từ cửa sổ khác.
  }, [mo]);

  const daCo = suaId === null ? undefined : ds.find((p) => p.id === suaId);

  const themMoi = (): void => {
    setMoForm(true);
    setSuaId(null);
    dangSua.current = null;
    setN(nhapMoi(tab));
    setHienKhoa(false);
    setBao('');
    setTimeout(() => oTen.current?.focus(), 0);
  };

  /** Mở một kết nối cũ. Khoá không điền được — máy chủ không bao giờ trả giá
   *  trị — nên để trống, nghĩa là giữ. */
  const moLai = (p: ProviderInfo): void => {
    setMoForm(true);
    setSuaId(p.id);
    dangSua.current = p.id;
    setN(nhapTu(p));
    setHienKhoa(false);
    setBao('');
    if (!p.hasKey) return;
    // Khoá đã cắm hiện sẵn dưới dạng chấm, bấm con mắt là thấy lại. Bấm sang
    // dòng khác hay đã gõ khoá mới thì bỏ kết quả.
    void api.secretKey(p.id).then(
      ({ key }) => {
        if (key === '' || dangSua.current !== p.id) return;
        setN((cu) => (cu.key === '' ? { ...cu, key } : cu));
      },
      () => {},
    );
  };

  const luu = (): void => {
    const loi = loiNhap(n, ds, suaId);
    if (loi !== null) {
      setBao(loi);
      return;
    }
    const id = suaId ?? nanId(n.name);
    void (async () => {
      try {
        const kq = await api.setSecret(id, thanGhi(n));
        // Vừa tạo xong thì form chuyển sang sửa chính bản ghi đó.
        setSuaId(kq.provider.id);
        setN((cu) => ({ ...cu, key: '' }));
        setBao('');
        onToast(`Đã lưu “${n.name.trim()}”`);
        tai();
      } catch (e) {
        setBao(e instanceof Error ? e.message : 'không lưu được');
      }
    })();
  };

  const xoa = (): void => {
    if (daCo === undefined) return;
    if (!window.confirm(`Xoá hẳn “${tenKetNoi(daCo)}” cùng khoá của nó?`)) return;
    void (async () => {
      try {
        await api.delSecret(daCo.id);
        onToast(`Đã xoá ${tenKetNoi(daCo)}`);
        setMoForm(false);
        setSuaId(null);
        tai();
      } catch (e) {
        onToast(e instanceof Error ? e.message : 'không xoá được', true);
      }
    })();
  };

  const lamDuoc = KIEU_LAM_DUOC[n.kind];

  return (
    <Dialog open={mo} onOpenChange={setMo}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogBody
        size="lg"
        icon={<Bot size={15} />}
        title="Kết nối AI"
        desc="Nhập khoá một lần, dùng chung cho mọi tính năng. Mỗi tính năng tự chọn kết nối, model và tham số của riêng nó. Khoá nằm ở máy chủ; form sửa hiện sẵn dạng chấm, bấm con mắt để xem."
        foot={<DialogClose className="btn btn-gold">Xong</DialogClose>}
      >
        <div className="ai-dau">
          <b>Kết nối đang có</b>
          <button type="button" className="btn" onClick={themMoi}>
            <Plus size={14} />
            Thêm kết nối
          </button>
        </div>

        <div className="ai-bang-cuon">
          <table className="ai-bang">
            <thead>
              <tr>
                <th className="ai-stt">#</th>
                <th>Tên</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {ds.length === 0 ? (
                <tr>
                  <td colSpan={3} className="ai-trong">
                    Chưa có kết nối nào. Bấm “Thêm kết nối” để cắm khoá đầu tiên.
                  </td>
                </tr>
              ) : null}
              {ds.map((p, i) => (
                <tr key={p.id} data-dang={moForm && p.id === suaId}>
                  <td className="ai-stt">{i + 1}</td>
                  <td>
                    <b>{tenKetNoi(p)}</b>
                  </td>
                  <td className="ai-nut">
                    <button
                      type="button"
                      className="btn btn-icon"
                      title={`Sửa ${tenKetNoi(p)}`}
                      aria-label={`Sửa kết nối ${tenKetNoi(p)}`}
                      onClick={() => moLai(p)}
                    >
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!moForm ? null : (
          <section className="ai-form">
            <div className="ai-dau">
              <b>{daCo === undefined ? 'Kết nối mới' : `Sửa “${tenKetNoi(daCo)}”`}</b>
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                aria-label="Đóng form"
                onClick={() => setMoForm(false)}
              >
                <X size={14} />
              </button>
            </div>

            <label className="ai-o">
              <span>Provider</span>
              <select
                className="input"
                value={n.mau}
                aria-label="Nhà cung cấp"
                onChange={(e) => setN(chonMau(n, e.target.value, tab))}
              >
                {MAU_NHA.map((m) => (
                  <option key={m.ma} value={m.ma}>
                    {m.ten}
                  </option>
                ))}
              </select>
            </label>
            {n.mau !== 'khac' ? null : (
              <label className="ai-o">
                <span>Giao thức</span>
                <select
                  className="input"
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
            <label className="ai-o">
              <span>Tên ngắn</span>
              <input
                ref={oTen}
                className="input"
                value={n.name}
                placeholder="người dẫn"
                aria-label="Tên ngắn của kết nối"
                onChange={(e) => setN({ ...n, name: e.target.value })}
              />
            </label>
            <label className="ai-o">
              <span>Địa chỉ</span>
              <input
                className="input"
                value={n.baseUrl}
                placeholder="trống là địa chỉ gốc của nhà"
                aria-label="Địa chỉ nhà cung cấp"
                onChange={(e) => setN({ ...n, baseUrl: e.target.value })}
              />
            </label>
            <label className="ai-o">
              <span>Khoá</span>
              <span className="ai-khoa">
                <input
                  className="input"
                  type={hienKhoa ? 'text' : 'password'}
                  autoComplete="off"
                  value={n.key}
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
                  className="btn btn-icon"
                  aria-label={hienKhoa ? 'Giấu khoá' : 'Hiện khoá'}
                  aria-pressed={hienKhoa}
                  onClick={() => setHienKhoa(!hienKhoa)}
                >
                  {hienKhoa ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </span>
            </label>

            <div className="ai-o">
              <span>Dùng cho</span>
              <div className="ai-viec">
                {VIEC_AI.map((v) => {
                  const bat = n.uses.includes(v.id);
                  // Việc giao thức không làm được vẫn hiện, chỉ mờ đi và nói vì
                  // sao — ẩn hẳn thì trông như provider này thiếu cấu hình.
                  const duoc = lamDuoc.includes(v.id);
                  return (
                    <div className="ai-viec-dong" key={v.id}>
                      <label className="ai-tick" data-tat={!duoc}>
                        <input
                          type="checkbox"
                          checked={bat}
                          disabled={!duoc}
                          onChange={(e) => setN(batViec(n, v.id, e.target.checked))}
                        />
                        {v.ten}
                      </label>
                      {!duoc ? (
                        <small className="ai-khong">{TEN_KIEU[n.kind]} không hỗ trợ</small>
                      ) : !bat ? null : (
                        <input
                          className="input input-xs"
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

            {bao === '' ? null : <p className="ai-bao">{bao}</p>}

            <div className="ai-nut-form">
              {daCo === undefined ? null : (
                <button type="button" className="btn" onClick={xoa}>
                  <Trash2 size={14} />
                  Xoá
                </button>
              )}
              <button type="button" className="btn btn-gold" onClick={luu}>
                <Save size={14} />
                {daCo === undefined ? 'Thêm kết nối' : 'Lưu kết nối'}
              </button>
            </div>
            <p className="hint">
              Gọi theo <b>{TEN_KIEU[n.kind]}</b>.
            </p>
          </section>
        )}
      </DialogBody>
    </Dialog>
  );
}
