#!/usr/bin/env bash
# Backend dev server with bacon auto-reload (always headless)
set -a
source "$(dirname "$0")/.env"
set +a

export PATH="$HOME/.cargo/bin:$PATH"

# Wait for database and run migrations
echo "[BACKEND] Waiting for database..."
cd "$(dirname "$0")/../../backend"

# Wait for postgres to be ready
until sqlx migrate run 2>/dev/null; do
    echo "[BACKEND] Waiting for database to be ready..."
    sleep 2
done

echo "[BACKEND] Database migrations complete, starting bacon..."
bacon --headless
