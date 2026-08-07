import numpy as np

from app.projection_mapping.mesh_warp import MeshWarp


def test_mesh_warp_outputs_local_projection_offsets():
    deformation = {
        "allow_punch": True,
        "max_deformation_mm": 0.1,
        "local_offsets": [{"region_id": "part_001", "x_offset_mm": 0.05, "y_offset_mm": -0.03, "deformation_score": 0.06}],
    }
    result = MeshWarp(px_per_mm=10.0).build_offsets(deformation)
    assert result["allow_projection"] is True
    assert result["local_projection_offsets"][0]["projector_x_offset_px"] == 0.5
    assert result["local_projection_offsets"][0]["projector_y_offset_px"] == -0.3


def test_mesh_warp_blocks_excessive_local_deformation():
    result = MeshWarp(max_local_mm=1.0).build_offsets({"allow_punch": True, "max_deformation_mm": 2.0, "local_offsets": []})
    assert result["allow_projection"] is False
    assert result["alarm_code"] == "PROJECTION_LOCAL_DEFORMATION_TOO_LARGE"


def test_mesh_warp_image_runs():
    image = np.zeros((100, 100, 3), dtype=np.uint8)
    warped = MeshWarp().warp_image(image, {"local_offsets": [{"x_offset_mm": 0.1, "y_offset_mm": 0.0}]})
    assert warped.shape == image.shape
