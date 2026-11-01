-- trendwatch: sector-scoped market watch.
-- Jobs use the service role (bypasses RLS). The anon key can read.
-- Authenticated users may change the review status and add a source.
-- Items are never deleted by the app. Discard is a status.

create table sectors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint sectors_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references sectors (id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null default '',
  keywords text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (sector_id, slug),
  constraint topics_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references sectors (id) on delete cascade,
  slug text not null,
  name text not null,
  url text not null,
  kind text not null,
  active boolean not null default true,
  last_fetched_at timestamptz,
  last_error text,
  last_status text not null default 'never',
  created_at timestamptz not null default now(),
  unique (sector_id, slug),
  unique (sector_id, url),
  constraint sources_kind check (kind in ('rss', 'google_news')),
  constraint sources_last_status check (last_status in ('never', 'ok', 'error')),
  constraint sources_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table clusters (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references sectors (id) on delete cascade,
  fingerprint text not null,
  title text not null,
  created_at timestamptz not null default now(),
  unique (sector_id, fingerprint)
);

create table items (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references sectors (id) on delete cascade,
  source_id uuid not null references sources (id) on delete restrict,
  external_id text not null,
  title text not null,
  url text not null,
  summary text not null default '',
  published_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  relevance smallint,
  relevance_reason text,
  topic_id uuid references topics (id) on delete set null,
  cluster_id uuid references clusters (id) on delete set null,
  status text not null default 'pending',
  status_updated_at timestamptz,
  unique (source_id, external_id),
  constraint items_relevance check (relevance is null or relevance between 0 and 3),
  constraint items_status check (status in ('pending', 'interesting', 'follow', 'discarded'))
);

create table sync_runs (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references sectors (id) on delete cascade,
  kind text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  status text not null,
  items_read integer not null default 0,
  items_new integer not null default 0,
  items_classified integer not null default 0,
  message text not null default '',
  constraint sync_runs_kind check (kind in ('ingest', 'dedup', 'report')),
  constraint sync_runs_status check (status in ('running', 'ok', 'error'))
);

create table weekly_reports (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references sectors (id) on delete cascade,
  week_start date not null,
  week_end date not null,
  title text not null,
  trends jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  alerts jsonb not null default '[]'::jsonb,
  upcoming_events jsonb not null default '[]'::jsonb,
  narrative text not null default '',
  model text not null,
  created_at timestamptz not null default now(),
  unique (sector_id, week_start),
  constraint weekly_reports_lists check (
    jsonb_typeof(trends) = 'array'
    and jsonb_typeof(opportunities) = 'array'
    and jsonb_typeof(alerts) = 'array'
    and jsonb_typeof(upcoming_events) = 'array'
  )
);

create index topics_sector_idx on topics (sector_id);
create index sources_sector_idx on sources (sector_id);
create index items_sector_published_idx on items (sector_id, published_at desc);
create index items_sector_status_idx on items (sector_id, status);
create index items_cluster_idx on items (cluster_id);
create index sync_runs_sector_started_idx on sync_runs (sector_id, started_at desc);
create index weekly_reports_sector_week_idx on weekly_reports (sector_id, week_start desc);

-- Review updates from a logged-in user can change status only.
-- The service role (jobs and the Next.js server) skips this guard.
create or replace function public.enforce_item_review_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.sector_id is distinct from old.sector_id
     or new.source_id is distinct from old.source_id
     or new.external_id is distinct from old.external_id
     or new.title is distinct from old.title
     or new.url is distinct from old.url
     or new.summary is distinct from old.summary
     or new.published_at is distinct from old.published_at
     or new.fetched_at is distinct from old.fetched_at
     or new.relevance is distinct from old.relevance
     or new.relevance_reason is distinct from old.relevance_reason
     or new.topic_id is distinct from old.topic_id
     or new.cluster_id is distinct from old.cluster_id
  then
    raise exception 'Solo se puede cambiar el estado de revisión';
  end if;

  if new.status not in ('pending', 'interesting', 'follow', 'discarded') then
    raise exception 'Estado de revisión no válido';
  end if;

  new.status_updated_at := now();
  return new;
end;
$$;

create trigger items_review_update
  before update on items
  for each row
  execute function public.enforce_item_review_update();

alter table sectors enable row level security;
alter table topics enable row level security;
alter table sources enable row level security;
alter table clusters enable row level security;
alter table items enable row level security;
alter table sync_runs enable row level security;
alter table weekly_reports enable row level security;

create policy sectors_read on sectors for select to anon, authenticated using (true);
create policy topics_read on topics for select to anon, authenticated using (true);
create policy sources_read on sources for select to anon, authenticated using (true);
create policy clusters_read on clusters for select to anon, authenticated using (true);
create policy items_read on items for select to anon, authenticated using (true);
create policy sync_runs_read on sync_runs for select to anon, authenticated using (true);
create policy weekly_reports_read on weekly_reports for select to anon, authenticated using (true);

create policy items_review on items
  for update to authenticated
  using (true)
  with check (status in ('pending', 'interesting', 'follow', 'discarded'));

create policy sources_insert on sources
  for insert to authenticated
  with check (active = true and last_status in ('never', 'ok', 'error'));

grant select on sectors, topics, sources, clusters, items, sync_runs, weekly_reports
  to anon, authenticated;
grant update (status, status_updated_at) on items to authenticated;
grant insert on sources to authenticated;
