from app.calibration.hole_detector import HoleDetector
from app.utils.image_io import synthetic_hole_image


def test_hole_detector_finds_reference_centers():
    points = [(120, 100), (520, 100), (120, 380), (520, 380)]
    image = synthetic_hole_image(points)
    result = HoleDetector().detect(image, expected_count=4)
    assert len(result.centers) == 4
    for detected, expected in zip(result.centers, points, strict=False):
        assert abs(detected[0] - expected[0]) < 1.0
        assert abs(detected[1] - expected[1]) < 1.0
