from __future__ import annotations

import cv2
import numpy as np

from app.utils.geometry import apply_transform
from app.vision_matching.base import FeatureMatcher, MatchResult


class MockDeepMatcher(FeatureMatcher):
    name = "mock_deep"

    def match(self, template_image: np.ndarray, current_image: np.ndarray, roi: tuple[int, int, int, int] | None = None) -> MatchResult:
        transform = _estimate_shift(template_image, current_image)
        grid_x = np.linspace(180, 460, 6)
        grid_y = np.linspace(140, 330, 5)
        src = np.array([(x, y) for y in grid_y for x in grid_x], dtype=np.float32)
        dst = apply_transform(src, transform)
        dst[:, 0] += np.sin(dst[:, 1] / 80.0) * 0.2
        hom = np.vstack([transform, [0.0, 0.0, 1.0]])
        residual = float(np.mean(np.linalg.norm(apply_transform(src, transform) - dst, axis=1)))
        vis = np.hstack([template_image, current_image])
        for p, q in zip(src.astype(int), dst.astype(int)):
            q2 = (int(q[0] + template_image.shape[1]), int(q[1]))
            cv2.circle(vis, tuple(p), 3, (0, 255, 0), -1)
            cv2.circle(vis, q2, 3, (0, 0, 255), -1)
            cv2.line(vis, tuple(p), q2, (255, 0, 0), 1)
        return MatchResult(
            matched_points_template=[tuple(map(float, p)) for p in src],
            matched_points_current=[tuple(map(float, p)) for p in dst],
            confidence=0.93,
            inlier_ratio=0.95,
            homography=hom.tolist(),
            affine_matrix=transform.tolist(),
            residual_error=residual,
            visualization_image=vis,
            metadata={"matcher": self.name, "note": "synthetic deep feature correspondence"},
        )


def _estimate_shift(template_image: np.ndarray, current_image: np.ndarray) -> np.ndarray:
    tg = cv2.cvtColor(template_image, cv2.COLOR_BGR2GRAY) if template_image.ndim == 3 else template_image
    cg = cv2.cvtColor(current_image, cv2.COLOR_BGR2GRAY) if current_image.ndim == 3 else current_image
    _, tb = cv2.threshold(tg, 150, 255, cv2.THRESH_BINARY_INV)
    _, cb = cv2.threshold(cg, 150, 255, cv2.THRESH_BINARY_INV)
    mt = cv2.moments(tb)
    mc = cv2.moments(cb)
    if abs(mt["m00"]) < 1e-6 or abs(mc["m00"]) < 1e-6:
        dx, dy = 0.0, 0.0
    else:
        dx = mc["m10"] / mc["m00"] - mt["m10"] / mt["m00"]
        dy = mc["m01"] / mc["m00"] - mt["m01"] / mt["m00"]
    return np.array([[1.0, 0.0, dx], [0.0, 1.0, dy]], dtype=np.float64)
