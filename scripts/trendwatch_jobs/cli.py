from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

from trendwatch_jobs.errors import ConfigError
from trendwatch_jobs.llm import FakeLLM, GeminiClient
from trendwatch_jobs.local_store import load_store, save_store, store_path
from trendwatch_jobs.pipeline import JobResult, run_dedup_job, run_ingest, run_weekly
from trendwatch_jobs.rss import read_feed
from trendwatch_jobs.sector_file import load_sector_file, sync_sector
from trendwatch_jobs.supabase_store import SupabaseStore

MODEL_RE = re.compile(r"^[A-Za-z0-9._-]+$")


class Settings:
    def __init__(
        self,
        url: str,
        service_key: str,
        gemini_key: str,
        model: str,
        sector: str,
        *,
        local: bool,
        store_file: Path | None,
    ) -> None:
        self.url = url
        self.service_key = service_key
        self.gemini_key = gemini_key
        self.model = model
        self.sector = sector
        self.local = local
        self.store_file = store_file


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def default_env_files() -> list[Path]:
    root = repo_root()
    return [root / ".env", root / ".env.local"]


def apply_env_file(path: Path, values: dict[str, str]) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        if stripped.startswith("export "):
            stripped = stripped.removeprefix("export ").strip()
        key, _, raw = stripped.partition("=")
        key = key.strip()
        if not key or (key in values and values[key].strip()):
            continue
        value = raw.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        values[key] = value


def load_settings(
    environ: dict[str, str] | None = None,
    *,
    env_files: list[Path] | None = None,
) -> Settings:
    values = dict(os.environ if environ is None else environ)
    for path in default_env_files() if env_files is None else env_files:
        apply_env_file(path, values)
    url = values.get("TRENDWATCH_SUPABASE_URL", "").strip()
    service_key = values.get("TRENDWATCH_SUPABASE_SERVICE_ROLE_KEY", "").strip()
    gemini_key = values.get("TRENDWATCH_GEMINI_API_KEY", "").strip()
    model = values.get("TRENDWATCH_GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
    sector = values.get("TRENDWATCH_SECTOR_SLUG", "renewable-energy").strip() or "renewable-energy"
    if url and not url.startswith("https://"):
        raise ConfigError("TRENDWATCH_SUPABASE_URL debe ser https")
    if url and not service_key:
        raise ConfigError("Falta TRENDWATCH_SUPABASE_SERVICE_ROLE_KEY")
    if not MODEL_RE.match(model):
        raise ConfigError("TRENDWATCH_GEMINI_MODEL no es válido")
    local = not url
    return Settings(
        url,
        service_key,
        gemini_key,
        model,
        sector,
        local=local,
        store_file=store_path(repo_root()) if local else None,
    )


def open_llm(settings: Settings):
    if settings.gemini_key:
        return GeminiClient(settings.gemini_key, settings.model)
    return FakeLLM()


def open_store(settings: Settings):
    if not settings.local:
        return SupabaseStore(settings.url, settings.service_key)
    path = settings.store_file
    if path is None:
        raise ConfigError("Falta la ruta del almacén local")
    store = load_store(path)
    sector_file = repo_root() / "data" / "sectors" / f"{settings.sector}.json"
    if not sector_file.is_file():
        raise ConfigError(f"No existe {sector_file.relative_to(repo_root())}")
    sync_sector(store, load_sector_file(sector_file))
    return store


def _persist(settings: Settings, store) -> None:
    if settings.local and settings.store_file is not None:
        save_store(store, settings.store_file)


def _annotate(settings: Settings, result: JobResult) -> JobResult:
    notes: list[str] = []
    if not settings.gemini_key:
        notes.append("Clasificación por palabras clave, sin API de modelo.")
    if settings.local and settings.store_file is not None:
        notes.append(f"Sin Supabase: guardado en {settings.store_file.relative_to(repo_root())}.")
    if not notes:
        return result
    return JobResult(ok=result.ok, message=f"{result.message} {' '.join(notes)}")


def _guard(action) -> int:
    try:
        result = action()
    except ConfigError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    print(result.message)
    return 0 if result.ok else 1


def _job(build) -> JobResult:
    settings = load_settings()
    store = open_store(settings)
    try:
        result = build(settings, store)
    finally:
        _persist(settings, store)
    return _annotate(settings, result)


def main_ingest() -> int:
    def action():
        return _job(
            lambda settings, store: run_ingest(
                store,
                open_llm(settings),
                sector_slug=settings.sector,
                fetch_feed=read_feed,
            )
        )

    return _guard(action)


def main_dedup() -> int:
    def action():
        return _job(
            lambda settings, store: run_dedup_job(
                store,
                open_llm(settings),
                sector_slug=settings.sector,
            )
        )

    return _guard(action)


def main_weekly() -> int:
    def action():
        return _job(
            lambda settings, store: run_weekly(
                store,
                open_llm(settings),
                sector_slug=settings.sector,
                model_name=settings.model if settings.gemini_key else "keywords",
            )
        )

    return _guard(action)


def main_seed(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Carga sectores JSON en Supabase")
    parser.add_argument("paths", nargs="*")
    parser.add_argument("--all", action="store_true", help="Carga data/sectors/*.json")
    args = parser.parse_args(argv)
    try:
        settings = load_settings()
        root = repo_root()
        if args.all or not args.paths:
            paths = sorted((root / "data" / "sectors").glob("*.json"))
        else:
            paths = [Path(path) for path in args.paths]
        if not paths:
            raise ConfigError("No hay archivos de sector")
        store = open_store(settings)
        try:
            for path in paths:
                seed = load_sector_file(path)
                sync_sector(store, seed)
                print(f"Sector {seed.slug} actualizado")
        finally:
            _persist(settings, store)
    except ConfigError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    return 0
