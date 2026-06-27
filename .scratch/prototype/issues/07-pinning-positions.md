Status: ready-for-agent

# Pinning positions

## What to build

Let the user pin a Source dot to its current position on the canvas so it stays in place when auto-layout runs. A pinned dot shows a visual indicator (e.g. pin icon). The auto-layout algorithm skips pinned nodes when computing positions. Unpin to return the dot to auto-layout control.

## Acceptance criteria

- [ ] User can pin a dot (from context menu or detail panel)
- [ ] Pinned dots show a visual indicator (pin icon, different border, etc.)
- [ ] Auto-layout skips pinned dots (their position remains fixed)
- [ ] User can unpin a dot to restore auto-layout
- [ ] Pin state is persisted in IndexedDB
- [ ] New Sources (unpinned by default) are auto-laid-out around pinned ones

## Blocked by

- `#02` (needs canvas with interactive source dots and auto-layout)
