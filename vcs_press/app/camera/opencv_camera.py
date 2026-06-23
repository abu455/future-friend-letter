from __future__ import annotations

import cv2

from app.camera.base import CameraBase, CameraConfig, CameraError, Frame


class OpenCVCamera(CameraBase):
    def __init__(self, config: CameraConfig | None = None, device_index: int = 0):
        super().__init__(config)
        self.device_index = device_index
        self._cap: cv2.VideoCapture | None = None

    def open(self) -> None:
        self._cap = cv2.VideoCapture(self.device_index)
        if not self._cap.isOpened():
            raise CameraError(f"OpenCV camera {self.device_index} failed to open")
        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.config.width)
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.config.height)
        self.online = True

    def close(self) -> None:
        if self._cap is not None:
            self._cap.release()
        self.online = False

    def soft_trigger(self) -> Frame:
        if self._cap is None or not self.online:
            raise CameraError("OpenCV camera is offline")
        ok, image = self._cap.read()
        if not ok:
            raise CameraError("OpenCV camera acquisition failed")
        return Frame(image=image, camera_id=self.config.camera_id, metadata={"source": "opencv"})
