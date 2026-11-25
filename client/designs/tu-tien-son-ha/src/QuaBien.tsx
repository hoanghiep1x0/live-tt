/** Cơ chế quà đợt 1 (docs/phong/tu-tien/co-che-qua.md): biển quà có ảnh quà TikTok thật + combo, thẻ Cung Phụng,
 *  biển "cần quà gấp" (cứu viện boss / tử chiến PK) có đếm ngược. Luật ở `loi/core.ts` (`tacDungBac`, `buocQuaGap`). */

import { bangHuong, TEN_BAC, type QuaMoi, type The } from './loi/core';
import { CANH_GIOI, PHE } from './loi/the-gioi';
import type { CSSProperties, ReactNode } from 'react';
import { CONG_PHAP, NHAN_HE } from './loi/tang-bao';

/** Ảnh quà: tên quà TikTok → url (danh mục chung `client/shared/qua-tiktok`). */
const DANH = import.meta.glob<{ id: number; ten: string }[]>('../../../shared/qua-tiktok/danh-sach.json', {
  eager: true,
  import: 'default',
});
const ANH = import.meta.glob<string>('../../../shared/qua-tiktok/anh/*.webp', { eager: true, query: '?url', import: 'default' });
const ID_TEN = new Map<string, number>();
for (const ds of Object.values(DANH)) for (const q of ds) if (!ID_TEN.has(q.ten.toLowerCase())) ID_TEN.set(q.ten.toLowerCase(), q.id);

export function anhQua(ten: string): string | null {
  const id = ID_TEN.get(ten.trim().toLowerCase());
  if (id === undefined) return null;
  return ANH[`../../../shared/qua-tiktok/anh/${id}.webp`] ?? null;
}

const HIEN: Record<number, number> = { 1: 3_500, 2: 3_500, 3: 3_200, 4: 4_500, 5: 5_500 };

function Anh({ q, co }: { q: QuaMoi; co: number }) {
  const u = anhQua(q.qua);
  return u !== null ? <img src={u} alt="" width={co} height={co} /> : <i style={{ fontSize: co * 0.7 }}>🎁</i>;
}

/** Biển quà: bậc 1–2 thẻ nhỏ xếp chồng bên trái; bậc 3 thẻ giữa màn; bậc 4–5 cận cảnh to. */
export function QuaBien({ the, now }: { the: The; now: number }) {
  const ds = the.quaMoi.filter((q) => now - q.luc < HIEN[q.bac]!);
  // Mỗi người chỉ hiện lần tặng mới nhất (combo cộng dồn vào đó).
  const moi = new Map<string, QuaMoi>();
  for (const q of ds) if (q.bac <= 2) moi.set(q.user, q);
  // Quà bậc 1–3 giờ hiện ở cột góc phải dưới (`TinHanhVi`: thẻ quà bậc 3 + dòng tin), giữa màn chỉ còn cận cảnh
  // bậc 4–5.
  void moi;
  const to = ds.filter((q) => q.bac >= 4).at(-1);
  return (
    <>
      {to !== undefined ? (
        <div key={`${to.user}-${to.luc}`} className={`sh-qb-to b${to.bac}`}>
          <Anh q={to} co={to.bac >= 4 ? 300 : 170} />
          <small>{TEN_BAC[to.bac]}</small>
          <b>{to.ten}</b>
          <span>
            {to.qua}
            {to.combo > 1 ? ` ×${to.combo}` : ''}
          </span>
          {to.chu ? <em>{to.chu}</em> : null}
        </div>
      ) : null}
    </>
  );
}

/** Thẻ Cung Phụng: top 3 người tặng quà buổi này (thẻ nổi bên phải lúc tu luyện). */
export function CungPhung({ the, hien }: { the: The; hien: boolean }) {
  const top = bangHuong(the, 3);
  if (top.length === 0) return null;
  return (
    <aside className={`sh-noi phai sh-cp${hien ? ' hien' : ''}`}>
      {/* Cùng kiểu với thẻ Top Lôi Đài (TuLuyenVui.tsx BangTop): tiêu đề, dòng mời, mỗi hàng số hạng · tên · xu. */}
      <h3>👑 Top Cung Phụng</h3>
      <p>Tặng quà · lên bảng</p>
      <ol>
        {top.map((n, i) => (
          <li key={n.user} className={`h${i + 1}`}>
            <b className="hang">{i + 1}</b>
            <span className="ten">{n.ten}</span>
            <span className="qua">
              <i>🎁</i>
              <em>{n.huong.toLocaleString('vi-VN')}</em>
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

/** Biển "cần quà gấp" có đếm ngược. */
export function QuaGap({ the, now }: { the: The; now: number }) {
  const g = the.quaGap;
  if (g === null || now >= g.den) return null;
  const giay = Math.ceil((g.den - now) / 1000);
  const cuu = g.loai === 'cuu-vien';
  return (
    <div className={`sh-qua-gap ${g.phe} ${g.loai}`}>
      <b>{cuu ? `🆘 ${PHE[g.phe].tenNgan} nguy!` : `🔥 ${PHE[g.phe].tenNgan} tử chiến!`}</b>
      <span>{cuu ? 'Tặng quà · hồi máu cả tông' : 'Quà ×2 điểm'}</span>
      <strong key={giay}>{giay}s</strong>
    </div>
  );
}

/** Mỗi dòng tin hiện bao lâu; hai dòng liền nhau cách tối thiểu bao lâu (hiện lần lượt, không bật cùng lúc). */
const TIN_LAU = 6_500;
const TIN_CACH = 1_100;
/** Thẻ quà bậc 3 (Pháp Bảo) trên đầu cột hiện bao lâu. */
const THE_BAC3_LAU = 3_500;
const TEN_LOAI_MUA: Record<string, string> = { d: 'đan', c: 'công pháp', p: 'linh thú', t: 'trang phục' };

/** CỘT GÓC PHẢI DƯỚI (người vận hành 2026-11-20): trên là thẻ quà Pháp Bảo (bậc 3) vừa tặng, dưới là dòng tin hoạt
 *  động — ai mua đan / công pháp / linh thú / trang phục, bỏ bao nhiêu linh thạch, ai tặng quà nhỏ gì. Mỗi dòng có ảnh
 *  đại diện tròn nhỏ + hình nhỏ món / quà, hiện lần lượt (tối đa 3 dòng), vài giây rồi tan. Tất cả chung MỘT cột xếp
 *  dọc nên không bao giờ đè lên nhau; cột có trần chiều cao để không lấn lên tháp tu luyện. */
export function TinHanhVi({
  the,
  now,
  anh,
  asset,
}: {
  the: The;
  now: number;
  anh: ReadonlyMap<string, string>;
  asset: (p: string) => string;
}) {
  type Dong = { khoa: string; user: string; ten: string; luc: number; chu: ReactNode; hinh: ReactNode };
  const ds: Dong[] = [];
  for (const m of the.muaLog ?? []) {
    const anhMon =
      m.loai === 'p' ? asset(`vp/P${m.so}.webp`) : m.loai === 'd' || m.loai === 'c' ? asset(`vp/${m.loai.toUpperCase()}${m.so}-${m.phe}.webp`) : null;
    ds.push({
      khoa: `m-${m.user}-${m.luc}-${m.loai}${m.so}`,
      user: m.user,
      ten: m.ten,
      luc: m.luc,
      chu:
        m.gia > 0 ? (
          m.loai === 't' ? (
            <>
              bỏ <u>{m.gia}💎</u> mua trang phục <i>{m.mon}</i>
            </>
          ) : (
            <>
              mua {TEN_LOAI_MUA[m.loai]} <i>{m.mon}</i> <u>· {m.gia}💎</u>
              {m.loai === 'c' ? <NhanHe so={m.so} /> : null}
            </>
          )
        ) : (
          <>
            đổi dùng {TEN_LOAI_MUA[m.loai]} <i>{m.mon}</i>
          </>
        ),
      hinh: anhMon !== null ? <img src={anhMon} alt="" /> : <span>{m.loai === 't' ? '👘' : '🎁'}</span>,
    });
  }
  for (const q of the.quaMoi) {
    if (q.bac > 2) continue;
    const u = anhQua(q.qua);
    ds.push({
      khoa: `q-${q.user}-${q.luc}`,
      user: q.user,
      ten: q.ten,
      luc: q.luc,
      chu: (
        <>
          tặng <i>{q.qua}</i>
          {q.combo > 1 ? <strong key={q.combo}> ×{q.combo}</strong> : null}
        </>
      ),
      hinh: u !== null ? <img src={u} alt="" /> : <span>🎁</span>,
    });
  }
  ds.sort((a, b) => a.luc - b.luc);
  // Xếp lịch hiện lần lượt: dòng sau ra sớm nhất TIN_CACH sau dòng trước.
  let truoc = -Infinity;
  const hien: (Dong & { tu: number })[] = [];
  for (const d of ds) {
    const tu = Math.max(d.luc, truoc + TIN_CACH);
    truoc = tu;
    if (tu <= now && now < tu + TIN_LAU) hien.push({ ...d, tu });
  }
  const cuoi = hien.slice(-3);
  const to = the.quaMoi.filter((q) => q.bac === 3 && now - q.luc < THE_BAC3_LAU).at(-1);
  // Hai người tung chiêu gần nhất (mỗi người lượt mới nhất), chỉ lúc đang đánh (Đại Chiến / boss).
  const dangDanh = the.pha.k === 'lu' || the.pha.k === 'yeu';
  const chieu: The['tungChieu'] = [];
  if (dangDanh) {
    for (const c of [...(the.tungChieu ?? [])].reverse()) {
      if (now - c.luc > CHIEU_LAU || chieu.some((x) => x.user === c.user)) continue;
      chieu.unshift(c);
      if (chieu.length >= 2) break;
    }
  }
  if (cuoi.length === 0 && to === undefined && chieu.length === 0) return null;
  return (
    <div className={`sh-tin-hv${dangDanh ? ' danh' : ''}`}>
      {to !== undefined ? (
        <div key={`${to.user}-${to.luc}`} className="sh-tin-to">
          <Anh q={to} co={96} />
          <span>
            <small>{TEN_BAC[to.bac]}</small>
            <b>{to.ten}</b>
            <em>
              {to.qua}
              {to.combo > 1 ? ` ×${to.combo}` : ''}
            </em>
            {to.chu ? <i>{to.chu}</i> : null}
          </span>
        </div>
      ) : null}
      {cuoi.map((d) => {
        const n = the.nguoi.get(d.user);
        const url = anh.get(d.user);
        const mau = n?.phe != null ? PHE[n.phe].mauSang : '#bbb';
        return (
          <div key={d.khoa} className={`sh-tin-dong${now > d.tu + TIN_LAU - 600 ? ' tan' : ''}`}>
            <span className="sh-tin-anh" style={{ boxShadow: `0 0 0 2px ${mau}, 0 0 10px ${n ? CANH_GIOI[n.canh]!.hao : '#fff'}` }}>
              {url ? <img src={url} alt="" referrerPolicy="no-referrer" /> : <b>{(d.ten.trim()[0] ?? '?').toUpperCase()}</b>}
            </span>
            <p>
              <b>{d.ten}</b> {d.chu}
            </p>
            <span className="sh-tin-mon">{d.hinh}</span>
          </div>
        );
      })}
      {chieu.map((c) => {
        const url = anh.get(c.user);
        return (
          <div key={`${c.user}-${c.luc}`} className={`sh-tin-chieu ${c.ky}`}>
            <span className="sh-tin-anh" style={{ boxShadow: `0 0 0 2px ${PHE[c.phe].mauSang}` }}>
              {url ? <img src={url} alt="" referrerPolicy="no-referrer" /> : <b>{(c.ten.trim()[0] ?? '?').toUpperCase()}</b>}
            </span>
            <p>
              <b>{c.ten}</b> <kbd>{SO_KY[c.ky]}</kbd> tung <i>{c.chieu}</i>
            </p>
            <span className="sh-tin-mon">
              {c.so > 0 ? <img src={asset(`vp/C${c.so}-${c.phe}.webp`)} alt="" /> : <span>{HINH_KY[c.ky]}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Lượt tung chiêu hiện bao lâu; số phím và hình theo trận pháp. */
const CHIEU_LAU = 8_000;
const SO_KY: Record<string, string> = { cong: '1', thu: '2', hoi: '3', pha: '4' };
const HINH_KY: Record<string, string> = { cong: '⚔', thu: '🛡', hoi: '💚', pha: '🗡' };

/** Nhãn hệ công pháp nhỏ có màu (Công · Thủ · Máu · Phá). */
function NhanHe({ so }: { so: number }) {
  const m = CONG_PHAP[so - 1];
  if (m === undefined) return null;
  const n = NHAN_HE[m.he];
  return (
    <mark className="sh-nhan-he" style={{ '--mau': n.mau } as CSSProperties}>
      {n.chu}
    </mark>
  );
}
