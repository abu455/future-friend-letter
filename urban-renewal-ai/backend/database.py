"""SQLite persistence helpers for the Urban Renewal Intelligence Lab.

The MVP stores upload metadata, pipeline outputs, and dashboard summaries in a
single local SQLite database. Analytical artifacts remain file based so they can
be downloaded by the frontend and inspected in a reproducible paper workflow.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "sample_data"
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
MODEL_DIR = BASE_DIR / "models"
DB_PATH = BASE_DIR / "urban_renewal_ai.sqlite"


def ensure_directories() -> None:
    """Create runtime directories used by uploads, outputs, and model storage."""

    for directory in (DATA_DIR, UPLOAD_DIR, OUTPUT_DIR, MODEL_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    """Return a SQLite connection with rows addressable by column name."""

    ensure_directories()
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    """Initialize the minimal metadata schema if it does not exist."""

    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS uploaded_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                logical_name TEXT NOT NULL,
                file_name TEXT NOT NULL,
                saved_path TEXT NOT NULL,
                validation_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS pipeline_artifacts (
                artifact_key TEXT PRIMARY KEY,
                artifact_path TEXT NOT NULL,
                payload_json TEXT,
                updated_at TEXT NOT NULL
            )
            """
        )


def record_upload(
    logical_name: str,
    file_name: str,
    saved_path: Path,
    validation: dict[str, Any],
) -> None:
    """Persist metadata for an uploaded input file."""

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO uploaded_files
            (logical_name, file_name, saved_path, validation_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                logical_name,
                file_name,
                str(saved_path),
                json.dumps(validation, ensure_ascii=False),
                datetime.utcnow().isoformat(),
            ),
        )


def upsert_artifact(
    artifact_key: str,
    artifact_path: Path,
    payload: dict[str, Any] | list[dict[str, Any]] | None = None,
) -> None:
    """Register or update a generated analytical artifact."""

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO pipeline_artifacts
            (artifact_key, artifact_path, payload_json, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(artifact_key)
            DO UPDATE SET artifact_path = excluded.artifact_path,
                          payload_json = excluded.payload_json,
                          updated_at = excluded.updated_at
            """,
            (
                artifact_key,
                str(artifact_path),
                json.dumps(payload, ensure_ascii=False) if payload is not None else None,
                datetime.utcnow().isoformat(),
            ),
        )


def get_artifact_payload(artifact_key: str) -> Any | None:
    """Load a JSON payload saved in the artifact registry."""

    with get_connection() as connection:
        row = connection.execute(
            "SELECT payload_json FROM pipeline_artifacts WHERE artifact_key = ?",
            (artifact_key,),
        ).fetchone()
    if not row or row["payload_json"] is None:
        return None
    return json.loads(row["payload_json"])


def get_artifact_path(artifact_key: str) -> Path | None:
    """Return a registered artifact path if available."""

    with get_connection() as connection:
        row = connection.execute(
            "SELECT artifact_path FROM pipeline_artifacts WHERE artifact_key = ?",
            (artifact_key,),
        ).fetchone()
    return Path(row["artifact_path"]) if row else None


def latest_uploaded_path(logical_name: str) -> Path | None:
    """Return the most recent upload for a logical dataset name."""

    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT saved_path FROM uploaded_files
            WHERE logical_name = ?
            ORDER BY id DESC LIMIT 1
            """,
            (logical_name,),
        ).fetchone()
    return Path(row["saved_path"]) if row else None
