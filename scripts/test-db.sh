#!/usr/bin/env bash
# Spins up a throwaway local Postgres, applies the migrations + fake seed on
# top of a tiny Supabase stand-in, and runs the row-level-security tests.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55432}"
if [ "$(id -u)" = "0" ]; then RUN=(runuser -u postgres --); chown -R postgres "$TMP"; else RUN=(); fi
cleanup() { "${RUN[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"${RUN[@]}" "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"${RUN[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/log" -w start >/dev/null
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do echo "migrate: $(basename "$f")"; "${PSQL[@]}" -f "$f"; done
echo "seed: supabase/seed.sql"; "${PSQL[@]}" -f "$ROOT/supabase/tests/01_test_users.sql" -f "$ROOT/supabase/seed.sql"
echo "tests:"; "${PSQL[@]}" -f "$ROOT/supabase/tests/10_rls_test.sql" 2>&1 >/dev/null | sed -E "s/^psql:[^ ]+ NOTICE:  //"
