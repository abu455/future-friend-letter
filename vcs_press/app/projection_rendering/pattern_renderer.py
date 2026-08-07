from __future__ import annotations

import cv2
import numpy as np

from app.projection_rendering.projection_style import ProjectionStyle


class PatternRenderer:
    def draw_grid(self, image: np.ndarray, step_px: int = 100, color: tuple[int, int, int] = (30, 30, 30)) -> np.ndarray:
        out = image.copy()
        for x in range(0, out.shape[1], step_px):
            cv2.line(out, (x, 0), (x, out.shape[0] - 1), color, 1)
        for y in range(0, out.shape[0], step_px):
            cv2.line(out, (0, y), (out.shape[1] - 1, y), color, 1)
        return out

    def apply_brightness(self, image: np.ndarray, style: ProjectionStyle) -> np.ndarray:
        return np.clip(image.astype(np.float32) * style.brightness, 0, 255).astype(np.uint8)
