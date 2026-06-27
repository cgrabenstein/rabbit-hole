Status: ready-for-agent

# Reading view with in-app readability

## What to build

Replace the metadata-only enrichment pipeline with a reading view. When the user clicks a node on the canvas, they read the article in-app instead of seeing a detail panel. Links within the article are interactive — clicking one captures the target and establishes a relationship. Article content is fetched and stored only on first read (fetch-on-read).

This retires `#04`'s `/api/enrich` endpoint and `SourceDetail`'s enrichment display. Enrichment (author, date, domain) happens as a byproduct of readability extraction, not as a separate step.

## Context

This issue emerged from a design shift during the enrichment iteration. See `topic_key: reading-view` in project memory for the decision log.

## Acceptance criteria

### Reading view (route)

- [x] Canvas node click navigates to the reading view
- [x] Canvas state preserved via `display:none` (internal state survives unmount)
- [x] Non-readable sources (videos, podcasts, failed extraction) show SourceDetail panel via error fallback
- [x] Reading view has a back button; browser back button also works via pushState/popstate

### Content extraction

- [x] New `/api/read` endpoint in Vite proxy using `@mozilla/readability` + `jsdom`
- [x] Returns `{ content, title, author, publicationDate, domain }`
- [x] Readability failure returns 422; client falls back to SourceDetail
- [x] `/api/enrich` endpoint is removed (retired)

### Article storage

- [x] New `articles` IndexedDB store (separate from `sources`), keyed by source ID
- [x] Stores the cleaned article HTML
- [x] Content is fetched and stored on first read, not at capture time
- [x] Subsequent reads load from local IndexedDB (no re-fetch)

### Links within articles

- [x] Links in the rendered article are live/clickable (event delegation on content area)
- [x] Clicking a link captures the URL as a new Source
- [x] A Relationship is created linking the new Source back to the article being read
- [x] Toast confirms "Captured: [title]"
- [x] Reader stays on the current article

### Enrichment and metadata

- [x] Author, publicationDate, domain are extracted from readability result
- [x] These are saved into the Source metadata (via existing `updateSource`)
- [x] SourceDetail panel shows these fields when present (as it already does)

### Offline reading (deferred)

- [ ] Not required for this issue — fetch-on-read is the prototype behavior
- [ ] Configurable later as an app setting

## Blocked by

- `#01` (sources exist in IndexedDB)
- `#04` (the current enrichment provides the fallback integration point; its endpoint will be replaced)
- `#05` (SourceDetail is the fallback for non-readable sources)
