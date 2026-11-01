import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ReportView } from "@/components/report-view";
import { loadWorkspace } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Informe" };

export default async function ReportPage() {
  const workspace = await loadWorkspace();
  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Semana"
        title="Informe"
        description="El job semanal redacta tendencias, oportunidades, alertas y eventos a partir de las noticias ya clasificadas. No publica ni borra fuentes."
      />
      {workspace.report ? (
        <ReportView report={workspace.report} />
      ) : (
        <EmptyState icon={FileText} title="Sin informe todavía">
          Todavía no hay un informe para {workspace.sector.name}.
        </EmptyState>
      )}
    </div>
  );
}
