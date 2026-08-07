from app.cad.job_model import demo_job
from app.projection_mapping.projection_feedback import ProjectionFeedbackLoop
from app.projector.projector_service import ProjectorService


def test_projection_feedback_loop_converges_in_simulation():
    service = ProjectorService()
    service.connect()
    service.calibrate()
    pattern = service.render(demo_job())
    report = service.feedback_loop(
        demo_job(),
        {"dx_mm": 1.0, "dy_mm": -0.5, "dtheta_deg": 0.0, "confidence": 0.9},
        {"allow_punch": True, "max_deformation_mm": 0.1, "local_offsets": []},
    )
    assert pattern["job_id"] == "demo_job"
    assert report["allow_projection"] is True
    assert report["allow_punch"] is True
    assert report["projection_alignment_quality"] == "OK"
    assert report["report_path"].endswith("projection_report.json")


def test_projection_feedback_loop_rejects_after_max_iterations():
    service = ProjectorService()
    service.connect()
    service.calibrate()
    service.render(demo_job())
    service.feedback = ProjectionFeedbackLoop(max_iterations=1, convergence_threshold_mm=0.001)
    report = service.feedback_loop(
        demo_job(),
        {"dx_mm": 5.0, "dy_mm": 5.0, "dtheta_deg": 0.0, "confidence": 0.9},
        {"allow_punch": True, "max_deformation_mm": 0.1, "local_offsets": []},
    )
    assert report["allow_punch"] is False
    assert report["alarm_code"] == "PROJECTION_ITERATIONS_EXCEEDED"


def test_projection_feedback_rejects_job_pattern_mismatch():
    service = ProjectorService()
    service.connect()
    service.calibrate()
    service.render(demo_job())
    other_job = demo_job()
    other_job.job_id = "different_job"
    report = service.feedback_loop(
        other_job,
        {"dx_mm": 0.1, "dy_mm": 0.1, "dtheta_deg": 0.0, "confidence": 0.9},
        {"allow_punch": True, "max_deformation_mm": 0.1, "local_offsets": []},
    )
    assert report["allow_punch"] is False
    assert report["alarm_code"] == "PROJECTION_JOB_MISMATCH"
