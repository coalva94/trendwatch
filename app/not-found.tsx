import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-10">
      <h1 className="font-serif text-4xl">Esa página no está</h1>
      <p className="mt-2 text-muted">El sector vive en Inicio, Feed, Fuentes e Informe.</p>
      <Link href="/" className="mt-4 inline-block text-pine-deep underline-offset-2 hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
