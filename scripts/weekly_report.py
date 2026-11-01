import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from trendwatch_jobs.cli import main_weekly  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main_weekly())
