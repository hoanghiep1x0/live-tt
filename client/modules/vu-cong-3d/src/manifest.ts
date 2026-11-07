import { z } from 'zod';
import { KHU_VUC } from '@live/contracts';
import type { ModuleManifest } from '@live/contracts';
import { AI_NGAU_NHIEN, KHO_DIEU, MODEL, NGAU_NHIEN, NHAN_VAT, NHAN_VAT_MAU, NUT, nhanDieu, THEO_NHOM, TRANG_PHUC } from './core';

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
  theoKho: true,
};

const k = (nguon: 'cc0' | 'ccby', o: string, id: string): string => `model-1/makehuman-${nguon}/${o}/${id}`;
const GOC_TRONG = { anhCheo: '', anhNghieng: '', anhCheoSau: '', anhSau: '', anhCheoP: '', anhNghiengP: '', anhCheoSauP: '' };
/** Kho nhân vật dựng sẵn: mỗi người một bộ phối đẹp — đám đông lấy người từ đây (không bốc lung tung cả tủ). */
const KHO_MAC_DINH = [
  { id: 'nv-cocktail', ten: 'Cocktail đen', mon: [k('ccby', 'lien', 'punkduck-black-cocktail-dress'), k('cc0', 'giay', 'toigo-stiletto-booties'), k('ccby', 'toc', 'punkduck-alpha7-long')] },
  { id: 'nv-dam-do', ten: 'Đầm đỏ dự tiệc', mon: [k('ccby', 'lien', 'mindfront-f-dress-08'), k('ccby', 'giay', 'dressupdoc-sandals1'), k('ccby', 'toc', 'elvs-hazel-hair')] },
  { id: 'nv-disco', ten: 'Disco tím', mon: [k('ccby', 'ao', 'elvs-disco-top-1-butterfly'), k('ccby', 'duoi', 'punkduck-black-mini-skirt'), k('ccby', 'giay', 'elvs-knee-high-heel-boots1'), k('ccby', 'toc', 'elvs-that-80s-babe-hair')] },
  { id: 'nv-short-jean', ten: 'Áo quây + short jean', mon: [k('ccby', 'ao', 'punkduck-tube-top'), k('ccby', 'duoi', 'punkduck-female-short-jeans'), k('cc0', 'giay', 'scailman-gogo-platform-boots'), k('cc0', 'toc', 'toigo-blunt-bob-with-bangs'), k('ccby', 'kinh', 'elvs-ladies-sunglass1')] },
  { id: 'nv-suon-xam', ten: 'Sườn xám đỏ', mon: [k('ccby', 'lien', 'punkduck-middle-length-qipao'), k('ccby', 'giay', 'dressupdoc-sandals1'), k('ccby', 'toc', 'o4saken-chinesebob01')] },
  { id: 'nv-dam-quay', ten: 'Đầm quây trắng', mon: [k('ccby', 'lien', 'punkduck-tube-dress'), k('ccby', 'giay', 'madmanny-tight-leather-boots'), k('ccby', 'toc', 'elvs-wavy-bob')] },
  { id: 'nv-croptop', ten: 'Croptop + váy xếp ly', mon: [k('ccby', 'ao', 'punkduck-sleeveless-crop-top'), k('ccby', 'duoi', 'mtknife-pleated-mini-skirt'), k('cc0', 'giay', 'toigo-ankle-boots-female'), k('cc0', 'toc', 'culturalibre-hair-01')] },
  { id: 'nv-yem-do', ten: 'Đầm yếm đỏ', mon: [k('ccby', 'lien', 'elvs-halter-dress-mini'), k('cc0', 'giay', 'toigo-stiletto-booties'), k('ccby', 'toc', 'elvs-katherine-hair')] },
].map((x) => ({ ...x, damDong: true, anh: '', ...GOC_TRONG, boAnh: [] }));
const NHAN_VAT_MOI = { ten: 'Nhân vật mới', damDong: true, anh: '', ...GOC_TRONG, boAnh: [], mon: [] };
const BO_ANH_MOI = { ten: 'Bộ mới', bat: true, anh: '', ...GOC_TRONG };
/** 8 ô ảnh góc của một bộ ảnh động (bộ đầu của nhân vật, hoặc một bộ trong "Bộ đồ khác"). */
const GOC_ANH = {
  anh: z.string().default(''),
  anhCheo: z.string().default(''),
  anhNghieng: z.string().default(''),
  anhCheoSau: z.string().default(''),
  anhSau: z.string().default(''),
  anhCheoP: z.string().default(''),
  anhNghiengP: z.string().default(''),
  anhCheoSauP: z.string().default(''),
};

export const schema = z.object({
  /** Từng người trong phòng (id trong `NHAN_VAT`): có mặt không, món tủ đồ riêng (`mon`, có thì mặc các món này),
   *  không thì bộ dựng sẵn riêng hay theo cả nhóm (`THEO_NHOM`). Người thiếu trong đây là có mặt, theo cả nhóm. */
  nhanVat: z
    .record(
      z.string(),
      z.object({ co: z.boolean().default(true), mon: z.array(z.string()).default([]), bo: z.string().default(THEO_NHOM) }),
    )
    .default(Object.fromEntries(NHAN_VAT.map((x) => [x.id, { co: true, mon: [], bo: THEO_NHOM }]))),
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
  /** Màn thay đồ VIP: quà từ `thayDoXu` xu trở lên (hoặc nút "Thay đồ VIP") → cánh cửa, bùng nổ, ra đồ mới. */
  thayDoBat: z.boolean().default(true),
  thayDoXu: z.number().int().min(1).max(1_000_000).default(99),
  /** Ai thay đồ: id trong `NHAN_VAT`, hoặc `AI_NGAU_NHIEN` (một trong ba vũ công trên sàn). */
  thayDoAi: z.string().default('vu-cong-2'),
  /** Bộ VIP bốc ngẫu nhiên trong kho nhân vật mỗi màn; tắt thì mặc `doVip`. */
  vipNgauNhien: z.boolean().default(true),
  doVip: z.array(z.string()).default([]),
  /** Mặc đồ VIP ngần này phút rồi về đồ thường. */
  giuVipPhut: z.number().int().min(0).max(60).default(3),
  /** Lệnh soi: khách gõ "<lenhSoi> <số>" → camera cận + đèn rọi người số đó `soiGiay` giây. */
  soiBat: z.boolean().default(true),
  lenhSoi: z.string().default('soi'),
  soiGiay: z.number().int().min(5).max(120).default(20),
  /** Hiện số thứ tự nhỏ trên đầu mỗi người trên sàn (để khách biết gõ số nào). */
  hienSo: z.boolean().default(false),
  /** Lệnh đổi đồ: khách gõ "<lenhDoiDo> <số>" → người ảnh động số đó đổi sang bộ đồ khác của mình. */
  doiDoLenhBat: z.boolean().default(true),
  lenhDoiDo: z.string().default('doi do'),
  /** Kho nhân vật: mỗi người một bộ phối sẵn (món tủ đồ). Đám đông và bộ VIP ngẫu nhiên lấy từ đây. */
  khoNhanVat: z
    .array(
      z.object({
        id: z.string().default(''),
        ten: z.string().default(NHAN_VAT_MOI.ten),
        damDong: z.boolean().default(true),
        /** Ảnh động (GIF / WebP nền trong suốt): có thì nhân vật là tấm ảnh động trên sàn, bỏ qua `mon`. `anh` là mặt
         *  trước, 7 ô kia cùng điệu nhảy ở các góc 45° … 315°; thiếu thì lấy góc gần nhất / lật gương bên kia. */
        ...GOC_ANH,
        /** Bộ đồ khác của nhân vật ảnh động: mỗi bộ một bộ ảnh 8 góc (trang phục, phụ kiện vẽ liền vào ảnh). */
        boAnh: z
          .array(z.object({ id: z.string().default(''), ten: z.string().default(BO_ANH_MOI.ten), bat: z.boolean().default(true), ...GOC_ANH }))
          .max(8)
          .default([]),
        mon: z.array(z.string()).default([]),
      }),
    )
    .max(40)
    .default(KHO_MAC_DINH),
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
        /** Người trong nhóm lấy lần lượt từ kho nhân vật (những ai bật "Có trong đám đông"). Tắt thì mặc `bo`. */
        theoKho: z.boolean().default(true),
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
  triggers: ['gift', 'comment'],
  configVersion: 1,
  schema,
  slots: ['stage-3d'],
  needs: ['stage-3d'],
  quick: ['boDangMac', 'dieu', 'dongDienKhiCoQua'],
  actions: [
    { label: 'Nhảy ngay', op: NUT.nhay, icon: '💃' },
    { label: 'Thôi nhảy', op: NUT.thoi, icon: '⏹' },
    { label: 'Thay đồ VIP', op: NUT.thayDo, icon: '✨' },
  ],
  // Thứ tự ô = thứ tự tab: Cài đặt (phản ứng khi có quà) · Vai chính · Đám đông · Điệu nhảy · Đồ chung · Thay đồ VIP ·
  // Camera & số.
  // Trang phục, phụ kiện của từng người nằm ngay trong tab Vai chính / Đám đông: chọn người xong chọn đồ luôn.
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
          key: 'mon',
          label: 'Trang phục & phụ kiện',
          type: 'tu-do',
          than: NHAN_VAT_MAU.than,
          mau: MODEL,
          boSan: 'bo',
          hint: 'Bấm món để mặc / cởi; đầm thay cả áo lẫn quần. Bộ chưa che đủ thì tự mặc kèm đồ lót an toàn. Không chọn món nào thì mặc "Bộ dựng sẵn" bên dưới.',
        },
        {
          key: 'bo',
          label: 'Bộ dựng sẵn',
          type: 'select',
          options: [{ value: THEO_NHOM, label: 'Theo cả nhóm', img: anh('theo-nhom', 'svg') }, ...LUA_CHON],
          hint: 'Chỉ dùng khi người này chưa chọn món nào ở trên. "Theo cả nhóm" là mặc đồ chung ở tab Đồ chung, đổi đồ theo quà và theo giờ cùng mọi người',
        },
      ],
      tab: 'Vai chính',
    },
    {
      key: 'khoNhanVat',
      label: 'Nhân vật',
      type: 'list',
      max: 40,
      moi: NHAN_VAT_MOI,
      hint: 'Kho nhân vật: mỗi người một bộ phối sẵn. Đám đông lấy người từ đây, bộ VIP ngẫu nhiên cũng bốc từ đây.',
      fields: [
        { key: 'ten', label: 'Tên', type: 'text' },
        { key: 'damDong', label: 'Có trong đám đông', type: 'toggle' },
        {
          key: 'anh',
          label: 'Ảnh động (GIF) — thay cho nhân vật 3D',
          type: 'media',
          hint: 'Ảnh nền trong suốt, nhân vật người lớn đứng cả người, chính diện (vd GIF nhảy nhờ ChatGPT vẽ). Có ảnh thì người này đứng trên sàn thành tấm ảnh động quay về camera; để trống là nhân vật 3D mặc đồ bên dưới.',
          popup: ['anhCheo', 'anhNghieng', 'anhCheoSau', 'anhSau', 'anhCheoSauP', 'anhNghiengP', 'anhCheoP'],
        },
        { key: 'anhCheo', label: 'Góc 45° (quay sang trái màn hình)', type: 'media' },
        { key: 'anhNghieng', label: 'Góc 90° (nghiêng, quay sang trái)', type: 'media' },
        { key: 'anhCheoSau', label: 'Góc 135° (chéo sau, quay sang trái)', type: 'media' },
        { key: 'anhSau', label: 'Góc 180° (sau lưng)', type: 'media' },
        { key: 'anhCheoSauP', label: 'Góc 225° (chéo sau, quay sang phải)', type: 'media' },
        { key: 'anhNghiengP', label: 'Góc 270° (nghiêng, quay sang phải)', type: 'media' },
        {
          key: 'anhCheoP',
          label: 'Góc 315° (quay sang phải màn hình)',
          type: 'media',
          hint: 'Cùng điệu nhảy, cùng số khung, cùng cỡ người. Camera nhìn từ phía nào thì hiện đúng góc đó. Góc bên phải thiếu ảnh thì lật gương bên trái — chỉ đúng với dáng đối xứng.',
        },
        {
          key: 'boAnh',
          label: 'Bộ đồ khác (ảnh động)',
          type: 'list',
          max: 8,
          moi: BO_ANH_MOI,
          hint: 'Cùng nhân vật mặc bộ khác (trang phục + phụ kiện vẽ liền vào ảnh), mỗi bộ 8 góc như trên. Trên sàn mỗi người mặc ngẫu nhiên một bộ; có quà, tới giờ đổi đồ hoặc khách gõ lệnh đổi đồ thì đổi sang bộ khác.',
          fields: [
            { key: 'ten', label: 'Tên bộ', type: 'text' },
            { key: 'bat', label: 'Mặc bộ này trên sàn', type: 'toggle', hint: 'Tắt thì người ảnh động không mặc bộ này (vẫn giữ ảnh trong kho).' },
            {
              key: 'anh',
              label: 'Mặt trước',
              type: 'media',
              popup: ['anhCheo', 'anhNghieng', 'anhCheoSau', 'anhSau', 'anhCheoSauP', 'anhNghiengP', 'anhCheoP'],
            },
            { key: 'anhCheo', label: 'Góc 45° (quay sang trái màn hình)', type: 'media' },
            { key: 'anhNghieng', label: 'Góc 90° (nghiêng, quay sang trái)', type: 'media' },
            { key: 'anhCheoSau', label: 'Góc 135° (chéo sau, quay sang trái)', type: 'media' },
            { key: 'anhSau', label: 'Góc 180° (sau lưng)', type: 'media' },
            { key: 'anhCheoSauP', label: 'Góc 225° (chéo sau, quay sang phải)', type: 'media' },
            { key: 'anhNghiengP', label: 'Góc 270° (nghiêng, quay sang phải)', type: 'media' },
            { key: 'anhCheoP', label: 'Góc 315° (quay sang phải màn hình)', type: 'media' },
          ],
        },
        {
          key: 'mon',
          label: 'Trang phục & phụ kiện',
          type: 'tu-do',
          than: NHAN_VAT_MAU.than,
          mau: MODEL,
          hint: 'Bấm món để mặc / cởi; đầm thay cả áo lẫn quần. Luôn có đồ lót an toàn bên trong.',
        },
      ],
      tab: 'Đám đông',
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
          key: 'dieu',
          label: 'Điệu',
          type: 'select',
          options: [
            { value: DIEU_NHOM.theoNhom, label: 'Theo cả nhóm — nhảy cùng vai chính' },
            { value: DIEU_NHOM.tuDo, label: 'Ngẫu nhiên — mỗi người một điệu' },
          ],
        },
        {
          key: 'theoKho',
          label: 'Lấy người từ kho nhân vật',
          type: 'toggle',
          hint: 'Mỗi người một nhân vật trong "Nhân vật" ở trên (những ai bật "Có trong đám đông"), lần lượt không ai trùng ai. Tắt thì mặc "Bộ dựng sẵn".',
        },
        {
          key: 'bo',
          label: 'Bộ dựng sẵn',
          type: 'select',
          options: [
            { value: BO_NGAU_NHIEN, label: 'Ngẫu nhiên', img: anh('theo-nhom', 'svg') },
            ...LUA_CHON,
          ],
          hint: 'Dùng khi tắt "Lấy người từ kho nhân vật" (hoặc kho trống). "Ngẫu nhiên" là mỗi người một bộ trong "Các bộ phòng được đổi qua"',
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
      label: 'Đồ chung (người chọn "Theo cả nhóm")',
      type: 'tu-do',
      than: NHAN_VAT_MAU.than,
      mau: MODEL,
      boSan: 'boDangMac',
      hint: 'Bấm món để mặc / cởi; đầm thay cả áo lẫn quần. Bộ chưa che đủ thì tự mặc kèm đồ lót an toàn. Không chọn món nào là dùng các bộ có sẵn bên dưới.',
      tab: 'Đồ chung',
    },
    {
      key: 'boDangMac',
      label: 'Đang mặc',
      short: 'Bộ',
      type: 'select',
      options: LUA_CHON,
      tab: 'Đồ chung',
    },
    {
      key: 'boBat',
      label: 'Các bộ phòng được đổi qua',
      type: 'gallery',
      options: LUA_CHON,
      hint: 'Bấm ảnh để bật / tắt. Bikini hợp phòng bãi biển; phòng hộp đêm nên tắt.',
      tab: 'Đồ chung',
    },
    {
      key: 'doiDoPhut',
      label: 'Tự đổi đồ mỗi',
      type: 'number',
      unit: 'phút',
      min: 0,
      max: 120,
      hint: '0 là không tự đổi',
      tab: 'Đồ chung',
    },
    {
      key: 'thayDoBat',
      label: 'Màn thay đồ VIP khi có quà lớn',
      type: 'toggle',
      hint: 'Cánh cửa trồi lên giữa sàn, đóng lại, khói và pháo hoa bùng nổ, mở ra là bộ đồ mới — kèm lời cảm ơn khách.',
      tab: 'Thay đồ VIP',
    },
    {
      key: 'thayDoXu',
      label: 'Quà từ',
      type: 'number',
      unit: 'xu',
      min: 1,
      max: 1_000_000,
      hint: 'Một lượt tặng đạt ngần này xu là mở màn. Màn đang diễn thì quà sau không cắt ngang.',
      tab: 'Thay đồ VIP',
    },
    {
      key: 'thayDoAi',
      label: 'Ai thay đồ',
      type: 'select',
      options: [
        { value: AI_NGAU_NHIEN, label: 'Ngẫu nhiên — một trong ba vũ công' },
        ...NHAN_VAT.filter((x) => x.id.startsWith('vu-cong')).map((x) => ({ value: x.id, label: x.ten })),
      ],
      tab: 'Thay đồ VIP',
    },
    {
      key: 'vipNgauNhien',
      label: 'Bộ VIP ngẫu nhiên mỗi màn',
      type: 'toggle',
      hint: 'Mỗi màn bốc một bộ khác trong kho nhân vật (tab Đám đông) — khách tặng tiếp để xem bộ khác. Tắt thì mặc bộ VIP chọn bên dưới.',
      tab: 'Thay đồ VIP',
    },
    {
      key: 'doVip',
      label: 'Bộ VIP (khi tắt ngẫu nhiên)',
      type: 'tu-do',
      than: NHAN_VAT_MAU.than,
      mau: MODEL,
      hint: 'Bấm món để mặc / cởi. Luôn có đồ lót an toàn bên trong.',
      tab: 'Thay đồ VIP',
    },
    {
      key: 'giuVipPhut',
      label: 'Mặc đồ VIP trong',
      type: 'number',
      unit: 'phút',
      min: 0,
      max: 60,
      hint: '0 là chỉ trong màn thay đồ, xong về đồ cũ.',
      tab: 'Thay đồ VIP',
    },
    {
      key: 'soiBat',
      label: 'Khách gõ lệnh để soi một người',
      type: 'toggle',
      hint: 'Vd "soi 5": camera bay tới cận người số 5, đèn spot rọi theo người đó. Số 1–3 là vũ công chính (trái → phải), từ 4 là đám đông.',
      tab: 'Camera & số',
    },
    { key: 'lenhSoi', label: 'Chữ lệnh', type: 'text', hint: 'Khách gõ chữ này + số người', tab: 'Camera & số' },
    { key: 'soiGiay', label: 'Soi mỗi lần', type: 'number', unit: 'giây', min: 5, max: 120, tab: 'Camera & số' },
    {
      key: 'hienSo',
      label: 'Hiện số trên đầu mỗi người',
      type: 'toggle',
      hint: 'Mặc định tắt: số vẫn có (1–3 vũ công chính trái → phải, rồi đám đông) để lệnh soi chạy, chỉ không hiện lên sàn. Bật khi muốn khách biết người mình thích là số mấy.',
      tab: 'Camera & số',
    },
    {
      key: 'doiDoLenhBat',
      label: 'Khách gõ lệnh để đổi đồ một người',
      type: 'toggle',
      hint: 'Vd "đổi đồ 5": người ảnh động số 5 đổi sang bộ đồ khác của mình (cần có "Bộ đồ khác" trong kho nhân vật). Gõ có dấu hay không dấu đều được.',
      tab: 'Camera & số',
    },
    { key: 'lenhDoiDo', label: 'Chữ lệnh đổi đồ', type: 'text', hint: 'Khách gõ chữ này + số người', tab: 'Camera & số' },
  ],
};
