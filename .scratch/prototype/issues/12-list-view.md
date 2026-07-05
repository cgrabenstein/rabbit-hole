Status: done

> **Housekeeping note (2026-07-05):** Implemented in commit `a99e4c5`. SourceList with sortable rows and inline Read/Delete buttons. Split view toggle in header — desktop shows canvas+list side by side, mobile replaces canvas.

# List view alongside the canvas

## What to build

Add a toggleable list view alongside the canvas for quick browsing and scanning of all Sources. The canvas is the primary interface for spatial relationships, but a list is better for overview — sorting, scanning titles, and jumping to specific articles.

## Interaction design

- A toggle/button in the header toggles between **canvas view** and **split view** (canvas + list)
- On mobile (small screens), the list replaces the canvas instead of splitting
- The list shows a scrollable collection of Source cards
- Each row shows: title (primary), domain, capture date, author (if available)
- Tapping a row either: 
  - **Desktop/tablet**: pans/zooms the canvas to center on that node + opens the detail panel
  - **Mobile**: closes list and opens the detail panel for that source
- Sort options: by capture date (newest first, default), by title alphabetically, by domain

## Acceptance criteria

- [x] Toggle button in the header switches between canvas-only and canvas+list (split view)
- [x] On small screens (≤768px), list replaces canvas instead of splitting
- [x] List rows show: title, domain, capture date
- [~] Row actions: Read + Delete buttons inline instead of canvas-centering (design decision during implementation)
- [x] Sort-by dropdown: Newest first, Oldest first, Title A-Z, Domain
- [x] List re-renders when new Sources are added or deleted
- [x] The list scrolls independently from the rest of the page

## Why not just a search bar?

A list is always visible (or one tap away) and gives the user an instant scan of everything they've collected — it serves as a table of contents for their graph. Search is complementary but doesn't replace the scanning affordance.

## Non-goals (for this issue)

- Full-text search (future enhancement)
- Inline editing from the list
- Multi-select or batch operations

## Blocked by

- Nothing — pure UI addition, no new DB queries needed (uses existing `getAllSources()`)

