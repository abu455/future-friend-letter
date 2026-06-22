from __future__ import annotations

import json
from pathlib import Path

from app.calibration.hole_detector import HoleDetector
from app.calibration.solver import CalibrationReport, CalibrationSolver
from app.camera.simulated_camera import SimulatedCamera
from app.illumination.simulated_light import SimulatedLightController
from app.plc.base import PLCBase
from app.storage.report_writer import ReportWriter
from app.utils.time_utils import utc_now_iso


class CalibrationService:
    def __init__(
        self,
        camera: SimulatedCamera,
        light: SimulatedLightController,
        plc: PLCBase,
        report_dir: str = "data/calibration",
    ):
        self.camera = camera
        self.light = light
        self.plc = plc
        self.detector = HoleDetector()
        self.solver = CalibrationSolver()
        self.report_dir = Path(report_dir)
        self.latest_report: dict | None = None
        self.report_writer = ReportWriter()

    def run_self_calibration(
        self,
        machine_points: list[tuple[float, float]] | None = None,
        mode: str = "affine",
    ) -> dict:
        machine_points = machine_points or [(0.0, 0.0), (100.0, 0.0), (0.0, 70.0), (100.0, 70.0)]
        self.plc.request_reference_punches(machine_points)
        self.light.turn_on()
        try:
            frame = self.camera.capture_calibration_scene()
        finally:
            self.light.turn_off()
        detected = self.detector.detect(frame.image, expected_count=len(machine_points))
        if len(detected.centers) != len(machine_points):
            raise RuntimeError(f"expected {len(machine_points)} holes, detected {len(detected.centers)}")
        report: CalibrationReport = self.solver.solve(detected.centers, machine_points, mode=mode)
        payload = report.to_dict() | {
            "timestamp": utc_now_iso(),
            "image_points": detected.centers,
            "machine_points": machine_points,
            "camera": self.camera.config.__dict__,
            "light": self.light.config.__dict__,
        }
        self.report_dir.mkdir(parents=True, exist_ok=True)
        path = self.report_dir / "calibration_report.json"
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        self.report_writer.write_json("calibration_latest.json", payload)
        self.latest_report = payload
        return payload
