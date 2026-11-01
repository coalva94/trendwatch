import type { ItemStatus, Relevance, SourceHealth, SourceKind } from "@/lib/types";

export const STATUS_LABEL: Record<ItemStatus, string> = {
  pending: "Pendiente",
  interesting: "Interesante",
  follow: "Seguir",
  discarded: "Descartada",
};

export const RELEVANCE_LABEL: Record<Relevance, string> = {
  0: "No relacionado",
  1: "Tangencial",
  2: "Relevante",
  3: "Prioritaria",
};

export const HEALTH_LABEL: Record<SourceHealth, string> = {
  never: "Sin lecturas",
  ok: "Lectura correcta",
  error: "Error de lectura",
};

export const KIND_LABEL: Record<SourceKind, string> = {
  rss: "RSS",
  google_news: "Google News",
};
