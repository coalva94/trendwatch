import type { FeedFilters, Item, ItemStatus, Kpis, Relevance, Source } from "@/lib/types";
import { ITEM_STATUSES } from "@/lib/types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function isItemStatus(value: string): value is ItemStatus {
  return (ITEM_STATUSES as readonly string[]).includes(value);
}

export function isRelevance(value: string): value is `${Relevance}` {
  return value === "0" || value === "1" || value === "2" || value === "3";
}

export function computeKpis(items: Item[], sources: Source[], now: Date): Kpis {
  const cutoff = now.getTime() - WEEK_MS;
  const recent = items.filter((item) => Date.parse(item.publishedAt) >= cutoff);
  const active = sources.filter((source) => source.active);
  return {
    recentCount: recent.length,
    highRelevance: recent.filter((item) => (item.relevance ?? -1) >= 2).length,
    pending: recent.filter((item) => item.status === "pending").length,
    sourcesHealthy: active.filter((source) => source.lastStatus === "ok").length,
    sourcesActive: active.length,
  };
}

export function matchesFilters(item: Item, filters: FeedFilters): boolean {
  if (filters.topicId && item.topicId !== filters.topicId) return false;
  if (filters.sourceId && item.sourceId !== filters.sourceId) return false;
  if (filters.status !== "all" && item.status !== filters.status) return false;
  if (filters.relevance !== "all" && item.relevance !== filters.relevance) return false;
  const q = filters.q.trim().toLowerCase();
  if (!q) return true;
  const haystack = [item.title, item.summary, item.relevanceReason ?? ""].join(" ").toLowerCase();
  return haystack.includes(q);
}

function statusRank(status: ItemStatus): number {
  if (status === "interesting" || status === "follow") return 2;
  if (status === "pending") return 1;
  return 0;
}

export function pickRepresentative(group: Item[]): Item {
  return [...group].sort((a, b) => {
    const byStatus = statusRank(b.status) - statusRank(a.status);
    if (byStatus !== 0) return byStatus;
    const byRelevance = (b.relevance ?? -1) - (a.relevance ?? -1);
    if (byRelevance !== 0) return byRelevance;
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  })[0];
}

export function sortByPublished(items: Item[]): Item[] {
  return [...items].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function visibleItems(items: Item[], filters: FeedFilters): Item[] {
  const matched = items.filter((item) => matchesFilters(item, filters));
  if (filters.showDuplicates) return sortByPublished(matched);
  const singles: Item[] = [];
  const groups = new Map<string, Item[]>();
  for (const item of matched) {
    if (!item.clusterId) {
      singles.push(item);
      continue;
    }
    const group = groups.get(item.clusterId) ?? [];
    group.push(item);
    groups.set(item.clusterId, group);
  }
  const reps = [...singles];
  for (const group of groups.values()) reps.push(pickRepresentative(group));
  return sortByPublished(reps);
}

export function hiddenDuplicateCount(items: Item[], filters: FeedFilters): number {
  const matched = items.filter((item) => matchesFilters(item, filters)).length;
  return matched - visibleItems(items, filters).length;
}

export function clusterMates(items: Item[], item: Item): Item[] {
  if (!item.clusterId) return [];
  return sortByPublished(
    items.filter((other) => other.clusterId === item.clusterId && other.id !== item.id),
  );
}

export type DayPoint = {
  date: string;
  label: string;
  count: number;
  high: number;
};

const weekday = new Intl.DateTimeFormat("es", { weekday: "short", timeZone: "UTC" });

export function dailyCounts(items: Item[], now: Date): DayPoint[] {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const points: DayPoint[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const time = start - offset * 24 * 60 * 60 * 1000;
    const date = new Date(time).toISOString().slice(0, 10);
    const label = weekday.format(new Date(time)).replace(/\./g, "");
    points.push({ date, label, count: 0, high: 0 });
  }
  const byDate = new Map(points.map((point) => [point.date, point]));
  for (const item of items) {
    const point = byDate.get(item.publishedAt.slice(0, 10));
    if (!point) continue;
    point.count += 1;
    if ((item.relevance ?? -1) >= 2) point.high += 1;
  }
  return points;
}

export function formatRelative(iso: string, now: Date): string {
  const delta = now.getTime() - Date.parse(iso);
  if (Number.isNaN(delta)) return iso;
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}
