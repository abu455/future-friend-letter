from __future__ import annotations

from pathlib import Path

from loguru import logger


def configure_logger(log_dir: str | Path = "data/logs") -> None:
    path = Path(log_dir)
    path.mkdir(parents=True, exist_ok=True)
    logger.remove()
    logger.add(lambda msg: print(msg, end=""), level="INFO")
    logger.add(path / "vcs_press.log", rotation="10 MB", retention=10, level="INFO")


configure_logger()
