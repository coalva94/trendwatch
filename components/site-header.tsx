"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/feed", label: "Feed" },
  { href: "/fuentes", label: "Fuentes" },
  { href: "/informe", label: "Informe" },
];

export function SiteHeader({ sectorName, demo }: { sectorName: string; demo: boolean }) {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-paper-2/80">
      {demo ? (
        <p className="bg-pine-deep px-4 py-2 text-center text-sm text-paper-2">
          Modo demo · titulares ficticios y feeds públicos · no hace falta ninguna clave
        </p>
      ) : null}
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-5">
        <Link href="/" className="group">
          <span className="block font-serif text-3xl tracking-tight text-ink">trendwatch</span>
          <span className="text-xs uppercase tracking-[0.18em] text-muted">Vigilancia de mercado</span>
        </Link>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Sector</p>
          <p className="font-medium">{sectorName}</p>
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3" aria-label="Secciones">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm ${
                active ? "bg-ink text-paper-2" : "text-muted hover:bg-line/70 hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line px-4 py-6 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2">
        <p>Datos públicos o ficticios. La IA clasifica y resume; no borra nada.</p>
        <p>trendwatch</p>
      </div>
    </footer>
  );
}
