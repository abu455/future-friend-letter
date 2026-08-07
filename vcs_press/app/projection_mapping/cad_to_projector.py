from __future__ import annotations

import numpy as np

from app.cad.job_model import Job
from app.utils.geometry import apply_transform


class CADToProjectorMapper:
    def __init__(self, cad_to_machine_offset_mm: tuple[float, float] = (0.0, 0.0)):
        self.cad_to_machine_offset_mm = cad_to_machine_offset_mm

    def map_points(self, points: list[tuple[float, float]], machine_to_projector: list[list[float]]) -> list[tuple[float, float]]:
        offset = np.asarray(self.cad_to_machine_offset_mm, dtype=float)
        machine_points = np.asarray(points, dtype=float) + offset
        projected = apply_transform(machine_points, np.asarray(machine_to_projector, dtype=float))
        return [tuple(map(float, point)) for point in projected]

    def map_job(self, job: Job, machine_to_projector: list[list[float]]) -> dict:
        return {
            "job_id": job.job_id,
            "projected_cut_paths": [self.map_points(path, machine_to_projector) for path in job.cut_paths],
            "projected_holes": self.map_points(job.holes, machine_to_projector) if job.holes else [],
            "projected_keypoints": self.map_points(job.keypoints, machine_to_projector) if job.keypoints else [],
        }
