from pathlib import Path

from trendwatch_jobs.memory import MemoryStore
from trendwatch_jobs.models import SectorSeed
from trendwatch_jobs.sector_file import load_sector_file, sync_sector
from trendwatch_jobs.supabase_store import SupabaseStore

ROOT = Path(__file__).resolve().parents[2]


def test_example_sector_matches_the_sql_seed():
    seed = load_sector_file(ROOT / "data" / "sectors" / "renewable-energy.json")
    sql = (ROOT / "supabase" / "seed.sql").read_text(encoding="utf-8")
    assert seed.slug in sql
    for source in seed.sources:
        assert source["url"] in sql
        assert source["slug"] in sql
    for topic in seed.topics:
        assert topic["slug"] in sql


def test_sync_deactivates_topics_removed_from_the_file():
    store = MemoryStore()
    seed = load_sector_file(ROOT / "data" / "sectors" / "renewable-energy.json")
    sync_sector(store, seed)
    saved = store.get_sector_by_slug("renewable-energy")
    assert saved is not None
    shorter = SectorSeed(
        slug=seed.slug,
        name=seed.name,
        description=seed.description,
        topics=seed.topics[:4],
        sources=seed.sources,
    )
    sync_sector(store, shorter)
    topics = store.list_topics(saved.id)
    assert len([topic for topic in topics if topic.active]) == 4
    assert len([topic for topic in topics if not topic.active]) == 1


class _Recorder:
    def __init__(self, payload) -> None:
        self.payload = payload
        self.calls: list[tuple] = []

    def __call__(self, method, url, headers, body):
        self.calls.append((method, url, headers, body))
        return 200, __import__("json").dumps(self.payload).encode()


def test_supabase_store_sends_the_service_key_and_filters_by_slug():
    recorder = _Recorder([{"id": "1", "slug": "renewable-energy", "name": "Energía", "description": "", "active": True}])
    store = SupabaseStore("https://example.supabase.co", "service-key", transport=recorder)
    sector = store.get_sector_by_slug("renewable-energy")
    assert sector is not None
    assert sector.slug == "renewable-energy"
    method, url, headers, body = recorder.calls[0]
    assert method == "GET"
    assert "sectors?" in url
    assert "slug=eq.renewable-energy" in url
    assert headers["apikey"] == "service-key"
    assert body is None
