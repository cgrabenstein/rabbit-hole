import { useState, useMemo } from "react";
import type { Source } from "../db/types";
import "./SourceList.css";

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface SourceListProps {
  sources: Source[];
  onRead: (source: Source) => void;
  onDelete: (source: Source) => void;
}

type SortKey = "newest" | "oldest" | "title" | "domain";

export function SourceList({ sources, onRead, onDelete }: SourceListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const sorted = useMemo(() => {
    const copy = [...sources];
    switch (sortKey) {
      case "newest":
        return copy.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "oldest":
        return copy.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "title":
        return copy.sort((a, b) => a.title.localeCompare(b.title));
      case "domain":
        return copy.sort((a, b) =>
          extractDomain(a.url).localeCompare(extractDomain(b.url))
        );
      default:
        return copy;
    }
  }, [sources, sortKey]);

  return (
    <div className="source-list">
      <div className="source-list__header">
        <h2 className="source-list__title">Sources</h2>
        <select
          className="source-list__sort"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label="Sort sources"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="title">Title A–Z</option>
          <option value="domain">Domain</option>
        </select>
      </div>
      <div className="source-list__body">
        {sorted.length === 0 && (
          <div className="source-list__empty">No sources yet</div>
        )}
        {sorted.map((source) => (
          <div key={source.id} className="source-list__row">
            <div className="source-list__row-info">
              <div className="source-list__row-title">{source.title}</div>
              <div className="source-list__row-meta">
                <span className="source-list__row-domain">
                  {extractDomain(source.url)}
                </span>
                <span className="source-list__row-sep">·</span>
                <span className="source-list__row-date">
                  {formatDate(source.createdAt)}
                </span>
              </div>
            </div>
            <div className="source-list__row-actions">
              <button
                className="source-list__btn source-list__btn--read"
                onClick={() => onRead(source)}
              >
                Read
              </button>
              <button
                className="source-list__btn source-list__btn--delete"
                onClick={() => {
                  if (window.confirm(`Delete "${source.title.slice(0, 60)}"?`)) {
                    onDelete(source);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
