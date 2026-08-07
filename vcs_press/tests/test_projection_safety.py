from app.plc.base import PLCStatus, SafetySignals
from app.plc.simulated_plc import SimulatedPLC
from app.projector.projector_service import ProjectorService
from app.safety.alarm_codes import AlarmCodes
from app.safety.safety_checker import SafetyChecker
from app.servo.servo_service import ServoService

GOOD_REGISTRATION = {"confidence": 0.9, "inlier_ratio": 0.9, "residual_error_mm": 0.01}
GOOD_COMPENSATION = {"x_offset_mm": 0.0, "y_offset_mm": 0.0, "theta_offset_deg": 0.0, "feed_offset_mm": 0.0}
GOOD_PROJECTION = {
    "projection_alignment_quality": "OK",
    "projection_confidence": 0.9,
    "projection_mean_error_mm": 0.05,
    "projection_max_error_mm": 0.1,
    "marker_detection_rate": 1.0,
    "reflection_score": 0.1,
    "projector_calibration_ok": True,
    "allow_punch": True,
}


def test_projector_disconnect_blocks_punch():
    decision = SafetyChecker().evaluate(
        PLCStatus(),
        GOOD_REGISTRATION,
        GOOD_COMPENSATION,
        projector_status={"projector_connected": False, "projector_alive": False, "projector_ready": False},
        projection=GOOD_PROJECTION,
    )
    assert decision.allow_punch is False
    assert decision.alarm_code == AlarmCodes.PROJECTOR_DISCONNECTED


def test_projection_error_and_confidence_block_punch():
    checker = SafetyChecker()
    low_conf = checker.evaluate(
        PLCStatus(),
        GOOD_REGISTRATION,
        GOOD_COMPENSATION,
        projector_status={"projector_connected": True, "projector_alive": True, "projector_ready": True},
        projection=GOOD_PROJECTION | {"projection_confidence": 0.2},
    )
    high_error = checker.evaluate(
        PLCStatus(),
        GOOD_REGISTRATION,
        GOOD_COMPENSATION,
        projector_status={"projector_connected": True, "projector_alive": True, "projector_ready": True},
        projection=GOOD_PROJECTION | {"projection_mean_error_mm": 1.0},
    )
    assert low_conf.alarm_code == AlarmCodes.PROJECTION_LOW_CONFIDENCE
    assert high_error.alarm_code == AlarmCodes.PROJECTION_MEAN_ERROR_HIGH


def test_previous_allow_true_becomes_false_after_projector_loss():
    service = ProjectorService()
    service.connect()
    service.calibrate()
    report = service.feedback_loop()
    plc = SimulatedPLC()
    servo = ServoService(plc)
    ok = servo.compute(
        GOOD_REGISTRATION,
        {"allow_punch": True, "max_deformation_mm": 0.0},
        calibrated=True,
        cad_loaded=True,
        projector_status=service.status(),
        projection=report,
    )
    servo.send_to_plc(ok)
    assert plc.allow_punch is True

    service.projector.simulate_alive_loss()
    rejected = servo.compute(
        GOOD_REGISTRATION,
        {"allow_punch": True, "max_deformation_mm": 0.0},
        calibrated=True,
        cad_loaded=True,
        projector_status=service.status(),
        projection=report,
    )
    servo.send_to_plc(rejected)
    assert rejected["allow_punch"] is False
    assert rejected["alarm_code"] == AlarmCodes.PROJECTOR_ALIVE_LOST
    assert plc.allow_punch is False


def test_projection_ok_but_plc_safety_fault_blocks_punch():
    status = PLCStatus(safety=SafetySignals(emergency_stop=True))
    decision = SafetyChecker().evaluate(
        status,
        GOOD_REGISTRATION,
        GOOD_COMPENSATION,
        projector_status={"projector_connected": True, "projector_alive": True, "projector_ready": True},
        projection=GOOD_PROJECTION,
    )
    assert decision.allow_punch is False
    assert decision.alarm_code == AlarmCodes.EMERGENCY_STOP
