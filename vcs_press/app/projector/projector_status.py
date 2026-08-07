from __future__ import annotations

from dataclasses import dataclass

from app.utils.time_utils import utc_now_iso


@dataclass
class ProjectorStatus:
    projector_connected: bool = False
    projector_alive: bool = False
    projector_ready: bool = False
    projector_on: bool = False
    width: int = 1920
    height: int = 1080
    brightness: float = 0.8
    current_pattern_id: str = ""
    last_update_timestamp: str = ""
    error_code: str = "OK"
    error_message: str = ""

    def mark_updated(self) -> None:
        self.last_update_timestamp = utc_now_iso()

    def to_dict(self) -> dict:
        return self.__dict__
