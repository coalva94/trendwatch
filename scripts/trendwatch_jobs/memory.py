from __future__ import annotations

import uuid
from datetime import datetime

from trendwatch_jobs.models import Cluster, Item, Sector, Source, SyncRun, Topic, WeeklyReport


def _parse(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


class MemoryStore:
    def __init__(self) -> None:
        self.sectors: list[Sector] = []
        self.topics: list[Topic] = []
        self.sources: list[Source] = []
        self.items: list[Item] = []
        self.clusters: list[Cluster] = []
        self.runs: list[SyncRun] = []
        self.reports: list[WeeklyReport] = []

    def get_sector_by_slug(self, slug: str) -> Sector | None:
        return next((sector for sector in self.sectors if sector.slug == slug), None)

    def list_topics(self, sector_id: str) -> list[Topic]:
        return [topic for topic in self.topics if topic.sector_id == sector_id]

    def list_sources(self, sector_id: str) -> list[Source]:
        return [source for source in self.sources if source.sector_id == sector_id]

    def existing_external_ids(self, source_id: str) -> set[str]:
        return {item.external_id for item in self.items if item.source_id == source_id}

    def insert_items(self, items: list[Item]) -> list[Item]:
        self.items.extend(items)
        return items

    def save_classification(self, item_id: str, *, topic_id: str | None, relevance: int, reason: str) -> None:
        item = self._item(item_id)
        item.topic_id = topic_id
        item.relevance = relevance
        item.relevance_reason = reason

    def mark_source(self, source_id: str, *, status: str, error: str | None, fetched_at: str) -> None:
        source = next(source for source in self.sources if source.id == source_id)
        source.last_status = status
        source.last_error = error
        source.last_fetched_at = fetched_at

    def items_since(self, sector_id: str, since_iso: str) -> list[Item]:
        since = _parse(since_iso)
        return [
            item
            for item in self.items
            if item.sector_id == sector_id and _parse(item.published_at) >= since
        ]

    def items_between(self, sector_id: str, start_iso: str, end_iso: str) -> list[Item]:
        start, end = _parse(start_iso), _parse(end_iso)
        return [
            item
            for item in self.items
            if item.sector_id == sector_id and start <= _parse(item.published_at) < end
        ]

    def save_clusters(
        self,
        sector_id: str,
        groups: list[tuple[str, str, list[str]]],
        clear_ids: list[str],
    ) -> None:
        for fingerprint, title, item_ids in groups:
            cluster = next(
                (
                    row
                    for row in self.clusters
                    if row.sector_id == sector_id and row.fingerprint == fingerprint
                ),
                None,
            )
            if cluster is None:
                cluster = Cluster(
                    id=str(uuid.uuid4()),
                    sector_id=sector_id,
                    fingerprint=fingerprint,
                    title=title,
                )
                self.clusters.append(cluster)
            else:
                cluster.title = title
            for item_id in item_ids:
                self._item(item_id).cluster_id = cluster.id
        for item_id in clear_ids:
            self._item(item_id).cluster_id = None

    def start_run(self, sector_id: str, kind: str, started_at: str) -> SyncRun:
        run = SyncRun(
            id=str(uuid.uuid4()),
            sector_id=sector_id,
            kind=kind,
            started_at=started_at,
            finished_at=None,
            status="running",
        )
        self.runs.append(run)
        return run

    def finish_run(
        self,
        run_id: str,
        *,
        status: str,
        finished_at: str,
        items_read: int,
        items_new: int,
        items_classified: int,
        message: str,
    ) -> None:
        run = next(run for run in self.runs if run.id == run_id)
        run.status = status
        run.finished_at = finished_at
        run.items_read = items_read
        run.items_new = items_new
        run.items_classified = items_classified
        run.message = message

    def upsert_report(self, report: WeeklyReport) -> None:
        self.reports = [
            row
            for row in self.reports
            if not (row.sector_id == report.sector_id and row.week_start == report.week_start)
        ]
        self.reports.append(report)

    def upsert_sector(self, *, slug: str, name: str, description: str) -> Sector:
        current = self.get_sector_by_slug(slug)
        if current is None:
            current = Sector(id=str(uuid.uuid4()), slug=slug, name=name, description=description, active=True)
            self.sectors.append(current)
        else:
            current.name = name
            current.description = description
            current.active = True
        return current

    def upsert_topic(self, topic: Topic) -> Topic:
        current = next(
            (row for row in self.topics if row.sector_id == topic.sector_id and row.slug == topic.slug),
            None,
        )
        if current is None:
            topic.id = topic.id or str(uuid.uuid4())
            self.topics.append(topic)
            return topic
        current.name = topic.name
        current.description = topic.description
        current.keywords = topic.keywords
        current.active = True
        return current

    def upsert_source(self, source: Source) -> Source:
        current = next(
            (row for row in self.sources if row.sector_id == source.sector_id and row.slug == source.slug),
            None,
        )
        if current is None:
            source.id = source.id or str(uuid.uuid4())
            self.sources.append(source)
            return source
        current.name = source.name
        current.url = source.url
        current.kind = source.kind
        current.active = True
        return current

    def set_topic_active(self, topic_id: str, active: bool) -> None:
        next(topic for topic in self.topics if topic.id == topic_id).active = active

    def set_source_active(self, source_id: str, active: bool) -> None:
        next(source for source in self.sources if source.id == source_id).active = active

    def _item(self, item_id: str) -> Item:
        return next(item for item in self.items if item.id == item_id)
