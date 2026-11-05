"""Tìm điểm mốc khuôn mặt (MediaPipe Face Landmarker) cho mọi ảnh .png trong một thư mục.

python landmarks.py <thư mục ảnh> <file .json> [--model face_landmarker.task]
Ghi ra {tên_ảnh: {tên_điểm: [x_px, y_px]}} với gốc ảnh ở góc TRÊN-trái (quy ước của ảnh thường).
"""
import json
import os
import sys

import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision

# chỉ số trong lưới 478 điểm của MediaPipe
POINTS = {
    "eye_l_out": 263, "eye_l_in": 362, "eye_r_out": 33, "eye_r_in": 133,
    "eye_l_top": 386, "eye_l_bot": 374, "eye_r_top": 159, "eye_r_bot": 145,
    "iris_l": 473, "iris_r": 468,
    "brow_l": 334, "brow_r": 105,
    "nose_tip": 1, "nose_base": 2, "nostril_l": 294, "nostril_r": 64,
    "mouth_l": 291, "mouth_r": 61, "lip_top": 0, "lip_mid_top": 13, "lip_mid_bot": 14, "lip_bot": 17,
    "chin": 152, "jaw_l": 397, "jaw_r": 172,
}
# viền môi ngoài đủ vòng (để căn đúng dáng "trái tim" môi trên và đường cong môi dưới)
for i, idx in enumerate((185, 40, 39, 37, 267, 269, 270, 409)):
    POINTS[f"lipo_top_{i}"] = idx
for i, idx in enumerate((146, 91, 181, 84, 314, 405, 321, 375)):
    POINTS[f"lipo_bot_{i}"] = idx
# lông mày: viền trên + viền dưới, từ đầu mày (gần mũi) ra đuôi mày
for side, up, lo_ in (("r", (107, 66, 105, 63, 70), (55, 65, 52, 53, 46)),
                      ("l", (336, 296, 334, 293, 300), (285, 295, 282, 283, 276))):
    for i, idx in enumerate(up):
        POINTS[f"brow_{side}_up_{i}"] = idx
    for i, idx in enumerate(lo_):
        POINTS[f"brow_{side}_lo_{i}"] = idx
# mũi đủ vòng cho thư viện bộ phận (bo_phan.py khop): sống mũi giữa từ gốc xuống đầu, rồi cánh mũi hai bên
for idx in (168, 6, 197, 195, 5, 4, 19, 94, 98, 327, 129, 358, 48, 278, 240, 460, 75, 305, 115, 344, 220, 440):
    POINTS[f"nose_{idx}"] = idx
# mí trên / mí dưới, từ khoé trong ra khoé ngoài (để đặt mi mắt 3D)
for side, up, lo_ in (("r", (133, 173, 157, 158, 159, 160, 161, 246, 33), (133, 155, 154, 153, 145, 144, 163, 7, 33)),
                      ("l", (362, 398, 384, 385, 386, 387, 388, 466, 263), (362, 382, 381, 380, 374, 373, 390, 249, 263))):
    for i, idx in enumerate(up):
        POINTS[f"lid_{side}_up_{i}"] = idx
    for i, idx in enumerate(lo_):
        POINTS[f"lid_{side}_lo_{i}"] = idx

src, out = sys.argv[1:3]
model = sys.argv[sys.argv.index("--model") + 1] if "--model" in sys.argv else os.path.expanduser("~/ai3d/face_landmarker.task")
det = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=mpt.BaseOptions(model_asset_path=model), num_faces=1, min_face_detection_confidence=0.2))
res = {}
for f in sorted(os.listdir(src)):
    if not f.lower().endswith(".png"):
        continue
    img = mp.Image.create_from_file(os.path.join(src, f))
    r = det.detect(img)
    if not r.face_landmarks:
        print("NOFACE", f); continue
    lm = r.face_landmarks[0]
    W, H = img.width, img.height
    res[f] = {k: [lm[i].x * W, lm[i].y * H] for k, i in POINTS.items()}
    print("FACE", f, {k: [round(v[0]), round(v[1])] for k, v in list(res[f].items())[:3]})
json.dump(res, open(out, "w"), indent=1)
