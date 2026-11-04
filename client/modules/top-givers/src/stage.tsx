import { moduleAssetUrl } from '@live/stage-sdk';
import type { StagePartProps } from '@live/stage-sdk';
import type { Config } from './manifest';
import { dongDua } from './core';
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
export function Stage({ config, state, modState, now }: StagePartProps<Config, State>) {
  const top = state.session.topGivers.slice(0, config.size);
  const dua = config.race
    ? dongDua(state.session.topGivers, modState.quaCuoi, now, modState.moc)
    : null;

  return (
    <section className="mod-tops" aria-label="Top người tặng">
      {dua === null ? null : (
        <p
          className={dua.lead === true ? 'mod-dua la-dau' : 'mod-dua'}
          key={`${dua.lead === true ? 'dau' : 'qua'}:${dua.name}:${dua.rank}:${dua.xu}`}
        >
          <span className="dua-chu">
            <span aria-hidden>🔥</span>{' '}
            {dua.lead === true ? (
              dua.name === '' ? (
                <>
                  <b>Top 1</b> đang chờ bạn · thả tim, bình luận để lên top nha!
                </>
              ) : (
                <>
                  <b>{dua.name}</b> đang dẫn đầu <b>Top 1</b> · cảm ơn bạn ❤
                </>
              )
            ) : (
              <>
                <b>{dua.name}</b> đã tặng <b>+{dua.xu.toLocaleString('vi-VN')} điểm</b> · đang{' '}
                <b>Top {dua.rank}</b> · cảm ơn bạn ❤
              </>
            )}
          </span>
        </p>
      )}
      {/* Hai khối rời nhau: dòng đua ở trên, hàng bồ đoàn ở dưới. Tắt
          riêng từng khối được, vì chúng nói hai chuyện khác nhau. */}
      {!config.board
        ? null
        : THU_TU.filter((h) => h < config.size).map((hang) => {
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
