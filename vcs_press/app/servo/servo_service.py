from __future__ import annotations

from dataclasses import asdict

from app.plc.base import PLCBase
from app.safety.safety_checker import SafetyChecker
from app.servo.compensation import CompensationLimiter, CompensationResult
from app.storage.report_writer import ReportWriter


class ServoService:
    def __init__(self, plc: PLCBase, safety_checker: SafetyChecker | None = None):
        self.plc = plc
        self.safety_checker = safety_checker or SafetyChecker()
        self.limiter = CompensationLimiter()
        self.report_writer = ReportWriter()
        self.latest_result: dict | None = None

    def compute(self, registration: dict, deformation: dict | None = None, calibrated: bool = True, cad_loaded: bool = True) -> dict:
        x, y, theta = self.limiter.clamp(
            -float(registration.get("dx_mm", 0.0)),
            -float(registration.get("dy_mm", 0.0)),
            -float(registration.get("dtheta_deg", 0.0)),
        )
        local_offsets = deformation.get("local_offsets", []) if deformation else []
        draft = {
            "x_offset_mm": x,
            "y_offset_mm": y,
            "theta_offset_deg": theta,
            "feed_offset_mm": 0.0,
            "local_offsets": local_offsets,
            "confidence": float(registration.get("confidence", 0.0)),
        }
        decision = self.safety_checker.evaluate(
            self.plc.read_status(),
            registration=registration,
            compensation=draft,
            deformation=deformation,
            calibrated=calibrated,
            cad_loaded=cad_loaded,
        )
        result = CompensationResult(
            x_offset_mm=x,
            y_offset_mm=y,
            theta_offset_deg=theta,
            feed_offset_mm=0.0,
            local_offsets=local_offsets,
            confidence=draft["confidence"],
            allow_punch=decision.allow_punch,
            reject_reason=decision.alarm_message,
            alarm_code=decision.alarm_code,
            alarm_message=decision.alarm_message,
        ).to_dict()
        self.latest_result = result
        self.report_writer.write_json("servo_compensation_latest.json", result)
        return result

    def send_to_plc(self, result: dict | None = None) -> dict:
        payload = result or self.latest_result
        if payload is None:
            raise RuntimeError("no compensation result available")
        self.plc.write_compensation(payload)
        self.plc.write_allow_punch(bool(payload.get("allow_punch", False)))
        if not payload.get("allow_punch", False):
            self.plc.write_alarm(payload.get("alarm_code", "VISION_REJECT"), payload.get("alarm_message", "vision rejected punch"))
        return {"sent": True, "allow_punch": bool(payload.get("allow_punch", False)), "plc_status": asdict(self.plc.read_status())}
