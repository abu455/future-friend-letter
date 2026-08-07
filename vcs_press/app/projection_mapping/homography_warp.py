from __future__ import annotations

import cv2
import numpy as np

from app.utils.geometry import apply_transform


class HomographyWarp:
    def warp_image(self, image: np.ndarray, homography: list[list[float]] | np.ndarray, resolution: tuple[int, int]) -> np.ndarray:
        return cv2.warpPerspective(image, np.asarray(homography, dtype=float), resolution)

    def offset_homography(self, dx_px: float, dy_px: float, base: list[list[float]] | None = None) -> list[list[float]]:
        matrix = np.asarray(base if base is not None else np.eye(3), dtype=float)
        offset = np.array([[1.0, 0.0, dx_px], [0.0, 1.0, dy_px], [0.0, 0.0, 1.0]], dtype=float)
        return (offset @ matrix).tolist()

    def warp_points(self, points: list[tuple[float, float]], homography: list[list[float]] | np.ndarray) -> list[tuple[float, float]]:
        warped = apply_transform(np.asarray(points, dtype=float), np.asarray(homography, dtype=float))
        return [tuple(map(float, point)) for point in warped]
