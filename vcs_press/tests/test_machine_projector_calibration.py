from app.projection_mapping.camera_projector_calibration import CameraProjectorCalibrationService
from app.projection_mapping.machine_projector_calibration import MachineProjectorCalibrationService


def test_machine_projector_calibration_success():
    camera_report = CameraProjectorCalibrationService().run()
    report = MachineProjectorCalibrationService().run(camera_report)
    assert report["calibration_quality"] == "OK"
    assert report["machine_to_projector"]
    assert report["projector_to_machine"]
    assert report["camera_projector_calibration_id"] == camera_report["calibration_id"]
