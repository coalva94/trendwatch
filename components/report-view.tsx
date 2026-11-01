import { AlertTriangle, Calendar, Sparkles, TrendingUp } from "lucide-react";

import { panelClass } from "@/components/styles";
import { formatDay } from "@/lib/format";
import type { WeeklyReport } from "@/lib/types";

const SECTIONS = [
  { key: "trends", title: "Tendencias", icon: TrendingUp },
  { key: "opportunities", title: "Oportunidades", icon: Sparkles },
  { key: "alerts", title: "Alertas", icon: AlertTriangle },
  { key: "events", title: "Próximos eventos", icon: Calendar },
] as const;

export function ReportView({ report, compact = false }: { report: WeeklyReport; compact?: boolean }) {
  const lines: Record<(typeof SECTIONS)[number]["key"], string[]> = {
    trends: report.trends,
    opportunities: report.opportunities,
    alerts: report.alerts,
    events: report.upcomingEvents,
  };
  return (
    <article className={`${panelClass} p-4`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Informe semanal</p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight">{report.title}</h2>
      <p className="mt-1 text-sm text-muted">
        {formatDay(report.weekStart)} – {formatDay(report.weekEnd)} · modelo {report.model}
      </p>
      {!compact ? <p className="mt-3 text-sm leading-6 text-ink">{report.narrative}</p> : null}
      <div className={`mt-4 grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const items = compact ? lines[section.key].slice(0, 2) : lines[section.key];
          return (
            <section key={section.key} className="rounded-xl border border-line bg-bg px-3 py-3">
              <h3 className="flex items-center gap-1.5 text-sm font-medium">
                <Icon className="size-3.5 text-accent" aria-hidden="true" />
                {section.title}
              </h3>
              {items.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Sin notas.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm leading-6 text-muted">
                  {items.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {compact ? (
        <a href="/informe" className="mt-4 inline-flex text-sm font-medium text-accent hover:underline">
          Leer el informe
        </a>
      ) : null}
    </article>
  );
}
