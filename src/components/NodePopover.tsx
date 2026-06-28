import type { Source } from "../db/types";
import "./NodePopover.css";

interface PopoverConnection {
  relationshipId: number;
  title: string;
}

interface NodePopoverProps {
  source: Source;
  x: number;
  y: number;
  above: boolean;
  connections?: PopoverConnection[];
  onRead: (source: Source) => void;
  onLink: (source: Source) => void;
  onDelete: (source: Source) => void;
  onRemoveConnection: (relationshipId: number) => void;
  onDetails?: (source: Source) => void;
  onClose: () => void;
}

export function NodePopover({
  source,
  x,
  y,
  above,
  connections,
  onRead,
  onLink,
  onDelete,
  onRemoveConnection,
  onDetails,
  onClose,
}: NodePopoverProps) {
  return (
    <>
      <div className="popover__backdrop" onClick={onClose} />
      <div
        className={`popover popover--${above ? "above" : "below"}`}
        style={{ left: x, top: y }}
      >
        <div className={`popover__arrow popover__arrow--${above ? "down" : "up"}`} />

        <div className="popover__header">
          <span className="popover__title">
            {source.title.length > 50
              ? source.title.slice(0, 50) + "…"
              : source.title}
          </span>
          <button className="popover__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="popover__actions">
          <button className="popover__btn popover__btn--read" onClick={() => onRead(source)}>
            Read
          </button>
          <button className="popover__btn popover__btn--link" onClick={() => onLink(source)}>
            Link
          </button>
          {onDetails && (
            <button className="popover__btn popover__btn--details" onClick={() => onDetails(source)}>
              Details
            </button>
          )}
          <button
            className="popover__btn popover__btn--delete"
            onClick={() => {
              if (window.confirm(`Delete "${source.title.slice(0, 60)}"?`)) {
                onDelete(source);
              }
            }}
          >
            Delete
          </button>
        </div>

        {/* ── connected sources ── */}
        {connections && connections.length > 0 && (
          <div className="popover__connections">
            <span className="popover__connections-label">Connected</span>
            {connections.map((c) => (
              <div key={c.relationshipId} className="popover__connection-row">
                <span className="popover__connection-title">
                  {c.title.length > 35
                    ? c.title.slice(0, 35) + "…"
                    : c.title}
                </span>
                <button
                  className="popover__connection-remove"
                  onClick={() => onRemoveConnection(c.relationshipId)}
                  aria-label="Remove connection"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
