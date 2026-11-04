import { useState } from 'react';
import { moduleAssetUrl } from '@live/stage-sdk';
import type { StagePartProps } from '@live/stage-sdk';
import type { Config } from './manifest';
import type { Dang, NguoiSan, State } from './core';
import './stage.css';

/** Vì sao không phải three.js như bản cũ.
 *
 *  Bản cũ dựng rig 3D trong một canvas phủ cả rạp. Ở đây nhân vật cao chừng
 *  8cqw — trên khung 1080 là khoảng 85 px — nên cả bộ three.js (~600 KB sau nén)
 *  chỉ để vẽ bảy hình bé bằng ngón tay là quá đắt cho một trang mà OBS phải giữ
 *  tối thiểu 24 fps song song với video truyện.
 *
 *  Và dù có three.js thì cũng không mượt hơn: sân khấu chỉ vẽ lại mỗi 250 ms
 *  (`NHIP_MS` của SDK), nên mọi hoạt ảnh chạy theo khung hình đều phải nằm ở
 *  CSS. Nên ở đây: hai khung sprite đổi qua lại theo nhịp + transform CSS.
 *  Toàn bộ chạy trên luồng ghép hình, JS không đụng vào.
 */
const KHUNG = Array.from({ length: 6 }, (_, i) => ({
  dung: moduleAssetUrl('dance-floor', `chibi-${i + 1}-dung.svg`),
  nhay: moduleAssetUrl('dance-floor', `chibi-${i + 1}-nhay.svg`),
}));

/** Chu kỳ hoạt ảnh của từng động tác, giây. Phải khớp `stage.css`. */
const CHU_KY: Record<Dang, number> = { dung: 4.6, nghi: 3.2, nhay: 0.62 };

/** Một người trên sàn.
 *
 *  Độ trễ chốt đúng một lần, lúc gắn, y như dải chữ chạy: `now` nhích mỗi
 *  250 ms, mà sửa `animation-delay` của hoạt ảnh đang chạy là nó giật về đầu.
 *  Chốt một lần cũng đủ để hai cửa sổ trùng nhịp — độ trễ tính theo đồng hồ
 *  chung nên hai bên vào cùng một pha. */
function TrenSan({ ai, now }: { ai: NguoiSan; now: number }) {
  // `tu` bằng 0 nghĩa là động tác không có mốc riêng (đứng yên đung đưa): lấy
  // thẳng đồng hồ chung, pha vẫn trùng giữa các cửa sổ.
  //
  // Kẹp ở 0: mốc do móc `gift` đặt có thể nhỉnh hơn `now` (SDK chỉ nhích `now`
  // mỗi 250 ms), mà độ trễ DƯƠNG là hoạt ảnh đứng chờ rồi mới chạy.
  const [tre] = useState(() => -((Math.max(0, now - ai.tu) / 1000) % CHU_KY[ai.dang]));
  const anh = KHUNG[ai.kieu - 1] ?? (KHUNG[0] as (typeof KHUNG)[number]);

  return (
    <div
      className={`mod-san-ai dang-${ai.dang}`}
      style={{
        left: `${ai.x}%`,
        top: `${ai.chan}cqw`,
        // @ts-expect-error biến CSS tuỳ chỉnh
        '--co': ai.co,
        '--tre': `${tre.toFixed(2)}s`,
      }}
      aria-hidden
    >
      <span className="san-bong" />
      <span className="san-than">
        <img className="san-khung" src={anh.dung} alt="" />
        <img className="san-khung san-nhip" src={anh.nhay} alt="" />
      </span>
    </div>
  );
}

/** Sàn nhảy trước hàng ghế: luôn có người đứng đó làm động tác nghỉ, có quà thì
 *  cả nhóm lên nhảy. Ai đứng đâu, đang làm gì là việc của lõi — ở đây chỉ vẽ. */
export function Stage({ modState, now }: StagePartProps<Config, State>) {
  const nhay = modState.nguoi.some((n) => n.dang === 'nhay');

  return (
    <div className={nhay ? 'mod-san dang-nhac' : 'mod-san'}>
      {modState.nguoi.map((ai) => (
        <TrenSan key={`${ai.cho}-${ai.dang}-${ai.tu}`} ai={ai} now={now} />
      ))}
    </div>
  );
}
