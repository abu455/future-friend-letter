from __future__ import annotations

from app.plc.base import MachinePosition, PLCBase, PLCStatus, SafetySignals


class SimulatedPLC(PLCBase):
    def __init__(self):
        self.status = PLCStatus(
            connected=True,
            state_code=0,
            position=MachinePosition(),
            safety=SafetySignals(),
        )
        self.allow_punch = False
        self.reference_requested = False

    def read_status(self) -> PLCStatus:
        return self.status

    def write_compensation(self, payload: dict) -> None:
        self.status.last_compensation = dict(payload)
        self.status.last_compensation["allow_punch"] = bool(payload.get("allow_punch", False))
        self.allow_punch = self.status.last_compensation["allow_punch"]

    def write_allow_punch(self, allow: bool) -> None:
        self.allow_punch = bool(allow)
        self.status.last_compensation["allow_punch"] = self.allow_punch

    def write_alarm(self, code: str, message: str) -> None:
        self.status.alarm_code = code
        self.status.alarm_message = message

    def request_reference_punches(self, machine_points: list[tuple[float, float]]) -> None:
        super().request_reference_punches(machine_points)
        self.reference_requested = True
        self.status.position = MachinePosition(x_mm=0.0, y_mm=0.0, feed_mm=0.0)
