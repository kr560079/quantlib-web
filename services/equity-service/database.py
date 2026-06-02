from __future__ import annotations
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

SQLITE_PATH = os.getenv("SQLITE_PATH", "./equity.db")


def init_db() -> None:
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS pricing_history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at  TEXT    NOT NULL,
                request     TEXT    NOT NULL,
                price       REAL,
                delta       REAL,
                gamma       REAL,
                vega        REAL,
                theta       REAL,
                rho         REAL,
                engine      TEXT,
                option_type TEXT,
                call_put    TEXT
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


def save_pricing_result(req, result) -> None:
    with _conn() as conn:
        conn.execute("""
            INSERT INTO pricing_history
              (created_at, request, price, delta, gamma, vega, theta, rho, engine, option_type, call_put)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.utcnow().isoformat(),
            req.model_dump_json(),
            result.price,
            result.greeks.delta,
            result.greeks.gamma,
            result.greeks.vega,
            result.greeks.theta,
            result.greeks.rho,
            result.engine_used,
            result.option_type,
            result.call_put,
        ))
        conn.commit()


def get_recent_results(limit: int = 20) -> list[dict]:
    with _conn() as conn:
        rows = conn.execute("""
            SELECT id, created_at, price, delta, gamma, vega, theta, rho,
                   engine, option_type, call_put, request
            FROM pricing_history
            ORDER BY id DESC LIMIT ?
        """, (limit,)).fetchall()
    return [
        {
            "id": r[0], "created_at": r[1], "price": r[2],
            "delta": r[3], "gamma": r[4], "vega": r[5],
            "theta": r[6], "rho": r[7], "engine": r[8],
            "option_type": r[9], "call_put": r[10],
            "request": json.loads(r[11]),
        }
        for r in rows
    ]
