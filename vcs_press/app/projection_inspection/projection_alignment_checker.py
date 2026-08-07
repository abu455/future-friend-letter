from __future__ import annotations

from app.projection_mapping.projection_quality import ProjectionQualityChecker


class ProjectionAlignmentChecker:
    def __init__(self):
        self.quality = ProjectionQualityChecker()

    def check(self, detector_result: dict, error_result: dict) -> dict:
        metrics = detector_result | error_result
        return self.quality.evaluate(metrics).to_dict()
