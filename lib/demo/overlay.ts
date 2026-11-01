import type { ItemStatus, Source, Workspace } from "@/lib/types";
import { isItemStatus } from "@/lib/domain";

export type DemoOverlay = {
  statuses: Partial<Record<string, ItemStatus>>;
  sources: Source[];
};

export const EMPTY_OVERLAY: DemoOverlay = { statuses: {}, sources: [] };

function isSource(value: unknown): value is Source {
  if (typeof value !== "object" || value === null) return false;
  const source = value as Source;
  return (
    typeof source.id === "string" &&
    typeof source.url === "string" &&
    typeof source.name === "string" &&
    (source.kind === "rss" || source.kind === "google_news") &&
    (source.lastStatus === "never" || source.lastStatus === "ok" || source.lastStatus === "error")
  );
}

export function parseOverlay(raw: string | undefined): DemoOverlay {
  if (!raw) return EMPTY_OVERLAY;
  try {
    const parsed = JSON.parse(raw) as { statuses?: unknown; sources?: unknown };
    const statuses: DemoOverlay["statuses"] = {};
    if (parsed.statuses && typeof parsed.statuses === "object") {
      for (const [id, status] of Object.entries(parsed.statuses)) {
        if (typeof status === "string" && isItemStatus(status)) statuses[id] = status;
      }
    }
    const sources = Array.isArray(parsed.sources) ? parsed.sources.filter(isSource) : [];
    return { statuses, sources };
  } catch {
    return EMPTY_OVERLAY;
  }
}

export function applyOverlay(base: Workspace, overlay: DemoOverlay): Workspace {
  const items = base.items.map((item) => {
    const status = overlay.statuses[item.id];
    return status ? { ...item, status } : item;
  });
  const sources = [...base.sources];
  for (const source of overlay.sources) {
    if (sources.some((existing) => existing.url === source.url)) continue;
    sources.push(source);
  }
  return { ...base, demoMode: true, items, sources };
}

export function withStatus(overlay: DemoOverlay, itemId: string, status: ItemStatus): DemoOverlay {
  return { ...overlay, statuses: { ...overlay.statuses, [itemId]: status } };
}

export function withSource(overlay: DemoOverlay, source: Source): DemoOverlay {
  return { ...overlay, sources: [...overlay.sources, source].slice(-8) };
}
