#!/usr/bin/env bash
# Test del database su PostgreSQL locale (16+): per ogni file di test crea un
# database pulito, applica lo shim Supabase (solo test), le migrazioni, il seed
# ed esegue i test SQL.
# Uso: PGHOST=/tmp/pgsock PGPORT=54329 PGUSER=postgres bash scripts/db/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="${TEST_DB:-pir_test}"
OUT=reports/db-test-output.txt
: > "$OUT"
run() { psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$1" >/dev/null; echo "  ✔ $1"; }
for t in supabase/tests/[1-9]*.sql; do
  psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
  echo "== $t: shim, migrazioni e seed su $DB"
  run supabase/tests/00_local_supabase_shim.sql
  for f in supabase/migrations/*.sql; do run "$f"; done
  run supabase/seed.sql
  echo "# $t" >> "$OUT"
  psql -v ON_ERROR_STOP=1 -d "$DB" -At -f "$t" | grep -E '^(ok|not ok|[0-9]+/[0-9]+)' >> "$OUT"
  tail -1 "$OUT"
done
# aggiornamento di un database con dati creati prima della migrazione pagamenti (Prompt 4)
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
echo "== upgrade: dati esistenti prima delle migrazioni 2026111714*"
run supabase/tests/00_local_supabase_shim.sql
for f in supabase/migrations/*.sql; do case "$f" in *2026111714*|*2026111715*|*2026111716*|*2026111817*|*2026111818*|*2026111909*) ;; *) run "$f";; esac; done
run supabase/seed.sql
run supabase/tests/upgrade/before.sql
for f in supabase/migrations/2026111714*.sql supabase/migrations/2026111715*.sql supabase/migrations/2026111716*.sql supabase/migrations/2026111817*.sql supabase/migrations/2026111818*.sql supabase/migrations/2026111909*.sql; do run "$f"; done
echo "# supabase/tests/upgrade (dati esistenti)" >> "$OUT"
psql -v ON_ERROR_STOP=1 -d "$DB" -At -f supabase/tests/upgrade/after.sql | grep -E '^(ok|not ok|[0-9]+/[0-9]+)' >> "$OUT"
tail -1 "$OUT"
# aggiornamento con interventi, rapporti, certificati e assegnazioni creati prima della centrale operativa (Prompt 5)
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
echo "== upgrade: dati esistenti prima delle migrazioni 2026111715*"
run supabase/tests/00_local_supabase_shim.sql
for f in supabase/migrations/*.sql; do case "$f" in *2026111715*|*2026111716*|*2026111817*|*2026111818*|*2026111909*) ;; *) run "$f";; esac; done
run supabase/seed.sql
run supabase/tests/upgrade/before_operations.sql
for f in supabase/migrations/2026111715*.sql supabase/migrations/2026111716*.sql supabase/migrations/2026111817*.sql supabase/migrations/2026111818*.sql supabase/migrations/2026111909*.sql; do run "$f"; done
run supabase/seed.sql
echo "# supabase/tests/upgrade (centrale operativa, dati esistenti)" >> "$OUT"
psql -v ON_ERROR_STOP=1 -d "$DB" -At -f supabase/tests/upgrade/after_operations.sql | grep -E '^(ok|not ok|[0-9]+/[0-9]+)' >> "$OUT"
tail -1 "$OUT"
grep -E '^not ok' "$OUT" || true
! grep -q '^not ok' "$OUT"
