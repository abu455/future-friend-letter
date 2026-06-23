from __future__ import annotations

import json
from pathlib import Path

from app.utils.time_utils import utc_now_iso


class ReportWriter:
    def __init__(self, root: str = "data/reports"):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def write_json(self, name: str, payload: dict) -> str:
        path = self.root / name
        data = payload | {"written_at": utc_now_iso()}
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
        return str(path)

    def latest(self) -> dict:
        files = sorted(self.root.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not files:
            return {}
        return json.loads(files[0].read_text(encoding="utf-8"))
