# Piano di lancio in produzione — PRONTO INTERVENTO ROMA 2.0

Prompt 9 · 18/11/2026. **Nessun passaggio di questo piano è stato eseguito.** Il dominio ufficiale resta sul sito attuale
(progetto Netlify `delfino-soffice-ca8830`) fino all'autorizzazione esplicita del titolare. Dettaglio tecnico del dominio: `docs/DOMAIN_MIGRATION.md`.
Rollback: `docs/ROLLBACK-PLAN.md`.

## 1. Due livelli di lancio

| Livello | Cosa va online | Condizioni (calcolate in /admin/lancio/) |
|---|---|---|
| **A — sito pubblico** | Pagine informative, servizi, landing, PRONTO+ senza vendita ("Chiedi informazioni"), contatti | Dati aziendali obbligatori **verificati**; telefono ed email verificati; informativa privacy validata; build e audit SEO senza errori; moduli funzionanti **oppure** telefono; se i moduli vanno in centrale, Supabase verificato |
| **B — piattaforma transazionale** | Registrazione clienti, abbonamenti, pagamenti myPOS, notifiche automatiche, dashboard tecnici | Livello A + Supabase, listini approvati e pubblicati, myPOS (prova di connessione + prova completa in sandbox), email (prova riuscita), documenti legali, test sullo staging, approvazione scritta del titolare, autorizzazione live myPOS |

Il livello A può andare online prima del livello B: le funzionalità del livello B restano **spente** (/admin/funzionalita/) e il sito
non mostra pulsanti di acquisto né prezzi non approvati.

## 2. Sequenza

| Fase | Azione | Chi | Prerequisito |
|---|---|---|---|
| 1 | Completare `docs/OWNER-SETUP-CHECKLIST.md` §1–3 | Titolare | — |
| 2 | Repository GitHub privato + push di `develop` | Tecnico | Autorizzazione esplicita al push |
| 3 | Staging completo (`docs/NETLIFY-STAGING-GUIDE.md`) e collaudo | Tecnico + titolare | 2 |
| 4 | Revisione del sito sullo staging, foto definitive | Titolare | 3 |
| 5 | Supabase di **produzione** (nuovo progetto UE): migrazioni, `declare_system_environment('production')`, Auth (redirect sul dominio ufficiale, registrazione chiusa se livello A), SMTP proprio, amministratore | Tecnico | 3 |
| 6 | Inserire e verificare i dati aziendali nel database di produzione (/admin/configurazione-azienda/) | Titolare | 5 |
| 7 | Approvare `main` (`git merge --ff-only develop`), tag `v-lancio-AAAAMMGG`, push | Titolare + tecnico | 4 |
| 8 | Backup del sito attuale e della zona DNS (`ROLLBACK-PLAN.md` §1) | Tecnico | — |
| 9 | Progetto `delfino-soffice-ca8830`: *Stop auto publishing*, variabili di produzione (`APP_ENVIRONMENT=production`, Supabase di produzione, **senza** `ALLOW_INDEXING`), collegamento a `main` | Tecnico | 7, 8 + autorizzazione |
| 10 | Deploy non pubblicato: smoke test sull'URL del deploy, /admin/lancio/ = GO livello A | Tecnico | 9 |
| 11 | `ALLOW_INDEXING=true`, nuovo deploy non pubblicato: sull'URL del deploy deve restare `noindex` (prova della guardia) | Tecnico | 10 |
| 12 | **Publish deploy** in fascia di basso traffico; smoke test sul dominio | Tecnico | Autorizzazione finale del titolare |
| 13 | Search Console: invio sitemap, controllo URL principali; monitoraggio 72 ore | Tecnico | 12 |
| 14 | Livello B: myPOS live (`MYPOS_ENV=production`, `MYPOS_ALLOW_LIVE=true`) solo con autorizzazione scritta, poi accensione delle funzionalità nell'ordine myPOS → Acquisti online → linee | Titolare + tecnico | /admin/lancio/ = GO livello B |

## 3. Cosa NON si tocca

Nameserver, MX, SPF, DKIM, DMARC e il record `google-site-verification` di Aruba. Il record A dell'apex (75.2.60.5) e il CNAME `www`
puntano già a Netlify: nello scenario A non cambiano. Nessuna nuova proprietà Search Console per lo staging. Google Analytics resta
spento finché la cookie policy non è validata.

## 4. URL vecchie e nuove

Il sito attuale è una pagina singola: `/`, `/index.html`, `/index.htm` sono mappate (301 verso `/`). Nessun redirect indiscriminato
alla home: le URL inesistenti restano 404 reali. Elenco e verifica: `docs/SEO_MIGRATION.md`, `reports/migration/old-site-snapshot-2026-11-18.md`.

## 5. Stato al 18/11/2026

- Livello A: **NO-GO** — dati aziendali e contatti non inseriti né verificati, informativa privacy da redigere, foto segnaposto.
- Livello B: **NO-GO** — nessuna integrazione collegata (Supabase, myPOS, email), listini non approvati, documenti legali da validare.
- Codice e test: pronti per il collaudo sullo staging (vedi `docs/PROMPT-9-REPORT.md`).
