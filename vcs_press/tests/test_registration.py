from app.camera.base import CameraConfig
from app.camera.simulated_camera import SimulatedCamera
from app.registration.registration_service import RegistrationService
from app.vision_matching.matching_service import MatchingService


def test_registration_outputs_expected_shift_mm():
    camera = SimulatedCamera(CameraConfig(width=640, height=480))
    camera.open()
    match = MatchingService(camera).register("mock_deep")
    result = RegistrationService(px_to_mm=0.1).compute(match)
    assert result["confidence"] > 0.9
    assert 1.7 < result["dx_mm"] < 1.9
    assert -1.3 < result["dy_mm"] < -1.1
    assert result["residual_error_mm"] < 0.2
