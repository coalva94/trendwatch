import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Outfit } from "next/font/google";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { loadWorkspace } from "@/lib/data/repository";

import "./globals.css";

const sans = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const serif = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
});

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
    <html lang="es" className={`${sans.variable} ${serif.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SiteHeader sectorName={workspace.sector.name} demo={workspace.demoMode} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <SiteFooter />
      </body>
    </html>
  );
}
