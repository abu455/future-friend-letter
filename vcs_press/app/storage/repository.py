from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from app.utils.time_utils import utc_now_iso


@dataclass
class ProductionRecord:
    job_id: str
    event: str
    payload: dict
    timestamp: str = field(default_factory=utc_now_iso)


class InMemoryRepository:
    def __init__(self, root: str = "data"):
        self.root = Path(root)
        self.records: list[ProductionRecord] = []
        for child in ["samples", "jobs", "calibration", "reports", "logs"]:
            (self.root / child).mkdir(parents=True, exist_ok=True)

    def add_record(self, job_id: str, event: str, payload: dict) -> ProductionRecord:
        record = ProductionRecord(job_id=job_id, event=event, payload=payload)
        self.records.append(record)
        return record

    def recent(self, limit: int = 50) -> list[dict]:
        return [record.__dict__ for record in self.records[-limit:]]
