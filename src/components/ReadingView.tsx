import { useEffect, useRef, useState, useCallback } from "react";
import type { Source } from "../db/types";
import type { ToastMessage } from "./Toast";
import { fetchArticle } from "../api/fetchArticle";
import { fetchTitle } from "../api/fetchTitle";
import {
  addSource,
  getArticle,
  saveArticle,
  updateSource,
  addRelationship,
} from "../db";
import "./ReadingView.css";

interface ReadingViewProps {
  source: Source;
  onBack: () => void;
  onFallbackToDetail: (source: Source) => void;
  onToast: (text: string, variant: ToastMessage["variant"]) => void;
  onRefresh: () => void;
}

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; content: string }
  | { status: "error"; message: string };

export function ReadingView({
  source,
  onBack,
  onFallbackToDetail,
  onToast,
  onRefresh,
}: ReadingViewProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const contentRef = useRef<HTMLDivElement>(null);

  // ── load article ──
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Check cache first
      const cached = await getArticle(source.id!);
      if (cached) {
        if (!cancelled) {
          setLoadState({ status: "loaded", content: cached.content });
        }
        return;
      }

      // Fetch from server
      try {
        const result = await fetchArticle(source.url);
        if (cancelled) return;

        // Store article content
        await saveArticle({
          sourceId: source.id!,
          content: result.content,
          readAt: new Date().toISOString(),
        });

        // Save enrichment to source metadata (if we got anything new)
        const updates: Partial<Pick<Source, "author" | "publicationDate" | "domain">> = {};
        if (result.author && result.author !== source.author) updates.author = result.author;
        if (result.publicationDate && result.publicationDate !== source.publicationDate)
          updates.publicationDate = result.publicationDate;
        if (result.domain && result.domain !== source.domain) updates.domain = result.domain;
        if (Object.keys(updates).length > 0) {
          await updateSource(source.id!, updates);
          onRefresh();
        }

        setLoadState({ status: "loaded", content: result.content });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setLoadState({ status: "error", message: msg });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [source, onRefresh]);

  // ── handle link clicks → capture + relationship ──
  const handleLinkClick = useCallback(
    async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest<HTMLAnchorElement>("a");
      if (!anchor || !anchor.href) return;
      if (!anchor.href.startsWith("http")) return;

      e.preventDefault();

      try {
        const { title } = await fetchTitle(anchor.href);
        const saved = await addSource({
          url: anchor.href,
          title,
          createdAt: new Date().toISOString(),
        });

        await addRelationship({
          sourceId: source.id!,
          targetId: saved.id!,
          createdAt: new Date().toISOString(),
        });

        onToast(`Captured: ${title}`, "success");
        onRefresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onToast(`Failed to capture: ${msg}`, "error");
      }
    },
    [source, onToast, onRefresh]
  );

  // Attach link click handler to the content area
  useEffect(() => {
    const el = contentRef.current;
    if (!el || loadState.status !== "loaded") return;

    // Prevent stale closures — use a ref for the handler
    el.addEventListener("click", handleLinkClick);
    return () => el.removeEventListener("click", handleLinkClick);
  }, [handleLinkClick, loadState.status]);

  // ── error → fallback to detail panel ──
  useEffect(() => {
    if (loadState.status === "error") {
      onFallbackToDetail(source);
    }
  }, [loadState.status, source, onFallbackToDetail]);

  return (
    <div className="reading-view">
      {/* ── toolbar ── */}
      <div className="reading-view__toolbar">
        <button className="reading-view__back" onClick={onBack} aria-label="Back to graph">
          ← Back
        </button>
        <span className="reading-view__domain">{source.domain || source.url}</span>
      </div>

      {/* ── content ── */}
      <div className="reading-view__scroll">
        {loadState.status === "loading" && (
          <div className="reading-view__loading">
            <p>Loading article…</p>
          </div>
        )}

        {loadState.status === "loaded" && (
          <div className="reading-view__article">
            <h1 className="reading-view__title">{source.title}</h1>
            {(source.author || source.publicationDate) && (
              <p className="reading-view__meta">
                {source.author && <span>{source.author}</span>}
                {source.author && source.publicationDate && <span> · </span>}
                {source.publicationDate && (
                  <span>
                    {new Date(source.publicationDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                )}
              </p>
            )}
            <div
              ref={contentRef}
              className="reading-view__content"
              dangerouslySetInnerHTML={{ __html: loadState.content }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
