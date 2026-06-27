Status: ready-for-agent

# Manual connections

## What to build

Allow the user to draw a Connection between two Source dots on the canvas. Interaction: drag from one dot to another (or click first dot, then click second). Store the Connection in IndexedDB. Render it as a directed arrow/line between the two dots on the canvas.

Auto-layout should factor connections into its positioning (connected sources gravitate toward each other).

## Acceptance criteria

- [ ] User can initiate a connection from one dot to another (drag or click-click)
- [ ] Connection is saved in IndexedDB
- [ ] Connection renders as a visible line/arrow between the two dots
- [ ] Canvas auto-layout adjusts to keep connected sources nearby
- [ ] Connection can be removed (right-click or delete action)
- [ ] Multiple connections from a single source are supported

## Blocked by

- `#02` (needs canvas with interactive source dots)
