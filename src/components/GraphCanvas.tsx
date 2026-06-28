import { memo, useRef, useState, useEffect, useCallback } from "react";
import type { Source, Relationship } from "../db/types";
import { computeLayout, type LayoutNode } from "../lib/forceLayout";
import { NodePopover } from "./NodePopover";
import "./GraphCanvas.css";

interface GraphCanvasProps {
  sources: Source[];
  relationships: Relationship[];
  onRead: (source: Source) => void;
  onDelete: (source: Source) => void;
  onConnect: (sourceA: Source, sourceB: Source) => void;
  onDetails?: (source: Source) => void;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

const CARD_PAD_X = 14;
const CARD_PAD_Y = 8;
const CARD_RADIUS = 8;
const FONT_SIZE = 11;
const CHAR_W = 6.5;
const MAX_CHARS = 40;

function useNodePositions(sources: Source[], width: number, height: number) {
  const [nodes, setNodes] = useState<LayoutNode[]>([]);

  useEffect(() => {
    const nodeData: LayoutNode[] = sources.map((s) => ({ id: s.id! }));
    const laid = computeLayout(nodeData, width, height);
    setNodes(laid);
  }, [sources, width, height]);

  return nodes;
}

function useContainerSize(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);
  return dimensions;
}

function nodeToScreen(
  nodeX: number,
  nodeY: number,
  transform: ViewTransform
): { x: number; y: number } {
  return {
    x: nodeX * transform.scale + transform.x,
    y: nodeY * transform.scale + transform.y,
  };
}

function GraphCanvasInner({
  sources,
  relationships,
  onRead,
  onDelete,
  onConnect,
  onDetails,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const dimensions = useContainerSize(containerRef);
  const nodes = useNodePositions(sources, dimensions.width, dimensions.height);

  // ── view transform ──
  const [transform, setTransform] = useState<ViewTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // ── pointer state (pan + pinch) ──
  const panningRef = useRef(false);
  const panAnchorRef = useRef({ x: 0, y: 0 });
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDistRef = useRef(0);

  // ── selection / linking state ──
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [linkingSource, setLinkingSource] = useState<Source | null>(null);

  // Find node index for a source ID
  const getNode = useCallback(
    (id: number) => nodes.find((n) => n.id === id),
    [nodes]
  );

  // ── popover helpers ──
  const getCardDimensions = (title: string) => {
    const label =
      title.length > MAX_CHARS ? title.slice(0, MAX_CHARS) + "…" : title;
    const textW = label.length * CHAR_W;
    return {
      cardW: textW + CARD_PAD_X * 2,
      cardH: FONT_SIZE + CARD_PAD_Y * 2,
      label,
    };
  };

  // ── native pointer events (pan + pinch) ──
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onPointerDown = (e: PointerEvent) => {
      activePointers.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });

      if (activePointers.current.size === 1) {
        const t = transformRef.current;
        panningRef.current = true;
        panAnchorRef.current = { x: e.clientX - t.x, y: e.clientY - t.y };
      } else if (activePointers.current.size === 2) {
        const pts = [...activePointers.current.values()];
        pinchDistRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const prev = activePointers.current.get(e.pointerId);
      if (!prev) return;

      if (activePointers.current.size === 1 && panningRef.current) {
        setTransform((t) => ({
          ...t,
          x: e.clientX - panAnchorRef.current.x,
          y: e.clientY - panAnchorRef.current.y,
        }));
      } else if (activePointers.current.size === 2) {
        const pts = [...activePointers.current.values()];
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        setTransform((t) => {
          const factor = dist / pinchDistRef.current;
          const newScale = Math.min(5, Math.max(0.15, t.scale * factor));
          const midX = (pts[0].x + pts[1].x) / 2;
          const midY = (pts[0].y + pts[1].y) / 2;
          const rect = svg.getBoundingClientRect();
          const mx = midX - rect.left;
          const my = midY - rect.top;
          const nx = mx - (mx - t.x) * (newScale / t.scale);
          const ny = my - (my - t.y) * (newScale / t.scale);
          return { x: nx, y: ny, scale: newScale };
        });
        pinchDistRef.current = dist;
      }

      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };

    const onPointerUp = (e: PointerEvent) => {
      activePointers.current.delete(e.pointerId);
      if (activePointers.current.size === 0) panningRef.current = false;
    };

    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerup", onPointerUp);
    svg.addEventListener("pointercancel", onPointerUp);
    svg.addEventListener("pointerleave", onPointerUp);
    return () => {
      svg.removeEventListener("pointerdown", onPointerDown);
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointerup", onPointerUp);
      svg.removeEventListener("pointercancel", onPointerUp);
      svg.removeEventListener("pointerleave", onPointerUp);
    };
  }, []);

  // ── scroll-wheel zoom ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((t) => {
      const newScale = Math.min(5, Math.max(0.15, t.scale * delta));
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return t;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const nx = mx - (mx - t.x) * (newScale / t.scale);
      const ny = my - (my - t.y) * (newScale / t.scale);
      return { x: nx, y: ny, scale: newScale };
    });
  }, []);

  // ── node click ──
  const handleNodeClick = useCallback(
    (e: React.MouseEvent, source: Source) => {
      e.stopPropagation();

      // If in linking mode, the clicked node is the target
      if (linkingSource) {
        if (linkingSource.id === source.id) {
          // Clicking the same node cancels linking
          setLinkingSource(null);
          setSelectedSource(source);
          return;
        }
        onConnect(linkingSource, source);
        setLinkingSource(null);
        setSelectedSource(null);
        return;
      }

      // Normal: open popover
      setSelectedSource((prev) =>
        prev?.id === source.id ? null : source
      );
    },
    [linkingSource, onConnect]
  );

  // ── canvas background click ──
  const handleBgClick = useCallback(() => {
    if (linkingSource) {
      setLinkingSource(null);
      return;
    }
    setSelectedSource(null);
  }, [linkingSource]);

  // ── popover actions ──
  const handlePopoverRead = useCallback(
    (source: Source) => {
      setSelectedSource(null);
      onRead(source);
    },
    [onRead]
  );

  const handlePopoverLink = useCallback(
    (source: Source) => {
      setSelectedSource(null);
      setLinkingSource(source);
    },
    []
  );

  const handlePopoverDelete = useCallback(
    (source: Source) => {
      setSelectedSource(null);
      onDelete(source);
    },
    [onDelete]
  );

  const handlePopoverDetails = useCallback(
    (source: Source) => {
      setSelectedSource(null);
      onDetails?.(source);
    },
    [onDetails]
  );

  const handlePopoverClose = useCallback(() => {
    setSelectedSource(null);
  }, []);

  // ── rendering helpers ──

  // Popover position for the selected node
  let popoverPos = { x: 0, y: 0, above: true };
  if (selectedSource) {
    const node = getNode(selectedSource.id!);
    if (node) {
      const { cardH } = getCardDimensions(selectedSource.title);
      const scr = nodeToScreen(node.x ?? 0, node.y ?? 0, transform);
      const cardTopY = scr.y - (cardH / 2) * transform.scale;
      const cardBottomY = scr.y + (cardH / 2) * transform.scale;
      const above = scr.y > 160;

      popoverPos = {
        x: scr.x - 20, // arrow (left:20) aligns with card center
        y: above ? cardTopY : cardBottomY,
        above,
      };
    }
  }

  // SVG arrowhead marker
  const markerId = "arrowhead";

  return (
    <div className="graph-canvas" ref={containerRef}>
      <svg
        ref={svgRef}
        className={`graph-canvas__svg ${linkingSource ? "graph-canvas__svg--linking" : ""}`}
        onWheel={handleWheel}
        onClick={handleBgClick}
      >
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#4a4a7a" />
          </marker>
        </defs>

        <rect className="graph__bg" width="100%" height="100%" fill="transparent" />

        <g
          className="graph__layer"
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
        >
          {/* ── relationship lines ── */}
          {relationships.map((rel) => {
            const fromNode = nodes.find((n) => n.id === rel.sourceId);
            const toNode = nodes.find((n) => n.id === rel.targetId);
            if (!fromNode || !toNode) return null;

            return (
              <line
                key={rel.id}
                className="graph__rel"
                x1={fromNode.x ?? 0}
                y1={fromNode.y ?? 0}
                x2={toNode.x ?? 0}
                y2={toNode.y ?? 0}
                markerEnd={`url(#${markerId})`}
              />
            );
          })}

          {/* ── node cards ── */}
          {nodes.map((node) => {
            const source = sources.find((s) => s.id === node.id);
            if (!source) return null;

            const { label, cardW, cardH } = getCardDimensions(source.title);
            const cx = node.x ?? 0;
            const cy = node.y ?? 0;
            const isLinking = linkingSource?.id === node.id;
            const isSelected = selectedSource?.id === node.id;

            return (
              <g
                key={node.id}
                onClick={(e) => handleNodeClick(e, source)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  className={`graph__card ${isLinking ? "graph__card--linking" : ""} ${isSelected ? "graph__card--selected" : ""}`}
                  x={cx - cardW / 2}
                  y={cy - cardH / 2}
                  width={cardW}
                  height={cardH}
                  rx={CARD_RADIUS}
                  ry={CARD_RADIUS}
                />
                <text
                  className="graph__label"
                  x={cx}
                  y={cy + FONT_SIZE / 2 - 1}
                  textAnchor="middle"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── linking mode hint ── */}
      {linkingSource && (
        <div className="graph-canvas__hint">
          Tap another source to create a connection
        </div>
      )}

      {/* ── node popover ── */}
      {selectedSource && (
        <NodePopover
          source={selectedSource}
          x={popoverPos.x}
          y={popoverPos.y}
          above={popoverPos.above}
          onRead={handlePopoverRead}
          onLink={handlePopoverLink}
          onDelete={handlePopoverDelete}
          onDetails={handlePopoverDetails}
          onClose={handlePopoverClose}
        />
      )}
    </div>
  );
}

export const GraphCanvas = memo(GraphCanvasInner);
