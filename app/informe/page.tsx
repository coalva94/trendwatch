import type { Metadata } from "next";

import { ReportView } from "@/components/report-view";
import { loadWorkspace } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Informe" };

export default async function ReportPage() {
  const workspace = await loadWorkspace();
  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-serif text-4xl tracking-tight">Informe</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          El job semanal redacta tendencias, oportunidades, alertas y eventos a partir de las noticias ya clasificadas. No publica ni borra fuentes.
        </p>
      </section>
      {workspace.report ? (
        <ReportView report={workspace.report} />
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-sm text-muted">
          Todavía no hay un informe para {workspace.sector.name}.
        </p>
      )}
    </div>
  );
}
