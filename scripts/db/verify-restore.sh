#!/usr/bin/env bash
# Confronta i conteggi delle righe del database ripristinato con quelli registrati nel backup.
set -euo pipefail
: "${TARGET_DATABASE_URL:?Imposta TARGET_DATABASE_URL}"
DIR="${1:?Indica la cartella del backup}"
diff=0
while read -r t n; do
  m=$(psql "$TARGET_DATABASE_URL" -At -c "select count(*) from public.\"$t\"")
  if [ "$m" != "$n" ]; then echo "  ✖ $t: backup $n, ripristinato $m"; diff=1; fi
done < "$DIR/counts.txt"
[ $diff = 0 ] && echo "Verifica: $(wc -l < "$DIR/counts.txt") tabelle con lo stesso numero di righe del backup." || { echo "Verifica NON superata"; exit 1; }
