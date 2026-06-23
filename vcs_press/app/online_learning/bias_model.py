from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class BiasModel:
    x_bias_mm: float = 0.0
    y_bias_mm: float = 0.0
    samples: list[tuple[float, float]] = field(default_factory=list)

    def to_dict(self) -> dict:
        return self.__dict__

    def save(self, path: str = "data/reports/compensation_model.json") -> str:
        out = Path(path)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(self.to_dict(), indent=2), encoding="utf-8")
        return str(out)
