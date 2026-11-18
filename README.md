# PRONTO INTERVENTO ROMA 2.0

Sito aziendale statico di **PRONTO INTERVENTO ROMA** (titolare: Giovanni Romeo), con predisposizione per gli abbonamenti **PRONTO+** (Family, Lavoro Protetto, Business, Hotel, Condomini e Corporate) e la **centrale operativa** (richieste, tecnici, calendario, rapporti digitali, costi e statistiche).

- HTML5 semantico, CSS3, JavaScript vanilla
- Node.js per la generazione statica (nessuna dipendenza) e per le Netlify Functions (unica dipendenza: `pdf-lib`, MIT)
- Supabase PostgreSQL con migrazioni versionate, Row Level Security e funzioni transazionali
- Backend **non ancora collegato**: area cliente, area Business, dashboard, moduli lead e pagamenti sono predisposti ma non operativi (vedi `docs/CONFIGURAZIONE-BACKEND.md`)
- Output in `dist/`, pronto per Netlify
- Stato (Prompt 9, 18/11/2026): **pronto per il collaudo sullo staging Netlify, NO-GO per la produzione** finché mancano dati aziendali verificati, documenti legali, foto e credenziali dei servizi esterni — vedi `docs/GO-NOGO-REPORT.md`. Non pubblicato, non collegato a GitHub, Netlify o al dominio `prontointerventoroma.it`

## Avvio rapido

Requisiti: Node.js ≥ 20 (Netlify usa Node 22, vedi `.nvmrc`).

```bash
npm run build      # genera dist/ (ambiente development: noindex + banner anteprima)
npm run preview    # anteprima locale su http://localhost:4173
npm run dev        # build + anteprima
npm test           # build development + production e controlli automatici (30 URL, SEO, link, sitemap, HTTP…)
npm run test:browser  # test in Chrome headless: tutte le pagine × mobile/desktop, navigazione, accessibilità
                      # (richiede Python 3 + Playwright e Chrome; vedi scripts/e2e/browser-check.py)
npm run build:production   # build di produzione (resta noindex finché seo.allowIndexing = false)
npm run test:unit          # logica economica/contrattuale, myPOS, certificati, PDF, funzioni (node --test)
npm run test:db            # migrazioni + RLS + logiche su PostgreSQL ≥ 16 (vedi docs/CONFIGURAZIONE-BACKEND.md)
python3 scripts/e2e/app-check.py   # aree riservate nel browser (backend simulato solo nel test)
npm run test:ops           # centrale operativa, calendario, tecnici, area tecnico mobile (backend simulato solo nel test)
npm run example:report     # rigenera reports/esempi/rapporto-intervento-ESEMPIO.pdf (dati fittizi)
npm run db:seed            # rigenera supabase/seed.sql dai listini del sito
npm run test:ai            # PRONTO AI nel browser · npm run test:seo — PRONTO SEO nel browser
npm run test:launch        # collaudo di lancio: 8 dispositivi, CSP, HTML senza JS, tastiera, redirect, 404
npm run test:activation    # attivazione (Prompt 9): funzionalità spente, configurazione azienda, setup, pagamenti, lancio
npm run test:all           # tutte le suite nel browser in sequenza
npm run seo:audit          # audit SEO su una build di produzione simulata
DATABASE_URL=… npm run db:backup                 # backup logico (schema, dati, conteggi, impronte)
TARGET_DATABASE_URL=… npm run db:restore <dir>   # ripristino SOLO in un database nuovo e vuoto
```

`npm run preview` riproduce Netlify: applica le intestazioni di `netlify.toml` (CSP compresa) e i redirect di `_redirects`.

Il report dei test viene scritto in `reports/test-report.md`.

## Struttura

```
pronto-intervento-roma/
├── netlify.toml               # build, publish=dist, funzioni, contesti, header di sicurezza e CSP
├── netlify/functions/         # ordini e checkout myPOS, notifiche/storni, stato pagamenti, ricevute, incassi, PDF/verifica certificati, lead, preventivi, notifiche, scadenze
├── supabase/                  # migrazioni SQL versionate, seed generato, test SQL
├── tests/unit/                # test della logica economica e contrattuale
├── package.json               # script build / preview / test
├── scripts/
│   ├── build.js               # generatore statico + report configurazioni mancanti
│   ├── serve.js               # server di anteprima locale
│   ├── test.js                # test automatici + report
│   └── og/og-image.html       # sorgente dell'immagine Open Graph
├── src/
│   ├── config/site.config.js  # ★ CONFIGURAZIONE CENTRALE (contatti, dati aziendali, moduli, SEO, immagini)
│   ├── config/images.config.js # ★ REGISTRO FOTO: sostituisce i placeholder con foto reali
│   ├── lib/                   # logica di dominio condivisa (piani, contratti, crediti, certificati, QR, PDF, myPOS, notifiche)
│   ├── scripts/app/           # interfacce di area cliente, tecnico, admin, verifica certificato
│   ├── data/
│   │   ├── catalog/           # listini provvisori PRONTO+ Family, Lavoro Protetto, Business/Hotel/Corporate, checklist
│   │   ├── services.js        # catalogo 6 categorie / 24 sottocategorie (+ colore e motivo per categoria)
│   │   ├── content/           # testi originali: 1 file per categoria (categoria + landing)
│   │   └── pronto-plus.js     # linee PRONTO+ e piani Essential/Plus
│   ├── components/            # header, footer, sezioni, pulsanti, icone, logo, placeholder
│   ├── pages/                 # home, template categoria, template landing, privacy, 404, stato progetto
│   ├── seo/schema.js          # Schema.org (impresa, sito, servizi, breadcrumb)
│   ├── styles/main.css        # design system "Premium Industrial Tech"
│   ├── scripts/main.js        # menu, animazioni, tab, validazione e invio moduli
│   └── assets/                # immagini (foto reali in assets/images/foto/)
├── docs/                      # architettura dashboard, immagini, checklist pubblicazione
└── dist/                      # output generato (ignorato da Git)
```

## Pagine generate

| URL | Contenuto |
|---|---|
| `/` | Homepage completa (hero, 6 categorie, catalogo 24 servizi, ricerca perdite, come funziona, PRONTO+, chi siamo, contatti) |
| `/servizi/<categoria>/` | 6 pagine categoria: panoramica, guida "quale servizio ti serve", servizi, blocco specifico (tecnologie perdite, confronto muratura, infestanti), PRONTO+, FAQ, modulo preselezionato |
| `/servizi/<categoria>/<servizio>/` | 24 landing: hero, servizio, quando richiederlo, come funziona, tecnologie, galleria, servizi collegati, PRONTO+, FAQ, modulo preselezionato |
| `/piani-assistenza/famiglie/` | PRONTO+ Family: selettore 8 categorie, confronto Essential/Plus, prezzi IVA inclusa, esclusioni, FAQ |
| `/lavoro-protetto/` | PRONTO+ Lavoro Protetto: piani Check/Plus/Premium, tutele di legge, limiti, certificato |
| `/piani-assistenza/business/` | PRONTO+ Business: pacchetti Start/Pro/Premium (+ IVA), confronto, regole, condomini, modulo preventivo, FAQ, azienda |
| `/hotel-e-strutture-ricettive/` | PRONTO+ Hotel: 8 servizi, piani Business Care/Hotel Pro/Hotel Elite, manutenzione programmata, modulo |
| `/corporate/` | PRONTO+ Corporate: da 15.000 € + IVA, contratti personalizzati, percorso di approvazione, modulo |
| `/checkout/` | Riepilogo e pagamento sicuro (noindex): Family, Lavoro Protetto, rate B2B |
| `/paga/` | Pagamento tramite collegamento inviato dall'impresa (noindex, token nel frammento dell'URL) |
| `/pagamento/{verifica,in-attesa,confermato,annullato,non-riuscito}/` | Pagine di esito (noindex): "confermato" solo dopo la verifica del backend |
| `/area-business/` | Area Business (noindex): richieste multisede, sedi, contratti, rate, preventivi, documenti, manutenzioni, referenti |
| `/area-cliente/`, `/area-cliente/i-miei-interventi/`, `/area-cliente/pagamento/` | Area cliente (noindex) |
| `/area-tecnico/` | Area tecnico del Prompt 2 (noindex), con rimando alla nuova area mobile |
| `/tecnico/` | **Area tecnico mobile** (noindex): lavori assegnati, navigazione esterna, ore, materiali, foto, lavorazioni aggiuntive, rapporto |
| `/admin/centrale-operativa/` | **Centrale operativa** (noindex): 14 indicatori, statistiche, elenco unificato, dettaglio, assegnazione, rapporto, PRONTO+, costi, pagamento |
| `/admin/calendario/` | **Calendario** (noindex): giorno, settimana, mese; filtri; spostamenti con controllo dei conflitti |
| `/admin/tecnici/` | **Gestione tecnici** (noindex): specializzazioni, zone, disponibilità, assenze, abilitazioni verificate, documenti, accesso |
| `/area-cliente/richieste/` | Richieste di intervento del cliente: nuova richiesta, stato, preventivo, lavorazioni extra, rapporto PDF |
| `/rapporto/` | Verifica pubblica dei rapporti di intervento (noindex, solo dati minimi) |
| `/admin/` | Dashboard amministrativa a 21 sezioni: Pagamenti e incassi, Richiedi pagamento, 8 B2B (noindex) |
| `/certificato/` | Verifica pubblica dei certificati (noindex, senza dati personali) |
| `/condizioni-bozza/…` | **Solo anteprima**: bozze delle condizioni in revisione legale |
| `/privacy/` | Segnaposto onesto: informativa da redigere |
| `/404.html` | Pagina di errore |
| `/stato-progetto/` | **Solo anteprima**: elenco configurazioni mancanti (esclusa in produzione) |

Elenco completo delle URL: `reports/PROMPT-1-REPORT.md`. Una landing viene generata (e linkata) solo se in `services.js` ha `landingReady: true` e i suoi testi sono presenti in `src/data/content/`: la build si interrompe se mancano contenuti.

### Aggiungere o modificare un servizio
1. `src/data/services.js` — nome, slug, descrizione breve.
2. `src/data/content/<categoria>.js` — testi della landing (meta, H1, intro, quando, come funziona, tecnologie, galleria, correlati, PRONTO+, FAQ).
3. `npm run check`.

## Configurazione

Tutto ciò che riguarda l'impresa si modifica in `src/config/site.config.js`. Nessun dato è inventato: i campi vuoti generano
- in **sviluppo/anteprima**: pulsanti disattivati "da configurare", note arancioni e il banner in alto;
- in **produzione**: gli elementi senza dati vengono semplicemente omessi.

`npm run build` stampa sempre l'elenco aggiornato delle configurazioni mancanti.

### Moduli di contatto

`forms.provider`:
- `null` (attuale) → moduli visibili, **invio disattivato** e dichiarato all'utente. Nessuna conferma simulata.
- `'centrale'` → (Prompt 5) le richieste entrano nella centrale operativa tramite `/.netlify/functions/request-create`; attivo solo con Supabase configurato.
- `'netlify'` → Netlify Forms (funziona solo dopo il deploy su Netlify).
- `'endpoint'` + `forms.endpoint` → POST verso un servizio esterno (es. Supabase Edge Function).

La conferma "Richiesta ricevuta" appare solo dopo una risposta HTTP positiva.

### PRONTO AI (Prompt 6)

Assistenti AI lato server (`/.netlify/functions/ai-chat`, `ai-confirm`, `ai-status`, `ai-automations`), console in `/admin/pronto-ai/`,
"Assistente tecnico AI" nell'area tecnico. Disattivati finché non si configurano provider (variabili server `AI_PROVIDER`, `AI_MODEL`,
`AI_API_KEY`), tariffe, DPA e interruttore globale. Il pulsante sul sito compare solo con `PUBLIC_AI_WIDGET=true`. Vedi `docs/PRONTO-AI.md`.
Test: `npm run test:unit`, `npm run test:db`, `npm run test:ai`.

### PRONTO SEO (Prompt 7)

Audit tecnico a ogni build (in produzione blocca la pubblicazione se trova errori), schede editoriali per pagina,
indice `/servizi/`, zone operative e guide pubblicate solo dopo approvazione, dashboard `/admin/seo/` (Search Console,
Google Business Profile, conversioni, report, PRONTO SEO Agent), banner di consenso e GA4 solo con `PUBLIC_GA4_MEASUREMENT_ID`.
Search Console si collega con variabili server (`GSC_SERVICE_ACCOUNT_JSON` oppure `GOOGLE_OAUTH_*` + `SEO_TOKEN_KEY`).
Vedi `docs/PRONTO-SEO.md`. Comandi: `npm run seo:audit`, `npm run seo:apply`, `npm run test:seo`.

### Attivazione operativa (Prompt 9)

Pagine riservate agli amministratori: `/admin/configurazione-azienda/` (dati pubblici verificati e dati riservati),
`/admin/setup/` (wizard in 11 voci), `/admin/impostazioni/pagamenti/` (myPOS: stato, prova di connessione, prova completa),
`/admin/funzionalita/` (13 interruttori verificati anche dal database) e `/admin/lancio/` (GO / NO-GO per sito pubblico e piattaforma).
La build legge dal database le funzionalità attive, i dati aziendali **verificati** e i listini **approvati e pubblicati**: in produzione
nessun prezzo o pulsante d'acquisto compare senza approvazione del titolare. Con `APP_ENVIRONMENT=staging` la build resta in anteprima
e le funzioni rifiutano un database di produzione. Vedi `docs/OWNER-SETUP-CHECKLIST.md` e `docs/INTEGRATIONS-STATUS.md`.

### Indicizzazione

Il sito è **noindex** in ogni caso finché non valgono **tutte** queste condizioni (Prompt 8):
1. la build gira con `SITE_ENV=production`;
2. `ALLOW_INDEXING=true` è impostata nel solo progetto Netlify di produzione (oppure `seo.allowIndexing = true`);
3. l'URL del deploy (`URL` di Netlify) coincide con `https://prontointerventoroma.it`.

Uno staging `*.netlify.app` resta quindi non indicizzabile anche con variabili sbagliate; in più è protetto da password (`STAGING_BASIC_AUTH`, edge function `staging-auth`).

Nelle anteprime: `<meta name="robots" content="noindex, nofollow">`, `robots.txt` con `Disallow: /` e header `X-Robots-Tag` tramite `dist/_headers`.

## Pubblicazione (non ancora autorizzata)

Il sito attuale è servito dal progetto Netlify `delfino-soffice-ca8830` (DNS su Aruba). Il percorso consigliato (scenario A) non tocca il DNS:
staging separato `pronto-intervento-roma-2` → collaudo → collegamento del repository al progetto esistente con pubblicazione automatica sospesa →
*Publish deploy* dopo l'approvazione → rollback in un clic sul deploy precedente. Passi esatti in `docs/DOMAIN_MIGRATION.md` e `docs/NETLIFY_DEPLOYMENT.md`.

## Documentazione

Prompt 9 — attivazione operativa e staging:
- `reports/PROMPT-9-REPORT.md` — report finale del Prompt 9
- `docs/GO-NOGO-REPORT.md` — GO / NO-GO aggiornato: funzioni operative e spente, credenziali e dati mancanti, test
- `docs/OWNER-SETUP-CHECKLIST.md` — cosa deve fare il titolare, in ordine
- `docs/COMPANY-CONFIGURATION.md` — dati aziendali: campi, verifica, dove compaiono
- `docs/INTEGRATIONS-STATUS.md` — Supabase, myPOS, email (con DNS del mittente), Google, funzionalità
- `docs/NETLIFY-STAGING-GUIDE.md` — creazione e verifica dello staging `pronto-intervento-roma-2`
- `docs/PRODUCTION-LAUNCH-PLAN.md` — livelli A/B e sequenza di lancio
- `docs/ROLLBACK-PLAN.md` — rollback per funzionalità, dati, sito e database

Prompt 8 — collaudo e lancio:
- `docs/REPORT_AUDIT.md` — stato verificato di ogni modulo dei Prompt 0–7 e difetti corretti
- `docs/REPORT_TEST.md` — test eseguiti, esiti, scenari end-to-end, matrice myPOS e PRONTO AI
- `docs/SECURITY_CHECKLIST.md` — revisione di sicurezza, vulnerabilità trovate e correzioni
- `docs/SEO_MIGRATION.md` — vecchie URL → nuove, redirect, indicizzazione al passaggio
- `docs/NETLIFY_DEPLOYMENT.md` — configurazione Netlify, staging, procedura GitHub
- `docs/DOMAIN_MIGRATION.md` — configurazione del dominio riscontrata, scenari A/B, passi esatti
- `docs/ROLLBACK_PLAN.md` — storico (sostituito da `docs/ROLLBACK-PLAN.md`)
- `docs/PRODUCTION_READINESS.md` — GO / NO-GO del Prompt 8 (storico; aggiornato in `docs/GO-NOGO-REPORT.md`)
- `docs/ENVIRONMENT_VARIABLES.md` — tutte le variabili per staging e produzione
- `reports/PROMPT-8-REPORT.md` — report finale del Prompt 8

Prompt 0–7:

- `docs/ARCHITETTURA-PRONTO-PLUS.md` — architettura, modello dati, regole economiche, ruoli e RLS, processo post-intervento, myPOS, notifiche
- `docs/CENTRALE-OPERATIVA.md` — centrale operativa: architettura, 15 stati, permessi, assegnazioni e conflitti, calendario, area tecnico, rapporti e PDF, PRONTO+, costi, pagamenti, notifiche, cosa configurare
- `docs/PAGAMENTI-MYPOS.md` — integrazione myPOS, ordini, incassi, rimborsi, riconciliazione, ambienti, credenziali e autorizzazioni necessarie
- `docs/ARCHITETTURA-B2B.md` — Business, Hotel, Condomini e Corporate: modello dati, ruoli e isolamento, contratti, richieste, manutenzioni, preventivi, pagamenti, parti non operative
- `docs/CONFIGURAZIONE-BACKEND.md` — passi per collegare Supabase, Netlify, myPOS sandbox e provider email
- `docs/legale/` — bozze delle condizioni (Family, Lavoro Protetto, reclami, privacy) da far approvare a un legale
- `.env.example` — variabili d'ambiente (nessun valore reale)
- `reports/PROMPT-2-REPORT.md` — report del Prompt 2
- `reports/PROMPT-3-REPORT.md` — report del Prompt 3 (B2B)
- `reports/PROMPT-4-REPORT.md` — report del Prompt 4 (pagamenti e incassi)
- `reports/PROMPT-5-REPORT.md` — report del Prompt 5 (centrale operativa, tecnici e interventi)
- `docs/PRONTO-AI.md` — PRONTO AI: agenti, sicurezza, strumenti, approvazioni, automazioni, costi (Prompt 6)
- `reports/PROMPT-6-REPORT.md` — report del Prompt 6 (PRONTO AI)
- `docs/PRONTO-SEO.md` — PRONTO SEO: audit, metadati, Search Console, Business Profile, conversioni, consenso e GA4, agente SEO (Prompt 7)
- `reports/PROMPT-7-REPORT.md` — report del Prompt 7 (PRONTO SEO); audit in `reports/seo-audit.md`
- `docs/IMMAGINI.md` — requisiti, chiavi del registro foto e registro licenze
- `docs/CHECKLIST-PUBBLICAZIONE.md` — cosa completare prima di andare online
