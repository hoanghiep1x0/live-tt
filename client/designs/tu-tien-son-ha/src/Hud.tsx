/** Chữ trên màn: tên game, thế trận, thẻ sự kiện, bảng tu vi, hương hỏa, sử thi.
 *  Vẽ lại vài lần mỗi giây từ trạng thái lõi; không giữ luật chơi nào ở đây. */

import { CungPhung, QuaBien, QuaGap, TinHanhVi } from './QuaBien';
import { BangChieuDai, BangTop, ChuGiua, GoSo, LoiDaiThe, QuayTuLuyen, SuKienTl } from './TuLuyenVui';
import { BangQuaDoi } from './QuaDoi';
import { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AO, CONG_PHAP, DAN, dongMon, PET, SO_MON, TEN_LOAI, type LoaiMa } from './loi/tang-bao';
import { BangDaiChien, HuongDanPk, SanDaiChien, TanTuDc } from './DaiChien';
import { DotPha, TranhCanh } from './DotPha';
import { HinhDo, TuyetKy, VinhDanh, type NoiBat } from './NoiBat';
import { BannerTran } from './TranPhap';
import { PHAM, O_TRANG_BI, tenDo } from './loi/trang-bi';
import {
  bangHuong,
  bangTuVi,
  capTran,
  congThu,
  duLinhKhi,
  hoPhapCan,
  soHoPhap,
  soNpc,
  tenVo,
  pheTuLuyen,
  dangChoi,
  tongLuc,
  demPhe,
  suKienKe,
  tenCanh,
  tienDo,
  type NguoiChoi,
  type The,
} from './loi/core';
import { HOI_THI_SO_CAU, kieuMe, KH_LK, KH_THACH, lichSapToi, QUA_ME_XU } from './loi/core';
import { tiThiMo } from './loi/loi-dai';
import { CANH_GIOI, CAN_CO, LINH_VAT, PHE, SO_DO_CHIEU, YEU, chucVu, TRAN_TU, type LoaiChieuYeu, type Phe } from './loi/the-gioi';

const ABC = ['A', 'B', 'C'] as const;
/** Thẻ nổi lúc tu luyện: MỖI LÚC CHỈ MỘT BẢNG, cứ THE_NOI_LUOT (15 giây) đổi bảng một lần (hiện THE_NOI_HIEN rồi
 *  trượt đi). Lượt chẵn luôn là **Top Linh Thạch** (phải) — trùng đúng lúc quầy phía trên đổi sang Đan Các / Tàng
 *  Kinh Các (`QUAY_DOI` = 2 lượt), để người xem biết mình có bao nhiêu linh thạch mà mua. Lượt lẻ lần lượt: quà tặng
 *  quy đổi (trái) → Chơi nhanh · gõ số (phải) → Top Lôi Đài (trái) → một bảng tin (phải; mỗi chu kỳ một loại: Bảng
 *  Tu Vi / Cung Phụng / Lịch trình). Đang có sự kiện tu luyện thì thẻ sự kiện thế chỗ các lượt lẻ. Gõ 8 xem Top Lôi
 *  Đài thì bảng đó hiện ngay, một mình. */
const THE_NOI_LUOT = 15_000;
const THE_NOI_CHU_KY = 8 * THE_NOI_LUOT;
const THE_NOI_HIEN = 13_500;
const LV = new Map(LINH_VAT.map((l) => [l.id, l]));

function dongHo(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Anh({ n, anh, co }: { n: NguoiChoi; anh: ReadonlyMap<string, string>; co: number }) {
  const url = anh.get(n.user);
  const mau = n.phe === null ? '#888' : PHE[n.phe].mauSang;
  return (
    <span className="sh-anh" style={{ width: co, height: co, boxShadow: `0 0 0 3px ${mau}, 0 0 14px ${CANH_GIOI[n.canh]!.hao}` }}>
      {url ? <img src={url} alt="" referrerPolicy="no-referrer" /> : <b style={{ fontSize: co * 0.48 }}>{(n.ten.trim()[0] ?? '?').toUpperCase()}</b>}
    </span>
  );
}

/** Dòng buff trên thẻ yêu tinh: người được đồng môn thả tim tiếp sức nhiều nhất (mỗi tông một người). */
function BuffYeu({ the, p, now }: { the: The; p: Extract<The['pha'], { k: 'yeu' }>; now: number }) {
  const ds = [...p.buff.entries()]
    .filter(([, b]) => b.den > now)
    .sort((a, b) => b[1].so - a[1].so)
    .slice(0, 2);
  const nga = p.nga.size;
  if (ds.length === 0 && nga === 0) return null;
  return (
    <p className="sh-yeu-buff">
      {ds.map(([u, b]) => {
        const n = the.nguoi.get(u);
        return (
          <span key={u} className={n?.phe ?? ''}>
            💪 <b>{n?.ten ?? u}</b> +{b.so}% sức · {b.nguoi.size} người tiếp sức
          </span>
        );
      })}
      {nga > 0 ? <span className="nga">🩸 {nga} người ngã — thả tim!</span> : null}
    </p>
  );
}

/** Chiêu lớn của yêu tinh: việc phải làm khi báo, chữ khi đỡ được / không đỡ. */
const CHIEU_VIEC: Record<LoaiChieuYeu, { go: string; do: string; trung: string }> = {
  quet: { go: 'thủ', do: 'Đỡ trọn!', trung: 'trúng' },
  choang: { go: 'hồi', do: 'Giải được!', trung: 'choáng' },
  giap: { go: 'phá', do: 'Vỡ giáp!', trung: 'Giáp cứng' },
  hut: { go: 'công', do: 'Cắt đứt!', trung: 'Hồi máu' },
};

/** Chữ to giữa màn khi yêu tinh tụ chiêu lớn: tên chiêu, số cần gõ, đếm ngược; ra đòn xong thì đỡ được hay trúng. */
function BaoChieu({ p, now }: { p: Extract<The['pha'], { k: 'yeu' }>; now: number }) {
  if (p.bao !== null) {
    const c = p.bao.chieu;
    const con = Math.max(1, Math.ceil((p.bao.den - now) / 1000));
    return (
      <div className="sh-bao-chieu" key={p.bao.luc}>
        <small>⚠ {YEU[p.yeu].ten.split(' ').slice(0, 2).join(' ')} tụ chiêu</small>
        <b>{c.ten}</b>
        <span>
          Gõ <kbd>{SO_DO_CHIEU[c.loai]}</kbd> {CHIEU_VIEC[c.loai].go} <i>{con}s</i>
        </span>
        {p.bao.do.length > 0 ? <em>{p.bao.do.map((x) => PHE[x].tenNgan).join(' · ')} đã đỡ ✓</em> : null}
      </div>
    );
  }
  const l = p.lonCuoi;
  if (l === null || now - l.luc > 2_200) return null;
  const v = CHIEU_VIEC[l.chieu.loai];
  const doHet = l.doPhe.length > 0 && (l.chieu.loai === 'giap' || l.chieu.loai === 'hut' || l.trung.length === 0);
  return (
    <div className={`sh-bao-chieu xong${doHet ? ' do' : ' trung'}`} key={l.luc}>
      <b>{doHet ? `🛡 ${v.do}` : `💥 ${l.chieu.ten}`}</b>
      <span>
        {doHet
          ? l.doPhe.map((x) => PHE[x].tenNgan).join(' · ')
          : l.chieu.loai === 'hut'
          ? `${v.trung} +${l.hoi}`
          : l.chieu.loai === 'giap'
          ? `${v.trung} 8s · gõ 4`
          : `${l.trung.length} người ${v.trung}`}
      </span>
    </div>
  );
}

/** Tàng Kinh Các ở Thành Trì đổi tông mỗi chừng này ms. */
const TT_DOI_PHE = 7000;

const dongHoNgan = (ms: number) => {
  const g = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(g / 60)}:${String(g % 60).padStart(2, '0')}`;
};

function ThanhGio({ con, tong }: { con: number; tong: number }) {
  return (
    <div className="sh-gio">
      <i style={{ width: `${Math.max(0, Math.min(100, (100 * con) / tong))}%` }} />
    </div>
  );
}

function The_({
  the,
  now,
  anh,
  asset,
}: {
  the: The;
  now: number;
  anh: ReadonlyMap<string, string>;
  asset: (p: string) => string;
}): ReactNode {
  const p = the.pha;
  const con = p.den - now;
  switch (p.k) {
    case 'nm': {
      const vao = now < p.moLuc;
      const dem = Math.ceil(Math.max(0, (vao ? p.moLuc : p.den) - now) / 1000);
      return (
        <section className="sh-the sh-the-me sh-the-nm">
          <header>
            <span className="sh-nhan">🚪 THỬ THÁCH NHẬP MÔN</span>
            <span className="sh-tieu">{p.phe !== null ? (vao ? `Vào ${PHE[p.phe].tenNgan}` : `Tới cửa ${PHE[p.phe].tenNgan}`) : vao ? 'Chọn tông' : 'Đi tới cửa tông'}</span>
            <span className="sh-dem">{dem}s</span>
          </header>
          <h2>
            {vao && p.phe !== null ? (
              <>
                Gõ <kbd>1</kbd> nam · <kbd>2</kbd> nữ {p.phe === 'son' ? '⛰️' : '🌊'}
              </>
            ) : vao ? (
              <>
                Gõ <kbd>1</kbd> <kbd>2</kbd> ⛰️ · <kbd>3</kbd> <kbd>4</kbd> 🌊
              </>
            ) : (
              <>
                <kbd>1</kbd> lên <kbd>2</kbd> xuống <kbd>3</kbd> trái <kbd>4</kbd> phải
              </>
            )}
          </h2>
          <footer>
            <span>👣 {p.vt.size}</span>
            {vao ? null : <span className="sh-me-qua">🎁 quà {QUA_ME_XU} xu = rơi vật phẩm · còn {QUA_ME_XU - p.quaTich}</span>}
            <span>✅ {p.qua.length}</span>
          </footer>
          <ThanhGio con={vao ? p.moLuc - now : p.den - now} tong={vao ? p.moLuc - (p.den - p.tong) : p.den - p.moLuc} />
        </section>
      );
    }
    case 'nm-ket':
      return (
        <section className="sh-the sh-the-me sh-the-nm ket">
          <header>
            <span className="sh-nhan">🚪 THỬ THÁCH NHẬP MÔN</span>
            <span className="sh-tieu">Đóng cửa</span>
          </header>
          <h2>{p.qua.length > 0 ? `Vượt ải: ${p.qua.map((q, i) => `${i + 1}. ${q.ten}`).join(' · ')}` : 'Chưa ai tới được cửa tông'}</h2>
          <footer>
            <span>{p.truot > 0 ? `${p.truot} người chưa kịp — mười phút nữa ải lại mở` : 'Ai vào cũng vượt ải — giỏi lắm!'}</span>
          </footer>
        </section>
      );
    case 'me':
      return (
        <section className="sh-the sh-the-me">
          <header>
            <span className="sh-nhan">🏺 TRANH ĐOẠT BẢO VẬT</span>
            <span className="sh-tieu">
              {p.phe !== null ? `${PHE[p.phe].tenNgan} · Mê cung ${p.loai} · ${kieuMe(p.phe, p.loai).ten}` : 'Đệ tử nhặt bảo vật'} · ra CỬA RA trước được thưởng
            </span>
            <span className="sh-dem">{Math.ceil(Math.max(0, con) / 1000)}s</span>
          </header>
          <h2>
            Gõ <kbd>1</kbd> lên <kbd>2</kbd> xuống <kbd>3</kbd> trái <kbd>4</kbd> phải — mỗi lần một bước
          </h2>
          <footer>
            <span>
              {p.vt.size} người · bảo vật trên sân {p.do.length}
              {p.do.some((d) => d.loai === 'ruong') ? ' · 🧰 Rương Đồng ở lõi!' : ''}
            </span>
            <span className="sh-me-qua">🎁 quà {QUA_ME_XU} xu = rơi bảo vật · còn {QUA_ME_XU - p.quaTich}</span>
            <span>Đã thoát {p.thoat.length}</span>
          </footer>
          <ThanhGio con={con} tong={p.tong} />
        </section>
      );
    case 'me-ket':
      return (
        <section className="sh-the sh-the-me ket">
          <header>
            <span className="sh-nhan">🏺 TRANH ĐOẠT BẢO VẬT</span>
            <span className="sh-tieu">Đóng cửa</span>
          </header>
          <h2>{p.thoat.length > 0 ? `Thoát ra: ${p.thoat.map((t, i) => `${i + 1}. ${t.ten}`).join(' · ')}` : 'Chưa ai kịp thoát ra'}</h2>
          <footer>
            <span>{p.mat > 0 ? `${p.mat} người chưa ra kịp — vẫn mang đồ về` : 'Ai vào cũng ra được — giỏi lắm!'}</span>
          </footer>
        </section>
      );
    case 'hoi':
    case 'dap': {
      const dap = p.k === 'dap';
      return (
        <section className={`sh-the sh-hoi${dap ? ' dap' : ''}`}>
          <header>
            <span className="sh-nhan">{p.thi > 0 ? '📜 HỘI THI' : p.cau.loai}</span>
            <span className="sh-tieu">
              {p.thi > 0 ? `NGỌC PHẢ · câu ${p.thi}/${HOI_THI_SO_CAU} · ×2 linh khí` : `THIÊN VẤN · Câu ${p.so}`}
            </span>
            <span className="sh-dem">{dap ? 'Đáp án' : `${Math.ceil(Math.max(0, con) / 1000)}s`}</span>
          </header>
          <h2>{p.cau.hoi}</h2>
          <ol>
            {p.cau.dap.map((d, i) => (
              <li key={i} className={dap ? (i === p.cau.dung ? 'dung' : 'mo') : ''}>
                <b>{ABC[i]}</b>
                <span>{d}</span>
              </li>
            ))}
          </ol>
          {dap ? (
            <footer>
              {p.soDung > 0 ? (
                <>
                  <span>
                    ⚡ Nhanh nhất: <strong>{p.nhanh.join(' · ')}</strong>
                  </span>
                  <span>
                    {p.soDung}/{p.soTra} người đúng
                  </span>
                </>
              ) : (
                <span>{p.soTra > 0 ? 'Chưa ai đúng câu này — câu sau gỡ lại!' : 'Gõ A, B hoặc C để nhận linh khí'}</span>
              )}
            </footer>
          ) : (
            <footer>
              <span>
                Gõ <kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> · {p.tra.size} người đã trả lời
              </span>
              {the.phucLoc > 0 ? <span className="sh-phuc">✨ Phúc Lộc ×2 nhờ {the.phucLocTu}</span> : null}
            </footer>
          )}
          {dap ? null : <ThanhGio con={con} tong={p.tong} />}
        </section>
      );
    }
    // Đang độ kiếp: không thẻ nào trên đầu — cảnh sét để trống; số hộ pháp ở thẻ Lệnh bên trái.
    case 'kiep':
      return null;
    case 'kiep-ket': {
      const n = the.nguoi.get(p.user);
      const can = hoPhapCan(the, p.canh, now);
      return (
        <section className={`sh-the sh-kiep${p.qua ? ' qua' : ' nga'}`}>
          <header>
            <span className="sh-nhan">⚡ LÔI KIẾP</span>
            <span className="sh-tieu">
              {p.ten} độ kiếp <strong>{tenCanh(p.canh)}</strong>
            </span>
          </header>
          <div className="sh-ket">
              {n ? <Anh n={n} anh={anh} co={96} /> : null}
              <div>
                <h2>{p.qua ? (p.nhoHo ? 'ĐỒNG ĐẠO CHE SÉT!' : 'TỰ VƯỢT KIẾP!') : 'NGÃ KIẾP…'}</h2>
                <p>
                  {p.qua
                    ? `${p.ten} thành ${tenCanh(p.canh)}${p.nhoHo ? ` nhờ ${p.soHo} hộ pháp — cả phòng ×2 linh khí hai câu` : ' — một mình chịu sét'}`
                    : `Hộ pháp ${p.soHo}/${can} · ${p.rot ? 'rớt một cảnh giới' : 'giữ được đạo cơ'} · thử lại sau 3 phút`}
                </p>
              </div>
            </div>
        </section>
      );
    }
    case 'lu':
    case 'lu-ket':
      return <BangDaiChien the={the} p={p} now={now} asset={asset} />;
    case 'yeu':
    case 'yeu-ket': {
      const y = YEU[p.yeu];
      if (p.k === 'yeu-ket') {
        return (
          <section className="sh-the sh-the-yeu">
            <header>
              <span className="sh-nhan">👹 YÊU TINH</span>
              <span className="sh-tieu">{y.ten}</span>
              <span className="sh-dem" />
            </header>
            <h2>{p.thang ? `${y.ten} đã gục!` : p.doSat ? `${y.ten} đồ sát cả đội…` : `${y.ten} chạy mất…`}</h2>
            {p.pheHa !== null && p.thuong !== null ? (
              <p className={`sh-yeu-thuong ${p.pheHa}`}>
                🏆 {PHE[p.pheHa].ten} hạ yêu · mỗi đệ tử <b>+{p.thuong.thach} 💎</b> <b>+{p.thuong.lk} linh khí</b> · top 3 nhận rương ·
                tông <b>+{p.thuong.linhMach} Linh Mạch</b>
              </p>
            ) : null}
            <footer>
              {p.thang ? (
                <span>
                  Kết liễu: <strong>{p.ketLieu ?? '—'}</strong> · Sát thương nhất: <strong>{p.top ?? '—'}</strong>
                </span>
              ) : (
                <span>{p.doSat ? 'Thả tim hồi máu kịp thì không ai ngã!' : 'Lần sau đông tay hơn nhé!'}</span>
              )}
            </footer>
          </section>
        );
      }
      return (
        <section className={`sh-the sh-the-yeu${p.cuong ? ' cuong' : ''}`}>
          <header>
            <span className="sh-nhan">{p.cuong ? '🔥 CUỒNG BẠO' : p.dai ? '👹 ĐẠI YÊU DẠ' : '👹 YÊU TINH XUẤT THẾ'}</span>
            <span className="sh-tieu">
              {y.ten}
              {p.phe !== null ? ` · ${PHE[p.phe].tenNgan} đánh` : ''} · gõ <kbd>5</kbd> đánh
            </span>
            <span className="sh-dem">{Math.ceil(Math.max(0, con) / 1000)}s</span>
          </header>
          {p.phanCuoi !== null && now - p.phanCuoi.luc < 2_500 ? (
            <p className="sh-phan">
              ⚡ {y.ten} tung <b>{p.phanCuoi.chieu}</b>!{' '}
              {p.phanCuoi.trung.length > 0 ? `${p.phanCuoi.trung.length} người choáng` : ''}
              {p.phanCuoi.doDuoc.length > 0 ? ` · ${p.phanCuoi.doDuoc.length} người đỡ được` : ''}
            </p>
          ) : (
            <p className="sh-mo">
              {p.giapDen > now ? '🛡 Yêu tinh khoác giáp · gõ 4 phá' : p.cuong ? '❤ Thả tim liên tục: hồi máu + đánh' : y.loi}
            </p>
          )}
          <BuffYeu the={the} p={p} now={now} />
          <div className="sh-mau">
            <i style={{ width: `${(100 * p.mau) / p.mauMax}%` }} />
            <span>
              {p.mau} / {p.mauMax}
            </span>
          </div>
        </section>
      );
    }
    case 'tt': {
      // Tàng Kinh Các: chiêu thức hai tông hiện lần lượt, mỗi tông vài giây (gõ C1–C9 nhận chiêu của tông mình).
      // Riêng một tông (mỗi tông một nick live): chỉ bày chiêu của tông đó, không xoay.
      const pheKinh: Phe = p.phe ?? (Math.floor(now / TT_DOI_PHE) % 2 === 0 ? 'son' : 'thuy');
      return (
        <section className={`sh-the sh-tt${p.phe !== null ? ` rieng ${p.phe}` : ''}`}>
          <header>
            <span className="sh-nhan">{p.phe !== null ? `${p.phe === 'son' ? '⛰️' : '🌊'} ${PHE[p.phe].tenNgan.toUpperCase()} · ĐAN CÁC & TÀNG KINH CÁC` : '🏯 THÀNH TRÌ TỰ DO'}</span>
            <span className="sh-tieu">{p.phe !== null ? 'Chỉ đệ tử bổn tông · gõ mã để mua, trừ linh thạch' : 'Chợ chung hai tông · gõ mã để mua, trừ linh thạch'}</span>
            <span className="sh-dem">{dongHoNgan(con)}</span>
          </header>
          <div className="sh-tt-hai">
            <div className="sh-tt-quay dan">
              <h3>💊 Đan Các{p.phe !== null ? ` ${PHE[p.phe].tenNgan}` : ''}</h3>
              <ol>
                {DAN.map((m, i) => (
                  <li key={i}>
                    <kbd>D{i + 1}</kbd>
                    <span>
                      <b>{m.ten}</b>
                      <small>{m.mo}</small>
                    </span>
                    <em>{m.gia}💎</em>
                  </li>
                ))}
              </ol>
            </div>
            <div className={`sh-tt-quay kinh ${pheKinh}`} key={pheKinh}>
              <h3>📜 Tàng Kinh Các{p.phe !== null ? ` ${PHE[p.phe].tenNgan}` : ''}</h3>
              <p className="sh-tt-phe">
                {pheKinh === 'son' ? '⛰️' : '🌊'} Chiêu thức {PHE[pheKinh].ten}
              </p>
              <ol>
                {CONG_PHAP.map((m, i) => (
                  <li key={i}>
                    <kbd>C{i + 1}</kbd>
                    <span>
                      <b>{m.ten[pheKinh]}</b>
                      <small>
                        {CAN_CO[m.he].hinh} {CAN_CO[m.he].ten} · bậc {m.bac} · {m.mo}
                      </small>
                    </span>
                    <em>{m.gia}💎</em>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          {p.kh !== null ? (
            <div className={`sh-tt-kh${p.kh.hoi ? '' : ' dap'}`}>
              <p>
                <b>❓ Khảo hạch Tàng Kinh · câu {p.kh.so}</b>
                <em>{p.kh.hoi ? `${Math.max(0, Math.ceil((p.kh.den - now) / 1000))}s` : 'Đáp án'}</em>
              </p>
              <h4>{p.kh.cau.hoi}</h4>
              <ol>
                {p.kh.cau.dap.map((d, i) => (
                  <li key={i} className={!p.kh!.hoi && i === p.kh!.cau.dung ? 'dung' : ''}>
                    <kbd>{'ABC'[i]}</kbd> {d}
                  </li>
                ))}
              </ol>
              <small>
                {p.kh.hoi
                  ? `Gõ A / B / C · đúng +${KH_LK}⚡ +${KH_THACH}💎 · ${p.kh.tra.size} người đã trả lời`
                  : `${p.kh.dung.length} người đúng`}
              </small>
            </div>
          ) : null}
          <footer>
            {p.mua.length > 0 ? (
              <span className="sh-tt-mua">
                🛍️{' '}
                {p.mua
                  .slice(-3)
                  .reverse()
                  .map((m) => `${m.ten} mua ${m.mon}`)
                  .join(' · ')}
              </span>
            ) : (
              <span>
                Gõ <kbd>D1</kbd>…<kbd>D9</kbd> mua đan · <kbd>C1</kbd>…<kbd>C9</kbd> học công pháp · <kbd>tôi</kbd> xem linh thạch
              </span>
            )}
          </footer>
          <ThanhGio con={con} tong={p.tong} />
        </section>
      );
    }
    case 'mua-ket':
      return (
        <section className="sh-the sh-mua">
          <header>
            <span className="sh-nhan">🏯 TỔNG KẾT MÙA LŨ</span>
            <span className="sh-tieu" />
            <span className="sh-dem" />
          </header>
          <h2>{p.thang === null ? 'Hai phe hòa nhau' : `${PHE[p.thang].ten} thắng mùa!`}</h2>
          <footer>
            <span>
              Số mùa thắng: Sơn Tông {the.muaThang.son} · Thủy Tông {the.muaThang.thuy}
            </span>
          </footer>
        </section>
      );
    default:
      return null;
  }
}

/** Thẻ tu vi khi khách gõ "tôi": gọn, nổi, đặt ngay dưới khối chữ để không đè lưới tu sĩ. */
function TheTuVi({ n, anh, asset }: { n: NguoiChoi; anh: string | undefined; asset: (p: string) => string }) {
  const hao = CANH_GIOI[n.canh]!.hao;
  const pheMau = n.phe ? PHE[n.phe].mauSang : '#cccccc';
  const pt = Math.round(tienDo(n) * 100);
  return (
    <div className="sh-the-nguoi" style={{ '--hao': hao, '--phe': pheMau } as CSSProperties}>
      <div className="sh-tn-hinh">
        <TranhCanh phe={n.phe} gioi={n.gioi} canh={n.canh} asset={asset} lop="sh-tn-nv" />
        <span className="sh-tn-huy">{anh ? <img src={anh} alt="" referrerPolicy="no-referrer" /> : <b>{n.ten.trim()[0] ?? '?'}</b>}</span>
      </div>
      <div className="sh-tn-chu">
        <div className="sh-tn-dau">
          <b>{n.ten}</b>
          <i>{n.phe ? PHE[n.phe].tenNgan : 'Phàm nhân · chờ Ải Nhập Môn'}</i>
          {n.canCo ? (
            <i className="co">
              {CAN_CO[n.canCo].hinh} {CAN_CO[n.canCo].ten}
            </i>
          ) : null}
        </div>
        <strong>
          {tenCanh(n.canh)}
          {n.phe ? <u>{chucVu(n.phe, n.canh)}</u> : null}
        </strong>
        <div className="sh-tn-ct">
          <span>⚔ {congThu(n).cong}</span>
          <span>🛡 {congThu(n).thu}</span>
          {n.tinChi > 0 ? <span>💎 {n.tinChi}</span> : null}
          {/* Trang bị bằng tranh (to, rõ), mã nhỏ bên dưới; đan trận đếm số viên ở góc. */}
          {n.cp > 0 && n.phe !== null ? (
            <i className="sh-tn-mon" style={{ '--mau': '#e0c8ff' } as CSSProperties} title={CONG_PHAP[n.cp - 1]!.ten[n.phe]}>
              <img src={asset(`vp/C${n.cp}-${n.phe}.webp`)} alt="" />
              <small>C{n.cp}</small>
            </i>
          ) : n.vo > 0 && tenVo(n) ? (
            <span>
              📜 {tenVo(n)} tầng {n.vo}
            </span>
          ) : null}
          {n.pet > 0 ? (
            <i className="sh-tn-mon" style={{ '--mau': '#9fd8ff' } as CSSProperties} title={PET[n.pet - 1]!.ten}>
              <img src={asset(`vp/P${n.pet}.webp`)} alt="" />
              <small>P{n.pet}</small>
            </i>
          ) : null}
          {n.ao > 0 && n.phe !== null ? (
            <i className="sh-tn-mon" style={{ '--mau': '#ffe9a0' } as CSSProperties} title={AO[n.ao - 1]!.ten[n.phe]}>
              <b>👘</b>
              <small>T{n.ao}</small>
            </i>
          ) : null}
          {/* Gọn: chỉ 2 viên đan dùng gần nhất (số viên còn trong túi ở góc), chừa chỗ cho linh thú, cánh sau này. */}
          {n.phe !== null
            ? (n.danCuoi ?? []).map((so) => {
                const k = (['cong', 'thu', 'hon', 'kiep'] as const)[so - 6];
                const con = k === undefined ? 0 : n.dan[k];
                return (
                  <i key={so} className="sh-tn-mon" style={{ '--mau': '#9fffb8' } as CSSProperties} title={DAN[so - 1]?.ten}>
                    <img src={asset(`vp/D${so}-${n.phe}.webp`)} alt="" />
                    <small>D{so}</small>
                    {con > 1 ? <sup>×{con}</sup> : null}
                  </i>
                );
              })
            : null}
          {O_TRANG_BI.map((o) => {
            const t = n.tb[o];
            return t ? (
              <i key={o} style={{ '--pham': PHAM[t.pham]!.mau } as CSSProperties} title={tenDo(t)}>
                <HinhDo o={o} asset={asset} anh={t.anh} vat={t} />
              </i>
            ) : null;
          })}
        </div>
        <div className="sh-tien">
          <i style={{ width: `${pt}%` }} />
          <em>{n.choKiep ? 'chờ độ kiếp' : duLinhKhi(n) ? (n.phe ? 'đủ linh khí · gõ “đột phá”' : 'vượt Ải Nhập Môn để nhập môn') : `${pt}%`}</em>
        </div>
        <small>
          {Math.round(n.lk)} linh khí · {n.dung} câu đúng
          {n.linhVat.length > 0 ? ` · ${n.linhVat.map((v) => LV.get(v)?.hinh ?? '').join('')}` : ''}
        </small>
      </div>
    </div>
  );
}

/** Ải Nhập Môn: 30 giây đầu là bảng hướng dẫn giữa màn với đồng hồ đếm ngược lớn; khi đã vào chơi
 *  thì chỉ còn đồng hồ lớn trên đầu bản đồ. */
function HuongDanNm({ p, now }: { p: Extract<The['pha'], { k: 'nm' }>; now: number }) {
  const vao = now < p.moLuc;
  const con = Math.ceil(Math.max(0, (vao ? p.moLuc : p.den) - now) / 1000);
  const gap = con <= 10;
  if (!vao) {
    // Đang đi: thẻ trên đã có đồng hồ; chỉ hiện số to giữa mê cung ở 10 giây cuối.
    if (!gap) return null;
    return (
      <div className={`sh-nm-dem${gap ? ' gap' : ''}`}>
        <small>Vượt ải còn</small>
        <b key={con}>{con}</b>
      </div>
    );
  }
  return (
    <div className="sh-nm-hd">
      <div className={`sh-nm-so${gap ? ' gap' : ''}`}>
        <b key={con}>{con}</b>
      </div>
      <div className="sh-nm-chon">
        <span className="sh-nm-go">Gõ số tương ứng</span>
        {p.phe !== null ? (
          <>
            <em className={p.phe}>1</em>
            <i>
              Nam {p.phe === 'son' ? '⛰️' : '🌊'} {PHE[p.phe].tenNgan}
            </i>
            <em className={p.phe}>2</em>
            <i>
              Nữ {p.phe === 'son' ? '⛰️' : '🌊'} {PHE[p.phe].tenNgan}
            </i>
          </>
        ) : (
          <>
            <em className="son">1</em>
            <i>Nam ⛰️ Sơn Tông</i>
            <em className="son">2</em>
            <i>Nữ ⛰️ Sơn Tông</i>
            <em className="thuy">3</em>
            <i>Nam 🌊 Thủy Tông</i>
            <em className="thuy">4</em>
            <i>Nữ 🌊 Thủy Tông</i>
          </>
        )}
      </div>
      <p className="sh-nm-mo">
        rồi gõ <kbd>1</kbd> lên <kbd>2</kbd> xuống <kbd>3</kbd> trái <kbd>4</kbd> phải tới cửa tông
      </p>
      <p className="sh-nm-mo nho">{p.phe !== null ? 'Không chọn thì tự được bốc nam / nữ' : 'Không chọn thì tự được chia tông'}</p>
      <footer>👣 {p.vt.size}</footer>
    </div>
  );
}

/** Giờ:phút địa phương của một mốc (bảng lịch trình). */
const gioPhut = (luc: number) => {
  const d = new Date(luc);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Lệnh hợp với màn đang chạy — màn nào chỉ hiện lệnh của màn đó. Tu luyện kèm một bảng Tàng Bảo Các
 *  luân phiên (Trang phục → Đan dược → Công pháp → Pet): bảng nào đang hiện thì có mã của bảng đó. */
function LenhMan({ the, now }: { the: The; now: number }) {
  const k = the.pha.k;
  if (k === 'kiep' || k === 'kiep-ket') {
    return (
      <>
        <h3>Lệnh</h3>
        <div className="sh-lenh">
          <span>
            <kbd>1</kbd>
            <kbd>2</kbd>
            <kbd>3</kbd>
            <em>hộ pháp che sét · ai hộ cũng có quà</em>
          </span>
          {k === 'kiep' ? (
            <span>
              <em>
                hộ pháp {soHoPhap(the, the.pha.ho)}/{hoPhapCan(the, the.pha.canh, now)} · đủ thì chắc qua
              </em>
            </span>
          ) : null}
        </div>
      </>
    );
  }
  // Tu luyện: bảng quy đổi quà — tặng quà được gì cho mình, cho trận tông, cho đệ tử phía dưới.
  const phe = pheTuLuyen(the, now).phe;
  const tr = capTran(the, phe);
  const ke = TRAN_TU[tr.cap];
  return (
    <>
      <h3>🎁 Quà tặng quy đổi</h3>
      <div className="sh-qd">
        <BangQuaDoi />
        <div className={`sh-qd-tran ${phe}`}>
          <span>
            {PHE[phe].tenNgan} · <b>{tr.ten}</b>
          </span>
          <i>
            <i style={{ width: `${Math.round(tr.tienDo * 100)}%` }} />
          </i>
          <small>{ke !== undefined ? `còn ${ke.can - the.tranLuc[phe]} xu lên ${ke.ten}` : 'trận cao nhất'}</small>
        </div>
      </div>
    </>
  );
}


/** Biển môn phái đang tới lượt ở màn tu luyện: tên phe, tổng lực chiến, số đệ tử, giờ đổi lượt. */
/** Dòng thông tin tông đang tu luyện, ngay dưới tên tông trên cùng (thay biển tông giữa màn): lực chiến, số đệ
 *  tử, giờ đổi lượt, trận tu luyện. */
function DongMonPhai({ the, now }: { the: The; now: number }) {
  const { phe, con } = pheTuLuyen(the, now);
  const t = tongLuc(the, now, phe);
  const npc = soNpc(the, phe, now);
  const tran = capTran(the, phe);
  return (
    <div className={`sh-dong-mon ${phe}`}>
      <span>
        ⚔ Lực chiến <b>{t.luc.toLocaleString('vi-VN')}</b>
      </span>
      <span>
        {t.so} đệ tử{npc > 0 ? ` + ${npc} trưởng lão` : ''}
      </span>
      <span>
        🔗 {tran.ten} <i>cấp {tran.cap}/5</i>
      </span>
      <span>đổi lượt {dongHo(con)}</span>
    </div>
  );
}

function BienMonPhai({ the, now }: { the: The; now: number }) {
  const { phe, con } = pheTuLuyen(the, now);
  const t = tongLuc(the, now, phe);
  const npc = soNpc(the, phe, now);
  const tran = capTran(the, phe);
  const info = PHE[phe];
  // Lúc hiện lúc ẩn để không che người đứng đầu tháp: hiện 9 giây mỗi 30 giây; vừa đổi lượt thì hiện ngay.
  const vuaDoi = the.pheTu > 0 && now - the.pheTu < 9000;
  const hien = vuaDoi || now % 30000 < 9000;
  return (
    <div key={phe} className={`sh-mon ${phe}${hien ? '' : ' an'}`} style={{ '--mau': info.mauSang } as CSSProperties}>
      <h3>
        {phe === 'son' ? '⛰️ ' : '🌊 '}
        {info.ten}
      </h3>
      <p>
        <span>
          Tổng lực chiến <b>{t.luc.toLocaleString('vi-VN')}</b>
        </span>
        <span>
          {t.so} đệ tử{npc > 0 ? ` + ${npc} trưởng lão` : ''}
        </span>
        <span>đổi lượt sau {dongHo(con)}</span>
      </p>
      {/* Trận tu luyện của phe: tên theo cấp, thanh tiến độ tới cấp kế, linh thạch mỗi câu đúng. */}
      <div className="sh-mon-tran">
        <b>
          🔗 {tran.ten} · cấp {tran.cap}/5
        </b>
        <i>
          <u style={{ width: `${Math.round(tran.tienDo * 100)}%` }} />
        </i>
        <em>{tran.thach > 0 ? `đáp đúng +${tran.thach} 💎` : '🎁 quà nâng trận'}</em>
      </div>
    </div>
  );
}

export interface ThongBao {
  loai: 'the' | 'dot-pha';
  user: string;
  den: number;
  canh?: number;
  /** Đột phá cảnh giới thấp: bản ngắn. */
  ngan?: boolean;
  /** Đột phá: linh thạch người đột phá được, và mỗi người online trong phòng được. */
  thach?: number;
  phong?: number;
}

/** Tên màn cho chuyển cảnh: nhóm (màn chính và màn kết của nó cùng nhóm), tiêu đề, dòng phụ. Tu luyện
 *  tách theo tông đang tới lượt để đổi tông cũng có chuyển cảnh. */
function manHienTai(the: The, now: number): { nhom: string; ten: string; phu: string; mau: string } {
  const p = the.pha;
  switch (p.k) {
    case 'kiep':
    case 'kiep-ket':
      return { nhom: 'kiep', ten: '⚡ Lôi Kiếp', phu: `${p.ten} độ kiếp`, mau: 'kiep' };
    case 'nm':
    case 'nm-ket':
      return { nhom: 'nm', ten: '🚪 Thử Thách Nhập Môn', phu: 'Chọn tông · vượt mê cung', mau: 'me' };
    case 'me':
    case 'me-ket':
      return { nhom: 'me', ten: '🏺 Tranh Đoạt Bảo Vật', phu: 'Giành bảo vật · ra cửa trước', mau: 'me' };
    case 'yeu':
    case 'yeu-ket':
      return { nhom: `yeu-${p.yeu}`, ten: `👹 ${YEU[p.yeu].ten}`, phu: 'Yêu tinh xuất thế · gõ 5 đánh', mau: 'yeu' };
    case 'lu':
    case 'lu-ket':
      return { nhom: 'lu', ten: '⚔️ Nước Dâng Đoạt Mị Nương', phu: 'Sơn Tông đối Thủy Tông', mau: 'lu' };
    case 'tt':
      return { nhom: 'tt', ten: '🏯 Thành Trì Tự Do', phu: 'Đan Các · Tàng Kinh Các', mau: 'tt' };
    case 'mua-ket':
      return { nhom: 'mua-ket', ten: '🏆 Tổng Kết Năm', phu: '', mau: 'tt' };
    default: {
      const phe = pheTuLuyen(the, now).phe;
      return { nhom: `tu-${phe}`, ten: `${phe === 'son' ? '⛰️' : '🌊'} ${PHE[phe].ten}`, phu: 'Tu luyện', mau: phe };
    }
  }
}

/** Thời lượng một lần chuyển cảnh (khớp keyframes `sh-cc-*` trong stage.css). */
const CHUYEN_CANH = 2_300;

/** Chuyển cảnh mỗi khi đổi màn (cả đổi tông tu luyện): hai cánh mây khép giữa màn, hiện tên màn mới, rồi
 *  mở ra. Rời Lôi Kiếp về tu luyện thì không chuyển (độ kiếp chen giữa tu luyện, chuyển hai lần thì rối). */
function ChuyenCanh({ the, now }: { the: The; now: number }) {
  const man = manHienTai(the, now);
  const nho = useRef<{ nhom: string; luc: number; man: typeof man } | null>(null);
  if (nho.current === null) nho.current = { nhom: man.nhom, luc: -Infinity, man };
  else if (nho.current.nhom !== man.nhom) {
    const tuKiep = nho.current.nhom === 'kiep' && man.nhom.startsWith('tu-');
    nho.current = { nhom: man.nhom, luc: tuKiep ? -Infinity : now, man };
  }
  const { luc, man: m } = nho.current;
  if (now - luc > CHUYEN_CANH) return null;
  return (
    <div className={`sh-cc ${m.mau}`} key={luc}>
      <i className="trai" />
      <i className="phai" />
      <div className="sh-cc-ten">
        <b>{m.ten}</b>
        {m.phu ? <small>{m.phu}</small> : null}
      </div>
    </div>
  );
}

export function Hud({
  the,
  now,
  anh,
  thongBao,
  dotPha,
  noiBat,
  asset,
}: {
  the: The;
  now: number;
  anh: ReadonlyMap<string, string>;
  thongBao: ThongBao | null;
  dotPha: ThongBao | null;
  noiBat: NoiBat | null;
  asset: (p: string) => string;
}) {
  const d = demPhe(the, now);
  const ke = suKienKe(the, now);
  const tuVi = bangTuVi(the, 5);
  const huong = bangHuong(the, 3);
  // Mực nước -5..5 → vạch giữa thanh thế trận.
  const vach = 50 + the.muc * 9;
  // Đang tỉ thí Lôi Đài: không hiện thẻ tu vi / màn Đột Phá to đè lên sân đấu (đột phá vẫn có hoạt ảnh nhỏ trên đầu).
  const tiThi = tiThiMo(the);
  const tb = thongBao && thongBao.den > now && !tiThi ? the.nguoi.get(thongBao.user) : undefined;
  // Đại Chiến và đánh yêu tinh dùng lớp dai-chien: ẩn bảng phụ, nhường giữa màn cho hai thần / yêu tinh.
  const nDp = dotPha && dotPha.den > now && !tiThi ? the.nguoi.get(dotPha.user) : undefined;
  const nNb = noiBat && noiBat.den > now ? the.nguoi.get(noiBat.user) : undefined;
  // Thẻ nổi hai bên: mỗi chu kỳ hiện một lúc, chỉ khi đang tu luyện (câu hỏi).
  const coNoi = ['cho', 'hoi', 'dap', 'kiep'].includes(the.pha.k);
  const tNoi = now % THE_NOI_CHU_KY;
  const luot = Math.floor(tNoi / THE_NOI_LUOT);
  const trongLuot = tNoi % THE_NOI_LUOT < THE_NOI_HIEN;
  const tuLuyenNoi = the.pha.k === 'cho' || the.pha.k === 'hoi' || the.pha.k === 'dap';
  const coSk = tuLuyenNoi && the.skTl !== null && now < the.skTl.den;
  // Vừa gõ 8 / vừa có người khiêu chiến: bảng Top hiện ngay, các bảng khác nhường.
  const xemTop = tuLuyenNoi && the.ldXem !== null && now < the.ldXem.den && the.loiDai?.tran == null;
  const le = luot % 2 === 1;
  const mot = (i: number) => coNoi && !xemTop && !coSk && le && (luot - 1) / 2 === i && trongLuot;
  // Độ kiếp: thẻ Lệnh (gõ 1 2 3 hộ pháp) ở bên trái suốt màn.
  const hienNoi = the.pha.k === 'kiep' || mot(0);
  const hienSo = mot(1);
  const hienTop = xemTop || (tuLuyenNoi && mot(2));
  // Sự kiện vừa mở thì hiện ngay 10 giây đầu — nhưng vẫn nhường bảng Top khi có người gõ 8, không bao giờ hai thẻ cùng lúc.
  const skMoi = coSk && now - (the.skTl!.den - the.nhip.skTlLau) < 10_000;
  const hienSk = coSk && !xemTop && (skMoi || (le && trongLuot));
  const hienTin = mot(3);
  const hienThach = tuLuyenNoi && !xemTop && !le && trongLuot;
  const pheNoi = pheTuLuyen(the, now).phe;
  const topThach = hienThach
    ? dangChoi(the, now)
        .filter((n) => n.phe === pheNoi)
        .sort((a, b) => b.tinChi - a.tinChi)
        .slice(0, 6)
    : [];

  return (
    <div
      className={`sh-hud${['lu', 'lu-ket', 'yeu', 'yeu-ket', 'me', 'me-ket', 'nm', 'nm-ket'].includes(the.pha.k) ? ' dai-chien' : ''}${['me', 'me-ket', 'nm', 'nm-ket'].includes(the.pha.k) ? ' me-cung' : ''}${the.pha.k === 'kiep' || the.pha.k === 'kiep-ket' ? ' kiep' : ''}${the.pha.k === 'lu' || the.pha.k === 'lu-ket' ? ' pk' : ''}${tiThi && ['cho', 'hoi', 'dap'].includes(the.pha.k) ? ' ti-thi' : ''}${['cho', 'kiep', 'kiep-ket'].includes(the.pha.k) ? ' khong-hoi' : ''}${tb && ['cho', 'hoi', 'dap'].includes(the.pha.k) ? ' the-tren' : ''}`}
    >
      {the.pha.k === 'mua-ket' ? <BienMonPhai the={the} now={now} /> : null}
      <ChuyenCanh the={the} now={now} />
      <HuongDanPk the={the} p={the.pha} now={now} asset={asset} />
      {the.pha.k === 'nm' ? <HuongDanNm p={the.pha} now={now} /> : null}
      {the.baoTruoc !== null && now < the.baoTruoc.den + 600 ? (
        <div className="sh-bao-truoc" key={the.baoTruoc.den}>
          <b>{Math.max(0, Math.ceil((the.baoTruoc.den - now) / 1000))}</b>
          <div>
            <small>Sắp tới · {the.baoTruoc.ten}</small>
            <p>{the.baoTruoc.chu}</p>
          </div>
        </div>
      ) : null}
      {the.pha.k === 'lu' || the.pha.k === 'lu-ket' ? <SanDaiChien
          p={the.pha}
          asset={asset}
          now={now}
          ten={(u) => the.nguoi.get(u)?.ten ?? u}
          anh={(u) => anh.get(u)}
        /> : null}
      <div className="sh-tren">
      <div className="sh-dau">
        {/* Màn mê cung nhặt đồ mang tên riêng trên đầu khung: "Tranh Đoạt Bảo Vật". */}
        {the.pha.k === 'me' || the.pha.k === 'me-ket' ? (
          <h1 className="sh-dau-man">
            <span>Tranh Đoạt</span> Bảo Vật
          </h1>
        ) : the.pha.k === 'nm' || the.pha.k === 'nm-ket' ? (
          <h1 className="sh-dau-man">
            <span>Thử Thách</span> Nhập Môn
          </h1>
        ) : the.pha.k === 'tt' ? (
          <h1 className="sh-dau-man">
            <span>Thành Trì</span> Tự Do
          </h1>
        ) : the.pha.k === 'yeu' || the.pha.k === 'yeu-ket' ? (
          <h1 className="sh-dau-man">
            <span>Tiêu Diệt</span> Quái Thú
          </h1>
        ) : tiThi && (the.pha.k === 'cho' || the.pha.k === 'hoi' || the.pha.k === 'dap') ? (
          // Lôi Đài đang đấu: màn Tỉ Thí riêng — tên màn riêng, không còn tên sân tu luyện của tông.
          <h1 className={`sh-dau-man ${the.loiDai!.phe}`}>
            <span>Tỉ Thí</span> Lôi Đài
          </h1>
        ) : the.pha.k === 'cho' || the.pha.k === 'hoi' || the.pha.k === 'dap' ? (
          // Tu luyện: tên tông đang tới lượt thay cho tên game.
          <h1 className={`sh-dau-man ${pheTuLuyen(the, now).phe}`}>
            {pheTuLuyen(the, now).phe === 'son' ? (
              <>
                <span>Sơn Tông</span> Núi Thánh
              </>
            ) : (
              <>
                <span>Thủy Tông</span> Long Cung
              </>
            )}
          </h1>
        ) : the.pha.k === 'kiep' || the.pha.k === 'kiep-ket' ? (
          <h1 className="sh-dau-man">
            <span>Độ</span> Kiếp
          </h1>
        ) : (
          <h1>
            <span>Sơn Hà</span> Tiên Lộ
          </h1>
        )}
        {tiThi && ['cho', 'hoi', 'dap'].includes(the.pha.k) ? (
          <p className="sh-tt-phu">{PHE[the.loiDai!.phe].tenNgan} · đồng môn so tài</p>
        ) : ['cho', 'hoi', 'dap'].includes(the.pha.k) ? (
          <DongMonPhai the={the} now={now} />
        ) : null}
        {the.pha.k === 'kiep' || the.pha.k === 'kiep-ket' ? (
          <p className="sh-kiep-ran">Thất bại thì thân tử đạo tiêu</p>
        ) : null}
      </div>

      {/* Dải "Năm thứ… · mùa lũ còn…" và hàng hai tông + thanh thế trận đã bỏ (người dùng: lấy chỗ cho bảng khác). */}
      <The_ the={the} now={now} anh={anh} asset={asset} />

      </div>

      {/* Hai thẻ nổi dọc hai bên — lệnh chơi bên trái, Bảng Tu Vi bên phải — chỉ ở màn tu luyện,
          thỉnh thoảng trượt ra vài giây rồi ẩn, để giữa màn thoáng cho kim tự tháp. */}
      <aside className={`sh-noi trai${hienNoi ? ' hien' : ''}`}>
        <LenhMan the={the} now={now} />
      </aside>
      <GoSo the={the} now={now} an={!hienSo} />
      <LoiDaiThe the={the} now={now} />
      <BangChieuDai the={the} now={now} />
      <QuayTuLuyen the={the} now={now} asset={asset} />
      <BangTop the={the} now={now} hien={hienTop} phe={pheTuLuyen(the, now).phe} />
      <aside className={`sh-noi phai sh-top-thach${hienThach && topThach.length > 0 ? ' hien' : ''}`}>
        <h3>💎 Top Linh Thạch</h3>
        <ol>
          {topThach.map((n, i) => (
            <li key={n.user}>
              <b>{i + 1}</b>
              <span>{n.ten}</span>
              <em>{n.tinChi.toLocaleString('vi-VN')} 💎</em>
            </li>
          ))}
        </ol>
        <p>Gõ mã trên quầy để mua</p>
      </aside>
      <ChuGiua the={the} now={now} />
      {the.pha.k === 'yeu' ? <BaoChieu p={the.pha} now={now} /> : null}
      <QuaBien the={the} now={now} />
      <TinHanhVi the={the} now={now} anh={anh} asset={asset} />
      <TanTuDc the={the} now={now} />
      <QuaGap the={the} now={now} />

      {the.skTl !== null && now < the.skTl.den && ['cho', 'hoi', 'dap'].includes(the.pha.k) ? (
        <SuKienTl the={the} now={now} hien={hienSk} />
      ) : huong.length > 0 && Math.floor(now / THE_NOI_CHU_KY) % 3 === 2 ? (
        <CungPhung the={the} hien={hienTin} />
      ) : Math.floor(now / THE_NOI_CHU_KY) % 2 === 1 && lichSapToi(the, now, 1).length > 0 ? (
        <aside className={`sh-noi phai sh-lich${hienTin ? ' hien' : ''}`}>
          <h3>Lịch trình</h3>
          <ol>
            {lichSapToi(the, now, 7).map((x, i) => (
              <li key={`${i}-${x.ten}`}>
                <b>{gioPhut(x.luc)}</b>
                <span>
                  {x.hinh} {x.ten}
                </span>
                <em>{x.luc - now < 60_000 ? 'sắp' : `${Math.ceil((x.luc - now) / 60_000)}′`}</em>
              </li>
            ))}
          </ol>
        </aside>
      ) : tuVi.length > 0 ? (
        <aside className={`sh-noi phai sh-top${hienTin ? ' hien' : ''}`}>
          <h3>Bảng Tu Vi</h3>
          <div className="sh-hang">
            {tuVi.map((n, i) => (
              <div key={n.user} className="sh-o">
                <Anh n={n} anh={anh} co={44} />
                <div>
                  <b>
                    {i + 1}. {n.ten}
                  </b>
                  <small style={{ color: CANH_GIOI[n.canh]!.hao }}>
                    {tenCanh(n.canh)} {n.linhVat.map((v) => LV.get(v)?.hinh ?? '').join('')}
                  </small>
                </div>
              </div>
            ))}
          </div>
          {huong.length > 0 ? <p className="sh-huong">🏮 Hương Hỏa: {huong.map((n) => n.ten).join(' · ')}</p> : null}
        </aside>
      ) : null}

      {tb ? <TheTuVi key={`${thongBao!.user}-${thongBao!.den}`} n={tb} anh={anh.get(tb.user)} asset={asset} /> : null}

      {the.pha.k === 'lu' || the.pha.k === 'yeu' ? <BannerTran p={the.pha} now={now} /> : null}
      {nNb && noiBat!.loai === 'tuyet-ky' ? <TuyetKy key={`${noiBat!.user}-${noiBat!.den}`} n={nNb} nb={noiBat!} asset={asset} /> : null}
      {nNb && noiBat!.loai === 'vinh-danh' ? <VinhDanh
          key={`${noiBat!.user}-${noiBat!.den}`}
          n={nNb}
          nb={noiBat!}
          asset={asset}
          goc={['yeu', 'yeu-ket', 'lu', 'lu-ket'].includes(the.pha.k)}
        /> : null}

      {/* Đột phá vẽ sau cùng: nổi trên mọi thứ khác của sân khấu. */}
      {nDp ? (
        <DotPha
          key={`${dotPha!.user}-${dotPha!.den}`}
          n={nDp}
          canh={dotPha!.canh ?? nDp.canh}
          anh={anh.get(nDp.user)}
          asset={asset}
          ngan={dotPha!.ngan === true}
          thach={dotPha!.thach ?? 0}
          phong={dotPha!.phong ?? 0}
        />
      ) : null}

    </div>
  );
}
