Status: ready-for-agent

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

- [ ] "Connect" button in SourceDetail panel enters connect mode
- [ ] Source in connect mode has a visual indicator (pulsing border / bright fill)
- [ ] Tapping a second source creates a directed Relationship and renders it as an arrow
- [ ] Auto-layout adjusts to keep connected sources nearby (attractive force in simulation)
- [ ] Connection can be removed (from detail panel of either endpoint)
- [ ] Tapping canvas background or the originating node cancels connect mode
- [ ] Multiple connections from a single source are supported
- [ ] Existing relationships render as arrows on canvas load

## Blocked by

- `#05` (needs detail panel as the action surface)
- Node positions should be draggable first (see #07) so users can manually arrange connected clusters

