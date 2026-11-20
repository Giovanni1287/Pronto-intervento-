#!/usr/bin/env bash
# Ripristino di un backup creato con scripts/db/backup.sh (Prompt 8).
#
# Procedura prevista (database NUOVO, mai quello di produzione in uso):
#   1. creare un progetto/database vuoto e applicare le migrazioni del repository
#      (supabase db push, oppure psql -f supabase/migrations/*.sql in ordine);
#   2. TARGET_DATABASE_URL='postgresql://…' bash scripts/db/restore.sh backups/<data-ora>
# Lo schema viene dalle migrazioni (fonte unica: comprende anche trigger su auth.users e policy
# dello Storage, che un dump del solo schema public non contiene). Dal backup arrivano i DATI.
#
# Sicurezza:
#   - verifica le impronte SHA-256 dei file del backup;
#   - si rifiuta di procedere se la destinazione contiene già utenti o dati operativi
#     (interventi, ordini, contratti): non sovrascrive mai un database in uso;
#   - svuota solo le righe di configurazione inserite dalle migrazioni nel database NUOVO e carica
#     tutto in UNA transazione: in caso di errore non resta nulla di parziale;
#   - confronta lo schema della destinazione con quello del backup e i conteggi delle righe.
set -euo pipefail
: "${TARGET_DATABASE_URL:?Imposta TARGET_DATABASE_URL (database NUOVO di destinazione)}"
DIR="${1:?Indica la cartella del backup}"
(cd "$DIR" && sha256sum -c SHA256SUMS --quiet) || { echo "Impronte non corrispondenti: backup alterato o incompleto"; exit 1; }

q() { psql "$TARGET_DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "$1"; }
for t in interventions orders contracts business_contracts; do
  n=$(q "select count(*) from public.$t") || { echo "Destinazione senza le migrazioni (manca public.$t): applicarle prima"; exit 1; }
  [ "$n" = "0" ] || { echo "La destinazione contiene già dati in public.$t ($n righe): ripristino annullato"; exit 1; }
done
users=$(q "select count(*) from auth.users" 2>/dev/null || echo 0)
[ "$users" = "0" ] || { echo "La destinazione contiene già $users utenti Auth: ripristino annullato"; exit 1; }

# schema: le funzioni e le tabelle devono coincidere con quelle del backup (stesse migrazioni)
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
pg_dump "$TARGET_DATABASE_URL" --schema=public --schema-only --no-owner --no-privileges -f "$TMP/target.sql"
norm() { grep -vE '^(--|SET |SELECT pg_catalog|$|\\restrict|\\unrestrict)' "$1" | sort; }
if ! diff -q <(norm "$DIR/schema.sql") <(norm "$TMP/target.sql") >/dev/null; then
  echo "Attenzione: lo schema della destinazione differisce da quello del backup (migrazioni diverse?)."
  diff <(norm "$DIR/schema.sql") <(norm "$TMP/target.sql") | head -20
  [ "${ALLOW_SCHEMA_DIFF:-}" = "yes" ] || { echo "Ripristino annullato (ALLOW_SCHEMA_DIFF=yes per procedere consapevolmente)"; exit 1; }
fi

tables=$(q "select string_agg(format('public.%I', relname), ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'")
{
  echo "set session_replication_role = replica;"
  echo "truncate $tables;"
  [ -f "$DIR/auth.dump" ] && pg_restore --data-only --no-owner -f - "$DIR/auth.dump"
  pg_restore --data-only --no-owner -f - "$DIR/public.dump"
  echo "set session_replication_role = origin;"
} > "$TMP/load.sql"
psql "$TARGET_DATABASE_URL" -q -v ON_ERROR_STOP=1 --single-transaction -f "$TMP/load.sql" > /dev/null
# le sequenze (numerazioni) sono incluse nel dump dei dati (setval)
bash "$(dirname "$0")/verify-restore.sh" "$DIR"
