Status: done

# Source detail panel

## What to build

When the user clicks a Source dot on the canvas, open a side panel or overlay showing the Source's full metadata: title, URL, author, publication date, domain, and linked articles (from async enrichment). Linked articles are shown as preview cards (title + URL) — tapping one opens the URL or, if that article is also a saved Source, navigates to it in the graph.

## Acceptance criteria

- [ ] Clicking a dot opens a detail panel (side or overlay)
- [ ] Panel shows title, URL, author, date, domain
- [ ] Panel shows linked articles as preview cards
- [ ] Tapping a linked article card opens the URL in a new tab
- [ ] If linked article is also a saved Source, show an indicator
- [ ] Panel closes with a back/close button or clicking empty canvas

## Blocked by

- `#02` (needs canvas with clickable dots)
- `#04` (needs enriched metadata to display)
