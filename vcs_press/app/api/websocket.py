from __future__ import annotations

import asyncio

from fastapi import WebSocket


class StatusBroadcaster:
    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.connections:
            self.connections.remove(websocket)

    async def stream(self, websocket: WebSocket, status_fn) -> None:
        await self.connect(websocket)
        try:
            while True:
                await websocket.send_json(status_fn())
                await asyncio.sleep(1.0)
        finally:
            self.disconnect(websocket)
