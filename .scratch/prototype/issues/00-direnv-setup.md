Status: done

# Direnv setup

## What to build

Set up direnv for this project so environment variables (Node version, package manager config, etc.) are loaded automatically when entering the project directory.

Create a `.envrc` file and allow it. Pin the Node.js version (use a `.node-version` or `.nvmrc` file alongside it). Configure any project-level environment variables the PWA will need during development.

## Acceptance criteria

- [ ] `.envrc` exists and is direnv-allowed
- [ ] Node version is pinned and auto-loaded
- [ ] Running `direnv allow` works without errors
- [ ] Environment variables are available in the shell when inside the project directory

## Blocked by

None — can start immediately.
