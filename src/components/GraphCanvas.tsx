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

const NODE_RADIUS = 10;

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

  // ── pan / zoom ──
  const [transform, setTransform] = useState<ViewTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const panning = useRef(false);
  const panAnchor = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as Element;
      if (
        target === svgRef.current ||
        target.classList.contains("graph__layer") ||
        target.classList.contains("graph__bg")
      ) {
        panning.current = true;
        panAnchor.current = {
          x: e.clientX - transform.x,
          y: e.clientY - transform.y,
        };
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }
    },
    [transform]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!panning.current) return;
      setTransform((t) => ({
        ...t,
        x: e.clientX - panAnchor.current.x,
        y: e.clientY - panAnchor.current.y,
      }));
    },
    []
  );

  const handlePointerUp = useCallback(() => {
    panning.current = false;
  }, []);

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

  // ── node click opens detail panel ──
  const handleNodeClick = useCallback(
    (e: React.MouseEvent, source: Source) => {
      e.stopPropagation();
      onSelectSource(source);
    },
    [onSelectSource]
  );

  return (
    <div className="graph-canvas" ref={containerRef}>
      <svg
        ref={svgRef}
        className="graph-canvas__svg"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
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
            return (
              <g key={node.id} onClick={(e) => handleNodeClick(e, source)} style={{cursor: 'pointer'}}>
                <circle
                  className="graph__node"
                  cx={node.x ?? 0}
                  cy={node.y ?? 0}
                  r={NODE_RADIUS}
                />
                <text
                  className="graph__label"
                  x={(node.x ?? 0) + NODE_RADIUS + 6}
                  y={(node.y ?? 0) + 4}
                >
                  {source.title.length > 35
                    ? source.title.slice(0, 35) + "…"
                    : source.title}
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
