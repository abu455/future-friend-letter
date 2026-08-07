from __future__ import annotations

import json
from pathlib import Path

from app.projection_mapping.projector_calibration import ProjectorCalibrationSolver


class CameraProjectorCalibrationService:
    def __init__(self, report_dir: str = "data/projection/calibration"):
        self.solver = ProjectorCalibrationSolver()
        self.report_dir = Path(report_dir)

    def run(self, projector_resolution: tuple[int, int] = (1920, 1080), mode: str = "homography") -> dict:
        width, height = projector_resolution
        projector_points = [
            (0.15 * width, 0.18 * height),
            (0.85 * width, 0.16 * height),
            (0.82 * width, 0.82 * height),
            (0.18 * width, 0.84 * height),
            (0.50 * width, 0.50 * height),
        ]
        camera_points = [(x * 0.32 + 18.0, y * 0.34 + 12.0) for x, y in projector_points]
        report = self.solver.solve(projector_points, camera_points, source="projector", target="camera", mode=mode)
        payload = report.to_dict()
        payload["projector_to_camera"] = payload["transform_matrix"]
        payload["camera_to_projector"] = payload["inverse_matrix"]
        self._save("camera_projector_calibration.json", payload)
        return payload

    def run_with_points(
        self,
        projector_points: list[tuple[float, float]],
        camera_points: list[tuple[float, float]],
        mode: str = "homography",
    ) -> dict:
        report = self.solver.solve(projector_points, camera_points, source="projector", target="camera", mode=mode)
        payload = report.to_dict()
        payload["projector_to_camera"] = payload["transform_matrix"]
        payload["camera_to_projector"] = payload["inverse_matrix"]
        self._save("camera_projector_calibration.json", payload)
        return payload

    def _save(self, name: str, payload: dict) -> None:
        self.report_dir.mkdir(parents=True, exist_ok=True)
        (self.report_dir / name).write_text(json.dumps(payload, indent=2), encoding="utf-8")
