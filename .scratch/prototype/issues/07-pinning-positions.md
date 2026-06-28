Status: ready-for-agent

# Draggable nodes + pinning positions

## What to build

Two related features, implemented in order:

### Phase 1: Draggable nodes

Currently nodes are positioned by the force-layout simulation and don't respond to drag. Make nodes directly draggable on the canvas so the user can manually arrange them. Store the dragged position in memory so it persists across layout recalculations.

- Pointer events on SVG nodes: pointerdown starts drag, pointermove updates position, pointerup commits
- When a node has a user-set position, the force-layout should treat it as fixed (not re-position it)
- Store user positions in-memory (IndexedDB optional for now)

### Phase 2: Pin toggle

Once dragging works, add a Pin button to the detail panel. Pinning is the same as having dragged a node — it fixes the position against auto-layout. The difference is:
- A pinned node shows a visual indicator (pin icon, different border color)
- Pinning from the detail panel acts as a lock (even without dragging)
- Unpin releases the node back to auto-layout control

### Acceptance criteria (Phase 1)

- [ ] Nodes are draggable via pointer events (works on both desktop and touch)
- [ ] Dragged position is retained across layout recalculations
- [ ] Force-layout does not re-position nodes with user-set positions
- [ ] Drag interaction does not conflict with node tapping (tap = detail panel, drag = move)

### Acceptance criteria (Phase 2)

- [ ] "Pin" toggle in SourceDetail panel fixes/unfixes node position
- [ ] Pinned nodes show a visual indicator (pin icon, different border/stroke)
- [ ] Unpin releases node to auto-layout
- [ ] Pin state is persisted in IndexedDB

## Blocked by

- Nothing — the interaction primitives (pointer events, detail panel) are all in place

