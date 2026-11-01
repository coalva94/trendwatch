import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-line bg-elevated p-6 shadow-card">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Esa página no está</h1>
      <p className="mt-2 text-sm text-muted">El sector vive en Inicio, Feed, Fuentes e Informe.</p>
      <Link href="/" className="mt-4 inline-flex text-sm font-medium text-accent hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
