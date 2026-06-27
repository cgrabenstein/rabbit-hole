Status: ready-for-agent

# Deployment

## What to build

Deploy the PWA to a hosting provider that supports PWAs with service workers (e.g. Vercel, Netlify, Cloudflare Pages). Configure custom domain if desired. Ensure the manifest, service worker, and Web Share Target all work in production. Set up HTTPS (required for service workers and share target). Optionally set up CI/CD for automatic deploys from the main branch.

## Acceptance criteria

- [ ] PWA is deployed to a public URL with HTTPS
- [ ] Service worker registers and works in production
- [ ] PWA manifest loads correctly
- [ ] Web Share Target accepts incoming shares in production
- [ ] Auto-deploy from main branch is configured (CI/CD)
- [ ] App passes Lighthouse PWA audit (or reasonable subset)
- [ ] `.envrc` / environment variables are configured for production

## Blocked by

- `#01` (project scaffold — must have the PWA working locally first)
- `#03` (share sheet capture — Web Share Target must be implemented to test in production)
