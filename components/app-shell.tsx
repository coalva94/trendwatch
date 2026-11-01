"use client";

import {
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  Newspaper,
  Rss,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

const LINKS = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/fuentes", label: "Fuentes", icon: Rss },
  { href: "/informe", label: "Informe", icon: FileText },
];

function applyTheme(light: boolean) {
  document.documentElement.classList.toggle("light", light);
  document.documentElement.classList.toggle("dark", !light);
  document.cookie = `trendwatch_theme=${light ? "light" : "dark"}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function subscribeTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function themeSnapshot() {
  return document.documentElement.classList.contains("light");
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const light = useSyncExternalStore(subscribeTheme, themeSnapshot, () => false);

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(!document.documentElement.classList.contains("light"));
      }}
      aria-pressed={light}
      aria-label={light ? "Activar modo oscuro" : "Activar modo claro"}
      className={`inline-flex items-center justify-center rounded-lg border border-line text-muted lift hover:bg-hover hover:text-ink ${
        compact ? "size-9" : "h-9 w-full gap-2 px-3 text-sm"
      }`}
    >
      {light ? <Moon className="size-4" aria-hidden="true" /> : <Sun className="size-4" aria-hidden="true" />}
      {compact ? null : <span>{light ? "Modo oscuro" : "Modo claro"}</span>}
    </button>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Secciones">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium lift ${
              active ? "bg-accent-soft text-ink" : "text-muted hover:bg-hover hover:text-ink"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg px-1 py-1">
      <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="size-4" fill="none">
          <path
            d="M4 16.5c1.6-.7 2.4-4.4 3.8-4.4s1.9 2.9 3.4 2.9 2-6.5 3.6-6.5 1.7 5 3.4 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>
        <span className="block text-sm font-semibold tracking-tight">trendwatch</span>
        <span className="block text-[11px] text-muted">Vigilancia de mercado</span>
      </span>
    </Link>
  );
}

function SidebarBody({ sectorName, onNavigate }: { sectorName: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-4">
        <Brand />
      </div>
      <div className="mt-6 flex-1 px-3">
        <p className="mb-2 px-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-faint">Panel</p>
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="space-y-3 border-t border-line p-3">
        <div className="rounded-xl border border-line bg-bg px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">Sector</p>
          <p className="mt-0.5 truncate text-sm font-medium">{sectorName}</p>
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}

export function AppShell({
  sectorName,
  demo,
  children,
}: {
  sectorName: string;
  demo: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,var(--accent-soft),transparent_68%)]"
        aria-hidden="true"
      />
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-line bg-elevated/90 backdrop-blur md:block">
        <SidebarBody sectorName={sectorName} />
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navegación"
            className="relative h-full w-72 border-r border-line bg-elevated shadow-card"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="absolute right-3 top-4 grid size-8 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink"
            >
              <X className="size-4" />
            </button>
            <SidebarBody sectorName={sectorName} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
      <div className="relative md:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="grid size-9 place-items-center rounded-lg border border-line text-ink"
          >
            <Menu className="size-4" />
          </button>
          <span className="text-sm font-semibold tracking-tight">trendwatch</span>
          <ThemeToggle compact />
        </header>
        {demo ? (
          <p className="border-b border-line bg-accent-soft px-4 py-2 text-center text-xs font-medium text-ink sm:text-sm">
            Modo demo · titulares ficticios y feeds públicos · no hace falta ninguna clave
          </p>
        ) : null}
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pb-8 text-xs text-muted sm:px-6">
          <p>Datos públicos o ficticios. La IA clasifica y resume; no borra nada.</p>
          <p className="font-mono">trendwatch</p>
        </footer>
      </div>
    </div>
  );
}
