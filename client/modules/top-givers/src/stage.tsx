import { moduleAssetUrl } from '@live/stage-sdk';
import type { StagePartProps } from '@live/stage-sdk';
import type { Config } from './manifest';
import type { State } from './core';
import './stage.css';

const HALO = moduleAssetUrl('top-givers', 'halo.png');
const LOTUS = moduleAssetUrl('top-givers', 'lotus.png');

/** Thứ hạng từ trái sang phải: hạng 1 nằm GIỮA và to hơn, hai bên thấp dần.
 *  Chuyển nguyên `TOP_ORDER` của bản cũ. */
const THU_TU = [3, 1, 0, 2, 4];

/** Tên dài thì lấy một chữ cho vừa bồ đoàn: họ tên đầy đủ thì lấy tên, còn lại
 *  lấy chữ đầu. Chuyển nguyên `shortName` của bản cũ. */
export function tenNgan(name = ''): string {
  const tu = name
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w));
  const dayDu = tu.length > 1 && tu.every((w) => /^\p{Lu}/u.test(w));
  const lay = dayDu ? tu[tu.length - 1] : tu[0];
  return Array.from(lay ?? name.trim())
    .slice(0, 10)
    .join('');
}

/** Bảng vinh danh: năm bồ đoàn dưới khung chiếu, ảnh tròn viền vàng trong vòng
 *  hào quang, ngồi trên hoa sen phát sáng. Bồ đoàn chưa có ai vẫn hiện, để
 *  người xem thấy còn chỗ cho mình. */
export function Stage({ config, state, modState }: StagePartProps<Config, State>) {
  const top = state.session.topGivers.slice(0, config.size);

  return (
    <section className="mod-tops" aria-label="Top người tặng">
      {THU_TU.filter((h) => h < config.size).map((hang) => {
        const ai = top[hang];
        const lop = [
          'top-seat',
          `rank-${hang + 1}`,
          ai === undefined ? 'empty' : '',
          ai !== undefined && modState.dangSoi === hang ? 'spotlight' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div
            key={hang}
            className={lop}
            title={
              ai === undefined
                ? `Hạng ${hang + 1} đang chờ người xem`
                : `Hạng ${hang + 1}: ${ai.name} · ${ai.xu.toLocaleString('vi-VN')} điểm`
            }
          >
            <img className="top-halo" src={HALO} alt="" aria-hidden />
            <span className="top-photo">
              {ai?.avatar === undefined ? <i>?</i> : <img src={ai.avatar} alt="" />}
            </span>
            <b className="top-rank">{hang + 1}</b>
            <img className="top-lotus" src={LOTUS} alt="" aria-hidden />
            <span className="top-name">{ai === undefined ? 'Chờ bạn' : tenNgan(ai.name)}</span>
          </div>
        );
      })}
    </section>
  );
}
