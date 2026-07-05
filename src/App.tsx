import { useCallback, useEffect, useState } from "react";
import { CaptureForm } from "./components/CaptureForm";
import { GraphCanvas } from "./components/GraphCanvas";
import { SourceDetail } from "./components/SourceDetail";
import { ReadingView } from "./components/ReadingView";
import { EmptyState } from "./components/EmptyState";
import { SourceList } from "./components/SourceList";
import { Toast, type ToastMessage } from "./components/Toast";
import { useSources } from "./hooks/useSources";
import { fetchTitle } from "./api/fetchTitle";
import {
  addSource,
  deleteSource,
  addRelationship,
  deleteRelationship,
  getAllRelationships,
} from "./db";
import type { Source, Relationship } from "./db/types";
import "./App.css";

export default function App() {
  const { sources, refresh } = useSources();

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showCapture, setShowCapture] = useState(false);
  const [detailSource, setDetailSource] = useState<Source | null>(null);
  const [readingSourceId, setReadingSourceId] = useState<number | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [showList, setShowList] = useState(false);

  // ── Fetch relationships ──
  useEffect(() => {
    getAllRelationships().then(setRelationships);
  }, [sources]);

  const addToast = useCallback(
    (text: string, variant: ToastMessage["variant"]) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, text, variant }]);
    },
    []
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleCaptured = useCallback(
    (title: string) => {
      addToast(`Captured: ${title}`, "success");
      refresh();
      setShowCapture(false);
    },
    [addToast, refresh]
  );

  const handleError = useCallback(
    (msg: string) => {
      addToast(msg, "error");
    },
    [addToast]
  );

  // ── Handle incoming shared URL from Web Share Target ──
  const captureSharedUrl = useCallback(
    async (url: string) => {
      try {
        const { title } = await fetchTitle(url);
        await addSource({ url, title, createdAt: new Date().toISOString() });
        addToast(`Captured: ${title}`, "success");
        refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addToast(msg, "error");
      }
    },
    [addToast, refresh]
  );

  // Popover is managed inside GraphCanvas

  const handleReadingBack = useCallback(() => {
    setReadingSourceId(null);
  }, []);

  const handleReadingFallback = useCallback(
    (_source: Source) => {
      setReadingSourceId(null);
    },
    []
  );

  const handleClosePanel = useCallback(() => {
    setDetailSource(null);
  }, []);

  const handleDeleteSource = useCallback(
    async (source: Source) => {
      try {
        await deleteSource(source.id!);
        addToast(`Deleted: ${source.title}`, "success");
        refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addToast(msg, "error");
      }
    },
    [addToast, refresh]
  );

  const handleReadSource = useCallback((source: Source) => {
    setReadingSourceId(source.id!);
  }, []);

  const handleDetailsSource = useCallback((source: Source) => {
    setDetailSource(source);
  }, []);

  const handleConnect = useCallback(
    async (sourceA: Source, sourceB: Source) => {
      try {
        await addRelationship({
          sourceId: sourceA.id!,
          targetId: sourceB.id!,
          createdAt: new Date().toISOString(),
        });
        addToast(`Connected: ${sourceA.title.slice(0, 30)} → ${sourceB.title.slice(0, 30)}`, "success");
        const updated = await getAllRelationships();
        setRelationships(updated);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addToast(msg, "error");
      }
    },
    [addToast]
  );

  const handleRemoveConnection = useCallback(
    async (relationshipId: number) => {
      try {
        await deleteRelationship(relationshipId);
        const updated = await getAllRelationships();
        setRelationships(updated);
        addToast("Connection removed", "success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addToast(msg, "error");
      }
    },
    [addToast]
  );

  // ── On mount, check for shared URL from Web Share Target ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get("shared_url");
    if (!sharedUrl) return;

    // Clean up URL immediately so refresh doesn't re-trigger
    window.history.replaceState({}, "", "/");

    captureSharedUrl(sharedUrl);
  }, [captureSharedUrl]);

  // Browser back button closes reading view
  useEffect(() => {
    const handler = () => {
      if (readingSourceId !== null) {
        setReadingSourceId(null);
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [readingSourceId]);

  // Push history state when reading view opens
  useEffect(() => {
    if (readingSourceId !== null) {
      window.history.pushState({ reading: true }, "");
    }
  }, [readingSourceId]);

  const hasSources = sources.length > 0;
  const readingSource = readingSourceId
    ? sources.find((s) => s.id === readingSourceId) ?? null
    : null;

  return (
    <div className={`app ${hasSources ? "app--graph" : ""}`}>
      {/* ── main view (canvas) — hidden while reading ── */}
      <div
        className="app__main-view"
        style={{ display: readingSourceId ? "none" : undefined }}
      >
        {/* ── header ── */}
        <header
          className={`app__header ${hasSources ? "app__header--compact" : ""}`}
        >
          <div className="app__title-row">
          <h1 className="app__title">🐇 Rabbit Hole</h1>
          {hasSources && (
            <button
              className="app__list-toggle"
              onClick={() => setShowList((v) => !v)}
              aria-label={showList ? "Hide list" : "Show list"}
            >
              {showList ? "🌐" : "📋"}
            </button>
          )}
          <span className="app__commit-hash">
            {import.meta.env.VITE_COMMIT_HASH || "dev"}
          </span>
        </div>
          {!hasSources && (
            <p className="app__tagline">
              A visual map of everything you read and how ideas connect.
            </p>
          )}
        </header>

        {/* ── capture ── */}
        {hasSources ? (
          <div className="app__capture-bar">
            <CaptureForm onCaptured={handleCaptured} onError={handleError} />
          </div>
        ) : (
          <div className="app__capture-hero">
            <CaptureForm onCaptured={handleCaptured} onError={handleError} />
          </div>
        )}

        {/* ── graph area ── */}
        {hasSources ? (
          <div className={`app__graph-area ${showList ? "app__graph-area--split" : ""}`}>
            <div className="app__canvas-wrapper">
              <GraphCanvas
                sources={sources}
                relationships={relationships}
                onRead={handleReadSource}
                onDelete={handleDeleteSource}
                onConnect={handleConnect}
                onRemoveConnection={handleRemoveConnection}
                onDetails={handleDetailsSource}
              />
            </div>
            {showList && (
              <div className="app__list-panel">
                <SourceList
                  sources={sources}
                  onRead={handleReadSource}
                  onDelete={handleDeleteSource}
                />
              </div>
            )}
          </div>
        ) : (
          <EmptyState />
        )}

        {/* ── detail panel (full metadata, opened from popover Details) ── */}
        {detailSource && (
          <SourceDetail
            source={detailSource}
            onClose={handleClosePanel}
            onDelete={handleDeleteSource}
            onRead={handleReadSource}
          />
        )}
      </div>

      {/* ── reading view ── */}
      {readingSource && (
        <ReadingView
          source={readingSource}
          onBack={handleReadingBack}
          onFallbackToDetail={handleReadingFallback}
          onToast={addToast}
          onRefresh={refresh}
        />
      )}

      {/* ── toasts ── */}
      {toasts.map((t) => (
        <Toast key={t.id} message={t} onDone={removeToast} />
      ))}

      {/* ── mobile FAB ── */}
      {hasSources && !readingSourceId && (
        <button
          className="app__fab"
          onClick={() => setShowCapture((v) => !v)}
          aria-label="Capture a source"
        >
          {showCapture ? "✕" : "+"}
        </button>
      )}
      {showCapture && hasSources && !readingSourceId && (
        <div className="app__fab-overlay" onClick={() => setShowCapture(false)}>
          <div className="app__fab-form" onClick={(e) => e.stopPropagation()}>
            <CaptureForm onCaptured={handleCaptured} onError={handleError} />
          </div>
        </div>
      )}
    </div>
  );
}
