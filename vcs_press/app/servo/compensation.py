from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class CompensationResult:
    x_offset_mm: float
    y_offset_mm: float
    theta_offset_deg: float
    feed_offset_mm: float = 0.0
    local_offsets: list[dict] = field(default_factory=list)
    confidence: float = 0.0
    allow_punch: bool = False
    reject_reason: str = ""
    alarm_code: str = "OK"
    alarm_message: str = ""
    severity: str = "INFO"
    recommended_action: str = ""
    timestamp: str = ""

    def to_dict(self) -> dict:
        return self.__dict__


class CompensationLimiter:
    def __init__(self, max_step_mm: float = 5.0, max_theta_deg: float = 2.0):
        self.max_step_mm = max_step_mm
        self.max_theta_deg = max_theta_deg

    def clamp(self, x_mm: float, y_mm: float, theta_deg: float) -> tuple[float, float, float]:
        x = max(-self.max_step_mm, min(self.max_step_mm, x_mm))
        y = max(-self.max_step_mm, min(self.max_step_mm, y_mm))
        theta = max(-self.max_theta_deg, min(self.max_theta_deg, theta_deg))
        return float(x), float(y), float(theta)
