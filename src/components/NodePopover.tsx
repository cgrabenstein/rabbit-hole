import type { Source } from "../db/types";
import "./NodePopover.css";

interface NodePopoverProps {
  source: Source;
  /** Position relative to the canvas container (px) */
  x: number;
  y: number;
  /** Y position of the node's center (for orientation) — above if room, below if near top edge */
  nodeCenterY: number;
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
  nodeCenterY,
  onRead,
  onLink,
  onDelete,
  onDetails,
  onClose,
}: NodePopoverProps) {
  // Popover opens above the card by default; if near top edge, open below
  const above = nodeCenterY > 160;
  const popY = above ? y : y + 20;
  const arrowDir = above ? "down" : "up";

  return (
    <>
      {/* Invisible backdrop to catch clicks outside */}
      <div className="popover__backdrop" onClick={onClose} />
      <div
        className="popover"
        style={{ left: x, top: popY }}
      >
        {/* Arrow pointing to the node */}
        <div className={`popover__arrow popover__arrow--${arrowDir}`} />

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
