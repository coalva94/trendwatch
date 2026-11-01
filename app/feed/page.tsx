import type { Metadata } from "next";
import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { FeedFiltersForm } from "@/components/feed-filters";
import { ItemCard } from "@/components/item-card";
import { PageHeader } from "@/components/page-header";
import { clusterMates, hiddenDuplicateCount, isItemStatus, isRelevance, visibleItems } from "@/lib/domain";
import { loadWorkspace } from "@/lib/data/repository";
import type { FeedFilters, Relevance } from "@/lib/types";

export const metadata: Metadata = { title: "Feed" };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const relevanceRaw = first(params.relevance);
  const statusRaw = first(params.status);
  const filters: FeedFilters = {
    q: first(params.q),
    topicId: first(params.topic),
    sourceId: first(params.source),
    relevance: isRelevance(relevanceRaw) ? (Number(relevanceRaw) as Relevance) : "all",
    status: isItemStatus(statusRaw) ? statusRaw : "all",
    showDuplicates: first(params.duplicates) === "1",
  };
  const workspace = await loadWorkspace();
  const visible = visibleItems(workspace.items, filters);
  const hidden = hiddenDuplicateCount(workspace.items, filters);
  const topicName = new Map(workspace.topics.map((topic) => [topic.id, topic.name]));
  const sourceName = new Map(workspace.sources.map((source) => [source.id, source.name]));

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Revisión"
        title="Feed"
        description="Interesante, seguir y descartar cambian el estado. Deshacer vuelve a pendiente. Ninguna acción borra la noticia."
      />
      <FeedFiltersForm
        filters={filters}
        topics={workspace.topics}
        sources={workspace.sources}
        shown={visible.length}
        hidden={hidden}
      />
      {visible.length === 0 ? (
        <EmptyState icon={Inbox} title={workspace.items.length === 0 ? "Todavía vacío" : "Sin coincidencias"}>
          {workspace.items.length === 0
            ? "Este sector todavía no tiene noticias. Llegarán con la ingesta diaria."
            : "Ninguna noticia coincide con el filtro."}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              topicName={topicName.get(item.topicId ?? "") ?? "Sin tema"}
              sourceName={sourceName.get(item.sourceId) ?? "Fuente"}
              mates={
                filters.showDuplicates
                  ? []
                  : clusterMates(workspace.items, item).map((mate) => ({
                      title: mate.title,
                      url: mate.url,
                      sourceName: sourceName.get(mate.sourceId) ?? "Fuente",
                    }))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
