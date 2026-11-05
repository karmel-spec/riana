#!/usr/bin/env bash
# Applies supabase/migrations/*.sql to a real Supabase project, in order,
# skipping any that were already applied (tracked in app.migrations).
#
# Usage:  DATABASE_URL='postgresql://postgres.[ref]:[password]@...pooler.supabase.com:5432/postgres' ./scripts/apply-migrations.sh
# Get the URL from Supabase → Project Settings → Database → Connection string (URI, "Session" mode).
# Never commit the URL. Never run supabase/tests/* or seed.sql against the real project.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
: "${DATABASE_URL:?Set DATABASE_URL to the project's connection string}"
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -c "create schema if not exists app; create table if not exists app.migrations (name text primary key, applied_at timestamptz not null default now());"
for f in "$ROOT"/supabase/migrations/*.sql; do
  name="$(basename "$f")"
  if [ "$("${PSQL[@]}" -tAc "select count(*) from app.migrations where name = '$name'")" = "1" ]; then
    echo "skip   $name (already applied)"; continue
  fi
  echo "apply  $name"
  "${PSQL[@]}" -1 -f "$f" -c "insert into app.migrations (name) values ('$name')"
done
echo "Done. Applied migrations:"; "${PSQL[@]}" -c "select name, applied_at from app.migrations order by name"
