import type { Source } from "../db/types";
import "./NodePopover.css";

interface NodePopoverProps {
  source: Source;
  /** Left edge of popover (px, relative to container) */
  x: number;
  /** Top edge of card (above=true) or bottom edge of card (above=false) */
  y: number;
  /** Whether the popover sits above or below the card */
  above: boolean;
  onRead: (source: Source) => void;
  onLink: (source: Source) => void;
  onDelete: (source: Source) => void;
  onDetails?: (source: Source) => void;
  onClose: () => void;
}

export function NodePopover({
  source,
  x,
  y,
  above,
  onRead,
  onLink,
  onDelete,
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
      </div>
    </>
  );
}
