# Report dei test — Prompt 8 (18/11/2026)

Tutti i numeri vengono da esecuzioni reali in questa sessione, nell'ambiente seguente:
- Node 22, PostgreSQL 16 con RLS e ruoli `anon`/`authenticated`/`service_role` emulati;
- Chrome headless con Playwright.

I servizi esterni (Supabase API, myPOS, Google, provider AI, email) sono **simulati** solo dentro i test. Ogni simulazione è dichiarata nel file di test, e nessun dato reale è stato usato.
Dettaglio di ogni controllo del browser: `reports/test-report.md`. Output del database: `reports/db-test-output.txt`.

## 1. Riepilogo

| Suite | Comando | Esito |
|---|---|---|
| Unit (logica, funzioni Netlify, myPOS, AI, SEO, lancio) | `npm run test:unit` | **149/149** |
| Database: sicurezza e Family/Lavoro Protetto | `npm run test:db` → `10_security_and_business.sql` | **99/99** |
| Database: Business/Hotel/Corporate | `20_business.sql` | **120/120** |
| Database: pagamenti | `30_payments.sql` | **81/81** |
| Database: centrale operativa | `40_operations.sql` | **140/140** |
| Database: PRONTO AI | `50_ai.sql` | **137/137** |
| Database: PRONTO SEO | `60_seo.sql` | **85/85** |
| Database: **scenari concatenati e controlli di lancio (nuovo)** | `70_scenarios.sql` | **44/44** |
| Database: aggiornamento con dati esistenti | `upgrade/` | **6/6 · 11/11** |
| Build (production + development, SEO, link, sitemap, sicurezza, lancio) | `npm test` | **176/176** |
| Browser: tutte le pagine a 390 e 1440 px | `npm run test:browser` | **20/20** |
| Browser: aree riservate (Prompt 2–4) | `scripts/e2e/app-check.py` | **85/85** |
| Browser: centrale operativa | `npm run test:ops` | **71/71** |
| Browser: PRONTO AI | `npm run test:ai` | **49/49** |
| Browser: PRONTO SEO | `npm run test:seo` | **71/71** |
| Browser: **collaudo di lancio (nuovo)**: 8 dispositivi, CSP, HTML senza JS, tastiera, redirect | `npm run test:launch` | **66/66** |
| Impacchettamento delle 26 funzioni con lo strumento di Netlify | zip-it-and-ship-it | 26/26, 0 errori |
| Backup e ripristino del database su database separati | `scripts/db/backup.sh`, `restore.sh` | conteggi identici su 114 tabelle; destinazione non vuota e backup alterato rifiutati |
| Scansione segreti / dipendenze | detect-secrets, ricerca nella storia git, `npm audit` | 0 segreti reali, 0 vulnerabilità |

**Totale: 1.410 controlli automatici superati su 1.410**, più le verifiche manuali dell'ultima riga.

Le suite del browser girano sul server locale che applica le intestazioni di `netlify.toml`, CSP compresa: ogni violazione CSP sarebbe un errore di console e quindi un fallimento.

## 2. Dispositivi (Fase 16)

| Dispositivo simulato | Viewport | Pagine | Esito |
|---|---|---|---|
| iPhone SE | 375×667, touch | 37 pubbliche + 39 non indicizzate (aree riservate, checkout, bozze) | 6/6 controlli + menu |
| iPhone 15 | 393×852, touch | 37 | 6/6 + menu |
| Android piccolo | 360×740, touch | 37 | 6/6 + menu |
| Android grande | 412×915, touch | 37 | 6/6 + menu |
| Tablet verticale | 768×1024, touch | 37 + 39 | 6/6 + menu |
| Tablet orizzontale | 1024×768, touch | 37 | 6/6 + menu |
| Laptop | 1366×768 | 37 | 6/6 + menu |
| Desktop | 1920×1080 | 37 + 39 | 6/6 + menu |

Controlli per ogni pagina:
- stato 200;
- nessun errore JavaScript, di console o CSP;
- nessun overflow orizzontale;
- immagini caricate;
- controlli con nome accessibile;
- bersagli di tocco ≥ 24 px;
- nessun link vuoto.

Le dashboard da smartphone (centrale, tecnico, PRONTO AI, PRONTO SEO, aree clienti) sono verificate a 390 px con dati simulati nelle suite ops/app/ai/seo.

## 3. Correzioni nate dai test di questo prompt

| Test che ha fallito | Causa | Correzione |
|---|---|---|
| Scenario S1, passo "tecnico in viaggio" | "malformed array literal" in `report_missing_fields` | migrazione `20261118180100` |
| Scenario S5, attribuzione | canale `unknown` per le richieste confermate da PRONTO AI | trigger su `source` |
| Collaudo di lancio, bersagli di tocco (8 dispositivi) | link di footer e breadcrumb, checkbox e banner sotto i 24 px | CSS |
| Collaudo di lancio, intestazioni | CSP assente sulle pagine pubbliche | `netlify.toml` |

## 4. Scenari end-to-end (Fase 18)

| Scenario | Dove è eseguito come catena continua | Passi verificati | Non verificato |
|---|---|---|---|
| **1 — Cliente senza abbonamento** | `70_scenarios.sql` S1 (17 controlli) | Richiesta anonima dalla landing → presa in carico e completamento dell'indirizzo → controllo conflitti e assegnazione del tecnico → stati del tecnico, ore, rapporto → approvazione del rapporto e della scheda economica → ordine calcolato dal database (122,00 €) → link di pagamento → importo errato rifiutato → notifica verificata lato server → duplicato ignorato → stato "pagato" → chiusura → avviso "rapporto disponibile" → rapporto verificabile con impronta → nessun dato visibile agli anonimi | Pagina di pagamento myPOS reale, invio email reale |
| **2 — Cliente Family** | `30_payments.sql` (ordine Family → condizioni accettate → notifica firmata → contratto attivo e crediti) + `40_operations.sql` (richiesta coperta → esecuzione → crediti scalati una sola volta) + `70_scenarios.sql` (crediti non modificabili dal frontend) | Ordine sandbox simulato, verifica server, attivazione, prestazione inclusa, consumo idempotente | Checkout myPOS sandbox reale |
| **3 — Hotel** | `20_business.sql` sezioni 1–8 | Lead hotel → account → sedi → contratto versionato (offerta) → approvazione → accettazione del cliente → rate → richieste per sede → manutenzioni programmate → rapporti e certificati → preventivi | Firma del contratto fuori piattaforma |
| **4 — Lavoro Protetto** | `10_security_and_business.sql` | Intervento concluso → certificato → acquisto → pagamento confermato → piano attivo → richiesta di controllo → programmazione → esecuzione → prestazione registrata. **Contestazione difetti senza servizio aggiuntivo**: verificata separatamente | Pagamento myPOS reale |
| **5 — PRONTO AI** | `70_scenarios.sql` S5 (6 controlli) + `50_ai.sql` + `ai-check.py` | Conversazione → categoria dal catalogo reale → nessuna richiesta prima della conferma → conferma → richiesta registrata → in coda in centrale → nessun tecnico o appuntamento assegnato dall'AI → attribuzione "PRONTO AI" | Modello AI reale (risposte simulate) |
| **6 — SEO** | `70_scenarios.sql` S1/S6 + `seo-check.py` | La landing di provenienza e il canale salvati con la richiesta senza dati personali → report conversioni: 1 richiesta, 1 cliente, 122 € per la landing; canale organico; report non accessibile al cliente | Dati reali di Search Console |

## 5. Matrice myPOS (Fase 7)

**Credenziali sandbox non disponibili**: ogni prova usa notifiche firmate da una chiave di test generata dal test stesso, e il blocco viene dichiarato.

| Caso richiesto | Esito | Test |
|---|---|---|
| Pagamento Family | ✅ simulato | `30_payments` (ordine, condizioni, notifica, contratto) |
| Pagamento Business / Hotel | ✅ simulato | `20_business` (rate del contratto) |
| Pagamento Corporate autorizzato | ✅ simulato | `30_payments`: acconto e saldo dalla versione accettata (18.300 € IVA inclusa) |
| Intervento singolo | ✅ simulato | `70_scenarios` S1, `40_operations` |
| Acconto / saldo | ✅ simulato | `30_payments` (rate Corporate) |
| Lavoro Protetto | ✅ simulato | `10_security`, `30_payments` |
| Pagamento annullato | ✅ | `30_payments`: ordine annullato, contratto in attesa annullato |
| Pagamento fallito / scaduto | ✅ | `30_payments`: scadenza, nuovo checkout impedito |
| Notifica duplicata | ✅ | `30_payments`, `70_scenarios`, unit (risposta "OK" senza doppia attivazione) |
| Importo errato | ✅ | `30_payments`, `70_scenarios`, unit |
| Firma non valida | ✅ | unit `payments-notifications` (nessuna registrazione, risposta diversa da "OK") |
| Transazione già registrata | ✅ | `30_payments` (`duplicate_transaction`) |
| Rimborso | ✅ simulato, **disattivato** per impostazione predefinita | `30_payments` (approvazione, tetto, riferimento), unit IPCRefund |
| Attivazione solo dopo verifica server | ✅ | Il browser non può chiamare `process_payment_notification` (`70_scenarios`) |
| Protezione delle chiavi | ✅ | Chiavi solo in variabili server; nessuna nel codice client (`npm test`, scansione) |

## 6. Matrice PRONTO AI (Fase 8)

| Verifica | Esito | Dove |
|---|---|---|
| Chat pubblica, raccolta e classificazione | ✅ provider simulato | unit, `ai-check.py` |
| Conferma dell'invio e registrazione in centrale | ✅ | `70_scenarios` S5, `50_ai` |
| Suggerimenti di assegnazione e preventivi | ✅ solo proposte da approvare | unit (Dispatch propone, non assegna), `50_ai` |
| Analisi amministrative, costi e limiti | ✅ | `50_ai` (budget, limiti, registro dei costi) |
| Permessi per agente e ruolo | ✅ | `50_ai`, unit |
| Prompt injection | ✅ | unit (segnalata, testo ripulito e incapsulato) |
| Protezione dei dati | ✅ | unit (recapiti e codici sostituiti prima del provider) |
| Azioni sensibili e approvazione | ✅ | `50_ai` (nessuna esecuzione senza approvazione umana) |
| Disattivazione degli agenti | ✅ | unit (interruttore d'emergenza), `50_ai` |
| Nessun intervento o appuntamento inventato | ✅ | unit (controllo dell'output), `70_scenarios` S5.5 |

## 7. Performance (Fase 17)

Le ultime misure Lighthouse di laboratorio (Prompt 7) sulla build di produzione in locale danno:
- Performance 99–100;
- Accessibilità, Best practice e SEO 100;
- LCP 1,7–2,0 s su mobile simulato;
- CLS 0.

Nel Prompt 8 sono cambiati solo CSS minimi (bersagli di tocco) e intestazioni, senza nuove risorse. Le misure non sono state ripetute, quindi questi numeri restano quelli del Prompt 7. **I Core Web Vitals reali non sono misurabili** finché il sito non è pubblicato.

## 8. Cosa NON è stato testato

- Servizi reali: myPOS sandbox, Search Console, Business Profile, GA4, provider AI, Resend, Supabase Auth (OTP via email) e Storage.
- Netlify reale: edge function in esecuzione, funzioni pianificate, certificati, intestazioni servite da Netlify. Sono state verificate con un server locale equivalente e con lo strumento di impacchettamento di Netlify.
- Browser diversi da Chromium (Safari iOS e Firefox): nessuna funzione usata è esclusiva di Chrome, ma serve una prova manuale sullo staging.
