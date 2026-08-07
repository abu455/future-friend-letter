from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from app.utils.time_utils import utc_now_iso


class AlarmSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    EMERGENCY = "EMERGENCY"


@dataclass(frozen=True)
class AlarmDefinition:
    alarm_code: str
    alarm_message: str
    severity: AlarmSeverity
    recommended_action: str


@dataclass
class AlarmEvent:
    alarm_code: str
    alarm_message: str
    severity: AlarmSeverity
    recommended_action: str
    timestamp: str

    def to_dict(self) -> dict:
        return {
            "alarm_code": self.alarm_code,
            "alarm_message": self.alarm_message,
            "severity": self.severity.value,
            "timestamp": self.timestamp,
            "recommended_action": self.recommended_action,
        }


class AlarmCodes:
    OK = "OK"
    EMERGENCY_STOP = "E_STOP"
    SAFETY_DOOR = "SAFETY_DOOR_OPEN"
    LIGHT_CURTAIN = "LIGHT_CURTAIN_BLOCKED"
    AIR_PRESSURE = "AIR_PRESSURE_LOW"
    PLC_FAULT = "PLC_FAULT"
    PLC_DISCONNECTED = "PLC_DISCONNECTED"
    PLC_ALIVE_LOST = "PLC_ALIVE_LOST"
    CAMERA_OFFLINE = "CAMERA_OFFLINE"
    LIGHT_FAULT = "LIGHT_FAULT"
    CALIBRATION_REQUIRED = "CALIBRATION_REQUIRED"
    CALIBRATION_ERROR = "CALIBRATION_ERROR"
    CAD_NOT_LOADED = "CAD_NOT_LOADED"
    MATCH_LOW_CONFIDENCE = "MATCH_LOW_CONFIDENCE"
    MATCH_LOW_INLIER = "MATCH_LOW_INLIER"
    RESIDUAL_TOO_HIGH = "RESIDUAL_TOO_HIGH"
    COMPENSATION_LIMIT = "COMPENSATION_LIMIT"
    DEFORMATION_LIMIT = "DEFORMATION_LIMIT"
    CONSECUTIVE_NG = "CONSECUTIVE_NG"
    VISION_CYCLE_TIMEOUT = "VISION_CYCLE_TIMEOUT"
    PLC_ACK_TIMEOUT = "PLC_ACK_TIMEOUT"
    CAMERA_ACQUIRE_TIMEOUT = "CAMERA_ACQUIRE_TIMEOUT"
    LIGHT_READY_TIMEOUT = "LIGHT_READY_TIMEOUT"
    POST_INSPECTION_TIMEOUT = "POST_INSPECTION_TIMEOUT"
    MODEL_MATCH_FAILED = "MODEL_MATCH_FAILED"
    VISION_EXCEPTION = "VISION_EXCEPTION"
    MANUAL_RESET_REQUIRED = "MANUAL_RESET_REQUIRED"
    PROJECTOR_DISCONNECTED = "PROJECTOR_DISCONNECTED"
    PROJECTOR_ALIVE_LOST = "PROJECTOR_ALIVE_LOST"
    PROJECTOR_NOT_READY = "PROJECTOR_NOT_READY"
    PROJECTOR_CALIBRATION_REQUIRED = "PROJECTOR_CALIBRATION_REQUIRED"
    PROJECTION_ALIGNMENT_FAILED = "PROJECTION_ALIGNMENT_FAILED"
    PROJECTION_LOW_CONFIDENCE = "PROJECTION_LOW_CONFIDENCE"
    PROJECTION_MEAN_ERROR_HIGH = "PROJECTION_MEAN_ERROR_HIGH"
    PROJECTION_MAX_ERROR_HIGH = "PROJECTION_MAX_ERROR_HIGH"
    PROJECTION_MARKERS_INSUFFICIENT = "PROJECTION_MARKERS_INSUFFICIENT"
    PROJECTION_IMAGE_OUT_OF_BOUNDS = "PROJECTION_IMAGE_OUT_OF_BOUNDS"
    PROJECTION_CUT_PATH_OUTSIDE_MATERIAL = "PROJECTION_CUT_PATH_OUTSIDE_MATERIAL"
    PROJECTION_ITERATIONS_EXCEEDED = "PROJECTION_ITERATIONS_EXCEEDED"
    PROJECTOR_UPDATE_TIMEOUT = "PROJECTOR_UPDATE_TIMEOUT"
    PROJECTOR_BRIGHTNESS_ABNORMAL = "PROJECTOR_BRIGHTNESS_ABNORMAL"
    PROJECTION_REFLECTION_TOO_HIGH = "PROJECTION_REFLECTION_TOO_HIGH"
    PROJECTOR_CAMERA_SYNC_FAILED = "PROJECTOR_CAMERA_SYNC_FAILED"
    PROJECTION_JOB_MISMATCH = "PROJECTION_JOB_MISMATCH"
    PROJECTION_LOCAL_DEFORMATION_TOO_LARGE = "PROJECTION_LOCAL_DEFORMATION_TOO_LARGE"


ALARM_DEFINITIONS: dict[str, AlarmDefinition] = {
    AlarmCodes.OK: AlarmDefinition(AlarmCodes.OK, "system ok", AlarmSeverity.INFO, "No action required."),
    AlarmCodes.EMERGENCY_STOP: AlarmDefinition(
        AlarmCodes.EMERGENCY_STOP,
        "emergency stop is active",
        AlarmSeverity.EMERGENCY,
        "Keep punch disabled. Inspect and reset emergency stop through PLC and operator procedure.",
    ),
    AlarmCodes.SAFETY_DOOR: AlarmDefinition(
        AlarmCodes.SAFETY_DOOR,
        "safety door is not closed",
        AlarmSeverity.CRITICAL,
        "Close safety door and verify safety relay before resetting alarm.",
    ),
    AlarmCodes.LIGHT_CURTAIN: AlarmDefinition(
        AlarmCodes.LIGHT_CURTAIN,
        "light curtain is blocked or unhealthy",
        AlarmSeverity.CRITICAL,
        "Clear light curtain and verify safety input before allowing production.",
    ),
    AlarmCodes.AIR_PRESSURE: AlarmDefinition(
        AlarmCodes.AIR_PRESSURE,
        "air pressure is not ok",
        AlarmSeverity.CRITICAL,
        "Restore pneumatic pressure and verify PLC safety input.",
    ),
    AlarmCodes.PLC_FAULT: AlarmDefinition(
        AlarmCodes.PLC_FAULT,
        "PLC safety status is abnormal",
        AlarmSeverity.CRITICAL,
        "Check PLC diagnostics and safety inputs.",
    ),
    AlarmCodes.PLC_DISCONNECTED: AlarmDefinition(
        AlarmCodes.PLC_DISCONNECTED,
        "PLC communication is disconnected",
        AlarmSeverity.CRITICAL,
        "Restore PLC communication. Keep allow_punch false.",
    ),
    AlarmCodes.PLC_ALIVE_LOST: AlarmDefinition(
        AlarmCodes.PLC_ALIVE_LOST,
        "PLC heartbeat is lost",
        AlarmSeverity.CRITICAL,
        "Check PLC heartbeat and network before reset.",
    ),
    AlarmCodes.CAMERA_OFFLINE: AlarmDefinition(
        AlarmCodes.CAMERA_OFFLINE,
        "camera is offline",
        AlarmSeverity.CRITICAL,
        "Reconnect camera and verify acquisition before reset.",
    ),
    AlarmCodes.LIGHT_FAULT: AlarmDefinition(
        AlarmCodes.LIGHT_FAULT,
        "light controller is not ready",
        AlarmSeverity.CRITICAL,
        "Check light controller power, trigger, and brightness configuration.",
    ),
    AlarmCodes.CALIBRATION_REQUIRED: AlarmDefinition(
        AlarmCodes.CALIBRATION_REQUIRED,
        "self calibration is not complete or not ok",
        AlarmSeverity.CRITICAL,
        "Run self calibration and verify reprojection error.",
    ),
    AlarmCodes.CALIBRATION_ERROR: AlarmDefinition(
        AlarmCodes.CALIBRATION_ERROR,
        "calibration error exceeds threshold",
        AlarmSeverity.CRITICAL,
        "Inspect reference holes, camera focus, lighting, and machine point order.",
    ),
    AlarmCodes.CAD_NOT_LOADED: AlarmDefinition(
        AlarmCodes.CAD_NOT_LOADED,
        "CAD/job is not loaded",
        AlarmSeverity.CRITICAL,
        "Load a valid job before requesting compensation.",
    ),
    AlarmCodes.MATCH_LOW_CONFIDENCE: AlarmDefinition(
        AlarmCodes.MATCH_LOW_CONFIDENCE,
        "matching confidence is too low",
        AlarmSeverity.WARNING,
        "Check material placement, lighting, template, and fallback matcher results.",
    ),
    AlarmCodes.MATCH_LOW_INLIER: AlarmDefinition(
        AlarmCodes.MATCH_LOW_INLIER,
        "matching inlier ratio is too low",
        AlarmSeverity.WARNING,
        "Inspect feature matches and material texture.",
    ),
    AlarmCodes.RESIDUAL_TOO_HIGH: AlarmDefinition(
        AlarmCodes.RESIDUAL_TOO_HIGH,
        "registration residual is too high",
        AlarmSeverity.WARNING,
        "Reacquire image, check material deformation, and verify calibration.",
    ),
    AlarmCodes.COMPENSATION_LIMIT: AlarmDefinition(
        AlarmCodes.COMPENSATION_LIMIT,
        "compensation exceeds machine limit",
        AlarmSeverity.CRITICAL,
        "Reject punch and inspect material feeding or machine coordinate setup.",
    ),
    AlarmCodes.DEFORMATION_LIMIT: AlarmDefinition(
        AlarmCodes.DEFORMATION_LIMIT,
        "local deformation exceeds process threshold",
        AlarmSeverity.CRITICAL,
        "Reject punch and inspect material stretch, shrinkage, wrinkle, or curl.",
    ),
    AlarmCodes.CONSECUTIVE_NG: AlarmDefinition(
        AlarmCodes.CONSECUTIVE_NG,
        "post-inspection consecutive NG count exceeds threshold",
        AlarmSeverity.CRITICAL,
        "Stop production and inspect tool, material, and compensation bias.",
    ),
    AlarmCodes.VISION_CYCLE_TIMEOUT: AlarmDefinition(
        AlarmCodes.VISION_CYCLE_TIMEOUT,
        "vision cycle timed out",
        AlarmSeverity.CRITICAL,
        "Reject punch and inspect processing load, model backend, and camera pipeline.",
    ),
    AlarmCodes.PLC_ACK_TIMEOUT: AlarmDefinition(
        AlarmCodes.PLC_ACK_TIMEOUT,
        "PLC ACK timed out",
        AlarmSeverity.CRITICAL,
        "Reject punch and inspect PLC handshake mapping and network latency.",
    ),
    AlarmCodes.CAMERA_ACQUIRE_TIMEOUT: AlarmDefinition(
        AlarmCodes.CAMERA_ACQUIRE_TIMEOUT,
        "camera acquisition timed out",
        AlarmSeverity.CRITICAL,
        "Reject punch and inspect trigger, exposure, and camera heartbeat.",
    ),
    AlarmCodes.LIGHT_READY_TIMEOUT: AlarmDefinition(
        AlarmCodes.LIGHT_READY_TIMEOUT,
        "light ready timed out",
        AlarmSeverity.CRITICAL,
        "Reject punch and inspect light controller trigger and ready signal.",
    ),
    AlarmCodes.POST_INSPECTION_TIMEOUT: AlarmDefinition(
        AlarmCodes.POST_INSPECTION_TIMEOUT,
        "post-inspection timed out",
        AlarmSeverity.CRITICAL,
        "Reject next punch and inspect post-inspection camera and algorithm runtime.",
    ),
    AlarmCodes.MODEL_MATCH_FAILED: AlarmDefinition(
        AlarmCodes.MODEL_MATCH_FAILED,
        "all matchers failed",
        AlarmSeverity.WARNING,
        "Keep allow_punch false and inspect model backend plus fallback matchers.",
    ),
    AlarmCodes.VISION_EXCEPTION: AlarmDefinition(
        AlarmCodes.VISION_EXCEPTION,
        "vision safety evaluation exception",
        AlarmSeverity.CRITICAL,
        "Keep allow_punch false and inspect logs before reset.",
    ),
    AlarmCodes.MANUAL_RESET_REQUIRED: AlarmDefinition(
        AlarmCodes.MANUAL_RESET_REQUIRED,
        "manual reset is required",
        AlarmSeverity.INFO,
        "Use reset_alarm only after root cause is confirmed cleared.",
    ),
    AlarmCodes.PROJECTOR_DISCONNECTED: AlarmDefinition(
        AlarmCodes.PROJECTOR_DISCONNECTED,
        "projector is disconnected",
        AlarmSeverity.CRITICAL,
        "Reconnect projector and verify heartbeat before enabling projection.",
    ),
    AlarmCodes.PROJECTOR_ALIVE_LOST: AlarmDefinition(
        AlarmCodes.PROJECTOR_ALIVE_LOST,
        "projector heartbeat is lost",
        AlarmSeverity.CRITICAL,
        "Keep allow_punch false. Check projector power, cable, and display process.",
    ),
    AlarmCodes.PROJECTOR_NOT_READY: AlarmDefinition(
        AlarmCodes.PROJECTOR_NOT_READY,
        "projector is not ready",
        AlarmSeverity.CRITICAL,
        "Initialize projector and verify brightness, resolution, and current pattern.",
    ),
    AlarmCodes.PROJECTOR_CALIBRATION_REQUIRED: AlarmDefinition(
        AlarmCodes.PROJECTOR_CALIBRATION_REQUIRED,
        "projector calibration is not ok",
        AlarmSeverity.CRITICAL,
        "Run camera-projector and machine-projector calibration before punching.",
    ),
    AlarmCodes.PROJECTION_ALIGNMENT_FAILED: AlarmDefinition(
        AlarmCodes.PROJECTION_ALIGNMENT_FAILED,
        "projection alignment quality failed",
        AlarmSeverity.CRITICAL,
        "Reject punch and rerun projection feedback alignment.",
    ),
    AlarmCodes.PROJECTION_LOW_CONFIDENCE: AlarmDefinition(
        AlarmCodes.PROJECTION_LOW_CONFIDENCE,
        "projection confidence is too low",
        AlarmSeverity.CRITICAL,
        "Check projected markers, lighting, material reflection, and calibration.",
    ),
    AlarmCodes.PROJECTION_MEAN_ERROR_HIGH: AlarmDefinition(
        AlarmCodes.PROJECTION_MEAN_ERROR_HIGH,
        "projection mean error exceeds threshold",
        AlarmSeverity.CRITICAL,
        "Reject punch and continue feedback alignment or recalibrate projector.",
    ),
    AlarmCodes.PROJECTION_MAX_ERROR_HIGH: AlarmDefinition(
        AlarmCodes.PROJECTION_MAX_ERROR_HIGH,
        "projection max error exceeds threshold",
        AlarmSeverity.CRITICAL,
        "Reject punch and inspect local deformation or projector calibration.",
    ),
    AlarmCodes.PROJECTION_MARKERS_INSUFFICIENT: AlarmDefinition(
        AlarmCodes.PROJECTION_MARKERS_INSUFFICIENT,
        "projected marker detection rate is too low",
        AlarmSeverity.CRITICAL,
        "Improve projection visibility and remove occlusions before punching.",
    ),
    AlarmCodes.PROJECTION_IMAGE_OUT_OF_BOUNDS: AlarmDefinition(
        AlarmCodes.PROJECTION_IMAGE_OUT_OF_BOUNDS,
        "projector image is out of bounds",
        AlarmSeverity.CRITICAL,
        "Check machine-to-projector transform and CAD placement.",
    ),
    AlarmCodes.PROJECTION_CUT_PATH_OUTSIDE_MATERIAL: AlarmDefinition(
        AlarmCodes.PROJECTION_CUT_PATH_OUTSIDE_MATERIAL,
        "projected cut path is outside material",
        AlarmSeverity.CRITICAL,
        "Reload material or adjust nesting before punching.",
    ),
    AlarmCodes.PROJECTION_ITERATIONS_EXCEEDED: AlarmDefinition(
        AlarmCodes.PROJECTION_ITERATIONS_EXCEEDED,
        "projection feedback exceeded max iterations",
        AlarmSeverity.CRITICAL,
        "Reject punch and inspect material deformation, marker visibility, and projector calibration.",
    ),
    AlarmCodes.PROJECTOR_UPDATE_TIMEOUT: AlarmDefinition(
        AlarmCodes.PROJECTOR_UPDATE_TIMEOUT,
        "projector update timed out",
        AlarmSeverity.CRITICAL,
        "Reject punch and inspect projector display pipeline latency.",
    ),
    AlarmCodes.PROJECTOR_BRIGHTNESS_ABNORMAL: AlarmDefinition(
        AlarmCodes.PROJECTOR_BRIGHTNESS_ABNORMAL,
        "projector brightness is abnormal",
        AlarmSeverity.CRITICAL,
        "Adjust brightness and verify projected marker visibility.",
    ),
    AlarmCodes.PROJECTION_REFLECTION_TOO_HIGH: AlarmDefinition(
        AlarmCodes.PROJECTION_REFLECTION_TOO_HIGH,
        "projection reflection score is too high",
        AlarmSeverity.CRITICAL,
        "Switch to clean/strobe mode or adjust lighting and polarization.",
    ),
    AlarmCodes.PROJECTOR_CAMERA_SYNC_FAILED: AlarmDefinition(
        AlarmCodes.PROJECTOR_CAMERA_SYNC_FAILED,
        "projector and camera synchronization failed",
        AlarmSeverity.CRITICAL,
        "Check clean/visible/strobe timing before continuing.",
    ),
    AlarmCodes.PROJECTION_JOB_MISMATCH: AlarmDefinition(
        AlarmCodes.PROJECTION_JOB_MISMATCH,
        "projection pattern does not match current job",
        AlarmSeverity.CRITICAL,
        "Regenerate projection pattern for the current job and CAD hash.",
    ),
    AlarmCodes.PROJECTION_LOCAL_DEFORMATION_TOO_LARGE: AlarmDefinition(
        AlarmCodes.PROJECTION_LOCAL_DEFORMATION_TOO_LARGE,
        "local projection deformation is too large",
        AlarmSeverity.CRITICAL,
        "Flatten material or reload material before punching.",
    ),
}


def make_alarm(alarm_code: str, message: str | None = None) -> AlarmEvent:
    definition = ALARM_DEFINITIONS.get(
        alarm_code,
        AlarmDefinition(alarm_code, message or "unknown alarm", AlarmSeverity.CRITICAL, "Keep allow_punch false and inspect logs."),
    )
    return AlarmEvent(
        alarm_code=definition.alarm_code,
        alarm_message=message or definition.alarm_message,
        severity=definition.severity,
        recommended_action=definition.recommended_action,
        timestamp=utc_now_iso(),
    )
