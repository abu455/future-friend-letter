from __future__ import annotations

from dataclasses import asdict, dataclass

import cv2
import numpy as np

from app.utils.geometry import apply_transform, as_points
from app.utils.time_utils import utc_now_iso


@dataclass
class ProjectorCalibrationReport:
    calibration_id: str
    source: str
    target: str
    mode: str
    transform_matrix: list[list[float]]
    inverse_matrix: list[list[float]]
    mean_error_px: float
    max_error_px: float
    mean_error_mm: float
    max_error_mm: float
    calibration_quality: str
    confidence: float
    timestamp: str

    def to_dict(self) -> dict:
        return asdict(self)


class ProjectorCalibrationSolver:
    def solve(
        self,
        source_points: list[tuple[float, float]],
        target_points: list[tuple[float, float]],
        source: str,
        target: str,
        mode: str = "homography",
        px_to_mm: float = 0.1,
        threshold_px: float = 3.0,
    ) -> ProjectorCalibrationReport:
        src = as_points(source_points)
        dst = as_points(target_points)
        if len(src) != len(dst) or len(src) < 4:
            raise ValueError("projector calibration requires at least four paired points")
        if mode == "homography":
            matrix, mask = cv2.findHomography(src, dst, cv2.RANSAC, threshold_px)
            matrix3 = matrix
        elif mode == "affine":
            matrix, mask = cv2.estimateAffine2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=threshold_px)
            matrix3 = np.vstack([matrix, [0.0, 0.0, 1.0]]) if matrix is not None else None
        elif mode == "similarity":
            matrix, mask = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=threshold_px)
            matrix3 = np.vstack([matrix, [0.0, 0.0, 1.0]]) if matrix is not None else None
        else:
            raise ValueError(f"unsupported projection calibration mode: {mode}")
        if matrix3 is None:
            raise ValueError("projector calibration solve failed")
        projected = apply_transform(src, matrix3)
        errors = np.linalg.norm(projected - dst, axis=1)
        mean_error_px = float(np.mean(errors))
        max_error_px = float(np.max(errors))
        confidence = float(np.mean(mask.reshape(-1))) if mask is not None else 1.0
        quality = "OK" if mean_error_px <= threshold_px and confidence >= 0.75 else "FAILED"
        if quality == "OK" and max_error_px > threshold_px * 2:
            quality = "WARNING"
        return ProjectorCalibrationReport(
            calibration_id=f"{source}_to_{target}_{int(np.round(np.sum(src) + np.sum(dst)))}",
            source=source,
            target=target,
            mode=mode,
            transform_matrix=matrix3.tolist(),
            inverse_matrix=np.linalg.inv(matrix3).tolist(),
            mean_error_px=mean_error_px,
            max_error_px=max_error_px,
            mean_error_mm=mean_error_px * px_to_mm,
            max_error_mm=max_error_px * px_to_mm,
            calibration_quality=quality,
            confidence=confidence,
            timestamp=utc_now_iso(),
        )
