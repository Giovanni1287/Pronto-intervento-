# Report Prompt 3: Business, Hotel, Condomini e Corporate

Data: 17/11/2026 · Versione 0.4.0 · Repository locale `pronto-intervento-roma`, sul lavoro dei Prompt 0, 1 e 2.

Non ho pubblicato nulla e non ho modificato altri repository. Il dominio non è collegato. Non ci sono pagamenti reali né chiavi nel repository. Nessun contratto, pagamento o notifica è simulato nel sito: le simulazioni esistono solo dentro i test.

## 0. Verifica iniziale

Prima di sviluppare ho verificato file, migrazioni e funzionalità del Prompt 2. Erano tutti presenti e funzionanti: unit 39/39 e database 99/99 rieseguiti all'inizio.

Ho riutilizzato le tabelle condivise: `plans`, `plan_versions`, `payments`, `payment_events`, `certificates`, `technicians`, `notifications`, `company_settings`, `audit_log`. Sono state solo estese con nuovi valori ammessi e colonne facoltative; nessuna tabella o record è stato eliminato.

## 1. Cosa è stato consegnato

| # | Consegna richiesta | Implementazione |
|---|---|---|
| 1 | Landing PRONTO+ Business | `/piani-assistenza/business/`: le 10 sezioni richieste, più le regole di contabilizzazione e una sezione dedicata ai condomini |
| 2 | Landing Hotel | `/hotel-e-strutture-ricettive/`: design elegante (titoli con grazie, accento oro), titolo e sottotitolo come da specifica, 8 sezioni di servizio, piani Hotel, manutenzione programmata |
| 3 | Landing Corporate | `/corporate/`: "da 15.000 €/anno + IVA", 14 elementi configurabili, attivazione solo con l'approvazione del responsabile aziendale |
| 4 | Listini dinamici | 6 piani in `src/data/catalog/business-plans.js`, unica fonte per pagine e seed. Nel database sono linee `business` e `hotel` con prezzi IVA esclusa (`price_basis = 'net'`), prestazioni, regole, tariffe e limiti. Corporate è un piano non vendibile. Si modificano in dashboard → Listini, da bozza a pubblicazione |
| 5 | Dashboard ampliata | 8 nuove sezioni (20 in totale): Clienti B2B e sedi, Listini, Contratti annuali, Preventivi, Richieste aziendali con filtri, Calendario e manutenzioni, Lead B2B, Ricavi e scadenze. Le impostazioni ora includono i dati aziendali verificati, la soglia di margine e la regola di blocco |
| 6 | Area cliente Business | `/area-business/`: tutte le 14 informazioni richieste, organizzate in 7 sezioni visibili secondo i 4 ruoli, con selezione dell'azienda se l'utente ne ha più d'una |
| 7 | Gestione multisede | Sedi con codice univoco, tipologia, referente, contratto e prestazioni. Le richieste su più sedi sono atomiche. L'isolamento tra aziende è garantito da RLS, FK composite e controlli per sede |
| 8 | Preventivi PDF | `src/lib/quote-pdf.js` e la funzione `quote-pdf`, con tutti i campi richiesti. L'approvazione è amministrativa e la versione accettata è conservata con hash. Nessuna attivazione automatica del contratto. Esempio: `reports/esempi/preventivo-ESEMPIO.pdf` |
| 9 | Contratti annuali | Versionati. I costi interni e il margine generano un avviso, con blocco solo se esiste una regola esplicita. Accettazione solo dell'amministratore aziendale; rate annuali, trimestrali (se approvate) o personalizzate. Attivazione solo con pagamento verificato o riconciliato; rinnovo mai automatico |
| 10 | Richieste di intervento | Tutti i campi richiesti, foto comprese. 9 stati con transizioni validate dal database secondo l'attore. Storico degli stati, rapporto tecnico, certificato |
| 11 | Calendario manutenzioni | Visite con checklist, tecnico, promemoria, foto, firma di presa visione. Il conteggio avviene solo alla conferma, una sola volta. Le visite non sono mai classificate come verifiche obbligatorie |
| 12 | Moduli lead | Hotel, aziende e condomini, corporate. Funzione `lead-create` e RPC con validazione, privacy e controllo dei duplicati. In dashboard: 8 stati, note e promemoria |
| 13 | Migrazioni database | `20261117130000_business_schema.sql`, `…130100_business_logic.sql`, `…130200_business_rls.sql`: 20 nuove tabelle, RLS FORCE, vincoli, funzioni atomiche e idempotenti, audit |
| 14 | Documentazione | `docs/ARCHITETTURA-B2B.md` (nuovo); aggiornati `CONFIGURAZIONE-BACKEND.md`, `CHECKLIST-PUBBLICAZIONE.md` e README |
| 15 | Report dei test | `reports/test-report.md`, con tutte le suite, e questo documento |

### Regole di contabilizzazione

Le regole sono esplicite e salvate in ogni versione di listino e di contratto:

- **Uscite.** Ogni uscita su richiesta usa un diritto di chiamata.
- **Piccolo intervento.** Si usa solo durante un'uscita inclusa e copre al massimo 45 minuti; l'eccedenza è a pagamento, con lo sconto del piano.
- **Monte ore.** Si scala a blocchi di 15 minuti arrotondati per eccesso.
- **Visite programmate.** Scalano solo il saldo visite; il lavoro svolto durante la visita usa il monte ore, se la regola lo prevede.
- **Prestazioni non coperte.** Fuori fascia oraria, fuori zona o per lavori complessi non si scala nulla: la prestazione è a tariffa, con le maggiorazioni.
- **Nessun doppio conteggio.** Ogni consumo ha una chiave univoca (`req:<id>:<prestazione>`, `visit:<id>:<prestazione>`); i movimenti sono solo in aggiunta.
- **Massimali e tariffe extra.** Sono configurabili per piano e per contratto.

La stessa logica esiste in JavaScript (`settleWork`) e in SQL (`b2b_settle`), ed è testata in entrambi.

## 2. Test eseguiti realmente: 381 su 381 superati

| Suite | Comando | Esito |
|---|---|---|
| Logica (Prompt 2 e B2B), funzioni Netlify (lead, preventivo, checkout rate), PDF del preventivo | `npm run test:unit` | **60/60** |
| Database Prompt 2 su PostgreSQL 16.15 (non regressione) | `npm run test:db` | **99/99** |
| Database B2B su PostgreSQL 16.15 (database pulito, migrazioni e seed) | `npm run test:db` | **119/119** |
| Build production e development, SEO, link, sitemap, contenuti B2B, moduli, HTTP | `npm test` | **130/130** |
| Sito pubblico in Chrome headless: 49 pagine × 390 e 1440 px | `npm run test:browser` | **20/20** |
| Aree riservate in Chrome headless (backend simulato solo nel test) | `python3 scripts/e2e/app-check.py` | **53/53** |

Altre verifiche eseguite:
- Le funzioni `lead-create`, `quote-pdf`, `checkout-create` ed `expirations` si impacchettano con esbuild, lo stesso bundler di Netlify.
- Il PDF del preventivo è stato renderizzato e controllato visivamente; il testo è stato estratto con `pdftotext`.
- Le 3 landing sono state controllate con screenshot desktop e mobile (`reports/screenshots/p3-*.jpg`): nessun overflow orizzontale e nessun errore JavaScript.

### Copertura della Fase 17

| Verifica richiesta | Dove |
|---|---|
| Build | `npm test` (production 45 pagine, development 50) |
| Navigazione pubblica, responsive mobile | `test:browser` (49 pagine × 2 viewport), screenshot |
| Landing Business, Hotel, Corporate | `npm test` › B2B (pagine): 13 controlli |
| Area cliente Business | `app-check`: sezioni per ruolo, richiesta multisede, accettazione contratto, referente con permessi ridotti, mobile 390 px |
| Gestione multisede | DB: sedi per azienda, codici univoci, sedi di altre aziende rifiutate, richieste multisede atomiche |
| Isolamento tra aziende | DB: 10 test (aziende, sedi, referenti, contratti, saldi, richieste, certificati, preventivi, rate) |
| Creazione preventivo, generazione PDF | DB: approvazione, invio, accettazione con hash, nessun contratto automatico. Unit: contenuti del PDF, filigrana, funzione |
| Approvazione contratto | DB: avviso margine con conferma, blocco con regola esplicita, campi Corporate obbligatori, accettazione solo dell'amministratore aziendale |
| Modifica prezzi, versionamento | DB: versione approvata immutabile, nuove versioni, bozza di listino con base IVA esclusa. Unit e app-check: editor dei listini |
| Richieste di intervento, assegnazioni | DB: tutte le transizioni consentite e vietate per cliente, tecnico e admin; programmazione con data; tecnico obbligatorio; rapporto obbligatorio |
| Conteggio prestazioni | DB e unit: uscita e minuti alla chiusura, nessun doppio conteggio, fuori orario, lavoro complesso, monte ore insufficiente, uscite esaurite |
| Calendario | DB: visita solo su sede coperta, esito, presa visione, conferma idempotente. app-check: sezione calendario |
| Sicurezza degli endpoint | Unit: 503 senza configurazione, 401 senza utente, id validati, importi mai dal browser, token dell'utente per le RPC, chiave pubblica per i lead. DB: funzioni interne non invocabili, job riservato al backend |

## 3. Cosa NON è operativo (dipende da servizi non configurati)

| Funzione | Stato | Cosa manca |
|---|---|---|
| Area Business, dashboard B2B, moduli lead | Codice completo; senza backend mostrano "non attivo" e i moduli hanno l'invio disattivato | Progetto Supabase, migrazioni, variabili `PUBLIC_SUPABASE_*` |
| Pagamento online delle rate | Firma myPOS predisposta e testata con chiavi generate nei test | Credenziali sandbox myPOS e test ufficiali; il live resta bloccato |
| Bonifici e RiBa | Riconciliazione manuale con riferimento obbligatorio | Nessuna integrazione bancaria automatica |
| Notifiche (lead, contratti, visite, scadenze) | Solo in coda nel database | Provider email |
| Preventivi PDF validi come offerta | Generati con filigrana BOZZA finché i dati dell'impresa non sono inseriti e verificati | Ragione sociale, P.IVA, sede, PEC del titolare |
| Fatture | Solo collegamento a un riferimento del documento fiscale | Nessun sistema di fatturazione elettronica integrato |
| Foto delle richieste | Caricamento su storage privato predisposto | Bucket Supabase (creato dalla migrazione 004 se lo storage esiste) |
| Prezzi, regole, tariffe extra (45 €/h, 40 € uscita, maggiorazioni 30% e 50%) | Proposte provvisorie, segnalate in pagina | Conferma del titolare |
| Condizioni contrattuali B2B | **Non redatte** (le bozze legali esistenti riguardano i consumatori) | Redazione e revisione legale |
| Immagini delle landing | Segnaposto dichiarati "Immagine da sostituire" | Foto reali con licenza |

## 4. Note e scelte

- **Tabella `business_plan_benefits`.** Non è stata creata: le prestazioni stanno nelle condizioni versionate del listino e del contratto, così non esiste una seconda fonte che possa divergere.
- **Correzioni fuori dal B2B:**
  - la classe `app-admin` applicata anche al `<body>` rompeva l'impaginazione desktop della dashboard; ora il body usa `page-app--<area>`;
  - alcuni attributi `pattern` dei moduli (telefono, codici) non erano validi per Chrome e la validazione veniva ignorata;
  - gli importi ora hanno il separatore delle migliaia (1.900 €).
- **Nuova bozza di listino.** `create_plan_draft` è stata ridefinita in modo compatibile, per copiare anche la base di prezzo (IVA inclusa o esclusa).
- **Commit.** Il commit è solo locale, senza remoto.
