import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { loadWorkspace } from "@/lib/data/repository";

import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )trendwatch_theme=([^;]+)/);var light=m&&decodeURIComponent(m[1])==="light";document.documentElement.classList.toggle("light",!!light);document.documentElement.classList.toggle("dark",!light);}catch(e){document.documentElement.classList.add("dark");}})();`;

export const metadata: Metadata = {
  title: {
    default: "trendwatch",
    template: "%s · trendwatch",
  },
  description:
    "Vigilancia de mercado por sector: noticias públicas, clasificación con un modelo y un informe semanal.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const workspace = await loadWorkspace();
  return (
    <html
      lang="es"
      className={`${sans.variable} ${mono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-bg text-ink">
        <AppShell sectorName={workspace.sector.name} demo={workspace.demoMode}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
