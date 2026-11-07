"""Ảnh động có alpha từ video MimicMotion: tách khung, làm nét (Real-ESRGAN anime ×2), rồi ghep_khung.py (tách nền,
cỡ người và chỗ chân theo người nộm cùng dáng) — khung i của video ứng với dang_ii của người nộm.

python video_sprite.py <video.mp4> <thư mục người nộm 64 dáng> <ra.webp> [--tre 100] [--to 3] [--khong-net]
  --to: người cao bằng người nộm × to (người nộm ~300 px → 3 ≈ 900 px, giữ được nét sau khi làm nét ×2).
  Video MimicMotion 576×1024 vẽ mềm, tay vung nhanh nhoè — realesr-animevideov3 ×2 làm sắc mắt, viền tóc, viền áo mà
  không bệt như mô hình ×4 (xem tài liệu 10 §7).
"""
import os, shutil, subprocess, sys
import cv2

ESRGAN = "/mnt/D/dung-3d/.tmp/esrgan/realesrgan-ncnn-vulkan"

vid, nom, ra = sys.argv[1:4]
tre = sys.argv[sys.argv.index("--tre") + 1] if "--tre" in sys.argv else "100"
to = sys.argv[sys.argv.index("--to") + 1] if "--to" in sys.argv else "3"
net = "--khong-net" not in sys.argv
d = os.path.splitext(ra)[0] + "-khung"
shutil.rmtree(d, ignore_errors=True)
os.makedirs(f"{d}/goc")
v = cv2.VideoCapture(vid); n = 0
while True:
    ok, f = v.read()
    if not ok:
        break
    cv2.imwrite(f"{d}/goc/{n:03d}.png", f); n += 1
print("KHUNG", n, flush=True)
khung = f"{d}/goc"
if net:
    # -t 128: chia ô nhỏ cho vừa VRAM khi card đang bận MimicMotion. Thư mục ra phải có sẵn — chưa có thì
    # realesrgan-ncnn-vulkan coi là tên file và báo "invalid outputpath extension type"
    os.makedirs(f"{d}/net")
    subprocess.run([ESRGAN, "-i", khung, "-o", f"{d}/net", "-m", os.path.join(os.path.dirname(ESRGAN), "models"),
                    "-n", "realesr-animevideov3", "-s", "2", "-t", "128", "-f", "png"],
                   check=True, capture_output=True)
    khung = f"{d}/net"
with open(f"{d}/ds.txt", "w") as ds:
    for i in range(n):
        ds.write(f"{i} {khung}/{i:03d}.png\n")
subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "ghep_khung.py"), ra, nom,
                f"{d}/ds.txt", "--to", to, "--tre", tre], check=True)
