Status: ready-for-agent

# Tags

## What to build

Tags are lightweight labels applied to Sources for ad-hoc organization. Unlike the basic label approach, **tags appear as entities on the graph itself** — a tagged Source gets a visual relationship to its tag node. This makes tags navigable and discoverable on the canvas, not just a filter.

## Key design decision

Tags are **graph entities** — they render as their own nodes (card-style, like Sources, but visually distinct — e.g. a different background color, hash/pound prefix). A tagged Source automatically gets a visual relationship line to its tag node.

This means:
- Adding a tag to a Source creates a tag entity (if it doesn't exist) and a relationship
- Removing the last Source from a tag removes the tag node
- Tags have a different visual style from Source cards (e.g. `#tag-name` in a colored badge)
- No predefined taxonomy — tags are freeform strings

## Interaction

- **Add tag**: From SourceDetail panel, text input + "Add" button
- **Remove tag**: From SourceDetail panel or from the tag node itself
- **See all tags**: Tags with any Sources appear as nodes on the canvas
- **Navigate**: Tap a tag node → show all Sources with that tag (highlight/pulse them; or filter canvas to only tagged Sources)

## Acceptance criteria

- [ ] User can add a tag as a freeform text string from SourceDetail panel
- [ ] User can remove a tag from a Source
- [ ] Tags are stored in a dedicated IndexedDB store (`tags` + a junction/relationship approach)
- [ ] Tags appear as distinct card-style nodes on the canvas (different color, `#` prefix)
- [ ] Tagged Sources have a visual relationship line to the tag node
- [ ] Tapping a tag node highlights/centers all Sources with that tag
- [ ] When the last Source is removed from a tag, the tag node disappears
- [ ] Empty/deferred state if no tags exist yet

## Storage approach

```
tags store: { id, name, createdAt }
tag_assignments store: { tagId, sourceId } — IndexedDB composite key or separate store
```

Relationships between tag and source are also stored in the existing `relationships` store (so the graph renders them naturally), but the tag_assignments store ensures consistent querying.

## Blocked by

- `#06` (relationships rendering on canvas is needed for tag→source edges)
- `#07` (draggable nodes help users arrange tag clusters)

