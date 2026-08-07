from __future__ import annotations

import hashlib
from pathlib import Path

import cv2
import numpy as np

from app.cad.job_model import Job
from app.projection_mapping.cad_to_projector import CADToProjectorMapper
from app.projection_rendering.alignment_marker_renderer import AlignmentMarkerRenderer
from app.projection_rendering.pattern_renderer import PatternRenderer
from app.projection_rendering.projection_style import ProjectionStyle
from app.utils.image_io import write_image


class CADProjectionRenderer:
    def __init__(self, style: ProjectionStyle | None = None):
        self.style = style or ProjectionStyle()
        self.mapper = CADToProjectorMapper()
        self.pattern_renderer = PatternRenderer()
        self.marker_renderer = AlignmentMarkerRenderer()

    def render(
        self,
        job: Job,
        machine_to_projector: list[list[float]],
        resolution: tuple[int, int],
        material_id: str = "sim_material",
        cad_file_hash: str | None = None,
    ) -> dict:
        width, height = resolution
        image = np.zeros((height, width, 3), dtype=np.uint8)
        mapped = self.mapper.map_job(job, machine_to_projector)
        if self.style.show_grid:
            image = self.pattern_renderer.draw_grid(image)
        for path in mapped["projected_cut_paths"]:
            pts = np.asarray(path, dtype=np.int32)
            if len(pts) >= 2:
                cv2.polylines(image, [pts], True, self.style.cut_line_color, self.style.line_width_px)
        for point in mapped["projected_holes"]:
            cv2.circle(image, tuple(np.asarray(point, dtype=int)), 10, self.style.hole_color, 2)
        image = self.marker_renderer.draw_markers(image, mapped["projected_keypoints"], self.style.alignment_marker_color)
        if self.style.show_text:
            cv2.putText(
                image, f"JOB {job.job_id} MATERIAL {material_id}", (40, height - 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2
            )
            cv2.arrowedLine(image, (80, 80), (180, 80), (255, 255, 255), 3)
        image = self.pattern_renderer.apply_brightness(image, self.style)
        cad_hash = cad_file_hash or hashlib.sha256(str(job.to_dict()).encode("utf-8")).hexdigest()[:16]
        pattern_id = f"{job.job_id}_{cad_hash}"
        pattern_path = write_image(Path("data/projection/patterns") / f"{pattern_id}.png", image)
        return {
            "image": image,
            "projector_image": image,
            "pattern_id": pattern_id,
            "job_id": job.job_id,
            "material_id": material_id,
            "cad_file_hash": cad_hash,
            "projected_cut_paths": mapped["projected_cut_paths"],
            "projected_alignment_markers": mapped["projected_keypoints"],
            "projection_preview_image": pattern_path,
            "overlay_debug_image": pattern_path,
            "pattern_path": pattern_path,
        }
