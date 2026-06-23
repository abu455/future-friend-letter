from __future__ import annotations

from contextlib import suppress
from dataclasses import asdict

from app.plc.base import PLCBase
from app.safety.alarm_codes import AlarmCodes, make_alarm
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

    def compute(
        self,
        registration: dict,
        deformation: dict | None = None,
        calibrated: bool = True,
        cad_loaded: bool = True,
        **safety_flags,
    ) -> dict:
        try:
            raw_x = -float(registration.get("dx_mm", 0.0))
            raw_y = -float(registration.get("dy_mm", 0.0))
            raw_theta = -float(registration.get("dtheta_deg", 0.0))
            x, y, theta = self.limiter.clamp(raw_x, raw_y, raw_theta)
            local_offsets = deformation.get("local_offsets", []) if deformation else []
            safety_payload = {
                "x_offset_mm": raw_x,
                "y_offset_mm": raw_y,
                "theta_offset_deg": raw_theta,
                "feed_offset_mm": 0.0,
                "local_offsets": local_offsets,
                "confidence": float(registration.get("confidence", 0.0)),
            }
            decision = self.safety_checker.evaluate(
                self.plc.read_status(),
                registration=registration,
                compensation=safety_payload,
                deformation=deformation,
                calibrated=calibrated,
                cad_loaded=cad_loaded,
                **safety_flags,
            )
            result = CompensationResult(
                x_offset_mm=x,
                y_offset_mm=y,
                theta_offset_deg=theta,
                feed_offset_mm=0.0,
                local_offsets=local_offsets,
                confidence=safety_payload["confidence"],
                allow_punch=decision.allow_punch,
                reject_reason=decision.alarm_message,
                alarm_code=decision.alarm_code,
                alarm_message=decision.alarm_message,
                severity=decision.severity,
                recommended_action=decision.recommended_action,
                timestamp=decision.timestamp,
            ).to_dict()
        except Exception as exc:
            result = self._fail_closed(f"servo compute failed: {exc}")
        self.latest_result = result
        self.report_writer.write_json("servo_compensation_latest.json", result)
        return result

    def send_to_plc(self, result: dict | None = None) -> dict:
        payload = result or self.latest_result or self._fail_closed("no compensation result available")
        try:
            self.plc.write_allow_punch(False)
            self.plc.write_compensation(payload)
            allow = bool(payload.get("allow_punch", False))
            self.plc.write_allow_punch(allow)
            if not allow:
                self.plc.write_alarm(payload.get("alarm_code", "VISION_REJECT"), payload.get("alarm_message", "vision rejected punch"))
            return {"sent": True, "allow_punch": allow, "plc_status": asdict(self.plc.read_status())}
        except Exception as exc:
            fail = self._fail_closed(f"PLC write failed: {exc}")
            self.latest_result = fail
            with suppress(Exception):
                self.plc.write_allow_punch(False)
            return {"sent": False, "allow_punch": False, "error": str(exc), "plc_status": asdict(self.plc.read_status())}

    def _fail_closed(self, message: str) -> dict:
        alarm = make_alarm(AlarmCodes.VISION_EXCEPTION, message)
        result = CompensationResult(
            x_offset_mm=0.0,
            y_offset_mm=0.0,
            theta_offset_deg=0.0,
            feed_offset_mm=0.0,
            confidence=0.0,
            allow_punch=False,
            reject_reason=message,
            alarm_code=alarm.alarm_code,
            alarm_message=alarm.alarm_message,
            severity=alarm.severity.value,
            recommended_action=alarm.recommended_action,
            timestamp=alarm.timestamp,
        ).to_dict()
        self.latest_result = result
        return result
