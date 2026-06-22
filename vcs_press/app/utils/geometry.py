from __future__ import annotations

import math
from typing import Iterable

import cv2
import numpy as np


def as_points(points: Iterable[Iterable[float]]) -> np.ndarray:
    arr = np.asarray(list(points), dtype=np.float64)
    if arr.ndim != 2 or arr.shape[1] != 2:
        raise ValueError("points must be an Nx2 array")
    return arr


def apply_transform(points: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    pts = as_points(points)
    mat = np.asarray(matrix, dtype=np.float64)
    if mat.shape == (2, 3):
        hom = np.c_[pts, np.ones(len(pts))]
        return (hom @ mat.T)[:, :2]
    if mat.shape == (3, 3):
        hom = np.c_[pts, np.ones(len(pts))]
        out = hom @ mat.T
        return out[:, :2] / out[:, 2:3]
    raise ValueError("matrix must be 2x3 or 3x3")


def affine_to_pose(matrix: np.ndarray) -> dict:
    mat = np.asarray(matrix, dtype=np.float64)
    if mat.shape == (3, 3):
        mat = mat[:2, :]
    a, b, tx = mat[0]
    c, d, ty = mat[1]
    scale = math.sqrt(max(a * a + c * c, 1e-12))
    theta = math.degrees(math.atan2(c, a))
    shear = (a * b + c * d) / max(scale * scale, 1e-12)
    return {
        "dx": float(tx),
        "dy": float(ty),
        "theta_deg": float(theta),
        "scale": float(scale),
        "shear": float(shear),
    }


def estimate_affine(src: np.ndarray, dst: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    src = as_points(src).astype(np.float32)
    dst = as_points(dst).astype(np.float32)
    mat, inliers = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=3.0)
    if mat is None:
        mat, inliers = cv2.estimateAffine2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=3.0)
    if mat is None:
        raise ValueError("unable to estimate affine transform")
    return mat.astype(np.float64), inliers.reshape(-1).astype(bool)


def residuals(src: np.ndarray, dst: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    pred = apply_transform(src, matrix)
    return np.linalg.norm(pred - as_points(dst), axis=1)
