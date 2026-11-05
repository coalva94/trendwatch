# Desarrollo

El panel en modo demo se arranca desde el [README](../README.md). Aquí está el resto: tests, jobs y cómo añadir un sector.

Hace falta Node 20.9 o superior. Los jobs piden Python 3.11.

## Tests

```bash
npm test
npm run lint
npm run typecheck
pip install -r scripts/requirements.txt
pytest
ruff check scripts
```

Los tests sustituyen la base y el modelo por dobles en memoria. No hace falta red ni secretos.

## Jobs

Sin claves, los scripts leen `.env` y `.env.local` y siguen adelante. La clasificación usa las palabras clave del sector, no un modelo. Los datos quedan en `data/local/store.json`, que no se versiona. Con `TRENDWATCH_SUPABASE_URL` (https) y `TRENDWATCH_SUPABASE_SERVICE_ROLE_KEY` escriben en Supabase. `TRENDWATCH_GEMINI_API_KEY` es opcional: si está, Gemini clasifica, compara la zona gris de duplicados y redacta el informe.

```bash
python scripts/seed_sector.py
python scripts/ingest.py
python scripts/dedup.py
python scripts/weekly_report.py
```

La ingesta diaria también agrupa duplicados al terminar. `scripts/dedup.py` repite solo ese paso. La agrupación une titulares con bastante solapamiento de tokens normalizados. En la zona gris, y solo si hay clave de Gemini, pregunta al modelo si es la misma noticia.

El informe semanal cubre el lunes a domingo UTC anterior. El cron de GitHub Actions corre los lunes a las 07:00 UTC, después de la ingesta de las 06:00 UTC. Horarios, secretos y el panel en Vercel: [despliegue](despliegue.md).

## Añadir un sector

1. Copia `data/sectors/renewable-energy.json` a `data/sectors/<slug>.json`.
2. Cambia `slug`, nombre, descripción, temas (con `keywords`) y fuentes. Solo URLs `http` o `https` públicas. `kind` es `rss` o `google_news`.
3. En local, `TRENDWATCH_SECTOR_SLUG=<slug>`. En modo demo verás las fuentes y un feed vacío hasta que exista un job. El sector `renewable-energy` trae titulares de demostración.
4. Con Supabase configurado: `python scripts/seed_sector.py`. Hace upsert por slug y desactiva temas o fuentes que hayas quitado del archivo. Las noticias se quedan.
5. El cron diario usa `TRENDWATCH_SECTOR_SLUG`. Un sector nuevo es otro archivo y otra variable.

## Alta de un feed

Al añadir un feed, el servidor solo acepta `http` o `https`, sin usuario ni contraseña, en el puerto 80 o 443. Resuelve el host y rechaza loopback, redes privadas, link-local (incluida la metadata de los cloud) y nombres como `localhost` o `*.internal`. Las redirecciones se vuelven a comprobar. Hay una ventana de DNS rebinding entre la resolución y la conexión. Fijar la IP resuelta está en la hoja de ruta.

## Temas sugeridos en GitHub

`market-intelligence` `rss` `nextjs` `supabase` `gemini` `llm` `python` `portfolio` `renewable-energy`
