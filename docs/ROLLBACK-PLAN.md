# Piano di rollback — PRONTO INTERVENTO ROMA 2.0 (aggiornato al Prompt 9)

Questo documento sostituisce `docs/ROLLBACK_PLAN.md` (Prompt 8, conservato come storico) e aggiunge il **rollback per funzionalità**
introdotto nel Prompt 9. Si applica allo scenario A di `docs/DOMAIN_MIGRATION.md`: il progetto Netlify `delfino-soffice-ca8830` resta e
cambia solo il deploy pubblicato. Nessun passaggio è irreversibile.

## 0. Primo livello: spegnere una funzionalità (senza toccare il sito)

Da **/admin/funzionalita/** (amministratore): ogni interruttore è verificato dal database e dalle funzioni server, quindi l'effetto è
immediato anche per chi usa direttamente le API. Le pagine pubbliche si allineano con "Aggiorna il sito pubblico".

| Problema | Interruttore | Effetto immediato (server) |
|---|---|---|
| Pagamenti anomali | *myPOS* (spegne anche *Acquisti online*, *Family*, *Lavoro Protetto*) | `checkout-create` 503, nessun nuovo ordine o pagamento (trigger) |
| Vendita di una linea da sospendere | *PRONTO+ Family* / *Business* / *Hotel* / *Corporate* / *Lavoro Protetto* | nuovi ordini della linea rifiutati; i contratti esistenti restano validi con le loro condizioni |
| Email errate ai clienti | *Notifiche automatiche* | nessun invio; le notifiche restano in coda |
| Registrazioni indesiderate | *Registrazione clienti* | il database rifiuta gli utenti non invitati |
| Problemi nell'area clienti | *Login clienti* | l'area clienti non mostra l'accesso (i dati restano protetti da RLS) |
| Problemi dell'assistente AI | *PRONTO AI* | `ai_runtime_gate` blocca ogni esecuzione |
| Dati Google errati | *PRONTO SEO* | nessuna nuova sincronizzazione |
| Problemi nella dashboard tecnici | *Dashboard tecnici* | il tecnico non vede più lavori (nessuna modifica ai dati) |

Ogni modifica è registrata (`feature_flag_history`: autore, data, motivo). Variabili d'emergenza ancora valide: `MYPOS_ALLOW_LIVE=false`,
`AI_ENABLED=false`, rimozione di `RESEND_API_KEY`.

## 0-bis. Dati aziendali o listini errati

- Dato aziendale sbagliato: /admin/configurazione-azienda/ → correggerlo (torna "non verificato" e sparisce subito da PDF; dal sito alla build successiva) → verificare → *Aggiorna il sito*.
- Listino pubblicato per errore: creare una nuova bozza con il prezzo corretto → approvare → pubblicare. **I contratti già accettati conservano la versione originale** (vincolo del database): eventuali correzioni verso clienti si gestiscono con note di credito/rimborsi approvati, mai modificando la versione accettata.

## 1. Backup prima del passaggio (obbligatori)

| # | Cosa | Come | Dove conservarlo |
|---|---|---|---|
| 1 | Sito attuale | Netlify → Deploys → deploy pubblicato → **Download**. Annotare l'ID del deploy | Fuori dal repository, con data |
| 2 | Impostazioni del progetto Netlify | Screenshot o esportazione di: dominio primario, alias, HTTPS, variabili, redirect, header, notifiche | Come sopra |
| 3 | Zona DNS Aruba | Esportazione o screenshot di **tutti** i record. Confrontarla con `reports/migration/dns-snapshot-2026-11-18.txt` | Come sopra |
| 4 | Database (se già in uso) | `DATABASE_URL=… npm run db:backup` → `backups/<data>/`: schema, dati, conteggi, impronte SHA-256. Contiene **dati personali**: conservarlo cifrato | Supporto cifrato, accesso ristretto |
| 5 | File dello Storage Supabase | Tutti i bucket (`interventi`, `tecnici`, `azienda-pubblico`, `azienda-riservato` e quelli elencati in `storage.buckets`) scaricati con la CLI Supabase o dal pannello. Non sono inclusi nel dump | Come il punto 4 |
| 6 | Repository | Tag `v-lancio-AAAAMMGG` sul commit di `main` pubblicato | GitHub |

## 2. Rollback

| Problema | Azione | Tempo |
|---|---|---|
| Sito nuovo non funzionante (errori, pagine rotte, moduli che non inviano) | Netlify → Deploys → deploy del **vecchio sito** → *Publish deploy*. DNS e HTTPS non cambiano | 1–2 minuti |
| Una funzione avanzata non funziona (pagamenti, AI, area clienti) | Spegnerla senza rollback del sito: §0 (interruttori in /admin/funzionalita/) | 5 minuti |
| Pagina indicizzabile per errore su staging | Rimuovere `ALLOW_INDEXING` dallo staging (la guardia sull'URL lo impedisce già); in Search Console → Rimozioni, se necessario | 5 minuti |
| Migrazione del database fallita | Le migrazioni sono transazionali e non distruttive: in caso di errore non resta nulla di applicato. Se una migrazione riuscita produce problemi, si corregge con una **nuova** migrazione; mai `DROP` sui dati. Ripristino completo: §2-bis | — |
| Notifiche errate ai clienti | Togliere `RESEND_API_KEY` (le notifiche restano in coda "non inviate") e indagare | 2 minuti |
| Pagamento registrato in modo anomalo | interruttore *myPOS* spento (§0) o `MYPOS_ALLOW_LIVE=false`, poi verifica in dashboard Pagamenti e nel pannello myPOS. Eventuali rimborsi passano dalla procedura approvata | 5 minuti |

### 2-bis. Ripristino del database (provato il 18/11/2026 su database separati)

1. Creare un **nuovo** progetto o database (mai sovrascrivere quello in uso) e applicare le migrazioni del repository.
2. `TARGET_DATABASE_URL=… npm run db:restore backups/<data>`.
   - Lo script verifica le impronte e rifiuta destinazioni con dati o utenti già presenti.
   - Confronta lo schema, carica tutto in **una** transazione e poi confronta i conteggi di ogni tabella.
3. Puntare le variabili Supabase del sito al nuovo progetto e ripubblicare.

Prova reale eseguita su database locali:
- backup di un database con interventi, rapporti e pagamenti (114 tabelle);
- ripristino in un database nuovo con conteggi identici e rapporto ancora verificabile (impronta SHA-256 valida);
- secondo ripristino sulla stessa destinazione **rifiutato**;
- backup alterato **rifiutato**.

## 3. Smoke test subito dopo la pubblicazione (5 minuti)

```
curl -sI https://prontointerventoroma.it/ | grep -iE "^HTTP|x-robots|content-security|strict-transport"
curl -s  https://prontointerventoroma.it/ | grep -c 'name="robots" content="noindex'      # deve essere 0
curl -s  https://prontointerventoroma.it/robots.txt                                     # NON deve contenere "Disallow: /" da solo
curl -sI https://prontointerventoroma.it/sitemap.xml | head -1                          # 200
curl -sI https://prontointerventoroma.it/index.html | grep -iE "^HTTP|^location"         # 301 → /
curl -sI https://www.prontointerventoroma.it/ | grep -iE "^HTTP|^location"               # 301 verso il dominio primario
curl -sI https://prontointerventoroma.it/pagina-inesistente/ | head -1                  # 404
curl -sI https://prontointerventoroma.it/admin/ | grep -i x-robots                       # noindex, nofollow
```

Poi a mano:
- home, una categoria e una landing da smartphone;
- invio di una richiesta di prova con un contatto interno, che deve arrivare in centrale;
- login all'area riservata;
- verifica della posta, invio e ricezione.

## 4. Monitoraggio successivo

| Quando | Cosa |
|---|---|
| Prime 2 ore | Log delle funzioni Netlify (errori 5xx), richieste in centrale, notifiche |
| Prime 72 ore | Allarmi di PRONTO SEO (sito pubblicato, robots, sitemap, noindex), copertura di Search Console, moduli con errori |
| 4 settimane | Clic e impressioni rispetto a prima, pagine non indicizzate, Core Web Vitals reali |

Soglie di rollback immediato:
- sito non raggiungibile o HTTPS non valido per più di 5 minuti;
- moduli che non registrano richieste;
- dati di un cliente visibili a un altro;
- pagamenti attivati senza verifica.
