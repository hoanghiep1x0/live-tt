"""(hpc) Thước đo độ giống: mô hình nhận diện khuôn mặt chấm bản dựng so với ảnh mẫu, cùng góc.

python face_score.py <thư mục ảnh mẫu> <thư mục ảnh dựng> [--pairs 0:face-01-front.png,45:face-02-front-left-45.png,...] [--json ra.json]

- Mô hình: OpenCV Zoo — dò mặt YuNet (MIT) + nhận diện SFace (Apache 2.0), file ở ~/ai3d/models/. Không dùng mô hình InsightFace
  (giấy phép chỉ cho nghiên cứu phi thương mại).
- Mỗi cặp (ảnh dựng ortho_<góc>.png ↔ ảnh mẫu cùng góc): cos(đặc trưng). Thang tham chiếu = cos giữa chính các ảnh mẫu khác góc
  (cùng một người: "trần" thực tế của thước đo). In ra cos và % = cos(dựng, mẫu) / cos tham chiếu trung bình.
- SFace: cos ≥ 0,363 = "cùng người" theo ngưỡng của tác giả.
"""
import json
import os
import sys

import cv2
import numpy as np

M = os.path.expanduser("~/ai3d/models")
a = sys.argv[1:]
ref_dir, ren_dir = a[:2]
pairs = a[a.index("--pairs") + 1] if "--pairs" in a else \
    "0:face-01-front.png,45:face-02-front-left-45.png,315:face-08-front-right-315.png"
pairs = [p.split(":") for p in pairs.split(",")]
det = cv2.FaceDetectorYN.create(os.path.join(M, "face_detection_yunet_2023mar.onnx"), "", (320, 320), 0.6)
rec = cv2.FaceRecognizerSF.create(os.path.join(M, "face_recognition_sface_2021dec.onnx"), "")


def feat(path):
    im = cv2.imread(path)
    if im is None:
        return None
    if im.shape[0] > 1280:
        k = 1280 / im.shape[0]; im = cv2.resize(im, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
    det.setInputSize((im.shape[1], im.shape[0]))
    _, faces = det.detect(im)
    if faces is None or len(faces) == 0:
        return None
    f = max(faces, key=lambda r: r[2] * r[3])
    return rec.feature(rec.alignCrop(im, f)).ravel()


cos = lambda x, y: float(np.dot(x, y) / (np.linalg.norm(x) * np.linalg.norm(y)))
R = {g: feat(os.path.join(ref_dir, f)) for g, f in pairs}
G = {g: feat(os.path.join(ren_dir, f"ortho_{g}.png")) for g, _ in pairs}
refs = [cos(R[x], R[y]) for i, (x, _) in enumerate(pairs) for (y, _) in pairs[i + 1:] if R[x] is not None and R[y] is not None]
base = float(np.mean(refs)) if refs else 1.0
out = {"ref_cos": round(base, 4), "views": {}}
print(f"tham chiếu (ảnh mẫu khác góc với nhau): cos {base:.3f}")
for g, _ in pairs:
    if R[g] is None or G[g] is None:
        print(f"  {g:>3}°: không dò được mặt ({'mẫu' if R[g] is None else 'dựng'})"); continue
    c = cos(R[g], G[g]); cf = cos(R[pairs[0][0]], G[g]) if R[pairs[0][0]] is not None else c
    out["views"][g] = {"cos": round(c, 4), "cos_front": round(cf, 4), "pct": round(100 * c / base, 1)}
    print(f"  {g:>3}°: cos {c:.3f} (so ảnh chính diện {cf:.3f}) → {100 * c / base:.1f} %")
v = [x["pct"] for x in out["views"].values()]
out["mean_pct"] = round(float(np.mean(v)), 1) if v else 0
print("ĐIỂM GIỐNG trung bình", out["mean_pct"], "%")
if "--json" in a:
    json.dump(out, open(a[a.index("--json") + 1], "w"), indent=1)
