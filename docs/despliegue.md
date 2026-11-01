# Despliegue

El panel es un proyecto Next.js y se despliega en Vercel. Los jobs corren en GitHub Actions, no en Vercel. La app no llama al modelo: Gemini solo lo usan los scripts de Python.

Arranque local y modo demo: [README](../README.md). Tests, jobs manuales y un sector nuevo: [desarrollo](desarrollo.md).

## Variables

Copia `.env.example` a `.env.local`. El prefijo es `TRENDWATCH_`.

| Variable | Dónde | Uso |
| --- | --- | --- |
| `TRENDWATCH_DEMO_MODE` | Local y Vercel | `true` arranca sin Supabase. En Vercel, `false` cuando la base esté lista. |
| `TRENDWATCH_SECTOR_SLUG` | Local, Vercel y Actions | Sector visible. Por defecto `renewable-energy`. |
| `TRENDWATCH_SUPABASE_URL` | Vercel y Actions | Proyecto de Supabase. |
| `TRENDWATCH_SUPABASE_ANON_KEY` | Vercel | Lectura. Es pública por diseño. RLS limita lo que puede hacer. |
| `TRENDWATCH_SUPABASE_SERVICE_ROLE_KEY` | Vercel (servidor) y Actions | Guardar revisiones, fuentes y el resultado de los jobs. No llega al navegador. |
| `TRENDWATCH_GEMINI_API_KEY` | Actions | Clasificación y informe. |
| `TRENDWATCH_GEMINI_MODEL` | Actions | Opcional. Por defecto `gemini-2.5-flash`. |

Sin URL y anon key de Supabase, el panel entra en modo demo aunque la bandera no esté puesta.

## GitHub Actions

CI (`.github/workflows/ci.yml`) corre en cada push a `main` y en cada pull request: lint, typecheck, tests, build en modo demo y pytest. No usa secretos.

| Workflow | Cuándo | Qué hace |
| --- | --- | --- |
| `daily_sync.yml` | `0 6 * * *` y manual | `python scripts/ingest.py` |
| `weekly_report.yml` | `0 7 * * 1` y manual | `python scripts/weekly_report.py` |

Secretos del cron:

| Secreto | Obligatorio |
| --- | --- |
| `TRENDWATCH_SUPABASE_URL` | Sí |
| `TRENDWATCH_SUPABASE_SERVICE_ROLE_KEY` | Sí |
| `TRENDWATCH_GEMINI_API_KEY` | Sí |
| `TRENDWATCH_GEMINI_MODEL` | No |
| `TRENDWATCH_SECTOR_SLUG` | No |

## Primera vez en Supabase

Aplica `supabase/migrations/` y `supabase/seed.sql`, o ejecuta `python scripts/seed_sector.py` con la service role. El seed crea el sector, los temas y las fuentes. Las noticias las inserta la ingesta. Esquema y políticas: [datos](datos.md).
