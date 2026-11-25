/** Tu luyện nhiều cách chơi (học theo live mẫu): bảng "Chơi nhanh · gõ số" bên trái, thẻ sự kiện có đếm ngược
 *  bên phải, và chữ to giữa màn báo người vừa làm gì. Luật nằm ở `loi/core.ts` (`hoatDong`, `buocSuKienTl`). */

import { chuSuKien, dangChoi, HAI_LK, TEN_SK_TL, tenCanh, VAN_CONG_LK, type The } from './loi/core';
import { bangTop, boChieu, LD_MAU, LD_NO_DAY, QUA_THACH, SI_KHI_MOC, tiThiMo, type DauThu } from './loi/loi-dai';
import { PHE, type Phe } from './loi/the-gioi';
import type React from 'react';
import { anhQua } from './QuaBien';
import { CONG_PHAP, DAN, DAN_TONG, NHAN_HE } from './loi/tang-bao';
import { pheTuLuyen } from './loi/core';
import { CAN_CO } from './loi/the-gioi';

/** Mỗi dòng như thẻ "Quà tặng quy đổi": ô số bên trái, tên việc + được gì (chữ xanh nhỏ) bên phải. */
const DS_SO: readonly { so: string; ten: string; duoc: string; sk?: 'co-duyen' | 'linh-thao' }[] = [
  { so: '1', ten: 'Vận công', duoc: `+${VAN_CONG_LK}⚡ · mỗi 20 giây` },
  { so: '2', ten: 'Hái linh thảo', duoc: `+${HAI_LK}⚡ · hên gặp Linh Chi`, sk: 'linh-thao' },
  { so: '3', ten: 'Luyện đan', duoc: 'đổi 💎 lấy Tụ Khí Đan' },
  { so: '4', ten: 'Học võ', duoc: 'đổi 💎 lấy công pháp' },
  { so: '5', ten: 'Đột phá', duoc: 'đầy ⚡ thì lên cảnh giới' },
  { so: '6', ten: 'Cơ duyên', duoc: 'khi có sự kiện · miễn phí', sk: 'co-duyen' },
  { so: '7', ten: 'Tu vi', duoc: 'xem thẻ của mình' },
  { so: '8', ten: 'Top Lôi Đài', duoc: 'xem hạng · quà khiêu chiến' },
];

const tuLuyen = (the: The) => the.pha.k === 'cho' || the.pha.k === 'hoi' || the.pha.k === 'dap';

/** Bảng gõ số — bên phải, so le với thẻ quà bên trái (luân phiên, Hud.tsx `THE_SO_DEN`). */
export function GoSo({ the, now, an }: { the: The; now: number; an: boolean }) {
  if (!tuLuyen(the)) return null;
  const sk = the.skTl !== null && now < the.skTl.den ? the.skTl.loai : null;
  return (
    <aside className={`sh-noi phai sh-goso${an ? '' : ' hien'}`}>
      <h3>Chơi nhanh · gõ số</h3>
      <ol>
        {DS_SO.map((x) => (
          <li key={x.so} className={x.sk !== undefined && x.sk === sk ? 'sang' : ''}>
            <kbd>{x.so}</kbd>
            <span>
              <b>{x.ten}</b>
              <small>{x.duoc}</small>
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

/** Thẻ sự kiện tu luyện (bên phải): tên, đếm ngược, gõ số mấy để nhận gì. */
export function SuKienTl({ the, now, hien }: { the: The; now: number; hien: boolean }) {
  const sk = the.skTl;
  if (!tuLuyen(the) || sk === null || now >= sk.den) return null;
  const t = { ten: sk.ten, go: TEN_SK_TL[sk.loai].go, chu: chuSuKien(sk) };
  const g = Math.ceil((sk.den - now) / 1000);
  return (
    // Vừa mở (tự động hay người vận hành bấm) thì hiện ngay 10 giây, không chờ tới lượt trong vòng xoay thẻ nổi.
    <aside className={`sh-noi trai sh-sktl ${sk.loai}${hien || now - (sk.den - the.nhip.skTlLau) < 10_000 ? ' hien' : ''}`}>
      <h3>{sk.hinh} Sự kiện</h3>
      <b className="ten">{t.ten}</b>
      <span className="con">
        còn {Math.floor(g / 60)}:{String(g % 60).padStart(2, '0')}
      </span>
      <p>
        Gõ <kbd>{t.go}</kbd> {t.chu}
      </p>
      {sk.loai === 'co-duyen' && sk.da.size > 0 ? <small>{sk.da.size} người đã nhận</small> : null}
    </aside>
  );
}

/** Chữ to giữa màn: tên người vừa làm và kết quả, hiện 2,6 giây; việc hiếm thì vàng rực. */
export function ChuGiua({ the, now }: { the: The; now: number }) {
  const h = the.hdMoi;
  if (!tuLuyen(the) || h === null || now - h.luc > 2_600) return null;
  // Đang tỉ thí Lôi Đài: chỉ báo việc của trận, giữa màn để thoáng cho hai đấu thủ.
  if (the.loiDai?.tran != null && !h.viec.includes('Lôi Đài') && h.viec !== 'Tuyệt kỹ') return null;
  return (
    <div className={`sh-hd-giua${h.hiem ? ' hiem' : ''}`} key={h.luc}>
      <b>{h.ten}</b>
      <span>
        {h.viec} · {h.chu}
      </span>
    </div>
  );
}

/** Một bên đấu thủ: tên, thanh máu, thanh nộ (đầy thì sáng, gõ 3 ra tuyệt kỹ). */
function BenDai({ d, ben }: { d: DauThu; ben: 'a' | 'b' }) {
  return (
    <div className={`ben ${ben}`}>
      <b className="ten">{d.ten}</b>
      <i className="mau">
        <i style={{ width: `${(d.mau / LD_MAU) * 100}%` }} />
      </i>
      <i className={`no${d.no >= LD_NO_DAY ? ' day' : ''}`}>
        <i style={{ width: `${(d.no / LD_NO_DAY) * 100}%` }} />
      </i>
    </div>
  );
}

/** Lôi Đài Đồng Môn: đang đấu thì hai thanh máu + đồng hồ giữa (trái người bị khiêu chiến, phải người khiêu chiến).
 *  Luật ở `loi/loi-dai.ts`. */
export function LoiDaiThe({ the, now }: { the: The; now: number }) {
  const ld = the.loiDai;
  if (!tuLuyen(the) || ld === null) return null;
  const tran = ld.tran;
  if (tran === null) return null;
  const g = Math.max(0, Math.ceil((tran.den - now) / 1000));
  const cho = the.ldHang.filter((k) => k.phe === ld.phe).length;
  return (
    <div className="sh-ld tran">
      <BenDai d={tran.a} ben="a" />
      <span className="gio">{g}</span>
      <BenDai d={tran.b} ben="b" />
      <small>
        <kbd>1</kbd> công · <kbd>2</kbd> thủ · <kbd>3</kbd> tuyệt kỹ{cho > 0 ? ` · chờ ${cho} trận` : ''}
      </small>
      <small className="co-vu">🎁 Khán giả tặng quà cổ vũ · tăng sĩ khí ngẫu nhiên</small>
    </div>
  );
}

/** Hai bảng chiêu thức nổi hai bên lúc tỉ thí (cùng kiểu thẻ "Quà tặng quy đổi"): đấu thủ trái bên trái, đấu thủ
 *  phải bên phải. Mỗi bảng: gõ 1 / 2 / 3 ra chiêu gì (mờ khi đang hồi, 3 sáng khi nộ đầy) và quà nào ra chiêu gì. */
const QUA_CHIEU: readonly { ten: string; xu: number; chieu: string }[] = [
  { ten: 'Rose', xu: 1, chieu: 'Bạo Kích ×2' },
  { ten: 'Rosa', xu: 10, chieu: 'Hồi 30% máu' },
  { ten: 'Hand Heart', xu: 100, chieu: 'Tuyệt kỹ ngay' },
];

function BangChieu({ the, d, ben, now }: { the: The; d: DauThu; ben: 'a' | 'b'; now: number }) {
  const ld = the.loiDai!;
  const noDay = d.no >= LD_NO_DAY;
  const moc = SI_KHI_MOC.find((m) => d.siKhi < m.moc);
  // Bộ chiêu theo công pháp người này đã mua lúc tu luyện (ô nào có môn đã mua thì sáng chữ C<n>).
  const bo = boChieu(the, d, ld.phe);
  return (
    <aside className={`sh-ld-chieu ${ben}`}>
      <h3>{d.ten}</h3>
      <p className="si-khi">
        🔥 Sĩ khí <b>{d.siKhi}</b>
        {moc !== undefined ? <small> · {moc.moc} {moc.ten}</small> : null}
      </p>
      <ol>
        <li className={now < d.hoiCong ? 'hoi' : ''}>
          <kbd>1</kbd>
          <span>
            <b>{bo.cong.ten}</b>
            <small className={bo.cong.mua ? 'mua' : ''}>{bo.cong.mo}</small>
          </span>
        </li>
        <li className={now < d.hoiThu ? 'hoi' : d.thuDen > now ? 'sang' : ''}>
          <kbd>2</kbd>
          <span>
            <b>{bo.thu.ten}</b>
            <small className={bo.thu.mua ? 'mua' : ''}>{bo.thu.mo}</small>
          </span>
        </li>
        <li className={noDay ? 'sang' : 'hoi'}>
          <kbd>3</kbd>
          <span>
            <b>{bo.tuyet.ten}</b>
            <small className={bo.tuyet.mua ? 'mua' : ''}>
              {noDay ? 'nộ đầy · gõ 3!' : `nộ ${Math.round(d.no)}/${LD_NO_DAY}`}
              {bo.tuyet.mua ? ` · ${bo.tuyet.mo}` : ''}
            </small>
          </span>
        </li>
      </ol>
      {d.npc ? null : (
        <ul>
          {QUA_CHIEU.map((q) => {
            const u = anhQua(q.ten);
            return (
              <li key={q.ten}>
                {u !== null ? <img src={u} alt="" width={34} height={34} /> : <i>🎁</i>}
                <em>{q.xu}+</em>
                <span>{q.chieu}</span>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

export function BangChieuDai({ the, now }: { the: The; now: number }) {
  const tran = the.loiDai?.tran;
  if (!tuLuyen(the) || tran == null) return null;
  return (
    <>
      <BangChieu the={the} d={tran.a} ben="a" now={now} />
      <BangChieu the={the} d={tran.b} ben="b" now={now} />
    </>
  );
}

/** Bảng Top Lôi Đài của tông (gõ 8, hoặc vừa có người khiêu chiến): hạng, tên, cảnh giới, và món quà để khiêu
 *  chiến người ở hạng đó. Người vắng mặt ghi "vắng · tự đấu". Ẩn khi đang có trận (sân đấu cần thoáng). */
export function BangTop({ the, now, hien, phe }: { the: The; now: number; hien: boolean; phe: Phe }) {
  // Thẻ nổi bên trái, thay phiên với các bảng khác (Hud.tsx): `hien` do vòng luân phiên quyết định; vừa gõ 8 thì
  // xem Top của tông người gõ, còn lại là tông đang tới lượt tu luyện.
  if (!tuLuyen(the) || the.loiDai?.tran != null) return null;
  const x = the.ldXem !== null && now < the.ldXem.den ? the.ldXem : { phe };
  const top = bangTop(the, x.phe).slice(0, QUA_THACH.length);
  if (top.length === 0) return null;
  const on = new Set(dangChoi(the, now).map((n) => n.user));
  const cho = new Map(the.ldHang.map((k) => [k.dich, (0 as number)]));
  for (const k of the.ldHang) cho.set(k.dich, (cho.get(k.dich) ?? 0) + 1);
  return (
    <aside className={`sh-noi trai sh-ld-top ${x.phe}${hien ? ' hien' : ''}`}>
      <h3>🏆 Top Lôi Đài · {PHE[x.phe].tenNgan}</h3>
      <p>Tặng quà · khiêu chiến hạng đó</p>
      <ol>
        {top.map((n, i) => {
          const q = QUA_THACH[i]!;
          const u = anhQua(q.ten);
          const c = cho.get(n.user) ?? 0;
          return (
            <li key={n.user} className={i < 3 ? 'dau' : ''}>
              <b className="hang">{i + 1}</b>
              <span className="ten">
                <b>{n.ten}</b>
                <small>
                  {tenCanh(n.canh)}
                  {on.has(n.user) ? '' : ' · vắng, tự đấu'}
                  {c > 0 ? ` · ⚔ ${c} chờ` : ''}
                </small>
              </span>
              <span className="qua">
                {u !== null ? <img src={u} alt="" width={40} height={40} /> : <i>🎁</i>}
                <em>{q.xu}</em>
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

/** Quầy nổi lúc tu luyện (vùng trên tháp) — GỌN: chỉ 2 viên đan + 1 công pháp đệ tử bổn tông vừa dùng gần nhất
 *  (`the.muaGan`; chưa ai mua thì món rẻ nhất D1, D2, C1), mỗi món một ô có hình, mã gõ, tên, giá — người xem gõ mã là
 *  mua (luật `loi/tang-bao.ts`, `dungMa`). Đủ bộ D1–D9, C1–C9 xem ở Thành Trì. Chừa chỗ cho linh thú, cánh sau này. */
export function QuayTuLuyen({ the, now, asset }: { the: The; now: number; asset: (p: string) => string }) {
  if (!tuLuyen(the) || tiThiMo(the)) return null;
  const phe = pheTuLuyen(the, now).phe;
  const gan = (loai: 'd' | 'c', bao: number, du: number[]) => {
    const so = (the.muaGan ?? []).filter((x) => x.phe === phe && x.loai === loai).map((x) => x.so);
    for (const x of du) if (so.length < bao && !so.includes(x)) so.push(x);
    return so.slice(0, bao);
  };
  const ds = [
    ...gan('d', 2, [1, 2]).map((so) => {
      const m = DAN[so - 1]!;
      return { ma: `D${so}`, ten: `${DAN_TONG[phe][so - 1] ?? ''} ${m.ten}`.trim(), mo: m.mo, gia: m.gia, hinh: '💊', mau: ((so - 1) * 40 + 110) % 360, nhan: null as { chu: string; mau: string } | null };
    }),
    ...gan('c', 1, [1]).map((so) => {
      const m = CONG_PHAP[so - 1]!;
      return { ma: `C${so}`, ten: m.ten[phe], mo: `${CAN_CO[m.he].hinh} ${m.mo}`, gia: m.gia, hinh: '📜', mau: ((so - 1) * 40 + 30) % 360, nhan: NHAN_HE[m.he] };
    }),
  ];
  return (
    <section className={`sh-quay gon ${phe}`}>
      <h3>
        🛒 Vừa dùng <small>gõ mã để mua · trừ 💎</small>
      </h3>
      <ol>
        {ds.map((m) => (
          <li key={m.ma}>
            {/* Tranh vật phẩm riêng của tông (assets/vp/<mã>-<tông>.webp); thiếu tranh thì hiện viên màu dự phòng. */}
            <i style={{ '--mau': `hsl(${m.mau} 80% 60%)` } as React.CSSProperties}>
              {m.hinh}
              <img src={asset(`vp/${m.ma}-${phe}.webp`)} alt="" onLoad={(e) => e.currentTarget.parentElement?.classList.add('co-anh')} onError={(e) => (e.currentTarget.style.display = 'none')} />
            </i>
            <kbd>{m.ma}</kbd>
            {'nhan' in m && m.nhan ? (
              <mark className="sh-nhan-he" style={{ '--mau': m.nhan.mau } as React.CSSProperties}>
                {m.nhan.chu}
              </mark>
            ) : null}
            <b>{m.ten}</b>
            <small>{m.mo}</small>
            <em>{m.gia} 💎</em>
          </li>
        ))}
      </ol>
    </section>
  );
}
