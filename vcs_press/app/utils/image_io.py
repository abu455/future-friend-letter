from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np


def read_image(path: str | Path, flags: int = cv2.IMREAD_COLOR) -> np.ndarray:
    image = cv2.imread(str(path), flags)
    if image is None:
        raise FileNotFoundError(f"unable to read image: {path}")
    return image


def write_image(path: str | Path, image: np.ndarray) -> str:
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(out), image):
        raise IOError(f"unable to write image: {out}")
    return str(out)


def synthetic_hole_image(points: list[tuple[float, float]], size: tuple[int, int] = (640, 480)) -> np.ndarray:
    image = np.full((size[1], size[0], 3), 235, dtype=np.uint8)
    for u, v in points:
        cv2.circle(image, (int(round(u)), int(round(v))), 12, (20, 20, 20), -1)
        cv2.circle(image, (int(round(u)), int(round(v))), 12, (0, 0, 0), 2)
    return image
