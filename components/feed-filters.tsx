import type { FeedFilters, Source, Topic } from "@/lib/types";

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
  const key = JSON.stringify(filters);
  return (
    <form key={key} action="/feed" method="get" className="rounded-2xl border border-line bg-paper-2 p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="xl:col-span-2 block text-sm">
          <span className="mb-1 block text-muted">Buscar</span>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Título, resumen o lectura"
            className="w-full rounded-xl border border-line bg-paper px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Tema</span>
          <select name="topic" defaultValue={filters.topicId} className="w-full rounded-xl border border-line bg-paper px-3 py-2">
            <option value="">Todos</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Fuente</span>
          <select name="source" defaultValue={filters.sourceId} className="w-full rounded-xl border border-line bg-paper px-3 py-2">
            <option value="">Todas</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Relevancia</span>
          <select
            name="relevance"
            defaultValue={filters.relevance === "all" ? "" : String(filters.relevance)}
            className="w-full rounded-xl border border-line bg-paper px-3 py-2"
          >
            <option value="">Todas</option>
            <option value="3">3 · Prioritaria</option>
            <option value="2">2 · Relevante</option>
            <option value="1">1 · Tangencial</option>
            <option value="0">0 · No relacionado</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Estado</span>
          <select name="status" defaultValue={filters.status === "all" ? "" : filters.status} className="w-full rounded-xl border border-line bg-paper px-3 py-2">
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="interesting">Interesante</option>
            <option value="follow">Seguir</option>
            <option value="discarded">Descartada</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="duplicates" value="1" defaultChecked={filters.showDuplicates} />
          Mostrar duplicados
        </label>
        <button type="submit" className="rounded-full bg-ink px-4 py-1.5 text-paper-2">
          Filtrar
        </button>
        <a href="/feed" className="text-muted underline-offset-2 hover:underline">
          Limpiar
        </a>
        <p className="text-muted">
          {shown} {shown === 1 ? "historia" : "historias"}
          {hidden > 0 ? ` · ${hidden} duplicados agrupados` : ""}
        </p>
      </div>
    </form>
  );
}
