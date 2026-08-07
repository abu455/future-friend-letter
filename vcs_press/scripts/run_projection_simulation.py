from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def main() -> int:
    from app.cad.job_model import demo_job
    from app.camera.base import CameraConfig
    from app.camera.simulated_camera import SimulatedCamera
    from app.deformation.deformation_service import DeformationService
    from app.plc.simulated_plc import SimulatedPLC
    from app.projector.projector_service import ProjectorService
    from app.registration.registration_service import RegistrationService
    from app.safety.safety_checker import SafetyChecker
    from app.servo.servo_service import ServoService
    from app.vision_matching.matching_service import MatchingService

    job = demo_job()
    projector_service = ProjectorService()
    projector_service.connect()
    calibration = projector_service.calibrate()
    pattern = projector_service.render(job)
    preview = projector_service.show_latest_pattern()

    camera = SimulatedCamera(CameraConfig(width=640, height=480))
    camera.open()
    match = MatchingService(camera).register("mock_deep")
    registration = RegistrationService(px_to_mm=0.1).compute(match)
    deformation = DeformationService(px_to_mm=0.1).estimate(match, job)
    feedback = projector_service.feedback_loop(job, registration, deformation)

    plc = SimulatedPLC()
    servo = ServoService(plc, SafetyChecker())
    compensation = servo.compute(
        registration,
        deformation,
        calibrated=True,
        cad_loaded=True,
        projector_status=projector_service.status(),
        projection=feedback,
    )
    plc_result = servo.send_to_plc(compensation)
    output = {
        "projection_calibration_report": calibration,
        "projection_pattern_id": pattern["pattern_id"],
        "initial_projection_preview": preview.get("preview_path"),
        "warped_projection_preview": feedback.get("updated_projector_image"),
        "projection_debug_overlay": feedback.get("debug_image_path"),
        "projection_report": feedback.get("report_path"),
        "final_allow_punch": plc_result["allow_punch"],
        "alarm_code": compensation["alarm_code"],
    }
    Path("data/projection/reports").mkdir(parents=True, exist_ok=True)
    Path("data/projection/reports/projection_simulation_summary.json").write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(json.dumps(output, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
