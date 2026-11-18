/** Lọc tin mới để đưa vào game — phần THUẦN, test chạy được ở Node. */

import type { FeedItem } from '@live/contracts';

export interface MocFeed {
  /** `startedAt` của phiên đang theo. */
  phien: number | null;
  /** Id lớn nhất đã đưa vào game. */
  id: number;
}

export interface KetQuaLoc {
  moc: MocFeed;
  moi: readonly FeedItem[];
  /** Máy chủ đã mở phiên trắng: game phải xoá nhân vật cũ. */
  phienMoi: boolean;
}

/** Tin nào chưa đưa vào game.
 *
 *  Phiên mới nhận ra bằng `startedAt`, KHÔNG bằng id tụt xuống: bản phiên được
 *  chụp rồi mới phát, tin feed đến giữa hai bước ấy khiến bản phiên về sau có id
 *  cuối thấp hơn tin đã nhận. Coi đó là phiên mới thì game bị xoá trắng giữa
 *  trận và 60 tin gần nhất bị tính lại lần nữa. */
export function locFeedMoi(moc: MocFeed, startedAt: number | null, ds: readonly FeedItem[]): KetQuaLoc {
  const phienMoi = moc.phien !== null && startedAt !== null && startedAt !== moc.phien;
  const tu = phienMoi ? 0 : moc.id;
  const moi = ds.filter((f) => f.id > tu);
  const cuoi = ds.length > 0 ? ds[ds.length - 1]!.id : 0;
  return { moc: { phien: startedAt ?? moc.phien, id: Math.max(tu, cuoi) }, moi, phienMoi };
}
