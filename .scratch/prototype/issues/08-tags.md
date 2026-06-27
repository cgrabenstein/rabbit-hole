Status: ready-for-agent

# Tags

## What to build

Let the user add lightweight Tags to a Source from the detail panel. Tags are freeform strings (no predefined taxonomy). Store tags in IndexedDB. Show tag badges on Source dots in the canvas. Provide a tag filter mode — selecting a tag filters the canvas to show only Sources with that tag. Multiple tags per Source.

## Acceptance criteria

- [ ] User can add a tag (from detail panel) as a freeform text string
- [ ] User can remove a tag from a Source
- [ ] Tags are persisted in IndexedDB
- [ ] Tag badges are visible on Source dots in the canvas
- [ ] Tag filtering: selecting a tag shows only tagged Sources
- [ ] Multiple tags can be added to a single Source
- [ ] Empty/deferred state if no tags exist yet

## Blocked by

- `#05` (needs detail panel as the UI surface for tag management)
