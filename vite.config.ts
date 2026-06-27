import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import type { Connect } from "vite";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

// ── helpers ──

function param(req: Connect.IncomingMessage, name: string): string | null {
  try {
    return new URL(
      req.url ?? "",
      `http://${req.headers.host ?? "localhost"}`
    ).searchParams.get(name);
  } catch {
    return null;
  }
}

function json(res: Connect.ServerResponse, code: number, data: unknown) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

// ── metadata extraction helpers (reused by /api/read) ──

function findAuthorInJSONLD(html: string): string | null {
  const blockRe = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const type = item?.["@type"] ?? "";
        if (/Article|NewsArticle/.test(type) && item.author) {
          const authors = Array.isArray(item.author) ? item.author : [item.author];
          for (const a of authors) {
            if (typeof a.name === "string" && a.name.trim()) return a.name.trim();
          }
        }
      }
    } catch { /* skip malformed JSON */ }
  }
  return null;
}

function nameFromURLPath(val: string, origin: string): string | null {
  try {
    const u = new URL(val, origin);
    const segs = u.pathname.split("/").filter(Boolean);
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i];
      if (s !== "index" && s !== "index.html" && s !== "index.xml" && s !== "index.php" && s !== "") {
        return s.replace(/[-_]/g, " ");
      }
    }
  } catch { /* not parseable */ }
  return null;
}

function extractAuthorName(html: string, origin: string): string | null {
  const ldName = findAuthorInJSONLD(html);
  if (ldName) return ldName;
  const metaPatterns = [
    /<meta\s+(?:name|property)="author"\s+content="([^"]+)"/i,
    /<meta\s+(?:property|name)="article:author"\s+content="([^"]+)"/i,
  ];
  for (const pat of metaPatterns) {
    const m = html.match(pat);
    if (!m) continue;
    const val = m[1].trim();
    if (!val.startsWith("http") && !val.startsWith("/") && !val.includes("@")) return val;
    const fromPath = nameFromURLPath(val, origin);
    if (fromPath) return fromPath;
  }
  const bodyPatterns = [
    /<a[^>]+rel="author"[^>]*>[\s\S]*?itemprop="name"[^>]*>([^<]+)</i,
    /itemprop="author"[^>]*>[\s\S]*?itemprop="name"[^>]*>([^<]+)</i,
  ];
  for (const pat of bodyPatterns) {
    const m = html.match(pat);
    if (m) { const name = m[1].trim(); if (name && name.length < 200) return name; }
  }
  return null;
}

function extractPublicationDate(html: string): string | null {
  const patterns = [
    /<meta\s+(?:property|name)="article:published_time"\s+content="([^"]+)"/i,
    /<meta\s+(?:name|property)="date"\s+content="([^"]+)"/i,
    /<meta\s+(?:name|property)="dc\.date"\s+content="([^"]+)"/i,
  ];
  for (const pat of patterns) {
    const m = html.match(pat);
    if (m) return m[1].trim();
  }
  return null;
}

// ── config ──

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      registerType: "autoUpdate",
      srcDir: "src",
      filename: "sw.js",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Rabbit Hole",
        short_name: "Rabbit Hole",
        description: "A visual map of everything you read and how ideas connect.",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        share_target: {
          action: "/share-target",
          method: "POST",
          enctype: "application/x-www-form-urlencoded",
          params: {
            title: "title",
            text: "text",
            url: "url",
          },
        },
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
      },
    }),

    // Dev-only API middleware to fetch page titles (avoids CORS in browser)
    {
      name: "fetch-title-proxy",
      configureServer(server) {
        server.middlewares.use("/api/fetch-title", async (req, res) => {
          try {
            const urlStr = param(req, "url");
            if (!urlStr) return json(res, 400, { error: "Missing url parameter" });

            const response = await fetch(urlStr, {
              signal: AbortSignal.timeout(8_000),
            });
            const html = await response.text();
            const match = html.match(/<title[^>]*>([^<]+?)<\/title>/i);
            const title = match ? match[1].trim() : new URL(urlStr).hostname;

            json(res, 200, { title });
          } catch (err) {
            json(res, 502, { error: (err as Error).message ?? String(err) });
          }
        });
      },
    },

    // Dev-only API middleware for readability extraction (replaces enrich-proxy)
    {
      name: "read-proxy",
      configureServer(server) {
        server.middlewares.use("/api/read", async (req, res) => {
          try {
            const urlStr = param(req, "url");
            if (!urlStr) return json(res, 400, { error: "Missing url parameter" });

            const response = await fetch(urlStr, {
              signal: AbortSignal.timeout(10_000),
            });
            const html = await response.text();
            const parsed = new URL(urlStr);
            const domain = parsed.hostname.replace(/^www\./, "");

            // Run readability
            const doc = new JSDOM(html, { url: urlStr });
            const reader = new Readability(doc.window.document);
            const article = reader.parse();

            if (!article) {
              return json(res, 422, {
                error: "Could not extract article content from this page",
                domain,
              });
            }

            // Extract author and date from readability result or meta tags
            const author = article.byline?.trim() || extractAuthorName(html, parsed.origin) || null;
            const publicationDate =
              article.publishedTime?.trim() || extractPublicationDate(html) || null;

            json(res, 200, {
              content: article.content,
              title: article.title,
              author,
              publicationDate,
              domain,
            });
          } catch (err) {
            json(res, 502, { error: (err as Error).message ?? String(err) });
          }
        });
      },
    },
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
});
