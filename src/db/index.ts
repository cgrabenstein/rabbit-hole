import type { Source, StoredArticle, Relationship } from "./types";

const DB_NAME = "rabbit-hole";
const DB_VERSION = 2;
const STORE_SOURCES = "sources";
const STORE_ARTICLES = "articles";
const STORE_RELATIONSHIPS = "relationships";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;

      // ── sources store (v1) ──
      if (!db.objectStoreNames.contains(STORE_SOURCES)) {
        const store = db.createObjectStore(STORE_SOURCES, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("url", "url", { unique: true });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }

      // ── articles store (v2) ──
      if (!db.objectStoreNames.contains(STORE_ARTICLES)) {
        db.createObjectStore(STORE_ARTICLES, {
          keyPath: "sourceId",
        });
      }

      // ── relationships store (v2) ──
      if (!db.objectStoreNames.contains(STORE_RELATIONSHIPS)) {
        const relStore = db.createObjectStore(STORE_RELATIONSHIPS, {
          keyPath: "id",
          autoIncrement: true,
        });
        relStore.createIndex("sourceId", "sourceId", { unique: false });
        relStore.createIndex("targetId", "targetId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Sources ──

export async function addSource(source: Omit<Source, "id">): Promise<Source> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SOURCES, "readwrite");
    const store = tx.objectStore(STORE_SOURCES);
    const request = store.add(source);
    request.onsuccess = () => {
      resolve({ ...source, id: request.result as number });
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function updateSource(
  id: number,
  updates: Partial<Pick<Source, "author" | "publicationDate" | "domain">>
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SOURCES, "readwrite");
    const store = tx.objectStore(STORE_SOURCES);
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const source = getRequest.result as Source | undefined;
      if (!source) {
        reject(new Error(`Source with id ${id} not found`));
        return;
      }
      store.put({ ...source, ...updates });
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllSources(): Promise<Source[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SOURCES, "readonly");
    const store = tx.objectStore(STORE_SOURCES);
    const request = store.index("createdAt").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

// ── Articles ──

export async function saveArticle(article: StoredArticle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ARTICLES, "readwrite");
    const store = tx.objectStore(STORE_ARTICLES);
    store.put(article);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getArticle(
  sourceId: number
): Promise<StoredArticle | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ARTICLES, "readonly");
    const store = tx.objectStore(STORE_ARTICLES);
    const request = store.get(sourceId);
    request.onsuccess = () => {
      resolve(request.result ?? undefined);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

// ── Relationships ──

export async function addRelationship(
  rel: Omit<Relationship, "id">
): Promise<Relationship> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RELATIONSHIPS, "readwrite");
    const store = tx.objectStore(STORE_RELATIONSHIPS);
    const request = store.add(rel);
    request.onsuccess = () => {
      resolve({ ...rel, id: request.result as number });
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getRelationshipsForSource(
  sourceId: number
): Promise<Relationship[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RELATIONSHIPS, "readonly");
    const store = tx.objectStore(STORE_RELATIONSHIPS);
    const index = store.index("sourceId");
    const request = index.getAll(sourceId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}
