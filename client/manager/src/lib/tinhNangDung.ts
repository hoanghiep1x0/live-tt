import { hopThietKe } from '@live/contracts';
import { MODULES } from './registry';
import type { Registered } from './registry';
import type { Manager } from './store';

/** Tính năng dùng được ở thiết kế đang phát — đúng loại phòng và đủ slot để
 *  vẽ, cùng `hopThietKe` mà sân khấu dùng để quyết module nào được chạy. Chưa phát thì đủ mọi tính năng, để
 *  người vận hành xem trước được hết.
 *
 *  Thanh trên, trang Tính năng và Cấu hình nhanh cùng đọc từ đây, nên con số
 *  ở chỗ này không bao giờ khác danh sách ở chỗ kia. */
export function tinhNangDung(m: Pick<Manager, 'designs' | 'live'>): readonly Registered[] {
  const dangPhat = m.designs.find((d) => d.manifest.id === m.live);
  if (dangPhat === undefined) return MODULES;
  return MODULES.filter((r) => hopThietKe(r.ui, dangPhat.manifest));
}
