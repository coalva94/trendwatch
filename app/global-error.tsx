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
      <body
        style={{
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#09090b",
          color: "#fafafa",
          padding: "2.5rem",
          maxWidth: "36rem",
          margin: "0 auto",
        }}
      >
        <p style={{ fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#a1a1aa" }}>
          trendwatch
        </p>
        <h1 style={{ fontSize: "1.5rem", marginTop: "0.4rem" }}>No se pudo cargar el sector</h1>
        <p style={{ color: "#a1a1aa" }}>{error.message}</p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "1rem",
            background: "#fafafa",
            color: "#09090b",
            border: 0,
            borderRadius: "0.5rem",
            padding: "0.5rem 0.8rem",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
