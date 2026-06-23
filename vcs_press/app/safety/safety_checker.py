from __future__ import annotations

from dataclasses import dataclass

from app.plc.base import PLCStatus
from app.safety.alarm_codes import AlarmCodes, AlarmEvent, make_alarm


@dataclass
class SafetyDecision:
    allow_punch: bool
    alarm_code: str = AlarmCodes.OK
    alarm_message: str = ""
    severity: str = "INFO"
    timestamp: str = ""
    recommended_action: str = ""
    alarm: AlarmEvent | None = None

    def to_dict(self) -> dict:
        alarm_dict = self.alarm.to_dict() if self.alarm else make_alarm(self.alarm_code, self.alarm_message).to_dict()
        return {"allow_punch": self.allow_punch, **alarm_dict}

    @classmethod
    def from_alarm(cls, alarm_code: str, message: str | None = None) -> SafetyDecision:
        alarm = make_alarm(alarm_code, message)
        return cls(
            allow_punch=alarm.alarm_code == AlarmCodes.OK,
            alarm_code=alarm.alarm_code,
            alarm_message=alarm.alarm_message,
            severity=alarm.severity.value,
            timestamp=alarm.timestamp,
            recommended_action=alarm.recommended_action,
            alarm=alarm,
        )


class SafetyChecker:
    def __init__(
        self,
        max_x_mm: float = 5.0,
        max_y_mm: float = 5.0,
        max_feed_mm: float = 10.0,
        max_theta_deg: float = 2.0,
        confidence_threshold: float = 0.75,
        inlier_ratio_threshold: float = 0.40,
        residual_error_threshold_mm: float = 0.20,
        max_local_deformation_mm: float = 1.0,
        max_consecutive_ng: int = 3,
    ):
        self.max_x_mm = max_x_mm
        self.max_y_mm = max_y_mm
        self.max_feed_mm = max_feed_mm
        self.max_theta_deg = max_theta_deg
        self.confidence_threshold = confidence_threshold
        self.inlier_ratio_threshold = inlier_ratio_threshold
        self.residual_error_threshold_mm = residual_error_threshold_mm
        self.max_local_deformation_mm = max_local_deformation_mm
        self.max_consecutive_ng = max_consecutive_ng

    def evaluate(
        self,
        plc_status: PLCStatus,
        registration: dict,
        compensation: dict,
        deformation: dict | None = None,
        calibrated: bool | None = True,
        cad_loaded: bool | None = True,
        calibration_ok: bool | None = None,
        job_loaded: bool | None = None,
        camera_online: bool | None = True,
        camera_connected: bool | None = None,
        light_ok: bool | None = True,
        light_ready: bool | None = None,
        consecutive_ng: int = 0,
        vision_cycle_timeout: bool = False,
        plc_ack_timeout: bool = False,
        camera_acquire_timeout: bool = False,
        light_ready_timeout: bool = False,
        post_inspection_timeout: bool = False,
    ) -> SafetyDecision:
        try:
            calibration_passed = calibrated if calibration_ok is None else calibration_ok
            job_is_loaded = cad_loaded if job_loaded is None else job_loaded
            camera_is_connected = camera_online if camera_connected is None else camera_connected
            light_is_ready = light_ok if light_ready is None else light_ready
            checks = [
                (plc_status.safety.emergency_stop, AlarmCodes.EMERGENCY_STOP, None),
                (plc_status.safety.safety_door_open or not plc_status.safety.safety_door_closed, AlarmCodes.SAFETY_DOOR, None),
                (not plc_status.safety.light_curtain_ok, AlarmCodes.LIGHT_CURTAIN, None),
                (not plc_status.safety.air_pressure_ok, AlarmCodes.AIR_PRESSURE, None),
                (not plc_status.connected, AlarmCodes.PLC_DISCONNECTED, None),
                (not plc_status.plc_alive, AlarmCodes.PLC_ALIVE_LOST, None),
                (not plc_status.safety.plc_ok, AlarmCodes.PLC_FAULT, None),
                (camera_is_connected is not True, AlarmCodes.CAMERA_OFFLINE, None),
                (light_is_ready is not True, AlarmCodes.LIGHT_FAULT, None),
                (calibration_passed is not True, AlarmCodes.CALIBRATION_REQUIRED, None),
                (job_is_loaded is not True, AlarmCodes.CAD_NOT_LOADED, None),
                (registration.get("confidence", 0.0) < self.confidence_threshold, AlarmCodes.MATCH_LOW_CONFIDENCE, None),
                (registration.get("inlier_ratio", 0.0) < self.inlier_ratio_threshold, AlarmCodes.MATCH_LOW_INLIER, None),
                (registration.get("residual_error_mm", 999.0) > self.residual_error_threshold_mm, AlarmCodes.RESIDUAL_TOO_HIGH, None),
                (consecutive_ng >= self.max_consecutive_ng, AlarmCodes.CONSECUTIVE_NG, None),
                (vision_cycle_timeout, AlarmCodes.VISION_CYCLE_TIMEOUT, None),
                (plc_ack_timeout, AlarmCodes.PLC_ACK_TIMEOUT, None),
                (camera_acquire_timeout, AlarmCodes.CAMERA_ACQUIRE_TIMEOUT, None),
                (light_ready_timeout, AlarmCodes.LIGHT_READY_TIMEOUT, None),
                (post_inspection_timeout, AlarmCodes.POST_INSPECTION_TIMEOUT, None),
            ]
            if deformation:
                max_deformation = float(deformation.get("max_deformation_mm", 0.0))
                deformation_failed = (not deformation.get("allow_punch", True)) or max_deformation > self.max_local_deformation_mm
                checks.append((deformation_failed, AlarmCodes.DEFORMATION_LIMIT, deformation.get("reject_reason") or None))
            if (
                abs(float(compensation.get("x_offset_mm", 0.0))) > self.max_x_mm
                or abs(float(compensation.get("y_offset_mm", 0.0))) > self.max_y_mm
                or abs(float(compensation.get("feed_offset_mm", 0.0))) > self.max_feed_mm
                or abs(float(compensation.get("theta_offset_deg", 0.0))) > self.max_theta_deg
            ):
                checks.append((True, AlarmCodes.COMPENSATION_LIMIT, None))
            for failed, code, message in checks:
                if failed:
                    return SafetyDecision.from_alarm(code, message)
            return SafetyDecision.from_alarm(AlarmCodes.OK)
        except Exception as exc:
            return SafetyDecision.from_alarm(AlarmCodes.VISION_EXCEPTION, f"safety evaluation failed: {exc}")
