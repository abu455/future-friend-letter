from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class CutRegion:
    region_id: str
    center_mm: tuple[float, float]
    contour: list[tuple[float, float]] = field(default_factory=list)


@dataclass
class Job:
    job_id: str
    contours: list[list[tuple[float, float]]] = field(default_factory=list)
    keypoints: list[tuple[float, float]] = field(default_factory=list)
    cut_paths: list[list[tuple[float, float]]] = field(default_factory=list)
    holes: list[tuple[float, float]] = field(default_factory=list)
    cut_regions: list[CutRegion] = field(default_factory=list)
    units: str = "mm"
    bbox: tuple[float, float, float, float] | None = None

    def to_dict(self) -> dict:
        return {
            "job_id": self.job_id,
            "contours": self.contours,
            "keypoints": self.keypoints,
            "cut_paths": self.cut_paths,
            "holes": self.holes,
            "cut_regions": [region.__dict__ for region in self.cut_regions],
            "units": self.units,
            "bbox": self.bbox,
        }


def demo_job() -> Job:
    contour = [(0.0, 0.0), (320.0, 0.0), (320.0, 230.0), (0.0, 230.0)]
    return Job(
        job_id="demo_job",
        contours=[contour],
        keypoints=[(80.0, 80.0), (240.0, 160.0)],
        cut_paths=[contour],
        holes=[(80.0, 80.0), (240.0, 160.0)],
        cut_regions=[CutRegion("part_001", (160.0, 115.0), contour)],
        bbox=(0.0, 0.0, 320.0, 230.0),
    )
