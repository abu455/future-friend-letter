from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from app.camera.base import CameraBase, CameraConfig, CameraError, Frame


class SimulatedCamera(CameraBase):
    def __init__(self, config: CameraConfig | None = None, image_dir: str | None = None):
        super().__init__(config)
        self.image_dir = Path(image_dir) if image_dir else None
        self._files = sorted(self.image_dir.glob("*.*")) if self.image_dir and self.image_dir.exists() else []
        self._idx = 0
        self.reference_holes = [(120, 100), (520, 100), (520, 380), (120, 380)]
        self.material_shift = (18, -12)

    def open(self) -> None:
        super().open()

    def soft_trigger(self) -> Frame:
        if not self.online:
            raise CameraError("simulated camera is offline")
        if self._files:
            path = self._files[self._idx % len(self._files)]
            self._idx += 1
            image = cv2.imread(str(path), cv2.IMREAD_COLOR)
            if image is None:
                raise CameraError(f"failed to read simulated image {path}")
            return Frame(image=image, camera_id=self.config.camera_id, metadata={"source": str(path)})
        return Frame(image=self._generate_scene(), camera_id=self.config.camera_id, metadata={"source": "synthetic"})

    def capture_calibration_scene(self) -> Frame:
        if not self.online:
            raise CameraError("simulated camera is offline")
        image = np.full((self.config.height, self.config.width, 3), 235, dtype=np.uint8)
        for u, v in self.reference_holes:
            cv2.circle(image, (u, v), 13, (18, 18, 18), -1)
        return Frame(image=image, camera_id=self.config.camera_id, metadata={"scene": "calibration"})

    def capture_template_scene(self) -> Frame:
        if not self.online:
            raise CameraError("simulated camera is offline")
        return Frame(image=self._draw_part((0, 0)), camera_id=self.config.camera_id, metadata={"scene": "template"})

    def capture_material_scene(self) -> Frame:
        if not self.online:
            raise CameraError("simulated camera is offline")
        return Frame(image=self._draw_part(self.material_shift), camera_id=self.config.camera_id, metadata={"scene": "material"})

    def _generate_scene(self) -> np.ndarray:
        if self._idx % 2 == 0:
            self._idx += 1
            return self._draw_part((0, 0))
        self._idx += 1
        return self._draw_part(self.material_shift)

    def _draw_part(self, shift: tuple[int, int]) -> np.ndarray:
        image = np.full((self.config.height, self.config.width, 3), 245, dtype=np.uint8)
        dx, dy = shift
        cv2.rectangle(image, (160 + dx, 120 + dy), (480 + dx, 350 + dy), (40, 40, 40), 3)
        cv2.circle(image, (240 + dx, 200 + dy), 28, (50, 50, 50), 3)
        cv2.circle(image, (400 + dx, 280 + dy), 24, (50, 50, 50), 3)
        cv2.line(image, (180 + dx, 330 + dy), (460 + dx, 145 + dy), (80, 80, 80), 2)
        rng = np.random.default_rng(7)
        noise = rng.normal(0, 3, image.shape).astype(np.int16)
        return np.clip(image.astype(np.int16) + noise, 0, 255).astype(np.uint8)
