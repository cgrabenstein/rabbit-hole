Status: done

> **Housekeeping note (2026-07-05):** Implemented in commit `653bc71` with subsequent fixes (`e9a9975`, `f89b21d`). One AC item partially open: auto-layout attractive force between connected nodes (needs d3 force link distance tuning).

# Manual connections

## What to build

Allow the user to create a directed Connection between two Sources on the canvas. The interaction flow is through the detail panel, not a direct drag on the canvas (since tapping a node opens the detail panel).

## Interaction design

1. **Tap source A** → detail panel opens (current behavior)
2. **Detail panel has a "Connect" button** → tapping it enters **connect mode**
3. Detail panel closes, source A gets a visual highlight (pulsing border, brighter fill)
4. **Tap source B** → creates a directed relationship A → B, stored in IndexedDB
5. Relationship renders as a visible line/arrow on the canvas
6. Source A returns to normal appearance

### Detail panel interactions during connect mode
- Tapping the canvas background cancels connect mode
- Tapping source A again (the source being connected from) cancels connect mode
- Tapping any other source B creates the connection

## Acceptance criteria

- [x] "Link" button in NodePopover enters linking mode (connect mode)
- [x] Source in linking mode has visual indicator (`graph__card--linking` CSS class)
- [x] Tapping a second source creates a directed Relationship and renders it as arrow
- [~] Auto-layout adjusts to keep connected sources nearby (attractive force in simulation — needs d3 force tuning)
- [x] Connection can be removed (via NodePopover "Connected" list remove button)
- [x] Tapping canvas background or the originating node cancels linking mode
- [x] Multiple connections from a single source are supported
- [x] Existing relationships render as arrows on canvas load

## Blocked by

- `#05` (needs detail panel as the action surface)
- Node positions should be draggable first (see #07) so users can manually arrange connected clusters

