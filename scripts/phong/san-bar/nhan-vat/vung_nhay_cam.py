"""Vùng nhạy cảm trên lưới thân MakeHuman — MỘT định nghĩa dùng chung cho an_toan.py, bikini.py, rig_base.py (import).

Không chạy riêng. Vì sao một chỗ: ba bước cùng phải nói về đúng một vùng (thân làm phẳng / xoá chi tiết ở đâu, bikini phải
phủ kín đâu, bộ đồ nào phải ẩn da ở đâu). Mỗi script tự đo một kiểu thì sớm muộn có chỗ hở giữa hai định nghĩa.

- `nguc`: quầng + đầu ngực, cầu bán kính R_NGUC quanh đỉnh ngực (nhóm `nippleTip` của MPFB, mỗi bên một tâm).
- `hang`: vùng kín trước + dưới đáy chậu, elip quanh điểm thấp nhất giữa hai chân, cắt ngang 1,2 cm dưới điểm đó (thấp
  hơn là mặt trong đùi). Lưới MPFB không có nhóm `genitals` có trọng số → đo bằng hình.
Đo trên toạ độ nghỉ (chưa xương) của `Body`; trả về chỉ số đỉnh và hàm `trong(P, nho=0)` để kiểm điểm bất kỳ (texel).
"""
import numpy as np

R_NGUC = 0.03                      # m — rộng hơn quầng ngực thật (~2 cm) một khoảng an toàn
HANG_R = np.array([0.05, 0.075, 0.085])  # m — bán trục x (ngang), y (trước–sau), z (cao) quanh đáy chậu


def _nhom(body, ten, nguong=0.0):
    g = body.vertex_groups.get(ten)
    if g is None:
        return np.zeros(0, int)
    return np.array([v.index for v in body.data.vertices
                     if any(e.group == g.index and e.weight > nguong for e in v.groups)], int)


def do(body):
    """→ dict: tam_nguc {1: xyz, -1: xyz}, tam_hang xyz, X (toạ độ đỉnh), nguc / hang (chỉ số đỉnh), trong(P, nho)."""
    X = np.array([v.co for v in body.data.vertices])
    tip = X[_nhom(body, "nippleTip")]
    assert len(tip), "Body thiếu nhóm nippleTip (lưới không phải MakeHuman?)"
    tn = {1: tip[tip[:, 0] > 0].mean(0), -1: tip[tip[:, 0] < 0].mean(0)}
    than = _nhom(body, "body")
    Xt = X[than] if len(than) else X
    gj = _nhom(body, "joint-pelvis")
    zp = X[gj, 2].mean() if len(gj) else Xt[:, 2].mean()
    # điểm đáy chậu: thấp nhất trong dải giữa hai chân, dưới khớp chậu
    giua = Xt[(np.abs(Xt[:, 0]) < 0.012) & (Xt[:, 2] < zp) & (Xt[:, 2] > zp - 0.3)]
    c = giua[np.argmin(giua[:, 2])].copy()
    th = c + np.array([0.0, -0.02, 0.03])                       # tâm lệch lên + ra trước: phủ cả gò mu
    def trong(P, nho=0.0):
        P = np.asarray(P, float)
        dn = np.minimum(np.linalg.norm(P - tn[1], axis=1), np.linalg.norm(P - tn[-1], axis=1))
        q = (P - th) / (HANG_R + nho)
        # dưới điểm thấp nhất giữa hai chân chỉ còn mặt trong đùi — không thuộc vùng kín
        return {"nguc": dn < R_NGUC + nho, "hang": ((q * q).sum(1) < 1.0) & (P[:, 2] > c[2] - 0.012 - nho)}
    t = trong(X)
    return {"tam_nguc": tn, "tam_hang": th, "X": X,
            "nguc": np.nonzero(t["nguc"])[0], "hang": np.nonzero(t["hang"])[0], "trong": trong}
