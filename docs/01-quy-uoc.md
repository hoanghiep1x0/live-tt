# 01 — Quy ước mã

Quy ước trong tài liệu này là bắt buộc. Review từ chối mã không theo.

## 1. Thư mục gốc

Mỗi thư mục ở gốc có đúng một nhiệm vụ. Không đặt file lạc chỗ.

| Thư mục | Chứa gì | Commit? |
|---|---|---|
| `client/` | Mọi thứ chạy trong trình duyệt | Có |
| `backend/` | Máy chủ và vỏ desktop (Tauri + Rust) | Có |
| `tests/` | **Toàn bộ test** — không để test cạnh mã nguồn | Có |
| `docs/` | Tài liệu, kế hoạch, đặc tả | Có |
| `scripts/` | Script thực thi, mỗi việc một cặp `.ps1` và `.sh` | Có |
| `database/` | Schema, migrations, dữ liệu lâu dài | Chỉ schema + migrations |
| `design/` | Bản mẫu HTML của giao diện, để đối chiếu khi làm React | Có |
| `.tmp/` | Rác, xoá được bất cứ lúc nào | Không |
| `.env.example` | Mẫu biến môi trường | Có |
| `.env` | Biến môi trường thật | **Không** |

Quy tắc kèm theo:

- File tạm **luôn** ghi vào `.tmp/`, không bao giờ ghi ra gốc dự án hay vào `scripts/`.
- `database/` dùng **một cơ sở dữ liệu chung cho dev và production**, không tách hai bản.
- Khoá API không bao giờ nằm trong `client/`. Chúng ở `database/secrets.json`, chỉ backend đọc.

## 2. Bên trong `client/`

```
client/
├─ manager/              trang quản lý: Trình duyệt · Thiết kế · Tính năng
├─ shared/               dùng chung, không chứa tính năng cụ thể
│  ├─ contracts/         type + zod schema, backend cũng theo
│  ├─ runtime/           lõi thuần: bus, registry, vòng đời module
│  ├─ stage-sdk/         SDK cho thiết kế: nối WS, nhận cấu hình nóng
│  └─ ui/                component dùng chung
├─ modules/              MỖI TÍNH NĂNG MỘT THƯ MỤC
│  └─ <module-id>/
│     ├─ package.json    name: "@live/mod-<module-id>"
│     └─ src/
│        ├─ manifest.ts  khai báo + schema cấu hình
│        ├─ core.ts      lõi thuần, KHÔNG import React
│        ├─ stage.tsx    lớp hiển thị (tuỳ chọn)
│        └─ index.ts
└─ designs/              MỖI THIẾT KẾ MỘT THƯ MỤC
   └─ <design-id>/
      ├─ design.json     manifest thiết kế
      ├─ package.json    name: "@live/design-<design-id>"
      ├─ src/
      └─ assets/         assets RIÊNG, không dùng chung với thiết kế khác
```

## 3. Bên trong `tests/`

Test nằm tập trung, cây thư mục soi gương với mã nguồn:

```
tests/
├─ client/
│  ├─ shared/<tên>.test.ts
│  ├─ modules/<module-id>/core.test.ts
│  └─ designs/<design-id>/<tên>.test.ts
└─ backend/              test tích hợp gọi qua HTTP
```

Ngoại lệ duy nhất: **unit test của Rust nằm trong chính file `.rs`** theo thông lệ Rust
(`#[cfg(test)] mod tests`). Test tích hợp của backend thì để ở `tests/backend/`.

Chạy:

```bash
npx vitest run                              # toàn bộ test client
npx vitest run tests/client/modules         # một nhóm
./scripts/kiem-tra.sh                       # typecheck + test + cargo test
```

Module không có test cho `core.ts` thì không được đăng ký vào registry.

## 4. Ngôn ngữ

| Chỗ | Ngôn ngữ |
|---|---|
| Type, interface, tên component React, tên file | Tiếng Anh, không dấu |
| Khoá JSON, id, đường dẫn REST — mọi thứ qua ranh giới | Tiếng Anh, không dấu |
| Biến và hàm nội bộ | Tiếng Việt **không dấu** cũng được, vd `tu_choi`, `kiemModule` |
| Chữ hiện trên giao diện | Tiếng Việt có dấu |
| Chú thích trong mã | Tiếng Việt, giải thích **vì sao**, không kể lại mã làm gì |
| Tài liệu, commit, tên nhánh | Tiếng Việt |
| `id` của module và thiết kế | kebab-case tiếng Anh: `gift-thanks`, `ke-chuyen` |

```ts
// Phòng đông người vào liên tục: chào quá dày sẽ lấn bình luận thật.
const JOIN_GREET_GAP_MS = 12_000;
```

Tên file: kebab-case (`gift-thanks.ts`). Component React: PascalCase (`StageView.tsx`).

## 5. Lõi thuần tách khỏi React

Đây là quy ước quan trọng nhất.

**`core.ts` không được import:** `react`, `three`, `window`, `document`, `localStorage`, `fetch`, `Date.now()`.

Thời gian và ngẫu nhiên phải **tiêm vào**, không gọi trực tiếp:

```ts
// ĐÚNG — test được, chạy lại cho cùng kết quả
export function step(state: S, now: number, rand: () => number): Effect[] { … }

// SAI — không test được
export function step(state: S): Effect[] {
  if (Date.now() - state.last > 5000 && Math.random() < 0.3) { … }
}
```

Lý do: lõi thuần chạy được cả ở Node (test) và ở trình duyệt (thiết kế).
Mọi I/O — âm thanh, mạng, lưu trữ, DOM — nằm ở `stage.tsx` hoặc ở backend.

## 6. Không hard-code id

```ts
// SAI — mã cũ mắc lỗi này ở 5 nơi
const STYLE_ID_RE = /^kieu-\d{1,3}$/;
if (previewStyle === 'kieu-2') return <PlaygroundSettings />;

// ĐÚNG — đọc từ manifest
const panel = registry.get(designId)?.settingsPanel;
```

Không `if/else` theo id ở bất kỳ đâu. Muốn phân nhánh thì khai báo trong manifest.

## 7. Cấu hình

- Mỗi module tự khai báo schema bằng **zod** trong `manifest.ts`. Không có interface `Settings` chung.
- Giá trị mặc định nằm trong schema (`.default(...)`), không tách ra hằng riêng.
- Backend kiểm tra bằng chính schema đó trước khi ghi. Dữ liệu sai bị từ chối kèm lý do, không im lặng bỏ qua.
- Đổi hình dạng cấu hình thì tăng `configVersion` và viết `migrate`. Không nhét migration vào chỗ nạp chung.

## 8. Hiệu ứng (Effect), không dispatch thẳng

Module **không** gọi `dispatch`, không chạm DOM, không phát âm thanh. Module chỉ **trả về** `Effect[]`.

```ts
// SAI
onFeed(state, item) { dispatch({ type: 'host-say', text: 'Cảm ơn' }); }

// ĐÚNG
onFeed(state, item) { return [{ kind: 'say', text: 'Cảm ơn', voice: 'nu-bac' }]; }
```

Lý do: trả về giá trị thì test được, ghi log được, chặn được bằng cổng an toàn.

## 9. Phiên bản

Một nguồn duy nhất: `package.json` ở gốc. `backend/Cargo.toml` và `tauri.conf.json` đọc theo khi build.
Mã cũ để lệch `0.1.18` với `0.1.0` vì sửa tay ba chỗ — không lặp lại.

## 10. Commit

Tiếng Việt, một dòng đầu nói việc gì đổi theo góc nhìn người dùng, không phải tên file đã sửa.

```
Module cảm ơn quà: gộp quà dồn trong 5 giây thành một lời cảm ơn
```

## 11. Những điều cấm

| Cấm | Thay bằng |
|---|---|
| `localStorage` làm nguồn sự thật | REST tới backend |
| Khoá API trong `client/` | `database/secrets.json`, backend giữ |
| File tạm ở gốc dự án hoặc trong `scripts/` | `.tmp/` |
| Test nằm cạnh mã nguồn | `tests/` |
| `if (id === '…')` phân nhánh theo thiết kế hoặc module | Khai báo trong manifest |
| Module sửa cấu hình của module khác | `Effect` dạng `command`, để backend quyết |
| Union đóng phải sửa tay khi thêm module | Registry đọc từ manifest |
| Tải lại trang để áp cấu hình | `onConfig` áp nóng |
| Assets dùng chung giữa các thiết kế | Mỗi thiết kế một thư mục `assets/` |
| Sửa migration đã commit | Thêm migration mới |

## 12. Phân loại phòng: loại → kiểu

Sẽ có nhiều **loại phòng** (`cate`: sàn bar, kể chuyện, đám cưới, chùa…), mỗi loại có nhiều **kiểu phòng**
(`style`: sàn bar có hộp đêm, bãi biển…). Mọi thứ của một loại nằm dưới **cùng một tên loại**, mọi thứ của một kiểu
dưới **cùng một tên kiểu** — thêm loại hay kiểu mới là thêm thư mục, không sửa thư mục của loại khác.

| Thứ | Chung cho cả loại | Riêng của một kiểu |
|---|---|---|
| Thiết kế (gói chạy được, 1 lúc 1 cái) | — | `client/designs/<cate>-<style>/` |
| `design.json` | `"category": "<cate>"` | `"id": "<cate>-<style>"`, `"style": "<style>"` |
| Tài liệu | `docs/phong/<cate>/README.md`, `docs/phong/<cate>/<mảng>/` | `docs/phong/<cate>/<style>.md` |
| Script | `scripts/phong/<cate>/` | `scripts/phong/<cate>/<style>/` |
| Test | `tests/client/designs/<cate>-<style>/` | (cùng chỗ) |
| Assets | — (không có kho chung: **sao chép** vào từng kiểu, quy ước 04 §6) | `client/designs/<cate>-<style>/assets/` |

- `cate`, `style`: kebab-case tiếng Việt không dấu (`san-bar`, `hop-dem`). Id thiết kế ghép `<cate>-<style>` vì id nằm
  trong URL (`/d/<id>/`, `/a/<id>/`) và trong `database/designs/<id>/` — **không** dùng `/` trong id.
- Loại mới chỉ có một kiểu vẫn đặt tên kiểu (`<cate>-mac-dinh` hoặc tên thật). Ngoại lệ đã có trước quy ước này:
  `ke-chuyen` (loại `ke-chuyen`, kiểu mặc định) giữ id cũ.
- **Mảng dùng chung trong loại** (vd quy trình dựng nhân vật 3D của sàn bar) là `docs/phong/<cate>/<mảng>/` +
  `scripts/phong/<cate>/<mảng>/`. Thứ dùng chung **giữa các loại** thì không nằm trong `phong/`: tính năng là module,
  mã chung là `client/shared/`.
- Code chung giữa các kiểu của một loại (vd lõi dựng cảnh 3D) **sao chép** vào từng thiết kế như assets: đổi kiểu này
  không được làm vỡ kiểu kia. Khi đủ ba kiểu cùng dùng một đoạn mã thì mới tính chuyện tách gói.
- Mục lục các loại: [phong/README.md](phong/README.md).

