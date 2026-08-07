from __future__ import annotations

import numpy as np


class ProjectionErrorEstimator:
    def estimate(
        self,
        expected_markers: list[tuple[float, float]],
        detected_markers: list[tuple[float, float]],
        px_to_mm: float = 0.05,
    ) -> dict:
        if not expected_markers or not detected_markers:
            return {
                "projection_mean_error_px": 999.0,
                "projection_max_error_px": 999.0,
                "projection_mean_error_mm": 999.0,
                "projection_max_error_mm": 999.0,
                "projection_confidence": 0.0,
            }
        n = min(len(expected_markers), len(detected_markers))
        expected = np.asarray(expected_markers[:n], dtype=float)
        detected = np.asarray(detected_markers[:n], dtype=float)
        errors = np.linalg.norm(expected - detected, axis=1)
        mean_error_px = float(np.mean(errors))
        max_error_px = float(np.max(errors))
        confidence = float(max(0.0, min(1.0, 1.0 / (1.0 + mean_error_px / 10.0))))
        return {
            "projection_mean_error_px": mean_error_px,
            "projection_max_error_px": max_error_px,
            "projection_mean_error_mm": mean_error_px * px_to_mm,
            "projection_max_error_mm": max_error_px * px_to_mm,
            "projection_confidence": confidence,
        }
