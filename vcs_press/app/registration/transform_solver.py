from __future__ import annotations

import numpy as np

from app.utils.geometry import affine_to_pose


class TransformSolver:
    def affine_pose(self, affine_matrix: list[list[float]] | np.ndarray) -> dict:
        if affine_matrix is None:
            raise ValueError("affine_matrix is required")
        return affine_to_pose(np.asarray(affine_matrix, dtype=float))

    def image_offset_to_machine(self, dx_px: float, dy_px: float, px_to_mm: float = 0.1) -> tuple[float, float]:
        return float(dx_px * px_to_mm), float(dy_px * px_to_mm)
