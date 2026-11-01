from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

from trendwatch_jobs.errors import ConfigError
from trendwatch_jobs.llm import GeminiClient
from trendwatch_jobs.pipeline import run_dedup_job, run_ingest, run_weekly
from trendwatch_jobs.rss import read_feed
from trendwatch_jobs.sector_file import load_sector_file, sync_sector
from trendwatch_jobs.supabase_store import SupabaseStore

MODEL_RE = re.compile(r"^[A-Za-z0-9._-]+$")


class Settings:
    def __init__(self, url: str, service_key: str, gemini_key: str, model: str, sector: str) -> None:
        self.url = url
        self.service_key = service_key
        self.gemini_key = gemini_key
        self.model = model
        self.sector = sector


def load_settings(*, need_model: bool) -> Settings:
    url = os.environ.get("TRENDWATCH_SUPABASE_URL", "").strip()
    service_key = os.environ.get("TRENDWATCH_SUPABASE_SERVICE_ROLE_KEY", "").strip()
    gemini_key = os.environ.get("TRENDWATCH_GEMINI_API_KEY", "").strip()
    model = os.environ.get("TRENDWATCH_GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
    sector = os.environ.get("TRENDWATCH_SECTOR_SLUG", "renewable-energy").strip() or "renewable-energy"
    if not url.startswith("https://"):
        raise ConfigError("Falta TRENDWATCH_SUPABASE_URL (https)")
    if not service_key:
        raise ConfigError("Falta TRENDWATCH_SUPABASE_SERVICE_ROLE_KEY")
    if need_model and not gemini_key:
        raise ConfigError("Falta TRENDWATCH_GEMINI_API_KEY")
    if not MODEL_RE.match(model):
        raise ConfigError("TRENDWATCH_GEMINI_MODEL no es válido")
    return Settings(url, service_key, gemini_key, model, sector)


def _guard(action) -> int:
    try:
        result = action()
    except ConfigError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    print(result.message)
    return 0 if result.ok else 1


def main_ingest() -> int:
    def action():
        settings = load_settings(need_model=True)
        store = SupabaseStore(settings.url, settings.service_key)
        llm = GeminiClient(settings.gemini_key, settings.model)
        return run_ingest(store, llm, sector_slug=settings.sector, fetch_feed=read_feed)

    return _guard(action)


def main_dedup() -> int:
    def action():
        settings = load_settings(need_model=True)
        store = SupabaseStore(settings.url, settings.service_key)
        llm = GeminiClient(settings.gemini_key, settings.model)
        return run_dedup_job(store, llm, sector_slug=settings.sector)

    return _guard(action)


def main_weekly() -> int:
    def action():
        settings = load_settings(need_model=True)
        store = SupabaseStore(settings.url, settings.service_key)
        llm = GeminiClient(settings.gemini_key, settings.model)
        return run_weekly(store, llm, sector_slug=settings.sector, model_name=settings.model)

    return _guard(action)


def main_seed(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Carga sectores JSON en Supabase")
    parser.add_argument("paths", nargs="*")
    parser.add_argument("--all", action="store_true", help="Carga data/sectors/*.json")
    args = parser.parse_args(argv)
    try:
        settings = load_settings(need_model=False)
        root = Path(__file__).resolve().parents[2]
        if args.all or not args.paths:
            paths = sorted((root / "data" / "sectors").glob("*.json"))
        else:
            paths = [Path(path) for path in args.paths]
        if not paths:
            raise ConfigError("No hay archivos de sector")
        store = SupabaseStore(settings.url, settings.service_key)
        for path in paths:
            seed = load_sector_file(path)
            sync_sector(store, seed)
            print(f"Sector {seed.slug} actualizado")
    except ConfigError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    return 0
