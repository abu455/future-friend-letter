from app.plc.base import PLCStatus, SafetySignals
from app.safety.safety_checker import SafetyChecker


def test_safety_checker_blocks_emergency_stop():
    status = PLCStatus(safety=SafetySignals(emergency_stop=True))
    decision = SafetyChecker().evaluate(
        status,
        registration={"confidence": 0.9, "inlier_ratio": 0.9, "residual_error_mm": 0.01},
        compensation={"x_offset_mm": 0, "y_offset_mm": 0, "theta_offset_deg": 0, "feed_offset_mm": 0},
    )
    assert decision.allow_punch is False
    assert decision.alarm_code == "E_STOP"


def test_safety_checker_blocks_compensation_limit():
    status = PLCStatus()
    decision = SafetyChecker().evaluate(
        status,
        registration={"confidence": 0.9, "inlier_ratio": 0.9, "residual_error_mm": 0.01},
        compensation={"x_offset_mm": 9, "y_offset_mm": 0, "theta_offset_deg": 0, "feed_offset_mm": 0},
    )
    assert decision.allow_punch is False
    assert decision.alarm_code == "COMPENSATION_LIMIT"
