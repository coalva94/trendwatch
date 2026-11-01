import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { SectorFile, SourceKind } from "@/lib/types";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label}: falta ${key}`);
  }
  return value.trim();
}

function readKind(value: unknown, label: string): SourceKind {
  if (value === "rss" || value === "google_news") return value;
  throw new Error(`${label}: kind debe ser rss o google_news`);
}

export function parseSectorFile(data: unknown, label = "sector"): SectorFile {
  if (!isRecord(data)) throw new Error(`${label}: el archivo no es un objeto`);
  const slug = readString(data, "slug", label);
  if (!SLUG.test(slug)) throw new Error(`${label}: slug no válido`);
  const name = readString(data, "name", label);
  const description = readString(data, "description", label);
  if (!Array.isArray(data.topics) || data.topics.length === 0) {
    throw new Error(`${label}: añade al menos un tema`);
  }
  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    throw new Error(`${label}: añade al menos una fuente`);
  }

  const topics = data.topics.map((entry, index) => {
    const topicLabel = `${label} tema ${index + 1}`;
    if (!isRecord(entry)) throw new Error(`${topicLabel}: no es un objeto`);
    const topicSlug = readString(entry, "slug", topicLabel);
    if (!SLUG.test(topicSlug)) throw new Error(`${topicLabel}: slug no válido`);
    if (!Array.isArray(entry.keywords) || entry.keywords.length === 0) {
      throw new Error(`${topicLabel}: añade keywords`);
    }
    const keywords = entry.keywords.map((keyword, keywordIndex) => {
      if (typeof keyword !== "string" || keyword.trim() === "") {
        throw new Error(`${topicLabel}: keyword ${keywordIndex + 1} vacía`);
      }
      return keyword.trim();
    });
    return {
      slug: topicSlug,
      name: readString(entry, "name", topicLabel),
      description: readString(entry, "description", topicLabel),
      keywords,
    };
  });

  const sources = data.sources.map((entry, index) => {
    const sourceLabel = `${label} fuente ${index + 1}`;
    if (!isRecord(entry)) throw new Error(`${sourceLabel}: no es un objeto`);
    const sourceSlug = readString(entry, "slug", sourceLabel);
    if (!SLUG.test(sourceSlug)) throw new Error(`${sourceLabel}: slug no válido`);
    const url = readString(entry, "url", sourceLabel);
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`${sourceLabel}: URL no válida`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`${sourceLabel}: la URL debe ser http o https`);
    }
    return {
      slug: sourceSlug,
      name: readString(entry, "name", sourceLabel),
      url,
      kind: readKind(entry.kind, sourceLabel),
    };
  });

  const topicSlugs = new Set(topics.map((topic) => topic.slug));
  const sourceSlugs = new Set(sources.map((source) => source.slug));
  const urls = new Set(sources.map((source) => source.url));
  if (topicSlugs.size !== topics.length) throw new Error(`${label}: slugs de tema repetidos`);
  if (sourceSlugs.size !== sources.length) throw new Error(`${label}: slugs de fuente repetidos`);
  if (urls.size !== sources.length) throw new Error(`${label}: URLs de fuente repetidas`);

  return { slug, name, description, topics, sources };
}

export function readSectorCatalog(directory: string): SectorFile[] {
  let names: string[];
  try {
    names = readdirSync(directory);
  } catch {
    throw new Error(`No se pudo leer el catálogo de sectores en ${directory}`);
  }
  return names
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const raw = readFileSync(path.join(directory, name), "utf8");
      return parseSectorFile(JSON.parse(raw) as unknown, name);
    });
}

export function sectorCatalogDir(): string {
  return path.join(process.cwd(), "data", "sectors");
}
