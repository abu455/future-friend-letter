from __future__ import annotations

import cv2
import numpy as np

from app.preprocessing.image_preprocessor import ImagePreprocessor
from app.utils.geometry import apply_transform
from app.vision_matching.base import FeatureMatcher, MatchResult


class SIFTMatcher(FeatureMatcher):
    name = "sift"

    def __init__(self):
        self.pre = ImagePreprocessor()
        if not hasattr(cv2, "SIFT_create"):
            raise RuntimeError("OpenCV SIFT is unavailable")
        self.detector = cv2.SIFT_create()

    def match(self, template_image: np.ndarray, current_image: np.ndarray, roi: tuple[int, int, int, int] | None = None) -> MatchResult:
        tgray = self.pre.preprocess(template_image)
        cgray = self.pre.preprocess(current_image)
        kp1, des1 = self.detector.detectAndCompute(tgray, None)
        kp2, des2 = self.detector.detectAndCompute(cgray, None)
        if des1 is None or des2 is None:
            return MatchResult([], [], 0.0, 0.0, None, None, 999.0, metadata={"reason": "sift_no_features"})
        matcher = cv2.FlannBasedMatcher(dict(algorithm=1, trees=5), dict(checks=50))
        raw = matcher.knnMatch(des1, des2, k=2)
        good = [m for m, n in raw if m.distance < 0.75 * n.distance]
        if len(good) < 4:
            return MatchResult([], [], 0.0, 0.0, None, None, 999.0, metadata={"reason": "sift_insufficient_matches"})
        src = np.float32([kp1[m.queryIdx].pt for m in good])
        dst = np.float32([kp2[m.trainIdx].pt for m in good])
        homography, mask = cv2.findHomography(src, dst, cv2.RANSAC, 3.0)
        affine, _ = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=3.0)
        inliers = mask.reshape(-1).astype(bool) if mask is not None else np.ones(len(src), dtype=bool)
        residual = (
            float(np.mean(np.linalg.norm(apply_transform(src[inliers], affine) - dst[inliers], axis=1)))
            if affine is not None and np.any(inliers)
            else 999.0
        )
        return MatchResult(
            [tuple(map(float, p)) for p in src],
            [tuple(map(float, p)) for p in dst],
            float(max(0.0, min(1.0, np.mean(inliers) * (1.0 / (1.0 + residual / 10.0))))),
            float(np.mean(inliers)),
            homography.tolist() if homography is not None else None,
            affine.tolist() if affine is not None else None,
            residual,
            metadata={"matcher": self.name, "matches": len(good)},
        )
