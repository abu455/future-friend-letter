import numpy as np

from app.projector.simulated_projector import SimulatedProjector


def test_simulated_projector_connect_show_and_disconnect(tmp_path):
    projector = SimulatedProjector(width=320, height=240, preview_dir=str(tmp_path))
    projector.connect()
    projector.turn_on()
    path = projector.show_image(np.zeros((80, 100, 3), dtype=np.uint8), "test_pattern")
    assert projector.get_status().projector_ready is True
    assert projector.get_status().current_pattern_id == "test_pattern"
    assert path.endswith("test_pattern.png")

    projector.disconnect()
    assert projector.get_status().projector_connected is False
    assert projector.get_status().projector_ready is False


def test_simulated_projector_alive_loss_blocks_ready():
    projector = SimulatedProjector()
    projector.connect()
    projector.simulate_alive_loss()
    status = projector.get_status()
    assert status.projector_alive is False
    assert projector.validate_ready() is False
