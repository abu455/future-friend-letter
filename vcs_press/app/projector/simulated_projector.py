from __future__ import annotations

import time
from pathlib import Path

import cv2
import numpy as np

from app.projector.base import ProjectorBase, ProjectorError
from app.projector.projector_status import ProjectorStatus
from app.utils.time_utils import utc_now_iso


class SimulatedProjector(ProjectorBase):
    def __init__(
        self, name: str = "VCS-Projector-Prototype", width: int = 1920, height: int = 1080, preview_dir: str = "data/projection/previews"
    ):
        self.name = name
        self.status = ProjectorStatus(width=width, height=height)
        self.preview_dir = Path(preview_dir)
        self.preview_dir.mkdir(parents=True, exist_ok=True)
        self.current_image: np.ndarray | None = None
        self.simulated_delay_ms = 0
        self.simulated_offset_px = (0.0, 0.0)
        self.force_alive_loss = False
        self.force_brightness_fault = False

    def connect(self) -> None:
        self.status.projector_connected = True
        self.status.projector_alive = True
        self.status.projector_ready = True
        self.status.error_code = "OK"
        self.status.error_message = ""
        self.status.mark_updated()

    def disconnect(self) -> None:
        self.status.projector_connected = False
        self.status.projector_alive = False
        self.status.projector_ready = False
        self.status.projector_on = False
        self.status.current_pattern_id = ""
        self.status.error_code = "PROJECTOR_DISCONNECTED"
        self.status.error_message = "simulated projector disconnected"
        self.status.mark_updated()

    def is_connected(self) -> bool:
        return self.status.projector_connected

    def get_status(self) -> ProjectorStatus:
        if self.force_alive_loss:
            self.status.projector_alive = False
            self.status.projector_ready = False
            self.status.error_code = "PROJECTOR_ALIVE_LOST"
            self.status.error_message = "simulated heartbeat lost"
        if self.force_brightness_fault:
            self.status.projector_ready = False
            self.status.error_code = "PROJECTOR_BRIGHTNESS_ABNORMAL"
            self.status.error_message = "simulated brightness fault"
        return self.status

    def set_resolution(self, width: int, height: int) -> None:
        self.status.width = int(width)
        self.status.height = int(height)
        self.status.mark_updated()

    def get_resolution(self) -> tuple[int, int]:
        return self.status.width, self.status.height

    def set_brightness(self, value: float) -> None:
        if not 0.0 <= value <= 1.0:
            self.force_brightness_fault = True
            raise ProjectorError("brightness must be in [0, 1]")
        self.status.brightness = float(value)
        self.force_brightness_fault = False
        self.status.mark_updated()

    def turn_on(self) -> None:
        self._require_ready()
        self.status.projector_on = True
        self.status.mark_updated()

    def turn_off(self) -> None:
        self.status.projector_on = False
        self.status.mark_updated()

    def show_image(self, image: np.ndarray, pattern_id: str | None = None) -> str:
        self._require_ready()
        if self.simulated_delay_ms > 0:
            time.sleep(self.simulated_delay_ms / 1000.0)
        resized = cv2.resize(image, self.get_resolution())
        if self.simulated_offset_px != (0.0, 0.0):
            matrix = np.array([[1.0, 0.0, self.simulated_offset_px[0]], [0.0, 1.0, self.simulated_offset_px[1]]], dtype=np.float32)
            resized = cv2.warpAffine(resized, matrix, self.get_resolution())
        self.current_image = resized
        self.status.current_pattern_id = pattern_id or f"pattern_{int(time.time() * 1000)}"
        self.status.projector_on = True
        self.status.mark_updated()
        path = self.preview_dir / f"{self.status.current_pattern_id}.png"
        cv2.imwrite(str(path), resized)
        return str(path)

    def show_pattern(self, pattern: dict) -> str:
        image = pattern.get("image")
        if image is None:
            raise ProjectorError("pattern image is required")
        return self.show_image(image, pattern.get("pattern_id"))

    def clear(self) -> None:
        self.current_image = np.zeros((self.status.height, self.status.width, 3), dtype=np.uint8)
        self.status.current_pattern_id = ""
        self.status.mark_updated()
        cv2.imwrite(str(self.preview_dir / "clear.png"), self.current_image)

    def heartbeat(self) -> bool:
        return self.get_status().projector_connected and self.get_status().projector_alive

    def validate_ready(self) -> bool:
        status = self.get_status()
        return status.projector_connected and status.projector_alive and status.projector_ready

    def simulate_disconnect(self) -> None:
        self.disconnect()

    def simulate_alive_loss(self) -> None:
        self.force_alive_loss = True

    def simulate_brightness_fault(self) -> None:
        self.force_brightness_fault = True

    def _require_ready(self) -> None:
        if not self.validate_ready():
            raise ProjectorError(self.status.error_message or "projector is not ready")
        self.status.last_update_timestamp = utc_now_iso()
