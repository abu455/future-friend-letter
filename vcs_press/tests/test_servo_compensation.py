from app.plc.simulated_plc import SimulatedPLC
from app.servo.servo_service import ServoService


def test_servo_allows_high_quality_compensation():
    plc = SimulatedPLC()
    servo = ServoService(plc)
    registration = {"dx_mm": 1.0, "dy_mm": -0.5, "dtheta_deg": 0.1, "confidence": 0.9, "inlier_ratio": 0.8, "residual_error_mm": 0.05}
    result = servo.compute(registration, {"allow_punch": True, "local_offsets": []}, calibrated=True, cad_loaded=True)
    assert result["allow_punch"] is True
    assert result["x_offset_mm"] == -1.0


def test_servo_rejects_low_confidence():
    plc = SimulatedPLC()
    servo = ServoService(plc)
    registration = {"dx_mm": 0.1, "dy_mm": 0.1, "dtheta_deg": 0.0, "confidence": 0.2, "inlier_ratio": 0.9, "residual_error_mm": 0.01}
    result = servo.compute(registration, {"allow_punch": True, "local_offsets": []}, calibrated=True, cad_loaded=True)
    assert result["allow_punch"] is False
    assert result["alarm_code"] == "MATCH_LOW_CONFIDENCE"
