from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime

from trendwatch_jobs.errors import ConfigError
from trendwatch_jobs.models import Item, Sector, Source, SyncRun, Topic, WeeklyReport


def urllib_transport(method: str, url: str, headers: dict[str, str], body: bytes | None) -> tuple[int, bytes]:
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()


class SupabaseStore:
    def __init__(self, url: str, api_key: str, transport=None) -> None:
        if not url.startswith("https://"):
            raise ConfigError("TRENDWATCH_SUPABASE_URL debe ser https")
        self.base = url.rstrip("/") + "/rest/v1"
        self.api_key = api_key
        self.transport = transport or urllib_transport

    def _request(self, method: str, table: str, query: dict[str, str] | None = None, body=None, prefer: str | None = None):
        params = urllib.parse.urlencode(query or {})
        target = f"{self.base}/{table}"
        if params:
            target = f"{target}?{params}"
        headers = {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        payload = None if body is None else json.dumps(body).encode()
        status, raw = self.transport(method, target, headers, payload)
        if status >= 300:
            detail = raw.decode("utf-8", errors="replace")[:240]
            raise ConfigError(f"Supabase respondió {status}: {detail}")
        if not raw:
            return None
        return json.loads(raw)

    def get_sector_by_slug(self, slug: str) -> Sector | None:
        rows = self._request("GET", "sectors", {"slug": f"eq.{slug}", "select": "*", "limit": "1"}) or []
        return _sector(rows[0]) if rows else None

    def list_topics(self, sector_id: str) -> list[Topic]:
        rows = self._request("GET", "topics", {"sector_id": f"eq.{sector_id}", "select": "*"}) or []
        return [_topic(row) for row in rows]

    def list_sources(self, sector_id: str) -> list[Source]:
        rows = self._request("GET", "sources", {"sector_id": f"eq.{sector_id}", "select": "*"}) or []
        return [_source(row) for row in rows]

    def existing_external_ids(self, source_id: str) -> set[str]:
        rows = self._request(
            "GET",
            "items",
            {"source_id": f"eq.{source_id}", "select": "external_id", "limit": "1000"},
        ) or []
        return {row["external_id"] for row in rows}

    def insert_items(self, items: list[Item]) -> list[Item]:
        if not items:
            return []
        rows = self._request(
            "POST",
            "items",
            None,
            [_item_out(item) for item in items],
            "return=representation",
        )
        return [_item(row) for row in rows]

    def save_classification(self, item_id: str, *, topic_id: str | None, relevance: int, reason: str) -> None:
        self._request(
            "PATCH",
            "items",
            {"id": f"eq.{item_id}"},
            {"topic_id": topic_id, "relevance": relevance, "relevance_reason": reason},
            "return=minimal",
        )

    def mark_source(self, source_id: str, *, status: str, error: str | None, fetched_at: str) -> None:
        self._request(
            "PATCH",
            "sources",
            {"id": f"eq.{source_id}"},
            {"last_status": status, "last_error": error, "last_fetched_at": fetched_at},
            "return=minimal",
        )

    def items_since(self, sector_id: str, since_iso: str) -> list[Item]:
        rows = self._request(
            "GET",
            "items",
            {"sector_id": f"eq.{sector_id}", "published_at": f"gte.{since_iso}", "select": "*"},
        ) or []
        return [_item(row) for row in rows]

    def items_between(self, sector_id: str, start_iso: str, end_iso: str) -> list[Item]:
        rows = self._request(
            "GET",
            "items",
            {
                "sector_id": f"eq.{sector_id}",
                "published_at": f"gte.{start_iso}",
                "select": "*",
            },
        ) or []
        end = datetime.fromisoformat(end_iso.replace("Z", "+00:00"))
        kept = []
        for row in rows:
            published = datetime.fromisoformat(str(row["published_at"]).replace("Z", "+00:00"))
            if published < end:
                kept.append(_item(row))
        return kept

    def save_clusters(self, sector_id: str, groups: list[tuple[str, str, list[str]]], clear_ids: list[str]) -> None:
        for fingerprint, title, item_ids in groups:
            rows = self._request(
                "POST",
                "clusters",
                {"on_conflict": "sector_id,fingerprint"},
                {"sector_id": sector_id, "fingerprint": fingerprint, "title": title},
                "resolution=merge-duplicates,return=representation",
            )
            cluster = _one(rows)
            self._request(
                "PATCH",
                "items",
                {"id": f"in.({','.join(item_ids)})"},
                {"cluster_id": cluster["id"]},
                "return=minimal",
            )
        if clear_ids:
            self._request(
                "PATCH",
                "items",
                {"id": f"in.({','.join(clear_ids)})"},
                {"cluster_id": None},
                "return=minimal",
            )

    def start_run(self, sector_id: str, kind: str, started_at: str) -> SyncRun:
        row = _one(
            self._request(
                "POST",
                "sync_runs",
                None,
                {
                    "sector_id": sector_id,
                    "kind": kind,
                    "started_at": started_at,
                    "status": "running",
                    "message": "",
                },
                "return=representation",
            )
        )
        return _run(row)

    def finish_run(self, run_id: str, *, status: str, finished_at: str, items_read: int, items_new: int, items_classified: int, message: str) -> None:
        self._request(
            "PATCH",
            "sync_runs",
            {"id": f"eq.{run_id}"},
            {
                "status": status,
                "finished_at": finished_at,
                "items_read": items_read,
                "items_new": items_new,
                "items_classified": items_classified,
                "message": message,
            },
            "return=minimal",
        )

    def upsert_report(self, report: WeeklyReport) -> None:
        self._request(
            "POST",
            "weekly_reports",
            {"on_conflict": "sector_id,week_start"},
            {
                "sector_id": report.sector_id,
                "week_start": report.week_start,
                "week_end": report.week_end,
                "title": report.title,
                "trends": report.trends,
                "opportunities": report.opportunities,
                "alerts": report.alerts,
                "upcoming_events": report.upcoming_events,
                "narrative": report.narrative,
                "model": report.model,
                "created_at": report.created_at,
            },
            "resolution=merge-duplicates,return=minimal",
        )

    def upsert_sector(self, *, slug: str, name: str, description: str) -> Sector:
        row = _one(
            self._request(
                "POST",
                "sectors",
                {"on_conflict": "slug"},
                {"slug": slug, "name": name, "description": description, "active": True},
                "resolution=merge-duplicates,return=representation",
            )
        )
        return _sector(row)

    def upsert_topic(self, topic: Topic) -> Topic:
        row = _one(
            self._request(
                "POST",
                "topics",
                {"on_conflict": "sector_id,slug"},
                {
                    "sector_id": topic.sector_id,
                    "slug": topic.slug,
                    "name": topic.name,
                    "description": topic.description,
                    "keywords": topic.keywords,
                    "active": True,
                },
                "resolution=merge-duplicates,return=representation",
            )
        )
        return _topic(row)

    def upsert_source(self, source: Source) -> Source:
        row = _one(
            self._request(
                "POST",
                "sources",
                {"on_conflict": "sector_id,slug"},
                {
                    "sector_id": source.sector_id,
                    "slug": source.slug,
                    "name": source.name,
                    "url": source.url,
                    "kind": source.kind,
                    "active": True,
                },
                "resolution=merge-duplicates,return=representation",
            )
        )
        return _source(row)

    def set_topic_active(self, topic_id: str, active: bool) -> None:
        self._request("PATCH", "topics", {"id": f"eq.{topic_id}"}, {"active": active}, "return=minimal")

    def set_source_active(self, source_id: str, active: bool) -> None:
        self._request("PATCH", "sources", {"id": f"eq.{source_id}"}, {"active": active}, "return=minimal")


def _one(payload):
    if isinstance(payload, list):
        if not payload:
            raise ConfigError("Supabase no devolvió la fila")
        return payload[0]
    return payload


def _sector(row: dict) -> Sector:
    return Sector(
        id=row["id"],
        slug=row["slug"],
        name=row["name"],
        description=row.get("description") or "",
        active=bool(row.get("active", True)),
    )


def _topic(row: dict) -> Topic:
    return Topic(
        id=row["id"],
        sector_id=row["sector_id"],
        slug=row["slug"],
        name=row["name"],
        description=row.get("description") or "",
        keywords=list(row.get("keywords") or []),
        active=bool(row.get("active", True)),
    )


def _source(row: dict) -> Source:
    return Source(
        id=row["id"],
        sector_id=row["sector_id"],
        slug=row["slug"],
        name=row["name"],
        url=row["url"],
        kind=row["kind"],
        active=bool(row.get("active", True)),
        last_fetched_at=row.get("last_fetched_at"),
        last_error=row.get("last_error"),
        last_status=row.get("last_status") or "never",
    )


def _item(row: dict) -> Item:
    return Item(
        id=row["id"],
        sector_id=row["sector_id"],
        source_id=row["source_id"],
        external_id=row["external_id"],
        title=row["title"],
        url=row["url"],
        summary=row.get("summary") or "",
        published_at=row["published_at"],
        relevance=row.get("relevance"),
        relevance_reason=row.get("relevance_reason"),
        topic_id=row.get("topic_id"),
        cluster_id=row.get("cluster_id"),
        status=row.get("status") or "pending",
    )


def _item_out(item: Item) -> dict:
    return {
        "id": item.id,
        "sector_id": item.sector_id,
        "source_id": item.source_id,
        "external_id": item.external_id,
        "title": item.title,
        "url": item.url,
        "summary": item.summary,
        "published_at": item.published_at,
        "status": item.status,
    }


def _run(row: dict) -> SyncRun:
    return SyncRun(
        id=row["id"],
        sector_id=row["sector_id"],
        kind=row["kind"],
        started_at=row["started_at"],
        finished_at=row.get("finished_at"),
        status=row["status"],
        items_read=row.get("items_read") or 0,
        items_new=row.get("items_new") or 0,
        items_classified=row.get("items_classified") or 0,
        message=row.get("message") or "",
    )

