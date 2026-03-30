#!/bin/bash
# Run database migrations
set -a
source "$(dirname "$0")/.env"
set +a

cd "$(dirname "$0")/../../backend" && cargo sqlx migrate run
