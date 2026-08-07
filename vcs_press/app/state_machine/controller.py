from __future__ import annotations

from dataclasses import dataclass, field

from loguru import logger

from app.safety.alarm_codes import AlarmCodes, AlarmEvent, AlarmSeverity, make_alarm
from app.safety.safety_checker import SafetyDecision
from app.state_machine.states import STATE_CODES, MachineState
from app.utils.time_utils import utc_now_iso

ALLOWED_TRANSITIONS = {
    MachineState.IDLE: {MachineState.INIT, MachineState.PROJECTOR_INIT, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.INIT: {
        MachineState.SELF_CALIBRATION,
        MachineState.PROJECTOR_INIT,
        MachineState.ALARM,
        MachineState.EMERGENCY_STOP,
    },
    MachineState.SELF_CALIBRATION: {MachineState.CALIBRATION_OK, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.CALIBRATION_OK: {
        MachineState.LOAD_JOB,
        MachineState.WAIT_MATERIAL,
        MachineState.PROJECTOR_INIT,
        MachineState.ALARM,
        MachineState.EMERGENCY_STOP,
    },
    MachineState.LOAD_JOB: {MachineState.WAIT_MATERIAL, MachineState.PROJECTION_RENDER, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.WAIT_MATERIAL: {
        MachineState.ACQUIRE_IMAGE,
        MachineState.PROJECTION_RENDER,
        MachineState.ALARM,
        MachineState.EMERGENCY_STOP,
    },
    MachineState.ACQUIRE_IMAGE: {MachineState.PREPROCESS, MachineState.MATCHING, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.PREPROCESS: {MachineState.MATCHING, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.MATCHING: {MachineState.REGISTRATION, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.REGISTRATION: {MachineState.DEFORMATION_ESTIMATION, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.DEFORMATION_ESTIMATION: {
        MachineState.PROJECTION_RENDER,
        MachineState.PROJECTION_ALIGNMENT,
        MachineState.COMPENSATION_READY,
        MachineState.ALARM,
        MachineState.EMERGENCY_STOP,
    },
    MachineState.COMPENSATION_READY: {MachineState.WAIT_PLC_ACK, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.WAIT_PLC_ACK: {MachineState.PUNCH_ALLOWED, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.PUNCH_ALLOWED: {MachineState.POST_INSPECTION, MachineState.WAIT_MATERIAL, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.POST_INSPECTION: {MachineState.ONLINE_UPDATE, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.ONLINE_UPDATE: {MachineState.WAIT_MATERIAL, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.PROJECTOR_INIT: {MachineState.PROJECTOR_READY, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.PROJECTOR_READY: {
        MachineState.PROJECTOR_CALIBRATION,
        MachineState.PROJECTION_RENDER,
        MachineState.ALARM,
        MachineState.EMERGENCY_STOP,
    },
    MachineState.PROJECTOR_CALIBRATION: {
        MachineState.PROJECTOR_CALIBRATION_OK,
        MachineState.PROJECTION_FAILED,
        MachineState.ALARM,
        MachineState.EMERGENCY_STOP,
    },
    MachineState.PROJECTOR_CALIBRATION_OK: {
        MachineState.PROJECTION_RENDER,
        MachineState.PROJECTION_ALIGNMENT,
        MachineState.ALARM,
        MachineState.EMERGENCY_STOP,
    },
    MachineState.PROJECTION_RENDER: {
        MachineState.PROJECTION_PREVIEW,
        MachineState.PROJECTION_FAILED,
        MachineState.ALARM,
        MachineState.EMERGENCY_STOP,
    },
    MachineState.PROJECTION_PREVIEW: {
        MachineState.PROJECTION_ALIGNMENT,
        MachineState.PROJECTION_FEEDBACK,
        MachineState.ALARM,
        MachineState.EMERGENCY_STOP,
    },
    MachineState.PROJECTION_ALIGNMENT: {
        MachineState.PROJECTION_FEEDBACK,
        MachineState.PROJECTION_OK,
        MachineState.PROJECTION_FAILED,
        MachineState.ALARM,
        MachineState.EMERGENCY_STOP,
    },
    MachineState.PROJECTION_FEEDBACK: {
        MachineState.PROJECTION_OK,
        MachineState.PROJECTION_FAILED,
        MachineState.ALARM,
        MachineState.EMERGENCY_STOP,
    },
    MachineState.PROJECTION_OK: {
        MachineState.COMPENSATION_READY,
        MachineState.WAIT_MATERIAL,
        MachineState.ALARM,
        MachineState.EMERGENCY_STOP,
    },
    MachineState.PROJECTION_FAILED: {MachineState.PROJECTION_RENDER, MachineState.ALARM, MachineState.EMERGENCY_STOP},
    MachineState.ALARM: {MachineState.IDLE, MachineState.INIT, MachineState.EMERGENCY_STOP},
    MachineState.EMERGENCY_STOP: {MachineState.IDLE},
}


@dataclass
class StateMachineController:
    state: MachineState = MachineState.IDLE
    history: list[dict] = field(default_factory=list)
    alarm: dict = field(default_factory=dict)
    _alarm_reset_authorized: bool = False
    _emergency_acknowledged: bool = False

    def transition(self, next_state: MachineState, reason: str = "") -> None:
        if (
            self.state == MachineState.ALARM
            and next_state not in {MachineState.ALARM, MachineState.EMERGENCY_STOP}
            and not self._alarm_reset_authorized
        ):
            raise ValueError("ALARM recovery requires explicit reset_alarm")
        if self.state == MachineState.EMERGENCY_STOP and next_state != MachineState.EMERGENCY_STOP and not self._emergency_acknowledged:
            raise ValueError("EMERGENCY_STOP recovery requires PLC and operator acknowledgement")
        if next_state not in ALLOWED_TRANSITIONS[self.state]:
            raise ValueError(f"invalid transition {self.state} -> {next_state}")
        entry = {"from": self.state.value, "to": next_state.value, "reason": reason, "timestamp": utc_now_iso()}
        logger.info("state transition {} -> {} {}", self.state.value, next_state.value, reason)
        self.history.append(entry)
        self.state = next_state
        self._alarm_reset_authorized = False
        self._emergency_acknowledged = False

    def set_alarm(self, code: str, message: str) -> None:
        self.enter_alarm(make_alarm(code, message))

    def enter_alarm(self, alarm: AlarmEvent) -> None:
        self.alarm = alarm.to_dict()
        target = MachineState.EMERGENCY_STOP if alarm.severity == AlarmSeverity.EMERGENCY else MachineState.ALARM
        if self.state == MachineState.EMERGENCY_STOP and target != MachineState.EMERGENCY_STOP:
            return
        if self.state != target:
            self.transition(target, alarm.alarm_message)

    def apply_safety_decision(self, decision: SafetyDecision) -> None:
        if decision.allow_punch:
            return
        alarm = decision.alarm or make_alarm(decision.alarm_code, decision.alarm_message)
        if alarm.severity in {AlarmSeverity.CRITICAL, AlarmSeverity.EMERGENCY}:
            self.enter_alarm(alarm)

    def reset_alarm(self) -> None:
        if self.state != MachineState.ALARM:
            raise ValueError("reset_alarm is only valid from ALARM")
        self._alarm_reset_authorized = True
        self.alarm = make_alarm(AlarmCodes.MANUAL_RESET_REQUIRED, "alarm reset by explicit operator action").to_dict()
        self.transition(MachineState.IDLE, "alarm reset")

    def acknowledge_emergency_stop(self, plc_confirmed: bool, operator_confirmed: bool) -> None:
        if self.state != MachineState.EMERGENCY_STOP:
            raise ValueError("emergency acknowledgement is only valid from EMERGENCY_STOP")
        if not (plc_confirmed and operator_confirmed):
            raise ValueError("PLC and operator acknowledgement are both required")
        self._emergency_acknowledged = True
        self.alarm = make_alarm(AlarmCodes.MANUAL_RESET_REQUIRED, "emergency stop acknowledged by PLC and operator").to_dict()
        self.transition(MachineState.IDLE, "emergency stop acknowledged")

    def status(self) -> dict:
        return {
            "state": self.state.value,
            "state_code": STATE_CODES[self.state],
            "alarm": self.alarm,
            "history": self.history[-20:],
        }
