export const ITEM_STATUSES = ["pending", "interesting", "follow", "discarded"] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];

export type SourceKind = "rss" | "google_news";

export type SourceHealth = "never" | "ok" | "error";

export type Relevance = 0 | 1 | 2 | 3;

export type Sector = {
  id: string;
  slug: string;
  name: string;
  description: string;
  active: boolean;
};

export type Topic = {
  id: string;
  sectorId: string;
  slug: string;
  name: string;
  description: string;
  keywords: string[];
  active: boolean;
};

export type Source = {
  id: string;
  sectorId: string;
  slug: string;
  name: string;
  url: string;
  kind: SourceKind;
  active: boolean;
  lastFetchedAt: string | null;
  lastError: string | null;
  lastStatus: SourceHealth;
};

export type Item = {
  id: string;
  sectorId: string;
  sourceId: string;
  externalId: string;
  title: string;
  url: string;
  summary: string;
  publishedAt: string;
  relevance: Relevance | null;
  relevanceReason: string | null;
  topicId: string | null;
  clusterId: string | null;
  status: ItemStatus;
};

export type SyncRun = {
  id: string;
  sectorId: string;
  kind: "ingest" | "dedup" | "report";
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "ok" | "error";
  itemsRead: number;
  itemsNew: number;
  itemsClassified: number;
  message: string;
};

export type WeeklyReport = {
  id: string;
  sectorId: string;
  weekStart: string;
  weekEnd: string;
  title: string;
  trends: string[];
  opportunities: string[];
  alerts: string[];
  upcomingEvents: string[];
  narrative: string;
  model: string;
  createdAt: string;
};

export type Workspace = {
  demoMode: boolean;
  sector: Sector;
  topics: Topic[];
  sources: Source[];
  items: Item[];
  sync: SyncRun | null;
  report: WeeklyReport | null;
};

export type FeedFilters = {
  q: string;
  topicId: string;
  sourceId: string;
  relevance: Relevance | "all";
  status: ItemStatus | "all";
  showDuplicates: boolean;
};

export type Kpis = {
  recentCount: number;
  highRelevance: number;
  pending: number;
  sourcesHealthy: number;
  sourcesActive: number;
};

export type ActionState = {
  message: string;
  tone: "idle" | "ok" | "error";
};

export type SectorFile = {
  slug: string;
  name: string;
  description: string;
  topics: {
    slug: string;
    name: string;
    description: string;
    keywords: string[];
  }[];
  sources: {
    slug: string;
    name: string;
    url: string;
    kind: SourceKind;
  }[];
};
