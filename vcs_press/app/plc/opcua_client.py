from __future__ import annotations

from app.plc.base import PLCBase, PLCStatus


class OpcUaPLCClient(PLCBase):
    def __init__(self, endpoint: str):
        self.endpoint = endpoint

    def read_status(self) -> PLCStatus:
        raise NotImplementedError("OPC UA node ids must be configured per machine")

    def write_compensation(self, payload: dict) -> None:
        raise NotImplementedError("OPC UA node ids must be configured per machine")

    def write_allow_punch(self, allow: bool) -> None:
        raise NotImplementedError("OPC UA node ids must be configured per machine")

    def write_alarm(self, code: str, message: str) -> None:
        raise NotImplementedError("OPC UA node ids must be configured per machine")
