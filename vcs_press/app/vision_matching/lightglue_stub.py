from __future__ import annotations

import numpy as np

from app.vision_matching.base import FeatureMatcher, MatchResult
from app.vision_matching.orb_matcher import ORBMatcher


class SuperPointLightGlueMatcher(FeatureMatcher):
    name = "superpoint_lightglue_stub"

    def __init__(self, weights_path: str | None = None):
        self.weights_path = weights_path
        self.fallback = ORBMatcher()

    def match(self, template_image: np.ndarray, current_image: np.ndarray, roi: tuple[int, int, int, int] | None = None) -> MatchResult:
        result = self.fallback.match(template_image, current_image, roi)
        result.metadata["stub"] = "replace with SuperPoint + LightGlue model loader"
        return result


class OmniGlueMatcher(SuperPointLightGlueMatcher):
    name = "omniglue_stub"
