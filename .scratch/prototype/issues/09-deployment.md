Status: done

> **Housekeeping note (2026-07-05):** Implemented in commit `f8a4e6a`. Deployed to `rh.grabenstein.cloud` via Docker. Two AC items remain open: CI/CD auto-deploy and Lighthouse PWA audit.

# Deployment

## What to build

Deploy the PWA to a hosting provider that supports PWAs with service workers (e.g. Vercel, Netlify, Cloudflare Pages). Configure custom domain if desired. Ensure the manifest, service worker, and Web Share Target all work in production. Set up HTTPS (required for service workers and share target). Optionally set up CI/CD for automatic deploys from the main branch.

## Acceptance criteria

- [x] PWA is deployed to `rh.grabenstein.cloud` with HTTPS (confirmed working via PWA update test)
- [x] Service worker registers and works in production
- [x] PWA manifest loads correctly (tested on localhost)
- [x] Web Share Target declared in manifest (needs HTTPS + real device to test)
- [ ] Auto-deploy from main branch / CI/CD is configured (manual docker-compose flow for now)
- [ ] App passes Lighthouse PWA audit (or reasonable subset)
- [x] Production Node.js server created at `server/index.mjs` (serves static files + API)
- [x] Dockerfile for containerized deployment (multi-stage: build + runtime)
- [x] docker-compose.yml for one-command deploy: `docker compose up`
- [x] Environment variable: `PORT` (default 3000)
- [x] npm script `start` added for production server

## Blocked by

- `#01` (project scaffold — must have the PWA working locally first)
- `#03` (share sheet capture — Web Share Target must be implemented to test in production)
