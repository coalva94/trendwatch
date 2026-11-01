import { formatDay } from "@/lib/format";
import type { WeeklyReport } from "@/lib/types";

export function ReportView({ report, compact = false }: { report: WeeklyReport; compact?: boolean }) {
  const sections = [
    ["Tendencias", report.trends],
    ["Oportunidades", report.opportunities],
    ["Alertas", report.alerts],
    ["Próximos eventos", report.upcomingEvents],
  ] as const;
  return (
    <article className="rounded-2xl border border-line bg-paper-2 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Informe semanal</p>
      <h2 className="mt-1 font-serif text-2xl">{report.title}</h2>
      <p className="mt-1 text-sm text-muted">
        {formatDay(report.weekStart)} – {formatDay(report.weekEnd)} · modelo {report.model}
      </p>
      {!compact ? <p className="mt-3 text-sm leading-6">{report.narrative}</p> : null}
      <div className={`mt-4 grid gap-4 ${compact ? "" : "md:grid-cols-2"}`}>
        {sections.map(([title, lines]) => (
          <section key={title}>
            <h3 className="text-sm font-medium">{title}</h3>
            {lines.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Sin notas.</p>
            ) : (
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-muted">
                {(compact ? lines.slice(0, 2) : lines).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {compact ? (
        <a href="/informe" className="mt-4 inline-block text-sm text-pine-deep underline-offset-2 hover:underline">
          Leer el informe
        </a>
      ) : null}
    </article>
  );
}
