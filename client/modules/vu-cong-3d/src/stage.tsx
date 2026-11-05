import { boLenSong, CANH3D_ATTR, locTuDo, rngChuoi, TUOI_NGUOI_LON } from '@live/contracts';
import type { VuCong3D } from '@live/contracts';
import { moduleAssetUrl, useTuDo } from '@live/stage-sdk';
import type { StagePartProps } from '@live/stage-sdk';
import type { Config } from './manifest';
import { boBat, DIEU_LUAN_PHIEN, DIEU_NGHI, MAN_THAY_DO, MODEL, NHAN_VAT, NHAN_VAT_MAU, TRANG_PHUC } from './core';
import { BO_NGAU_NHIEN, DIEU_NHOM } from './manifest';
import type { State } from './core';

const GLB = moduleAssetUrl('vu-cong-3d', MODEL);
const LA_BO = new Set<string>(TRANG_PHUC.map((t) => t.id));

/** Các bộ đám đông được bốc: các bộ phòng được đổi qua; không bật bộ nào thì mọi bộ. */
function boNgauNhien(config: Config): string[] {
  const ds = boBat(config);
  return ds.length > 0 ? ds : TRANG_PHUC.map((t) => t.id);
}

/** Không vẽ gì: khai cho cảnh 3D của thiết kế biết dựng vũ công nào, mặc bộ nào, nhảy
 *  điệu gì (hợp đồng slot `stage-3d`, docs/02 §5b). WebGL là của thiết kế — module mà
 *  dựng canvas riêng thì vũ công không đứng trong ánh đèn, bóng đổ, màn chiếu của phòng.
 *
 *  Chuỗi JSON chỉ đổi khi lõi đổi bộ hoặc điệu, nên React vẽ lại mỗi nhịp 250 ms cũng
 *  không làm thiết kế dựng lại gì. */
export function Stage({ config, modState }: StagePartProps<Config, State>) {
  // Món rời: danh mục từ máy chủ; bộ chưa che đủ thì boLenSong tự thêm lót, không có lót che được thì không mặc
  // (null → về bộ dựng sẵn). Tủ chưa tải xong cũng về bộ dựng sẵn, không bao giờ để trống người.
  const tuDo = locTuDo(useTuDo('vu-cong-3d'), NHAN_VAT_MAU.than);
  const bo = boLenSong(tuDo, config.doMon) ?? [];
  const url = (ds: readonly string[]): string[] =>
    (boLenSong(tuDo, ds) ?? []).map((m) => moduleAssetUrl('vu-cong-3d', m.duong));
  // món riêng từng người: chọn món mà tủ không có lót che được → về bộ dựng sẵn / theo nhóm như chưa chọn
  const monRieng = Object.fromEntries(
    NHAN_VAT.flatMap((x) => {
      const ds = url(config.nhanVat[x.id]?.mon ?? []);
      return ds.length > 0 ? [[x.id, ds]] : [];
    }),
  );
  // Kho nhân vật: bộ của từng người (đã kèm lót). Đám đông lấy người có "Có trong đám đông"; bộ VIP ngẫu nhiên bốc cả kho.
  const kho = config.khoNhanVat.map((c) => ({ damDong: c.damDong, bo: url(c.mon) })).filter((c) => c.bo.length > 0);
  const khoDam = kho.filter((c) => c.damDong).map((c) => c.bo);
  const td = modState.thayDo;
  // Bộ VIP: bốc theo id màn (cùng màn luôn ra cùng bộ, màn sau ra bộ khác)
  const vip =
    td === null
      ? []
      : config.vipNgauNhien && kho.length > 0
        ? (kho[Math.floor(rngChuoi(`vip-${td.id}`)() * kho.length)]?.bo ?? [])
        : url(config.doVip);
  // Luật phòng sàn bar: chỉ nhân vật người lớn. Đặt sau mọi hook (React cấm hook có điều kiện).
  if ((NHAN_VAT_MAU.tuoi as string) !== TUOI_NGUOI_LON) return null;
  const yeuCau: VuCong3D = {
    model: GLB,
    trangPhuc: modState.bo,
    dieu: modState.dongDien?.dieu ?? (modState.nghi ? DIEU_NGHI : null),
    tuDo: DIEU_LUAN_PHIEN,
    ...(modState.dongDien === null && modState.nghi ? { nghi: true } : {}),
    an: NHAN_VAT.map((x) => x.id).filter((id) => config.nhanVat[id]?.co === false),
    ...(bo.length > 0 ? { mon: bo.map((m) => moduleAssetUrl('vu-cong-3d', m.duong)) } : {}),
    ...(Object.keys(monRieng).length > 0 ? { monRieng } : {}),
    boRieng: Object.fromEntries(
      NHAN_VAT.flatMap((x) => {
        const bo = config.nhanVat[x.id]?.bo;
        return bo !== undefined && LA_BO.has(bo) ? [[x.id, bo]] : [];
      }),
    ),
    damDong: config.damDong
      .filter((n) => n.bat)
      .map((n, i) => {
        // mỗi người một nhân vật trong kho, lần lượt; nhóm sau bắt đầu lệch đi để hai nhóm không đứng y nhau
        const lech = khoDam.length > 0 ? (i * 3) % khoDam.length : 0;
        const monBo = n.theoKho ? [...khoDam.slice(lech), ...khoDam.slice(0, lech)] : [];
        return {
          id: n.id === '' ? `nhom-${i}` : n.id,
          so: n.so,
          khuVuc: n.khuVuc,
          bo: n.bo !== BO_NGAU_NHIEN && LA_BO.has(n.bo) ? [n.bo] : boNgauNhien(config),
          theoNhom: n.dieu !== DIEU_NHOM.tuDo,
          ...(monBo.length > 0 ? { monBo } : {}),
        };
      }),
    ...(td !== null && vip.length > 0
      ? { thayDo: { id: td.id, nguoi: td.nguoi, khach: td.khach, mon: vip, tu: td.tu, den: td.den, moc: MAN_THAY_DO } }
      : {}),
  };
  return <div hidden {...{ [CANH3D_ATTR]: JSON.stringify(yeuCau) }} />;
}
