from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class LocalProjectionOffset:
    region_id: str
    projector_x_offset_px: float
    projector_y_offset_px: float
    machine_x_offset_mm: float
    machine_y_offset_mm: float
    theta_offset_deg: float
    deformation_score: float
    projection_confidence: float

    def to_dict(self) -> dict:
        return self.__dict__


class MeshWarp:
    def __init__(self, grid_size: tuple[int, int] = (20, 20), px_per_mm: float = 10.0, max_local_mm: float = 1.0):
        self.grid_size = grid_size
        self.px_per_mm = px_per_mm
        self.max_local_mm = max_local_mm

    def build_offsets(self, deformation_field: dict) -> dict:
        offsets = []
        max_score = float(deformation_field.get("max_deformation_mm", 0.0))
        for item in deformation_field.get("local_offsets", []):
            x_mm = float(item.get("x_offset_mm", 0.0))
            y_mm = float(item.get("y_offset_mm", 0.0))
            score = float(item.get("deformation_score", np.hypot(x_mm, y_mm)))
            offsets.append(
                LocalProjectionOffset(
                    region_id=item.get("region_id", "region"),
                    projector_x_offset_px=x_mm * self.px_per_mm,
                    projector_y_offset_px=y_mm * self.px_per_mm,
                    machine_x_offset_mm=x_mm,
                    machine_y_offset_mm=y_mm,
                    theta_offset_deg=float(item.get("theta_offset_deg", 0.0)),
                    deformation_score=score,
                    projection_confidence=max(0.0, 1.0 - score / max(self.max_local_mm, 1e-6)),
                ).to_dict()
            )
            max_score = max(max_score, score)
        allow = bool(deformation_field.get("allow_punch", True)) and max_score <= self.max_local_mm
        return {
            "grid_size": self.grid_size,
            "local_projection_offsets": offsets,
            "max_local_projection_deformation_mm": max_score,
            "allow_projection": allow,
            "allow_punch": allow,
            "alarm_code": "" if allow else "PROJECTION_LOCAL_DEFORMATION_TOO_LARGE",
            "recommended_action": "" if allow else "Flatten material or reload material before punching.",
        }

    def warp_image(self, image: np.ndarray, deformation_field: dict) -> np.ndarray:
        offsets = self.build_offsets(deformation_field)
        if not offsets["local_projection_offsets"]:
            return image.copy()
        mean_dx = float(np.mean([item["projector_x_offset_px"] for item in offsets["local_projection_offsets"]]))
        mean_dy = float(np.mean([item["projector_y_offset_px"] for item in offsets["local_projection_offsets"]]))
        matrix = np.array([[1.0, 0.0, mean_dx], [0.0, 1.0, mean_dy]], dtype=np.float32)
        return cv2.warpAffine(image, matrix, (image.shape[1], image.shape[0]))

    def visualize_grid(self, image: np.ndarray) -> np.ndarray:
        out = image.copy()
        gx, gy = self.grid_size
        for x in np.linspace(0, image.shape[1] - 1, gx).astype(int):
            cv2.line(out, (x, 0), (x, image.shape[0] - 1), (80, 80, 80), 1)
        for y in np.linspace(0, image.shape[0] - 1, gy).astype(int):
            cv2.line(out, (0, y), (image.shape[1] - 1, y), (80, 80, 80), 1)
        return out
