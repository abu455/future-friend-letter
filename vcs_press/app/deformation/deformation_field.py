from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class LocalOffset:
    region_id: str
    x_offset_mm: float
    y_offset_mm: float
    theta_offset_deg: float = 0.0
    deformation_score: float = 0.0


@dataclass
class DeformationField:
    grid_size: tuple[int, int]
    local_offsets: list[LocalOffset] = field(default_factory=list)
    max_deformation_mm: float = 0.0
    allow_punch: bool = True
    reject_reason: str = ""

    def to_dict(self) -> dict:
        return {
            "grid_size": self.grid_size,
            "local_offsets": [offset.__dict__ for offset in self.local_offsets],
            "max_deformation_mm": self.max_deformation_mm,
            "allow_punch": self.allow_punch,
            "reject_reason": self.reject_reason,
        }
