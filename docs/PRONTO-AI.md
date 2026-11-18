# PRONTO AI — agenti intelligenti e automazioni (Prompt 6)

PRONTO AI affianca la centrale operativa con cinque assistenti AI e dieci automazioni. **Legge solo dati autorizzati e prepara proposte**:
decisioni economiche, contrattuali e operative restano a Giovanni Romeo e agli operatori autorizzati.

Stato alla consegna: **predisposto, non attivo**. Nessun provider è configurato; l'interruttore globale, gli agenti, le automazioni e il
pulsante sul sito sono disattivati. Gli endpoint rispondono `503 not_configured` / `ai_disabled` senza chiamare alcun provider.

## Architettura

```
Browser (widget sito · console /admin/pronto-ai/ · area tecnico · centrale)
   │  solo messaggi e token di sessione Supabase (nessuna chiave AI)
   ▼
Netlify Functions ── ai-chat ─── ai_runtime_gate (kill switch, agente, ruolo, budget, limiti)
   │                 │           orchestratore (src/lib/ai/orchestrator.js)
   │                 │             ├─ pulizia, minimizzazione dati, rilevazione injection
   │                 │             ├─ sicurezza deterministica (gas, fuoco, acqua+elettricità…)
   │                 │             ├─ ciclo modello ↔ strumenti con limiti (chiamate, strumenti, tempo)
   │                 │             ├─ validazione JSON Schema degli argomenti
   │                 │             └─ controllo dell'output (arrivi garantiti, prezzi non verificati…)
   │                 └─ provider (src/lib/ai/providers.js): Anthropic Messages API | OpenAI Responses API
   │            ai-confirm ── conferma esplicita del cliente → ai_confirm_customer_request → centrale
   │            ai-status  ── stato per la console (mai la chiave)
   │            ai-automations (ogni ora) → ai_run_due_automations
   ▼
Supabase (Postgres + RLS) — funzioni ai_* con controllo dei permessi, registro, costi, sicurezza
```

| Componente | File |
|---|---|
| Schema, logica, RLS | `supabase/migrations/20261117160000_ai_schema.sql`, `…160100_ai_logic.sql`, `…160200_ai_rls.sql` |
| Provider (adattatore) | `src/lib/ai/providers.js` |
| Orchestratore | `src/lib/ai/orchestrator.js` |
| Agenti e istruzioni | `src/lib/ai/agents.js` |
| Strumenti tipizzati | `src/lib/ai/tools.js` (+ `schema.js`) |
| Sicurezza cliente | `src/lib/ai/safety.js` |
| Injection, dati personali, output | `src/lib/ai/injection.js`, `redact.js`, `guard.js` |
| Classificazione sul catalogo | `src/lib/ai/classify.js` |
| Funzioni | `netlify/functions/ai-chat.mjs`, `ai-confirm.mjs`, `ai-status.mjs`, `ai-automations.mjs` |
| Interfacce | `src/scripts/ai-widget.js` (+ `styles/ai-widget.css`), `src/scripts/app/pronto-ai.js`, `ai-chat-panel.js` |

## Agenti

| Agente | Chi lo usa | Cosa fa | Cosa NON fa |
|---|---|---|---|
| Customer Assistant | visitatori e clienti (sito, area cliente) | capisce il problema, categoria e sottocategoria reali, chiede i dati mancanti e la zona, riconosce i pericoli, illustra servizi e PRONTO+, prepara il riepilogo | non invia nulla senza conferma, non chiede recapiti in chat, non promette tempi, non dà istruzioni tecniche rischiose |
| Dispatch Assistant | operatori e amministratori | richieste da assegnare, fasce realmente libere, conflitti, raggruppamenti per zona, dati mancanti, urgenze | non assegna e non modifica il calendario: mette in coda proposte da approvare |
| Technical Assistant | tecnici (lavoro assegnato) | riepilogo, procedure approvate con riferimento, campi mancanti, bozze di testo dalle note | non inventa misure, certificazioni o lavorazioni; non salva il rapporto |
| Commercial Assistant | amministratori | listini pubblicati, Essential vs Plus, anteprime di preventivo e margini calcolati dal database, contratti in scadenza | nessuno sconto o prezzo libero, nessun invio senza doppia approvazione, nessuna modifica di listini o contratti |
| Management Assistant | amministratori | risposte alle domande del titolare con il catalogo di query autorizzate (periodo, fonti, dati mancanti, aggiornamento) | nessun SQL libero, nessun KPI inventato, ordini aperti ≠ incassi |

L'agente si sceglie dal canale e dal **ruolo verificato con Supabase Auth**, mai dal testo del messaggio.

## Flusso Customer Assistant → centrale operativa

1. Il visitatore apre il widget (il JS si scarica solo ora). Il server genera un token di conversazione casuale; nel database si salva solo l'impronta SHA-256.
2. Ogni messaggio passa da `ai_runtime_gate`; telefono, email, codici fiscali, IBAN e carte vengono sostituiti da segnaposto prima del provider e del registro.
3. Il modello classifica sul catalogo reale e aggiorna la **bozza** (`update_request_draft`): solo campi ammessi, categorie e servizi verificati dal database; nessun recapito.
4. Il widget mostra il riepilogo ("non ancora inviata"). Il cliente preme **Conferma e invia**, inserisce nome, telefono, email facoltativa e accetta l'informativa privacy.
5. `ai-confirm` → `ai_confirm_customer_request`: verifica titolarità e **impronta della bozza mostrata** (se è cambiata: nuova conferma), crea la richiesta con le stesse regole del modulo pubblico (limiti, duplicati), origine `ai_assistant`, urgenza da pericolo rilevato. Idempotente: una richiesta per conversazione.
6. Il cliente vede il numero `RIC-…` restituito dal database. Nessun messaggio tipo "un tecnico sta arrivando": l'appuntamento lo conferma la centrale.
7. Se il backend non risponde: "la richiesta NON è stata registrata" e contatti diretti.

## Sicurezza del cliente

Rilevazione deterministica (non dipende dal modello) di gas, fiamme/fumo, acqua vicino a impianti elettrici, cavi scoperti/scosse,
allagamenti con rischio elettrico, persone in pericolo, monossido. Mostra messaggi prestabiliti (allontanarsi, non toccare, 112),
ricorda che l'azienda **non è un servizio pubblico di emergenza**, marca la richiesta come urgente; il livello non si abbassa con messaggi successivi.

## Strumenti (tool calling)

- **Lettura**: `classify_problem`, `list_services`, `pronto_plus_plans`, `search_knowledge`, `dispatch_overview`, `available_slots`, `suggest_technicians`,
  `check_assignment`, `request_detail`, `my_jobs`, `job_detail`, `report_missing_fields`, `margin_estimate`, `contract_expirations`, `business_query`, `pending_ai_actions`.
- **Bozza / proposta**: `update_request_draft`, `request_human_help`, `propose_assignment`, `propose_appointment`, `quote_preview`, `propose_quote_publication`.
- **Azioni con effetti reali**: nessuna esposta al modello. Si eseguono solo dall'interfaccia (conferma del cliente, approvazione nella coda).
- **Assenti per costruzione**: SQL arbitrario, modifica prezzi/listini, pagamenti, rimborsi, eliminazione di clienti o documenti, modifica di benefici usati o contratti firmati, privilegi amministrativi, HTTP verso destinazioni arbitrarie, esecuzione di codice.

Ogni strumento: schema JSON con `additionalProperties: false`, elenco degli agenti autorizzati, chiamata alla funzione del database **con il token dell'utente**
(stessi permessi e RLS; per i visitatori la chiave pubblica). Risultati al modello senza recapiti e marcati come dati non affidabili.

## AZIONI AI DA APPROVARE

`ai_propose_action` → proposta con numero `AIA-…`, motivazione, dati usati, dati mancanti, effetto previsto, **fotografia dei dati** e scadenza (default 4 ore).
`ai_decide_action` ricontrolla scadenza, permesso dell'approvatore (assegnazioni: `ops.assign`; invio preventivo: `economics.approve`), modifiche ammesse
(solo orario e note) e confronta la fotografia: se i dati sono cambiati → `stale`, nessuna esecuzione. L'esecuzione usa le stesse funzioni della centrale
(`assign_intervention`, `schedule_intervention`, `set_business_quote_status`) ed è unica (idempotente). Errori → `failed` con motivo.

## Automazioni (dieci, tutte sospese alla consegna)

Riepilogo giornaliero richieste · richieste non assegnate · contratti in scadenza · appuntamenti senza tecnico · controlli post-intervento (solo proposte di
promemoria di servizio da approvare) · interventi completati della settimana · report mensile abbonamenti · rapporti incompleti · preventivi in attesa · errori di pagamento.
Deterministiche (nessun modello), job persistenti con chiave di periodo (`unique(rule_id, run_key)`), `for update skip locked` contro le sovrapposizioni,
tre tentativi con attesa crescente, stato e risultato registrati, avviso agli amministratori in caso di fallimento, frequenza configurabile, esecuzione manuale.
Nessuna comunicazione commerciale automatica.

## Knowledge base

Documenti caricati e **approvati** dall'amministratore (FAQ, condizioni, listini, procedure, manuali), ambito `public` / `technical` / `internal`,
suddivisione in blocchi e ricerca testuale italiana (`tsvector`), versioni (la nuova sostituisce la precedente), revoca immediata.
Le conversazioni e i documenti dei clienti non diventano mai conoscenza condivisa. Ricerca semantica (embedding): non attivata in questa fase.

## Budget e costi

- Budget iniziale **30 €/mese** (configurabile). Soglie: avviso 80%, stop agenti non essenziali 90%, stop totale 100%. L'assistente clienti e il dispatch sono "essenziali".
- Costo **stimato** = token riportati dal provider × tariffe inserite dall'amministratore (nessuna tariffa predefinita). Costo **effettivo** registrato a mano dalla fattura/console.
- Il budget è un limite operativo interno: **non garantisce** la spesa effettiva, che dipende dalle condizioni del provider.
- Limiti: 6 chiamate al modello e 8 strumenti per messaggio, 20 s, 800 token di risposta; 40 messaggi/ora per utente, 15/ora per visitatore, 40/giorno per indirizzo (impronta).

## Dati personali e conservazione

- Al provider vanno solo i testi necessari, con recapiti e codici sostituiti. Recapiti per la richiesta: solo nel modulo di conferma.
- OpenAI: `store: false`. Verificare in ogni caso le condizioni di conservazione del provider e firmare il DPA (prerequisito per l'attivazione).
- Nel database: impronte (SHA-256 con sale) di IP e token; conversazioni cancellate dopo 90 giorni (configurabile); utilizzo dopo 400 giorni.
- Accesso: i clienti vedono solo le proprie conversazioni; costi, impostazioni, registri e knowledge base solo amministratori (`ai.manage`).

## Provider (API verificate a novembre 2026)

- Anthropic Messages API — `POST https://api.anthropic.com/v1/messages`, intestazioni `x-api-key`, `anthropic-version: 2023-06-01`; strumenti `{name, description, input_schema}`, blocchi `tool_use` / `tool_result`.
- OpenAI Responses API — `POST https://api.openai.com/v1/responses`; strumenti `{type: "function", name, description, parameters}`, elementi `function_call` / `function_call_output`.
- Nessun SDK: chiamate HTTP dirette, timeout per chiamata, un solo nuovo tentativo per 408/409/429/5xx.
- Il modello si indica in `AI_MODEL` dopo averlo verificato: nel codice non c'è alcun modello predefinito.

## Attivazione (riassunto)

Vedi `docs/CONFIGURAZIONE-BACKEND.md` §4-ter e `docs/CHECKLIST-PUBBLICAZIONE.md`.
