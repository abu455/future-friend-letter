from __future__ import annotations

from app.plc.base import PLCBase, PLCStatus


class SiemensS7PLCStub(PLCBase):
    def __init__(self, ip: str = "192.168.0.10", rack: int = 0, slot: int = 1):
        self.ip = ip
        self.rack = rack
        self.slot = slot

    def read_status(self) -> PLCStatus:
        raise NotImplementedError("install snap7 and map DB blocks before enabling Siemens S7 mode")

    def write_compensation(self, payload: dict) -> None:
        raise NotImplementedError("install snap7 and map DB blocks before enabling Siemens S7 mode")

    def write_allow_punch(self, allow: bool) -> None:
        raise NotImplementedError("install snap7 and map DB blocks before enabling Siemens S7 mode")

    def write_alarm(self, code: str, message: str) -> None:
        raise NotImplementedError("install snap7 and map DB blocks before enabling Siemens S7 mode")
