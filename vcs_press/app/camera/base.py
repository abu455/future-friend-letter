from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import numpy as np

from app.utils.time_utils import utc_now_iso


@dataclass
class CameraConfig:
    camera_id: str = "simulated"
    exposure_us: float = 5000.0
    gain: float = 1.0
    fps: float = 10.0
    width: int = 640
    height: int = 480
    mode: str = "simulated"
    extra: dict = field(default_factory=dict)


@dataclass
class Frame:
    image: np.ndarray
    timestamp: str = field(default_factory=utc_now_iso)
    camera_id: str = "simulated"
    metadata: dict = field(default_factory=dict)


class CameraError(RuntimeError):
    pass


class CameraBase(ABC):
    def __init__(self, config: CameraConfig | None = None):
        self.config = config or CameraConfig()
        self.online = False

    def open(self) -> None:
        self.online = True

    def close(self) -> None:
        self.online = False

    def configure(self, **kwargs) -> None:
        for key, value in kwargs.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
            else:
                self.config.extra[key] = value

    @abstractmethod
    def soft_trigger(self) -> Frame:
        raise NotImplementedError

    def hard_trigger_arm(self) -> None:
        raise NotImplementedError("hardware trigger is reserved for industrial camera SDKs")
