/** Kiểu dữ liệu phần vẽ đọc. Chỉ có type — file này nạp được ở Node. */

import type { ClassView } from '../lop/quiz';
import type { QuaGanNhat } from '../core';
import type { DongTop } from '../so-lop';

/** Ảnh chụp lớp để vẽ: trạng thái máy lớp học + các bảng tính từ sổ lớp. */
export type StageView = ClassView & { weekTop: DongTop[]; todayTop: DongTop[]; talkTop: DongTop[] };

/** Cài đặt lớp lấy từ ô cấu hình (bản cũ b3d3355): tên cô, chữ bảng đỏ, ảnh nền riêng, 2 game lớn đang bật. */
export interface CaiDatLop {
  tenCo: string;
  khauHieu: string;
  /** Đường dẫn ảnh nền riêng; rỗng là nền gốc của thiết kế. */
  nen: string;
  everest: boolean;
  chuong: boolean;
}

export interface GameState {
  view: StageView | null;
  channelName: string;
  lastGift: QuaGanNhat | null;
  lop: CaiDatLop;
}
