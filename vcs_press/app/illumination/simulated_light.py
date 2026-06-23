from __future__ import annotations

from app.illumination.base import LightConfig, LightControllerBase


class SimulatedLightController(LightControllerBase):
    def __init__(self, config: LightConfig | None = None):
        super().__init__(config)
        self.trigger_log: list[str] = []

    def turn_on(self) -> None:
        super().turn_on()
        self.trigger_log.append("on")

    def turn_off(self) -> None:
        super().turn_off()
        self.trigger_log.append("off")
