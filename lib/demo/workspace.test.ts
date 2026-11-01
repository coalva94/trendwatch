import { describe, expect, it } from "vitest";

import { readConfig } from "@/lib/config";
import { computeKpis } from "@/lib/domain";
import { buildDemoWorkspace } from "@/lib/demo/fixtures";
import { applyOverlay, parseOverlay, withStatus } from "@/lib/demo/overlay";
import { readSectorCatalog, sectorCatalogDir } from "@/lib/sectors";

describe("sector catalog", () => {
  it("loads the renewable energy example", () => {
    const catalog = readSectorCatalog(sectorCatalogDir());
    const sector = catalog.find((entry) => entry.slug === "renewable-energy");
    expect(sector?.sources.length).toBeGreaterThanOrEqual(4);
    expect(sector?.topics.map((topic) => topic.slug)).toContain("wind");
    for (const source of sector?.sources ?? []) {
      expect(source.url.startsWith("https://")).toBe(true);
    }
  });
});

describe("demo workspace", () => {
  const now = new Date("2026-11-01T12:00:00Z");

  it("ships a reviewable week with grouped stories", () => {
    const sector = readSectorCatalog(sectorCatalogDir()).find((entry) => entry.slug === "renewable-energy");
    if (!sector) throw new Error("falta el sector de ejemplo");
    const workspace = buildDemoWorkspace(sector, now);
    expect(workspace.items.length).toBeGreaterThan(15);
    expect(workspace.report?.trends.length).toBeGreaterThan(0);
    expect(workspace.sources.some((source) => source.lastStatus === "error")).toBe(true);
    const clusters = new Map<string, number>();
    for (const item of workspace.items) {
      expect(workspace.sources.some((source) => source.id === item.sourceId)).toBe(true);
      expect(workspace.topics.some((topic) => topic.id === item.topicId)).toBe(true);
      if (!item.clusterId) continue;
      clusters.set(item.clusterId, (clusters.get(item.clusterId) ?? 0) + 1);
    }
    expect([...clusters.values()].some((size) => size >= 3)).toBe(true);
    const kpis = computeKpis(workspace.items, workspace.sources, now);
    expect(kpis.recentCount).toBe(workspace.items.length);
    expect(kpis.pending).toBeGreaterThan(0);
  });

  it("keeps an empty shell for a sector without fixtures", () => {
    const workspace = buildDemoWorkspace(
      {
        slug: "logistics",
        name: "Logística",
        description: "Ejemplo vacío.",
        topics: [{ slug: "ports", name: "Puertos", description: "Puertos.", keywords: ["port"] }],
        sources: [
          {
            slug: "port-news",
            name: "Port news",
            url: "https://news.google.com/rss/search?q=ports",
            kind: "google_news",
          },
        ],
      },
      now,
    );
    expect(workspace.items).toEqual([]);
    expect(workspace.report).toBeNull();
  });
});

describe("demo overlay", () => {
  it("round-trips a review without dropping unknown JSON", () => {
    const overlay = withStatus({ statuses: {}, sources: [] }, "item-wind-1", "interesting");
    const parsed = parseOverlay(JSON.stringify(overlay));
    expect(parsed.statuses["item-wind-1"]).toBe("interesting");
    expect(parseOverlay("{")).toEqual({ statuses: {}, sources: [] });
  });

  it("applies the review on top of the fixture", () => {
    const sector = readSectorCatalog(sectorCatalogDir()).find((entry) => entry.slug === "renewable-energy");
    if (!sector) throw new Error("falta el sector de ejemplo");
    const base = buildDemoWorkspace(sector, new Date("2026-11-01T12:00:00Z"));
    const next = applyOverlay(base, withStatus({ statuses: {}, sources: [] }, "item-wind-1", "discarded"));
    expect(next.items.find((item) => item.id === "item-wind-1")?.status).toBe("discarded");
  });
});

describe("readConfig", () => {
  it("defaults to demo mode when keys are missing or placeholders", () => {
    expect(readConfig({}).demoMode).toBe(true);
    expect(
      readConfig({
        TRENDWATCH_SUPABASE_URL: "https://example.supabase.co",
        TRENDWATCH_SUPABASE_ANON_KEY: "public-anon-key",
      }).demoMode,
    ).toBe(true);
    expect(
      readConfig({
        TRENDWATCH_DEMO_MODE: "false",
        TRENDWATCH_SUPABASE_URL: "https://abcd.supabase.co",
        TRENDWATCH_SUPABASE_ANON_KEY: "anon",
      }).demoMode,
    ).toBe(false);
  });
});
