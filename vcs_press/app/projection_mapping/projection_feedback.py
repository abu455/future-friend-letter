from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from app.cad.job_model import Job
from app.projection_inspection.projection_alignment_checker import ProjectionAlignmentChecker
from app.projection_inspection.projection_error_estimator import ProjectionErrorEstimator
from app.projection_mapping.homography_warp import HomographyWarp
from app.projection_mapping.mesh_warp import MeshWarp
from app.projection_rendering.overlay_renderer import OverlayRenderer
from app.projector.base import ProjectorBase
from app.utils.image_io import write_image
from app.utils.time_utils import utc_now_iso


class ProjectionFeedbackLoop:
    def __init__(self, px_per_mm: float = 10.0, max_iterations: int = 5, convergence_threshold_mm: float = 0.10):
        self.px_per_mm = px_per_mm
        self.max_iterations = max_iterations
        self.convergence_threshold_mm = convergence_threshold_mm
        self.homography = HomographyWarp()
        self.mesh = MeshWarp(px_per_mm=px_per_mm)
        self.estimator = ProjectionErrorEstimator()
        self.alignment = ProjectionAlignmentChecker()
        self.overlay = OverlayRenderer()

    def run(
        self,
        projector: ProjectorBase,
        pattern: dict,
        job: Job,
        registration: dict,
        deformation: dict,
        calibration_report: dict,
        material_id: str = "sim_material",
    ) -> dict:
        resolution = projector.get_resolution()
        image = pattern["image"]
        dx_px = -float(registration.get("dx_mm", 0.0)) * self.px_per_mm
        dy_px = -float(registration.get("dy_mm", 0.0)) * self.px_per_mm
        mesh_result = self.mesh.build_offsets(deformation)
        warp = self.homography.offset_homography(dx_px, dy_px)
        warped = self.homography.warp_image(image, warp, resolution)
        warped = self.mesh.warp_image(warped, deformation)
        expected_markers = pattern.get("projected_alignment_markers") or [(resolution[0] * 0.5, resolution[1] * 0.5)]
        current_error_mm = max(float(np.hypot(dx_px, dy_px)) / self.px_per_mm, float(mesh_result["max_local_projection_deformation_mm"]))
        iterations = 0
        detected = expected_markers
        for iteration in range(1, self.max_iterations + 1):
            iterations = iteration
            current_error_mm *= 0.45
            error_px = current_error_mm * self.px_per_mm
            detected = [(x + error_px, y - error_px * 0.5) for x, y in expected_markers]
            if current_error_mm <= self.convergence_threshold_mm:
                break
        detector_result = {
            "detected_markers": detected,
            "visible_marker_count": len(detected),
            "expected_marker_count": len(expected_markers),
            "marker_detection_rate": 1.0,
            "line_visibility_score": 0.95,
            "reflection_score": 0.1,
        }
        error_result = self.estimator.estimate(expected_markers, detected, px_to_mm=1.0 / self.px_per_mm)
        quality = self.alignment.check(detector_result, error_result)
        job_mismatch = pattern.get("job_id") != job.job_id
        iterations_exceeded = iterations >= self.max_iterations and quality["projection_alignment_quality"] != "OK"
        if iterations_exceeded:
            quality["allow_projection"] = False
            quality["allow_punch"] = False
            quality["alarm_code"] = "PROJECTION_ITERATIONS_EXCEEDED"
            quality["alarm_message"] = "projection feedback exceeded max iterations"
            quality["recommended_action"] = "Reject punch and inspect material deformation, marker visibility, and projector calibration."
        if not mesh_result["allow_projection"]:
            quality["allow_projection"] = False
            quality["allow_punch"] = False
            quality["alarm_code"] = mesh_result["alarm_code"]
            quality["alarm_message"] = "local projection deformation is too large"
            quality["recommended_action"] = mesh_result["recommended_action"]
        if job_mismatch:
            quality["allow_projection"] = False
            quality["allow_punch"] = False
            quality["alarm_code"] = "PROJECTION_JOB_MISMATCH"
            quality["alarm_message"] = "projection pattern does not match current job"
            quality["recommended_action"] = "Regenerate projection pattern for the current job and CAD hash."
        warped_path = projector.show_image(warped, f"{pattern['pattern_id']}_warped")
        debug = self.overlay.draw_error_text(self.mesh.visualize_grid(warped), quality)
        debug_path = write_image("data/projection/debug_overlays/projection_debug_overlay.png", debug)
        report = {
            "report_id": f"projection_{int(np.round(np.sum(warped.shape)))}",
            "job_id": job.job_id,
            "material_id": material_id,
            "projector_id": projector.get_status().current_pattern_id,
            "camera_id": "simulated-main",
            "calibration_id": calibration_report.get("calibration_id", "sim_machine_projector"),
            "projection_pattern_id": pattern["pattern_id"],
            "projector_calibration_ok": calibration_report.get("calibration_quality") == "OK",
            "job_pattern_mismatch": job_mismatch,
            "transform_mode": "homography",
            "mesh_warp_enabled": True,
            "feedback_iterations": iterations,
            **quality,
            "updated_projector_warp": warp,
            "updated_projector_image": warped_path,
            "debug_image_paths": [debug_path],
            "timestamp": utc_now_iso(),
        }
        Path("data/projection/reports").mkdir(parents=True, exist_ok=True)
        Path("data/projection/reports/projection_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        return report | {"report_path": "data/projection/reports/projection_report.json", "debug_image_path": debug_path}
