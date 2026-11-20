#!/usr/bin/env bash
# Backup logico del database (Prompt 8). NON modifica il database di origine (solo lettura).
#
# Uso:  DATABASE_URL='postgresql://…' bash scripts/db/backup.sh [cartella]
#   DATABASE_URL: stringa di connessione diretta (Supabase → Project Settings → Database,
#   "Session pooler" o connessione diretta, utente postgres). Mai salvata su file né nel repository.
# Produce in backups/<data-ora>/ (cartella esclusa da git):
#   schema.sql         schema completo di public (tabelle, funzioni, RLS, trigger)
#   public.dump        dati di public in formato custom (pg_restore)
#   auth.dump          utenti Auth (auth.users, auth.identities) — DATI PERSONALI: conservare cifrato
#   counts.txt         numero di righe per tabella, per la verifica dopo il ripristino
#   SHA256SUMS         impronte dei file
# I file caricati nello Storage (rapporti, foto, documenti) NON sono nel dump: vanno copiati a
# parte dai bucket (vedi docs/ROLLBACK_PLAN.md).
set -euo pipefail
: "${DATABASE_URL:?Imposta DATABASE_URL (connessione al database da salvare)}"
OUT="${1:-backups/$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"; chmod 700 "$OUT"
umask 077
echo "Backup in $OUT"
pg_dump "$DATABASE_URL" --schema=public --schema-only --no-owner --no-privileges -f "$OUT/schema.sql"
pg_dump "$DATABASE_URL" --schema=public --data-only --format=custom --no-owner -f "$OUT/public.dump"
if psql "$DATABASE_URL" -Atc "select 1 from pg_namespace where nspname = 'auth'" | grep -q 1; then
  pg_dump "$DATABASE_URL" --data-only --format=custom --no-owner --table=auth.users --table=auth.identities -f "$OUT/auth.dump"
fi
psql "$DATABASE_URL" -At -c "select format('%s %s', c.relname, (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', c.relname), false, true, '')))[1]::text)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' order by 1" > "$OUT/counts.txt"
psql "$DATABASE_URL" -At -c "select version from supabase_migrations.schema_migrations order by 1" > "$OUT/migrations.txt" 2>/dev/null \
  || ls supabase/migrations > "$OUT/migrations.txt"
(cd "$OUT" && sha256sum * > SHA256SUMS)
echo "Completato: $(wc -l < "$OUT/counts.txt") tabelle. Conservare la cartella fuori dal repository (contiene dati personali)."
