from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Sector:
    id: str
    slug: str
    name: str
    description: str
    active: bool = True


@dataclass
class Topic:
    id: str
    sector_id: str
    slug: str
    name: str
    description: str
    keywords: list[str]
    active: bool = True


@dataclass
class Source:
    id: str
    sector_id: str
    slug: str
    name: str
    url: str
    kind: str
    active: bool = True
    last_fetched_at: str | None = None
    last_error: str | None = None
    last_status: str = "never"


@dataclass
class Item:
    id: str
    sector_id: str
    source_id: str
    external_id: str
    title: str
    url: str
    summary: str
    published_at: str
    relevance: int | None = None
    relevance_reason: str | None = None
    topic_id: str | None = None
    cluster_id: str | None = None
    status: str = "pending"


@dataclass
class Cluster:
    id: str
    sector_id: str
    fingerprint: str
    title: str


@dataclass
class SyncRun:
    id: str
    sector_id: str
    kind: str
    started_at: str
    finished_at: str | None
    status: str
    items_read: int = 0
    items_new: int = 0
    items_classified: int = 0
    message: str = ""


@dataclass
class WeeklyReport:
    id: str
    sector_id: str
    week_start: str
    week_end: str
    title: str
    trends: list[str]
    opportunities: list[str]
    alerts: list[str]
    upcoming_events: list[str]
    narrative: str
    model: str
    created_at: str


@dataclass
class SectorSeed:
    slug: str
    name: str
    description: str
    topics: list[dict[str, object]]
    sources: list[dict[str, object]]


@dataclass
class ParsedEntry:
    external_id: str
    title: str
    url: str
    summary: str
    published_at: str | None


@dataclass
class Classification:
    relevance: int
    reason: str
    topic_slug: str | None


@dataclass
class WeeklyBrief:
    title: str
    trends: list[str]
    opportunities: list[str]
    alerts: list[str]
    upcoming_events: list[str]
    narrative: str


@dataclass
class HttpResult:
    status: int
    headers: dict[str, str]
    body: bytes
