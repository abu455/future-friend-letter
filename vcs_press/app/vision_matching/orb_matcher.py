from __future__ import annotations

import cv2
import numpy as np

from app.preprocessing.image_preprocessor import ImagePreprocessor
from app.utils.geometry import apply_transform
from app.vision_matching.base import FeatureMatcher, MatchResult


class ORBMatcher(FeatureMatcher):
    name = "orb"

    def __init__(self, nfeatures: int = 1000):
        self.pre = ImagePreprocessor()
        self.detector = cv2.ORB_create(nfeatures=nfeatures)

    def match(self, template_image: np.ndarray, current_image: np.ndarray, roi: tuple[int, int, int, int] | None = None) -> MatchResult:
        tgray = self.pre.preprocess(template_image)
        cgray = self.pre.preprocess(current_image)
        kp1, des1 = self.detector.detectAndCompute(tgray, None)
        kp2, des2 = self.detector.detectAndCompute(cgray, None)
        if des1 is None or des2 is None or len(kp1) < 4 or len(kp2) < 4:
            return _empty_result("orb_no_features")
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = sorted(bf.match(des1, des2), key=lambda m: m.distance)[:120]
        if len(matches) < 4:
            return _empty_result("orb_insufficient_matches")
        src = np.float32([kp1[m.queryIdx].pt for m in matches])
        dst = np.float32([kp2[m.trainIdx].pt for m in matches])
        homography, mask = cv2.findHomography(src, dst, cv2.RANSAC, 4.0)
        affine, amask = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=4.0)
        inliers = mask.reshape(-1).astype(bool) if mask is not None else np.ones(len(src), dtype=bool)
        if affine is None:
            affine = np.eye(2, 3, dtype=np.float64)
        residual = (
            float(np.mean(np.linalg.norm(apply_transform(src[inliers], affine) - dst[inliers], axis=1))) if np.any(inliers) else 999.0
        )
        confidence = float(max(0.0, min(1.0, np.mean(inliers) * (1.0 / (1.0 + residual / 10.0)))))
        vis = cv2.drawMatches(template_image, kp1, current_image, kp2, [matches[i] for i in np.where(inliers)[0][:50]], None)
        return MatchResult(
            matched_points_template=[tuple(map(float, p)) for p in src],
            matched_points_current=[tuple(map(float, p)) for p in dst],
            confidence=confidence,
            inlier_ratio=float(np.mean(inliers)),
            homography=homography.tolist() if homography is not None else None,
            affine_matrix=affine.tolist(),
            residual_error=residual,
            visualization_image=vis,
            metadata={"matcher": self.name, "matches": len(matches)},
        )


def _empty_result(reason: str) -> MatchResult:
    return MatchResult([], [], 0.0, 0.0, None, None, 999.0, metadata={"reason": reason})
