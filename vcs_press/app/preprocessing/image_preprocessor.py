from __future__ import annotations

import cv2
import numpy as np


class ImagePreprocessor:
    def preprocess(self, image: np.ndarray, suppress_glare: bool = True) -> np.ndarray:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image.copy()
        if suppress_glare:
            _, bright = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY)
            gray = cv2.inpaint(gray, bright, 3, cv2.INPAINT_TELEA)
        gray = cv2.GaussianBlur(gray, (3, 3), 0)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(gray)

    def edges(self, image: np.ndarray) -> np.ndarray:
        gray = self.preprocess(image)
        return cv2.Canny(gray, 60, 160)
