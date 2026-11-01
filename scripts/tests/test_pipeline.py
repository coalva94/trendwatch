from datetime import UTC, datetime

from trendwatch_jobs.llm import FakeLLM
from trendwatch_jobs.memory import MemoryStore
from trendwatch_jobs.models import ParsedEntry, Sector, Source, Topic
from trendwatch_jobs.pipeline import previous_calendar_week, run_dedup_job, run_ingest, run_weekly


def _store() -> MemoryStore:
    store = MemoryStore()
    sector = store.upsert_sector(slug="renewable-energy", name="Energía renovable", description="Demo")
    store.upsert_topic(
        Topic("", sector.id, "wind", "Eólica", "Parques", ["wind", "auction"], True)
    )
    store.upsert_source(
        Source("", sector.id, "wind-news", "Wind", "https://news.example/wind", "rss", True)
    )
    store.upsert_source(
        Source("", sector.id, "other", "Other", "https://news.example/other", "rss", True)
    )
    return store


def test_ingest_classifies_dedups_and_keeps_going_after_a_bad_feed():
    store = _store()
    feeds = {
        "https://news.example/wind": [
            ParsedEntry("a", "Spanish wind auction clears 3.5 GW", "https://news.example/a", "", "2026-10-20T09:00:00Z"),
            ParsedEntry("a", "duplicate guid", "https://news.example/a2", "", "2026-10-20T09:00:00Z"),
        ],
        "https://news.example/other": [
            ParsedEntry("b", "Spain awards 3.5 GW in its latest onshore wind auction", "https://news.example/b", "", "2026-10-20T10:00:00Z"),
        ],
    }

    def fetch(url: str):
        if url.endswith("/other"):
            raise TimeoutError("tiempo de espera")
        return feeds[url]

    result = run_ingest(
        store,
        FakeLLM(),
        sector_slug="renewable-energy",
        fetch_feed=fetch,
        now=datetime(2026, 10, 21, 8, tzinfo=UTC),
    )
    assert result.ok
    assert "1 noticias nuevas" in result.message
    assert "tiempo de espera" in result.message
    item = store.items[0]
    assert item.relevance == 2
    assert item.topic_id
    broken = next(source for source in store.sources if source.slug == "other")
    assert broken.last_status == "error"
    assert store.runs[0].status == "ok"

    # Second run does not insert the same guid again. The other feed still fails.
    again = run_ingest(
        store,
        FakeLLM(),
        sector_slug="renewable-energy",
        fetch_feed=fetch,
        now=datetime(2026, 10, 21, 9, tzinfo=UTC),
    )
    assert "0 noticias nuevas" in again.message
    assert len(store.items) == 1


def test_dedup_job_groups_two_sources():
    store = _store()
    sector = store.get_sector_by_slug("renewable-energy")
    assert sector is not None
    wind = next(source for source in store.sources if source.slug == "wind-news")
    other = next(source for source in store.sources if source.slug == "other")
    now = datetime(2026, 10, 21, tzinfo=UTC)
    store.insert_items(
        [
            _item(sector, wind.id, "a", "Spanish wind auction clears 3.5 GW"),
            _item(sector, other.id, "b", "Spain awards 3.5 GW in its latest onshore wind auction"),
        ]
    )
    result = run_dedup_job(store, FakeLLM(), sector_slug="renewable-energy", now=now)
    assert result.ok
    assert store.items[0].cluster_id == store.items[1].cluster_id
    assert store.runs[-1].kind == "dedup"


def test_weekly_report_uses_the_previous_calendar_week_and_skips_discarded():
    start, end = previous_calendar_week(datetime(2026, 11, 1, 12, tzinfo=UTC))
    assert start.date().isoformat() == "2026-10-19"
    assert end.date().isoformat() == "2026-10-26"

    store = _store()
    sector = store.get_sector_by_slug("renewable-energy")
    assert sector is not None
    source = store.sources[0]
    kept = _item(sector, source.id, "a", "Spanish wind auction clears capacity")
    kept.published_at = "2026-10-20T09:00:00Z"
    kept.relevance = 3
    dropped = _item(sector, source.id, "b", "Football club rooftop array")
    dropped.published_at = "2026-10-21T09:00:00Z"
    dropped.relevance = 0
    dropped.status = "discarded"
    outside = _item(sector, source.id, "c", "Later wind auction")
    outside.published_at = "2026-10-27T09:00:00Z"
    outside.relevance = 3
    store.insert_items([kept, dropped, outside])

    result = run_weekly(
        store,
        FakeLLM(),
        sector_slug="renewable-energy",
        model_name="fake",
        now=datetime(2026, 11, 1, 12, tzinfo=UTC),
    )
    assert result.ok
    assert len(store.reports) == 1
    assert "Spanish wind auction" in store.reports[0].trends[0]
    assert store.reports[0].model == "fake"

    empty = MemoryStore()
    empty.sectors.append(Sector("s", "empty", "Vacío", "", True))
    quiet = run_weekly(
        empty,
        FakeLLM(),
        sector_slug="empty",
        model_name="fake",
        now=datetime(2026, 11, 1, tzinfo=UTC),
    )
    assert "sin señales" in quiet.message or empty.reports[0].narrative.startswith("No hubo")


def _item(sector: Sector, source_id: str, external_id: str, title: str):
    from trendwatch_jobs.models import Item

    return Item(
        id=external_id,
        sector_id=sector.id,
        source_id=source_id,
        external_id=external_id,
        title=title,
        url=f"https://news.example/{external_id}",
        summary="",
        published_at="2026-10-20T09:00:00Z",
    )
