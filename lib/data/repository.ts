import { cache } from "react";

import { readConfig } from "@/lib/config";
import { readDemoOverlay, writeDemoOverlay } from "@/lib/data/demo-session";
import { insertSource, loadSupabaseWorkspace, patchItemStatus } from "@/lib/data/supabase";
import { buildDemoWorkspace } from "@/lib/demo/fixtures";
import { applyOverlay, withSource, withStatus } from "@/lib/demo/overlay";
import { slugify } from "@/lib/feeds/validate";
import { readSectorCatalog, sectorCatalogDir } from "@/lib/sectors";
import type { ItemStatus, Source, SourceKind, Workspace } from "@/lib/types";

export const loadWorkspace = cache(async (): Promise<Workspace> => {
  const config = readConfig();
  if (!config.demoMode) {
    if (!config.supabaseUrl || !config.anonKey) {
      throw new Error(
        "Faltan TRENDWATCH_SUPABASE_URL y TRENDWATCH_SUPABASE_ANON_KEY. Para probar sin claves, TRENDWATCH_DEMO_MODE=true.",
      );
    }
    return loadSupabaseWorkspace({
      url: config.supabaseUrl,
      anonKey: config.anonKey,
      sectorSlug: config.sectorSlug,
    });
  }
  const catalog = readSectorCatalog(sectorCatalogDir());
  const sector = catalog.find((entry) => entry.slug === config.sectorSlug);
  if (!sector) {
    const available = catalog.map((entry) => entry.slug).join(", ") || "ninguno";
    throw new Error(`No existe el sector "${config.sectorSlug}". Disponibles: ${available}.`);
  }
  const overlay = await readDemoOverlay();
  return applyOverlay(buildDemoWorkspace(sector, new Date()), overlay);
});

function uniqueSlug(name: string, taken: Set<string>): string {
  const base = slugify(name);
  if (!taken.has(base)) return base;
  let index = 2;
  while (taken.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

export async function saveItemStatus(itemId: string, status: ItemStatus): Promise<void> {
  const workspace = await loadWorkspace();
  if (!workspace.items.some((item) => item.id === itemId)) {
    throw new Error("Esa noticia no está en el sector activo.");
  }
  if (workspace.demoMode) {
    const overlay = await readDemoOverlay();
    await writeDemoOverlay(withStatus(overlay, itemId, status));
    return;
  }
  const config = readConfig();
  if (!config.serviceRoleKey) {
    throw new Error("Falta TRENDWATCH_SUPABASE_SERVICE_ROLE_KEY para guardar la revisión.");
  }
  await patchItemStatus({
    url: config.supabaseUrl,
    serviceRoleKey: config.serviceRoleKey,
    sectorId: workspace.sector.id,
    itemId,
    status,
  });
}

export async function saveSource(input: {
  name: string;
  feedUrl: string;
  kind: SourceKind;
}): Promise<void> {
  const workspace = await loadWorkspace();
  if (workspace.sources.some((source) => source.url === input.feedUrl)) {
    throw new Error("Esa fuente ya está en el sector.");
  }
  const slug = uniqueSlug(
    input.name,
    new Set(workspace.sources.map((source) => source.slug)),
  );
  if (workspace.demoMode) {
    const source: Source = {
      id: `${workspace.sector.id}:${slug}`,
      sectorId: workspace.sector.id,
      slug,
      name: input.name,
      url: input.feedUrl,
      kind: input.kind,
      active: true,
      lastFetchedAt: new Date().toISOString(),
      lastError: null,
      lastStatus: "ok",
    };
    const overlay = await readDemoOverlay();
    await writeDemoOverlay(withSource(overlay, source));
    return;
  }
  const config = readConfig();
  if (!config.serviceRoleKey) {
    throw new Error("Falta TRENDWATCH_SUPABASE_SERVICE_ROLE_KEY para añadir fuentes.");
  }
  await insertSource({
    url: config.supabaseUrl,
    serviceRoleKey: config.serviceRoleKey,
    source: {
      sectorId: workspace.sector.id,
      slug,
      name: input.name,
      feedUrl: input.feedUrl,
      kind: input.kind,
    },
  });
}
