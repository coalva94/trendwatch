from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from trendwatch_jobs.dedup import fingerprint_for, group_ids
from trendwatch_jobs.errors import ConfigError
from trendwatch_jobs.models import Item, ParsedEntry, WeeklyBrief, WeeklyReport


def iso(value: datetime) -> str:
    return value.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def previous_calendar_week(now: datetime) -> tuple[datetime, datetime]:
    """Monday 00:00 UTC of the previous week through this Monday 00:00 UTC."""
    current = now.astimezone(UTC)
    this_monday = (current - timedelta(days=current.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return this_monday - timedelta(days=7), this_monday


@dataclass
class JobResult:
    ok: bool
    message: str


def regroup(store, llm, *, sector_id: str, now: datetime) -> int:
    since = iso(now - timedelta(days=14))
    items = store.items_since(sector_id, since)
    records = [(item.id, item.title) for item in items]
    same_story = llm.same_story if llm is not None else None
    groups = group_ids(records, same_story)
    by_id = {item.id: item for item in items}
    multi: list[tuple[str, str, list[str]]] = []
    grouped_ids: set[str] = set()
    for group in groups:
        if len(group) < 2:
            continue
        titles = [by_id[item_id].title for item_id in group]
        representative = max(titles, key=len)
        multi.append((fingerprint_for(titles), representative, group))
        grouped_ids.update(group)
    clear_ids = [item.id for item in items if item.id not in grouped_ids]
    store.save_clusters(sector_id, multi, clear_ids)
    return len(multi)


def run_ingest(store, llm, *, sector_slug: str, fetch_feed, now: datetime | None = None) -> JobResult:
    moment = now or datetime.now(UTC)
    sector = store.get_sector_by_slug(sector_slug)
    if sector is None:
        raise ConfigError(f"No existe el sector {sector_slug}")
    topics = [topic for topic in store.list_topics(sector.id) if topic.active]
    sources = [source for source in store.list_sources(sector.id) if source.active]
    run = store.start_run(sector.id, "ingest", iso(moment))
    items_read = 0
    items_new = 0
    classified = 0
    errors: list[str] = []
    for source in sources:
        try:
            entries = fetch_feed(source.url)
            items_read += len(entries)
            known = store.existing_external_ids(source.id)
            created = _insert_new(store, sector.id, source.id, entries, known, moment)
            items_new += len(created)
            for item in created:
                result = llm.classify(
                    title=item.title,
                    summary=item.summary,
                    sector=sector.name,
                    topics=topics,
                )
                topic_id = next((topic.id for topic in topics if topic.slug == result.topic_slug), None)
                store.save_classification(
                    item.id,
                    topic_id=topic_id,
                    relevance=result.relevance,
                    reason=result.reason,
                )
                classified += 1
            store.mark_source(source.id, status="ok", error=None, fetched_at=iso(moment))
        except Exception as exc:  # noqa: BLE001 - one bad feed must not stop the others
            errors.append(f"{source.name}: {exc}")
            store.mark_source(source.id, status="error", error=str(exc)[:500], fetched_at=iso(moment))
    groups = regroup(store, llm, sector_id=sector.id, now=moment)
    status = "error" if sources and len(errors) == len(sources) else "ok"
    message = f"{items_new} noticias nuevas, {classified} clasificadas, {groups} grupos."
    if errors:
        message = f"{message} {' '.join(errors)}"
    store.finish_run(
        run.id,
        status=status,
        finished_at=iso(moment),
        items_read=items_read,
        items_new=items_new,
        items_classified=classified,
        message=message,
    )
    return JobResult(ok=status == "ok", message=message)


def _insert_new(store, sector_id: str, source_id: str, entries: list[ParsedEntry], known: set[str], now: datetime) -> list[Item]:
    fresh: list[Item] = []
    seen = set(known)
    for entry in entries:
        if entry.external_id in seen:
            continue
        seen.add(entry.external_id)
        fresh.append(
            Item(
                id=str(uuid.uuid4()),
                sector_id=sector_id,
                source_id=source_id,
                external_id=entry.external_id,
                title=entry.title,
                url=entry.url,
                summary=entry.summary,
                published_at=entry.published_at or iso(now),
            )
        )
    return store.insert_items(fresh)


def run_dedup_job(store, llm, *, sector_slug: str, now: datetime | None = None) -> JobResult:
    moment = now or datetime.now(UTC)
    sector = store.get_sector_by_slug(sector_slug)
    if sector is None:
        raise ConfigError(f"No existe el sector {sector_slug}")
    run = store.start_run(sector.id, "dedup", iso(moment))
    groups = regroup(store, llm, sector_id=sector.id, now=moment)
    message = f"{groups} grupos en los últimos 14 días."
    store.finish_run(
        run.id,
        status="ok",
        finished_at=iso(moment),
        items_read=0,
        items_new=0,
        items_classified=0,
        message=message,
    )
    return JobResult(ok=True, message=message)


def run_weekly(store, llm, *, sector_slug: str, model_name: str, now: datetime | None = None) -> JobResult:
    moment = now or datetime.now(UTC)
    sector = store.get_sector_by_slug(sector_slug)
    if sector is None:
        raise ConfigError(f"No existe el sector {sector_slug}")
    start, end = previous_calendar_week(moment)
    items = store.items_between(sector.id, iso(start), iso(end))
    chosen = [item for item in items if item.status != "discarded" and (item.relevance or 0) >= 1]
    if chosen:
        brief = llm.weekly_brief(
            sector=sector.name,
            items=[
                {"title": item.title, "summary": item.summary, "relevance": item.relevance}
                for item in chosen
            ],
        )
    else:
        brief = WeeklyBrief(
            title=f"{sector.name}: semana sin señales",
            trends=[],
            opportunities=[],
            alerts=[],
            upcoming_events=[],
            narrative="No hubo noticias clasificadas en la semana anterior.",
        )
    _save_report(store, sector.id, start, end, brief, model_name, moment)
    run = store.start_run(sector.id, "report", iso(moment))
    message = f"Informe {start.date().isoformat()}–{end.date().isoformat()} con {len(chosen)} noticias."
    store.finish_run(
        run.id,
        status="ok",
        finished_at=iso(moment),
        items_read=len(items),
        items_new=0,
        items_classified=len(chosen),
        message=message,
    )
    return JobResult(ok=True, message=message)


def _save_report(store, sector_id: str, start: datetime, end: datetime, brief: WeeklyBrief, model_name: str, now: datetime) -> None:
    store.upsert_report(
        WeeklyReport(
            id=str(uuid.uuid4()),
            sector_id=sector_id,
            week_start=start.date().isoformat(),
            week_end=end.date().isoformat(),
            title=brief.title,
            trends=brief.trends,
            opportunities=brief.opportunities,
            alerts=brief.alerts,
            upcoming_events=brief.upcoming_events,
            narrative=brief.narrative,
            model=model_name,
            created_at=iso(now),
        )
    )
