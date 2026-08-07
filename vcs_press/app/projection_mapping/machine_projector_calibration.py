from __future__ import annotations

import json
from pathlib import Path

from app.projection_mapping.projector_calibration import ProjectorCalibrationSolver


class MachineProjectorCalibrationService:
    def __init__(self, report_dir: str = "data/projection/calibration"):
        self.solver = ProjectorCalibrationSolver()
        self.report_dir = Path(report_dir)

    def run(self, camera_projector_report: dict | None = None, mode: str = "homography") -> dict:
        machine_points = [(0.0, 0.0), (1600.0, 0.0), (1600.0, 1200.0), (0.0, 1200.0), (800.0, 600.0)]
        projector_points = [(220.0, 160.0), (1700.0, 160.0), (1700.0, 950.0), (220.0, 950.0), (960.0, 555.0)]
        report = self.solver.solve(machine_points, projector_points, source="machine", target="projector", mode=mode, px_to_mm=0.05)
        payload = report.to_dict()
        payload["machine_to_projector"] = payload["transform_matrix"]
        payload["projector_to_machine"] = payload["inverse_matrix"]
        if camera_projector_report:
            payload["camera_projector_calibration_id"] = camera_projector_report.get("calibration_id")
        self._save("machine_projector_calibration.json", payload)
        return payload

    def run_with_points(
        self, machine_points: list[tuple[float, float]], projector_points: list[tuple[float, float]], mode: str = "homography"
    ) -> dict:
        report = self.solver.solve(machine_points, projector_points, source="machine", target="projector", mode=mode, px_to_mm=0.05)
        payload = report.to_dict()
        payload["machine_to_projector"] = payload["transform_matrix"]
        payload["projector_to_machine"] = payload["inverse_matrix"]
        self._save("machine_projector_calibration.json", payload)
        return payload

    def _save(self, name: str, payload: dict) -> None:
        self.report_dir.mkdir(parents=True, exist_ok=True)
        (self.report_dir / name).write_text(json.dumps(payload, indent=2), encoding="utf-8")
