#!/usr/bin/env sh
# ======================================================================
# docker/bootstrap.sh — bring up the shared local Supabase stack and
# seed it for the donate client (migrations + seed.sql + auth users).
#
# Usage:
#   sh docker/bootstrap.sh            # up + migrate + seed (idempotent)
#   sh docker/bootstrap.sh --fresh    # wipe db volume + storage, then full seed
#
# Requires: docker with the compose plugin. No Supabase CLI needed.
# ======================================================================
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DOCKER_DIR="$ROOT/docker"
COMPOSE="docker compose -f $DOCKER_DIR/docker-compose.yml --env-file $DOCKER_DIR/.env"
API_URL="http://127.0.0.1:${DOCKER_API_PORT:-55321}"

# --- optional full wipe ------------------------------------------------
if [ "${1:-}" = "--fresh" ]; then
  echo "==> --fresh: removing db volume + storage files"
  $COMPOSE down -v || true
  rm -rf "$DOCKER_DIR/volumes/db/data" "$DOCKER_DIR/volumes/storage"
fi

# --- stack up ----------------------------------------------------------
echo "==> starting stack (db, auth, rest, storage, kong, studio, inbucket)"
$COMPOSE up -d --wait

# --- wait for GoTrue (its migrations create auth.users; the donate
#     migrations hang triggers off that table, so they must run after) --
echo "==> waiting for auth service"
i=0
until curl -sf -o /dev/null "$API_URL/auth/v1/health"; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "ERROR: auth not healthy after 60s — check: $COMPOSE logs auth" >&2
    exit 1
  fi
  sleep 1
done

# --- apply donate migrations (ledger-tracked, like `supabase db push`) -
psql() { $COMPOSE exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }

echo "==> applying supabase/migrations"
psql -c "
  CREATE SCHEMA IF NOT EXISTS local_migrations;
  CREATE TABLE IF NOT EXISTS local_migrations.applied (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT NOW()
  );"
for f in "$ROOT"/supabase/migrations/*.sql; do
  name=$(basename "$f")
  if [ "$(psql -tAc "SELECT 1 FROM local_migrations.applied WHERE name = '$name'")" = "1" ]; then
    echo "    $name (already applied)"
    continue
  fi
  echo "    $name"
  psql < "$f"
  psql -c "INSERT INTO local_migrations.applied (name) VALUES ('$name');"
done

echo "==> applying supabase/seed.sql"
psql < "$ROOT/supabase/seed.sql"

# --- auth users + demo data (supabase/seed-auth.sh) --------------------
echo "==> seeding auth users + demo data (seed-auth.sh)"
SERVICE_ROLE_KEY=$(grep -E '^SERVICE_ROLE_KEY=' "$DOCKER_DIR/.env" | cut -d= -f2-)
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
SUPABASE_API_URL="$API_URL" \
  bash "$ROOT/supabase/seed-auth.sh"

echo ""
echo "==> donate is served by the shared local stack:"
echo "      API      $API_URL/rest/v1"
echo "      Auth     $API_URL/auth/v1"
echo "      DB       postgresql://postgres:${POSTGRES_PASSWORD:-postgres}@127.0.0.1:${DOCKER_DB_PORT:-55322}/postgres"
echo "      Studio   http://localhost:${DOCKER_STUDIO_PORT:-55323}"
echo "      Inbucket http://localhost:${DOCKER_INBUCKET_PORT:-55324}"
echo "    Next: cd client && pnpm dev   (or pnpm build && pnpm exec serve out)"
