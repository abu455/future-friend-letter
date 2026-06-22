from fastapi.testclient import TestClient

from app.api.routes import create_app


def test_simulated_api_flow_runs_end_to_end():
    client = TestClient(create_app())
    assert client.get("/health").json()["ok"] is True
    calibration = client.post("/calibration/start").json()
    assert calibration["calibration_quality"] == "OK"
    registration = client.post("/vision/register").json()
    assert registration["registration"]["confidence"] > 0.9
    compensation = client.post("/servo/compute").json()
    assert compensation["allow_punch"] is True
    plc = client.post("/servo/send_to_plc").json()
    assert plc["allow_punch"] is True
    inspection = client.post("/inspection/run").json()
    assert inspection["online_learning"]["updated"] is True
