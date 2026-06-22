from __future__ import annotations

from dataclasses import dataclass, field

from app.utils.time_utils import utc_now_iso


@dataclass
class QualityReport:
    job_id: str
    measured_errors_mm: list[tuple[float, float]]
    max_error_mm: float
    mean_error_mm: float
    ng: bool
    timestamp: str = field(default_factory=utc_now_iso)

    def to_dict(self) -> dict:
        return self.__dict__
