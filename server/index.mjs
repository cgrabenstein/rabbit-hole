// @ts-check
// ── Production Node.js server ──
// Serves the built PWA static files, API endpoints (fetch-title, read),
// and an OPDS 1.2 feed of cached article content for e-reader access.

import { createServer } from "node:http";
import crypto from "node:crypto";
import { readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { initDB, upsertArticle, getArticles, getArticleById } from "./db.mjs";
import { ZipArchive } from "archiver";

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

/**
 * Read X-Client-Id header or return null.
 * @param {import("node:http").IncomingMessage} req
 * @returns {string | null}
 */
function clientId(req) {
  const id = req.headers["x-client-id"];
  if (Array.isArray(id)) return id[0] ?? null;
  return id ?? null;
}

// ── XML escaping ──

/**
 * @param {string} s
 * @returns {string}
 */
function xmlEsc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── extraction helpers (same logic as vite.config.ts) ──

/**
 * @param {string} html
 * @returns {string | null}
 */
function findAuthorInJSONLD(html) {
  const blockRe = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
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

// ── OPDS helpers ──

/**
 * Wrap article content HTML in a minimal document for e-reader display.
 * @param {string} title
 * @param {string} bodyHtml
 * @returns {string}
 */
function wrapContentHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${xmlEsc(title)}</title>
<style>
  body { font-family: serif; line-height: 1.6; max-width: 40em; margin: 0 auto; padding: 1em; color: #111; background: #fff; }
  img { max-width: 100%; height: auto; }
  pre { overflow-x: auto; }
  a { color: #2563eb; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/**
 * Format an ISO date string for Atom (RFC 3339).
 * @param {string} iso
 * @returns {string}
 */
function atomDate(iso) {
  try {
    return new Date(iso).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Sanitize a string for use as a filename.
 * @param {string} s
 * @returns {string}
 */
function sanitizeFilename(s) {
  return String(s)
    .replace(/[<>:"\\/|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "article";
}

/**
 * Strip attributes and elements that can trip up lightweight EPUB parsers.
 * Removes HTMX/Alpine/JS framework attributes, empty wrapper divs, and script tags.
 * @param {string} html
 * @returns {string}
 */
function simplifyHtml(html) {
  return html
    // Remove script tags and their content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // Remove HTMX attributes (hx-*)
    .replace(/ hx-[a-zA-Z-]+="[^"]*"/gi, "")
    // Remove Alpine.js attributes (x-*, @*, :*)
    .replace(/ x-[a-zA-Z-:]+="[^"]*"/gi, "")
    .replace(/ @[a-zA-Z-]+="[^"]*"/gi, "")
    .replace(/ :[a-zA-Z-]+="[^"]*"/gi, "")
    // Remove data-* and aria-* attributes
    .replace(/ data-[a-zA-Z-]+="[^"]*"/gi, "")
    .replace(/ aria-[a-zA-Z-]+="[^"]*"/gi, "")
    // Collapse multiple blank lines
    .replace(/\n\s*\n\s*/g, "\n");
}

/**
 * Stream a minimal EPUB (EPUB 2) for an article to the response.
 * @param {import("node:http").ServerResponse} res
 * @param {{title:string;author:string|null;content:string;url:string}} article
 */
async function sendEpub(res, article) {
  const title = article.title || "Untitled";
  const author = article.author || "";
  const contentHtml = simplifyHtml(article.content || "");
  const filename = sanitizeFilename(title) + ".epub";

  // Build unique identifier
  const uuid = `urn:uuid:${crypto.randomUUID()}`;

  // ── Step 1: Download images ──
  /** @type {Map<string, string>} */
  const urlToLocal = new Map();
  /** @type {Map<string, Buffer>} */
  const localToData = new Map();
  const imgUrls = [...contentHtml.matchAll(/<img[^>]+src="([^"]*)"/gi)].map(m => m[1]);
  let imgIdx = 0;
  await Promise.allSettled(
    [...new Set(imgUrls)].map(async (url) => {
      if (!url.startsWith("http://") && !url.startsWith("https://")) return;
      try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(8_000) });
        if (!resp.ok) return;
        const buf = Buffer.from(await resp.arrayBuffer());
        if (buf.length === 0 || buf.length > 10_000_000) return;
        const local = `images/img_${imgIdx++}.jpg`;
        urlToLocal.set(url, local);
        localToData.set(local, buf);
      } catch { /* best-effort */ }
    })
  );

  // ── Step 2: Rewrite src URLs to local paths ──
  let processedHtml = contentHtml;
  for (const [url, local] of urlToLocal) {
    processedHtml = processedHtml.replaceAll(url, local);
  }

  // ── Step 3: Strip tags to safe allowlist ──
  const ALLOWED_TAGS = new Set([
    "img", "p", "a", "blockquote", "ol", "ul", "li", "sup", "sub",
    "h1", "h2", "h3", "h4", "h5", "h6", "div", "br", "hr",
    "em", "strong", "i", "b", "pre", "code", "q",
    "dl", "dt", "dd",
    "table", "tr", "td", "th", "caption",
    "s", "u", "small", "ins", "del", "mark"
  ]);
  const SELF_CLOSING = new Set(["img", "br", "hr"]);
  function stripAttrs(tag) {
    const isClose = tag[1] === "/";
    const name = (isClose ? tag.replace(/^<\//, "") : tag.replace(/^</, "")).replace(/[\s\/>].*$/, "").toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return "";
    if (isClose) return "</" + name + ">";
    if (name === "img") {
      const src = tag.match(/\ssrc="([^"]*)"/i);
      return src ? `<img src="${src[1]}"/>` : "<img/>";
    }
    return "<" + name + (SELF_CLOSING.has(name) ? "/>" : ">");
  }
  const strippedHtml = processedHtml
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*)?\s*\/?>/g, stripAttrs)
    .replace(/\n\s*\n/g, "\n");

  // Remove img tags whose external URL couldn't be downloaded
  const finalHtml = strippedHtml.replace(/<img\s+src="https?:[^"]*"\s*\/>/gi, "<img/>");

  const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8"/>
<title>${xmlEsc(title)}</title>
<style>
  body { font-family: serif; line-height: 1.6; max-width: 40em; margin: 0 auto; padding: 1em; }
  img { max-width: 100%; height: auto; }
  pre { overflow-x: auto; white-space: pre-wrap; }
  a { color: #2563eb; }
</style>
</head>
<body>
${finalHtml}
</body>
</html>`;

  // Build manifest
  const manifestItems = [
    `    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>`,
    `    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
  ];
  let mi = 0;
  for (const [local] of localToData) {
    manifestItems.push(`    <item id="img_${mi++}" href="${local}" media-type="image/jpeg"/>`);
  }

  // Content OPF
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">${xmlEsc(title)}</dc:title>
    ${author ? `<dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">${xmlEsc(author)}</dc:creator>` : ""}
    <dc:identifier xmlns:dc="http://purl.org/dc/elements/1.1/" id="BookId">${xmlEsc(uuid)}</dc:identifier>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">en</dc:language>
  </metadata>
  <manifest>
${manifestItems.join("\n")}
  </manifest>
  <spine toc="ncx">
    <itemref idref="content"/>
  </spine>
</package>`;

  // NCX (table of contents)
  const ncx = `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${xmlEsc(uuid)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${xmlEsc(title)}</text></docTitle>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel><text>${xmlEsc(title)}</text></navLabel>
      <content src="content.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;

  // Container XML
  const container = `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  // Build EPUB (ZIP) archive — store-only (no compression) to avoid
  // embedded ZIP library edge cases on memory-constrained e-readers
  const archive = new ZipArchive();

  res.writeHead(200, {
    "Content-Type": "application/epub+zip",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });

  archive.pipe(res);

  // mimetype MUST be first, stored uncompressed
  archive.append("application/epub+zip", { name: "mimetype", store: true });
  archive.append(container, { name: "META-INF/container.xml", store: true });
  archive.append(opf, { name: "OEBPS/content.opf", store: true });
  archive.append(ncx, { name: "OEBPS/toc.ncx", store: true });
  archive.append(xhtml, { name: "OEBPS/content.xhtml", store: true });

  // Add downloaded images
  for (const [local, data] of localToData) {
    archive.append(data, { name: `OEBPS/${local}`, store: true });
  }

  archive.finalize();
}

/**
 * Build the OPDS root navigation catalog.
 * @param {string} cId
 * @param {number} articleCount
 * @param {string} host
 * @returns {string}
 */
function opdsRootXml(cId, articleCount, host) {
  const updated = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opds="http://opds-spec.org/2010/catalog">
  <id>rabbit-hole:${xmlEsc(cId)}</id>
  <title>Rabbit Hole</title>
  <updated>${updated}</updated>
  <author><name>Rabbit Hole</name></author>
  <link rel="self" href="/opds/${xmlEsc(cId)}" type="application/atom+xml"/>
  <link rel="start" href="/opds/${xmlEsc(cId)}" type="application/atom+xml"/>
  <entry>
    <title>Articles (${articleCount})</title>
    <id>rabbit-hole:${xmlEsc(cId)}:articles</id>
    <updated>${updated}</updated>
    <content type="text">All saved articles with readable content.</content>
    <link rel="http://opds-spec.org/subsection" href="/opds/${xmlEsc(cId)}/articles" type="application/atom+xml"/>
  </entry>
</feed>`;
}

/**
 * Build the OPDS acquisition feed of all articles for a client.
 * @param {string} cId
 * @param {Array<any>} articles
 * @param {string} host
 * @returns {string}
 */
function opdsArticlesXml(cId, articles, host) {
  const updated = new Date().toISOString();
  const entries = articles
    .map((a) => {
      const pubDate = atomDate(a.publication_date || a.created_at || updated);
      const hasContent = !!a.content;
      const contentLink = hasContent
        ? `    <link rel="http://opds-spec.org/acquisition" href="/api/article-content/${xmlEsc(cId)}/${a.id}" type="application/epub+zip"/>`
        : "";
      return `  <entry>
    <title>${xmlEsc(a.title || "Untitled")}</title>
    <id>rabbit-hole:source:${xmlEsc(cId)}:${a.id}</id>
    ${a.author ? `    <author><name>${xmlEsc(a.author)}</name></author>` : ""}
    <published>${pubDate}</published>
    <updated>${pubDate}</updated>
    <dc:identifier xmlns:dc="http://purl.org/dc/terms/">${xmlEsc(a.url)}</dc:identifier>
    <link rel="alternate" href="${xmlEsc(a.url)}" type="text/html"/>
    ${a.domain ? `    <dc:publisher xmlns:dc="http://purl.org/dc/terms/">${xmlEsc(a.domain)}</dc:publisher>` : ""}
${contentLink}
  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opds="http://opds-spec.org/2010/catalog"
      xmlns:dc="http://purl.org/dc/terms/">
  <id>rabbit-hole:${xmlEsc(cId)}:articles</id>
  <title>Rabbit Hole — All Articles</title>
  <updated>${updated}</updated>
  <author><name>Rabbit Hole</name></author>
  <link rel="self" href="/opds/${xmlEsc(cId)}/articles" type="application/atom+xml"/>
  <link rel="start" href="/opds/${xmlEsc(cId)}" type="application/atom+xml"/>
${entries}
</feed>`;
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
        signal: AbortSignal.timeout(10_000),
      });
      const html = await response.text();
      const match = html.match(/<title[^>]*>([^<]+?)<\/title>/i);
      const title = match ? match[1].trim() : new URL(urlStr).hostname;

      // Cache in DB for OPDS — also run Readability so article content
      // is immediately available for the OPDS acquisition feed.
      const cId = clientId(req);
      const parsed = new URL(urlStr);
      const domain = parsed.hostname.replace(/^www\./, "");

      let content = null;
      let author = null;
      let publicationDate = null;

      try {
        const doc = new JSDOM(html, { url: urlStr });
        const reader = new Readability(doc.window.document);
        const article = reader.parse();
        if (article) {
          content = article.content;
          author =
            article.byline?.trim() ||
            extractAuthorName(html, parsed.origin) ||
            null;
          publicationDate =
            article.publishedTime?.trim() ||
            extractPublicationDate(html) ||
            null;
        }
      } catch { /* readability extraction is best-effort */ }

      if (cId) {
        upsertArticle(cId, urlStr, {
          title,
          content,
          author,
          publication_date: publicationDate,
          domain,
          created_at: new Date().toISOString(),
        });
      }

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

      // Cache in DB for OPDS
      const cId = clientId(req);
      if (cId) {
        upsertArticle(cId, urlStr, {
          title: article.title,
          content: article.content,
          author,
          publication_date: publicationDate,
          domain,
          read_at: new Date().toISOString(),
        });
      }

      return send(res, 200, {
        content: article.content,
        title: article.title,
        author,
        publicationDate,
        domain,
      });
    }

    // ── OPDS: root catalog ──
    // GET /opds/:clientId
    const opdsMatch = pathname.match(/^\/opds\/([^/]+)$/);
    if (opdsMatch) {
      const cId = decodeURIComponent(opdsMatch[1]);
      const articles = getArticles(cId);
      const xml = opdsRootXml(cId, articles.length, req.headers.host || `localhost:${PORT}`);
      return send(res, 200, xml, "application/atom+xml; charset=utf-8");
    }

    // ── OPDS: article acquisition feed ──
    // GET /opds/:clientId/articles
    const opdsArticlesMatch = pathname.match(/^\/opds\/([^/]+)\/articles$/);
    if (opdsArticlesMatch) {
      const cId = decodeURIComponent(opdsArticlesMatch[1]);
      const articles = getArticles(cId);
      const xml = opdsArticlesXml(cId, articles, req.headers.host || `localhost:${PORT}`);
      return send(res, 200, xml, "application/atom+xml; charset=utf-8");
    }

    // ── API: article content (EPUB download for e-reader) ──
    // GET /api/article-content/:clientId/:articleId
    const contentMatch = pathname.match(/^\/api\/article-content\/([^/]+)\/(\d+)$/);
    if (contentMatch) {
      const cId = decodeURIComponent(contentMatch[1]);
      const aId = parseInt(contentMatch[2], 10);
      const article = getArticleById(cId, aId);
      if (!article || !article.content) {
        return send(res, 404, "Article not found", "text/plain");
      }

      await sendEpub(res, article);
      return;
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

// ── start ──

initDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🐇 Rabbit Hole server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
