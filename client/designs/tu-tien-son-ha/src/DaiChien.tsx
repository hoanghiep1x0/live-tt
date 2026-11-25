/** Màn Đại Chiến hai thần (pha Mùa Lũ): Sơn Tinh trái, Thủy Tinh phải, chưởng lực va nhau giữa màn.
 *  Điểm va lấn về phía phe đang thua; hết trận hiện phe thắng, thần thua tối đi.
 *  `BangDaiChien` nằm trong khối chữ trên đầu (điểm, đồng hồ); `SanDaiChien` là sân giữa màn. */

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { taoYeuDong } from './ve3d/yeu-dong';
import { dangChoi, heSoKich, KICH_DAY, quyetChien, theTran, type Pha, type The } from './loi/core';
import { CU_TEN, phutChot, xuCu, xuLatKeo } from './loi/chien-truong';

/** Nhãn cứ điểm: hiện CU_HIEN mỗi CU_NHIP; vừa có quà dồn vào cứ thì hiện thêm CU_GAN. */
const CU_NHIP = 25_000;
const CU_HIEN = 6_000;
const CU_GAN = 6_000;
import { DIEM_QUA } from './loi/core';
import { ThanhTranPhap } from './TranPhap';
import { PHE, type Phe } from './loi/the-gioi';
import { ChuVang } from './ChuVang';

type PhaLu = Extract<Pha, { k: 'lu' } | { k: 'lu-ket' }>;

/** Toạ độ (khung 1080×1920) lòng bàn tay hai thần trong tranh: tranh 480×720 đặt ở top 460, tay ở
 *  ~90% ngang, ~22% dọc. Đổi tranh thần thì chỉnh ba số này. */
/** Hai thần đứng to bao lâu đầu trận rồi thu về góc. */
export const THAN_THU_SAU = 30_000;
export const TAY_SON = 392;
export const TAY_THUY = 688;
export const TAY_Y = 618;

/** Điểm va: giữa hai bàn tay; phe nào đông tay hơn thì đẩy điểm va sang phía bên kia. */
export function diemVa(son: number, thuy: number): number {
  const tong = son + thuy;
  const giua = (TAY_SON + TAY_THUY) / 2;
  if (tong === 0) return giua;
  return giua + Math.max(-1, Math.min(1, (son - thuy) / tong)) * ((TAY_THUY - TAY_SON) / 2 - 24);
}

export function BangDaiChien({ the, p, now, asset }: { the: The; p: PhaLu; now: number; asset: (p: string) => string }) {
  const xong = p.k === 'lu-ket';
  const giay = Math.max(0, Math.ceil((p.den - now) / 1000));
  const tong = Math.max(1, p.son + p.thuy);
  const qc = p.k === 'lu' && quyetChien(p, now);
  // Đang đánh: số to là TRẬN KHÍ còn lại của mỗi phe (cạn là bị phá trận); hết trận: tổng lực đã đánh.
  const lu = p.k === 'lu' ? p : null;
  const khiSon = lu ? Math.max(0, lu.H - lu.thuy) : 0;
  const khiThuy = lu ? Math.max(0, lu.H - lu.son) : 0;
  // Trong trận bảng luôn gọn: hai thanh trận khí, số hai đầu, đồng hồ giữa (thay luôn hàng tên tông đầu
  // khung). Thế trận, trận pháp, cách chơi nằm ở modal riêng HuongDanPk. Hết trận thì hiện đầy đủ.
  const day = lu === null;
  return (
    <section className={`sh-dc-bang${qc ? ' quyet' : ''}${day ? '' : ' gon'}`}>
      <h2>{qc ? '🔥 QUYẾT CHIẾN · điểm ×1,5 🔥' : `⚔ ${p.dai ? 'Đại Hồng Thủy · Đoạt Mị Nương' : 'Nước Dâng Đoạt Mị Nương'}`}</h2>
      <div className="sh-dc-diem">
        <div className="son">
          <small>
            ⛰️ {PHE.son.tenNgan}
            {lu ? ` · ${lu.chu.son ? (the.nguoi.get(lu.chu.son)?.ten ?? '') : 'Thạch tướng'}` : ''}
          </small>
          <b>{Math.round(lu ? khiSon : p.son)}</b>
        </div>
        {/* Không đếm giờ nữa: đánh tới khi một tông cạn trận khí. */}
        <div className={`sh-dc-gio${qc ? ' gap' : ''}`}>{xong ? 'Hết' : '⚔'}</div>
        <div className="thuy">
          <small>
            {lu ? `${lu.chu.thuy ? (the.nguoi.get(lu.chu.thuy)?.ten ?? '') : 'Thủy tướng'} · ` : ''}
            {PHE.thuy.tenNgan} 🌊
          </small>
          <b>{Math.round(lu ? khiThuy : p.thuy)}</b>
        </div>
      </div>
      {lu ? (
        <div className="sh-dc-khi">
          <div className="son">
            <i style={{ width: `${(100 * khiSon) / lu.H}%` }} />
          </div>
          <span className={qc ? 'gap' : ''}>Cạn trận khí là thua</span>
          <div className="thuy">
            <i style={{ width: `${(100 * khiThuy) / lu.H}%` }} />
          </div>
        </div>
      ) : (
        <div className="sh-dc-keo">
          <i className="son" style={{ width: `${(100 * p.son) / tong}%` }} />
          <i className="thuy" />
        </div>
      )}
    </section>
  );
}

/** Modal hướng dẫn Đại Chiến — tách khỏi bảng điểm: cách góp sức, quà ra chiêu, thế trận và trận pháp hai phe.
 *  Hiện 8 giây đầu trận rồi 7 giây mỗi 45 giây; lúc ẩn màn thoáng cho hai vị thần giao đấu. */
export function HuongDanPk({ p, now, asset }: { the: The; p: Pha; now: number; asset: (p: string) => string }) {
  if (p.k !== 'lu') return null;
  const da = now - (p.den - p.tong);
  if (!(da < 8_000 || now % 45_000 < 7_000)) return null;
  return (
    <section className="sh-pk-hd" key={Math.floor(now / 45_000)}>
      <h3>⚔ Góp sức cho tông</h3>
      <ul>
        <li>
          <i>💬</i>
          <span>
            <b>Bình luận</b> — tiếp sức
          </span>
        </li>
        <li>
          <i>❤</i>
          <span>
            <b>Thả tim</b> — bạo kích
          </span>
        </li>
        <li>
          <i>🔯</i>
          <span className="sh-pk-so">
            Gõ <kbd>1</kbd> Công <kbd>2</kbd> Thủ <kbd>3</kbd> Hồi <kbd>4</kbd> Phá
          </span>
        </li>
        <li>
          <i>🎁</i>
          <span>
            <b>Tặng quà</b> — ra chiêu lớn
          </span>
        </li>
      </ul>
      <div className="sh-pk-qua">
        <span>
          <img src={asset('fx/qua-lien.webp')} alt="" /> 10 xu <b>Liên Kích</b>
        </span>
        <span>
          <img src={asset('fx/qua-tran.webp')} alt="" /> 50 xu <b>Trận Pháp</b>
        </span>
        <span>
          <img src={asset('fx/qua-tuyet.webp')} alt="" /> 200 xu <b>Tuyệt Kỹ</b>
        </span>
      </div>
    </section>
  );
}

/** Thế trận mỗi phe: số người ra tay, tim, quà; phe đang thua xa thì hiện hệ số bứt phá. */
function LucPhe({ p }: { p: Extract<Pha, { k: 'lu' }> }) {
  const t = theTran(p);
  const dong = (x: (typeof t)['son']) => (
    <>
      ⚔ {x.so} · ❤ {x.tim} · 🎁 {x.xu}
      {x.butPha > 1.001 ? <b> · ⚡ ×{x.butPha.toFixed(2)}</b> : null}
    </>
  );
  // Thần binh đang đánh bù cho phe ít người.
  const binh = (phe: Phe) => (p.binh[phe] > 0.5 ? <b> · 🗡 thần binh</b> : null);
  return (
    <div className="sh-dc-luc">
      <span className="son">
        {dong(t.son)}
        {binh('son')}
      </span>
      <span className="thuy">
        {dong(t.thuy)}
        {binh('thuy')}
      </span>
    </div>
  );
}

/** Một vị thần giữa sân: tranh uốn trên lưới WebGL (ve3d/yeu-dong.ts) — áo choàng, tóc, hào quang bay liên
 *  tục, thân thở, khẽ xoay; phe mình vừa ra đòn (`danh`) thì vươn người về phía đối thủ, vừa trúng đòn (`bi`)
 *  thì giật lùi. Máy không có WebGL thì giữ ảnh tĩnh. */
function Than({ phe, asset, trangThai, danh, bi, gian }: { phe: Phe; asset: (p: string) => string; trangThai: string; danh: number; bi: number; gian: boolean }) {
  const [co, setCo] = useState(true);
  const [dong, setDong] = useState(false);
  // Hoạt ảnh khung thật (MimicMotion trên hpc, scripts/phong/tu-tien/than-dong): có thì dùng, không thì uốn ảnh.
  const [khung, setKhung] = useState<'cho' | 'co' | 'khong'>('cho');
  const hop = useRef<HTMLDivElement>(null);
  const moc = useRef({ danh, bi });
  moc.current = { danh, bi };
  const src = asset(`than/${phe === 'son' ? 'son-tinh' : 'thuy-tinh'}.webp`);
  const ten = phe === 'son' ? 'son-tinh' : 'thuy-tinh';
  // Các động tác khung thật: xuất chưởng, bổ vũ khí, đâm vũ khí — có cái nào dùng cái đó, đổi mỗi lần ra đòn.
  const [dsDong, setDsDong] = useState<string[]>([]);
  useEffect(() => {
    let song = true;
    const ds = ['dong', 'dong-vu', 'dong-dam'].map((d) => asset(`than/${ten}-${d}.webp`));
    const co: (string | null)[] = ds.map(() => null);
    let xong = 0;
    ds.forEach((u, i) => {
      const im = new Image();
      im.onerror = () => {
        if (++xong === ds.length && song) setDsDong(co.filter((x): x is string => x !== null));
      };
      im.onload = () => {
        co[i] = u;
        if (++xong === ds.length && song) setDsDong(co.filter((x): x is string => x !== null));
      };
      im.src = u;
    });
    return () => {
      song = false;
    };
  }, [ten]);
  const [luot, setLuot] = useState(0);
  const doiLuc = useRef(0);
  useEffect(() => {
    // Một động tác chạy trọn (khoảng 2,7–4 giây) rồi lần ra đòn kế mới đổi sang động tác khác.
    if (danh === 0 || Date.now() - doiLuc.current < 2_700) return;
    doiLuc.current = Date.now();
    setLuot((x) => x + 1);
  }, [danh]);
  const srcDong = dsDong.length > 0 ? dsDong[luot % dsDong.length]! : asset(`than/${ten}-dong.webp`);
  useEffect(() => {
    const el = hop.current;
    if (el === null || khung !== 'khong') return;
    const y = taoYeuDong(phe === 'son' ? [0.05, 0.01] : [-0.05, 0.01]);
    if (y === null) return;
    const im = new Image();
    let raf = 0;
    let song = true;
    im.onload = () => {
      if (!song) return;
      y.dat(im);
      el.append(y.el);
      setDong(true);
      const ve = () => {
        raf = requestAnimationFrame(ve);
        const now = Date.now();
        const xd = (now - moc.current.danh) / 520;
        // Đòn của đối thủ bay tới mất chừng 0,2 giây rồi mới trúng.
        const xb = now - moc.current.bi - 200;
        y.ve(performance.now() / 1000 + (phe === 'son' ? 0 : 3.7), {
          tu: 0,
          lao: xd >= 0 && xd < 1 ? Math.sin(xd * Math.PI) : 0,
          trung: xb >= 0 && xb < 130 ? 1 : 0,
          cuong: 0,
          vx: 0,
          vy: 0,
        });
      };
      raf = requestAnimationFrame(ve);
    };
    im.src = src;
    return () => {
      song = false;
      cancelAnimationFrame(raf);
      y.el.remove();
    };
  }, [phe, src, khung]);
  if (!co) return null;
  // Trận đã kết (thắng / thua): thôi chạy đoạn ra đòn, đứng tranh tĩnh — không còn "tướng chính vẫn đánh" sau khi
  // đã phân thắng bại (người vận hành 2026-11-22). Ảnh động vẫn giữ trong DOM (ẩn) để vào trận sau khỏi tải lại.
  const ket = trangThai === 'thang' || trangThai === 'thua';
  const dangKhung = khung === 'co' && !ket;
  return (
    <div
      ref={hop}
      style={{ '--mat-than': `url("${dangKhung ? srcDong : src}")` } as CSSProperties}
      className={`sh-dc-than ${phe} ${trangThai}${dong ? ' dong' : ''}${dangKhung ? ' khung' : ''}${gian ? ' gian' : ''}`}>
      {khung === 'khong' ? null : (
        <img className="sh-dc-than-dong" src={srcDong} alt="" onLoad={() => setKhung('co')} onError={() => setKhung('khong')} />
      )}
      <img src={src} alt="" onError={() => setCo(false)} />
    </div>
  );
}

/** Bộ đếm liên kích một phe: hiện khi đang nối từ 5 đòn trở lên. */
function LienKich({ p, phe, now }: { p: Extract<Pha, { k: 'lu' }>; phe: Phe; now: number }) {
  const cb = p.combo[phe];
  if (cb.so < 5 || now - cb.luc > 2_500) return null;
  return (
    <div key={Math.floor(cb.so / 20)} className={`sh-dc-combo ${phe}${cb.so >= 20 ? ' lon' : ''}`}>
      <small>Liên kích</small>
      <b>×{cb.so}</b>
    </div>
  );
}

/** Đấu tướng: hai Tiên Phong, VS ở giữa, điểm từng người và thanh thời gian; xong thì báo người thắng. */
function DauTuong({ p, now, ten, anh }: { p: Extract<Pha, { k: 'lu' }>; now: number; ten: (u: string) => string; anh: (u: string) => string | undefined }) {
  const Mat = ({ u, phe }: { u: string; phe: Phe }) => {
    const url = anh(u);
    return (
      <div className={`sh-dt-tuong ${phe}`}>
        <span className="sh-dt-anh">{url ? <img src={url} alt="" referrerPolicy="no-referrer" /> : <b>{(ten(u).trim()[0] ?? '?').toUpperCase()}</b>}</span>
        <strong>{ten(u)}</strong>
      </div>
    );
  };
  if (p.dau !== null && now < p.dau.den) {
    const d = p.dau;
    return (
      <div className="sh-dt">
        <h4>⚔ Đấu tướng ⚔</h4>
        <div className="sh-dt-hang">
          <Mat u={d.son} phe="son" />
          <div className="sh-dt-vs">
            <em>{Math.round(d.diem.son)}</em>
            <b>VS</b>
            <em>{Math.round(d.diem.thuy)}</em>
          </div>
          <Mat u={d.thuy} phe="thuy" />
        </div>
        <div className="sh-dt-gio">
          <i style={{ width: `${Math.max(0, Math.min(100, ((d.den - now) / 6000) * 100))}%` }} />
        </div>
      </div>
    );
  }
  if (p.dauKet !== null && now - p.dauKet.luc < 2_200) {
    const k = p.dauKet;
    return (
      <div key={k.luc} className={`sh-dt ket ${k.thang ?? 'hoa'}`}>
        {k.thang === null ? '⚔ Đấu tướng hoà' : `⚔ ${ten(k[k.thang])} thắng · ${PHE[k.thang].tenNgan} +12`}
      </div>
    );
  }
  return null;
}

/** Chiến trường do quà quyết định (loi/chien-truong.ts): ba cứ điểm dọc giữa sân, biển phút chót "còn thiếu ≈ N xu
 *  để lật kèo", và danh sách viện binh đang sống của mỗi phe. */
function ChienTruongHud({ p, now, ten }: { p: Extract<Pha, { k: 'lu' }>; now: number; ten: (u: string) => string }) {
  const ct = p.ct;
  const chot = phutChot(p, now);
  const lat = xuLatKeo(p, now, DIEM_QUA);
  return (
    <>
      {CU_TEN.map((t, i) => {
        const c = ct?.cu[i];
        const x = c !== undefined ? xuCu(c, now) : { son: 0, thuy: 0 };
        const tong = Math.max(1, x.son + x.thuy);
        // Lúc hiện lúc ẩn (người vận hành 2026-11-20): hiện theo nhịp CU_HIEN / CU_NHIP, và hiện ngay khi vừa có quà
        // dồn vào cứ điểm đó (giành / cướp cứ) trong CU_GAN.
        const cuoi = c?.qua.at(-1)?.luc;
        const hien = now % CU_NHIP < CU_HIEN || (cuoi !== undefined && now - cuoi < CU_GAN);
        return (
          <div key={t} className={`sh-ct-cu c${i} ${c?.chu ?? 'trong'}${hien ? ' hien' : ''}`}>
            <b>🚩 {t}</b>
            <i>
              <i className="son" style={{ width: `${(x.son / tong) * 100}%` }} />
              <i className="thuy" style={{ width: `${(x.thuy / tong) * 100}%` }} />
            </i>
            <small>{c?.chu != null ? PHE[c.chu].tenNgan : 'tặng quà để chiếm'}</small>
          </div>
        );
      })}
      {(['son', 'thuy'] as const).map((phe) => (
        <ul key={phe} className={`sh-ct-vien ${phe}`}>
          {(ct?.vien ?? [])
            .filter((v) => v.phe === phe)
            .slice(-4)
            .map((v) => (
              <li key={v.id} className={`b${v.bac}`}>
                {v.bac === 2 ? '⚔️ Tướng' : '🛡 Quân'} {ten(v.user)} · {Math.max(0, Math.ceil((v.den - now) / 1000))}s
              </li>
            ))}
        </ul>
      ))}
      {chot ? (
        <div className="sh-ct-chot">
          <b>⏳ PHÚT CHÓT · quà ×2 điểm</b>
          {lat !== null ? (
            <span>
              {PHE[lat.phe].tenNgan} thiếu ≈ <em>{lat.xu.toLocaleString('vi-VN')} xu</em> để lật kèo
            </span>
          ) : (
            <span>Hai tông ngang nhau — một món quà là thắng!</span>
          )}
        </div>
      ) : null}
    </>
  );
}

export function SanDaiChien({
  p,
  asset,
  now,
  ten,
  anh,
}: {
  p: PhaLu;
  asset: (p: string) => string;
  now: number;
  ten: (u: string) => string;
  anh: (u: string) => string | undefined;
}) {
  const xong = p.k === 'lu-ket';
  const x = diemVa(p.son, p.thuy);
  const tt = (phe: Phe) => (!xong ? '' : p.thang === null ? '' : p.thang === phe ? 'thang' : 'thua');
  // 30 giây đầu hai thần đứng to giữa màn; sau đó thu về hai góc trên (dưới chữ, trên nền), nhường cả sân cho
  // người chơi hỗn chiến. Kết trận thì hiện to lại. Lớp 3D dùng cùng mốc (`THAN_THU_SAU` trong canh-3d.ts).
  const thu = p.k === 'lu' && now - (p.den - p.tong) > THAN_THU_SAU;
  return (
    <div className={`sh-dc-san${xong ? ' xong' : ''}${thu ? ' thu' : ''}`}>
      <Than phe="son" asset={asset} trangThai={tt('son')} danh={p.k === 'lu' ? p.combo.son.luc : 0} bi={p.k === 'lu' ? p.combo.thuy.luc : 0} gian={p.k === 'lu' && p.gian.son > now} />
      <Than phe="thuy" asset={asset} trangThai={tt('thuy')} danh={p.k === 'lu' ? p.combo.thuy.luc : 0} bi={p.k === 'lu' ? p.combo.son.luc : 0} gian={p.k === 'lu' && p.gian.thuy > now} />
      {xong ? null : (
        <>
          <div className="sh-dc-chuong son" style={{ left: `${TAY_SON}px`, width: `${x - TAY_SON}px`, top: `${TAY_Y}px` }} />
          <div className="sh-dc-chuong thuy" style={{ left: `${x}px`, width: `${TAY_THUY - x}px`, top: `${TAY_Y}px` }} />
          <div className="sh-dc-va" style={{ left: `${x}px`, top: `${TAY_Y}px` }}>
            <i />
            <i />
            <i />
          </div>
          {p.k === 'lu' ? (
            <>
              <LienKich p={p} phe="son" now={now} />
              <LienKich p={p} phe="thuy" now={now} />
              <DauTuong p={p} now={now} ten={ten} anh={anh} />
              <ChienTruongHud p={p} now={now} ten={ten} />
              {p.dao !== null && now - p.dao.luc < 1_800 ? (
                <div key={p.dao.luc} className={`sh-dc-dao ${p.dao.phe}`}>
                  <ChuVang chu="Đảo chiều!" />
                  <small>{PHE[p.dao.phe].tenNgan} vượt lên</small>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      )}
      {xong ? (
        <div className={`sh-dc-ket ${p.thang ?? 'hoa'}`}>
          <b>
            <ChuVang
              chu={p.thang === null ? 'Bất phân thắng bại' : `${PHE[p.thang].tenNgan} thắng`}
              to={
                p.thang === 'son'
                  ? 'linear-gradient(180deg, #fffbe6 10%, #ffe08a 45%, #8fe0a5 75%, #3f8f5a 95%)'
                  : p.thang === 'thuy'
                    ? 'linear-gradient(180deg, #ffffff 10%, #c8fbff 45%, #5ee0e6 75%, #2a6fb2 95%)'
                    : undefined
              }
              sang={p.thang === 'son' ? 'rgba(111,207,143,.9)' : p.thang === 'thuy' ? 'rgba(94,224,230,.9)' : undefined}
            />
          </b>
          <small>
            {Math.round(p.son)} lực đắp núi · {Math.round(p.thuy)} lực dâng nước
          </small>
          {/* Chiến lợi phẩm và chiến thương: chỉ người đã tương tác trong trận. */}
          {/* Hai thẻ cạnh nhau (người vận hành 2026-11-20: "hiển thị đẹp hơn"): tên tông, linh thạch mỗi người ra sức,
              chiến thương; vật phẩm hiếm thành ô nhỏ bên dưới. Không dùng <b>/<small> (dính kiểu chữ tiêu đề). */}
          <div className="sh-dc-thuong v2">
            <div className="sh-dct-hai">
              {(['son', 'thuy'] as const).map((phe) => (
                <div key={phe} className={`sh-dct-the ${phe}${p.thang === phe ? ' thang' : ''}`}>
                  <span className="sh-dct-ten">
                    {PHE[phe].tenNgan}
                    {p.thang === phe ? ' 🏆' : ''}
                  </span>
                  <span className="sh-dct-thach">+{p.thuong[phe]} 💎</span>
                  <span className="sh-dct-phu">mỗi người ra sức</span>
                  <span className="sh-dct-ton">⚔ chiến thương −{Math.round((1 - p.ton[phe]) * 100)}% · 10 phút</span>
                </div>
              ))}
            </div>
            {p.hiem.length > 0 ? (
              <div className="sh-dct-hiem">
                <span className="sh-dct-nhan">🎁 Vật phẩm hiếm</span>
                {p.hiem.slice(0, 4).map((h, i) => (
                  <span key={i} className={`sh-dct-mon ${h.phe}`}>
                    <u>{h.ten}</u> {h.vat}
                  </span>
                ))}
              </div>
            ) : (
              <div className="sh-dct-hiem">
                <span className="sh-dct-phu">🎁 Chưa ai gặp vật phẩm hiếm — ra sức nhiều thì dễ gặp hơn</span>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** TÁN TU Ở ĐẠI CHIẾN (góc trái dưới, người vận hành 2026-11-20): khách chưa vào tông đang online — số người, sĩ khí
 *  tán tu (thanh), hệ số thưởng hai tông, người vừa khích lệ. Tán tu tặng quà / thả tim là khích lệ sĩ khí (luật
 *  `kichSiKhi` / `heSoKich` ở loi/core.ts). Hàng nhân vật tán tu ngồi cuối map do ve3d/canh-3d.ts vẽ (HANG_KHACH). */
export function TanTuDc({ the, now }: { the: The; now: number }) {
  const p = the.pha;
  if (p.k !== 'lu') return null;
  const tanTu = dangChoi(the, now).filter((n) => n.phe === null);
  const xu = p.kich?.xu ?? 0;
  if (tanTu.length === 0 && xu <= 0) return null;
  const hs = heSoKich(p);
  const cuoi = p.kich?.cuoi;
  const moi = cuoi != null && now - cuoi.luc < 5_000;
  return (
    <div className={`sh-tan-tu${moi ? ' moi' : ''}`}>
      <b>
        🍃 Tán tu · {tanTu.length} người <em>thưởng hai tông ×{hs.toFixed(1).replace('.', ',')}</em>
      </b>
      <i>
        <i style={{ width: `${Math.min(100, (xu / KICH_DAY) * 100)}%` }} />
      </i>
      <small>{moi ? `✨ ${cuoi!.ten} khích lệ sĩ khí!` : 'Tặng quà · thả tim để khích lệ sĩ khí'}</small>
    </div>
  );
}
