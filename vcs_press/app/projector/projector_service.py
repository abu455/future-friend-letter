from __future__ import annotations

from pathlib import Path

from app.cad.job_model import Job, demo_job
from app.projection_mapping.camera_projector_calibration import CameraProjectorCalibrationService
from app.projection_mapping.machine_projector_calibration import MachineProjectorCalibrationService
from app.projection_mapping.projection_feedback import ProjectionFeedbackLoop
from app.projection_rendering.cad_projection_renderer import CADProjectionRenderer
from app.projector.base import ProjectorBase
from app.projector.projector_canvas import ProjectorCanvas
from app.projector.simulated_projector import SimulatedProjector


class ProjectorService:
    def __init__(self, projector: ProjectorBase | None = None):
        self.projector = projector or SimulatedProjector()
        self.canvas = ProjectorCanvas(*self.projector.get_resolution())
        self.camera_calibration = CameraProjectorCalibrationService()
        self.machine_calibration = MachineProjectorCalibrationService()
        self.renderer = CADProjectionRenderer()
        self.feedback = ProjectionFeedbackLoop()
        self.camera_projector_report: dict | None = None
        self.machine_projector_report: dict | None = None
        self.latest_pattern: dict | None = None
        self.latest_feedback: dict | None = None
        self.mode = "clean"

    def status(self) -> dict:
        return self.projector.get_status().to_dict() | {
            "projection_mode": self.mode,
            "camera_projector_calibration_ok": self.camera_projector_report is not None
            and self.camera_projector_report.get("calibration_quality") == "OK",
            "machine_projector_calibration_ok": self.machine_projector_report is not None
            and self.machine_projector_report.get("calibration_quality") == "OK",
        }

    def connect(self) -> dict:
        self.projector.connect()
        return self.status()

    def disconnect(self) -> dict:
        self.projector.disconnect()
        return self.status()

    def turn_on(self) -> dict:
        self.projector.turn_on()
        return self.status()

    def turn_off(self) -> dict:
        self.projector.turn_off()
        return self.status()

    def clear(self) -> dict:
        self.projector.clear()
        return self.status()

    def set_mode(self, mode: str) -> dict:
        if mode not in {"visible", "clean", "strobe"}:
            raise ValueError("projection mode must be visible, clean, or strobe")
        self.mode = mode
        return self.status()

    def calibrate(self) -> dict:
        if not self.projector.validate_ready():
            raise RuntimeError("projector is not ready")
        self.camera_projector_report = self.camera_calibration.run(self.projector.get_resolution())
        self.machine_projector_report = self.machine_calibration.run(self.camera_projector_report)
        return {"camera_projector": self.camera_projector_report, "machine_projector": self.machine_projector_report}

    def render(self, job: Job | None = None, material_id: str = "sim_material") -> dict:
        job = job or demo_job()
        machine_to_projector = (self.machine_projector_report or self.machine_calibration.run()).get("machine_to_projector")
        pattern = self.renderer.render(job, machine_to_projector, self.projector.get_resolution(), material_id=material_id)
        self.latest_pattern = pattern
        Path("data/projection/patterns").mkdir(parents=True, exist_ok=True)
        return pattern

    def show_latest_pattern(self) -> dict:
        if self.latest_pattern is None:
            self.render()
        assert self.latest_pattern is not None
        path = self.projector.show_pattern(self.latest_pattern)
        return {"preview_path": path, "projector_status": self.status(), "pattern_id": self.latest_pattern["pattern_id"]}

    def feedback_loop(self, job: Job | None = None, registration: dict | None = None, deformation: dict | None = None) -> dict:
        if self.latest_pattern is None:
            self.render(job)
        assert self.latest_pattern is not None
        result = self.feedback.run(
            projector=self.projector,
            pattern=self.latest_pattern,
            job=job or demo_job(),
            registration=registration or {"dx_mm": 1.0, "dy_mm": -0.5, "dtheta_deg": 0.0, "confidence": 0.9},
            deformation=deformation or {"allow_punch": True, "max_deformation_mm": 0.1, "local_offsets": []},
            calibration_report=self.machine_projector_report or self.machine_calibration.run(),
        )
        self.latest_feedback = result
        return result
