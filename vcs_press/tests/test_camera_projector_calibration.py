import pytest

from app.projection_mapping.camera_projector_calibration import CameraProjectorCalibrationService


def test_camera_projector_calibration_success():
    report = CameraProjectorCalibrationService().run((1920, 1080))
    assert report["calibration_quality"] == "OK"
    assert report["camera_to_projector"]
    assert report["projector_to_camera"]


def test_camera_projector_calibration_fails_with_insufficient_points():
    service = CameraProjectorCalibrationService()
    with pytest.raises(ValueError):
        service.run_with_points([(0, 0), (1, 0), (0, 1)], [(0, 0), (2, 0), (0, 2)])
