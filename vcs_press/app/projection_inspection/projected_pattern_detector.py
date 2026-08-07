from __future__ import annotations

import cv2
import numpy as np


class ProjectedPatternDetector:
    def detect(self, image: np.ndarray, expected_markers: list[tuple[float, float]] | None = None) -> dict:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
        _, binary = cv2.threshold(gray, 20, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        markers = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 20:
                continue
            moments = cv2.moments(contour)
            if abs(moments["m00"]) < 1e-6:
                continue
            markers.append((float(moments["m10"] / moments["m00"]), float(moments["m01"] / moments["m00"])))
        expected_count = len(expected_markers or [])
        visible_count = min(len(markers), expected_count) if expected_count else len(markers)
        return {
            "detected_markers": markers[:expected_count] if expected_count else markers,
            "visible_marker_count": visible_count,
            "expected_marker_count": expected_count,
            "marker_detection_rate": visible_count / expected_count if expected_count else 1.0,
            "line_visibility_score": min(1.0, float(np.count_nonzero(binary)) / max(binary.size * 0.02, 1.0)),
            "reflection_score": float(np.mean(gray > 245)),
        }
