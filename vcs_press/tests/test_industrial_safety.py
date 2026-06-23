import pytest

from app.plc.base import PLCStatus, SafetySignals
from app.safety.alarm_codes import AlarmCodes
from app.safety.safety_checker import SafetyChecker

GOOD_REGISTRATION = {"confidence": 0.9, "inlier_ratio": 0.9, "residual_error_mm": 0.01}
GOOD_COMPENSATION = {"x_offset_mm": 0.1, "y_offset_mm": 0.1, "theta_offset_deg": 0.0, "feed_offset_mm": 0.0}
GOOD_DEFORMATION = {"allow_punch": True, "max_deformation_mm": 0.1, "local_offsets": []}


def evaluate(status: PLCStatus | None = None, **kwargs):
    return SafetyChecker().evaluate(
        status or PLCStatus(),
        registration=kwargs.pop("registration", GOOD_REGISTRATION),
        compensation=kwargs.pop("compensation", GOOD_COMPENSATION),
        deformation=kwargs.pop("deformation", GOOD_DEFORMATION),
        **kwargs,
    )


@pytest.mark.parametrize(
    ("status", "expected_code"),
    [
        (PLCStatus(safety=SafetySignals(emergency_stop=True)), AlarmCodes.EMERGENCY_STOP),
        (PLCStatus(safety=SafetySignals(safety_door_closed=False)), AlarmCodes.SAFETY_DOOR),
        (PLCStatus(safety=SafetySignals(safety_door_open=True)), AlarmCodes.SAFETY_DOOR),
        (PLCStatus(safety=SafetySignals(light_curtain_ok=False)), AlarmCodes.LIGHT_CURTAIN),
        (PLCStatus(safety=SafetySignals(air_pressure_ok=False)), AlarmCodes.AIR_PRESSURE),
        (PLCStatus(connected=False), AlarmCodes.PLC_DISCONNECTED),
        (PLCStatus(plc_alive=False), AlarmCodes.PLC_ALIVE_LOST),
        (PLCStatus(safety=SafetySignals(plc_ok=False)), AlarmCodes.PLC_FAULT),
    ],
)
def test_plc_and_safety_signal_faults_block_punch(status, expected_code):
    decision = evaluate(status)
    assert decision.allow_punch is False
    assert decision.alarm_code == expected_code


@pytest.mark.parametrize(
    ("kwargs", "expected_code"),
    [
        ({"camera_connected": False}, AlarmCodes.CAMERA_OFFLINE),
        ({"light_ready": False}, AlarmCodes.LIGHT_FAULT),
        ({"calibration_ok": False}, AlarmCodes.CALIBRATION_REQUIRED),
        ({"job_loaded": False}, AlarmCodes.CAD_NOT_LOADED),
        ({"registration": {"confidence": 0.1, "inlier_ratio": 0.9, "residual_error_mm": 0.01}}, AlarmCodes.MATCH_LOW_CONFIDENCE),
        ({"registration": {"confidence": 0.9, "inlier_ratio": 0.1, "residual_error_mm": 0.01}}, AlarmCodes.MATCH_LOW_INLIER),
        ({"registration": {"confidence": 0.9, "inlier_ratio": 0.9, "residual_error_mm": 0.5}}, AlarmCodes.RESIDUAL_TOO_HIGH),
        (
            {"compensation": {"x_offset_mm": 6.0, "y_offset_mm": 0.0, "theta_offset_deg": 0.0, "feed_offset_mm": 0.0}},
            AlarmCodes.COMPENSATION_LIMIT,
        ),
        (
            {"compensation": {"x_offset_mm": 0.0, "y_offset_mm": 6.0, "theta_offset_deg": 0.0, "feed_offset_mm": 0.0}},
            AlarmCodes.COMPENSATION_LIMIT,
        ),
        (
            {"compensation": {"x_offset_mm": 0.0, "y_offset_mm": 0.0, "theta_offset_deg": 0.0, "feed_offset_mm": 11.0}},
            AlarmCodes.COMPENSATION_LIMIT,
        ),
        (
            {"compensation": {"x_offset_mm": 0.0, "y_offset_mm": 0.0, "theta_offset_deg": 3.0, "feed_offset_mm": 0.0}},
            AlarmCodes.COMPENSATION_LIMIT,
        ),
        ({"deformation": {"allow_punch": True, "max_deformation_mm": 2.0}}, AlarmCodes.DEFORMATION_LIMIT),
        ({"deformation": {"allow_punch": False, "reject_reason": "material curl exceeds limit"}}, AlarmCodes.DEFORMATION_LIMIT),
        ({"consecutive_ng": 3}, AlarmCodes.CONSECUTIVE_NG),
    ],
)
def test_vision_and_process_faults_block_punch(kwargs, expected_code):
    decision = evaluate(**kwargs)
    assert decision.allow_punch is False
    assert decision.alarm_code == expected_code


def test_nominal_industrial_safety_allows_punch_recommendation():
    decision = evaluate(calibration_ok=True, job_loaded=True, camera_connected=True, light_ready=True)
    assert decision.allow_punch is True
    assert decision.alarm_code == AlarmCodes.OK
