import { useState } from 'react';
import { moduleAssetUrl } from '@live/stage-sdk';
import type { StagePartProps } from '@live/stage-sdk';
import type { Config } from './manifest';
import { CHAM_MS } from './core';
import type { NguoiSan, State } from './core';
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

/** Chu kỳ nhún khi nhảy, giây. Phải khớp `stage.css`. */
const NHIP_NHAY = 0.62;
/** Chạy lên / xuống bắt đầu từ lối giữa rạp (x 50% của slot), sâu ngần này
 *  xuống dưới sàn — tức là từ giữa các hàng ghế. */
const LOI_GIUA_X = 50;

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
  // Nhảy thì lặp mãi nên chỉ cần pha trong một nhịp; chạy lên / xuống thì
  // chạy một lần nên lùi đúng quãng đã chạy.
  const [tre] = useState(() => {
    const da = Math.max(0, now - ai.tu) / 1000;
    return -(ai.dang === 'nhay' ? da % NHIP_NHAY : da);
  });
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
        '--cham': `${((ai.cho * CHAM_MS) / 1000).toFixed(2)}s`,
        '--dx': `${(LOI_GIUA_X - ai.x).toFixed(1)}cqw`,
      }}
      aria-hidden
    >
      <span className="san-bong" />
      {/* Khách gõ "nhảy": tên trên đầu, như `stage-floor-name` của bản cũ. */}
      {ai.ten === undefined ? null : <span className="san-ten">{ai.ten}</span>}
      <span className="san-than">
        <img className="san-khung" src={anh.dung} alt="" />
        <img className="san-khung san-nhip" src={anh.nhay} alt="" />
      </span>
    </div>
  );
}

/** Sàn nhảy trước hàng ghế: có quà thì cả nhóm chạy lên nhảy, xong thì chạy
 *  xuống. Ai đứng đâu, đang làm gì là việc của lõi — ở đây chỉ vẽ. */
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
