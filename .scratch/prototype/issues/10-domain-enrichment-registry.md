Status: ready-for-agent

# Domain-specific enrichment registry

## What to build

Replace the single generic HTML scraper with a registry of enrichment backends. Each source URL is matched against known domain patterns — if a backend exists for that domain, use it; otherwise fall back to the generic scraper.

This avoids overfitting the generic parser to one site's HTML structure. Different sources have different metadata quality and extraction difficulty — a dedicated backend can use structured APIs (oEmbed, Data API, RSS) instead of fragile HTML regex.

## What it enables

- **YouTube**: oEmbed or Data API → channel name, upload date, description
- **arXiv**: arXiv API → authors, categories, abstract, published date
- **GitHub**: GitHub API → repo description, stars, language, README links
- **Hacker News**: Firebase API → points, comments, discussion URL
- **Substack / Medium / blog platforms**: domain-pattern match → tuned CSS selectors
- **Wikipedia**: REST API → infobox data, categories, linked articles

## Acceptance criteria

- [ ] Registry maps hostname patterns (exact, wildcard, regex) to enrichment handlers
- [ ] Generic HTML scraper is the default fallback when no handler matches
- [ ] Each handler implements a standard interface: `enrich(url, html?) → { author?, publicationDate?, domain?, linkedArticles[] }`
- [ ] Registry is data-driven — adding a new domain backend does not require changing the enrichment pipeline code
- [ ] Existing generic scraper continues to work unchanged when no handler matches
- [ ] Optional: user-configurable CSS selectors per domain for "further reading" links (stored as JSON in IndexedDB or a config file)

## Related: storing raw HTML for re-enrichment

If the raw page HTML is stored locally alongside the Source at capture time, enrichment can be re-run later when new handlers are added or existing ones improve — without re-fetching pages that may have gone offline or changed. This is particularly valuable once the domain registry (#10) is in place, since a newly added handler could backfill all existing Sources.

See `enrichment-architecture` topic in project memory for trade-offs (storage cost, privacy, browser quota).

## Nice-to-have

- Handlers can optionally receive the pre-fetched page HTML to avoid a second fetch
- A debug mode that shows which handler matched and what it extracted
- Admin UI for previewing enrichment results per domain

## Blocked by

- `#04` (generic enrichment exists and works — provides the fallback and the integration points)
