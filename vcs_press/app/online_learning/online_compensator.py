from __future__ import annotations

import numpy as np

from app.online_learning.bias_model import BiasModel


class OnlineCompensator:
    def __init__(self, alpha: float = 0.1, window_size: int = 50, outlier_sigma: float = 3.0):
        self.alpha = alpha
        self.window_size = window_size
        self.outlier_sigma = outlier_sigma
        self.model = BiasModel()

    def update(self, errors: list[tuple[float, float]]) -> dict:
        if not errors:
            return self.model.to_dict() | {"updated": False}
        current = np.mean(np.asarray(errors, dtype=float), axis=0)
        samples = np.asarray(self.model.samples[-self.window_size :], dtype=float) if self.model.samples else np.empty((0, 2))
        if len(samples) >= 5:
            std = np.std(samples, axis=0) + 1e-6
            mean = np.mean(samples, axis=0)
            if np.any(np.abs(current - mean) > self.outlier_sigma * std):
                return self.model.to_dict() | {"updated": False, "reason": "outlier rejected"}
        self.model.x_bias_mm = float(self.alpha * current[0] + (1 - self.alpha) * self.model.x_bias_mm)
        self.model.y_bias_mm = float(self.alpha * current[1] + (1 - self.alpha) * self.model.y_bias_mm)
        self.model.samples.append((float(current[0]), float(current[1])))
        self.model.samples = self.model.samples[-self.window_size :]
        self.model.save()
        return self.model.to_dict() | {"updated": True}
