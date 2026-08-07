from fastapi.testclient import TestClient

from app.api.routes import create_app


def test_projection_api_simulated_flow():
    client = TestClient(create_app())
    assert client.get("/projector/status").json()["projector_status"]["projector_connected"] is False
    assert client.post("/projector/connect").json()["projector_status"]["projector_ready"] is True
    assert client.post("/projection/calibration/start").json()["machine_projector"]["calibration_quality"] == "OK"
    render = client.post("/projection/render").json()
    assert render["allow_punch"] is False
    assert render["pattern_id"]
    feedback = client.post("/projection/feedback_loop").json()
    assert feedback["projection_alignment_quality"] == "OK"
    assert feedback["allow_projection"] is True
    assert feedback["debug_image_path"]
    safety = client.post("/projection/safety/check").json()
    assert "allow_punch" in safety
    latest = client.get("/projection/report/latest").json()
    assert latest["success"] is True


def test_projection_modes_are_exposed():
    client = TestClient(create_app())
    client.post("/projector/connect")
    for mode in ["visible", "clean", "strobe"]:
        response = client.post("/projection/mode", json={"mode": mode}).json()
        assert response["projector_status"]["projection_mode"] == mode
