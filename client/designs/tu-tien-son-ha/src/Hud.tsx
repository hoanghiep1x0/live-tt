/** Chữ trên màn: tên game, thế trận, thẻ sự kiện, bảng tu vi, hương hỏa, sử thi.
 *  Vẽ lại vài lần mỗi giây từ trạng thái lõi; không giữ luật chơi nào ở đây. */

import type { CSSProperties, ReactNode } from 'react';
import { BangDaiChien, SanDaiChien } from './DaiChien';
import { DotPha, TranhCanh } from './DotPha';
import { HinhDo, TuyetKy, VinhDanh, type NoiBat } from './NoiBat';
import { BannerTran, ThanhTranPhap } from './TranPhap';
import { PHAM, O_TRANG_BI, tenDo } from './loi/trang-bi';
import {
  bangHuong,
  bangTuVi,
  congThu,
  hoPhapCan,
  soHoPhap,
  soNpc,
  pheTuLuyen,
  tongLuc,
  demPhe,
  suKienKe,
  tenCanh,
  tienDo,
  type NguoiChoi,
  type The,
} from './loi/core';
import { HOI_THI_SO_CAU } from './loi/core';
import { CANH_GIOI, CAN_CO, LINH_VAT, PHE, YEU, chucVu } from './loi/the-gioi';

const ABC = ['A', 'B', 'C'] as const;
/** Thẻ nổi hai bên (lệnh, Bảng Tu Vi): cứ 40 giây hiện 12 giây. */
const THE_NOI_CHU_KY = 40_000;
const THE_NOI_HIEN = 12_000;
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

function ThanhGio({ con, tong }: { con: number; tong: number }) {
  return (
    <div className="sh-gio">
      <i style={{ width: `${Math.max(0, Math.min(100, (100 * con) / tong))}%` }} />
    </div>
  );
}

function The_({ the, now, anh }: { the: The; now: number; anh: ReadonlyMap<string, string> }): ReactNode {
  const p = the.pha;
  const con = p.den - now;
  switch (p.k) {
    case 'me':
      return (
        <section className="sh-the sh-the-me">
          <header>
            <span className="sh-nhan">🏺 ĐỊA CUNG</span>
            <span className="sh-tieu">Phàm nhân nhặt bảo vật là nhập đạo · ra CỬA RA trước được thưởng</span>
            <span className="sh-dem">{Math.ceil(Math.max(0, con) / 1000)}s</span>
          </header>
          <h2>
            Gõ <kbd>lên</kbd> <kbd>xuống</kbd> <kbd>trái</kbd> <kbd>phải</kbd> — mỗi lệnh một bước
          </h2>
          <footer>
            <span>
              {p.vt.size} người · bảo vật trên sân {p.do.length}
              {p.conRoi > 0 ? ` · còn ${p.conRoi} món sắp rơi` : ''}
              {p.do.some((d) => d.loai === 'ruong') ? ' · 🧰 Rương Đồng ở lõi!' : ''}
            </span>
            <span>Đã thoát {p.thoat.length}</span>
          </footer>
          <ThanhGio con={con} tong={p.tong} />
        </section>
      );
    case 'me-ket':
      return (
        <section className="sh-the sh-the-me ket">
          <header>
            <span className="sh-nhan">🏺 ĐỊA CUNG</span>
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
    case 'kiep':
    case 'kiep-ket': {
      const n = the.nguoi.get(p.user);
      const can = hoPhapCan(the, p.canh, now);
      const xong = p.k === 'kiep-ket';
      const soHo = p.k === 'kiep' ? soHoPhap(the, p.ho) : p.soHo;
      return (
        <section className={`sh-the sh-kiep${xong ? (p.qua ? ' qua' : ' nga') : ''}`}>
          <header>
            <span className="sh-nhan">⚡ LÔI KIẾP</span>
            <span className="sh-tieu">
              {p.ten} độ kiếp <strong>{tenCanh(p.canh)}</strong>
            </span>
            <span className="sh-dem">{xong ? '' : `${Math.ceil(Math.max(0, con) / 1000)}s`}</span>
          </header>
          {xong ? (
            <div className="sh-ket">
              {n ? <Anh n={n} anh={anh} co={96} /> : null}
              <div>
                <h2>{p.qua ? (p.nhoHo ? 'ĐỒNG ĐẠO CHE SÉT!' : 'VƯỢT KIẾP!') : 'NGÃ KIẾP…'}</h2>
                <p>
                  {p.qua
                    ? `${p.ten} thành ${tenCanh(p.canh)}${p.nhoHo ? ` nhờ ${p.soHo} hộ pháp` : ' — cả phòng ×2 linh khí hai câu'}`
                    : `Đáp án đúng: ${ABC[p.cau.dung]}. ${p.cau.dap[p.cau.dung]} · thử lại sau 3 phút`}
                </p>
              </div>
            </div>
          ) : (
            <>
              <h2>{p.cau.hoi}</h2>
              <ol>
                {p.cau.dap.map((d, i) => (
                  <li key={i}>
                    <b>{ABC[i]}</b>
                    <span>{d}</span>
                  </li>
                ))}
              </ol>
              <footer>
                <span>{p.chon === null ? `Chỉ ${p.ten} được trả lời` : `${p.ten} đã chọn — chờ trời phán…`}</span>
                <span className="sh-ho">
                  Cả phòng gõ <kbd>độ</kbd> · hộ pháp {soHo}/{can}
                </span>
              </footer>
              <ThanhGio con={con} tong={p.tong} />
            </>
          )}
        </section>
      );
    }
    case 'lu':
    case 'lu-ket':
      return <BangDaiChien the={the} p={p} now={now} />;
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
            <h2>{p.thang ? `${y.ten} đã gục!` : `${y.ten} chạy mất…`}</h2>
            <footer>
              {p.thang ? (
                <span>
                  Kết liễu: <strong>{p.ketLieu ?? '—'}</strong> · Sát thương nhất: <strong>{p.top ?? '—'}</strong> · cả hai nhận linh vật
                </span>
              ) : (
                <span>Lần sau đông tay hơn nhé!</span>
              )}
            </footer>
          </section>
        );
      }
      const top = [...p.dmg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      return (
        <section className="sh-the sh-the-yeu">
          <header>
            <span className="sh-nhan">{p.dai ? '👹 ĐẠI YÊU DẠ' : '👹 YÊU TINH XUẤT THẾ'}</span>
            <span className="sh-tieu">{y.ten}</span>
            <span className="sh-dem">{Math.ceil(Math.max(0, con) / 1000)}s</span>
          </header>
          {p.phanCuoi !== null && now - p.phanCuoi.luc < 2_500 ? (
            <p className="sh-phan">
              ⚡ {y.ten} tung <b>{y.chieu}</b>!{' '}
              {p.phanCuoi.trung.length > 0 ? `${p.phanCuoi.trung.length} người choáng` : ''}
              {p.phanCuoi.doDuoc.length > 0 ? ` · ${p.phanCuoi.doDuoc.length} người đỡ được` : ''}
            </p>
          ) : (
            <p className="sh-mo">{y.loi}</p>
          )}
          <div className="sh-mau">
            <i style={{ width: `${(100 * p.mau) / p.mauMax}%` }} />
            <span>
              {p.mau} / {p.mauMax}
            </span>
          </div>
          <footer>
            <span>
              Cả phòng gõ <kbd>đánh</kbd>
              {y.khac ? ` · ${PHE[y.khac].tenNgan} đánh mạnh ×1,5` : ''} · bị choáng thì ❤ thả tim hồi khí · tim, quà tăng phúc duyên
            </span>
            <span>{top.map(([u, d]) => `${the.nguoi.get(u)?.ten ?? u} ${d}`).join(' · ')}</span>
          </footer>
          <ThanhTranPhap the={the} p={p} now={now} />
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
              Số mùa thắng: Sơn Môn {the.muaThang.son} · Thủy Phủ {the.muaThang.thuy}
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
          <i>{n.phe ? PHE[n.phe].tenNgan : 'Phàm nhân · gõ “vào” để nhập môn'}</i>
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
          {O_TRANG_BI.map((o) => {
            const t = n.tb[o];
            return t ? (
              <i key={o} style={{ '--pham': PHAM[t.pham]!.mau } as CSSProperties} title={tenDo(t)}>
                <HinhDo o={o} asset={asset} />
              </i>
            ) : null;
          })}
        </div>
        <div className="sh-tien">
          <i style={{ width: `${pt}%` }} />
          <em>{n.choKiep ? 'chờ độ kiếp' : `${pt}%`}</em>
        </div>
        <small>
          {Math.round(n.lk)} linh khí · {n.dung} câu đúng
          {n.linhVat.length > 0 ? ` · ${n.linhVat.map((v) => LV.get(v)?.hinh ?? '').join('')}` : ''}
        </small>
      </div>
    </div>
  );
}

/** Biển môn phái đang tới lượt ở màn tu luyện: tên phe, tổng lực chiến, số đệ tử, giờ đổi lượt. */
function BienMonPhai({ the, now }: { the: The; now: number }) {
  const { phe, con } = pheTuLuyen(the, now);
  const t = tongLuc(the, now, phe);
  const npc = soNpc(the, phe, now);
  const info = PHE[phe];
  return (
    <div key={phe} className={`sh-mon ${phe}`} style={{ '--mau': info.mauSang } as CSSProperties}>
      <h3>
        {phe === 'son' ? '⛰️ ' : '🌊 '}
        {info.ten}
      </h3>
      <p>
        <span>
          Tổng lực chiến <b>{t.luc.toLocaleString('vi-VN')}</b>
        </span>
        <span>
          🔗 Tụ Linh Trận: {t.so} đệ tử{npc > 0 ? ` + ${npc} trưởng lão` : ''}
        </span>
        <span>đổi lượt sau {dongHo(con)}</span>
      </p>
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
  const tb = thongBao && thongBao.den > now ? the.nguoi.get(thongBao.user) : undefined;
  // Đại Chiến và đánh yêu tinh dùng lớp dai-chien: ẩn bảng phụ, nhường giữa màn cho hai thần / yêu tinh.
  const nDp = dotPha && dotPha.den > now ? the.nguoi.get(dotPha.user) : undefined;
  const nNb = noiBat && noiBat.den > now ? the.nguoi.get(noiBat.user) : undefined;
  // Thẻ nổi hai bên: mỗi chu kỳ hiện một lúc, chỉ khi đang tu luyện (câu hỏi).
  const hienNoi = ['cho', 'hoi', 'dap'].includes(the.pha.k) && now % THE_NOI_CHU_KY < THE_NOI_HIEN;

  return (
    <div
      className={`sh-hud${['lu', 'lu-ket', 'yeu', 'yeu-ket', 'me', 'me-ket'].includes(the.pha.k) ? ' dai-chien' : ''}${the.pha.k === 'me' || the.pha.k === 'me-ket' ? ' me-cung' : ''}${the.pha.k === 'kiep' || the.pha.k === 'kiep-ket' ? ' kiep' : ''}`}
    >
      {['cho', 'hoi', 'dap', 'mua-ket'].includes(the.pha.k) ? <BienMonPhai the={the} now={now} /> : null}
      {the.pha.k === 'lu' || the.pha.k === 'lu-ket' ? <SanDaiChien
          p={the.pha}
          asset={asset}
          now={now}
          ten={(u) => the.nguoi.get(u)?.ten ?? u}
          anh={(u) => anh.get(u)}
        /> : null}
      <div className="sh-tren">
      <div className="sh-dau">
        <h1>
          <span>Sơn Hà</span> Tiên Lộ
        </h1>
        <p>
          Năm thứ {the.nam} · mùa lũ còn {dongHo(the.muaKe - now)} ·{' '}
          <span className={ke.dacBiet ? 'sh-hen' : ''}>
            {ke.dacBiet ? '⭐ ' : ''}
            {ke.ten} sau {dongHo(ke.con)}
          </span>
        </p>
      </div>

      <div className="sh-phe">
        <div className="son">
          <b>⛰️ {PHE.son.ten}</b>
          <span>
            {d.son} đạo hữu · {the.muaThang.son} mùa thắng · 💠 {the.linhMach.son}
          </span>
        </div>
        <div className="sh-the-tran">
          <i className="nui" style={{ width: `${vach}%` }} />
          <i className="nuoc" style={{ width: `${100 - vach}%` }} />
          <em style={{ left: `${vach}%` }} />
        </div>
        <div className="thuy">
          <b>{PHE.thuy.ten} 🌊</b>
          <span>
            💠 {the.linhMach.thuy} · {the.muaThang.thuy} mùa thắng · {d.thuy} đạo hữu
          </span>
        </div>
      </div>

      <The_ the={the} now={now} anh={anh} />

      <div className="sh-su-thi">
        {the.suThi.slice(-2).map((s) => (
          <p key={`${s.luc}-${s.chu}`} className={s.phe ?? ''}>
            {s.chu}
          </p>
        ))}
      </div>

      </div>

      {/* Hai thẻ nổi dọc hai bên — lệnh chơi bên trái, Bảng Tu Vi bên phải — chỉ ở màn tu luyện,
          thỉnh thoảng trượt ra vài giây rồi ẩn, để giữa màn thoáng cho kim tự tháp. */}
      <aside className={`sh-noi trai${hienNoi ? ' hien' : ''}`}>
        <h3>Lệnh</h3>
        <div className="sh-lenh">
          <span>
            <kbd>vào</kbd>
            <kbd>núi nam</kbd>
            <kbd>nước nữ</kbd>
            <em>nhập môn</em>
          </span>
          <span>
            <kbd>A</kbd>
            <kbd>B</kbd>
            <kbd>C</kbd>
            <em>trả lời</em>
          </span>
          <span>
            <kbd>đánh</kbd>
            <em>yêu tinh</em>
          </span>
          <span>
            <kbd>độ</kbd>
            <em>hộ pháp</em>
          </span>
          <span>
            <kbd>hồi</kbd>
            <kbd>thủ</kbd>
            <kbd>công</kbd>
            <kbd>phá</kbd>
            <em>trận pháp</em>
          </span>
          <span>
            <kbd>lên</kbd>
            <kbd>trái</kbd>
            <em>Địa Cung</em>
          </span>
          <span>
            <kbd>tôi</kbd>
            <em>xem tu vi</em>
          </span>
        </div>
      </aside>

      {tuVi.length > 0 ? (
        <aside className={`sh-noi phai${hienNoi ? ' hien' : ''}`}>
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
      {nNb && noiBat!.loai === 'vinh-danh' ? <VinhDanh key={`${noiBat!.user}-${noiBat!.den}`} n={nNb} nb={noiBat!} asset={asset} /> : null}

      {/* Đột phá vẽ sau cùng: nổi trên mọi thứ khác của sân khấu. */}
      {nDp ? (
        <DotPha
          key={`${dotPha!.user}-${dotPha!.den}`}
          n={nDp}
          canh={dotPha!.canh ?? nDp.canh}
          anh={anh.get(nDp.user)}
          asset={asset}
          ngan={dotPha!.ngan === true}
        />
      ) : null}

    </div>
  );
}
