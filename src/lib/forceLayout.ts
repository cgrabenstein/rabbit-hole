import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
} from "d3-force";

export interface LayoutNode extends SimulationNodeDatum {
  id: number;
}

/**
 * Run a synchronous force-directed simulation to position nodes
 * without overlap, centered in the available area.
 */
export function computeLayout(
  nodes: LayoutNode[],
  width: number,
  height: number
): LayoutNode[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    return [{ ...nodes[0], x: width / 2, y: height / 2 }];
  }

  // Clone so we don't mutate the original
  const data = nodes.map((n) => ({ ...n }));

  const sim = forceSimulation(data)
    .force("charge", forceManyBody().strength(-400))
    .force("center", forceCenter(width / 2, height / 2))
    .force("collide", forceCollide(30))
    .stop();

  // Tick until settled
  for (let i = 0; i < 200; i++) sim.tick();

  return data;
}
