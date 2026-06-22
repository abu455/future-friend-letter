from __future__ import annotations

from dataclasses import dataclass, field

from loguru import logger

from app.state_machine.states import MachineState, STATE_CODES
from app.utils.time_utils import utc_now_iso


ALLOWED_TRANSITIONS = {
    MachineState.IDLE: {MachineState.INIT, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.INIT: {MachineState.SELF_CALIBRATION, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.SELF_CALIBRATION: {MachineState.CALIBRATION_OK, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.CALIBRATION_OK: {MachineState.LOAD_JOB, MachineState.WAIT_MATERIAL, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.LOAD_JOB: {MachineState.WAIT_MATERIAL, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.WAIT_MATERIAL: {MachineState.ACQUIRE_IMAGE, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.ACQUIRE_IMAGE: {MachineState.PREPROCESS, MachineState.MATCHING, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.PREPROCESS: {MachineState.MATCHING, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.MATCHING: {MachineState.REGISTRATION, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.REGISTRATION: {MachineState.DEFORMATION_ESTIMATION, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.DEFORMATION_ESTIMATION: {MachineState.COMPENSATION_READY, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.COMPENSATION_READY: {MachineState.WAIT_PLC_ACK, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.WAIT_PLC_ACK: {MachineState.PUNCH_ALLOWED, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.PUNCH_ALLOWED: {MachineState.POST_INSPECTION, MachineState.WAIT_MATERIAL, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.POST_INSPECTION: {MachineState.ONLINE_UPDATE, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.ONLINE_UPDATE: {MachineState.WAIT_MATERIAL, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.ALARM: {MachineState.IDLE, MachineState.INIT, MachineState.EMERGENCY_STOP},
    MachineState.EMERGENCY_STOP: {MachineState.IDLE},
}


@dataclass
class StateMachineController:
    state: MachineState = MachineState.IDLE
    history: list[dict] = field(default_factory=list)
    alarm: dict = field(default_factory=dict)

    def transition(self, next_state: MachineState, reason: str = "") -> None:
        if next_state not in ALLOWED_TRANSITIONS[self.state]:
            raise ValueError(f"invalid transition {self.state} -> {next_state}")
        entry = {"from": self.state.value, "to": next_state.value, "reason": reason, "timestamp": utc_now_iso()}
        logger.info("state transition {} -> {} {}", self.state.value, next_state.value, reason)
        self.history.append(entry)
        self.state = next_state

    def set_alarm(self, code: str, message: str) -> None:
        self.alarm = {"code": code, "message": message, "timestamp": utc_now_iso()}
        if self.state != MachineState.ALARM:
            self.transition(MachineState.ALARM, message)

    def status(self) -> dict:
        return {
            "state": self.state.value,
            "state_code": STATE_CODES[self.state],
            "alarm": self.alarm,
            "history": self.history[-20:],
        }
