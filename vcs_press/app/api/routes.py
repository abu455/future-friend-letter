from __future__ import annotations

from dataclasses import asdict

from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from app.api.websocket import StatusBroadcaster
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
from app.projector.projector_service import ProjectorService
from app.registration.registration_service import RegistrationService
from app.safety.alarm_codes import make_alarm
from app.servo.servo_service import ServoService
from app.state_machine.controller import StateMachineController
from app.state_machine.states import MachineState
from app.storage.report_writer import ReportWriter
from app.storage.repository import InMemoryRepository
from app.vision_matching.matching_service import MatchingService


class JobLoadRequest(BaseModel):
    dxf_path: str | None = None
    job_id: str = "demo_job"


class VisionRegisterRequest(BaseModel):
    matcher: str | None = None


class EmergencyAckRequest(BaseModel):
    plc_confirmed: bool = False
    operator_confirmed: bool = False


class ProjectionModeRequest(BaseModel):
    mode: str


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
        self.projector = ProjectorService()
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
            "projector": self.projector.status(),
            "latest_projection": self.projector.latest_feedback,
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
        <button onclick="fetch('/projector/connect',{method:'POST'}).then(load)">Connect Projector</button>
        <button onclick="fetch('/projection/calibration/start',{method:'POST'}).then(load)">Projector Calibration</button>
        <button onclick="fetch('/projection/render',{method:'POST'}).then(load)">Projection Preview</button>
        <button onclick="fetch('/projection/feedback_loop',{method:'POST'}).then(load)">Projection Feedback</button>
        <button onclick="fetch('/servo/compute',{method:'POST'}).then(load)">Compute Servo</button>
        <button onclick="fetch('/inspection/run',{method:'POST'}).then(load)">Post Inspection</button>
        <pre id="status"></pre>
        <script>
        async function load(){
          const response = await fetch('/system/status');
          document.getElementById('status').textContent = JSON.stringify(await response.json(), null, 2);
        }
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

    @app.post("/system/reset_alarm")
    def reset_alarm() -> dict:
        ctx.state_machine.reset_alarm()
        ctx.plc.write_allow_punch(False)
        return ctx.status()

    @app.post("/system/ack_emergency_stop")
    def ack_emergency_stop(request: EmergencyAckRequest) -> dict:
        ctx.state_machine.acknowledge_emergency_stop(request.plc_confirmed, request.operator_confirmed)
        ctx.plc.write_allow_punch(False)
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
    def vision_register(request: VisionRegisterRequest | None = None) -> dict:
        if ctx.state_machine.state == MachineState.CALIBRATION_OK:
            _goto(ctx, MachineState.WAIT_MATERIAL, "material ready")
        _goto(ctx, MachineState.ACQUIRE_IMAGE, "acquire material")
        _goto(ctx, MachineState.MATCHING, "feature matching")
        match = ctx.matching.register(request.matcher if request else None)
        _goto(ctx, MachineState.REGISTRATION, "geometric registration")
        registration = ctx.registration.compute(match)
        _goto(ctx, MachineState.DEFORMATION_ESTIMATION, "soft material deformation")
        deformation = ctx.deformation.estimate(match, ctx.job)
        return {"match": match, "registration": registration, "deformation": deformation}

    @app.get("/projector/status")
    def projector_status() -> dict:
        return {"success": True, "projector_status": ctx.projector.status()}

    @app.post("/projector/connect")
    def projector_connect() -> dict:
        _goto(ctx, MachineState.PROJECTOR_INIT, "projector init")
        status = ctx.projector.connect()
        _goto(ctx, MachineState.PROJECTOR_READY, "projector ready")
        return {"success": True, "projector_status": status}

    @app.post("/projector/disconnect")
    def projector_disconnect() -> dict:
        return {"success": True, "projector_status": ctx.projector.disconnect(), "allow_punch": False}

    @app.post("/projector/on")
    def projector_on() -> dict:
        return {"success": True, "projector_status": ctx.projector.turn_on()}

    @app.post("/projector/off")
    def projector_off() -> dict:
        return {"success": True, "projector_status": ctx.projector.turn_off(), "allow_punch": False}

    @app.post("/projector/clear")
    def projector_clear() -> dict:
        return {"success": True, "projector_status": ctx.projector.clear(), "allow_punch": False}

    @app.post("/projector/show_pattern")
    def projector_show_pattern() -> dict:
        result = ctx.projector.show_latest_pattern()
        return {"success": True, **result, "allow_punch": False}

    @app.post("/projection/calibration/start")
    def projection_calibration_start() -> dict:
        if not ctx.projector.projector.is_connected():
            projector_connect()
        _goto(ctx, MachineState.PROJECTOR_CALIBRATION, "projector calibration")
        report = ctx.projector.calibrate()
        _goto(ctx, MachineState.PROJECTOR_CALIBRATION_OK, "projector calibration ok")
        return {"success": True, "projector_status": ctx.projector.status(), "projection_alignment_quality": "CALIBRATED", **report}

    @app.get("/projection/calibration/status")
    def projection_calibration_status() -> dict:
        return {
            "success": True,
            "projector_status": ctx.projector.status(),
            "camera_projector": ctx.projector.camera_projector_report,
            "machine_projector": ctx.projector.machine_projector_report,
        }

    @app.post("/projection/render")
    def projection_render() -> dict:
        _goto(ctx, MachineState.PROJECTION_RENDER, "projection render")
        pattern = ctx.projector.render(ctx.job)
        shown = ctx.projector.show_latest_pattern()
        _goto(ctx, MachineState.PROJECTION_PREVIEW, "projection preview")
        return {
            "success": True,
            "projector_status": ctx.projector.status(),
            "allow_projection": True,
            "allow_punch": False,
            **shown,
            "pattern_id": pattern["pattern_id"],
        }

    @app.post("/projection/preview")
    def projection_preview() -> dict:
        return projection_render()

    @app.post("/projection/update_warp")
    def projection_update_warp() -> dict:
        return projection_feedback_loop()

    @app.post("/projection/feedback_loop")
    def projection_feedback_loop() -> dict:
        if ctx.registration.latest_result is None or ctx.deformation.latest_field is None:
            vision_register()
        _goto(ctx, MachineState.PROJECTION_FEEDBACK, "projection feedback")
        report = ctx.projector.feedback_loop(ctx.job, ctx.registration.latest_result, ctx.deformation.latest_field)
        _goto(
            ctx,
            MachineState.PROJECTION_OK if report["allow_projection"] else MachineState.PROJECTION_FAILED,
            report.get("alarm_message", "projection feedback"),
        )
        return {
            "success": report["allow_projection"],
            "projector_status": ctx.projector.status(),
            "projection_alignment_quality": report["projection_alignment_quality"],
            "projection_error_mm": report["projection_mean_error_mm"],
            "projection_confidence": report["projection_confidence"],
            "allow_projection": report["allow_projection"],
            "allow_punch": report["allow_punch"],
            "alarm_code": report["alarm_code"],
            "alarm_message": report["alarm_message"],
            "recommended_action": report["recommended_action"],
            "debug_image_path": report["debug_image_path"],
            "report_path": report["report_path"],
        }

    @app.get("/projection/report/latest")
    def projection_report_latest() -> dict:
        return {"success": ctx.projector.latest_feedback is not None, "report": ctx.projector.latest_feedback}

    @app.post("/projection/mode")
    def projection_mode(request: ProjectionModeRequest) -> dict:
        return {"success": True, "projector_status": ctx.projector.set_mode(request.mode), "allow_punch": False}

    @app.post("/projection/safety/check")
    def projection_safety_check() -> dict:
        decision = ctx.servo.safety_checker.evaluate(
            ctx.plc.read_status(),
            registration=ctx.registration.latest_result or {"confidence": 1.0, "inlier_ratio": 1.0, "residual_error_mm": 0.0},
            compensation=ctx.servo.latest_result or {"x_offset_mm": 0, "y_offset_mm": 0, "theta_offset_deg": 0, "feed_offset_mm": 0},
            deformation=ctx.deformation.latest_field,
            calibrated=ctx.calibrated,
            cad_loaded=ctx.job is not None,
            projector_status=ctx.projector.status(),
            projection=ctx.projector.latest_feedback,
        )
        return {"success": decision.allow_punch, "allow_punch": decision.allow_punch, **decision.to_dict()}

    @app.post("/servo/compute")
    def servo_compute() -> dict:
        if ctx.registration.latest_result is None or ctx.deformation.latest_field is None:
            vision_register()
        result = ctx.servo.compute(
            ctx.registration.latest_result,
            ctx.deformation.latest_field,
            calibrated=ctx.calibrated,
            cad_loaded=ctx.job is not None,
            projector_status=ctx.projector.status() if ctx.projector.latest_feedback else None,
            projection=ctx.projector.latest_feedback,
        )
        if result["allow_punch"]:
            _goto(ctx, MachineState.COMPENSATION_READY, "compensation ready")
        else:
            ctx.state_machine.enter_alarm(
                make_alarm(result.get("alarm_code", "VISION_REJECT"), result.get("alarm_message", "vision rejected punch"))
            )
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
