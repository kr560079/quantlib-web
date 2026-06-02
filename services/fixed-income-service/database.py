from __future__ import annotations
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

SQLITE_PATH = os.getenv("SQLITE_PATH", "./fi.db")


def init_db() -> None:
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS fi_history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at  TEXT    NOT NULL,
                instrument  TEXT    NOT NULL,
                request     TEXT    NOT NULL,
                result      TEXT    NOT NULL
            )
        """)
        conn.commit()


@contextmanager
def _conn():
    Path(SQLITE_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(SQLITE_PATH)
    try:
        yield conn
    finally:
        conn.close()


def save_result(instrument: str, req, result) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT INTO fi_history (created_at, instrument, request, result) VALUES (?, ?, ?, ?)",
            (datetime.utcnow().isoformat(), instrument, req.model_dump_json(), result.model_dump_json()),
        )
        conn.commit()


def get_recent(limit: int = 20) -> list[dict]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT id, created_at, instrument, request, result "
            "FROM fi_history ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [
        {
            "id": r[0], "created_at": r[1], "instrument": r[2],
            "request": json.loads(r[3]), "result": json.loads(r[4]),
        }
        for r in rows
    ]
