# GO / NO-GO — 18/11/2026 (Prompt 9)

Sostituisce `docs/PRODUCTION_READINESS.md` (Prompt 8). Lo stesso calcolo, sui dati reali, è in **/admin/lancio/**.

| Livello | Esito | Motivo principale |
|---|---|---|
| **Collaudo online sullo staging** | ✅ **PRONTO** (codice, configurazione e procedure) | Mancano solo gli accessi: Netlify, GitHub, Supabase di staging, myPOS sandbox |
| **A — sito pubblico in produzione** | ❌ **NO-GO** | Dati aziendali e contatti non forniti/verificati; informativa privacy da redigere; foto segnaposto |
| **B — piattaforma transazionale** | ❌ **NO-GO** | Nessuna integrazione reale collegata; listini e condizioni non approvati; nessuna prova in sandbox |

Nessun blocco riguarda difetti noti del codice. Nessun blocco di sicurezza è stato rimosso o allentato per ottenere un GO.

## 1. Funzioni operative (con backend collegato) e funzioni spente

Con un database nuovo **tutte le 13 funzionalità partono spente** e si accendono da /admin/funzionalita/ (controllo anche lato server).

| Funzione | Stato del codice | Stato al lancio consigliato |
|---|---|---|
| Sito pubblico (home, 6 categorie, 24 landing, PRONTO+, B2B, privacy, 404) | ✅ collaudato | livello A |
| Moduli di richiesta | ✅ (centrale Supabase o Netlify Forms) | da scegliere: oggi **disattivati** con invito a chiamare |
| Area clienti, registrazione | ✅ | spenta (*Login clienti*, *Registrazione clienti*) fino al livello B |
| PRONTO+ Family, Lavoro Protetto (vendita) | ✅ | spenta; pagine con "Chiedi informazioni" e "Prezzo in definizione" in produzione |
| Business, Hotel, Corporate | ✅ | raccolta richieste; vendita spenta |
| Pagamenti myPOS | ✅ | spenti; live bloccato dal codice |
| Centrale operativa, calendario, tecnici, rapporti PDF | ✅ | attivabile dopo Supabase + collaudo staging |
| Dashboard tecnici | ✅ | spenta finché non ci sono tecnici reali |
| Notifiche automatiche | ✅ coda con nuovi tentativi | spente finché il provider email non è verificato |
| PRONTO AI | ✅ | spento (nessuna chiave, nessun budget) |
| PRONTO SEO | ✅ audit attivo a ogni build | dati Google dopo il collegamento di Search Console |
| Google Analytics 4 | ✅ con consenso | spento fino alla cookie policy validata |

## 2. Credenziali mancanti (da configurare SOLO nei pannelli dei provider)

| Servizio | Variabili / accesso | Per |
|---|---|---|
| GitHub | repository privato + autorizzazione al push | staging e produzione |
| Netlify | accesso all'account; progetto `pronto-intervento-roma-2`; build hook | staging |
| Supabase staging | `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | staging |
| myPOS sandbox | `MYPOS_SID`, `MYPOS_WALLET`, `MYPOS_PRIVATE_KEY`, `MYPOS_PUBLIC_CERT` | staging, livello B |
| Resend | `RESEND_API_KEY`, `NOTIFY_FROM` (dominio verificato), `NOTIFY_ALLOWED_DOMAINS` in staging | livello B |
| Google | `GSC_SERVICE_ACCOUNT_JSON` (proprietà già verificata) | dopo il lancio |
| Provider AI | `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, budget | facoltativo |
| Supabase produzione, myPOS live | come sopra, progetto e chiavi **diversi** | livello B |

## 3. Dati aziendali da confermare

Ragione sociale · Partita IVA · sede legale · telefono (il +39 351 922 1277 del sito attuale **non è confermato**) · email · orari ·
eventualmente PEC, WhatsApp Business, sede operativa, logo, foto del titolare, descrizione, abilitazioni documentate, polizza RC, social.
Inoltre: servizi realmente offerti, zone servite, listini di tutte le linee. Nessuno di questi dati è stato inventato o inserito.

## 4. Problemi tecnici aperti

| # | Problema | Impatto | Gestione |
|---|---|---|---|
| 1 | *Login clienti* spento non blocca le chiamate dirette all'API di Supabase Auth per utenti già esistenti | basso: i dati restano protetti da RLS; nessun nuovo utente senza invito | documentato: disattivare il signup in Supabase Auth |
| 2 | Le pagine pubbliche si allineano a flag, dati e listini solo alla build successiva | basso: i controlli lato server sono immediati | pulsante "Aggiorna il sito" (build hook) |
| 3 | Il bucket `azienda-pubblico` è leggibile pubblicamente anche per file caricati ma non ancora verificati | basso: il sito usa un'immagine solo dopo la verifica | caricare solo immagini destinate alla pubblicazione |
| 4 | Le 6 voci della "prova completa myPOS" contano eventi registrati in qualsiasi momento, non per singola sessione di prova | basso | lo staging ha un database proprio; esito finale dichiarato con nota dall'amministratore |
| 5 | Lighthouse non rieseguito nel Prompt 9 (ultimo: Prompt 7, 99–100 in laboratorio) | nessuno noto: pagine pubbliche invariate salvo prezzi e "Chi siamo" | rieseguire sullo staging |

## 5. Test (eseguiti di nuovo nel Prompt 9, non ripresi dal Prompt 8)

| Categoria | Suite | Esito |
|---|---|---|
| Automatici — build e contenuti | `npm test` (build production, preview, staging, development) | 181/181 |
| Automatici — logica e funzioni | `npm run test:unit` (node --test) | 160/160 |
| Integrazione — database reale (Postgres 16) | `npm run test:db`: 10 file, migrazioni da zero e aggiornamento dal Prompt 8 | 794/794 (di cui 71 nuovi in `80_activation.sql`) |
| Browser con backend **simulato** (mock dichiarati) | browser, aree riservate, centrale, PRONTO AI, PRONTO SEO, attivazione | 20 + 87 + 71 + 49 + 71 + 42 |
| Browser — collaudo di lancio (8 dispositivi, CSP, redirect, 404, HTML senza JS) | `launch-check.py` | 66/66 |
| Impacchettamento funzioni (strumento ufficiale Netlify) | zip-it-and-ship-it | 30/30 funzioni, 0 avvisi |
| Sicurezza | detect-secrets + ricerca nella storia git; `npm audit` | nessun segreto (7 falsi positivi già noti); 0 vulnerabilità |
| **Reali con i provider** | Supabase, myPOS sandbox, Resend, Google, AI | ❌ **non eseguiti** (nessuna credenziale) |
| **Manuali** | scenari sullo staging, revisione testi e foto, prova d'acquisto sandbox | ❌ **non eseguiti** (staging non creato) |
| Lighthouse | — | non rieseguito |

## 6. Azioni del titolare (ordine)

1. Fornire e verificare i dati aziendali e i contatti (`OWNER-SETUP-CHECKLIST.md` §1).
2. Far redigere/validare informativa privacy, cookie policy, condizioni di vendita e di Lavoro Protetto.
3. Approvare servizi, zone e listini.
4. Fornire le foto (almeno le 10 prioritarie).
5. Creare o concedere: repository GitHub privato, account Netlify, progetto Supabase di staging, credenziali myPOS sandbox, account Resend.
6. **Autorizzare esplicitamente** il push su GitHub e la creazione dello staging.
7. Collaudare sullo staging e registrare l'approvazione al lancio.
8. Autorizzare il passaggio di dominio (livello A) e, separatamente, i pagamenti live (livello B).

## 7. Passaggi Netlify

Staging: `docs/NETLIFY-STAGING-GUIDE.md` §3–4 (progetto nuovo, ramo `develop`, `APP_ENVIRONMENT=staging`, `STAGING_BASIC_AUTH`,
Supabase di staging, myPOS sandbox). Produzione: `docs/PRODUCTION-LAUNCH-PLAN.md` §2 passi 8–13, nel progetto esistente
`delfino-soffice-ca8830` con pubblicazione automatica sospesa e *Publish deploy* manuale; rollback in `docs/ROLLBACK-PLAN.md`.
