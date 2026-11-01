from __future__ import annotations

import json
import re
from pathlib import Path

from trendwatch_jobs.errors import ConfigError
from trendwatch_jobs.models import Sector, SectorSeed, Source, Topic

SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def load_sector_file(path: Path) -> SectorSeed:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ConfigError(f"No se pudo leer {path.name}") from exc
    if not isinstance(data, dict):
        raise ConfigError(f"{path.name}: el archivo no es un objeto")
    slug = _text(data, "slug", path.name)
    if not SLUG.match(slug):
        raise ConfigError(f"{path.name}: slug no válido")
    topics = data.get("topics")
    sources = data.get("sources")
    if not isinstance(topics, list) or not topics:
        raise ConfigError(f"{path.name}: añade al menos un tema")
    if not isinstance(sources, list) or not sources:
        raise ConfigError(f"{path.name}: añade al menos una fuente")
    clean_topics = [_topic(entry, path.name, index) for index, entry in enumerate(topics, start=1)]
    clean_sources = [_source(entry, path.name, index) for index, entry in enumerate(sources, start=1)]
    if len({topic["slug"] for topic in clean_topics}) != len(clean_topics):
        raise ConfigError(f"{path.name}: slugs de tema repetidos")
    if len({source["slug"] for source in clean_sources}) != len(clean_sources):
        raise ConfigError(f"{path.name}: slugs de fuente repetidos")
    if len({source["url"] for source in clean_sources}) != len(clean_sources):
        raise ConfigError(f"{path.name}: URLs de fuente repetidas")
    return SectorSeed(
        slug=slug,
        name=_text(data, "name", path.name),
        description=_text(data, "description", path.name),
        topics=clean_topics,
        sources=clean_sources,
    )


def _text(data: dict, key: str, label: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ConfigError(f"{label}: falta {key}")
    return value.strip()


def _topic(entry: object, label: str, index: int) -> dict[str, object]:
    if not isinstance(entry, dict):
        raise ConfigError(f"{label}: el tema {index} no es un objeto")
    slug = _text(entry, "slug", f"{label} tema {index}")
    if not SLUG.match(slug):
        raise ConfigError(f"{label}: slug de tema no válido")
    keywords = entry.get("keywords")
    if not isinstance(keywords, list) or not keywords or not all(isinstance(word, str) and word.strip() for word in keywords):
        raise ConfigError(f"{label}: el tema {slug} necesita keywords")
    return {
        "slug": slug,
        "name": _text(entry, "name", label),
        "description": _text(entry, "description", label),
        "keywords": [word.strip() for word in keywords],
    }


def _source(entry: object, label: str, index: int) -> dict[str, object]:
    if not isinstance(entry, dict):
        raise ConfigError(f"{label}: la fuente {index} no es un objeto")
    slug = _text(entry, "slug", f"{label} fuente {index}")
    if not SLUG.match(slug):
        raise ConfigError(f"{label}: slug de fuente no válido")
    kind = entry.get("kind")
    if kind not in {"rss", "google_news"}:
        raise ConfigError(f"{label}: kind debe ser rss o google_news")
    url = _text(entry, "url", label)
    if not url.startswith(("https://", "http://")):
        raise ConfigError(f"{label}: la URL de {slug} debe ser http o https")
    return {"slug": slug, "name": _text(entry, "name", label), "url": url, "kind": kind}


def sync_sector(store, seed: SectorSeed) -> Sector:
    sector = store.upsert_sector(slug=seed.slug, name=seed.name, description=seed.description)
    seen_topics: set[str] = set()
    for raw in seed.topics:
        row = store.upsert_topic(
            Topic(
                id="",
                sector_id=sector.id,
                slug=str(raw["slug"]),
                name=str(raw["name"]),
                description=str(raw["description"]),
                keywords=list(raw["keywords"]),  # type: ignore[arg-type]
                active=True,
            )
        )
        seen_topics.add(row.slug)
    for topic in store.list_topics(sector.id):
        if topic.slug not in seen_topics:
            store.set_topic_active(topic.id, False)

    seen_sources: set[str] = set()
    for raw in seed.sources:
        row = store.upsert_source(
            Source(
                id="",
                sector_id=sector.id,
                slug=str(raw["slug"]),
                name=str(raw["name"]),
                url=str(raw["url"]),
                kind=str(raw["kind"]),
                active=True,
            )
        )
        seen_sources.add(row.slug)
    for source in store.list_sources(sector.id):
        if source.slug not in seen_sources:
            store.set_source_active(source.id, False)
    return sector
