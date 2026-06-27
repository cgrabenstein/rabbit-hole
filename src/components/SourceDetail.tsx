import { useEffect, useRef } from "react";
import type { Source } from "../db/types";
import "./SourceDetail.css";

interface SourceDetailProps {
  source: Source;
  onClose: () => void;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function SourceDetail({ source, onClose }: SourceDetailProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const hasEnrichment = !!(
    source.author ||
    source.publicationDate ||
    source.domain
  );

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div
        className="detail-panel"
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail-panel__header">
          <span className="detail-panel__heading">Detail</span>
          <button className="detail-panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="detail-panel__body">
          <h2 className="detail-panel__title">{source.title}</h2>

          <a
            className="detail-panel__url"
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {source.url}
          </a>

          <div className="detail-panel__section">
            <h3 className="detail-panel__section-title">Info</h3>

            {hasEnrichment ? (
              <dl className="detail-panel__fields">
                {source.author && (
                  <><dt>Author</dt><dd>{source.author}</dd></>
                )}
                {source.publicationDate && (
                  <><dt>Published</dt><dd>{formatDate(source.publicationDate)}</dd></>
                )}
                {source.domain && (
                  <><dt>Domain</dt><dd>{source.domain}</dd></>
                )}
              </dl>
            ) : (
              <p className="detail-panel__placeholder">
                Enrichment pending — author, date, and domain will appear here
                once the page is processed.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
