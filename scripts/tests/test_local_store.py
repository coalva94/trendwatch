from trendwatch_jobs.local_store import load_store, save_store
from trendwatch_jobs.models import Item


def test_store_roundtrip(tmp_path):
    path = tmp_path / "store.json"
    store = load_store(path)
    store.upsert_sector(slug="renewable-energy", name="Energía", description="Local")
    sector = store.get_sector_by_slug("renewable-energy")
    assert sector is not None
    store.items.append(
        Item(
            id="item-1",
            sector_id=sector.id,
            source_id="source-1",
            external_id="guid",
            title="Wind auction",
            url="https://news.example/a",
            summary="",
            published_at="2026-11-01T00:00:00Z",
            relevance=2,
            relevance_reason="Coincide con Eólica (1).",
        )
    )
    save_store(store, path)
    loaded = load_store(path)
    assert loaded.get_sector_by_slug("renewable-energy") is not None
    assert loaded.items[0].title == "Wind auction"
    assert loaded.items[0].relevance == 2
