import importlib
import types

import numpy as np
from fastapi.testclient import TestClient

from app.api.routes import create_app
from app.camera.base import CameraConfig
from app.camera.simulated_camera import SimulatedCamera
from app.vision_matching.lightglue_stub import LightGlueConfig, SuperPointLightGlueMatcher
from app.vision_matching.matching_service import MatchingService


def test_lightglue_backend_path_with_fake_package(monkeypatch):
    torch = importlib.import_module("torch")

    class FakeSuperPoint:
        def __init__(self, max_num_keypoints):
            self.calls = 0

        def eval(self):
            return self

        def to(self, device):
            return self

        def extract(self, image):
            self.calls += 1
            base = torch.tensor(
                [[10.0, 10.0], [100.0, 10.0], [10.0, 100.0], [100.0, 100.0], [50.0, 50.0]],
                dtype=torch.float32,
            )
            if self.calls == 2:
                base = base + torch.tensor([5.0, -3.0])
            return {"keypoints": base.unsqueeze(0)}

    class FakeLightGlue:
        def __init__(self, features, filter_threshold):
            pass

        def eval(self):
            return self

        def to(self, device):
            return self

        def __call__(self, batch):
            matches = torch.tensor([[[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]], dtype=torch.long)
            scores = torch.full((1, 5), 0.95, dtype=torch.float32)
            return {"matches": matches, "scores": scores}

    def rbd(data):
        if isinstance(data, dict):
            return {key: rbd(value) for key, value in data.items()}
        return data[0] if hasattr(data, "shape") and data.shape[0] == 1 else data

    monkeypatch.setitem(importlib.import_module("sys").modules, "lightglue", types.SimpleNamespace(SuperPoint=FakeSuperPoint, LightGlue=FakeLightGlue))
    monkeypatch.setitem(importlib.import_module("sys").modules, "lightglue.utils", types.SimpleNamespace(rbd=rbd))

    matcher = SuperPointLightGlueMatcher(config=LightGlueConfig(device="cpu", use_fallback=False))
    result = matcher.match(np.zeros((128, 128, 3), dtype=np.uint8), np.zeros((128, 128, 3), dtype=np.uint8))

    assert matcher.available is True
    assert result.metadata["backend"] == "lightglue"
    assert result.inlier_ratio == 1.0
    assert abs(result.affine_matrix[0][2] - 5.0) < 1e-6
    assert abs(result.affine_matrix[1][2] + 3.0) < 1e-6


def test_lightglue_falls_back_when_backend_missing(monkeypatch):
    original_import = importlib.import_module

    def fake_import(name, package=None):
        if name.startswith("lightglue"):
            raise ImportError("lightglue missing in test")
        return original_import(name, package)

    monkeypatch.setattr(importlib, "import_module", fake_import)
    camera = SimulatedCamera(CameraConfig(width=640, height=480))
    camera.open()
    result = MatchingService(camera).register("lightglue")

    assert result["metadata"]["requested_matcher"] == "superpoint_lightglue"
    assert result["metadata"]["fallback_chain"][-1] == "edge_fallback"
    assert "lightglue missing in test" in result["metadata"]["previous_matcher_metadata"]["lightglue_fallback_reason"]


def test_lightglue_matcher_can_be_selected_from_api(monkeypatch):
    original_import = importlib.import_module

    def fake_import(name, package=None):
        if name.startswith("lightglue"):
            raise ImportError("lightglue missing in api test")
        return original_import(name, package)

    monkeypatch.setattr(importlib, "import_module", fake_import)
    client = TestClient(create_app())
    assert client.post("/calibration/start").json()["calibration_quality"] == "OK"
    response = client.post("/vision/register", json={"matcher": "lightglue"}).json()

    assert response["match"]["metadata"]["requested_matcher"] == "superpoint_lightglue"
    assert "lightglue missing in api test" in response["match"]["metadata"]["previous_matcher_metadata"]["lightglue_fallback_reason"]
