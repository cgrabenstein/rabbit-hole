export interface Source {
  id?: number;
  url: string;
  title: string;
  /** ISO-8601 timestamp of when the source was captured. */
  createdAt: string;

  // ── Enrichment (populated by readability on first read) ──
  author?: string;
  publicationDate?: string;
  domain?: string;
}

export interface StoredArticle {
  sourceId: number;
  /** Cleaned article HTML from Readability. */
  content: string;
  /** ISO-8601 timestamp of when the article was first read. */
  readAt: string;
}

export interface Relationship {
  id?: number;
  /** The source being read when the link was clicked. */
  sourceId: number;
  /** The source that was captured as a result of clicking the link. */
  targetId: number;
  /** ISO-8601 timestamp. */
  createdAt: string;
}
