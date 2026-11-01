import { Search } from "lucide-react";
import Link from "next/link";

import { fieldClass, panelClass } from "@/components/styles";
import type { FeedFilters, Source, Topic } from "@/lib/types";

const STATUSES: { value: FeedFilters["status"]; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendiente" },
  { value: "interesting", label: "Interesante" },
  { value: "follow", label: "Seguir" },
  { value: "discarded", label: "Descartada" },
];

const RELEVANCE: { value: FeedFilters["relevance"]; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: 3, label: "Prioritaria" },
  { value: 2, label: "Relevante" },
  { value: 1, label: "Tangencial" },
  { value: 0, label: "No relacionado" },
];

function hrefFor(filters: FeedFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.topicId) params.set("topic", filters.topicId);
  if (filters.sourceId) params.set("source", filters.sourceId);
  if (filters.relevance !== "all") params.set("relevance", String(filters.relevance));
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.showDuplicates) params.set("duplicates", "1");
  const query = params.toString();
  return query ? `/feed?${query}` : "/feed";
}

function Segment<T extends string | number>({
  label,
  options,
  current,
  onPick,
}: {
  label: string;
  options: { value: T; label: string }[];
  current: T;
  onPick: (value: T) => string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((option) => {
          const active = option.value === current;
          return (
            <Link
              key={String(option.value)}
              href={onPick(option.value)}
              aria-current={active ? "true" : undefined}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium lift ${
                active
                  ? "border-transparent bg-ink text-bg"
                  : "border-line bg-bg text-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function FeedFiltersForm({
  filters,
  topics,
  sources,
  shown,
  hidden,
}: {
  filters: FeedFilters;
  topics: Topic[];
  sources: Source[];
  shown: number;
  hidden: number;
}) {
  return (
    <section className={`${panelClass} space-y-4 p-4`}>
      <form action="/feed" method="get" className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        {filters.relevance !== "all" ? (
          <input type="hidden" name="relevance" value={String(filters.relevance)} />
        ) : null}
        {filters.status !== "all" ? <input type="hidden" name="status" value={filters.status} /> : null}
        {filters.showDuplicates ? <input type="hidden" name="duplicates" value="1" /> : null}
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-medium text-muted">Buscar</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Título, resumen o lectura"
              className={`${fieldClass} pl-8`}
            />
          </span>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-medium text-muted">Tema</span>
          <select name="topic" defaultValue={filters.topicId} className={fieldClass}>
            <option value="">Todos</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-medium text-muted">Fuente</span>
          <select name="source" defaultValue={filters.sourceId} className={fieldClass}>
            <option value="">Todas</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-9 rounded-lg bg-ink px-3 text-sm font-medium text-bg lift hover:opacity-90">
          Filtrar
        </button>
      </form>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-5">
          <Segment
            label="Estado"
            options={STATUSES}
            current={filters.status}
            onPick={(status) => hrefFor({ ...filters, status })}
          />
          <Segment
            label="Relevancia"
            options={RELEVANCE}
            current={filters.relevance}
            onPick={(relevance) => hrefFor({ ...filters, relevance })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={hrefFor({ ...filters, showDuplicates: !filters.showDuplicates })}
            aria-current={filters.showDuplicates ? "true" : undefined}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium lift ${
              filters.showDuplicates
                ? "border-transparent bg-accent-soft text-accent"
                : "border-line text-muted hover:text-ink"
            }`}
          >
            Mostrar duplicados
          </Link>
          <Link href="/feed" className="text-xs font-medium text-muted underline-offset-2 hover:text-ink hover:underline">
            Limpiar
          </Link>
        </div>
      </div>
      <p className="font-mono text-xs text-muted">
        {shown} {shown === 1 ? "historia" : "historias"}
        {hidden > 0 ? ` · ${hidden} duplicados agrupados` : ""}
      </p>
    </section>
  );
}
