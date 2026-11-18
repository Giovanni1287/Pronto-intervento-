# Checklist di sicurezza — revisione del Prompt 8 (18/11/2026)

Legenda: ✅ verificato con un test o un controllo eseguito · 🔧 corretto in questo prompt · ⏳ richiede configurazione o verifica esterna.

## 1. Vulnerabilità e debolezze trovate, con le correzioni

| # | Problema | Gravità | Correzione | Prova |
|---|---|---|---|---|
| 1 | I ruoli API (`anon`, `authenticated`) avevano TRUNCATE, TRIGGER e REFERENCES sulle tabelle create con i privilegi predefiniti e sulla vista `entitlement_balances`. TRUNCATE **non è soggetto alla RLS**. Via PostgREST non è utilizzabile, ma è un privilegio superfluo | Media (difesa in profondità) | 🔧 Revocati su tutte le tabelle e viste, anche future; revocate le scritture sulla vista `entitlement_balances` (`20261118180000`) | `70_scenarios.sql`: 0 privilegi residui |
| 2 | Pagine pubbliche **senza Content-Security-Policy** (c'era solo sulle aree riservate) | Media | 🔧 CSP su `/*`: niente script inline, Google ammesso solo per GA4 dopo il consenso, `frame-ancestors 'none'`, `object-src 'none'`, `upgrade-insecure-requests`; aggiunti COOP e Permissions-Policy più completa | `launch-check.py`: script inline iniettato **bloccato**, `fetch` verso un dominio non autorizzato **bloccato**, 0 violazioni sulle pagine legittime con 8 dispositivi |
| 3 | Moduli pubblici senza limite per connessione: c'era solo il limite per telefono o email, aggirabile cambiando numero | Media (spam o saturazione della centrale) | 🔧 `rate_limit_hit` (impronta IP salata, solo service role), 10 richieste/ora per connessione su richieste e lead. Se il contatore non risponde la richiesta passa comunque (nessuna richiesta persa) | Unit: 429 oltre il limite, IP mai in chiaro, fail-open; DB: limite e permessi |
| 4 | Staging non protetto: un'anteprima pubblica sarebbe stata accessibile e, con una variabile sbagliata, indicizzabile | Alta per lo staging | 🔧 Edge function `staging-auth` (HTTP Basic con confronto a tempo costante, webhook esclusi, 503 con password debole); guardia di indicizzazione su `URL` = dominio ufficiale | 7 unit test (`launch.test.js`) |
| 5 | Link inseriti in amministrazione (scheda Google, sito da controllare) accettavano qualsiasi schema, `javascript:` compreso | Bassa (solo amministratore; la CSP blocca comunque `javascript:`) | 🔧 Vincoli `https://` nel database; `h()` scarta `javascript:`, `vbscript:` e `data:` non immagine in href/src/action | `70_scenarios.sql` |
| 6 | In staging le notifiche potevano partire verso indirizzi reali se si configurava un provider email | Media | 🔧 `NOTIFY_ALLOWED_DOMAINS`: fuori dai domini di prova nessun invio | Unit |
| 7 | Upload: limite di 8 MB e tipi di file controllati solo nel browser | Media | 🔧 Limite di 10 MB e tipi ammessi (immagini, PDF) sui bucket Storage `interventi` e `tecnici` | ⏳ Verificabile solo su Supabase reale: lo schema `storage` non esiste in locale |
| 8 | Chiavi esterne senza indice: scansioni complete nelle verifiche RLS (es. `contracts.customer_id`) e possibile lentezza sotto carico | Bassa | 🔧 Indici sulle chiavi esterne usate da RLS, join e filtri | Suite DB completa invariata |
| 9 | Difetto funzionale con effetto sulla sicurezza operativa: `report_missing_fields` e `coverage_check` andavano in errore ("malformed array literal") appena mancava un dato | Media (bloccava il flusso tecnico) | 🔧 `20261118180100`: uso di `array_append` | Scenario S1 in `70_scenarios.sql` (prima falliva) |

## 2. Controlli superati senza modifiche

| Area | Esito | Come |
|---|---|---|
| Credenziali esposte | ✅ | detect-secrets su tutti i file e ricerca di schemi di chiavi (Anthropic, AWS, GitHub, JWT, chiavi private, Resend, Supabase) nell'intera storia git: nessun segreto. `npm test` impedisce di tracciare `.env`, chiavi, dump e backup |
| Variabili d'ambiente | ✅ | Segreti solo lato server; `PUBLIC_*` senza segreti; `.env.example` con valori vuoti o predefiniti sicuri (ENVIRONMENT_VARIABLES.md) |
| Dipendenze | ✅ | `npm audit`: 0 vulnerabilità (`pdf-lib` è l'unica dipendenza) |
| RLS | ✅ | Tutte le 115 tabelle `public` con RLS attiva e **forzata**; tutte le funzioni SECURITY DEFINER con `search_path` fisso (test in `70_scenarios.sql`) |
| Isolamento dei clienti | ✅ | Cliente A non vede contratti, prestazioni, documenti o interventi del cliente B (`10_security`, `70_scenarios`) |
| Prestazioni residue | ✅ | Non modificabili dal frontend: UPDATE sui diritti ignorato dalla RLS, vista non scrivibile, nessun "consumo negativo", `consume_entitlement` riservata (`70_scenarios`) |
| Pagamenti | ✅ | Importi solo dal database, notifica myPOS con firma RSA verificata, idempotenza, importo o valuta errati rifiutati, contratto attivato solo dopo la verifica server; il browser non può segnare un ordine come pagato (`30_payments`, `70_scenarios`, unit) |
| XSS | ✅ | Interfacce costruite con DOM e `textContent` (nessun `innerHTML` nel codice delle aree riservate); HTML statico con escape; CSP |
| CSRF | ✅ non applicabile | Le API autenticate usano il token Bearer nell'intestazione, non cookie. I moduli pubblici non hanno sessione; `conversion-event` accetta solo la stessa origine |
| Validazione degli input | ✅ | Validazione nelle funzioni (lunghezze, formati, privacy) e di nuovo nel database (vincoli e controlli nelle RPC) |
| Accesso ai documenti | ✅ | PDF e documenti solo al titolare o a chi ha un token firmato; verifica pubblica con il solo numero e l'impronta, senza dati personali |
| Webhook | ✅ | myPOS: firma RSA con il certificato myPOS; Netlify: JWS HS256 con `NETLIFY_WEBHOOK_SECRET`. Esclusi dalla password dello staging |
| Log | ✅ | Solo 2 `console.log` nelle funzioni (esito e numero d'ordine), nessun token, dato di carta o dato personale; l'audit log del database non contiene password o dati di carta (test) |
| Dati personali | ✅ | Nessun dato reale nei test (account `@test.local` ed `example.test`); nessun dato personale verso GA4 o nell'attribuzione; IP solo come impronta salata |
| Separazione degli ambienti | ✅ | Staging mai indicizzabile; myPOS live bloccato senza `MYPOS_ALLOW_LIVE`; email limitate in staging |
| AI | ✅ | Prompt injection, permessi, budget, conferma esplicita, nessuna azione economica autonoma (`50_ai.sql`, `ai.test.js`, `ai-check.py`) |

## 3. Restano da fare fuori da questo repository (⏳)

- [ ] Supabase di produzione: verificare dopo il `db push` le RLS, i limiti dei bucket Storage e la disattivazione delle iscrizioni non volute (Auth → Providers). Abilitare il CAPTCHA di Supabase Auth se compare spam di registrazioni.
- [ ] Rotazione delle chiavi: chiavi diverse per staging e produzione; nessuna chiave condivisa via chat o email.
- [ ] Account Netlify, GitHub e Supabase con autenticazione a due fattori per il titolare.
- [ ] myPOS: collaudo reale in sandbox della firma delle notifiche con le credenziali di test.
- [ ] Informativa privacy, cookie policy e condizioni: validazione legale (pagine ancora segnaposto `noindex`).
- [ ] Penetration test esterno prima di aprire vendite e area clienti al pubblico (consigliato).
