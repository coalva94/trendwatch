from __future__ import annotations

import json
from dataclasses import asdict, fields
from pathlib import Path

from trendwatch_jobs.memory import MemoryStore
from trendwatch_jobs.models import Cluster, Item, Sector, Source, SyncRun, Topic, WeeklyReport

_TABLES: dict[str, type] = {
    "sectors": Sector,
    "topics": Topic,
    "sources": Source,
    "items": Item,
    "clusters": Cluster,
    "runs": SyncRun,
    "reports": WeeklyReport,
}


def store_path(root: Path) -> Path:
    return root / "data" / "local" / "store.json"


def load_store(path: Path) -> MemoryStore:
    store = MemoryStore()
    if not path.is_file():
        return store
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        return store
    for name, cls in _TABLES.items():
        rows = raw.get(name, [])
        if not isinstance(rows, list):
            continue
        allowed = {field.name for field in fields(cls)}
        built = []
        for row in rows:
            if isinstance(row, dict):
                built.append(cls(**{key: value for key, value in row.items() if key in allowed}))
        setattr(store, name, built)
    return store


def save_store(store: MemoryStore, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {name: [asdict(row) for row in getattr(store, name)] for name in _TABLES}
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
