from __future__ import annotations

from dataclasses import asdict, dataclass

import cv2
import numpy as np

from app.utils.geometry import apply_transform, as_points


@dataclass
class CalibrationReport:
    mode: str
    transform_matrix: list[list[float]]
    inverse_matrix: list[list[float]]
    reprojection_error_px: float
    reprojection_error_mm: float
    max_error_mm: float
    mean_error_mm: float
    calibration_quality: str
    inlier_ratio: float

    def to_dict(self) -> dict:
        return asdict(self)


class CalibrationSolver:
    def solve(
        self,
        image_points: list[tuple[float, float]] | np.ndarray,
        machine_points: list[tuple[float, float]] | np.ndarray,
        mode: str = "affine",
        threshold_mm: float = 0.10,
    ) -> CalibrationReport:
        src = as_points(image_points)
        dst = as_points(machine_points)
        if len(src) != len(dst) or len(src) < 3:
            raise ValueError("calibration requires at least three paired points")
        mode = mode.lower()
        if mode == "similarity":
            matrix, inliers = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=1.5)
        elif mode == "affine":
            matrix, inliers = cv2.estimateAffine2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=1.5)
        elif mode == "homography":
            if len(src) < 4:
                raise ValueError("homography requires at least four paired points")
            matrix, inliers = cv2.findHomography(src, dst, method=cv2.RANSAC, ransacReprojThreshold=1.5)
        else:
            raise ValueError(f"unsupported calibration mode: {mode}")
        if matrix is None:
            raise ValueError("calibration transform solve failed")
        if mode != "homography":
            matrix3 = np.vstack([matrix, [0.0, 0.0, 1.0]])
        else:
            matrix3 = matrix
        projected = apply_transform(src, matrix3)
        errors = np.linalg.norm(projected - dst, axis=1)
        inverse = np.linalg.inv(matrix3)
        mean_error = float(np.mean(errors))
        max_error = float(np.max(errors))
        inlier_ratio = float(np.mean(inliers.reshape(-1))) if inliers is not None else 1.0
        quality = "OK" if mean_error <= threshold_mm and max_error <= threshold_mm * 2.5 else "NG"
        px_error = mean_error / max(float(np.linalg.norm(matrix3[0:2, 0])), 1e-9)
        return CalibrationReport(
            mode=mode,
            transform_matrix=matrix3.tolist(),
            inverse_matrix=inverse.tolist(),
            reprojection_error_px=float(px_error),
            reprojection_error_mm=mean_error,
            max_error_mm=max_error,
            mean_error_mm=mean_error,
            calibration_quality=quality,
            inlier_ratio=inlier_ratio,
        )
