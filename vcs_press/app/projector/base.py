from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np

from app.projector.projector_status import ProjectorStatus


class ProjectorError(RuntimeError):
    pass


class ProjectorBase(ABC):
    @abstractmethod
    def connect(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def disconnect(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def is_connected(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def get_status(self) -> ProjectorStatus:
        raise NotImplementedError

    @abstractmethod
    def set_resolution(self, width: int, height: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_resolution(self) -> tuple[int, int]:
        raise NotImplementedError

    @abstractmethod
    def set_brightness(self, value: float) -> None:
        raise NotImplementedError

    @abstractmethod
    def turn_on(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def turn_off(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def show_image(self, image: np.ndarray, pattern_id: str | None = None) -> str:
        raise NotImplementedError

    @abstractmethod
    def show_pattern(self, pattern: dict) -> str:
        raise NotImplementedError

    @abstractmethod
    def clear(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def heartbeat(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def validate_ready(self) -> bool:
        raise NotImplementedError
