import pytest

from app.plc.simulated_plc import SimulatedPLC
from app.safety.alarm_codes import AlarmCodes
from app.safety.safety_checker import SafetyChecker
from app.servo.servo_service import ServoService

GOOD_REGISTRATION = {"dx_mm": 0.1, "dy_mm": 0.1, "dtheta_deg": 0.0, "confidence": 0.9, "inlier_ratio": 0.9, "residual_error_mm": 0.01}
GOOD_COMPENSATION = {"x_offset_mm": 0.0, "y_offset_mm": 0.0, "theta_offset_deg": 0.0, "feed_offset_mm": 0.0}


@pytest.mark.parametrize(
    ("timeout_flag", "expected_code"),
    [
        ("camera_acquire_timeout", AlarmCodes.CAMERA_ACQUIRE_TIMEOUT),
        ("vision_cycle_timeout", AlarmCodes.VISION_CYCLE_TIMEOUT),
        ("plc_ack_timeout", AlarmCodes.PLC_ACK_TIMEOUT),
        ("light_ready_timeout", AlarmCodes.LIGHT_READY_TIMEOUT),
        ("post_inspection_timeout", AlarmCodes.POST_INSPECTION_TIMEOUT),
    ],
)
def test_timeout_flags_block_punch(timeout_flag, expected_code):
    decision = SafetyChecker().evaluate(
        SimulatedPLC().read_status(),
        registration=GOOD_REGISTRATION,
        compensation=GOOD_COMPENSATION,
        deformation={"allow_punch": True, "max_deformation_mm": 0.0},
        **{timeout_flag: True},
    )
    assert decision.allow_punch is False
    assert decision.alarm_code == expected_code


def test_servo_compute_timeout_fails_closed_and_plc_write_clears_allow():
    plc = SimulatedPLC()
    servo = ServoService(plc)
    ok = servo.compute(GOOD_REGISTRATION, {"allow_punch": True, "max_deformation_mm": 0.0}, calibrated=True, cad_loaded=True)
    assert ok["allow_punch"] is True
    servo.send_to_plc(ok)
    assert plc.allow_punch is True

    rejected = servo.compute(
        GOOD_REGISTRATION,
        {"allow_punch": True, "max_deformation_mm": 0.0},
        calibrated=True,
        cad_loaded=True,
        plc_ack_timeout=True,
    )
    assert rejected["allow_punch"] is False
    assert rejected["alarm_code"] == AlarmCodes.PLC_ACK_TIMEOUT
    servo.send_to_plc(rejected)
    assert plc.allow_punch is False
