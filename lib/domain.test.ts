import { describe, expect, it } from "vitest";

import {
  computeKpis,
  formatRelative,
  hiddenDuplicateCount,
  visibleItems,
} from "@/lib/domain";
import type { FeedFilters, Item, Source } from "@/lib/types";

const now = new Date("2026-11-01T12:00:00Z");

const filters: FeedFilters = {
  q: "",
  topicId: "",
  sourceId: "",
  relevance: "all",
  status: "all",
  showDuplicates: false,
};

function item(partial: Partial<Item> & Pick<Item, "id" | "title" | "publishedAt">): Item {
  return {
    sectorId: "renewable-energy",
    sourceId: "src",
    externalId: partial.id,
    url: "https://news.google.com/search?q=example",
    summary: "",
    relevance: 2,
    relevanceReason: "motivo",
    topicId: "topic",
    clusterId: null,
    status: "pending",
    ...partial,
  };
}

describe("computeKpis", () => {
  it("counts the last 7 days and healthy sources", () => {
    const items = [
      item({ id: "new", title: "Nueva", publishedAt: "2026-10-30T12:00:00Z", relevance: 3, status: "pending" }),
      item({ id: "old", title: "Vieja", publishedAt: "2026-10-01T12:00:00Z", relevance: 3, status: "pending" }),
      item({ id: "low", title: "Baja", publishedAt: "2026-10-31T12:00:00Z", relevance: 1, status: "follow" }),
    ];
    const sources: Source[] = [
      {
        id: "a",
        sectorId: "s",
        slug: "a",
        name: "A",
        url: "https://example.com/a",
        kind: "rss",
        active: true,
        lastFetchedAt: null,
        lastError: null,
        lastStatus: "ok",
      },
      {
        id: "b",
        sectorId: "s",
        slug: "b",
        name: "B",
        url: "https://example.com/b",
        kind: "rss",
        active: true,
        lastFetchedAt: null,
        lastError: "timeout",
        lastStatus: "error",
      },
    ];
    expect(computeKpis(items, sources, now)).toEqual({
      recentCount: 2,
      highRelevance: 1,
      pending: 1,
      sourcesHealthy: 1,
      sourcesActive: 2,
    });
  });
});

describe("visibleItems", () => {
  const grouped = [
    item({
      id: "a",
      title: "Subasta eólica",
      publishedAt: "2026-11-01T08:00:00Z",
      clusterId: "c1",
      status: "pending",
      relevance: 3,
    }),
    item({
      id: "b",
      title: "Spanish wind auction",
      publishedAt: "2026-10-31T08:00:00Z",
      clusterId: "c1",
      status: "interesting",
      relevance: 2,
      sourceId: "other",
    }),
    item({
      id: "solo",
      title: "Hydrogen consultation",
      publishedAt: "2026-10-30T08:00:00Z",
    }),
  ];

  it("keeps one story per cluster and prefers a reviewed item", () => {
    const visible = visibleItems(grouped, filters);
    expect(visible.map((entry) => entry.id)).toEqual(["b", "solo"]);
    expect(hiddenDuplicateCount(grouped, filters)).toBe(1);
  });

  it("can show every duplicate and filter by text", () => {
    const all = visibleItems(grouped, { ...filters, showDuplicates: true, q: "auction" });
    expect(all.map((entry) => entry.id)).toEqual(["b"]);
  });
});

describe("formatRelative", () => {
  it("speaks in hours", () => {
    expect(formatRelative("2026-11-01T09:00:00Z", now)).toBe("hace 3 h");
  });
});
