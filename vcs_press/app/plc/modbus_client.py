from __future__ import annotations

from app.plc.base import PLCBase, PLCStatus


class ModbusPLCClient(PLCBase):
    def __init__(self, host: str, port: int = 502):
        self.host = host
        self.port = port

    def read_status(self) -> PLCStatus:
        raise NotImplementedError("Modbus register mapping must be configured per machine")

    def write_compensation(self, payload: dict) -> None:
        raise NotImplementedError("Modbus register mapping must be configured per machine")

    def write_allow_punch(self, allow: bool) -> None:
        raise NotImplementedError("Modbus register mapping must be configured per machine")

    def write_alarm(self, code: str, message: str) -> None:
        raise NotImplementedError("Modbus register mapping must be configured per machine")
