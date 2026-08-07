from __future__ import annotations

from app.projector.base import ProjectorBase, ProjectorError
from app.projector.simulated_projector import SimulatedProjector


class ProjectorFactory:
    @staticmethod
    def create(mode: str = "simulated", **kwargs) -> ProjectorBase:
        if mode == "simulated":
            return SimulatedProjector(**kwargs)
        raise ProjectorError(f"projector mode '{mode}' is reserved for a real hardware adapter")
