-- Example sector. Slugs and feed URLs match data/sectors/renewable-energy.json.
-- Headlines are not seeded: the daily job inserts them. Demo mode has its own fixtures.

insert into sectors (slug, name, description)
values (
  'renewable-energy',
  'Energía renovable',
  'Solar, eólica, almacenamiento, redes y política energética. Las fuentes son feeds públicos y consultas de Google News.'
)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    active = true;

insert into topics (sector_id, slug, name, description, keywords)
select s.id, v.slug, v.name, v.description, v.keywords
from sectors s
join (
  values
    ('solar', 'Solar fotovoltaica', 'Módulos, plantas, fabricación y contratos solares.', array['solar', 'photovoltaic', 'pv', 'module', 'inverter']),
    ('wind', 'Eólica', 'Parques terrestres, offshore y cadena de suministro de turbinas.', array['wind', 'offshore', 'turbine', 'auction']),
    ('storage', 'Almacenamiento e hidrógeno', 'Baterías, hidrógeno y otros vectores de flexibilidad.', array['battery', 'storage', 'hydrogen', 'electrolyser', 'lfp']),
    ('policy', 'Política y subastas', 'Regulación, subastas, subsidios y PPAs.', array['policy', 'auction', 'tariff', 'ppa', 'regulation']),
    ('grids', 'Redes y demanda', 'Transmisión, curtailment, interconexión y demanda.', array['grid', 'curtailment', 'transmission', 'interconnection', 'demand'])
) as v(slug, name, description, keywords) on true
where s.slug = 'renewable-energy'
on conflict (sector_id, slug) do update
set name = excluded.name,
    description = excluded.description,
    keywords = excluded.keywords,
    active = true;

insert into sources (sector_id, slug, name, url, kind)
select s.id, v.slug, v.name, v.url, v.kind
from sectors s
join (
  values
    ('google-news-solar', 'Google News · Solar', 'https://news.google.com/rss/search?q=solar+photovoltaic+energy+when:7d&hl=en-US&gl=US&ceid=US:en', 'google_news'),
    ('google-news-wind', 'Google News · Eólica', 'https://news.google.com/rss/search?q=offshore+wind+power+when:7d&hl=en-US&gl=US&ceid=US:en', 'google_news'),
    ('google-news-storage', 'Google News · Almacenamiento', 'https://news.google.com/rss/search?q=battery+storage+renewable+energy+when:7d&hl=en-US&gl=US&ceid=US:en', 'google_news'),
    ('google-news-policy', 'Google News · Política', 'https://news.google.com/rss/search?q=renewable+energy+policy+auction+when:7d&hl=en-US&gl=US&ceid=US:en', 'google_news'),
    ('pv-magazine', 'pv magazine', 'https://www.pv-magazine.com/feed/', 'rss'),
    ('cleantechnica', 'CleanTechnica', 'https://cleantechnica.com/feed/', 'rss'),
    ('canary-media', 'Canary Media', 'https://www.canarymedia.com/rss.rss', 'rss'),
    ('renewable-energy-world', 'Renewable Energy World', 'https://www.renewableenergyworld.com/feed/', 'rss')
) as v(slug, name, url, kind) on true
where s.slug = 'renewable-energy'
on conflict (sector_id, url) do update
set name = excluded.name,
    slug = excluded.slug,
    kind = excluded.kind,
    active = true;
