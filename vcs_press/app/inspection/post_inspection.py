from __future__ import annotations

import math

import numpy as np

from app.inspection.quality_report import QualityReport
from app.storage.report_writer import ReportWriter


class PostInspectionService:
    def __init__(self, tolerance_mm: float = 0.20):
        self.tolerance_mm = tolerance_mm
        self.report_writer = ReportWriter()
        self.latest_report: dict | None = None
        self.consecutive_ng = 0

    def run(self, job_id: str = "demo_job", theoretical: list[tuple[float, float]] | None = None) -> dict:
        theoretical = theoretical or [(80.0, 80.0), (240.0, 160.0)]
        rng = np.random.default_rng(11)
        errors = [(float(rng.normal(0.03, 0.02)), float(rng.normal(-0.02, 0.02))) for _ in theoretical]
        magnitudes = [math.hypot(x, y) for x, y in errors]
        max_error = float(max(magnitudes))
        mean_error = float(np.mean(magnitudes))
        ng = max_error > self.tolerance_mm
        self.consecutive_ng = self.consecutive_ng + 1 if ng else 0
        report = QualityReport(job_id, errors, max_error, mean_error, ng).to_dict() | {"consecutive_ng": self.consecutive_ng}
        self.latest_report = report
        self.report_writer.write_json("inspection_latest.json", report)
        return report
