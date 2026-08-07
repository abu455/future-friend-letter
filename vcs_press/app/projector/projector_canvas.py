from __future__ import annotations

import cv2
import numpy as np


class ProjectorCanvas:
    def __init__(self, width: int = 1920, height: int = 1080, background: str = "black"):
        self.width = width
        self.height = height
        self.background = background

    def blank(self) -> np.ndarray:
        color = (0, 0, 0) if self.background == "black" else (40, 0, 0)
        image = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        image[:] = color
        return image

    def resize(self, image: np.ndarray) -> np.ndarray:
        return cv2.resize(image, (self.width, self.height))
