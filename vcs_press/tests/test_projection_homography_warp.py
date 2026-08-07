import numpy as np

from app.projection_mapping.homography_warp import HomographyWarp


def test_homography_warp_offsets_points():
    warp = HomographyWarp()
    matrix = warp.offset_homography(12.0, -8.0)
    points = warp.warp_points([(10.0, 10.0)], matrix)
    assert points[0] == (22.0, 2.0)


def test_homography_warp_image_keeps_resolution():
    image = np.zeros((20, 30, 3), dtype=np.uint8)
    warped = HomographyWarp().warp_image(image, np.eye(3).tolist(), (60, 40))
    assert warped.shape == (40, 60, 3)
