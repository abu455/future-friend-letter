from __future__ import annotations

from dataclasses import dataclass

from app.safety.alarm_codes import AlarmCodes, make_alarm


@dataclass
class ProjectionQualityResult:
    projection_mean_error_px: float
    projection_max_error_px: float
    projection_mean_error_mm: float
    projection_max_error_mm: float
    projection_confidence: float
    visible_marker_count: int
    expected_marker_count: int
    marker_detection_rate: float
    line_visibility_score: float
    reflection_score: float
    projection_alignment_quality: str
    allow_projection: bool
    allow_punch: bool
    alarm_code: str
    alarm_message: str
    recommended_action: str

    def to_dict(self) -> dict:
        return self.__dict__


class ProjectionQualityChecker:
    def __init__(
        self,
        max_mean_error_mm: float = 0.20,
        max_max_error_mm: float = 0.50,
        min_confidence: float = 0.75,
        min_marker_detection_rate: float = 0.70,
        max_reflection_score: float = 0.60,
    ):
        self.max_mean_error_mm = max_mean_error_mm
        self.max_max_error_mm = max_max_error_mm
        self.min_confidence = min_confidence
        self.min_marker_detection_rate = min_marker_detection_rate
        self.max_reflection_score = max_reflection_score

    def evaluate(self, metrics: dict) -> ProjectionQualityResult:
        checks = [
            (metrics.get("projection_confidence", 0.0) < self.min_confidence, AlarmCodes.PROJECTION_LOW_CONFIDENCE),
            (metrics.get("projection_mean_error_mm", 999.0) > self.max_mean_error_mm, AlarmCodes.PROJECTION_MEAN_ERROR_HIGH),
            (metrics.get("projection_max_error_mm", 999.0) > self.max_max_error_mm, AlarmCodes.PROJECTION_MAX_ERROR_HIGH),
            (metrics.get("marker_detection_rate", 0.0) < self.min_marker_detection_rate, AlarmCodes.PROJECTION_MARKERS_INSUFFICIENT),
            (metrics.get("reflection_score", 1.0) > self.max_reflection_score, AlarmCodes.PROJECTION_REFLECTION_TOO_HIGH),
        ]
        failed_code = next((code for failed, code in checks if failed), AlarmCodes.OK)
        alarm = make_alarm(failed_code)
        allow = failed_code == AlarmCodes.OK
        return ProjectionQualityResult(
            projection_mean_error_px=float(metrics.get("projection_mean_error_px", 999.0)),
            projection_max_error_px=float(metrics.get("projection_max_error_px", 999.0)),
            projection_mean_error_mm=float(metrics.get("projection_mean_error_mm", 999.0)),
            projection_max_error_mm=float(metrics.get("projection_max_error_mm", 999.0)),
            projection_confidence=float(metrics.get("projection_confidence", 0.0)),
            visible_marker_count=int(metrics.get("visible_marker_count", 0)),
            expected_marker_count=int(metrics.get("expected_marker_count", 0)),
            marker_detection_rate=float(metrics.get("marker_detection_rate", 0.0)),
            line_visibility_score=float(metrics.get("line_visibility_score", 0.0)),
            reflection_score=float(metrics.get("reflection_score", 1.0)),
            projection_alignment_quality="OK" if allow else "FAILED",
            allow_projection=allow,
            allow_punch=allow,
            alarm_code=alarm.alarm_code,
            alarm_message=alarm.alarm_message,
            recommended_action=alarm.recommended_action,
        )
