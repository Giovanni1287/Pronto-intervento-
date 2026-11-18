# PRONTO+ Business, Hotel, Condomini e Corporate — architettura (Prompt 3)

Questa sezione B2B estende il progetto senza ricrearlo. Restano invariati PRONTO+ Family, Lavoro Protetto, la dashboard esistente e i contratti già sottoscritti: le tabelle del Prompt 2 vengono solo **estese** (nuovi valori ammessi e colonne facoltative). Nessuna tabella e nessun record viene eliminato.

## 1. Pagine pubbliche

| URL | Contenuto |
|---|---|
| `/piani-assistenza/business/` | Le 10 sezioni richieste: hero, presentazione, benefici, settori serviti, pacchetti Start/Pro/Premium, tabella comparativa, inclusi ed esclusi, regole di contabilizzazione, sezione condomini, modulo preventivo, FAQ, azienda di Giovanni Romeo, collegamento all'area Business. |
| `/hotel-e-strutture-ricettive/` | Variante elegante, con titoli con grazie e accento oro. Hero e sottotitolo come da specifica. Contiene le 8 sezioni di servizio, i piani Business Care, Hotel Pro e Hotel Elite, le regole, la manutenzione programmata (che non sostituisce le verifiche obbligatorie), il modulo, le FAQ e le tutele. |
| `/corporate/` | Prezzo indicativo "da 15.000 €/anno + IVA, se applicabile", i 14 elementi configurabili, il percorso di attivazione con approvazione del responsabile aziendale, il modulo e le FAQ. |

Altre caratteristiche delle pagine pubbliche:
- **Prezzi.** Sono tutti indicati "+ IVA, se applicabile" e provengono da `src/data/catalog/business-plans.js`, che è la fonte unica per pagine e seed.
- **Disponibilità.** Nessuna promessa di H24 o di tempi di arrivo garantiti: la reperibilità esiste solo se prevista da uno SLA scritto.
- **SEO.** Ogni pagina ha titoli e descrizioni dedicati alle parole chiave richieste, breadcrumb, JSON-LD (`BreadcrumbList`, `FAQPage`, `OfferCatalog` con `valueAddedTaxIncluded: false`) e collegamenti interni verso le landing di servizio.
- **Navigazione.**
  - "Business e Hotel" porta a `/piani-assistenza/business/`.
  - Il footer contiene Business e Condomini, Hotel, Corporate e Area Business.
  - La home collega le linee B2B alle nuove landing.

## 2. Moduli lead (hotel, aziende, condomini, corporate)

I moduli si trovano in `src/components/lead-form.js` e raccolgono ragione sociale, referente, email aziendale, telefono, tipologia di attività, numero di sedi, zona, servizi richiesti, necessità, richiesta di sopralluogo e privacy.

1. **Invio.** Il modulo invia `POST /.netlify/functions/lead-create`. La funzione valida i campi, scarta il campo trappola e chiama la RPC `submit_b2b_lead` con la chiave pubblica: privacy obbligatoria, controllo dei duplicati entro 5 minuti, numero `LEAD-AAAA-…`, notifica agli amministratori messa in coda.
2. **Attivazione.** Il modulo è attivo solo se il backend è configurato (`PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_ANON_KEY`). Altrimenti il pulsante è disattivato e lo script dichiara che nulla è stato inviato.
3. **Gestione in dashboard.** La sezione **Lead B2B** gestisce gli 8 stati (Nuovo, Contattato, Qualificato, Sopralluogo proposto, Preventivo inviato, In trattativa, Acquisito, Non acquisito), le note commerciali, il promemoria e la conversione in azienda cliente. Gli anonimi non possono leggere i lead; l'avviso privacy è mostrato in dashboard.

## 3. Modello dati (migrazioni `20261117130000…130200`)

**Tabelle condivise riutilizzate:**
- `plans`, `plan_versions`: listini versionati, con le nuove linee `business`, `hotel`, `corporate` e `price_basis = 'net'`.
- `payments`, `payment_events`: nuovo tipo `business_installment`.
- `certificates`: anche per richieste aziendali, con un solo soggetto per certificato.
- `technicians`, `notifications`, `company_settings`, `audit_log`.

**Nuove tabelle:**

| Tabella | Scopo |
|---|---|
| `business_accounts` | Aziende clienti (business, hotel, condominium, corporate). La P.IVA è validata con la cifra di controllo. |
| `business_members` | Utente ↔ azienda, con uno dei 4 ruoli e le sedi assegnate. |
| `business_locations` | Sedi con codice univoco per azienda, tipologia e referente. |
| `business_contracts` | Contratti annuali. Il trimestrale richiede approvazione; il rinnovo automatico richiede consenso registrato. |
| `business_contract_versions` | Versioni con condizioni (`terms`), costi interni, margine, approvazione admin e accettazione dell'amministratore aziendale (snapshot e hash SHA-256). |
| `business_contract_locations` | Sedi coperte. Le FK composite impediscono sedi di altre aziende. |
| `business_benefit_balances` / `business_benefit_usages` | Saldi per prestazione; consumi in sola aggiunta, con chiave di idempotenza univoca. |
| `business_installments` | Rate. "Pagata" solo con riferimento del provider o di riconciliazione. |
| `business_intervention_requests` / `business_request_events` | Richieste aziendali (9 stati) e storico delle transizioni. |
| `maintenance_checklists`, `maintenance_schedules`, `maintenance_visits` | Manutenzione programmata: checklist, foto, firma di presa visione. |
| `technician_assignments`, `service_reports` | Assegnazioni (una attiva per richiesta o visita) e rapporti con ore, materiali e condizioni. |
| `b2b_leads`, `b2b_lead_notes` | Pipeline commerciale. |
| `business_quotes`, `business_quote_items` | Preventivi con costi, margine e versione accettata conservata. |

Note di modello:
- La tabella di esempio `business_plan_benefits` non è stata creata per evitare duplicazioni. Le prestazioni sono nelle `conditions` della versione di listino, poi copiate nei `terms` della versione di contratto, che è immutabile dopo l'approvazione.
- Le prestazioni sono: diritti di chiamata, piccoli interventi, minuti di manutenzione, visite programmate.

## 4. Ruoli e isolamento

| Ruolo | Sedi | Contratti e prezzi | Pagamenti | Referenti | Sedi (gestione) | Accettazione contratto |
|---|---|---|---|---|---|---|
| Amministratore aziendale | tutte | ✓ | ✓ | ✓ | ✓ | ✓ (unico) |
| Responsabile manutenzione | tutte | ✓ | — | — | ✓ | — |
| Referente di sede | assegnate | — | — | — | — | — |
| Utente limitato | assegnate, solo le proprie richieste | — | — | — | — | — |

Come è garantito l'isolamento:
- **RLS con FORCE** su tutte le tabelle B2B, basata su `business_members`.
- **Funzioni di supporto:** `b2b_role`, `b2b_location_allowed`, `b2b_can_view_contracts`, `b2b_can_see_request`.
- **Costi e margini:** le versioni di contratto e i preventivi sono leggibili **solo dagli amministratori**. I clienti usano `business_contract_view`, `quote_document` e `business_quotes_list`, che restituiscono solo campi sicuri.
- **Profili:** non sono leggibili tra utenti diversi. I nomi dei referenti arrivano da `business_members_list`, solo per chi può gestirli.
- **Scritture con effetti** (stati, saldi, rate, rapporti, eventi): sono revocate ai client e passano solo da funzioni `SECURITY DEFINER` con controllo esplicito del ruolo.
- **Stati:** un trigger impedisce di cambiare lo stato di richieste, contratti, visite, rate e preventivi anche all'amministratore, se non tramite le funzioni dedicate.
- **Storage:** le foto delle richieste vanno in `interventi/b2b/<account_id>/…`, accessibili solo ai membri dell'azienda e all'amministratore.

## 5. Flussi principali

### Contratto annuale
1. **Bozza.** `create_business_contract` copia le condizioni del listino pubblicato. Per Corporate i termini sono vuoti e vanno completati.
2. **Costi interni.** L'amministratore inserisce manodopera/ora, trasferta per uscita e altri costi.
3. **Approvazione.** `approve_business_contract_version` calcola costo e margine.
   - Sotto la soglia `margin_threshold_pct` (default 25%) mostra un **avviso** che richiede conferma esplicita, registrata in `margin_ack_by`.
   - L'approvazione viene **bloccata** solo se è attiva la regola `block_below_margin`.
   - Per Corporate verifica i campi obbligatori.
4. **Accettazione.** `accept_business_contract_version` può essere eseguita **solo dall'amministratore aziendale**. Salva snapshot e hash della versione accettata, sostituisce l'eventuale versione accettata precedente e crea le rate una sola volta: annuale, oppure trimestrale se approvata, oppure personalizzata con somma controllata.
5. **Attivazione.** Avviene solo con la prima rata pagata.
   - Il pagamento è verificato dalla notifica myPOS (`confirm_payment`, ramo `business_installment`, idempotente per evento) oppure riconciliato dall'amministratore (`reconcile_installment` con riferimento obbligatorio, es. il CRO).
   - Contestualmente si creano i saldi delle prestazioni, in modo idempotente.
6. **Rinnovo.** `renew_business_contract` crea un nuovo contratto in bozza: mai automatico. Il job giornaliero segnala le scadenze e porta a "scaduto" i contratti terminati.

### Richiesta di intervento aziendale
1. **Creazione.** `create_business_requests` crea una richiesta per ciascuna sede selezionata, tutte o nessuna, verificando sede per sede che appartenga all'azienda e che sia autorizzata per l'utente. Collega il contratto attivo che copre la sede.
2. **Transizioni.** `transition_business_request` applica le stesse regole di `canTransition` in `src/lib/business.js`:
   - il cliente può solo annullare, con motivo, fino a "Da programmare";
   - il tecnico assegnato porta la richiesta "in lavorazione" e poi "completata", con rapporto;
   - l'amministratore gestisce il resto: programmazione con data, assegnazione con tecnico attivo, chiusura.
3. **Contabilizzazione alla chiusura.** `b2b_settle` è il port SQL di `settleWork`:
   - un diritto di chiamata per uscita;
   - il piccolo intervento solo durante un'uscita inclusa;
   - il monte ore a blocchi di 15 minuti arrotondati per eccesso;
   - nulla di incluso fuori fascia, fuori zona o per lavori complessi;
   - eccedenze a tariffa, con sconto e maggiorazioni.
   I consumi sono registrati una sola volta con chiavi `req:<id>:<prestazione>`.
4. **Certificato.** `issue_business_certificate` usa lo stesso formato e la stessa verifica pubblica dei certificati consumer.

### Manutenzione programmata
1. **Programmazione.** `schedule_maintenance_visit` (solo su sedi coperte), con checklist e tecnico.
2. **Esecuzione.** `complete_maintenance_visit`: esito della checklist, note, foto, minuti e firma di presa visione. In questa fase **non si scala nulla**.
3. **Conferma.** `confirm_maintenance_visit` (amministratore aziendale, responsabile o admin) scala la visita (e i minuti, se la regola del contratto lo prevede) **una sola volta** (`visit:<id>`). Una seconda conferma non ha effetti.
4. **Classificazione.** Le visite non vengono mai classificate come verifiche periodiche obbligatorie o certificazioni: le checklist lo dichiarano.

### Preventivi
- **Bozza.** Voci, costi, monte ore, uscite, sedi, durata e condizioni di pagamento. `recalc_business_quote` ricalcola i totali.
- **Approvazione.** `approve_business_quote` segue la stessa logica di avviso o blocco sul margine e conserva i dati del cliente, ma **non crea contratti**.
- **Invio e accettazione.** Dopo "Inviato" l'accettazione (`accept_business_quote`) conserva snapshot e hash e **non attiva nulla**.
- **Contratto.** `create_contract_from_quote` è un'azione esplicita e crea un contratto **in bozza**, da approvare.
- **PDF.** `GET /.netlify/functions/quote-pdf?id=…` usa il token dell'utente e la RPC `quote_document`. Contiene logo, dati aziendali, dati cliente, numero, date, servizi, sedi, uscite, prestazioni, monte ore, esclusioni dei materiali, IVA, durata, pagamento, validità e spazio di accettazione. Mai costi interni o margini.
- **Dati aziendali non verificati.** In dashboard → Impostazioni il titolare inserisce i propri dati e li segna come verificati. Finché non lo fa, il PDF riporta un avviso e la filigrana **BOZZA**.

## 6. Pagamenti (predisposizione myPOS)

> Aggiornato nel Prompt 4: ogni rata ha un proprio ordine collegato alla versione accettata; attivazione predefinita a pagamento integrale (`activationRule`), modalità di pagamento approvate dal titolare. Vedi `docs/PAGAMENTI-MYPOS.md`.

- `checkout-create` accetta `kind: 'business'` con `installmentId`. L'importo arriva dalla rata salvata nel database (RPC `create_installment_order`, solo amministratore aziendale), mai dal browser.
- La notifica `mypos-notify` usa la stessa verifica di firma e importo. `confirm_payment` attiva il contratto solo a pagamento verificato.
- Bonifico e RiBa sono gestiti con la riconciliazione manuale con riferimento: un cliente non è considerato pagante finché non avviene la verifica o la riconciliazione.
- Corporate: fatturazione personalizzata, con le rate nei `terms` la cui somma deve corrispondere al totale IVA inclusa.
- Rinnovo automatico: impossibile senza consenso registrato (vincolo di tabella). Nessun job rinnova da solo.
- **Nessun pagamento reale è attivo.** Il live è bloccato senza `MYPOS_ALLOW_LIVE=true`.

## 7. Interfacce

| Area | Contenuto |
|---|---|
| `/area-business/` | Panoramica (prestazioni residue, prossime visite, scadenze), richieste (nuova multisede con foto, elenco filtrabile, cronologia, annullamento), storico e documenti (rapporti, materiali, certificati, riferimenti fiscali), sedi, manutenzioni (calendario e conferma), contratti e pagamenti (accettazione, rate, pagamento online, preventivi con PDF e accettazione), azienda e referenti. Le sezioni dipendono dal ruolo; se l'utente appartiene a più aziende può scegliere quella su cui lavorare. |
| Dashboard `/admin/` | 8 nuove sezioni: Clienti B2B e sedi, Listini Business e Hotel (bozza → pubblicazione, prestazioni, regole, tariffe), Contratti annuali (versioni, costi e margine, approvazione, rate e riconciliazione, programmazione visite, rinnovo), Preventivi, Richieste aziendali (filtri per azienda, sede, categoria, stato e data; transizioni; tecnico; certificato), Calendario e manutenzioni, Lead B2B, Ricavi e scadenze (ricavi contrattualizzati, rate, margini, prestazioni residue, CSV). Ogni modifica è tracciata nell'`audit_log`. |
| `/area-tecnico/` | Nuova sezione "Clienti aziendali": richieste e visite assegnate, rapporto con ore, materiali, fuori orario, festivo, lavoro complesso e presa visione; esito delle visite con checklist. |

## 8. Cosa NON è operativo

| Elemento | Stato | Cosa serve |
|---|---|---|
| Database Supabase | Migrazioni e seed pronti e **testati su PostgreSQL 16 locale** (119 test B2B e 99 precedenti) | Progetto Supabase UE e applicazione delle migrazioni (vedi `CONFIGURAZIONE-BACKEND.md`) |
| Moduli lead, area Business, dashboard B2B | Codice pronto; senza backend mostrano "non attivo" | Variabili `PUBLIC_SUPABASE_*` |
| PDF preventivi | Generati e testati in locale | Dati aziendali verificati dal titolare; deploy delle funzioni |
| Pagamenti rate | Firma myPOS predisposta, **sandbox non verificata con myPOS reale** | Credenziali sandbox e test ufficiali |
| Notifiche (nuovi lead, contratti, visite) | Solo messe in coda | Provider email (`RESEND_API_KEY`) |
| Prezzi, regole e tariffe extra | Proposte da approvare | Conferma del titolare e revisione legale delle condizioni B2B (non ancora redatte) |
| Fotografie | Segnaposto dichiarati "Immagine da sostituire" | Foto reali con licenza |
