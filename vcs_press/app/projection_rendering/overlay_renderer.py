from __future__ import annotations

import cv2
import numpy as np


class OverlayRenderer:
    def overlay(self, base: np.ndarray, projected: np.ndarray, alpha: float = 0.5) -> np.ndarray:
        resized = cv2.resize(projected, (base.shape[1], base.shape[0]))
        return cv2.addWeighted(base, 1.0 - alpha, resized, alpha, 0)

    def draw_error_text(self, image: np.ndarray, report: dict) -> np.ndarray:
        out = image.copy()
        text = (
            f"projection error mean={report.get('projection_mean_error_mm', 0):.3f}mm "
            f"max={report.get('projection_max_error_mm', 0):.3f}mm "
            f"conf={report.get('projection_confidence', 0):.2f}"
        )
        cv2.putText(out, text, (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
        return out
