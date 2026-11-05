"""Hàm dùng chung cho dựng mặt: uốn thin-plate spline, căn bóng mesh với đường viền ảnh."""
import numpy as np


def tps_fit(src, dst, reg=1e-3):
    """Thin-plate spline 2D: trả hàm f(pts) đưa src → dst (uốn mềm, đi qua đúng các điểm mốc)."""
    src = np.asarray(src, float); dst = np.asarray(dst, float); n_ = len(src)
    def U(r2): return np.where(r2 > 0, r2 * np.log(np.maximum(r2, 1e-12)) * 0.5, 0.0)
    d2 = ((src[:, None, :] - src[None, :, :]) ** 2).sum(-1)
    K = U(d2) + reg * np.eye(n_)
    Pm = np.hstack([np.ones((n_, 1)), src])
    A = np.zeros((n_ + 3, n_ + 3)); A[:n_, :n_] = K; A[:n_, n_:] = Pm; A[n_:, :n_] = Pm.T
    b = np.zeros((n_ + 3, 2)); b[:n_] = dst
    w = np.linalg.solve(A, b)
    def f(pts):
        out = np.empty((len(pts), 2))
        for i in range(0, len(pts), 200000):      # chia khúc cho khỏi tốn RAM
            p = pts[i:i + 200000]
            k = U(((p[:, None, :] - src[None, :, :]) ** 2).sum(-1))
            out[i:i + 200000] = k @ w[:n_] + w[n_] + p @ w[n_ + 1:]
        return out
    return f


def fit_silhouette(alpha, u, v, s0, tx0, ty0, R=384):
    """Tìm (tỉ lệ, dời ngang, dời dọc) để bóng mesh chiếu xuống trùng nhất với phần không trong suốt của ảnh.
    So ở ảnh thu nhỏ R px, chỉ trong 70% trên của đầu–cổ (đáy ảnh bị cắt ngang vai). Tìm thô rồi tinh."""
    H, W = alpha.shape
    k = R / max(H, W)
    ys, xs = np.where(alpha)
    top = ys.max()
    small = np.zeros((R, R), bool)
    small[(ys * k).astype(int).clip(0, R - 1), (xs * k).astype(int).clip(0, R - 1)] = True
    pick = np.random.default_rng(0).choice(len(u), min(len(u), 80000), replace=False)
    uu, vv = u[pick], v[pick]
    row_lo = int((top - (top - ys.min()) * 0.7) * k)   # chỉ so phần trên (pixel gốc ở đáy)
    roi = np.zeros((R, R), bool); roi[row_lo:, :] = True
    target = small & roi

    def iou(s, tx, ty):
        X = ((uu * s + tx) * k).astype(int); Y = ((vv * s + ty) * k).astype(int)
        ok = (X >= 0) & (X < R) & (Y >= 0) & (Y < R)
        m = np.zeros((R, R), bool); m[Y[ok], X[ok]] = True
        m = m | np.roll(m, 1, 0) | np.roll(m, 1, 1)      # lấp lỗ giữa các điểm
        m &= roi
        return (m & target).sum() / max(1, (m | target).sum())

    best = (iou(s0, tx0, ty0), s0, tx0, ty0)
    for step_s, step_t, span in ((0.02, 8 / k, 4), (0.006, 2 / k, 3)):
        _, sb, xb, yb = best
        for ds in range(-span, span + 1):
            for dx in range(-span, span + 1):
                for dy in range(-span, span + 1):
                    c = (sb * (1 + ds * step_s), xb + dx * step_t, yb + dy * step_t)
                    sc = iou(*c)
                    if sc > best[0]:
                        best = (sc, *c)
    print("  fit iou", round(best[0], 3), "s", round(best[1] / s0, 3), "dx", round(best[2] - tx0, 1), "dy", round(best[3] - ty0, 1))
    return best[1:]
