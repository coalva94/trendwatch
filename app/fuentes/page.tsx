import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { SourceForm } from "@/components/source-form";
import { panelClass } from "@/components/styles";
import { loadWorkspace } from "@/lib/data/repository";
import { formatStamp } from "@/lib/format";
import { HEALTH_LABEL, KIND_LABEL } from "@/lib/labels";

export const metadata: Metadata = { title: "Fuentes" };

export default async function SourcesPage() {
  const workspace = await loadWorkspace();
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Cobertura"
        title="Fuentes"
        description={`Cada fuente es un feed público del sector ${workspace.sector.name}. La salud muestra la última lectura y el último error.`}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <SourceForm />
        <div className="space-y-3">
          {workspace.sources.map((source) => (
            <article key={source.id} className={`${panelClass} p-4 lift`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 rounded-full ${
                        source.lastStatus === "ok"
                          ? "bg-good"
                          : source.lastStatus === "error"
                            ? "bg-bad"
                            : "bg-faint"
                      }`}
                      aria-hidden="true"
                    />
                    <h2 className="font-medium tracking-tight">{source.name}</h2>
                  </div>
                  <a
                    href={source.url}
                    className="mt-1 block break-all text-sm text-accent hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.url}
                  </a>
                </div>
                <span className="rounded-full border border-line bg-muted-bg px-2 py-1 text-xs font-medium">
                  {KIND_LABEL[source.kind]}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted">Estado</dt>
                  <dd className={source.lastStatus === "error" ? "text-bad" : "text-ink"}>
                    {HEALTH_LABEL[source.lastStatus]}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Última lectura</dt>
                  <dd>{source.lastFetchedAt ? formatStamp(source.lastFetchedAt) : "Nunca"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Último error</dt>
                  <dd className={source.lastError ? "text-bad" : ""}>{source.lastError ?? "Ninguno"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
