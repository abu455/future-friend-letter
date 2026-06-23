from __future__ import annotations

from app.registration.transform_solver import TransformSolver
from app.storage.report_writer import ReportWriter


class RegistrationService:
    def __init__(self, px_to_mm: float = 0.1):
        self.solver = TransformSolver()
        self.px_to_mm = px_to_mm
        self.latest_result: dict | None = None
        self.report_writer = ReportWriter()

    def compute(self, match_result: dict) -> dict:
        pose = self.solver.affine_pose(match_result.get("affine_matrix"))
        dx_mm, dy_mm = self.solver.image_offset_to_machine(pose["dx"], pose["dy"], self.px_to_mm)
        residual_mm = float(match_result.get("residual_error", 999.0) * self.px_to_mm)
        result = {
            "dx_mm": dx_mm,
            "dy_mm": dy_mm,
            "dtheta_deg": pose["theta_deg"],
            "scale": pose["scale"],
            "shear": pose["shear"],
            "confidence": float(match_result.get("confidence", 0.0)),
            "inlier_ratio": float(match_result.get("inlier_ratio", 0.0)),
            "residual_error_mm": residual_mm,
            "transform": match_result.get("affine_matrix"),
        }
        self.latest_result = result
        self.report_writer.write_json("registration_latest.json", result)
        return result
