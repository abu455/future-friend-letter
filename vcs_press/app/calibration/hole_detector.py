from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class HoleDetectionResult:
    centers: list[tuple[float, float]]
    radii: list[float]
    visualization: np.ndarray


class HoleDetector:
    def __init__(self, min_area: float = 60.0, max_area: float = 5000.0):
        self.min_area = min_area
        self.max_area = max_area

    def detect(self, image: np.ndarray, expected_count: int | None = None) -> HoleDetectionResult:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image.copy()
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        candidates: list[tuple[float, float, float, float]] = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if not (self.min_area <= area <= self.max_area):
                continue
            perimeter = cv2.arcLength(contour, True)
            if perimeter <= 0:
                continue
            circularity = 4.0 * np.pi * area / (perimeter * perimeter)
            if circularity < 0.55:
                continue
            m = cv2.moments(contour)
            if abs(m["m00"]) < 1e-6:
                continue
            cx = m["m10"] / m["m00"]
            cy = m["m01"] / m["m00"]
            (_, _), radius = cv2.minEnclosingCircle(contour)
            candidates.append((cx, cy, radius, area))
        candidates.sort(key=lambda item: (item[1], item[0]))
        if expected_count is not None:
            candidates = candidates[:expected_count]
        vis = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR) if image.ndim != 3 else image.copy()
        for cx, cy, radius, _ in candidates:
            cv2.circle(vis, (int(round(cx)), int(round(cy))), int(round(radius)), (0, 255, 0), 2)
            cv2.drawMarker(vis, (int(round(cx)), int(round(cy))), (0, 0, 255), cv2.MARKER_CROSS, 16, 2)
        return HoleDetectionResult(
            centers=[(float(cx), float(cy)) for cx, cy, _, _ in candidates],
            radii=[float(radius) for _, _, radius, _ in candidates],
            visualization=vis,
        )
