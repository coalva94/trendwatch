from pathlib import Path

import pytest

from trendwatch_jobs.cli import apply_env_file, load_settings, open_llm
from trendwatch_jobs.errors import ConfigError
from trendwatch_jobs.llm import FakeLLM


def test_blank_url_runs_local_without_a_model_key():
    settings = load_settings(
        {
            "TRENDWATCH_DEMO_MODE": "true",
            "TRENDWATCH_SUPABASE_URL": "",
            "TRENDWATCH_GEMINI_API_KEY": "",
        },
        env_files=[],
    )
    assert settings.local
    assert settings.gemini_key == ""
    assert settings.sector == "renewable-energy"
    assert isinstance(open_llm(settings), FakeLLM)


def test_supabase_still_requires_https_and_service_role():
    with pytest.raises(ConfigError, match="https"):
        load_settings({"TRENDWATCH_SUPABASE_URL": "http://example.test"}, env_files=[])
    with pytest.raises(ConfigError, match="SERVICE_ROLE"):
        load_settings({"TRENDWATCH_SUPABASE_URL": "https://abcd.supabase.co"}, env_files=[])


def test_gemini_key_is_optional_when_supabase_is_configured():
    settings = load_settings(
        {
            "TRENDWATCH_SUPABASE_URL": "https://abcd.supabase.co",
            "TRENDWATCH_SUPABASE_SERVICE_ROLE_KEY": "service-role",
        },
        env_files=[],
    )
    assert not settings.local
    assert isinstance(open_llm(settings), FakeLLM)


def test_env_file_fills_blanks_and_does_not_override(tmp_path: Path):
    path = tmp_path / ".env.local"
    path.write_text(
        "TRENDWATCH_SECTOR_SLUG=from-file\nTRENDWATCH_GEMINI_MODEL=gemini-2.5-flash\n",
        encoding="utf-8",
    )
    values = {"TRENDWATCH_SECTOR_SLUG": "from-env"}
    apply_env_file(path, values)
    assert values["TRENDWATCH_SECTOR_SLUG"] == "from-env"
    assert values["TRENDWATCH_GEMINI_MODEL"] == "gemini-2.5-flash"
