from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class SafetySignals:
    emergency_stop: bool = False
    safety_door_closed: bool = True
    safety_door_open: bool = False
    light_curtain_ok: bool = True
    air_pressure_ok: bool = True
    punch_top_dead_center: bool = True
    punch_bottom_dead_center: bool = False
    plc_ok: bool = True


@dataclass
class MachinePosition:
    x_mm: float = 0.0
    y_mm: float = 0.0
    feed_mm: float = 0.0


@dataclass
class PLCStatus:
    connected: bool = True
    plc_alive: bool = True
    state_code: int = 0
    position: MachinePosition = field(default_factory=MachinePosition)
    safety: SafetySignals = field(default_factory=SafetySignals)
    last_compensation: dict = field(default_factory=dict)
    alarm_code: str = "OK"
    alarm_message: str = ""


class PLCBase(ABC):
    @abstractmethod
    def read_status(self) -> PLCStatus:
        raise NotImplementedError

    @abstractmethod
    def write_compensation(self, payload: dict) -> None:
        raise NotImplementedError

    @abstractmethod
    def write_allow_punch(self, allow: bool) -> None:
        raise NotImplementedError

    @abstractmethod
    def write_alarm(self, code: str, message: str) -> None:
        raise NotImplementedError

    def request_reference_punches(self, machine_points: list[tuple[float, float]]) -> None:
        # Reserved handshake: PLC owns motion and punch actuation.
        self.write_allow_punch(False)
