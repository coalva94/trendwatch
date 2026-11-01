import type {
  Item,
  ItemStatus,
  Relevance,
  Sector,
  Source,
  SourceHealth,
  SourceKind,
  SyncRun,
  Topic,
  WeeklyReport,
  Workspace,
} from "@/lib/types";
import { isItemStatus } from "@/lib/domain";

type Row = Record<string, unknown>;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown): boolean {
  return value === true;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function relevance(value: unknown): Relevance | null {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  return null;
}

function kind(value: unknown): SourceKind {
  return value === "google_news" ? "google_news" : "rss";
}

function health(value: unknown): SourceHealth {
  if (value === "ok" || value === "error" || value === "never") return value;
  return "never";
}

async function rest<T>(
  url: string,
  key: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase respondió ${response.status}: ${detail.slice(0, 240)}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function mapSector(row: Row): Sector {
  return {
    id: asString(row.id),
    slug: asString(row.slug),
    name: asString(row.name),
    description: asString(row.description),
    active: asBool(row.active),
  };
}

function mapTopic(row: Row): Topic {
  return {
    id: asString(row.id),
    sectorId: asString(row.sector_id),
    slug: asString(row.slug),
    name: asString(row.name),
    description: asString(row.description),
    keywords: stringList(row.keywords),
    active: asBool(row.active),
  };
}

function mapSource(row: Row): Source {
  return {
    id: asString(row.id),
    sectorId: asString(row.sector_id),
    slug: asString(row.slug),
    name: asString(row.name),
    url: asString(row.url),
    kind: kind(row.kind),
    active: asBool(row.active),
    lastFetchedAt: typeof row.last_fetched_at === "string" ? row.last_fetched_at : null,
    lastError: typeof row.last_error === "string" ? row.last_error : null,
    lastStatus: health(row.last_status),
  };
}

function mapItem(row: Row): Item {
  const status = asString(row.status);
  return {
    id: asString(row.id),
    sectorId: asString(row.sector_id),
    sourceId: asString(row.source_id),
    externalId: asString(row.external_id),
    title: asString(row.title),
    url: asString(row.url),
    summary: asString(row.summary),
    publishedAt: asString(row.published_at),
    relevance: relevance(row.relevance),
    relevanceReason: typeof row.relevance_reason === "string" ? row.relevance_reason : null,
    topicId: typeof row.topic_id === "string" ? row.topic_id : null,
    clusterId: typeof row.cluster_id === "string" ? row.cluster_id : null,
    status: isItemStatus(status) ? status : "pending",
  };
}

function mapSync(row: Row): SyncRun {
  const status = asString(row.status);
  const kindValue = asString(row.kind);
  return {
    id: asString(row.id),
    sectorId: asString(row.sector_id),
    kind: kindValue === "dedup" || kindValue === "report" ? kindValue : "ingest",
    startedAt: asString(row.started_at),
    finishedAt: typeof row.finished_at === "string" ? row.finished_at : null,
    status: status === "running" || status === "error" ? status : "ok",
    itemsRead: Number(row.items_read ?? 0),
    itemsNew: Number(row.items_new ?? 0),
    itemsClassified: Number(row.items_classified ?? 0),
    message: asString(row.message),
  };
}

function mapReport(row: Row): WeeklyReport {
  return {
    id: asString(row.id),
    sectorId: asString(row.sector_id),
    weekStart: asString(row.week_start).slice(0, 10),
    weekEnd: asString(row.week_end).slice(0, 10),
    title: asString(row.title),
    trends: stringList(row.trends),
    opportunities: stringList(row.opportunities),
    alerts: stringList(row.alerts),
    upcomingEvents: stringList(row.upcoming_events),
    narrative: asString(row.narrative),
    model: asString(row.model),
    createdAt: asString(row.created_at),
  };
}

export async function loadSupabaseWorkspace(options: {
  url: string;
  anonKey: string;
  sectorSlug: string;
}): Promise<Workspace> {
  const sectors = await rest<Row[]>(
    options.url,
    options.anonKey,
    `sectors?slug=eq.${encodeURIComponent(options.sectorSlug)}&select=*&limit=1`,
  );
  const sectorRow = sectors[0];
  if (!sectorRow) {
    throw new Error(
      `No existe el sector "${options.sectorSlug}" en Supabase. Cárgalo con scripts/seed_sector.py.`,
    );
  }
  const sector = mapSector(sectorRow);
  const query = `sector_id=eq.${sector.id}`;
  const [topics, sources, items, runs, reports] = await Promise.all([
    rest<Row[]>(options.url, options.anonKey, `topics?${query}&select=*&order=name.asc`),
    rest<Row[]>(options.url, options.anonKey, `sources?${query}&select=*&order=name.asc`),
    rest<Row[]>(
      options.url,
      options.anonKey,
      `items?${query}&select=*&order=published_at.desc&limit=300`,
    ),
    rest<Row[]>(
      options.url,
      options.anonKey,
      `sync_runs?${query}&kind=eq.ingest&select=*&order=started_at.desc&limit=1`,
    ),
    rest<Row[]>(
      options.url,
      options.anonKey,
      `weekly_reports?${query}&select=*&order=week_start.desc&limit=1`,
    ),
  ]);
  return {
    demoMode: false,
    sector,
    topics: topics.filter((row) => row.active !== false).map(mapTopic),
    sources: sources.map(mapSource),
    items: items.map(mapItem),
    sync: runs[0] ? mapSync(runs[0]) : null,
    report: reports[0] ? mapReport(reports[0]) : null,
  };
}

export async function patchItemStatus(options: {
  url: string;
  serviceRoleKey: string;
  sectorId: string;
  itemId: string;
  status: ItemStatus;
}): Promise<void> {
  const rows = await rest<Row[]>(
    options.url,
    options.serviceRoleKey,
    `items?id=eq.${encodeURIComponent(options.itemId)}&sector_id=eq.${encodeURIComponent(options.sectorId)}`,
    {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        status: options.status,
        status_updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!rows?.length) throw new Error("Esa noticia no está en el sector activo.");
}

export async function insertSource(options: {
  url: string;
  serviceRoleKey: string;
  source: {
    sectorId: string;
    slug: string;
    name: string;
    feedUrl: string;
    kind: SourceKind;
  };
}): Promise<void> {
  await rest(
    options.url,
    options.serviceRoleKey,
    "sources",
    {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({
        sector_id: options.source.sectorId,
        slug: options.source.slug,
        name: options.source.name,
        url: options.source.feedUrl,
        kind: options.source.kind,
        active: true,
        last_status: "ok",
        last_error: null,
        last_fetched_at: new Date().toISOString(),
      }),
    },
  );
}
