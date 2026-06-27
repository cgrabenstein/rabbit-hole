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
- **Phase 2 (async enrichment)**: Author, publication date, domain/blog name. Enrichment is done via readability extraction when the page content is fetched for the reading view.

**Capture**:
The act of adding a source to the graph. Must be nearly frictionless — triggered from the system share sheet (via PWA Web Share Target) on mobile, paste, or clicking a link while reading an existing source in-app.

**Read**:
Viewing a saved source's full article content in-app. The reading view stores the cleaned article for offline access and position tracking. Links within the reading view are interactive — clicking one captures the target and establishes a Relationship.

**Relationship**:
A directed connection between two sources. Created when the user clicks a link while reading (which captures the target and links back), or by manually drawing a connection on the canvas.

**Connection**:
A relationship drawn manually by the user on the canvas between two sources, regardless of whether one links to the other in content.

**Pin**:
Locking a source to a fixed position on the graph so it stays in place across auto-layout updates.

**Tag**:
A lightweight label applied to a source post-capture for ad-hoc organization. Optional and user-driven.
_Avoid_: Folder, category

**Cluster** *(deferred)*:
An auto-detected grouping of related sources. Planned for post-prototype.

**Pin**:
Locking a source to a fixed position on the graph so it stays in place across auto-layout updates.

**Tag**:
A lightweight label applied to a source post-capture for ad-hoc organization. Optional and user-driven.
_Avoid_: Folder, category

**Cluster** *(deferred)*:
An auto-detected grouping of related sources. Planned for post-prototype.
