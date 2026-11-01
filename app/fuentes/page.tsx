import type { Metadata } from "next";

import { SourceForm } from "@/components/source-form";
import { loadWorkspace } from "@/lib/data/repository";
import { formatStamp } from "@/lib/format";
import { HEALTH_LABEL, KIND_LABEL } from "@/lib/labels";

export const metadata: Metadata = { title: "Fuentes" };

export default async function SourcesPage() {
  const workspace = await loadWorkspace();
  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-serif text-4xl tracking-tight">Fuentes</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Cada fuente es un feed público del sector {workspace.sector.name}. La salud muestra la última lectura y el último error.
        </p>
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <SourceForm />
        <div className="space-y-3">
          {workspace.sources.map((source) => (
            <article key={source.id} className="rounded-2xl border border-line bg-paper-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-medium">{source.name}</h2>
                  <a href={source.url} className="mt-1 block break-all text-sm text-pine-deep hover:underline" target="_blank" rel="noreferrer">
                    {source.url}
                  </a>
                </div>
                <span className="rounded-full border border-line px-2 py-1 text-xs">{KIND_LABEL[source.kind]}</span>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted">Estado</dt>
                  <dd className={source.lastStatus === "error" ? "text-clay" : ""}>{HEALTH_LABEL[source.lastStatus]}</dd>
                </div>
                <div>
                  <dt className="text-muted">Última lectura</dt>
                  <dd>{source.lastFetchedAt ? formatStamp(source.lastFetchedAt) : "Nunca"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Último error</dt>
                  <dd>{source.lastError ?? "Ninguno"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
