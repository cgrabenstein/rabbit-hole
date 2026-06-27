# Rabbit Hole

A visual map of everything you read and how ideas connect.

Formerly referred to as "Reading Graph" — a descriptive tagline for the core concept.

## Language

**Rabbit Hole**:
The product name. A visual graph-based tool for mapping your reading and the connections between ideas.

**Source**:
Any saved item in the graph — an article, video, tweet, paper, newsletter, podcast, or other piece of content.
_Avoid_: Article, reading, post, node

**Source metadata**:
Data associated with a source. Captured in two phases:
- **Phase 1 (synchronous)**: URL and page title only — must be instant.
- **Phase 2 (async enrichment)**: Author, publication date, domain/blog name, and linked articles (outgoing hyperlinks discovered by fetching the page after capture).

**Linked article**:
A URL found within a captured source's page content during async enrichment. May become a Relationship if the linked article is also a saved Source.

**Capture**:
The act of adding a source to the graph. Must be nearly frictionless — triggered from the system share sheet (via PWA Web Share Target) on mobile, or paste / browser extension on desktop.

**Relationship**:
A directed connection between two sources. Created explicitly via hyperlinks or user action — never inferred algorithmically.

**Link**:
An automatic relationship created when a saved source contains a hyperlink to another saved source.

**Connection**:
A relationship drawn manually by the user between two sources, regardless of whether they contain mutual hyperlinks.

**Pin**:
Locking a source to a fixed position on the graph so it stays in place across auto-layout updates.

**Tag**:
A lightweight label applied to a source post-capture for ad-hoc organization. Optional and user-driven.
_Avoid_: Folder, category

**Cluster** *(deferred)*:
An auto-detected grouping of related sources. Planned for post-prototype.
