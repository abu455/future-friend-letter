from __future__ import annotations

import numpy as np
from scipy.interpolate import Rbf


class ThinPlateSpline2D:
    def __init__(self):
        self._rbf_x: Rbf | None = None
        self._rbf_y: Rbf | None = None

    def fit(self, source: list[tuple[float, float]], target: list[tuple[float, float]]) -> None:
        src = np.asarray(source, dtype=float)
        dst = np.asarray(target, dtype=float)
        delta = dst - src
        self._rbf_x = Rbf(src[:, 0], src[:, 1], delta[:, 0], function="thin_plate", smooth=0.1)
        self._rbf_y = Rbf(src[:, 0], src[:, 1], delta[:, 1], function="thin_plate", smooth=0.1)

    def displacement(self, points: list[tuple[float, float]]) -> np.ndarray:
        if self._rbf_x is None or self._rbf_y is None:
            raise RuntimeError("TPS model is not fitted")
        pts = np.asarray(points, dtype=float)
        return np.c_[self._rbf_x(pts[:, 0], pts[:, 1]), self._rbf_y(pts[:, 0], pts[:, 1])]
