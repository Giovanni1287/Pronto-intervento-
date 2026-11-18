# Centrale operativa, tecnici e interventi (Prompt 5)

Documento tecnico e operativo della centrale di **Pronto Intervento Roma**. Riguarda le pagine
`/admin/centrale-operativa/`, `/admin/calendario/`, `/admin/tecnici/`, `/tecnico/`,
`/area-cliente/richieste/` e `/rapporto/`, le migrazioni `2026111715*` e le funzioni Netlify
`request-create`, `report-pdf` e `report-verify`.

> Stato: **predisposto, non operativo**. Senza Supabase configurato le pagine dichiarano
> "non ancora attiva", i moduli del sito non inviano nulla e nessuna notifica parte.

## 1. Scelte di architettura

| Esigenza | Soluzione | Perché |
|---|---|---|
| Registro unico delle richieste | Estensione di `interventions` (Prompt 2): recapiti, indirizzo, categoria, descrizione, urgenza, origine, stato operativo, operatore, dati del modulo | Nessun sistema parallelo: certificati, crediti Family, Lavoro Protetto e pagamenti continuano a usare la stessa tabella |
| Richieste aziendali (Business, Hotel, Condomini, Corporate) | Restano in `business_intervention_requests` (Prompt 3); la centrale le mostra con lo stesso schema a 15 stati (`b2b_op_status`) e le assegna con le funzioni del Prompt 3 | Le regole contrattuali B2B (saldi, contabilizzazione) restano intatte |
| Calendario | `technician_assignments` (Prompt 3) esteso con orari, note, attrezzature, priorità, avvisi e motivazioni: è il calendario unico di interventi, sopralluoghi, richieste B2B, visite di manutenzione e controlli Lavoro Protetto | I conflitti si controllano su un'unica tabella |
| Rapporto digitale | `intervention_reports` esteso (diagnosi, orari, problemi non risolti, raccomandazioni, presa visione, stato, numero) + `intervention_report_versions` (versioni con impronta SHA-256) | Il rapporto del Prompt 2 resta valido come "rapporto sintetico" |
| Fotografie | Tabella `documents` esistente (fase e didascalia aggiunte), vista `intervention_photos` | Stesso bucket privato `interventi` e stesse regole |
| Notifiche | Coda `notifications` esistente (con `intervention_id` per chi non ha un account e `channel`) e vista `service_notifications` | Un solo sistema, chiavi anti-duplicato |
| Pagamenti | `create_service_order` e `issue_payment_link` del Prompt 4 | Nessun codice del gateway duplicato |
| Prestazioni PRONTO+ | `consume_entitlement` del Prompt 2, richiamata solo alla chiusura | Crediti scalati una volta, dopo esecuzione e conferma |

Stato storico e stato operativo: la colonna `status` del Prompt 2 resta e viene derivata
automaticamente da `op_status` (`op_legacy_status`), così RLS, certificati e crediti continuano a
funzionare. Le vecchie funzioni `submit_intervention_report` e `verify_intervention` hanno la stessa
firma e passano dalla centrale.

## 2. Stati operativi

| # | Codice | Etichetta | Stato storico |
|---|---|---|---|
| 1 | `new` | Nuova richiesta | requested |
| 2 | `in_review` | In valutazione | requested |
| 3 | `awaiting_quote` | In attesa di preventivo | requested |
| 4 | `quote_sent` | Preventivo inviato | requested |
| 5 | `quote_accepted` | Preventivo accettato | requested |
| 6 | `to_schedule` | Da programmare | requested |
| 7 | `scheduled` | Intervento programmato | scheduled |
| 8 | `technician_assigned` | Tecnico assegnato | scheduled |
| 9 | `en_route` | Tecnico in viaggio | in_progress |
| 10 | `on_site` | Tecnico sul posto | in_progress |
| 11 | `in_progress` | Intervento in corso | in_progress |
| 12 | `completed` | Intervento completato | completed |
| 13 | `admin_review` | In verifica amministrativa | completed (verified dopo l'approvazione del rapporto) |
| 14 | `closed` | Chiuso | verified |
| 15 | `cancelled` | Annullato | cancelled |

Lo **stato del pagamento** è separato (`intervention_payment_state`): importi non definiti, scheda in
bozza, coperto da PRONTO+, nessun addebito, da richiedere/fatturare, ordine in bozza, pagamento richiesto,
pagato in parte, pagato, da verificare, rimborsato.

Regole (identiche in `ops_allowed_transitions` e in `src/lib/operations.js`, verificate da un test):

- **Staff** (amministratore e operatore con `ops.manage`): avanzamento, ritorni motivati, annullamento con motivo.
- **Tecnico**: solo `technician_assigned → en_route/on_site`, `en_route → on_site`, `on_site → in_progress`
  e il completamento tramite `request_completion`.
- **Cliente**: solo annullamento delle proprie richieste non ancora programmate.
- `quote_sent` e `quote_accepted` solo dopo aver registrato preventivo e accettazione; `scheduled` richiede data;
  `technician_assigned` richiede un'assegnazione attiva; `completed` richiede il rapporto con i **dati minimi**
  (lavorazioni ≥ 10 caratteri, diagnosi, orario di inizio e fine, categoria, servizio, indirizzo);
  `closed` solo tramite `close_intervention`.
- Ogni cambio di stato è registrato in `intervention_status_history` con data, ora, utente e ruolo; le
  modifiche ai dati in `intervention_events`. Entrambi i registri sono solo in aggiunta.
- Un trigger impedisce a chiunque, amministratore compreso, di cambiare stato, tecnico o programmazione
  con un aggiornamento diretto.

## 3. Ruoli e permessi

| Permesso | Amministratore | Operatore di centrale | Tecnico | Cliente |
|---|---|---|---|---|
| `ops.view` centrale, elenco, dettaglio, calendario | ✓ | ✓ | — | — |
| `ops.manage` inserimento, modifica dati, stati, note, duplicati, prestazioni incluse | ✓ | ✓ | — | — |
| `ops.assign` assegnazione e riprogrammazione | ✓ | ✓ | — | — |
| `ops.close` chiusura e riapertura | ✓ | — | — | — |
| `reports.approve` approvazione e correzione rapporti | ✓ | — | — | — |
| `economics.view` scheda economica (importi per il cliente) | ✓ | ✓ | — | — |
| `economics.manage` / `economics.approve` | ✓ | — | — | — |
| `costs.internal` costi interni, spese, margini | ✓ | — | — | — |
| `payments.request` ordini e collegamenti di pagamento | ✓ | — | — | — |
| `technicians.view` / `technicians.manage` / `technicians.documents` | ✓ / ✓ / ✓ | ✓ / — / — | — | — |
| `stats.view` statistiche (senza costi per l'operatore) | ✓ | ✓ | — | — |
| Lavori assegnati e aperti, ore, materiali, foto, rapporto | — | — | ✓ (solo i propri) | — |
| Proprie richieste, preventivo, lavorazioni extra, rapporto approvato | — | — | — | ✓ |

I permessi dell'operatore sono righe di `role_permissions`: il titolare può aggiungerne o toglierne con
una riga SQL. Il ruolo `operator` si assegna come gli altri ruoli (`update public.profiles set role = 'operator' …`).

## 4. Flussi

**Ricezione.** Homepage, landing e modulo preventivo → `request-create` → `submit_public_request`
(chiave pubblica; privacy obbligatoria; limite di 5 richieste in 24 ore per numero; controllo dei
duplicati). Area cliente → `create_customer_request` (collega il contratto Family attivo che copre
immobile e categoria). Centrale → `create_manual_request` (telefono, email, sopralluoghi Business e
Hotel collegati ad azienda, sede o lead). Le richieste aziendali entrano dall'area Business (Prompt 3);
le richieste Lavoro Protetto (visite) e le segnalazioni post-intervento restano nei flussi del Prompt 2 e
sono contate tra le "richieste post-intervento".

**Duplicati.** Stesso telefono o email, stesso cliente e categoria, o stesso indirizzo entro
`ops_duplicate_window_days` (7): la richiesta viene segnalata, mai scartata. L'operatore decide e,
se è un duplicato, `mark_duplicate` la collega all'originale e la annulla con motivazione.

**Assegnazione (ASSEGNA INTERVENTO).** Richiesta, tecnico, data e fascia, note, attrezzature e priorità
(`assign_intervention`). `check_assignment` verifica:

- **bloccanti superabili con motivazione scritta**: sovrapposizione in calendario (con qualsiasi attività
  del tecnico), assenza, fuori disponibilità settimanale, specializzazione mancante;
- **bloccanti non superabili**: tecnico non attivo, orario non valido, requisito professionale configurato
  dal titolare (`qualification_requirements`) senza abilitazione verificata e valida alla data;
- **avvisi**: zona non servita, disponibilità o zone non configurate, abilitazione in scadenza entro
  30 giorni, richiesta urgente.

Nessuna assegnazione è automatica, nemmeno per le urgenze (`ops_auto_assign_rules` resta `null` finché il
titolare non approva regole). `suggest_technicians` ordina i tecnici con regole trasparenti
(`source: "rules"`) ed è il punto di aggancio per un futuro suggeritore AI: la scelta resta all'operatore.

**Calendario.** `calendar_range` restituisce interventi, sopralluoghi, richieste B2B, visite di
manutenzione e controlli Lavoro Protetto, con filtri per tecnico, categoria e zona. Le voci di calendario
delle funzioni dei Prompt 2–3 si creano e si aggiornano da sole (trigger). `reschedule_appointment`
sposta con controllo dei conflitti e salva lo storico in `appointment_reschedules`.

**Area tecnico (`/tecnico/`).** Solo i lavori assegnati e aperti (`my_jobs`), recapito del cliente solo
mentre il lavoro è attivo, nessun prezzo o costo. "Apri navigazione" apre Google Maps (o l'app predefinita)
con il solo indirizzo dell'intervento: **nessuna posizione del tecnico viene rilevata o inviata** (verificato
da test). Ore (`tech_log_time`, nessuna sovrapposizione, niente orari futuri), materiali, foto (bucket
privato, autorizzazione del cliente per l'uso nel rapporto), lavorazioni aggiuntive (solo proposte),
rapporto in bozza e richiesta di completamento. Dopo l'invio ore, materiali e rapporto non sono più
modificabili dal tecnico.

**Rapporto.** Il tecnico invia (`request_completion`), l'amministratore approva o chiede correzioni
(`review_report`). Ogni passaggio crea una versione con impronta. All'approvazione il rapporto riceve il
numero `RAP-AAAA-XXXXXX`, diventa visibile al cliente e non è più modificabile (riapertura solo con
`reopen_report`, motivata, prima della richiesta di pagamento). La presa visione del cliente è facoltativa
e non sostituisce certificazioni obbligatorie.

**PDF.** `report-pdf` genera il documento dalla versione approvata (deterministico) con: logo, dati
dell'impresa **solo se verificati dal titolare**, numero, cliente, immobile, tecnico, servizio,
descrizione, diagnosi, lavorazioni, materiali, date e orari, foto autorizzate, note, tutele applicabili,
assistenza aggiuntiva acquistata, QR di verifica e riferimenti fiscali. Avvertenza in ogni pagina: non è
dichiarazione di conformità, certificazione obbligatoria né documento fiscale. `/rapporto/?n=…` mostra solo
numero, stato, versione, date, categoria e comune. Esempio: `reports/esempi/rapporto-intervento-ESEMPIO.pdf`.

**Prestazioni PRONTO+ Family.** `coverage_check` verifica contratto attivo, immobile coperto, categoria,
prestazioni residue (al netto di quelle già prenotate su altre richieste) e mostra inclusioni ed esclusioni.
`plan_coverage` registra la prestazione prevista **senza scalarla**. La chiusura (`close_intervention`) la
scala con `consume_entitlement` e chiave `ops-cov:<id>`: una sola volta, in transazione; ripetere la
chiusura non scala di nuovo. Nella scheda economica la quota inclusa è separata dalla parte extra e
nell'ordine compare come voce distinta "Quota inclusa in … (non addebitata)".

**Costi.** Scheda economica con prezzo concordato, acconto, diritto di chiamata, manodopera, materiali,
noleggio, trasferta, smaltimento, costi esterni, quota inclusa, sconti, IVA (per riga, come gli ordini del
Prompt 4) e totale. Preventivo (`record_quote`) e accettazione (`accept_quote` dalla centrale, oppure
`customer_accept_quote` dall'area cliente) bloccano il prezzo: nessun aumento senza lavorazioni aggiuntive
autorizzate dal cliente (`decide_extra_work` / `customer_decide_extra_work`). Costi interni, spese e
margine di contribuzione stimato sono in tabelle separate, visibili solo con `costs.internal`.
Preventivato, fatturato (riferimenti fiscali collegati) e incassato (transazioni verificate) sono distinti.

**Pagamento (myPOS, Prompt 4).** Dopo l'approvazione di rapporto e scheda economica:
`create_intervention_order` → `create_service_order` (ordine collegato all'intervento, importo dal database)
→ `issue_payment_link` → checkout ospitato `/paga/` → notifica myPOS verificata lato server → ordine pagato.
Il tecnico non ha alcun accesso. Un acconto già ricevuto si registra sull'ordine con "Registra incasso".

**Chiusura e post-intervento.** `close_intervention` richiede rapporto e scheda approvati, scala le
prestazioni, emette il certificato del Prompt 2 per i clienti registrati (che abilita l'offerta facoltativa
Lavoro Protetto nell'area cliente) e accoda "rapporto disponibile". La segnalazione dei difetti resta un
percorso **gratuito e separato** (`create_dispute`), mai subordinato all'acquisto di Lavoro Protetto.

## 5. Notifiche

| Evento richiesto | Evento in coda | Destinatario |
|---|---|---|
| Nuova richiesta | `request_created` | cliente o email della richiesta; amministratori |
| Richiesta presa in carico | `request_taken` | cliente |
| Intervento programmato | `intervention_scheduled` | cliente |
| Tecnico assegnato | `technician_assigned` (+ `job_assigned` al tecnico) | cliente, tecnico |
| Appuntamento riprogrammato | `appointment_rescheduled` | cliente |
| Intervento completato | `intervention_completed` | cliente |
| Rapporto disponibile | `report_available` | cliente |
| Pagamento richiesto | `order_created` (Prompt 4) | cliente |
| Pagamento confermato | `payment_confirmed` (Prompt 4) | cliente |
| Controllo post-intervento programmato | `check_booked` (Prompt 2) | cliente |

Ogni evento ha una chiave anti-duplicato. Senza `RESEND_API_KEY`/`NOTIFY_FROM` il dispatcher registra
"non inviata": nessuna comunicazione parte. Il canale `whatsapp` è previsto nella coda ma **non attivo**:
si potrà collegare solo l'API ufficiale WhatsApp Business, dopo autorizzazione e consenso; nessuna
automazione non ufficiale.

## 6. Sicurezza e privacy

- RLS su tutte le nuove tabelle, scritture solo tramite funzioni (`security definer` con controllo del permesso).
- Nessuna chiave privilegiata nel browser; `request-create` e `report-verify` usano la chiave pubblica,
  `report-pdf` il token dell'utente (RLS attive).
- Dati riservati del tecnico (telefono e email di lavoro, costo orario, note) in `technician_private`, solo amministratore.
- Assenze: solo la tipologia (ferie, permesso, assenza, formazione, altro), nessun motivo sanitario.
- Documenti dei tecnici nel bucket privato `tecnici`; ogni consultazione dell'elenco è registrata in
  `sensitive_access_log`, come l'apertura del dettaglio di una richiesta e la generazione dei rapporti.
- Conservazione: `retention_candidates()` non propone eliminazioni finché il titolare non imposta
  `retention_months_photos` secondo gli obblighi applicabili.
- Audit: tutte le nuove tabelle sono nel registro `audit_log` (vista `technician_audit_logs` per i tecnici).

## 7. Da configurare

1. Migrazioni `20261117150000…150200` e `supabase/seed.sql` (specializzazioni, mappatura servizi, impostazioni).
2. Account dei tecnici (invito Supabase Auth), poi `/admin/tecnici/` → "Nuovo tecnico": specializzazioni,
   zone, disponibilità, costo orario.
3. **Requisiti professionali obbligatori per specializzazione** (`set_qualification_requirement`): da
   definire con il titolare secondo le norme applicabili; finché la tabella è vuota non viene imposto alcun requisito.
4. Mappatura servizi → specializzazioni (`src/data/catalog/specializations.js`, provvisoria) da confermare.
5. Eventuali operatori di centrale (`role = 'operator'`).
6. Moduli del sito: `forms.provider = 'centrale'` in `src/config/site.config.js` (con Supabase configurato).
7. Provider email; WhatsApp Business solo dopo autorizzazione.
8. Dati dell'impresa verificati (dashboard → Impostazioni) per il PDF dei rapporti.
9. Periodi di conservazione di foto e documenti.
