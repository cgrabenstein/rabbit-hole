Status: ready-for-agent

# Share sheet capture (Web Share Target)

## What to build

Register Rabbit Hole as a Web Share Target so the system share sheet on mobile (and supported desktop browsers) offers Rabbit Hole as a share destination. Handle incoming URLs via the service worker, extract the page title, create and store a Source — the same flow as manual paste, but triggered from the share sheet.

## Acceptance criteria

- [ ] PWA manifest declares `share_target` for `text/uri-list` and `text/plain`
- [ ] Service worker intercepts share events and extracts the URL
- [ ] Incoming shared URL creates a Source (same storage flow as manual capture)
- [ ] User sees success feedback after sharing to Rabbit Hole
- [ ] Works on Chrome for Android (primary target)
- [ ] Graceful fallback if Web Share Target is not supported

## Blocked by

- `#01` (project scaffold and manual capture — storage and capture flow must exist)
