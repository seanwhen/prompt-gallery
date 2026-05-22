import sqlite3
from backend.config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    file_name TEXT,
    prompt TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    workflow_name TEXT,
    thumbnail_path TEXT,
    original_path TEXT,
    reference_image_path TEXT,
    width INTEGER,
    height INTEGER,
    duration REAL,
    has_audio BOOLEAN DEFAULT 0,
    created_at TEXT NOT NULL
);
"""


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_db()
    conn.executescript(SCHEMA)
    conn.close()


# Initialize on import
init_db()
