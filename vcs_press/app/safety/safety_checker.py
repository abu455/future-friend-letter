from __future__ import annotations

from dataclasses import dataclass

from app.plc.base import PLCStatus
from app.safety.alarm_codes import AlarmCodes


@dataclass
class SafetyDecision:
    allow_punch: bool
    alarm_code: str = AlarmCodes.OK
    alarm_message: str = ""

    def to_dict(self) -> dict:
        return self.__dict__


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
        max_consecutive_ng: int = 3,
    ):
        self.max_x_mm = max_x_mm
        self.max_y_mm = max_y_mm
        self.max_feed_mm = max_feed_mm
        self.max_theta_deg = max_theta_deg
        self.confidence_threshold = confidence_threshold
        self.inlier_ratio_threshold = inlier_ratio_threshold
        self.residual_error_threshold_mm = residual_error_threshold_mm
        self.max_consecutive_ng = max_consecutive_ng

    def evaluate(
        self,
        plc_status: PLCStatus,
        registration: dict,
        compensation: dict,
        deformation: dict | None = None,
        calibrated: bool = True,
        cad_loaded: bool = True,
        camera_online: bool = True,
        light_ok: bool = True,
        consecutive_ng: int = 0,
    ) -> SafetyDecision:
        checks = [
            (plc_status.safety.emergency_stop, AlarmCodes.EMERGENCY_STOP, "emergency stop is active"),
            (plc_status.safety.safety_door_open, AlarmCodes.SAFETY_DOOR, "safety door is open"),
            (not plc_status.safety.air_pressure_ok, AlarmCodes.AIR_PRESSURE, "air pressure is not ok"),
            (not plc_status.connected or not plc_status.safety.plc_ok, AlarmCodes.PLC_FAULT, "PLC status is abnormal"),
            (not camera_online, AlarmCodes.CAMERA_OFFLINE, "camera is offline"),
            (not light_ok, AlarmCodes.LIGHT_FAULT, "light controller fault"),
            (not calibrated, AlarmCodes.CALIBRATION_REQUIRED, "self calibration is not complete"),
            (not cad_loaded, AlarmCodes.CAD_NOT_LOADED, "CAD/job is not loaded"),
            (registration.get("confidence", 0.0) < self.confidence_threshold, AlarmCodes.MATCH_LOW_CONFIDENCE, "matching confidence is too low"),
            (registration.get("inlier_ratio", 0.0) < self.inlier_ratio_threshold, AlarmCodes.MATCH_LOW_INLIER, "matching inlier ratio is too low"),
            (registration.get("residual_error_mm", 999.0) > self.residual_error_threshold_mm, AlarmCodes.RESIDUAL_TOO_HIGH, "registration residual is too high"),
            (consecutive_ng >= self.max_consecutive_ng, AlarmCodes.CONSECUTIVE_NG, "consecutive NG count exceeds threshold"),
        ]
        if deformation and not deformation.get("allow_punch", True):
            checks.append((True, AlarmCodes.DEFORMATION_LIMIT, deformation.get("reject_reason", "deformation limit exceeded")))
        if (
            abs(compensation.get("x_offset_mm", 0.0)) > self.max_x_mm
            or abs(compensation.get("y_offset_mm", 0.0)) > self.max_y_mm
            or abs(compensation.get("feed_offset_mm", 0.0)) > self.max_feed_mm
            or abs(compensation.get("theta_offset_deg", 0.0)) > self.max_theta_deg
        ):
            checks.append((True, AlarmCodes.COMPENSATION_LIMIT, "compensation exceeds machine limit"))
        for failed, code, message in checks:
            if failed:
                return SafetyDecision(False, code, message)
        return SafetyDecision(True)
