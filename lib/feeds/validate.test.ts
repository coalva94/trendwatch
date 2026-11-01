import { describe, expect, it } from "vitest";

import { isPrivateAddress, validateFeed, type FetchLike } from "@/lib/feeds/validate";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><item><title>Hola</title></item></channel></rss>`;

function fetchOk(body = RSS, status = 200, headers: Record<string, string> = {}): FetchLike {
  return async () =>
    new Response(body, {
      status,
      headers,
    });
}

describe("isPrivateAddress", () => {
  it("blocks loopback, link-local, and private ranges", () => {
    for (const address of ["127.0.0.1", "10.1.2.3", "192.168.0.8", "172.16.5.1", "169.254.169.254", "::1"]) {
      expect(isPrivateAddress(address)).toBe(true);
    }
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(isPrivateAddress("::ffff:127.0.0.1")).toBe(true);
  });
});

describe("validateFeed", () => {
  it("accepts a public RSS feed", async () => {
    const result = await validateFeed("https://news.example/feed.xml", {
      lookup: async () => ["93.184.0.34"],
      fetchImpl: fetchOk(),
    });
    expect(result).toEqual({ ok: true, url: "https://news.example/feed.xml", entries: 1 });
  });

  it("rejects private hosts before fetching", async () => {
    let called = false;
    const fetchImpl: FetchLike = async () => {
      called = true;
      return new Response(RSS);
    };
    const cases = [
      "http://127.0.0.1/feed",
      "http://10.0.0.8/feed",
      "http://localhost/feed",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/feed",
      "https://metadata.google.internal/feed",
      "file:///etc/passwd",
      "https://user:secret@news.example/feed",
      "http://news.example:22/feed",
    ];
    for (const url of cases) {
      const result = await validateFeed(url, {
        lookup: async () => ["93.184.0.34"],
        fetchImpl,
      });
      expect(result.ok, url).toBe(false);
    }
    expect(called).toBe(false);
  });

  it("rejects a public name that resolves to a private address", async () => {
    const result = await validateFeed("https://rebind.example/feed", {
      lookup: async () => ["8.8.8.8", "127.0.0.1"],
      fetchImpl: fetchOk(),
    });
    expect(result).toMatchObject({ ok: false, error: "La dirección es privada o no enrutable" });
  });

  it("re-checks redirects and rejects HTML", async () => {
    const fetchImpl: FetchLike = async (url) => {
      if (url.startsWith("https://news.example/start")) {
        return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } });
      }
      return new Response(RSS);
    };
    const redirected = await validateFeed("https://news.example/start", {
      lookup: async (host) => (host === "127.0.0.1" ? ["127.0.0.1"] : ["93.184.0.34"]),
      fetchImpl,
    });
    expect(redirected.ok).toBe(false);

    const html = await validateFeed("https://news.example/page", {
      lookup: async () => ["93.184.0.34"],
      fetchImpl: fetchOk("<html><body>no feed</body></html>"),
    });
    expect(html).toMatchObject({ ok: false, error: "El feed no parece RSS o Atom" });
  });
});
