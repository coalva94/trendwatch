"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-line bg-elevated p-6 shadow-card">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Error</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">No se pudo cargar esta vista</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 h-9 rounded-lg bg-ink px-3 text-sm font-medium text-bg"
      >
        Reintentar
      </button>
    </div>
  );
}
