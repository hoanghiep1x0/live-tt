import { useEffect, useRef, useState } from 'react';
import { anhChoDoan, boVai } from '@live/contracts';
import type { StagePartProps } from '@live/stage-sdk';
import type { Config } from './manifest';
import type { State } from './core';
import { catDoan, chuPhuDe, dongHo } from './core';
import { trongSuot as trongSuotCua } from './manifest';
import './stage.css';

const LA_VIDEO = /\.(webm|mp4|m4v|ogv|mov)(\?|#|$)/i;

/** Video kẹt mà khung đứng im là TikTok xếp vào nội dung kém chất lượng, nên
 *  cứ ngần này lại soi xem nó còn chạy không. */
const SOI_MS = 4_000;

function VideoKhongKet({ src }: { src: string }) {
  const o = useRef<HTMLVideoElement>(null);
  const moc = useRef({ t: -1, lan: 0 });

  useEffect(() => {
    moc.current = { t: -1, lan: 0 };
    const h = setInterval(() => {
      const v = o.current;
      if (v === null) return;
      // Đứng yên hai lượt liên tiếp thì nạp lại: hết mạng, hết bộ nhớ đệm, hay
      // trình duyệt tự dừng vì tab bị ẩn — nguyên nhân nào cũng ra một hậu quả.
      if (v.currentTime === moc.current.t && !v.ended) {
        moc.current.lan += 1;
        if (moc.current.lan >= 2) {
          moc.current.lan = 0;
          v.load();
          void v.play().catch(() => {
            // Trình duyệt chặn tự phát thì thôi; lớp phủ chuyển động vẫn chạy.
          });
        }
      } else {
        moc.current = { t: v.currentTime, lan: 0 };
      }
    }, SOI_MS);
    return () => clearInterval(h);
  }, [src]);

  return (
    <video
      ref={o}
      className="mod-truyen-media"
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
    />
  );
}

/** Ảnh đổi mượt: ảnh mới tải và giải mã XONG mới hiện, mờ dần lên ĐÈ lên ảnh
 *  cũ (ảnh cũ nằm dưới tới lúc đó). Không bao giờ có khoảnh khắc khung trống
 *  — trước đây ảnh mới đang tải là lộ màn chờ phía sau, chập chờn rất xấu. */
function AnhMuot({ src }: { src: string }) {
  const [hien, setHien] = useState<string | null>(null);
  const [cu, setCu] = useState<string | null>(null);
  const hienRef = useRef<string | null>(null);

  useEffect(() => {
    if (src === hienRef.current) return;
    let song = true;
    const im = new Image();
    im.src = src;
    const xong = (duoc: boolean) => {
      if (!song) return;
      // Ảnh hỏng: giữ ảnh đang có, đừng hiện ô ảnh vỡ.
      if (!duoc && hienRef.current !== null) return;
      setCu(hienRef.current);
      hienRef.current = duoc ? src : null;
      setHien(duoc ? src : null);
    };
    im.decode().then(
      () => xong(true),
      () => xong(false),
    );
    return () => {
      song = false;
    };
  }, [src]);

  return (
    <>
      {cu === null ? null : <img key={`cu-${cu}`} className="mod-truyen-media" src={cu} alt="" />}
      {hien === null ? null : (
        // `key` theo ảnh: sang mốc mới là thẻ ảnh mới, hiện mờ dần lên trên ảnh cũ.
        <img key={hien} className="mod-truyen-media mod-truyen-hien" src={hien} alt="" />
      )}
    </>
  );
}

/** Khung chiếu của truyện: ảnh hoặc video, kèm tên truyện và đoạn đang kể.
 *
 *  Chữ LUÔN nằm dưới đáy làm phụ đề, như mọi trang xem phim — kể cả khi chưa
 *  có ảnh hay video. Trước đây lúc không có hình thì chữ đứng giữa khung; đổi
 *  chỗ giữa chừng (vừa dán video vào là chữ nhảy xuống đáy) làm người xem mất
 *  mạch, mà phụ đề dưới đáy thì ai cũng quen mắt rồi. */
export function Stage({ config, modState }: StagePartProps<Config, State>) {
  // Giờ nghỉ: KHÔNG vẽ thẻ truyện — để lộ màn chờ của thiết kế ("Chào cả nhà"
  // + đồng hồ) phía sau, chỉ đặt thêm dải giới thiệu truyện sắp kể. Module
  // không biết thiết kế vẽ màn chờ thế nào; thiết kế không biết gì về truyện.
  if (config.giaiLao !== null) {
    const ten = config.giaiLao.truyenSau.trim();
    return ten === '' ? null : (
      <div className="mod-truyen-giai-lao" role="status">
        <span className="mod-truyen-giai-lao-nhan">Truyện tiếp theo</span>
        <b className="mod-truyen-giai-lao-ten">{ten}</b>
      </div>
    );
  }
  return <KhungTruyen config={config} modState={modState} />;
}

function KhungTruyen({ config, modState }: Pick<StagePartProps<Config, State>, 'config' | 'modState'>) {
  // Phụ đề: lời MC vừa kể (MC tự kể) hoặc chữ gốc của đoạn (tự đọc).
  const doan = chuPhuDe(modState);
  const trongSuot = trongSuotCua(config);
  // Ảnh của mốc đang kể (đã vẽ và còn khớp truyện), không có thì ảnh chung,
  // không nữa thì ảnh đầu tiên đã vẽ của truyện — đoạn đầu chưa tới mốc ảnh
  // nào cũng có hình, không rơi về khung trống.
  const anhMoc = anhChoDoan(config.moc, Math.max(0, modState.doan), catDoan(config.passages));
  const anhDau = config.moc.find((m) => m.anh !== '')?.anh ?? '';
  // Tắt "Ảnh minh hoạ" là khung chỉ còn chữ — kể cả ảnh chung người vận hành
  // tự dán. Ảnh đã vẽ vẫn nằm trong `moc`, bật lại là hiện ngay.
  //
  // So với `false` chứ KHÔNG phải `!config.hienAnh`: cấu hình lưu từ trước khi
  // có ô này không mang khoá `hienAnh`, mà cấu hình xuống sân khấu là JSON thô
  // chứ không qua zod, nên ô thiếu là `undefined`. Hiểu `undefined` là tắt thì
  // mọi phòng đang chạy mất sạch ảnh ngay lần dựng đầu — chỉ TẮT khi người
  // vận hành thật sự gạt công tắc.
  const tatAnh = config.hienAnh === false;
  const media =
    config.transparentBg || tatAnh ? '' : anhMoc !== '' ? anhMoc : config.media.trim() || anhDau;
  const coHinh = media !== '';

  // Tải sẵn ảnh của mọi mốc trong truyện: tới đoạn là ảnh có ngay trong bộ nhớ.
  const dsAnh = config.moc.map((m) => m.anh).filter((a) => a !== '').join('|');
  useEffect(() => {
    for (const a of dsAnh.split('|')) {
      if (a === '') continue;
      const im = new Image();
      im.src = a;
    }
  }, [dsAnh]);

  return (
    <div className="mod-truyen" data-co-hinh={coHinh} data-trong-suot={trongSuot}>
      {/* Chưa có hình: KHÔNG trải nền đổi màu (nền tím trông rẻ) — khung trong
          suốt, lộ sảnh phía sau. Khung vẫn không đứng im: dải sáng quét và
          đồng hồ đếm giờ của truyện luôn chạy. */}
      {/* So với `false` chứ KHÔNG phải `!config.hienDongHo` — xem chú thích
          của `tatAnh` ở trên: cấu hình cũ không mang khoá này. */}
      {config.hienDongHo === false ? null : (
        <DongHoTruyen batDau={config.batDau} ten={config.title} />
      )}

      {coHinh ? (
        LA_VIDEO.test(media) ? (
          <VideoKhongKet src={media} />
        ) : (
          <AnhMuot src={media} />
        )
      ) : null}

      {/* Dải sáng quét chậm: khung không bao giờ đứng im, kể cả khi ảnh tĩnh. */}
      <span className="mod-truyen-quet" aria-hidden />

      {config.title === '' && doan === null ? null : (
        <div className="mod-truyen-chu">
          {config.title === '' ? null : <h2 className="mod-truyen-ten">{config.title}</h2>}
          {doan === null ? null : <p className="mod-truyen-doan">{boVai(doan)}</p>}
        </div>
      )}
    </div>
  );
}

/** Đồng hồ góc khung: truyện đã kể được bao lâu. Mốc từ máy chủ (`batDau`);
 *  chưa có thì đếm từ lúc trang này thấy truyện. Đổi truyện là đếm lại. */
function DongHoTruyen({ batDau, ten }: { batDau: number; ten: string }) {
  const thay = useRef<{ ten: string; luc: number }>({ ten, luc: Date.now() });
  if (thay.current.ten !== ten) thay.current = { ten, luc: Date.now() };
  const moc = batDau > 0 ? batDau : thay.current.luc;
  const [bayGio, setBayGio] = useState(() => Date.now());
  useEffect(() => {
    const h = setInterval(() => setBayGio(Date.now()), 1000);
    return () => clearInterval(h);
  }, []);
  if (ten === '') return null;
  return (
    <span className="mod-truyen-dong-ho" aria-label="Truyện đã kể được">
      ⏱ {dongHo((bayGio - moc) / 1000)}
    </span>
  );
}
