Status: superseded-by-#11

# Async enrichment

> **Note**: Superseded by #11 (Reading View). The `/api/enrich` endpoint and link extraction are retired. Enrichment is now a byproduct of readability extraction when the user reads. The generic scraper built here (author, date, domain) becomes the fallback inside `/api/read`.

## What was built

After a Source is captured, fetches page content in the background. Extracts metadata — author, publication date, domain name.

## Acceptance criteria

- [x] Background fetch runs after Source creation (non-blocking)
- [x] Extracted: author, publication date, domain name
- [x] Extracted: list of linked article URLs from the page (up to 100, deduplicated, filtered)
- [x] Enriched data is merged into the stored Source via `updateSource()`
- [x] Detail view updates to show new fields (re-fetches on `onEnrichmentComplete`)
- [x] Fails gracefully if page is unreachable or unparseable (console.warn, no crash)

## Blocked by

- `#01` (needs stored Sources with URLs)
- `#02` (needs canvas to see enrichment results in context)
