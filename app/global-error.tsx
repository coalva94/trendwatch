"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "Georgia, serif", padding: "2.5rem", maxWidth: "36rem" }}>
        <p style={{ fontSize: "1.8rem" }}>trendwatch</p>
        <h1 style={{ fontSize: "1.3rem" }}>No se pudo cargar el sector</h1>
        <p>{error.message}</p>
        <button type="button" onClick={reset}>
          Reintentar
        </button>
      </body>
    </html>
  );
}