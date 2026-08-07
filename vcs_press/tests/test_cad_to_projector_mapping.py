import numpy as np

from app.cad.job_model import demo_job
from app.projection_mapping.cad_to_projector import CADToProjectorMapper


def test_cad_coordinates_map_to_projector_pixels():
    job = demo_job()
    matrix = np.array([[2.0, 0.0, 100.0], [0.0, 2.0, 50.0], [0.0, 0.0, 1.0]]).tolist()
    mapped = CADToProjectorMapper().map_job(job, matrix)
    assert mapped["projected_cut_paths"][0][0] == (100.0, 50.0)
    assert mapped["projected_holes"][0] == (260.0, 210.0)
