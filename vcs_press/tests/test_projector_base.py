from app.projector.base import ProjectorBase
from app.projector.simulated_projector import SimulatedProjector


def test_simulated_projector_implements_base_contract():
    projector = SimulatedProjector(width=800, height=600)
    assert isinstance(projector, ProjectorBase)
    assert projector.get_resolution() == (800, 600)
    assert projector.is_connected() is False
