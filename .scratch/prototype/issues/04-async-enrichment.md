Status: ready-for-agent

# Async enrichment

## What to build

After a Source is captured, fetch its page content in the background (via a service worker or a lightweight API call). Extract full metadata — author, publication date, domain/blog name. Also discover all outgoing hyperlinks (linked articles) from the page content.

Update the stored Source with the enriched data. If new fields appear, the canvas and detail views should reflect them (e.g. domain shown as a subtitle under the title).

## Acceptance criteria

- [ ] Background fetch runs after Source creation (non-blocking)
- [ ] Extracted: author, publication date, domain name
- [ ] Extracted: list of linked article URLs from the page
- [ ] Enriched data is merged into the stored Source
- [ ] Canvas/detail views update to show new fields
- [ ] Fails gracefully if page is unreachable or unparseable (no crash)

## Blocked by

- `#01` (needs stored Sources with URLs)
- `#02` (needs canvas to see enrichment results in context)
