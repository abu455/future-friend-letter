from __future__ import annotations

import cv2
import numpy as np

from app.camera.simulated_camera import SimulatedCamera
from app.storage.report_writer import ReportWriter
from app.utils.image_io import write_image
from app.vision_matching.base import FeatureMatcher, MatchResult
from app.vision_matching.mock_deep_matcher import MockDeepMatcher
from app.vision_matching.orb_matcher import ORBMatcher
from app.vision_matching.sift_matcher import SIFTMatcher


class MatchingService:
    def __init__(self, camera: SimulatedCamera, matcher: FeatureMatcher | None = None):
        self.camera = camera
        self.matcher = matcher or MockDeepMatcher()
        self.fallback = ORBMatcher()
        self.report_writer = ReportWriter()
        self.latest_result: MatchResult | None = None
        self.latest_template: np.ndarray | None = None
        self.latest_current: np.ndarray | None = None

    def acquire_pair(self) -> tuple[np.ndarray, np.ndarray]:
        template = self.camera.capture_template_scene().image
        current = self.camera.capture_material_scene().image
        self.latest_template = template
        self.latest_current = current
        return template, current

    def register(self, matcher_name: str | None = None) -> dict:
        template, current = self.acquire_pair()
        matcher = self._select_matcher(matcher_name)
        result = matcher.match(template, current)
        if result.confidence < 0.5 or result.inlier_ratio < 0.3:
            edge_result = self._edge_fallback(template, current)
            if edge_result.confidence > result.confidence:
                result = edge_result
        self.latest_result = result
        if result.visualization_image is not None:
            write_image("data/reports/matching_visualization.png", result.visualization_image)
        payload = result.to_dict()
        self.report_writer.write_json("matching_latest.json", payload)
        return payload

    def _select_matcher(self, name: str | None) -> FeatureMatcher:
        if name in (None, "mock_deep"):
            return self.matcher
        if name == "orb":
            return self.fallback
        if name == "sift":
            return SIFTMatcher()
        return self.matcher

    def _edge_fallback(self, template: np.ndarray, current: np.ndarray) -> MatchResult:
        t = cv2.Canny(cv2.cvtColor(template, cv2.COLOR_BGR2GRAY), 60, 160)
        c = cv2.Canny(cv2.cvtColor(current, cv2.COLOR_BGR2GRAY), 60, 160)
        shift, _ = cv2.phaseCorrelate(np.float32(t), np.float32(c))
        affine = np.array([[1.0, 0.0, shift[0]], [0.0, 1.0, shift[1]]], dtype=float)
        pts = [(160.0, 120.0), (480.0, 120.0), (480.0, 350.0), (160.0, 350.0)]
        dst = [(x + shift[0], y + shift[1]) for x, y in pts]
        return MatchResult(pts, dst, 0.65, 0.6, None, affine.tolist(), 0.5, metadata={"matcher": "edge_fallback"})
