import { Activity, Inbox } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ItemCard } from "@/components/item-card";
import { PageHeader } from "@/components/page-header";
import { ReportView } from "@/components/report-view";
import { panelClass } from "@/components/styles";
import { TrendChart } from "@/components/trend-chart";
import { loadWorkspace } from "@/lib/data/repository";
import { clusterMates, computeKpis, dailyCounts, formatRelative, visibleItems } from "@/lib/domain";
import { formatStamp } from "@/lib/format";
import { HEALTH_LABEL } from "@/lib/labels";

const KPI_HINT = [
  "publicadas en 7 días",
  "relevancia 2 o 3",
  "siguen sin revisar",
  "última lectura correcta",
] as const;

export default async function HomePage() {
  const workspace = await loadWorkspace();
  const now = new Date();
  const kpis = computeKpis(workspace.items, workspace.sources, now);
  const series = dailyCounts(workspace.items, now);
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const pending = visibleItems(
    workspace.items.filter((item) => Date.parse(item.publishedAt) >= weekAgo),
    {
      q: "",
      topicId: "",
      sourceId: "",
      relevance: "all",
      status: "pending",
      showDuplicates: false,
    },
  ).slice(0, 4);
  const topicName = new Map(workspace.topics.map((topic) => [topic.id, topic.name]));
  const sourceName = new Map(workspace.sources.map((source) => [source.id, source.name]));
  const cards = [
    { label: "Noticias", value: String(kpis.recentCount), hint: KPI_HINT[0], featured: true },
    { label: "Prioritarias", value: String(kpis.highRelevance), hint: KPI_HINT[1], featured: false },
    { label: "Pendientes", value: String(kpis.pending), hint: KPI_HINT[2], featured: false },
    {
      label: "Fuentes sanas",
      value: `${kpis.sourcesHealthy}/${kpis.sourcesActive}`,
      hint: KPI_HINT[3],
      featured: false,
    },
  ];
  const syncTone =
    workspace.sync?.status === "ok"
      ? "bg-good-soft text-good"
      : workspace.sync?.status === "error"
        ? "bg-bad-soft text-bad"
        : "bg-muted-bg text-muted";
  const syncLabel =
    workspace.sync?.status === "ok" ? "Correcta" : workspace.sync?.status === "error" ? "Con errores" : "En curso";

  return (
    <div className="space-y-6">
      <PageHeader kicker="Últimos 7 días" title={workspace.sector.name} description={workspace.sector.description} />
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className={`${panelClass} px-4 py-4 ${card.featured ? "bg-accent-soft/40" : ""}`}
          >
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{card.label}</p>
            <p className={`mt-2 font-semibold tracking-tight ${card.featured ? "text-3xl text-accent sm:text-4xl" : "text-3xl"}`}>
              {card.value}
            </p>
            <p className="mt-1 text-sm text-muted">{card.hint}</p>
          </article>
        ))}
      </section>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)]">
        <section className={`${panelClass} p-4`}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight">Actividad</h2>
            <p className="text-xs text-muted">Noticias publicadas por día</p>
          </div>
          <TrendChart points={series} />
        </section>
        <section className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-tight">
              <Activity className="size-4 text-accent" aria-hidden="true" />
              Sincronización
            </h2>
            {workspace.sync ? (
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${syncTone}`}>{syncLabel}</span>
            ) : null}
          </div>
          {workspace.sync ? (
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Última ingesta</dt>
                <dd>{workspace.sync.finishedAt ? formatRelative(workspace.sync.finishedAt, now) : "en curso"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Leídas / nuevas</dt>
                <dd className="font-mono text-xs">
                  {workspace.sync.itemsRead} / {workspace.sync.itemsNew}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Detalle</dt>
                <dd className="mt-1 leading-6">{workspace.sync.message}</dd>
                {workspace.sync.finishedAt ? (
                  <dd className="mt-1 font-mono text-xs text-muted">{formatStamp(workspace.sync.finishedAt)}</dd>
                ) : null}
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">Todavía no hay una ingesta. El job diario llena esta ficha.</p>
          )}
          <ul className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
            {workspace.sources.map((source) => (
              <li key={source.id} className="flex items-center justify-between gap-3">
                <span className="truncate">{source.name}</span>
                <span className={`shrink-0 text-xs ${source.lastStatus === "error" ? "text-bad" : "text-muted"}`}>
                  {HEALTH_LABEL[source.lastStatus]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)]">
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight">Pendientes de revisión</h2>
            <a href="/feed?status=pending" className="text-sm font-medium text-accent hover:underline">
              Ver la cola
            </a>
          </div>
          {pending.length === 0 ? (
            <EmptyState icon={Inbox} title="Cola al día">
              No hay noticias pendientes de los últimos 7 días.
            </EmptyState>
          ) : (
            pending.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                topicName={topicName.get(item.topicId ?? "") ?? "Sin tema"}
                sourceName={sourceName.get(item.sourceId) ?? "Fuente"}
                mates={clusterMates(workspace.items, item).map((mate) => ({
                  title: mate.title,
                  url: mate.url,
                  sourceName: sourceName.get(mate.sourceId) ?? "Fuente",
                }))}
              />
            ))
          )}
        </section>
        <aside>
          {workspace.report ? (
            <ReportView report={workspace.report} compact />
          ) : (
            <EmptyState icon={Inbox} title="Sin informe">
              El informe semanal aparece aquí cuando el job lo escribe.
            </EmptyState>
          )}
        </aside>
      </div>
    </div>
  );
}
