"""So viền hàm–cằm (MediaPipe 478 điểm) giữa ảnh chụp bản dựng và ảnh mẫu cùng góc.
python oval_cmp.py <thư mục ảnh mẫu> <thư mục ảnh dựng> --pairs 0:face-01-front.png,...
Căn theo khoé mắt, mũi, khoé miệng (đồng dạng 2D); in độ lệch dựng→mẫu của điểm viền hàm (đơn vị mm, quy theo 63 mm khoảng hai
khoé mắt ngoài... dùng bề ngang mắt trung bình 30 mm), và chiều sâu z (MediaPipe, tương đối mũi)."""
import sys, os, numpy as np, mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision
ref, ren = sys.argv[1:3]
pairs = [(p.split(":")[0], p.split(":")[1]) for p in sys.argv[sys.argv.index("--pairs") + 1].split(",")]
det = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=mpt.BaseOptions(model_asset_path=os.path.expanduser("~/ai3d/face_landmarker.task")), num_faces=1, min_face_detection_confidence=0.2))
def L(p):
    im = mp.Image.create_from_file(p); r = det.detect(im); l = r.face_landmarks[0]
    return np.array([[q.x * im.width, q.y * im.height, q.z * im.width] for q in l])
ANCH = [33, 133, 362, 263, 1, 2, 64, 294, 61, 291]
OVAL = {"hàm P 58": 58, "hàm P 172": 172, "hàm P 136": 136, "hàm P 150": 150, "cằm P 176": 176, "cằm P 148": 148, "cằm 152": 152,
        "cằm T 377": 377, "cằm T 400": 400, "hàm T 379": 379, "hàm T 365": 365, "hàm T 397": 397, "hàm T 288": 288,
        "má P 207": 207, "má T 427": 427, "dưới môi 18": 18, "cằm trước 199": 199, "cằm trước 175": 175}
for ang, f in pairs:
    A = L(os.path.join(ref, f)); B = L(os.path.join(ren, f"ortho_{ang}.png"))
    a, b = A[ANCH, :2], B[ANCH, :2]; am, bm = a.mean(0), b.mean(0)
    U, S, Vt = np.linalg.svd((b - bm).T @ (a - am)); R = (U @ Vt).T; s = S.sum() / ((b - bm) ** 2).sum()
    T = lambda P: s * (P - bm) @ R.T + am
    ew = (np.linalg.norm(A[33, :2] - A[133, :2]) + np.linalg.norm(A[362, :2] - A[263, :2])) / 2; mm = 30.0 / ew
    Bt = T(B[:, :2])
    print(f"== {ang}°  (mm, dương: x sang phải ảnh, y xuống)  chiều sâu z so mũi (mm, âm = nhô ra trước)")
    for k, i in OVAL.items():
        d = (A[i, :2] - Bt[i]) * mm
        za = (A[i, 2] - A[1, 2]) * mm; zb = (B[i, 2] - B[1, 2]) * s * mm
        print(f"  {k:14s} lệch x {d[0]:+5.1f}  y {d[1]:+5.1f}   z mẫu {za:+6.1f} dựng {zb:+6.1f}")

# --out <json>: điểm điều khiển cho jaw_nudge.py (ảnh chính diện): toạ độ px ảnh dựng, độ dời tới vị trí ảnh mẫu (px ảnh dựng),
# chênh chiều sâu (mm, âm = cần nhô ra trước); có lấy đối xứng; neo mắt, mày, mũi, môi, gò má (dời 0)
if "--out" in sys.argv:
    import json
    ang, f = pairs[0]
    A = L(os.path.join(ref, f)); B = L(os.path.join(ren, f"ortho_{ang}.png"))
    a, b = A[ANCH, :2], B[ANCH, :2]; am, bm = a.mean(0), b.mean(0)
    U, S, Vt = np.linalg.svd((a - am).T @ (b - bm)); R = (U @ Vt).T; s = S.sum() / ((a - am) ** 2).sum()
    Ti = lambda P: s * (P - am) @ R.T + bm                                   # ảnh mẫu → khung ảnh dựng
    ew = (np.linalg.norm(B[33, :2] - B[133, :2]) + np.linalg.norm(B[362, :2] - B[263, :2])) / 2; mmb = 30.0 / ew
    PAIRS = [(58, 288), (172, 397), (136, 365), (150, 379), (176, 400), (148, 377), (207, 427)]
    CEN = [152, 18, 199, 175]
    At = Ti(A[:, :2])
    D = At - B[:, :2]; Z = ((A[:, 2] - A[1, 2]) * s - (B[:, 2] - B[1, 2])) * mmb       # mm (ảnh dựng)
    pts = {}
    for i, j in PAIRS:
        dx = (D[i, 0] - D[j, 0]) / 2; dy = (D[i, 1] + D[j, 1]) / 2; dz = (Z[i] + Z[j]) / 2
        pts[i] = [*B[i, :2], dx, dy, dz]; pts[j] = [*B[j, :2], -dx, dy, dz]
    for i in CEN:
        pts[i] = [*B[i, :2], 0.0, D[i, 1], Z[i]]
    for i in (33, 133, 362, 263, 159, 145, 386, 374, 105, 334, 107, 336, 1, 2, 64, 294, 98, 327, 61, 291, 0, 13, 14, 17, 37, 267,
              84, 314, 234, 454, 93, 323, 10, 151):
        pts[i] = [*B[i, :2], 0.0, 0.0, 0.0]
    json.dump({"mm_per_px": mmb, "points": {str(k): [float(x) for x in v] for k, v in pts.items()}},
              open(sys.argv[sys.argv.index("--out") + 1], "w"), indent=1)
    print("OUT", len(pts))
