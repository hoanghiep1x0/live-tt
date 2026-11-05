import { useLayoutEffect, useRef, useState } from 'react';
import type { StagePartProps } from '@live/stage-sdk';
import type { Config } from './manifest';
import type { State } from './core';
import './stage.css';

/** Khoảng hở giữa hai bóng, tính theo bề rộng khung chứa (42cqw ở phòng kể
 *  chuyện ≈ 1,2cqw). Theo tỉ lệ chứ không theo px, để OBS thu khung nào cũng
 *  cách đều như nhau. */
const HO = 0.03;

/** Tên gọn để gọi trên bóng: tên đủ họ tên thì lấy chữ cuối ("Bùi An" → "An"),
 *  không thì lấy chữ đầu; tối đa 10 ký tự. Cùng ý `shortName` của bản cũ — bóng
 *  ngắn lại thì ít khi phải xuống dòng. */
export function tenGon(name: string): string {
  const tu = name.trim().split(/\s+/).filter((w) => /\p{L}/u.test(w));
  const dayDu = tu.length > 1 && tu.every((w) => /^\p{Lu}/u.test(w));
  const lay = (dayDu ? tu[tu.length - 1] : tu[0]) ?? name.trim();
  return Array.from(lay).slice(0, 10).join('');
}

/** Bóng chat nổi. Danh sách bóng do lõi chọn — phần vẽ không tự lọc lại, nếu
 *  không hai nơi sẽ hiểu khác nhau về việc bóng nào được hiện.
 *
 *  Hai lớp như bản cũ: `.mod-chat-o` là CHỖ của bóng (đẩy lên khi có bóng mới,
 *  trượt mượt), `.mod-chat-bong` bên trong lo hiện lên rồi mờ dần. Gộp một lớp
 *  thì hoạt ảnh và cú đẩy giành nhau cùng một `transform`, bóng nhảy giật.
 *
 *  Chỗ của từng bóng tính từ chiều cao THẬT của các bóng mới hơn nó, không phải
 *  một nấc cố định: bóng hai dòng cao hơn bóng một dòng, nấc cố định thì bóng
 *  dài đè lên bóng phía trên. */
export function Stage({ modState, now }: StagePartProps<Config, State>) {
  const han = modState.config.songSec * 1000;
  const bong = modState.bong.filter((b) => now - b.at < han);

  const khung = useRef<HTMLDivElement>(null);
  const [cao, setCao] = useState<ReadonlyMap<number, number>>(new Map());
  const [ho, setHo] = useState(0);

  // Đo sau mỗi lần vẽ, trước khi trình duyệt sơn: bóng mới đã có chỗ đúng ngay
  // khung hình đầu tiên. Chỉ đặt lại khi số đo đổi, không thì vẽ lại vô tận.
  useLayoutEffect(() => {
    const el = khung.current;
    if (el === null) return;
    const moi = new Map<number, number>();
    for (const o of el.querySelectorAll<HTMLElement>('[data-bong]')) {
      moi.set(Number(o.dataset['bong']), o.offsetHeight);
    }
    const hoMoi = el.clientWidth * HO;
    const doi =
      moi.size !== cao.size || [...moi].some(([k, v]) => cao.get(k) !== v) || hoMoi !== ho;
    if (doi) {
      setCao(moi);
      setHo(hoMoi);
    }
  });

  if (bong.length === 0) return null;

  // Bóng mới nhất ở đáy; mỗi bóng cũ hơn nằm trên tổng chiều cao các bóng mới hơn.
  const day = new Map<number, number>();
  let tren = 0;
  for (let i = bong.length - 1; i >= 0; i -= 1) {
    const b = bong[i];
    if (b === undefined) continue;
    day.set(b.id, tren);
    tren += (cao.get(b.id) ?? 0) + ho;
  }

  return (
    <div className="mod-chat" ref={khung}>
      {bong.map((b) => (
        <div
          key={b.id}
          data-bong={b.id}
          // So le xen kẽ, chốt sẵn trong lõi — bị đẩy lên không nhảy ngang.
          className={b.le ? 'mod-chat-o le' : 'mod-chat-o'}
          style={{ transform: `translateY(${-(day.get(b.id) ?? 0)}px)` }}
        >
          <p
            className={b.qua ? 'mod-chat-bong la-qua' : 'mod-chat-bong'}
            // Đời bóng do lõi quyết, nên hoạt hình mờ dần chạy đúng ngần ấy giây.
            style={{ animationDuration: `${modState.config.songSec}s` }}
          >
            {b.qua ? <span aria-hidden="true">🎁 </span> : null}
            <b>{tenGon(b.name)}</b> {b.text}
          </p>
        </div>
      ))}
    </div>
  );
}
