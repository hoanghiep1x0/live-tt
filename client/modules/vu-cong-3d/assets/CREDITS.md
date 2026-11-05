# Nguồn gốc assets — module vũ công 3D (`vu-cong-3d`)

Mã module ở `../src/` (slot `stage-3d`, hợp đồng `docs/02-hop-dong.md` §5b). Backend phục vụ file ở `/m/vu-cong-3d/…`.

| File | Dùng làm gì | Nguồn | Giấy phép |
|---|---|---|---|
| `model-1.glb` | Nhân vật model-1: lưới MakeHuman, texture khớp ảnh, tóc bay, **77 điệu** (cả kho `D:\Assets\*.fbx`; danh sách và nhóm: `KHO_DIEU` trong `../src/core.ts`, docs/phong/san-bar/nhan-vat/04-dieu-nhay.md §2), 108 xương, **5 bộ đồ chọn lúc chạy**: áo thun + short jeans (MPFB `female_casualsuit02` + `shoes03`), áo thun + jeans (`female_casualsuit01` + `shoes06`), thể thao (`female_sportsuit01` + `shoes05`), sơ mi + chân váy (`female_elegantsuit01` + `shoes04`), bikini (tự dựng từ lưới thân, `bikini.py`) | Tự dựng: `scripts/phong/san-bar/nhan-vat/` từ bộ ảnh nhân vật nguyên bản `D:\Assets\model-1`; thân qua lớp an toàn `an_toan.py`, mọi bộ qua kiểm che vùng nhạy cảm (`rig_base --outfits`); hồ sơ đồ `D:\Assets\parts\body\model-1-tu-do.json`, bộ đồ `D:\Assets\parts\trang-phuc\model-1.json` (chuỗi lệnh: `docs/phong/san-bar/nhan-vat/07-nhat-ky-model-1.md`, cách dựng: `05-mo-rong.md` §7) | Của dự án. Lưới, da, mắt, mi, đồ: MakeHuman/MPFB CC0; bikini: của dự án; điệu: Mixamo (Adobe, dùng trong sản phẩm, không bán lại riêng); hình khối đầu, tóc: Hunyuan3D-2 (Tencent Community License — không áp dụng ở EU, Anh, Hàn Quốc) |
| `thumbs/<id>.webp` | Ảnh nhỏ từng bộ đồ trong modal cấu hình (ô `gallery`) | Tự chụp: `chup_trang_phuc.py` trên `base_v58_bikini.blend` | Của dự án (cùng nguồn với `model-1.glb`) |
