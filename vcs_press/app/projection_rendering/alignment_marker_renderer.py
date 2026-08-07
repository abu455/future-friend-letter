from __future__ import annotations

import cv2
import numpy as np


class AlignmentMarkerRenderer:
    def draw_markers(
        self, image: np.ndarray, points: list[tuple[float, float]], color: tuple[int, int, int], radius: int = 12
    ) -> np.ndarray:
        out = image.copy()
        for idx, (x, y) in enumerate(points):
            center = (int(round(x)), int(round(y)))
            cv2.circle(out, center, radius, color, 2)
            cv2.drawMarker(out, center, color, cv2.MARKER_CROSS, radius * 2, 2)
            cv2.putText(out, str(idx + 1), (center[0] + radius, center[1] - radius), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 1)
        return out
