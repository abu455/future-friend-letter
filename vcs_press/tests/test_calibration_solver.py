import numpy as np

from app.calibration.solver import CalibrationSolver


def test_affine_calibration_solver_reports_ok_quality():
    image_points = [(120, 100), (520, 100), (120, 380), (520, 380)]
    machine_points = [(0, 0), (100, 0), (0, 70), (100, 70)]
    report = CalibrationSolver().solve(image_points, machine_points, mode="affine")
    assert report.calibration_quality == "OK"
    assert np.isclose(report.mean_error_mm, 0.0)
    assert len(report.transform_matrix) == 3


def test_similarity_calibration_solver_supported():
    image_points = [(0, 0), (10, 0), (0, 10), (10, 10)]
    machine_points = [(5, 2), (25, 2), (5, 22), (25, 22)]
    report = CalibrationSolver().solve(image_points, machine_points, mode="similarity")
    assert report.calibration_quality == "OK"
    assert report.inlier_ratio == 1.0
