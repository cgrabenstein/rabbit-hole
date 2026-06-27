// @ts-check
// ── Production Node.js server ──
// Serves the built PWA static files and API endpoints (fetch-title, read).
// Run with: node server/index.mjs
// Expects dist/ to exist (from `npm run build`).

import { createServer } from "node:http";
import { readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");
const PORT = parseInt(process.env.PORT || "3000", 10);

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

// ── helpers ──

/**
 * @param {import("node:http").ServerResponse} res
 * @param {number} code
 * @param {string | Buffer | object} data
 * @param {string} [type]
 */
function send(res, code, data, type) {
  if (!type && typeof data === "object" && !(data instanceof Buffer)) {
    type = "application/json";
    data = JSON.stringify(data);
  }
  if (!type) type = "application/json";
  res.writeHead(code, { "Content-Type": type });
  res.end(data);
}

/**
 * @param {string} rawUrl
 * @param {string} name
 * @returns {string | null}
 */
function param(rawUrl, name) {
  try {
    return new URL(rawUrl, `http://localhost`).searchParams.get(name);
  } catch {
    return null;
  }
}

// ── extraction helpers (same logic as vite.config.ts) ──

/**
 * @param {string} html
 * @returns {string | null}
 */
function findAuthorInJSONLD(html) {
  const blockRe =
    /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const type = item?.["@type"] ?? "";
        if (/Article|NewsArticle/.test(type) && item.author) {
          const authors = Array.isArray(item.author)
            ? item.author
            : [item.author];
          for (const a of authors) {
            if (typeof a.name === "string" && a.name.trim())
              return a.name.trim();
          }
        }
      }
    } catch {
      /* skip malformed JSON */
    }
  }
  return null;
}

/**
 * @param {string} val
 * @param {string} origin
 * @returns {string | null}
 */
function nameFromURLPath(val, origin) {
  try {
    const u = new URL(val, origin);
    const segs = u.pathname.split("/").filter(Boolean);
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i];
      if (
        s !== "index" &&
        s !== "index.html" &&
        s !== "index.xml" &&
        s !== "index.php" &&
        s !== ""
      ) {
        return s.replace(/[-_]/g, " ");
      }
    }
  } catch {
    /* not parseable */
  }
  return null;
}

/**
 * @param {string} html
 * @param {string} origin
 * @returns {string | null}
 */
function extractAuthorName(html, origin) {
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
    if (!val.startsWith("http") && !val.startsWith("/") && !val.includes("@"))
      return val;
    const fromPath = nameFromURLPath(val, origin);
    if (fromPath) return fromPath;
  }

  const bodyPatterns = [
    /<a[^>]+rel="author"[^>]*>[\s\S]*?itemprop="name"[^>]*>([^<]+)</i,
    /itemprop="author"[^>]*>[\s\S]*?itemprop="name"[^>]*>([^<]+)</i,
  ];
  for (const pat of bodyPatterns) {
    const m = html.match(pat);
    if (m) {
      const name = m[1].trim();
      if (name && name.length < 200) return name;
    }
  }
  return null;
}

/**
 * @param {string} html
 * @returns {string | null}
 */
function extractPublicationDate(html) {
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

// ── request handler ──

const server = createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = reqUrl.pathname;

    // ── API: fetch-title ──
    if (pathname === "/api/fetch-title") {
      const urlStr = param(req.url, "url");
      if (!urlStr) return send(res, 400, { error: "Missing url parameter" });

      const response = await fetch(urlStr, {
        signal: AbortSignal.timeout(8_000),
      });
      const html = await response.text();
      const match = html.match(/<title[^>]*>([^<]+?)<\/title>/i);
      const title = match ? match[1].trim() : new URL(urlStr).hostname;

      return send(res, 200, { title });
    }

    // ── API: read (readability extraction) ──
    if (pathname === "/api/read") {
      const urlStr = param(req.url, "url");
      if (!urlStr) return send(res, 400, { error: "Missing url parameter" });

      const response = await fetch(urlStr, {
        signal: AbortSignal.timeout(10_000),
      });
      const html = await response.text();
      const parsed = new URL(urlStr);
      const domain = parsed.hostname.replace(/^www\./, "");

      const doc = new JSDOM(html, { url: urlStr });
      const reader = new Readability(doc.window.document);
      const article = reader.parse();

      if (!article) {
        return send(res, 422, {
          error: "Could not extract article content from this page",
          domain,
        });
      }

      const author =
        article.byline?.trim() ||
        extractAuthorName(html, parsed.origin) ||
        null;
      const publicationDate =
        article.publishedTime?.trim() ||
        extractPublicationDate(html) ||
        null;

      return send(res, 200, {
        content: article.content,
        title: article.title,
        author,
        publicationDate,
        domain,
      });
    }

    // ── Static files (SPA) ──
    let filePath = join(DIST, pathname === "/" ? "index.html" : pathname);

    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = join(DIST, "index.html");
    }

    const content = readFileSync(filePath);
    const ext = extname(filePath);
    send(res, 200, content, MIME[ext] || "application/octet-stream");
  } catch (err) {
    console.error("Request error:", err);
    send(res, 500, "Internal server error", "text/plain");
  }
});

server.listen(PORT, () => {
  console.log(`🐇 Rabbit Hole server running on http://localhost:${PORT}`);
});
