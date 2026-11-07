import { useEffect, useRef, useState } from 'react';
import type { StagePartProps } from '@live/stage-sdk';
import type { Config } from './manifest';
import type { LuotPhat, State } from './core';
import './stage.css';

/** "4:07" từ số giây. */
function dongHo(giay: number): string {
  const g = Math.max(0, Math.ceil(giay));
  return `${Math.floor(g / 60)}:${String(g % 60).padStart(2, '0')}`;
}

/** Một lượt phát: video LẶP trong suốt lượt (video ngắn cũng không để góc rạp
 *  trống). Lượt dài bao lâu, lúc nào hiện lại là việc của lõi (`core.ts`) —
 *  phần vẽ chỉ phát và đếm ngược. Mở cửa sổ giữa chừng thì tua tới đúng chỗ
 *  của vòng đang chạy, nên hai cửa sổ cùng một khung hình. */
function MotLuot({ luot, config }: { luot: LuotPhat; config: Config }) {
  const o = useRef<HTMLVideoElement>(null);
  const [xong, setXong] = useState(false);
  const [conLai, setConLai] = useState<number | null>(null);
  const [cam, setCam] = useState(false);


  useEffect(() => {
    const v = o.current;
    if (v !== null) v.volume = config.amLuong / 100;
  }, [config.amLuong]);

  if (xong) return null;

  return (
    <figure className="mod-hv">
      {/* Nhãn nhỏ trên video: cho người xem biết đây là clip vui của phòng,
          không phải nội dung chuyện đang kể. */}
      <figcaption className="mod-hv-nhan">video zui zui</figcaption>
      <video
        ref={o}
        className="mod-hv-video"
        src={luot.url}
        playsInline
        preload="auto"
        // Âm lượng 0: câm hẳn ở thuộc tính luôn — trình duyệt chỉ cho tự phát
        // khi video câm, mà phòng đã có giọng đọc rồi, tiếng video chen vào là
        // rối tai.
        muted={cam || config.amLuong <= 0}
        loop
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          v.volume = config.amLuong / 100;
          const da = Math.max(0, (Date.now() - luot.tu) / 1000);
          if (!Number.isFinite(v.duration) || v.duration <= 0) {
            setXong(true);
            return;
          }
          // Lặp: vào đúng chỗ của VÒNG đang chạy, không phải giây thứ `da`.
          v.currentTime = da % v.duration;
          // Trình duyệt chặn tự phát có tiếng (OBS thì không): phát câm còn
          // hơn đứng im.
          void v.play().catch(() => {
            setCam(true);
            v.muted = true;
            void v.play().catch(() => setXong(true));
          });
        }}
        onTimeUpdate={() => {
          // Còn bao lâu nữa thì ẩn — theo mốc bắt đầu lượt, vì video ngắn hơn
          // thì lặp nhiều vòng trong một lượt.
          if (config.phatPhut <= 0) {
            setConLai(null);
            return;
          }
          setConLai(config.phatPhut * 60 - (Date.now() - luot.tu) / 1000);
        }}
        onEnded={(e) => {
          // Trình duyệt nào không theo `loop` thì tự quay lại đầu.
          const v = e.currentTarget;
          v.currentTime = 0;
          void v.play().catch(() => setXong(true));
        }}
        onError={() => setXong(true)}
      />
      {conLai === null ? null : <figcaption className="mod-hv-gio">🔴 {dongHo(conLai)}</figcaption>}
    </figure>
  );
}

/** Video người thật ở góc rạp. Chưa có lượt phát thì không vẽ gì. */
export function Stage({ config, modState }: StagePartProps<Config, State>) {
  if (modState.phat === null) return null;
  return <MotLuot key={modState.phat.k} luot={modState.phat} config={config} />;
}
