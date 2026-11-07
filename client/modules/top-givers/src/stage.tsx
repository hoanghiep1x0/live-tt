import { useState } from 'react';
import { moduleAssetUrl, useAsset } from '@live/stage-sdk';
import type { StagePartProps } from '@live/stage-sdk';
import type { Config } from './manifest';
import { dongDua, kieuDua } from './core';
import type { State } from './core';
import './stage.css';

const HALO = moduleAssetUrl('top-givers', 'halo.png');
const LOTUS = moduleAssetUrl('top-givers', 'lotus.png');

/** Sáu kiểu chibi khán giả của phòng kể truyện (`chibi/khan-N.png` trong
 *  assets của thiết kế). Module này chỉ chạy ở phòng đó (`room: 'ke-chuyen'`),
 *  nên dùng thẳng được. */
const SO_KIEU_CHIBI = 6;

/** Kiểu chibi của một người: băm từ nick, không bốc ngẫu nhiên — cùng một
 *  người thì hai cửa sổ thấy giống nhau, và ảnh không nhảy mỗi lần vẽ lại.
 *  Cùng cách băm với hàng ghế (`ghe.ts` của thiết kế) nên ảnh trên bồ đoàn
 *  khớp đúng chibi người đó đang ngồi dưới rạp. Thuần. */
export function kieuChibi(user: string): number {
  let h = 0;
  for (const c of user) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % SO_KIEU_CHIBI;
}

/** Ảnh người trên bồ đoàn: avatar TikTok nếu có, hỏng hay không có thì chibi
 *  của người đó — như bản cũ (`DonorPhoto`), không để ô trống trơ ra. */
function AnhNguoi({ user, name, avatar }: { user: string; name: string; avatar: string | undefined }) {
  const asset = useAsset();
  const chibi = asset(`chibi/khan-${kieuChibi(user) + 1}.png`);
  const [hong, setHong] = useState(false);
  const src = avatar === undefined || avatar === '' || hong ? chibi : avatar;
  return (
    <img
      src={src}
      alt={name}
      referrerPolicy="no-referrer"
      data-chibi={src === chibi}
      onError={() => setHong(true)}
    />
  );
}

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
  // Bồ đoàn đọc bảng TƯƠNG TÁC, không chỉ bảng quà: phòng chưa ai tặng quà thì
  // bảng quà rỗng, năm bồ đoàn trơ ra như phòng vắng. Máy chủ đã lấp sẵn bằng
  // người đang trong phòng (`topTuongTac`), nên luôn có ảnh thật để hiện.
  // Dải chữ đua ở trên vẫn theo bảng quà — nó nói chuyện quà.
  const bang = state.session.topTuongTac ?? state.session.topGivers;
  const top = bang.slice(0, config.size);
  const dua = config.race
    ? dongDua(state.session.topGivers, modState.quaCuoi, now, modState.moc)
    : null;
  // Vàng hay đỏ: dải quà luôn đỏ, dải mời lên top thay phiên hai kiểu.
  const kieu = dua === null ? 'do' : kieuDua(dua, now);

  return (
    <section className="mod-tops" aria-label="Top người tặng">
      {dua === null ? null : (
        <p
          className={kieu === 'vang' ? 'mod-dua la-dau' : 'mod-dua'}
          // Đổi kiểu là dải mới: bật lên lại (`dua-vao`) cho thấy rõ lúc đổi.
          key={`${dua.lead === true ? 'dau' : 'qua'}:${kieu}:${dua.name}:${dua.rank}:${dua.xu}`}
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
                  : ai.xu > 0
                    ? `Hạng ${hang + 1}: ${ai.name} · ${ai.xu.toLocaleString('vi-VN')} điểm`
                    : `Hạng ${hang + 1}: ${ai.name} · đang trong phòng`
              }
            >
              <img className="top-halo" src={HALO} alt="" aria-hidden />
              <span className="top-photo" key={ai?.user ?? 'trong'}>
                {ai === undefined ? <i>?</i> : <AnhNguoi user={ai.user} name={ai.name} avatar={ai.avatar} />}
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
