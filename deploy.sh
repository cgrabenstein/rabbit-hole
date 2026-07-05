#!/usr/bin/env bash
set -euo pipefail

# ── Rabbit Hole deploy script ──
# Connects to the server, pulls latest code, rebuilds Docker, and restarts.
#
# Setup:
#   1. Copy .deploy.env.example to .deploy.env
#   2. Fill in DEPLOY_HOST (user@host) and DEPLOY_PATH (path to repo on server)
#   3. Make sure the repo is cloned on the server already
#   4. Run: ./deploy.sh
#
# Requirements:
#   - Docker + docker compose on the server
#   - SSH key-based access to DEPLOY_HOST
#   - Remote repo must be on the same git branch you want to deploy

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── load config ──
if [ -f .deploy.env ]; then
  source .deploy.env
else
  DEPLOY_HOST="${DEPLOY_HOST:-}"
  DEPLOY_PATH="${DEPLOY_PATH:-/opt/rabbit-hole}"
fi

if [ -z "$DEPLOY_HOST" ]; then
  echo "❌ DEPLOY_HOST not set. Create .deploy.env (see .deploy.env.example)."
  exit 1
fi

set -u

# ── compose files ──
# Base compose file. If docker-compose.prod.yml exists locally, it's
# synced to the server and included as an override (standard Docker
# Compose multi-file pattern). The file is gitignored so server-specific
# config (networks, env files) stays out of version control.
COMPOSE_FILES="-f docker-compose.yml"
if [ -f docker-compose.prod.yml ]; then
  echo "  📋 Syncing docker-compose.prod.yml to server..."
  scp docker-compose.prod.yml "$DEPLOY_HOST:$DEPLOY_PATH/"
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.prod.yml"
fi

echo "🚀 Deploying rabbit-hole to $DEPLOY_HOST:$DEPLOY_PATH ..."

ssh "$DEPLOY_HOST" <<-REMOTE
  set -euo pipefail
  cd "$DEPLOY_PATH"

  echo "  📥 Pulling latest code..."
  git pull

  echo "  🔨 Rebuilding Docker image..."
  VITE_COMMIT_HASH=\$(git rev-parse --short HEAD) docker compose $COMPOSE_FILES build

  echo "  🔄 Restarting container..."
  docker compose $COMPOSE_FILES up -d

  echo "  🧹 Cleaning up old images..."
  docker image prune -f

  echo "✅ Done — rabbit-hole is running"
REMOTE
