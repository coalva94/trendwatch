import { ItemCard } from "@/components/item-card";
import { ReportView } from "@/components/report-view";
import { clusterMates, computeKpis, formatRelative, visibleItems } from "@/lib/domain";
import { loadWorkspace } from "@/lib/data/repository";
import { formatStamp } from "@/lib/format";
import { HEALTH_LABEL } from "@/lib/labels";

export default async function HomePage() {
  const workspace = await loadWorkspace();
  const now = new Date();
  const kpis = computeKpis(workspace.items, workspace.sources, now);
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
    ["Noticias", String(kpis.recentCount), "publicadas en 7 días"],
    ["Prioritarias", String(kpis.highRelevance), "relevancia 2 o 3"],
    ["Pendientes", String(kpis.pending), "siguen sin revisar"],
    ["Fuentes sanas", `${kpis.sourcesHealthy}/${kpis.sourcesActive}`, "última lectura correcta"],
  ];

  return (
    <div className="space-y-8">
      <section>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Últimos 7 días</p>
        <h1 className="mt-1 font-serif text-4xl tracking-tight">{workspace.sector.name}</h1>
        <p className="mt-2 max-w-2xl text-muted">{workspace.sector.description}</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, hint]) => (
          <article key={label} className="rounded-2xl border border-line bg-paper-2 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
            <p className="mt-1 font-serif text-4xl">{value}</p>
            <p className="text-sm text-muted">{hint}</p>
          </article>
        ))}
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-2xl">Pendientes de revisión</h2>
            <a href="/feed?status=pending" className="text-sm text-pine-deep underline-offset-2 hover:underline">
              Ver la cola
            </a>
          </div>
          {pending.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted">
              No hay noticias pendientes de los últimos 7 días.
            </p>
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
        <aside className="space-y-4">
          <section className="rounded-2xl border border-line bg-paper-2 p-4">
            <h2 className="font-serif text-2xl">Sincronización</h2>
            {workspace.sync ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Última ingesta</dt>
                  <dd>{workspace.sync.finishedAt ? formatRelative(workspace.sync.finishedAt, now) : "en curso"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Estado</dt>
                  <dd>{workspace.sync.status === "ok" ? "Correcta" : workspace.sync.status === "error" ? "Con errores" : "En curso"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Leídas / nuevas</dt>
                  <dd>
                    {workspace.sync.itemsRead} / {workspace.sync.itemsNew}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Detalle</dt>
                  <dd className="mt-1">{workspace.sync.message}</dd>
                  {workspace.sync.finishedAt ? (
                    <dd className="mt-1 font-mono text-xs text-muted">{formatStamp(workspace.sync.finishedAt)}</dd>
                  ) : null}
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted">Todavía no hay una ingesta. El job diario llena esta ficha.</p>
            )}
            <ul className="mt-4 space-y-1 text-sm">
              {workspace.sources.map((source) => (
                <li key={source.id} className="flex justify-between gap-3">
                  <span className="truncate">{source.name}</span>
                  <span className={source.lastStatus === "error" ? "text-clay" : "text-muted"}>
                    {HEALTH_LABEL[source.lastStatus]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          {workspace.report ? (
            <ReportView report={workspace.report} compact />
          ) : (
            <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted">
              El informe semanal aparece aquí cuando el job lo escribe.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
