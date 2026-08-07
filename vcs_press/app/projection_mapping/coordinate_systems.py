from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from app.utils.geometry import apply_transform
from app.utils.time_utils import utc_now_iso


@dataclass
class CoordinateTransform:
    source: str
    target: str
    matrix: list[list[float]]
    mode: str = "homography"
    units: str = "mm_to_px"
    metadata: dict = field(default_factory=dict)
    timestamp: str = field(default_factory=utc_now_iso)

    def apply(self, points: list[tuple[float, float]]) -> list[tuple[float, float]]:
        mapped = apply_transform(np.asarray(points, dtype=float), np.asarray(self.matrix, dtype=float))
        return [tuple(map(float, point)) for point in mapped]

    def inverse(self) -> CoordinateTransform:
        inv = np.linalg.inv(np.asarray(self.matrix, dtype=float))
        return CoordinateTransform(self.target, self.source, inv.tolist(), self.mode, self.units, self.metadata)


COORDINATE_SYSTEMS = {
    "cad": "CAD coordinates in mm from DXF/CAD nesting.",
    "machine": "Machine table/feed/punch coordinates in mm.",
    "camera": "Camera image coordinates in pixels.",
    "projector": "Projector output coordinates in pixels.",
    "material": "Current deformed material surface coordinates in mm.",
}
