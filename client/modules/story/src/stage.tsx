import { useEffect, useRef } from 'react';
import { boVai } from '@live/contracts';
import type { StagePartProps } from '@live/stage-sdk';
import type { Config } from './manifest';
import type { State } from './core';
import { doanHienTai } from './core';
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

/** Khung chiếu của truyện: ảnh hoặc video, kèm tên truyện và đoạn đang kể.
 *
 *  Chữ LUÔN nằm dưới đáy làm phụ đề, như mọi trang xem phim — kể cả khi chưa
 *  có ảnh hay video. Trước đây lúc không có hình thì chữ đứng giữa khung; đổi
 *  chỗ giữa chừng (vừa dán video vào là chữ nhảy xuống đáy) làm người xem mất
 *  mạch, mà phụ đề dưới đáy thì ai cũng quen mắt rồi. */
export function Stage({ config, modState }: StagePartProps<Config, State>) {
  const doan = doanHienTai(modState);
  const trongSuot = config.transparentBg;
  const media = trongSuot ? '' : config.media.trim();
  const coHinh = media !== '';

  return (
    <div className="mod-truyen" data-co-hinh={coHinh} data-trong-suot={trongSuot}>
      {/* Chưa có ảnh hay video: tự trải một nền đổi màu theo chu kì. Để trống
          thì lộ nền sảnh đứng im sau lưng — đúng thứ TikTok soi. Trừ khi người
          vận hành chủ động bật nền trong suốt: lúc đó họ đã được dặn ở gợi ý. */}
      {coHinh || trongSuot ? null : <span className="mod-truyen-nen" aria-hidden />}

      {coHinh ? (
        LA_VIDEO.test(media) ? (
          <VideoKhongKet src={media} />
        ) : (
          <img className="mod-truyen-media" src={media} alt="" />
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
