// SSRF checks for feed URLs. Keep the rules aligned with scripts/trendwatch_jobs/ssrf.py.

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = "Trendwatch/0.1 (+https://github.com/coalva94/trendwatch)";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google.com",
]);

export class FeedValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedValidationError";
  }
}

export type LookupFn = (hostname: string) => Promise<string[]>;
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export type FeedValidation =
  | { ok: true; url: string; entries: number }
  | { ok: false; error: string };

function ipv4Parts(address: string): number[] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address);
  if (!match) return null;
  const parts = match.slice(1).map((part) => Number(part));
  if (parts.some((part) => part > 255)) return null;
  return parts;
}

export function isPrivateAddress(address: string): boolean {
  let ip = address.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip === "::1" || ip === "::" || ip === "0:0:0:0:0:0:0:1") return true;
  if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("ff")) {
    return true;
  }
  const parts = ipv4Parts(ip);
  if (!parts) return ip.includes(":") ? false : true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && (b === 168 || b === 0)) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
  if (a === 203 && b === 0) return true;
  if (a >= 224) return true;
  return false;
}

function isIpLiteral(hostname: string): boolean {
  return ipv4Parts(hostname) !== null || hostname.includes(":");
}

function assertHostname(hostname: string): string {
  const host = hostname.replace(/\.$/, "").toLowerCase();
  if (!host || BLOCKED_HOSTS.has(host)) {
    throw new FeedValidationError("Host no permitido");
  }
  if (
    host.endsWith(".local") ||
    host.endsWith(".localhost") ||
    host.endsWith(".localdomain") ||
    host.endsWith(".internal")
  ) {
    throw new FeedValidationError("Host no permitido");
  }
  if (/^\d+(\.\d+){0,3}$/.test(host) && !ipv4Parts(host)) {
    throw new FeedValidationError("Host no permitido");
  }
  return host;
}

export async function assertPublicHttpUrl(raw: string, lookup: LookupFn): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FeedValidationError("URL no válida");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new FeedValidationError("Solo se permiten http y https");
  }
  if (url.username || url.password) {
    throw new FeedValidationError("La URL no puede incluir usuario o contraseña");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new FeedValidationError("Puerto no permitido");
  }
  const host = assertHostname(url.hostname);
  const addresses = isIpLiteral(host) ? [host] : await lookup(host).catch(() => []);
  if (addresses.length === 0) {
    throw new FeedValidationError("No se pudo resolver el host");
  }
  if (addresses.some((address) => isPrivateAddress(address))) {
    throw new FeedValidationError("La dirección es privada o no enrutable");
  }
  return url;
}

function looksLikeFeed(body: string): boolean {
  const sample = body.slice(0, 4000).toLowerCase();
  return sample.includes("<rss") || sample.includes("<feed") || sample.includes("<rdf:rdf");
}

function countEntries(body: string): number {
  const items = body.match(/<item[\s>]/gi)?.length ?? 0;
  const entries = body.match(/<entry[\s>]/gi)?.length ?? 0;
  return Math.max(items, entries);
}

async function readBody(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    throw new FeedValidationError("El feed supera el tamaño máximo");
  }
  const text = await response.text();
  if (text.length > MAX_BYTES) {
    throw new FeedValidationError("El feed supera el tamaño máximo");
  }
  return text;
}

export async function validateFeed(
  raw: string,
  deps: { lookup: LookupFn; fetchImpl: FetchLike } = {
    lookup: defaultLookup,
    fetchImpl: defaultFetch,
  },
): Promise<FeedValidation> {
  try {
    let current = raw.trim();
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const url = await assertPublicHttpUrl(current, deps.lookup);
      const response = await deps.fetchImpl(url.toString(), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: {
          accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
          "user-agent": USER_AGENT,
        },
      });
      if (response.status >= 300 && response.status < 400) {
        if (hop === MAX_REDIRECTS) {
          throw new FeedValidationError("Demasiadas redirecciones");
        }
        const location = response.headers.get("location");
        if (!location) throw new FeedValidationError("Demasiadas redirecciones");
        current = new URL(location, url).toString();
        continue;
      }
      if (response.status < 200 || response.status >= 300) {
        throw new FeedValidationError("La fuente respondió con un error");
      }
      const body = await readBody(response);
      if (!looksLikeFeed(body)) {
        throw new FeedValidationError("El feed no parece RSS o Atom");
      }
      const entries = countEntries(body);
      if (entries === 0) throw new FeedValidationError("El feed no parece RSS o Atom");
      return { ok: true, url: url.toString(), entries };
    }
    throw new FeedValidationError("Demasiadas redirecciones");
  } catch (error) {
    if (error instanceof FeedValidationError) return { ok: false, error: error.message };
    return { ok: false, error: "No se pudo leer el feed" };
  }
}

export async function defaultLookup(hostname: string): Promise<string[]> {
  const { lookup } = await import("node:dns/promises");
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

export const defaultFetch: FetchLike = (url, init) => fetch(url, init);

export function detectKind(url: string): "rss" | "google_news" {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "news.google.com" || host.endsWith(".news.google.com")) return "google_news";
  } catch {
    return "rss";
  }
  return "rss";
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "fuente";
}
