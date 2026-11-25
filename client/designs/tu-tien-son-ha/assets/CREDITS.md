# Nguồn tài nguyên phòng Sơn Hà Tiên Lộ

- Cảnh (núi Ba Vì, sóng nước, yêu tinh, hào quang) vẽ bằng mã trên canvas ở `src/ve/`, không dùng ảnh ngoài.
- Tiếng hiệu ứng tổng hợp bằng WebAudio ở `src/am-thanh.ts`, không dùng file âm thanh.
- Phông chữ Be Vietnam Pro và Noto Serif tải từ Google Fonts (SIL Open Font License); không có mạng thì dùng phông hệ thống.
- Biểu tượng linh vật là emoji của hệ điều hành.
- Tranh yêu tinh `yeu/chan`, `bang`, `cop`, `giai` (2026-11-19) vẽ bằng ChatGPT Image theo `yeu/ngu` làm mẫu phong cách.
- Hoạt ảnh `yeu/dong/*.webp` dựng từ chính các tranh yêu tinh bằng FramePack (lllyasviel, Apache-2.0; HunyuanVideo)
  trên máy hpc, tách nền bằng rembg / BiRefNet — xem `scripts/phong/tu-tien/yeu-dong/`.
- Tranh kho trang bị `do/kho/*.webp` (120 món: tông × phẩm × ô × biến thể a/b/c, giáp y nam/nữ) chuyển từ bản gốc
  PNG 512 ở `web/son-ha-tien-lo/tranh-goc/` (trang-bi-son, trang-bi-thuy, giap-y) về webp 320 — vẽ bằng ChatGPT Image.
- Tranh chiêu thức công pháp `chieu/*.webp` (18 chiêu, 2026-11-22) vẽ bằng ChatGPT Image; bản gốc PNG ở
  `web/son-ha-tien-lo/tranh-goc/chieu-cp-son|thuy/`.
