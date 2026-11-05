"""(hpc) Vùng nào kéo điểm giống xuống: thay từng vùng của ảnh dựng bằng vùng đó của ảnh mẫu (và ngược lại), chấm lại SFace.
python part_swap.py <ảnh mẫu> <ảnh dựng> [--out thư mục ảnh ghép] [--band <ảnh dải tần.png>]
Ảnh dựng được đặt chồng vào khung ảnh mẫu bằng phép đồng dạng (khoé mắt, mũi, khoé miệng). Vùng = bao lồi điểm MediaPipe,
nới rộng, mép mờ.
- Cột 1: ảnh dựng + vùng đó của ảnh mẫu → điểm tăng bao nhiêu (vùng đáng sửa). Cột 2: ảnh mẫu + vùng đó của ảnh dựng → tụt.
- Phần da: tách tông màu (TB + lệch Lab) / sáng–tối thô (mờ σ 6, 15, 30 px) / vân (< σ 4 px).
- --band: ảnh dải tần độ sáng (DoG): kênh L (Lab), mờ σ 2 px − mờ σ 15 px, hiện 128 + 4 × giá trị; trái ảnh mẫu, phải ảnh dựng
  đã đặt chồng, cắt quanh mặt. Giữ chi tiết sáng–tối cỡ 2–15 px (~1–5 mm): nếp, khối mềm, kẻ mắt; bỏ tông màu, đèn tổng.
  Ảnh 1024 px chiều cao (ảnh mẫu thu về 1024)."""
import sys, os, cv2, numpy as np, mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision
M = os.path.expanduser("~/ai3d/models")
det = cv2.FaceDetectorYN.create(os.path.join(M, "face_detection_yunet_2023mar.onnx"), "", (320, 320), 0.6)
rec = cv2.FaceRecognizerSF.create(os.path.join(M, "face_recognition_sface_2021dec.onnx"), "")
lmk = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=mpt.BaseOptions(model_asset_path=os.path.expanduser("~/ai3d/face_landmarker.task")), num_faces=1, min_face_detection_confidence=0.2))
def feat(im):
    det.setInputSize((im.shape[1], im.shape[0])); _, f = det.detect(im)
    if f is None: return None
    f = max(f, key=lambda r: r[2] * r[3]); return rec.feature(rec.alignCrop(im, f)).ravel()
cos = lambda x, y: float(np.dot(x, y) / (np.linalg.norm(x) * np.linalg.norm(y)))
def L(im):
    r = lmk.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(im, cv2.COLOR_BGR2RGB)))
    l = r.face_landmarks[0]; return np.array([[q.x * im.shape[1], q.y * im.shape[0]] for q in l])
P = cv2.imread(sys.argv[1]); G = cv2.imread(sys.argv[2])
k = 1024 / P.shape[0]; P = cv2.resize(P, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
LP, LG = L(P), L(G)
AN = [33, 133, 362, 263, 1, 2, 64, 294, 61, 291]
Mx, _ = cv2.estimateAffinePartial2D(LG[AN], LP[AN])
Gw = cv2.warpAffine(G, Mx, (P.shape[1], P.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
REG = {
 "mày": [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
 "mắt": [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
 "mũi": [168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 98, 97, 326, 327, 294, 278, 344, 440, 275, 45, 220, 115, 48, 64],
 "miệng": [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185],
 "cằm": [57, 43, 106, 182, 83, 18, 313, 406, 335, 273, 287, 432, 434, 430, 394, 379, 378, 400, 377, 152, 148, 176, 149, 150, 169, 210, 214, 212],
 "má": [116, 123, 147, 213, 192, 214, 210, 50, 205, 187, 345, 352, 376, 433, 416, 434, 430, 280, 425, 411],
 "trán": [10, 338, 297, 332, 284, 251, 21, 54, 103, 67, 109, 151, 9, 107, 336],
}
OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
def mask(idx, grow=1.25, sep=False):
    m = np.zeros(P.shape[:2], np.float32)
    groups = [idx] if not sep else [idx[:len(idx) // 2], idx[len(idx) // 2:]]
    for g in groups:
        pts = LP[g]; c = pts.mean(0); pts = c + (pts - c) * grow
        cv2.fillConvexPoly(m, cv2.convexHull(pts.astype(np.int32)), 1.0)
    return cv2.GaussianBlur(m, (0, 0), 6)
masks = {n: mask(i, 1.35 if n in ("mày", "mắt") else 1.2, sep=n in ("mày", "mắt", "má")) for n, i in REG.items()}
ov = np.zeros(P.shape[:2], np.float32); cv2.fillPoly(ov, [LP[OVAL].astype(np.int32)], 1.0); ov = cv2.GaussianBlur(ov, (0, 0), 6)
masks["ngoài mặt (tai, nền, sọ)"] = 1 - ov
masks["da cả mặt (trừ mắt mày mũi miệng)"] = np.clip(ov - masks["mày"] - masks["mắt"] - masks["mũi"] - masks["miệng"], 0, 1)
fP, fG = feat(P), feat(Gw)
base = cos(fG, fP); print(f"gốc: cos {base:.3f}  (ảnh dựng đã đặt chồng)")
mix = lambda A, B, m: (A * (1 - m[..., None]) + B * m[..., None]).astype(np.uint8)
od = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else None
if od: os.makedirs(od, exist_ok=True)
print(f"{'vùng':34s} {'dựng + vùng ảnh mẫu':>20s} {'ảnh mẫu + vùng dựng':>22s}")
for n, m in masks.items():
    A = mix(Gw, P, m); B = mix(P, Gw, m)
    fa, fb = feat(A), feat(B)
    ca = cos(fa, fP) if fa is not None else float("nan"); cb = cos(fb, fP) if fb is not None else float("nan")
    print(f"{n:34s} {ca:.3f} ({ca - base:+.3f}) {cb:12.3f} ({cb - 1:+.3f})")
    if od: cv2.imwrite(os.path.join(od, f"{n.split()[0]}.png"), A)

# --- da: tách tông màu / bóng sáng–tối (tần số thấp) / vân (tần số cao) ---
m = masks["da cả mặt (trừ mắt mày mũi miệng)"]; sel = m > 0.5
lab = lambda im: cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32)
bgr = lambda x: cv2.cvtColor(np.clip(x, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)
Lp, Lg = lab(P), lab(Gw)
def tone(Lg_):          # chuyển trung bình + độ lệch từng kênh Lab của da dựng về da mẫu
    o = Lg_.copy()
    for c in range(3):
        mu_g, sd_g = Lg_[..., c][sel].mean(), Lg_[..., c][sel].std(); mu_p, sd_p = Lp[..., c][sel].mean(), Lp[..., c][sel].std()
        o[..., c] = (Lg_[..., c] - mu_g) / max(sd_g, 1e-3) * sd_p + mu_p
    return o
def band(L_, s):
    return cv2.GaussianBlur(L_, (0, 0), s)
tests = {}
tests["tông màu (TB + lệch Lab)"] = tone(Lg)
tests["chỉ TB màu (a,b) + sáng TB"] = Lg + (np.array([Lp[..., c][sel].mean() - Lg[..., c][sel].mean() for c in range(3)]))[None, None]
for s in (6, 15, 30):
    o = Lg.copy(); o[..., 0] = Lg[..., 0] - band(Lg[..., 0], s) + band(Lp[..., 0], s); tests[f"bóng sáng–tối mẫu (mờ σ{s}px)"] = o
o = Lg.copy(); o[..., 0] = band(Lg[..., 0], 4) + (Lp[..., 0] - band(Lp[..., 0], 4)); tests["vân da mẫu (< σ4px)"] = o
o = tone(Lg); o[..., 0] = o[..., 0] - band(o[..., 0], 15) + band(Lp[..., 0], 15); tests["tông + bóng σ15"] = o
print("--- da (chỉ trong vùng da) ---")
for n, o in tests.items():
    A = mix(Gw, bgr(o), m); f = feat(A); c = cos(f, fP) if f is not None else float("nan")
    print(f"{n:34s} {c:.3f} ({c - base:+.3f})")
    if od: cv2.imwrite(os.path.join(od, "da_" + n.split()[0] + n.split()[-1].replace("(", "").replace(")", "") + ".png"), A)

if "--band" in sys.argv:
    Lp_ = cv2.cvtColor(P, cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32); Lg_ = cv2.cvtColor(Gw, cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32)
    bp = lambda L_: cv2.GaussianBlur(L_, (0, 0), 2) - cv2.GaussianBlur(L_, (0, 0), 15)
    vis = lambda b: np.clip(128 + b * 4, 0, 255).astype(np.uint8)
    x0, y0 = int(LP[:, 0].min()) - 20, int(LP[:, 1].min()) - 20; x1, y1 = int(LP[:, 0].max()) + 20, int(LP[:, 1].max()) + 20
    cv2.imwrite(sys.argv[sys.argv.index("--band") + 1], np.hstack([vis(bp(Lp_))[y0:y1, x0:x1], vis(bp(Lg_))[y0:y1, x0:x1]]))
    print("BAND", sys.argv[sys.argv.index("--band") + 1])
