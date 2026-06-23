from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class LightConfig:
    ring: int = 60
    coaxial: int = 0
    bar: int = 0
    polarized: bool = False
    channels: dict = field(default_factory=dict)


class LightControllerBase:
    def __init__(self, config: LightConfig | None = None):
        self.config = config or LightConfig()
        self.online = True
        self.enabled = False

    def turn_on(self) -> None:
        if not self.online:
            raise RuntimeError("light controller is offline")
        self.enabled = True

    def turn_off(self) -> None:
        self.enabled = False

    def set_brightness(self, channel: str, value: int) -> None:
        self.config.channels[channel] = max(0, min(100, int(value)))
