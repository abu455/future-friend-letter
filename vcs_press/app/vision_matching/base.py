from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import numpy as np


@dataclass
class MatchResult:
    matched_points_template: list[tuple[float, float]]
    matched_points_current: list[tuple[float, float]]
    confidence: float
    inlier_ratio: float
    homography: list[list[float]] | None
    affine_matrix: list[list[float]] | None
    residual_error: float
    visualization_image: np.ndarray | None = None
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "matched_points_template": self.matched_points_template,
            "matched_points_current": self.matched_points_current,
            "confidence": self.confidence,
            "inlier_ratio": self.inlier_ratio,
            "homography": self.homography,
            "affine_matrix": self.affine_matrix,
            "residual_error": self.residual_error,
            "metadata": self.metadata,
        }


class FeatureMatcher(ABC):
    name = "base"

    @abstractmethod
    def match(self, template_image: np.ndarray, current_image: np.ndarray, roi: tuple[int, int, int, int] | None = None) -> MatchResult:
        raise NotImplementedError
