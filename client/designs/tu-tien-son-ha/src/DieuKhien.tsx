/** Thanh điều khiển của người vận hành — đứng sát BÊN PHẢI khung 1080×1920 (ngoài khung), không vẽ khi mở
 *  trong OBS. Để soát lịch từng màn:
 *  - ⏸ Tạm dừng: giữ nguyên màn đang chạy (màn vẫn chạy, hết giờ thì lặp lại, lịch không chen vào).
 *  - ▶ Chạy tiếp: tự căn theo giờ thật — đang tới khung lịch nào thì chạy khung đó.
 *  - ⏭ Màn kế: sự kiện sắp tới theo lịch chạy ngay (tới giờ thật của nó không chạy lại).
 *  - Nhảy tới…: chạy ngay một màn bất kỳ và GIỮ luôn màn đó (không tự chuyển) tới khi bấm ▶ Chạy tiếp.
 *  - ✨ Cơ duyên…: mở ngay sự kiện cơ duyên (Cơ Duyên Giáng Thế / Linh Thảo Nở Rộ) lúc đang tu luyện. */

import { useState } from 'react';
import { hinhMuc, lichSapToi, ME_LOAI, pheTuLuyen, TEN_SK_TL, tenMuc, type The } from './loi/core';
import { tiThiMo } from './loi/loi-dai';
import { PHE } from './loi/the-gioi';

const TEN_PHA: Partial<Record<The['pha']['k'], string>> = {
  cho: '🧘 Tu luyện',
  hoi: '🧘 Tu luyện · câu hỏi',
  dap: '🧘 Tu luyện · đáp án',
  kiep: '⚡ Lôi Kiếp',
  'kiep-ket': '⚡ Lôi Kiếp · kết',
  nm: '🚪 Thử Thách Nhập Môn',
  'nm-ket': '🚪 Nhập Môn · kết',
  me: '🏺 Tranh Đoạt Bảo Vật',
  'me-ket': '🏺 Bảo Vật · kết',
  yeu: '👹 Đánh boss',
  'yeu-ket': '👹 Boss · kết',
  lu: '⚔️ Nước Dâng Đoạt Mị Nương',
  'lu-ket': '⚔️ Đoạt Mị Nương · kết',
  tt: '🏯 Thành Trì Tự Do',
  'mua-ket': '🏆 Tổng kết năm',
};

const phutGiay = (ms: number) => {
  const g = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(g / 60)}:${String(g % 60).padStart(2, '0')}`;
};

export function DieuKhien({
  the,
  now,
  ben,
  batDung,
  ke,
  toi,
  coDuyen,
}: {
  the: The;
  now: number;
  /** Khung sân khấu trên trang: thanh đứng sát cạnh phải khung. */
  ben: DOMRect | null;
  batDung: () => void;
  ke: () => void;
  /** Nhảy tới mục thứ i của lịch; −1 là tổng kết năm, −2 là tu luyện, −3 là tỉ thí tông môn (Lôi Đài), −4 / −5 là Nhập Môn một cửa Sơn / Thủy Tông, −6 / −7 tu luyện Sơn / Thủy, −8 / −9 tỉ thí Sơn / Thủy, −10 / −11 Đan Các · Tàng Kinh Các Sơn / Thủy, −101…−1NN / −201…−2NN Tranh Đoạt Sơn / Thủy mê cung 1…N. */
  toi: (i: number) => void;
  /** Mở ngay một sự kiện trong kho sự kiện (theo id; chỉ chạy lúc đang tu luyện). */
  coDuyen: (id: string) => void;
}) {
  const p = the.pha;
  const ds = the.chuoi.ds;
  const theoGio = ds.length > 0 && ds.every((m) => m.batDau >= 0);
  const sap = lichSapToi(the, now, 1)[0];
  const phutGio = theoGio ? Math.floor(((((now - the.chuoiGoc) % 3_600_000) + 3_600_000) % 3_600_000) / 60_000) : null;
  const tuLuyen = p.k === 'cho' || p.k === 'hoi' || p.k === 'dap';
  // Đang có trận Lôi Đài thì đó là màn Tỉ Thí riêng, không ghi "Tu luyện".
  const ten =
    tuLuyen && the.loiDai !== null && tiThiMo(the)
      ? `🏯 Tỉ Thí Lôi Đài · ${PHE[the.loiDai.phe].tenNgan}`
      : (TEN_PHA[p.k] ?? p.k) + (tuLuyen ? ` · ${PHE[pheTuLuyen(the, now).phe].tenNgan}` : '');
  const vi = ben === null ? { left: 12, top: 12 } : { left: Math.round(ben.right + 12), top: Math.round(ben.top + 12) };
  const [moNhay, setMoNhay] = useState(false);
  const [tab, setTab] = useState<'son' | 'chung' | 'thuy'>('chung');
  const chon = (i: number) => {
    setMoNhay(false);
    toi(i);
  };
  // Mục của từng tab: tab Sơn / Thủy nhắm đúng tông (mỗi tông một nick live) để dễ soát; tab Chung là lịch chung.
  const TAB = {
    son: [
      { i: -6, chu: '🧘 Tu luyện · Sơn Tông' },
      { i: -8, chu: '🏯 Tỉ thí Lôi Đài · Sơn Tông' },
      { i: -4, chu: '🚪 Nhập Môn một cửa · Sơn Tông' },
      { i: -10, chu: '🏯 Đan Các · Tàng Kinh Các · Sơn Tông' },
      ...ME_LOAI.son.map((m, k) => ({ i: -(101 + k), chu: `🏺 Tranh Đoạt · Mê cung ${k + 1} · ${m.ten}` })),
    ],
    thuy: [
      { i: -7, chu: '🧘 Tu luyện · Thủy Tông' },
      { i: -9, chu: '🏯 Tỉ thí Lôi Đài · Thủy Tông' },
      { i: -5, chu: '🚪 Nhập Môn một cửa · Thủy Tông' },
      { i: -11, chu: '🏯 Đan Các · Tàng Kinh Các · Thủy Tông' },
      ...ME_LOAI.thuy.map((m, k) => ({ i: -(201 + k), chu: `🏺 Tranh Đoạt · Mê cung ${k + 1} · ${m.ten}` })),
    ],
    chung: [
      { i: -2, chu: '🧘 Tu luyện (giữa các mốc)' },
      { i: -3, chu: '🏯 Tỉ thí (tông đang tới lượt)' },
      ...ds.map((m, i) => ({ i, chu: `${m.batDau >= 0 ? `:${String(m.batDau).padStart(2, '0')} ` : ''}${hinhMuc(m)} ${tenMuc(m)}` })),
      { i: -1, chu: ':58 🏆 Tổng kết năm' },
    ],
  };
  return (
    <div className={`sh-dk${the.giu ? ' giu' : ''}`} style={vi} onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="sh-dk-dung" onClick={batDung} title="Giữ màn đang chạy / chạy tiếp theo giờ thật">
        {the.giu ? '▶ Chạy tiếp' : '⏸ Tạm dừng'}
      </button>
      <button type="button" onClick={ke} title="Cắt màn đang chạy, sang ngay sự kiện kế theo lịch">
        ⏭ Màn kế
      </button>
      <button type="button" className="sh-dk-nhay" onClick={() => setMoNhay(true)} title="Chọn màn để chạy ngay (chia tab Sơn / Chung / Thủy)">
        Nhảy tới… ▾
      </button>
      {moNhay ? (
        <div className="sh-dk-modal" onClick={() => setMoNhay(false)}>
          <div className="sh-dk-hop" onClick={(e) => e.stopPropagation()}>
            <header>
              <b>Nhảy tới</b>
              <button type="button" className="dong" onClick={() => setMoNhay(false)} title="Đóng">
                ✕
              </button>
            </header>
            <nav>
              {(
                [
                  ['son', '⛰️ Sơn Tông'],
                  ['chung', 'Chung'],
                  ['thuy', '🌊 Thủy Tông'],
                ] as const
              ).map(([k, chu]) => (
                <button type="button" key={k} className={`${k}${tab === k ? ' chon' : ''}`} onClick={() => setTab(k)}>
                  {chu}
                </button>
              ))}
            </nav>
            <ul className={tab}>
              {TAB[tab].map((m) => (
                <li key={m.i}>
                  <button type="button" onClick={() => chon(m.i)}>
                    {m.chu}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      <select
        value=""
        disabled={!tuLuyen}
        title={tuLuyen ? 'Mở ngay một sự kiện cơ duyên' : 'Chỉ mở được lúc đang tu luyện'}
        onChange={(e) => {
          if (e.target.value !== '') coDuyen(e.target.value);
        }}
      >
        <option value="">✨ Cơ duyên…</option>
        {the.khoSuKien.map((m) => (
          <option key={m.id} value={m.id}>
            {m.hinh} {m.ten} · gõ {TEN_SK_TL[m.loai].go}
          </option>
        ))}
      </select>
      <div className="sh-dk-tin">
        {the.giu ? <b className="sh-dk-giu">⏸ ĐANG GIỮ MÀN · bấm ▶ để chạy theo lịch</b> : null}
        {phutGio !== null ? (
          <span>
            Giờ lịch: <b>:{String(phutGio).padStart(2, '0')}</b>
          </span>
        ) : null}
        <span>
          Đang: <b>{ten}</b>
        </span>
        {!tuLuyen && 'den' in p && p.k !== 'lu' ? <span>còn {phutGiay(p.den - now)}{the.giu ? ' (lặp lại)' : ''}</span> : null}
        {tuLuyen ? (
          <span>
            Cơ duyên:{' '}
            <b>
              {the.tat.coDuyen
                ? 'đang tắt'
                : the.skTl !== null && now < the.skTl.den
                  ? `${the.skTl.ten} · còn ${phutGiay(the.skTl.den - now)}`
                  : `sau ${phutGiay(the.skTlKe - now)}`}
            </b>
          </span>
        ) : null}
        {sap !== undefined && !the.giu ? (
          <span>
            Kế: <b>
              {sap.hinh} {sap.ten}
            </b>{' '}
            · sau {phutGiay(sap.luc - now)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
