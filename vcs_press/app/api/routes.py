from __future__ import annotations

from dataclasses import asdict

from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from app.cad.dxf_parser import DXFParser
from app.cad.job_model import Job, demo_job
from app.calibration.calibration_service import CalibrationService
from app.camera.base import CameraConfig
from app.camera.simulated_camera import SimulatedCamera
from app.deformation.deformation_service import DeformationService
from app.illumination.simulated_light import SimulatedLightController
from app.inspection.post_inspection import PostInspectionService
from app.online_learning.online_compensator import OnlineCompensator
from app.plc.simulated_plc import SimulatedPLC
from app.registration.registration_service import RegistrationService
from app.servo.servo_service import ServoService
from app.state_machine.controller import StateMachineController
from app.state_machine.states import MachineState
from app.storage.repository import InMemoryRepository
from app.storage.report_writer import ReportWriter
from app.vision_matching.matching_service import MatchingService

from app.api.websocket import StatusBroadcaster


class JobLoadRequest(BaseModel):
    dxf_path: str | None = None
    job_id: str = "demo_job"


class AppContext:
    def __init__(self):
        self.camera = SimulatedCamera(CameraConfig(width=640, height=480))
        self.camera.open()
        self.light = SimulatedLightController()
        self.plc = SimulatedPLC()
        self.state_machine = StateMachineController()
        self.repo = InMemoryRepository()
        self.report_writer = ReportWriter()
        self.calibration = CalibrationService(self.camera, self.light, self.plc)
        self.matching = MatchingService(self.camera)
        self.registration = RegistrationService(px_to_mm=0.1)
        self.deformation = DeformationService(px_to_mm=0.1)
        self.servo = ServoService(self.plc)
        self.inspection = PostInspectionService()
        self.online = OnlineCompensator()
        self.job: Job | None = demo_job()
        self.calibrated = False

    def status(self) -> dict:
        return {
            "system": "VCS-Press Calibration-Free Vision Servo System",
            "state_machine": self.state_machine.status(),
            "camera_online": self.camera.online,
            "light_online": self.light.online,
            "plc": asdict(self.plc.read_status()),
            "calibrated": self.calibrated,
            "job": self.job.to_dict() if self.job else None,
            "latest_calibration": self.calibration.latest_report,
            "latest_registration": self.registration.latest_result,
            "latest_compensation": self.servo.latest_result,
            "latest_inspection": self.inspection.latest_report,
        }


def create_app() -> FastAPI:
    app = FastAPI(title="VCS-Press Calibration-Free Vision Servo System", version="0.1.0")
    ctx = AppContext()
    broadcaster = StatusBroadcaster()
    app.state.ctx = ctx

    @app.get("/", response_class=HTMLResponse)
    def hmi() -> str:
        return """
        <html><head><title>VCS-Press HMI</title></head>
        <body style="font-family: sans-serif">
        <h1>VCS-Press HMI</h1>
        <button onclick="fetch('/calibration/start',{method:'POST'}).then(load)">Self Calibration</button>
        <button onclick="fetch('/vision/register',{method:'POST'}).then(load)">Register</button>
        <button onclick="fetch('/servo/compute',{method:'POST'}).then(load)">Compute Servo</button>
        <button onclick="fetch('/inspection/run',{method:'POST'}).then(load)">Post Inspection</button>
        <pre id="status"></pre>
        <script>
        async function load(){document.getElementById('status').textContent=JSON.stringify(await (await fetch('/system/status')).json(), null, 2)}
        load(); setInterval(load, 2000)
        </script></body></html>
        """

    @app.get("/health")
    def health() -> dict:
        return {"ok": True}

    @app.get("/system/status")
    def system_status() -> dict:
        return ctx.status()

    @app.post("/system/init")
    def system_init() -> dict:
        if ctx.state_machine.state == MachineState.IDLE:
            ctx.state_machine.transition(MachineState.INIT, "system init requested")
        return ctx.status()

    @app.post("/calibration/start")
    def calibration_start() -> dict:
        _goto(ctx, MachineState.INIT, "prepare calibration")
        _goto(ctx, MachineState.SELF_CALIBRATION, "self calibration started")
        report = ctx.calibration.run_self_calibration()
        if report["calibration_quality"] == "OK":
            ctx.calibrated = True
            _goto(ctx, MachineState.CALIBRATION_OK, "self calibration passed")
        else:
            ctx.state_machine.set_alarm("CALIBRATION_ERROR", "calibration reprojection error exceeds threshold")
        return report

    @app.get("/calibration/status")
    def calibration_status() -> dict:
        return {"calibrated": ctx.calibrated, "report": ctx.calibration.latest_report}

    @app.post("/job/load")
    def job_load(request: JobLoadRequest) -> dict:
        _goto(ctx, MachineState.LOAD_JOB, "load job")
        ctx.job = DXFParser().parse(request.dxf_path or "", layer_filter={"cut": "CUT", "holes": "HOLE", "alignment": "ALIGN"})
        _goto(ctx, MachineState.WAIT_MATERIAL, "job loaded")
        return ctx.job.to_dict()

    @app.get("/job/current")
    def current_job() -> dict:
        return ctx.job.to_dict() if ctx.job else {}

    @app.post("/vision/acquire")
    def vision_acquire() -> dict:
        _goto(ctx, MachineState.ACQUIRE_IMAGE, "manual acquire")
        frame = ctx.camera.soft_trigger()
        return {"timestamp": frame.timestamp, "shape": list(frame.image.shape), "metadata": frame.metadata}

    @app.post("/vision/register")
    def vision_register() -> dict:
        if ctx.state_machine.state == MachineState.CALIBRATION_OK:
            _goto(ctx, MachineState.WAIT_MATERIAL, "material ready")
        _goto(ctx, MachineState.ACQUIRE_IMAGE, "acquire material")
        _goto(ctx, MachineState.MATCHING, "feature matching")
        match = ctx.matching.register()
        _goto(ctx, MachineState.REGISTRATION, "geometric registration")
        registration = ctx.registration.compute(match)
        _goto(ctx, MachineState.DEFORMATION_ESTIMATION, "soft material deformation")
        deformation = ctx.deformation.estimate(match, ctx.job)
        return {"match": match, "registration": registration, "deformation": deformation}

    @app.post("/servo/compute")
    def servo_compute() -> dict:
        if ctx.registration.latest_result is None or ctx.deformation.latest_field is None:
            vision_register()
        result = ctx.servo.compute(ctx.registration.latest_result, ctx.deformation.latest_field, calibrated=ctx.calibrated, cad_loaded=ctx.job is not None)
        _goto(ctx, MachineState.COMPENSATION_READY if result["allow_punch"] else MachineState.ALARM, result.get("alarm_message", "compensation computed"))
        return result

    @app.post("/servo/send_to_plc")
    def servo_send_to_plc() -> dict:
        result = ctx.servo.send_to_plc()
        if result["allow_punch"]:
            _goto(ctx, MachineState.WAIT_PLC_ACK, "compensation sent")
            _goto(ctx, MachineState.PUNCH_ALLOWED, "PLC may decide final punch")
        return result

    @app.post("/inspection/run")
    def inspection_run() -> dict:
        _goto(ctx, MachineState.POST_INSPECTION, "post punch inspection")
        report = ctx.inspection.run(ctx.job.job_id if ctx.job else "unknown")
        _goto(ctx, MachineState.ONLINE_UPDATE, "online bias update")
        bias = ctx.online.update(report["measured_errors_mm"])
        return {"inspection": report, "online_learning": bias}

    @app.get("/logs/recent")
    def logs_recent() -> dict:
        return {"records": ctx.repo.recent()}

    @app.get("/reports/latest")
    def reports_latest() -> dict:
        return ctx.report_writer.latest()

    @app.websocket("/ws/status")
    async def ws_status(websocket: WebSocket) -> None:
        await broadcaster.stream(websocket, ctx.status)

    return app


def _goto(ctx: AppContext, target: MachineState, reason: str) -> None:
    if ctx.state_machine.state == target:
        return
    try:
        ctx.state_machine.transition(target, reason)
    except ValueError:
        if target == MachineState.ALARM:
            ctx.state_machine.set_alarm("VISION_ALARM", reason)
