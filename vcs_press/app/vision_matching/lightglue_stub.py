from __future__ import annotations

import importlib
from dataclasses import dataclass

import cv2
import numpy as np

from app.utils.geometry import apply_transform
from app.vision_matching.base import FeatureMatcher, MatchResult
from app.vision_matching.orb_matcher import ORBMatcher


@dataclass
class LightGlueConfig:
    max_num_keypoints: int = 2048
    device: str | None = None
    match_threshold: float = 0.1
    use_fallback: bool = True


class SuperPointLightGlueMatcher(FeatureMatcher):
    name = "superpoint_lightglue"

    def __init__(self, weights_path: str | None = None, config: LightGlueConfig | None = None):
        self.weights_path = weights_path
        self.config = config or LightGlueConfig()
        self.fallback = ORBMatcher()
        self._load_error: str | None = None
        self._torch = None
        self._rbd = None
        self.extractor = None
        self.matcher = None
        self.device = "cpu"
        self._load_models()

    def match(self, template_image: np.ndarray, current_image: np.ndarray, roi: tuple[int, int, int, int] | None = None) -> MatchResult:
        if self.extractor is None or self.matcher is None:
            return self._fallback(template_image, current_image, roi, self._load_error or "LightGlue backend is unavailable")
        try:
            return self._match_with_lightglue(template_image, current_image)
        except Exception as exc:
            return self._fallback(template_image, current_image, roi, f"LightGlue runtime error: {exc}")

    @property
    def available(self) -> bool:
        return self.extractor is not None and self.matcher is not None

    def _load_models(self) -> None:
        try:
            torch = importlib.import_module("torch")
            lightglue = importlib.import_module("lightglue")
            utils = importlib.import_module("lightglue.utils")
            SuperPoint = lightglue.SuperPoint
            LightGlue = lightglue.LightGlue
            self._rbd = getattr(utils, "rbd", _remove_batch_dimension)
            requested_device = self.config.device
            self.device = ("cuda" if torch.cuda.is_available() else "cpu") if requested_device in (None, "auto") else requested_device
            self.extractor = SuperPoint(max_num_keypoints=self.config.max_num_keypoints).eval().to(self.device)
            self.matcher = LightGlue(features="superpoint", filter_threshold=self.config.match_threshold).eval().to(self.device)
            self._torch = torch
        except Exception as exc:
            self._load_error = str(exc)
            self.extractor = None
            self.matcher = None

    def _match_with_lightglue(self, template_image: np.ndarray, current_image: np.ndarray) -> MatchResult:
        assert self._torch is not None
        image0 = self._image_to_tensor(template_image)
        image1 = self._image_to_tensor(current_image)
        with self._torch.inference_mode():
            feats0 = self.extractor.extract(image0)
            feats1 = self.extractor.extract(image1)
            matches01 = self.matcher({"image0": feats0, "image1": feats1})
        feats0, feats1, matches01 = [self._rbd(x) for x in (feats0, feats1, matches01)]
        matches = matches01.get("matches")
        if matches is None or int(matches.shape[0]) < 4:
            return MatchResult(
                [], [], 0.0, 0.0, None, None, 999.0, metadata={"matcher": self.name, "reason": "insufficient_lightglue_matches"}
            )
        keypoints0 = feats0["keypoints"][matches[:, 0]].detach().cpu().numpy().astype(np.float32)
        keypoints1 = feats1["keypoints"][matches[:, 1]].detach().cpu().numpy().astype(np.float32)
        scores = matches01.get("scores")
        score_mean = float(scores.detach().cpu().numpy().mean()) if scores is not None and len(scores) else 1.0
        homography, mask = cv2.findHomography(keypoints0, keypoints1, cv2.RANSAC, 3.0)
        affine, affine_mask = cv2.estimateAffinePartial2D(keypoints0, keypoints1, method=cv2.RANSAC, ransacReprojThreshold=3.0)
        inlier_mask = _best_mask(mask, affine_mask, len(keypoints0))
        if affine is None:
            affine = np.eye(2, 3, dtype=np.float64)
        residual = _mean_residual(keypoints0, keypoints1, affine, inlier_mask)
        inlier_ratio = float(np.mean(inlier_mask)) if len(inlier_mask) else 0.0
        confidence = float(max(0.0, min(1.0, score_mean * inlier_ratio * (1.0 / (1.0 + residual / 10.0)))))
        return MatchResult(
            matched_points_template=[tuple(map(float, p)) for p in keypoints0],
            matched_points_current=[tuple(map(float, p)) for p in keypoints1],
            confidence=confidence,
            inlier_ratio=inlier_ratio,
            homography=homography.tolist() if homography is not None else None,
            affine_matrix=affine.tolist(),
            residual_error=residual,
            visualization_image=_draw_matches(template_image, current_image, keypoints0, keypoints1, inlier_mask),
            metadata={"matcher": self.name, "backend": "lightglue", "device": self.device, "matches": int(matches.shape[0])},
        )

    def _image_to_tensor(self, image: np.ndarray):
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB) if image.ndim == 3 else image
        tensor = self._torch.from_numpy(rgb).float() / 255.0
        tensor = tensor.unsqueeze(0) if tensor.ndim == 2 else tensor.permute(2, 0, 1)
        return tensor.to(self.device)

    def _fallback(
        self, template_image: np.ndarray, current_image: np.ndarray, roi: tuple[int, int, int, int] | None, reason: str
    ) -> MatchResult:
        if not self.config.use_fallback:
            return MatchResult([], [], 0.0, 0.0, None, None, 999.0, metadata={"matcher": self.name, "reason": reason})
        result = self.fallback.match(template_image, current_image, roi)
        result.metadata["requested_matcher"] = self.name
        result.metadata["lightglue_fallback_reason"] = reason
        return result


class OmniGlueMatcher(SuperPointLightGlueMatcher):
    name = "omniglue_stub"


def _remove_batch_dimension(data):
    if isinstance(data, dict):
        return {key: _remove_batch_dimension(value) for key, value in data.items()}
    if hasattr(data, "shape") and len(data.shape) > 0 and data.shape[0] == 1:
        return data[0]
    return data


def _best_mask(h_mask, a_mask, n: int) -> np.ndarray:
    candidates = []
    for mask in (h_mask, a_mask):
        if mask is not None:
            candidates.append(mask.reshape(-1).astype(bool))
    if not candidates:
        return np.ones(n, dtype=bool)
    return max(candidates, key=lambda item: int(np.sum(item)))


def _mean_residual(src: np.ndarray, dst: np.ndarray, affine: np.ndarray, inliers: np.ndarray) -> float:
    if not np.any(inliers):
        return 999.0
    projected = apply_transform(src[inliers], affine)
    return float(np.mean(np.linalg.norm(projected - dst[inliers], axis=1)))


def _draw_matches(
    template_image: np.ndarray, current_image: np.ndarray, src: np.ndarray, dst: np.ndarray, inliers: np.ndarray
) -> np.ndarray:
    canvas = np.hstack([template_image, current_image])
    width = template_image.shape[1]
    for p, q, ok in zip(src.astype(int), dst.astype(int), inliers, strict=False):
        color = (0, 220, 0) if ok else (0, 0, 220)
        q2 = (int(q[0] + width), int(q[1]))
        cv2.circle(canvas, tuple(p), 3, color, -1)
        cv2.circle(canvas, q2, 3, color, -1)
        cv2.line(canvas, tuple(p), q2, color, 1)
    return canvas
