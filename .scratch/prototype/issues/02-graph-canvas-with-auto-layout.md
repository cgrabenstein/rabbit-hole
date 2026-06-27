Status: ready-for-agent

# Graph canvas with auto-layout

## What to build

Read Sources from IndexedDB and render them as dots on an interactive 2D canvas. Use a simple auto-layout (grid layout or basic force-directed) to position dots. The user can pan/zoom the canvas. Clicking a dot shows the Source title in a tooltip or minimal popover.

This is the first visual representation of the graph — the core "map" interface.

## Acceptance criteria

- [ ] Canvas renders saved Sources as dots/nodes
- [ ] Auto-layout positions dots without overlapping
- [ ] User can pan and zoom the canvas
- [ ] Clicking a dot displays the Source title
- [ ] When a new Source is added (via capture), the canvas updates to include it
- [ ] Empty state shown when no Sources exist yet

## Blocked by

- `#01` (project scaffold and manual capture — needs stored Sources)
