# Stato delle integrazioni — 18/11/2026 (Prompt 9)

**Nessuna integrazione esterna è collegata.** Nessuna credenziale è stata fornita, chiesta o salvata. Tutto ciò che segue
"✅" è stato verificato **nel codice e nei test locali**; nessuna voce dichiara una connessione reale riuscita.

Lo stato reale si legge in **/admin/setup/** (funzione `setup-status`): variabili presenti, ruolo e progetto delle chiavi Supabase
(senza mai mostrarne il valore), raggiungibilità di Auth e Storage, ultima prova registrata dal server per ogni integrazione.

| Integrazione | Codice | Test eseguiti | Connessione reale | Cosa manca |
|---|---|---|---|---|
| Supabase (database, RLS, funzioni) | ✅ 25 migrazioni | ✅ 794 asserzioni SQL su Postgres 16 locale (10 file, anche aggiornamento da Prompt 8) | ❌ nessun progetto | Progetto staging dedicato + variabili |
| Supabase Auth (accesso via email con codice) | ✅ | ✅ browser (simulato) | ❌ | URL di redirect, SMTP personalizzato, modelli email |
| Supabase Storage (4 bucket) | ✅ policy | ✅ SQL (con schema storage minimo locale) | ❌ | Bucket creati dalla migrazione al primo `db push` |
| myPOS Checkout API | ✅ firma, notifiche, idempotenza, rimborsi | ✅ unit (chiavi generate nel test) | ❌ nessuna credenziale sandbox | SID, wallet, chiave privata, certificato myPOS **sandbox** |
| Email transazionali (Resend) | ✅ coda con nuovi tentativi | ✅ unit + SQL | ❌ | Account, dominio mittente verificato, chiave API |
| Google Search Console | ✅ | ✅ (simulato) | ❌ | Service account aggiunto alla proprietà |
| Google Analytics 4 | ✅ consenso | ✅ | spento di proposito | Cookie policy validata (prima non si attiva) |
| Provider AI (PRONTO AI) | ✅ | ✅ (simulato) | ❌ | Chiave, budget, DPA (facoltativo) |
| Netlify (staging `pronto-intervento-roma-2`) | ✅ `netlify.toml`, funzioni impacchettabili | ✅ build e impacchettamento locali | ❌ progetto non creato | Accesso all'account Netlify |
| GitHub | ✅ repository locale pulito | ✅ scansione segreti | ❌ nessun remoto | Repository privato + autorizzazione al push |

## 1. Supabase

Verifiche automatiche disponibili (eseguite dal server, mai dal browser):
- URL e chiavi presenti; **ruolo** delle chiavi (`anon` / `service_role`) e **progetto** di appartenenza confrontato con l'URL (`describeSupabaseKey`); chiavi pubbliche della build e chiavi del server sullo **stesso** progetto.
- Auth raggiungibile (`/auth/v1/settings`) e Storage raggiungibile (`/storage/v1/bucket`).
- `setup_db_status()`: migrazione del Prompt 9 presente, numero di tabelle e tabelle **senza RLS forzata** (atteso 0), funzioni `SECURITY DEFINER` senza `search_path` (atteso 0), amministratori, tecnici, clienti, ambiente dichiarato.
- Ambiente: ogni database dichiara una volta `staging` o `production` (`declare_system_environment`); con `APP_ENVIRONMENT` impostato, le funzioni che scrivono (richieste, lead, checkout, conferme AI, notifiche) rispondono **503 `environment_mismatch`** se l'ambiente non coincide. Lo staging non può quindi scrivere sul database di produzione nemmeno con una variabile sbagliata.

Da verificare a mano dopo la creazione (voci in /admin/setup/): URL di redirect di Auth (dominio dello staging + `/area-cliente/`, `/admin/`, `/area-business/`, `/area-tecnico/`, `/tecnico/`), bucket di Storage.

**Registrazione e accesso:** l'accesso è senza password (link + codice via email, Supabase Auth OTP). Non esiste quindi un "recupero password": chi perde l'accesso richiede un nuovo codice. Con la funzionalità *Registrazione clienti* spenta, il browser chiede il codice con `create_user=false` e il database rifiuta la creazione di utenti non invitati (`handle_new_user`); gli account dello staff si creano con `invite_user`. Per bloccare anche le chiamate dirette all'API di Auth: Supabase → Authentication → Providers → Email → disattivare "Allow new users to sign up" finché la registrazione resta chiusa.

## 2. myPOS — /admin/impostazioni/pagamenti/

- Stato: ambiente (`sandbox`/`production`), variabili mancanti (solo i nomi), problemi (es. staging con ambiente live), URL di notifica da registrare nel pannello myPOS, rimborsi e verifica stato abilitati, funzionalità *myPOS* e *Acquisti online*.
- **Prova di connessione**: `IPCGetPaymentStatus` su un ordine di prova inesistente; superata **solo** se la risposta è firmata da myPOS e la firma è valida con il certificato configurato. Nessun addebito. L'esito (positivo o negativo) è registrato dal server in `integration_checks`.
- **Prova completa**: le 6 voci (ordine creato, checkout avviato, notifica firmata verificata, transazione registrata, contratto attivato, duplicato respinto) risultano superate solo se il database ha registrato quell'evento reale; più la dichiarazione motivata dell'amministratore.
- Produzione: bloccata dal codice senza `MYPOS_ALLOW_LIVE=true`; nello staging consentito solo `MYPOS_ENV=sandbox`. Senza la funzionalità *myPOS* attiva, `checkout-create` risponde 503 `payments_disabled` e i trigger su `orders`/`payments` rifiutano nuovi ordini.

## 3. Email transazionali

| Evento | Identificativo | Inviata da |
|---|---|---|
| Conferma richiesta | `request_created` | coda notifiche |
| Registrazione / accesso | — | **Supabase Auth** (modello "Magic link / OTP") |
| Recupero password | — | non applicabile (accesso senza password) |
| Preventivo | `quote_sent` | coda |
| Appuntamento | `intervention_scheduled`, `appointment_rescheduled` | coda |
| Rapporto | `report_available` | coda |
| Pagamento | `payment_confirmed`, `payment_failed`, `refund_processed` | coda |
| Abbonamento | `service_activated` | coda |
| Scadenza | `plan_expiring` | coda |

Coda (`notifications`): deduplica con `dedupe_key` univoca; presa in carico atomica (`notifications_claim`, `FOR UPDATE SKIP LOCKED`, reclamo dopo 15 minuti); esito con `notifications_record_result`: errore → nuovo tentativo dopo 5, 15, 45, 135 minuti; al 5° errore stato `dead`. Senza provider: stato `not_sent` (mai `sent`). Funzionalità *Notifiche automatiche* spenta: nulla viene inviato. Staging: con `RESEND_API_KEY` serve `NOTIFY_ALLOWED_DOMAINS`, altrimenti nessun invio. Le comunicazioni commerciali richiedono il consenso marketing.

**Email di prova** (/admin/setup/ → Email transazionali): inviata solo all'indirizzo dell'amministratore collegato, solo con provider configurato; l'esito restituito dal provider è registrato.

### Record DNS del mittente (da NON applicare senza autorizzazione)

Il dominio è su Aruba con MX `mx.prontointerventoroma.it`, SPF Aruba e DMARC `p=none` (rilevati il 18/11/2026). Per non toccare la posta esistente:
1. usare un **sottodominio** mittente dedicato, es. `notifiche.prontointerventoroma.it`;
2. aggiungere **solo** i record che il pannello Resend mostra per quel sottodominio (di norma: un record DKIM TXT `resend._domainkey.<sottodominio>`, un MX e un TXT SPF sul sottodominio di ritorno `send.<sottodominio>`), copiandoli esattamente come indicati;
3. **non** modificare MX, SPF e DMARC del dominio principale; il DMARC esistente (`p=none`) copre già il sottodominio in monitoraggio;
4. verificare in Resend → Domains, poi /admin/setup/ → "Record SPF/DKIM/DMARC del mittente" → Verificato con nota.

## 4. Google

- Search Console: proprietà già verificata via DNS sul dominio (record `google-site-verification` presente). Collegamento con service account in sola lettura (`GSC_SERVICE_ACCOUNT_JSON`). **Lo staging non va aggiunto né indicizzato.**
- Google Analytics 4: resta spento finché informativa privacy e cookie policy non sono validate (/admin/setup/ → legale). Con l'ID, GA4 si carica solo dopo il consenso.

## 5. Funzionalità (feature flag) — /admin/funzionalita/

13 interruttori nel database, **tutti spenti** in un database nuovo (in un database aggiornato da un prompt precedente restano accesi solo i moduli già in uso). Ogni interruttore è verificato lato server:

| Funzionalità | Controllo lato server |
|---|---|
| Registrazione clienti | `handle_new_user` rifiuta utenti non invitati |
| Login clienti | Area clienti/Business/checkout non mostrano l'accesso (interfaccia); i dati restano protetti da RLS |
| Family, Business, Hotel, Corporate, Lavoro Protetto | trigger su `orders`/`payments` per linea |
| Acquisti online (richiede myPOS) | trigger su `orders`/`payments`; Family e Lavoro Protetto la richiedono |
| myPOS | `checkout-create` 503, trigger |
| Dashboard tecnici | `my_technician_id()` restituisce nulla → nessun dato per il tecnico |
| PRONTO AI | `ai_runtime_gate` |
| PRONTO SEO | trigger su `seo_performance_snapshots`; agente SEO bloccato |
| Notifiche automatiche | `notifications-dispatch` non invia |

Spegnere una funzionalità richiesta da altre spegne anche quelle. Le pagine pubbliche si allineano alla build successiva (pulsante "Aggiorna il sito").
