import { z } from 'zod';
import { KHU_VUC } from '@live/contracts';
import type { ModuleManifest } from '@live/contracts';
import { KHO_DIEU, NGAU_NHIEN, NHAN_VAT, NHAN_VAT_MAU, NUT, nhanDieu, THEO_NHOM, TRANG_PHUC } from './core';

/** Ảnh nhỏ từng bộ, asset của chính module. Viết thẳng đường dẫn thay vì gọi
 *  `moduleAssetUrl`: manifest phải nạp được ở Node (test, trang quản lý) mà không kéo
 *  stage-sdk theo. Dạng đường dẫn giữ đúng như `moduleAssetUrl` (`/m/<id>/<tệp>`). */
const anh = (id: string, duoi = 'webp'): string => `/m/vu-cong-3d/thumbs/${id}.${duoi}`;
const LUA_CHON = TRANG_PHUC.map((t) => ({ value: t.id, label: t.ten, img: anh(t.id) }));

/** Bộ đồ của một nhóm đám đông nghĩa là mỗi người bốc một bộ trong "Các bộ phòng được đổi qua". */
export const BO_NGAU_NHIEN = '';
/** Điệu của một nhóm đám đông: theo điệu chung của vai chính, hay mỗi người tự nhảy. */
export const DIEU_NHOM = { theoNhom: 'theo-nhom', tuDo: 'tu-do' } as const;
/** Trên tổng mọi nhóm: hơn số này thì máy phát live vẽ không nổi (mỗi người là một
 *  nhân vật có xương). Thiết kế cũng tự chặn ở số này. */
export const TOI_DA_DAM_DONG = 40;

const NHOM_MOI = {
  ten: 'Nhóm khách',
  bat: true,
  so: 8,
  khuVuc: KHU_VUC[0].id,
  bo: BO_NGAU_NHIEN,
  dieu: DIEU_NHOM.theoNhom,
};

export const schema = z.object({
  /** Từng người trong phòng (id trong `NHAN_VAT`): có mặt không, mặc bộ riêng hay theo
   *  cả nhóm (`THEO_NHOM`). Người thiếu trong đây là có mặt, theo cả nhóm. */
  nhanVat: z
    .record(z.string(), z.object({ co: z.boolean().default(true), bo: z.string().default(THEO_NHOM) }))
    .default(Object.fromEntries(NHAN_VAT.map((x) => [x.id, { co: true, bo: THEO_NHOM }]))),
  /** Món rời từ tủ đồ cả nhóm đang mặc (khoá `nguồn/ô/món`). Rỗng = dùng các bộ dựng sẵn trong GLB bên dưới. */
  doMon: z.array(z.string()).default([]),
  /** Bộ đang mặc (hoặc bộ mặc đầu tiên khi phòng tự đổi đồ). */
  boDangMac: z.string().default('ao-thun-short'),
  /** Các bộ phòng được đổi qua. Bikini mặc định tắt: hợp phòng bãi biển, phòng hộp
   *  đêm mà mặc đồ bơi dễ bị TikTok coi là "phô trương", gỡ live. */
  boBat: z.array(z.string()).default(['ao-thun-short', 'ao-thun-jeans', 'the-thao', 'cong-so']),
  doiDoKhiCoQua: z.boolean().default(false),
  /** Tự đổi sang bộ bật kế tiếp mỗi ngần này phút. 0 = không tự đổi. */
  doiDoPhut: z.number().int().min(0).max(120).default(0),
  dongDienKhiCoQua: z.boolean().default(true),
  dongDienGiay: z.number().int().min(5).max(300).default(20),
  /** Điệu khi đồng diễn (quà hoặc nút "Nhảy ngay"): một điệu cố định, hoặc ngẫu nhiên. */
  dieu: z.string().default(NGAU_NHIEN),
  /** Chế độ ngẫu nhiên: cả nhóm sang điệu khác sau mỗi ngần này giây. */
  doiDieuGiay: z.number().int().min(3).max(120).default(10),
  /** Đám đông: các nhóm người vận hành tự thêm. Mặc định không có — đám đông nặng máy. */
  damDong: z
    .array(
      z.object({
        id: z.string().default(''),
        ten: z.string().default(NHOM_MOI.ten),
        bat: z.boolean().default(true),
        so: z.number().int().min(1).max(TOI_DA_DAM_DONG).default(NHOM_MOI.so),
        khuVuc: z.string().default(NHOM_MOI.khuVuc),
        bo: z.string().default(BO_NGAU_NHIEN),
        dieu: z.string().default(NHOM_MOI.dieu),
      }),
    )
    .max(6)
    .default([]),
});

export type Config = z.infer<typeof schema>;

export const manifest: ModuleManifest<Config> = {
  id: 'vu-cong-3d',
  name: 'Vũ công 3D',
  icon: '🕺',
  summary: 'Vũ công 3D nhảy trên sàn, đổi trang phục, có quà thì cả nhóm đồng diễn',
  room: 'san-bar',
  triggers: ['gift'],
  configVersion: 1,
  schema,
  slots: ['stage-3d'],
  needs: ['stage-3d'],
  quick: ['boDangMac', 'dieu', 'dongDienKhiCoQua'],
  actions: [
    { label: 'Nhảy ngay', op: NUT.nhay, icon: '💃' },
    { label: 'Thôi nhảy', op: NUT.thoi, icon: '⏹' },
  ],
  // Thứ tự ô = thứ tự tab: Cài đặt (phản ứng khi có quà) · Vai chính · Đám đông · Điệu nhảy · Trang phục.
  fields: [
    {
      key: 'dongDienKhiCoQua',
      label: 'Có quà thì cả nhóm đồng diễn',
      short: 'Đồng diễn',
      type: 'toggle',
      hint: 'Mọi vũ công cùng một điệu; tắt thì mỗi người tự đổi điệu',
    },
    {
      key: 'dongDienGiay',
      label: 'Một màn đồng diễn',
      type: 'number',
      unit: 'giây',
      min: 5,
      max: 300,
    },
    {
      key: 'doiDoKhiCoQua',
      label: 'Có quà thì đổi đồ',
      short: 'Đổi đồ khi quà',
      type: 'toggle',
      hint: 'Sang bộ bật kế tiếp',
    },
    {
      key: 'nhanVat',
      label: 'Vai chính',
      type: 'roster',
      options: NHAN_VAT.map((x) => ({ value: x.id, label: x.ten })),
      fields: [
        {
          key: 'co',
          label: 'Có mặt',
          type: 'toggle',
          hint: 'Tắt thì người này không hiện trên sóng',
        },
        {
          key: 'bo',
          label: 'Bộ đồ',
          type: 'select',
          options: [{ value: THEO_NHOM, label: 'Theo cả nhóm', img: anh('theo-nhom', 'svg') }, ...LUA_CHON],
          hint: '"Theo cả nhóm" là mặc bộ ở tab Trang phục, đổi đồ theo quà và theo giờ cùng mọi người',
        },
      ],
      tab: 'Vai chính',
    },
    {
      key: 'damDong',
      label: 'Nhóm',
      type: 'list',
      max: 6,
      moi: NHOM_MOI,
      hint: `Đám đông quanh vai chính, chỉnh theo nhóm chứ không từng người. Tổng mọi nhóm tối đa ${TOI_DA_DAM_DONG} người — nhiều hơn máy phát live vẽ không nổi.`,
      fields: [
        { key: 'ten', label: 'Tên nhóm', type: 'text' },
        { key: 'bat', label: 'Bật nhóm', type: 'toggle' },
        { key: 'so', label: 'Số người', type: 'range', min: 1, max: TOI_DA_DAM_DONG },
        {
          key: 'khuVuc',
          label: 'Đứng ở',
          type: 'select',
          options: KHU_VUC.map((k) => ({ value: k.id, label: k.ten })),
        },
        {
          key: 'bo',
          label: 'Trang phục',
          type: 'select',
          options: [
            { value: BO_NGAU_NHIEN, label: 'Ngẫu nhiên', img: anh('theo-nhom', 'svg') },
            ...LUA_CHON,
          ],
          hint: '"Ngẫu nhiên" là mỗi người một bộ trong "Các bộ phòng được đổi qua"',
        },
        {
          key: 'dieu',
          label: 'Điệu',
          type: 'select',
          options: [
            { value: DIEU_NHOM.theoNhom, label: 'Theo cả nhóm — nhảy cùng vai chính' },
            { value: DIEU_NHOM.tuDo, label: 'Mỗi người một điệu' },
          ],
        },
      ],
      tab: 'Đám đông',
    },
    {
      key: 'dieu',
      label: 'Điệu đồng diễn',
      short: 'Điệu',
      type: 'select',
      options: [
        { value: NGAU_NHIEN, label: 'Ngẫu nhiên' },
        ...KHO_DIEU.map((x) => ({ value: x.ten, label: nhanDieu(x) })),
      ],
      hint: 'Dùng cho cả khi có quà và nút "Nhảy ngay". Chọn một điệu là cả nhóm nhảy mãi điệu đó; "Ngẫu nhiên" bỏ qua đoạn nối và điệu cần dây.',
      popup: ['doiDieuGiay'],
      tab: 'Điệu nhảy',
    },
    {
      key: 'doiDieuGiay',
      label: 'Ngẫu nhiên: đổi điệu mỗi',
      type: 'number',
      unit: 'giây',
      min: 3,
      max: 120,
      hint: 'Chỉ dùng khi điệu là "Ngẫu nhiên"',
      tab: 'Điệu nhảy',
    },
    {
      key: 'doMon',
      label: 'Tủ đồ',
      type: 'tu-do',
      than: NHAN_VAT_MAU.than,
      hint: 'Bấm món để mặc / cởi; đầm thay cả áo lẫn quần. Bộ chưa che đủ thì tự mặc kèm đồ lót an toàn. Không chọn món nào là dùng các bộ có sẵn bên dưới.',
      tab: 'Trang phục',
    },
    {
      key: 'boDangMac',
      label: 'Đang mặc',
      short: 'Bộ',
      type: 'select',
      options: LUA_CHON,
      tab: 'Trang phục',
    },
    {
      key: 'boBat',
      label: 'Các bộ phòng được đổi qua',
      type: 'gallery',
      options: LUA_CHON,
      hint: 'Bấm ảnh để bật / tắt. Bikini hợp phòng bãi biển; phòng hộp đêm nên tắt.',
      tab: 'Trang phục',
    },
    {
      key: 'doiDoPhut',
      label: 'Tự đổi đồ mỗi',
      type: 'number',
      unit: 'phút',
      min: 0,
      max: 120,
      hint: '0 là không tự đổi',
      tab: 'Trang phục',
    },
  ],
};
