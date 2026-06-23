from __future__ import annotations

import cv2
import numpy as np

from app.cad.job_model import Job


class CADRenderer:
    def render(self, job: Job, size: tuple[int, int] = (640, 480), scale: float = 1.0) -> np.ndarray:
        image = np.full((size[1], size[0], 3), 245, dtype=np.uint8)
        offset = np.array([160.0, 120.0])
        for contour in job.contours:
            pts = np.asarray(contour, dtype=np.float32) * scale + offset
            cv2.polylines(image, [pts.astype(np.int32)], True, (40, 40, 40), 3)
        for x, y in job.holes:
            p = tuple((np.array([x, y]) * scale + offset).astype(int))
            cv2.circle(image, p, 20, (50, 50, 50), 3)
        return image
