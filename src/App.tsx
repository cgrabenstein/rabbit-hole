import { useCallback, useEffect, useState } from "react";
import { CaptureForm } from "./components/CaptureForm";
import { GraphCanvas } from "./components/GraphCanvas";
import { SourceDetail } from "./components/SourceDetail";
import { ReadingView } from "./components/ReadingView";
import { EmptyState } from "./components/EmptyState";
import { Toast, type ToastMessage } from "./components/Toast";
import { useSources } from "./hooks/useSources";
import type { Source } from "./db/types";
import "./App.css";

export default function App() {
  const { sources, refresh } = useSources();

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showCapture, setShowCapture] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [readingSourceId, setReadingSourceId] = useState<number | null>(null);

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

  const handleNodeClick = useCallback(
    (source: Source) => {
      // Always attempt reading — ReadingView falls back to SourceDetail if unreadable
      setReadingSourceId(source.id!);
    },
    []
  );

  const handleReadingBack = useCallback(() => {
    setReadingSourceId(null);
  }, []);

  const handleReadingFallback = useCallback(
    (source: Source) => {
      setReadingSourceId(null);
      setSelectedSource(source);
    },
    []
  );

  const handleClosePanel = useCallback(() => {
    setSelectedSource(null);
  }, []);

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
          <h1 className="app__title">🐇 Rabbit Hole</h1>
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
          <div className="app__graph-area">
            <GraphCanvas sources={sources} onSelectSource={handleNodeClick} />
          </div>
        ) : (
          <EmptyState />
        )}

        {/* ── detail panel ── */}
        {selectedSource && (
          <SourceDetail source={selectedSource} onClose={handleClosePanel} />
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
