import pytest

from app.safety.alarm_codes import AlarmCodes, AlarmSeverity, make_alarm
from app.safety.safety_checker import SafetyDecision
from app.state_machine.controller import StateMachineController
from app.state_machine.states import MachineState


def test_critical_safety_decision_enters_alarm_and_requires_reset():
    sm = StateMachineController()
    decision = SafetyDecision.from_alarm(AlarmCodes.PLC_DISCONNECTED)
    sm.apply_safety_decision(decision)

    assert sm.state == MachineState.ALARM
    assert sm.alarm["severity"] == AlarmSeverity.CRITICAL.value
    with pytest.raises(ValueError):
        sm.transition(MachineState.IDLE, "unsafe auto recovery")

    sm.reset_alarm()
    assert sm.state == MachineState.IDLE


def test_emergency_stop_requires_plc_and_operator_acknowledgement():
    sm = StateMachineController()
    sm.enter_alarm(make_alarm(AlarmCodes.EMERGENCY_STOP))

    assert sm.state == MachineState.EMERGENCY_STOP
    with pytest.raises(ValueError):
        sm.transition(MachineState.IDLE, "unsafe emergency recovery")
    with pytest.raises(ValueError):
        sm.acknowledge_emergency_stop(plc_confirmed=True, operator_confirmed=False)

    sm.acknowledge_emergency_stop(plc_confirmed=True, operator_confirmed=True)
    assert sm.state == MachineState.IDLE
