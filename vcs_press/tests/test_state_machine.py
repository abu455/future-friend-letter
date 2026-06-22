from app.state_machine.controller import StateMachineController
from app.state_machine.states import MachineState


def test_state_machine_nominal_flow():
    sm = StateMachineController()
    for state in [
        MachineState.INIT,
        MachineState.SELF_CALIBRATION,
        MachineState.CALIBRATION_OK,
        MachineState.WAIT_MATERIAL,
        MachineState.ACQUIRE_IMAGE,
        MachineState.MATCHING,
        MachineState.REGISTRATION,
        MachineState.DEFORMATION_ESTIMATION,
        MachineState.COMPENSATION_READY,
        MachineState.WAIT_PLC_ACK,
        MachineState.PUNCH_ALLOWED,
        MachineState.POST_INSPECTION,
        MachineState.ONLINE_UPDATE,
    ]:
        sm.transition(state, "test")
    assert sm.state == MachineState.ONLINE_UPDATE
    assert sm.status()["state_code"] >= 0


def test_state_machine_rejects_invalid_transition():
    sm = StateMachineController()
    try:
        sm.transition(MachineState.PUNCH_ALLOWED, "invalid")
    except ValueError:
        assert True
    else:
        assert False, "invalid transition should raise"
