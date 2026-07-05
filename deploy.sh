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

echo "🚀 Deploying rabbit-hole to $DEPLOY_HOST:$DEPLOY_PATH ..."

# Build the remote script as a local variable, then pipe it to SSH.
# This avoids heredoc escaping headaches with remote variables.
REMOTE_SCRIPT=$(cat <<SCRIPT
set -euo pipefail
cd "$DEPLOY_PATH"

PROD_FILE=""
if [ -f docker-compose.prod.yml ]; then
  PROD_FILE="-f docker-compose.prod.yml"
fi

echo "  📥 Pulling latest code..."
git pull

echo "  🔨 Rebuilding Docker image..."
VITE_COMMIT_HASH=\$(git rev-parse --short HEAD) docker compose -f docker-compose.yml \$PROD_FILE build

echo "  🔄 Restarting container..."
docker compose -f docker-compose.yml \$PROD_FILE up -d

echo "  🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Done — rabbit-hole is running"
SCRIPT
)

ssh "$DEPLOY_HOST" bash -s <<REMOTE
$REMOTE_SCRIPT
REMOTE
