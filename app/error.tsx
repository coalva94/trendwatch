"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg py-10">
      <h1 className="font-serif text-4xl">No se pudo cargar esta vista</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{error.message}</p>
      <button type="button" onClick={reset} className="mt-4 rounded-full bg-ink px-4 py-2 text-sm text-paper-2">
        Reintentar
      </button>
    </div>
  );
}
