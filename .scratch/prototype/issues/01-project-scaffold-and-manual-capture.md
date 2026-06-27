Status: ready-for-agent

# Project scaffold + manual capture

## What to build

Scaffold the Rabbit Hole PWA with Vite (or similar), including the PWA manifest and service worker for offline support. Set up an IndexedDB data layer for storing Sources.

Implement the first capture flow: a text input where the user pastes a URL. On submit, fetch the page title, create a Source (URL + title), store it in IndexedDB, and show success feedback (e.g. a toast). No canvas/graph yet — just the capture form and storage.

## Acceptance criteria

- [ ] PWA scaffold is set up (Vite, TypeScript, PWA manifest, service worker)
- [ ] IndexedDB data layer exists with a `sources` store
- [ ] URL paste input is visible in the UI
- [ ] Pasting a URL fetches the page title and creates a Source
- [ ] Source is persisted in IndexedDB
- [ ] Success feedback is shown after capture
- [ ] App runs locally with `npm run dev`
- [ ] `.node-version` / `.nvmrc` is respected

## Blocked by

- `#00` (direnv setup — Node version pinned)
