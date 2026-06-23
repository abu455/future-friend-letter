from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from app.cad.job_model import Job, demo_job
from app.deformation.deformation_field import DeformationField, LocalOffset
from app.deformation.tps import ThinPlateSpline2D
from app.utils.geometry import apply_transform


class DeformationService:
    def __init__(self, px_to_mm: float = 0.1, grid_size: tuple[int, int] = (20, 20), max_local_mm: float = 1.0):
        self.px_to_mm = px_to_mm
        self.grid_size = grid_size
        self.max_local_mm = max_local_mm
        self.latest_field: dict | None = None

    def estimate(self, match_result: dict, job: Job | None = None) -> dict:
        job = job or demo_job()
        src = match_result.get("matched_points_template", [])
        dst = match_result.get("matched_points_current", [])
        if len(src) < 3 or len(dst) < 3:
            field = DeformationField(self.grid_size, allow_punch=False, reject_reason="insufficient dense matches")
            return self._save(field)
        src_arr = np.asarray(src, dtype=float)
        dst_arr = np.asarray(dst, dtype=float)
        affine = match_result.get("affine_matrix")
        if affine is not None:
            global_dst = apply_transform(src_arr, np.asarray(affine, dtype=float))
            residual_dst = src_arr + (dst_arr - global_dst)
        else:
            residual_dst = dst_arr
        tps = ThinPlateSpline2D()
        tps.fit(src_arr.tolist(), residual_dst.tolist())
        local_offsets: list[LocalOffset] = []
        magnitudes: list[float] = []
        for region in job.cut_regions:
            displacement_px = tps.displacement([region.center_mm])[0]
            x_mm = float(displacement_px[0] * self.px_to_mm)
            y_mm = float(displacement_px[1] * self.px_to_mm)
            mag = float(np.linalg.norm([x_mm, y_mm]))
            magnitudes.append(mag)
            local_offsets.append(LocalOffset(region.region_id, x_mm, y_mm, deformation_score=mag))
        max_def = max(magnitudes) if magnitudes else 0.0
        allow = max_def <= self.max_local_mm
        field = DeformationField(
            grid_size=self.grid_size,
            local_offsets=local_offsets,
            max_deformation_mm=max_def,
            allow_punch=allow,
            reject_reason="" if allow else "local deformation exceeds process threshold",
        )
        return self._save(field)

    def _save(self, field: DeformationField) -> dict:
        payload = field.to_dict()
        Path("data/reports").mkdir(parents=True, exist_ok=True)
        Path("data/reports/deformation_field.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
        self.latest_field = payload
        return payload
