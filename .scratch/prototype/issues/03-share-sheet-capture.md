Status: done

> **Housekeeping note (2026-07-05):** Implemented in commit `f8a4e6a`. The one unchecked AC item requires HTTPS deployment on a real device to verify — infrastructure exists (Docker, rh.grabenstein.cloud).

# Share sheet capture (Web Share Target)

## What to build

Register Rabbit Hole as a Web Share Target so the system share sheet on mobile (and supported desktop browsers) offers Rabbit Hole as a share destination. Handle incoming URLs via the service worker, extract the page title, create and store a Source — the same flow as manual paste, but triggered from the share sheet.

## Acceptance criteria

- [x] PWA manifest declares `share_target` with title, text, and url params
- [x] Custom service worker (injectManifest) intercepts POST to /share-target and extracts URL
- [x] Incoming shared URL creates a Source via App.tsx capture flow (fetchTitle → addSource → toast)
- [x] User sees success feedback via toast after sharing to Rabbit Hole
- [~] Works on Chrome for Android (requires HTTPS deployment to test — Docker/`rh.grabenstein.cloud` infrastructure is set up)
- [x] Graceful fallback: SW redirects to / on failure

## Blocked by

- `#01` (project scaffold and manual capture — storage and capture flow must exist)
