# Architettura tecnica — PRONTO+, aree riservate, certificati e pagamenti

Documento aggiornato al Prompt 2 (sostituisce la bozza `ARCHITETTURA-DASHBOARD.md`).

## 1. Componenti

```
Browser (HTML statico + JS vanilla)                Supabase
┌──────────────────────────────────────┐   anon   ┌─────────────────────────────────────┐
│ Sito pubblico (SEO)                   │  + JWT  │ Auth (email: link + codice OTP)       │
│ /piani-assistenza/famiglie/           │────────▶│ PostgreSQL + RLS (migrazioni 001-004) │
│ /lavoro-protetto/   /certificato/     │         │ Funzioni SQL transazionali (RPC)      │
│ /area-cliente/ /area-tecnico/ /admin/ │◀────────│ Storage privato "interventi"          │
└───────────────┬──────────────────────┘         └──────────────▲──────────────────────┘
                │ /.netlify/functions/*                          │ service role
                ▼                                                │ (solo server)
┌──────────────────────────────────────────────────────────────────┴──────┐
│ Netlify Functions: checkout-create · mypos-notify · certificate-pdf ·   │
│ certificate-verify · notifications-dispatch (ogni 15 min) ·             │
│ expirations (giornaliera)                                               │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ form firmato / notifica firmata
                           ▼
                     myPOS Checkout (sandbox)
```

## 2. Struttura del codice

| Percorso | Contenuto |
|---|---|
| `src/data/catalog/family-plans.js` | Listino provvisorio Family: 8 categorie × Essential/Plus, con uscite, interventi, durate, sconti, esclusioni. È la fonte del seed. |
| `src/data/catalog/protected-work.js` | Listino Lavoro Protetto (Check, Plus, Premium), limiti di zona e tempo, listini specialistici non vendibili finché non definiti. |
| `src/lib/` | Logica di dominio pura e testata: `plans` (versioni, promozioni), `contracts`, `entitlements` (crediti idempotenti), `protected-work` (offerta, flussi A/B), `certificates`, `qr` (encoder QR), `certificate-pdf`, `mypos`, `notifications`, `money`, `dates`. |
| `supabase/migrations/` | 001 schema · 002 logica, vincoli e audit · 003 RLS e permessi · 004 profilo all'iscrizione e storage. |
| `supabase/seed.sql` | Generato da `npm run db:seed`, a partire dai listini del sito. |
| `supabase/tests/` | Shim Supabase per i test locali e test SQL di sicurezza e logica. |
| `netlify/functions/`, `netlify/lib/` | Funzioni server e client REST minimale. |
| `src/scripts/app/` | Interfacce: `core` (client Auth/REST/RPC), `cliente`, `admin`, `tecnico`, `certificato`. |
| `src/pages/pronto-plus.js`, `src/pages/app.js` | Pagine pubbliche PRONTO+, bozze delle condizioni (solo anteprima) e pagine applicative (sempre `noindex`). |

## 3. Modello dati (entità principali)

| Entità | Tabella | Note |
|---|---|---|
| Profili utente | `profiles` | Ruolo `customer` / `technician` / `admin`; il ruolo lo cambia solo un amministratore. |
| Tecnici | `technicians` | Collegati a un profilo. |
| Immobili | `properties` | Di proprietà del cliente. |
| Categorie e servizi | `service_categories`, `services` | Le 6 categorie e i 24 servizi del sito. |
| Piani | `plans` | Linea `family` o `protected`, livello, variante (`standard`, `autospurgo`, `diagnostica`), flag di attivazione e approvazioni. |
| Versioni dei piani | `plan_versions` | `draft` → `published` → `archived`; una sola pubblicata per piano; le pubblicate sono immutabili. |
| Promozioni | `promotions` | Percentuale o importo fisso, finestra temporale, piani interessati. |
| Contratti Family | `contracts` | Snapshot congelato di prezzo e condizioni; attivazione solo con pagamento confermato. |
| Acquisti Lavoro Protetto | `protected_purchases` | Legati a un intervento; un solo acquisto aperto per intervento. |
| Prestazioni incluse | `entitlements` | Interventi, controlli, visite preventive, sconti. |
| Crediti residui | `entitlement_usages` + vista `entitlement_balances` | Registro solo in aggiunta, chiave di idempotenza univoca, storni tracciati. |
| Interventi e rapporti | `interventions`, `intervention_reports` | Stati: richiesto, programmato, in corso, completato, verificato. |
| Documenti | `documents` | Foto con consenso esplicito, documenti fiscali, report. |
| Certificati | `certificates` | Numero non sequenziale, payload con impronta SHA-256, revisioni; mai modificati o eliminati. |
| Contestazioni | `disputes` | Flusso A: sempre consentito; un esito negativo richiede una motivazione. |
| Richieste di assistenza | `assistance_requests` | Flusso B: solo con piano attivo. |
| Controlli programmati | `scheduled_checks` | Eseguito → confermato → credito scalato. |
| Pagamenti | `payments`, `payment_events` | Un ordine per acquisto; eventi del gateway con chiave univoca. |
| Notifiche | `notifications` | Coda con deduplicazione; `sent` solo con l'id del provider. |
| Impostazioni | `company_settings` | Vendita abilitata o no, finestre, zone, preavvisi. |
| Audit | `audit_log` | Registro solo in aggiunta di tutte le modifiche rilevanti. |

## 4. Regole economiche e contrattuali, e dove sono garantite

| Regola | Database | Logica JS |
|---|---|---|
| Prezzo calcolato sul listino pubblicato, mai dal browser | `create_family_order`, `create_protected_order` | `checkout-create` ignora gli importi del client |
| Versione pubblicata immutabile; pubblicazione solo tramite funzione | trigger `guard_plan_version`, `publish_plan_version` | `plans.editDraft` / `publish` |
| Nessuna modifica retroattiva ai contratti | trigger `guard_frozen_terms` | `contracts.createContract` (snapshot congelato) |
| Attivazione solo con pagamento verificato, importo e valuta corretti, una sola volta | `confirm_payment` (evento univoco, `FOR UPDATE`) | `mypos.handleNotify`, `contracts.activateContract` |
| Credito scalato solo dopo esecuzione confermata, una volta per chiave | `consume_entitlement`, `confirm_check` | `entitlements.consume` |
| Segnalazione difetto senza piano e mai respinta in automatico | `create_dispute` (nessun controllo su piani) | `protected-work.createDefectReport` |
| Servizio aggiuntivo solo con piano attivo, residuo, zona e preavviso | `create_service_request` | `protected-work.canRequestService` |
| Offerta Lavoro Protetto mai preselezionata | interfaccia: nessun radio selezionato, condizioni da accettare | `protected-work.buildOffer` |
| Certificato non falsificabile né modificabile senza traccia | trigger `guard_certificate`, impronta SHA-256, revisioni | `certificates.verify` |
| Pagina pubblica senza dati personali | `verify_certificate_public` (campi in elenco chiuso) | `certificates.publicView` |
| "Inviata" solo con conferma del provider | vincolo CHECK su `notifications` | `notifications.dispatch` |

## 5. Ruoli e autorizzazioni (RLS)

- **anon:** legge solo listini pubblicati e la verifica pubblica dei certificati.
- **customer:** legge solo i propri profili, immobili, interventi, rapporti già verificati, certificati, contratti, crediti, pagamenti, segnalazioni e notifiche. Scrive solo tramite RPC (ordini, segnalazioni, richieste, conferma dei controlli) e sui propri profilo e immobili.
- **technician:** legge solo gli interventi assegnati e ancora aperti, con cliente e immobile collegati; registra rapporti e foto solo su quelli. Dopo la verifica l'accesso si chiude.
- **admin:** gestione completa tramite tabelle e RPC; ogni modifica finisce nel registro audit.
- **service_role** (solo Netlify Functions): conferma dei pagamenti, scadenze, coda notifiche.

I test in `supabase/tests/10_security_and_business.sql` verificano questi confini su PostgreSQL 16.

## 6. Processo post-intervento
1. Il tecnico registra l'intervento come completato, con descrizione, materiali, note e foto autorizzate (`submit_intervention_report`).
2. L'amministratore verifica i dati (`verify_intervention`).
3. Il sistema emette il certificato (`issue_certificate`): l'emissione è idempotente e accoda la notifica al cliente.
4. Il cliente scarica il PDF dall'area cliente (`certificate-pdf`, con il suo token).
5. Facoltativamente valuta Lavoro Protetto: offerta senza preselezione, con prezzi, condizioni e avviso sulle tutele.
6. Se accetta, `checkout-create` crea l'ordine nel database e firma il form myPOS.
7. Il piano si attiva solo con la notifica server-side firmata (`mypos-notify` → `confirm_payment`). Viene emessa una nuova revisione del certificato con il piano, e la precedente resta verificabile come "sostituita".

## 7. Integrazione myPOS (predisposta, non attiva)
- La firma IPC e la verifica delle notifiche sono in `src/lib/mypos.js`.
- `readConfig` blocca l'ambiente reale senza `MYPOS_ALLOW_LIVE=true`.
- Nessun dato di carta transita o viene salvato.
- **Prima del collegamento reale:** verificare parametri e algoritmo di firma sulla documentazione ufficiale myPOS e testare in sandbox, con notifiche duplicate, importi errati e annullamenti.

## 8. Notifiche
- Gli eventi sono accodati dal database, con deduplicazione: intervento completato, certificato disponibile, attivazione del servizio, prenotazione e completamento del controllo, scadenza imminente, nuova richiesta, aggiornamento dello stato.
- `notifications-dispatch` invia tramite il provider configurato (Resend via HTTP). Senza provider, lo stato diventa `not_sent`.
- Le comunicazioni commerciali richiedono `marketing_consent`.

> Estensione B2B (Business, Hotel, Condomini, Corporate): vedi `docs/ARCHITETTURA-B2B.md`.
