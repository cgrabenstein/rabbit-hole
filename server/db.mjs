// @ts-check
// ── SQLite persistence layer (sql.js) ──
// Stores articles keyed by (client_id, url) for OPDS serving.
// All data is cached as a side-effect of existing API calls.

import initSqlJs from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const DB_PATH = join(DATA_DIR, "rabbit-hole.db");

/** @type {import("sql.js").Database | null} */
let db = null;

/** @returns {Promise<import("sql.js").Database>} */
export async function initDB() {
  if (db) return db;
  const SQL = await initSqlJs();

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  if (existsSync(DB_PATH)) {
    db = new SQL.Database(readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    author TEXT,
    publication_date TEXT,
    domain TEXT,
    content TEXT,
    created_at TEXT,
    read_at TEXT,
    UNIQUE(client_id, url)
  )`);

  db.run("CREATE INDEX IF NOT EXISTS idx_articles_client ON articles(client_id)");
  persist();
  console.log(`📦 DB ready (${existsSync(DB_PATH) ? "loaded" : "created"})`);
  return db;
}

function persist() {
  if (!db) return;
  writeFileSync(DB_PATH, Buffer.from(db.export()));
}

// ── helpers ──

/**
 * Upsert an article row keyed by (client_id, url).
 * @param {string} clientId
 * @param {string} url
 * @param {Partial<{title:string;author:string;publication_date:string;domain:string;content:string;created_at:string;read_at:string}>} data
 */
export function upsertArticle(clientId, url, data) {
  if (!db) return;

  // Check if row exists
  const check = db.exec(
    `SELECT id FROM articles WHERE client_id = '${clientId.replace(/'/g, "''")}' AND url = '${url.replace(/'/g, "''")}'`
  );

  const cols = Object.keys(data).filter((k) => data[k] !== undefined && data[k] !== null);
  if (cols.length === 0) return;

  if (check.length > 0 && check[0].values.length > 0) {
    // Update
    const sets = cols.map((k) => `${k} = '${String(data[k]).replace(/'/g, "''")}'`);
    db.run(
      `UPDATE articles SET ${sets.join(", ")} WHERE client_id = '${clientId.replace(/'/g, "''")}' AND url = '${url.replace(/'/g, "''")}'`
    );
  } else {
    // Insert
    const allCols = ["client_id", "url", ...cols];
    const vals = allCols.map((k) => {
      if (k === "client_id") return `'${clientId.replace(/'/g, "''")}'`;
      if (k === "url") return `'${url.replace(/'/g, "''")}'`;
      return `'${String(data[k]).replace(/'/g, "''")}'`;
    });
    db.run(`INSERT INTO articles (${allCols.join(", ")}) VALUES (${vals.join(", ")})`);
  }

  persist();
}

/**
 * Get all articles for a client, ordered by most recently read/created.
 * @param {string} clientId
 * @returns {Array<{id:number;url:string;title:string;author:string|null;publication_date:string|null;domain:string|null;content:string|null;created_at:string|null;read_at:string|null}>}
 */
export function getArticles(clientId) {
  if (!db) return [];
  const result = db.exec(
    `SELECT id, url, title, author, publication_date, domain, content, created_at, read_at
     FROM articles
     WHERE client_id = '${clientId.replace(/'/g, "''")}'
     ORDER BY COALESCE(read_at, created_at) DESC`
  );
  if (result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row) => {
    /** @type {any} */
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * Get a single article by its DB id and client_id.
 * @param {string} clientId
 * @param {number} articleId
 * @returns {object | null}
 */
export function getArticleById(clientId, articleId) {
  if (!db) return null;
  const result = db.exec(
    `SELECT id, url, title, author, publication_date, domain, content, created_at, read_at
     FROM articles
     WHERE id = ${articleId} AND client_id = '${clientId.replace(/'/g, "''")}'`
  );
  if (result.length === 0 || result[0].values.length === 0) return null;
  const { columns, values } = result[0];
  const obj = {};
  columns.forEach((col, i) => {
    obj[col] = values[0][i];
  });
  return obj;
}
