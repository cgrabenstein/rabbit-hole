import { memo, useRef, useState, useEffect, useCallback } from "react";
import type { Source } from "../db/types";
import { computeLayout, type LayoutNode } from "../lib/forceLayout";
import "./GraphCanvas.css";

interface GraphCanvasProps {
  sources: Source[];
  onSelectSource: (source: Source) => void;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

function GraphCanvasInner({ sources, onSelectSource }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // ── layout ──
  const [nodes, setNodes] = useState<LayoutNode[]>([]);
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
  }, []);

  useEffect(() => {
    const nodeData: LayoutNode[] = sources.map((s) => ({ id: s.id! }));
    const laid = computeLayout(nodeData, dimensions.width, dimensions.height);
    setNodes(laid);
  }, [sources, dimensions]);

  // ── pan / zoom state ──
  const [transform, setTransform] = useState<ViewTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });

  // Refs to avoid stale closures in native event handlers
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const panningRef = useRef(false);
  const panAnchorRef = useRef({ x: 0, y: 0 });

  // ── pinch zoom state ──
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDistRef = useRef(0);

  // ── native pointer events (supports multi-touch for pinch zoom) ──
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onPointerDown = (e: PointerEvent) => {
      activePointers.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });

      if (activePointers.current.size === 1) {
        // Single pointer → pan
        const t = transformRef.current;
        panningRef.current = true;
        panAnchorRef.current = {
          x: e.clientX - t.x,
          y: e.clientY - t.y,
        };
      } else if (activePointers.current.size === 2) {
        // Two pointers → pinch zoom start
        const pts = [...activePointers.current.values()];
        pinchDistRef.current = Math.hypot(
          pts[1].x - pts[0].x,
          pts[1].y - pts[0].y
        );
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const prev = activePointers.current.get(e.pointerId);
      if (!prev) return;

      if (activePointers.current.size === 1 && panningRef.current) {
        // Pan
        setTransform((t) => ({
          ...t,
          x: e.clientX - panAnchorRef.current.x,
          y: e.clientY - panAnchorRef.current.y,
        }));
      } else if (activePointers.current.size === 2) {
        // Pinch zoom
        const pts = [...activePointers.current.values()];
        const dist = Math.hypot(
          pts[1].x - pts[0].x,
          pts[1].y - pts[0].y
        );

        setTransform((t) => {
          const factor = dist / pinchDistRef.current;
          const newScale = Math.min(5, Math.max(0.15, t.scale * factor));

          // Zoom towards midpoint of the two fingers
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

      // Update stored position
      activePointers.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });
    };

    const onPointerUp = (e: PointerEvent) => {
      activePointers.current.delete(e.pointerId);
      if (activePointers.current.size === 0) {
        panningRef.current = false;
      }
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

  // ── scroll-wheel zoom (desktop) ──
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

  // ── node click opens reading view ──
  const handleNodeClick = useCallback(
    (e: React.MouseEvent, source: Source) => {
      e.stopPropagation();
      onSelectSource(source);
    },
    [onSelectSource]
  );

  // ── card dimensions per title ──
  const CARD_PAD_X = 14;
  const CARD_PAD_Y = 8;
  const CARD_RADIUS = 8;
  const FONT_SIZE = 11;
  const CHAR_W = 6.5;
  const MAX_CHARS = 40;

  return (
    <div className="graph-canvas" ref={containerRef}>
      <svg
        ref={svgRef}
        className="graph-canvas__svg"
        onWheel={handleWheel}
      >
        <rect
          className="graph__bg"
          width="100%"
          height="100%"
          fill="transparent"
        />

        <g
          className="graph__layer"
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
        >
          {nodes.map((node) => {
            const source = sources.find((s) => s.id === node.id);
            if (!source) return null;

            const label =
              source.title.length > MAX_CHARS
                ? source.title.slice(0, MAX_CHARS) + "…"
                : source.title;

            const textW = label.length * CHAR_W;
            const cardW = textW + CARD_PAD_X * 2;
            const cardH = FONT_SIZE + CARD_PAD_Y * 2;

            const cx = node.x ?? 0;
            const cy = node.y ?? 0;

            return (
              <g
                key={node.id}
                onClick={(e) => handleNodeClick(e, source)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  className="graph__card"
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
    </div>
  );
}

/** Memoized so the SVG never re-renders when unrelated state changes in the parent. */
export const GraphCanvas = memo(GraphCanvasInner);
