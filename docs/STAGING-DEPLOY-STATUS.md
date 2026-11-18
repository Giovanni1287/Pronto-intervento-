# Stato del deployment di staging — Prompt 10

Aggiornato: 18/11/2026. Questo file registra **solo ciò che è stato verificato**. Le voci "da fare" diventano "fatto" solo dopo un controllo reale.

## 1. Stato effettivo

| Elemento | Stato | Verifica |
|---|---|---|
| Codice sorgente | ✅ ramo `develop`, commit verificato, nessuna modifica pendente | `git status` |
| Archivio ZIP del Prompt 9 | ✅ integro (`unzip -t`); estratto in una cartella pulita: `npm ci`, build e test superati | vedi §3 |
| Repository GitHub `pronto-intervento-roma` | ⏳ **non creato** | — |
| Progetto Netlify `pronto-intervento-roma-2` | ⏳ **non creato** | — |
| URL di anteprima | — (nessuno finché il progetto non esiste) | — |
| Supabase, myPOS, email, Google, AI | ⏳ non collegati (prima anteprima senza backend) | — |

## 2. Prima anteprima: configurazione minima

La prima anteprima è **solo il sito**, senza backend:
- le aree riservate mostrano "non ancora attiva";
- i moduli invitano a telefonare;
- nessun acquisto è possibile;
- le funzioni server rispondono 503 "non configurato".

Variabili da impostare in Netlify **prima del primo deploy**. Scope: *All scopes*, oppure almeno *Builds* + *Functions*; servono anche all'edge function.

| Variabile | Valore | Perché |
|---|---|---|
| `APP_ENVIRONMENT` | `staging` | Build sempre in anteprima: noindex, banner, prezzi in bozza. Le funzioni rifiutano un database di produzione |
| `STAGING_BASIC_AUTH` | `collaudo:<password di almeno 12 caratteri, generata dal titolare>` | Password su tutto il sito. **Senza questa variabile lo staging resta chiuso con un errore 503**: correzione del Prompt 10, così non può mai restare aperto per dimenticanza |

**Da NON impostare:**
- `ALLOW_INDEXING`;
- `PUBLIC_GA4_MEASUREMENT_ID`;
- `MYPOS_*`;
- `SUPABASE_*` di produzione;
- `RESEND_API_KEY`, se manca `NOTIFY_ALLOWED_DOMAINS`.

Le impostazioni di build (comando, cartella di pubblicazione, Node, funzioni) vengono da `netlify.toml`:

| Impostazione | Valore | Fonte |
|---|---|---|
| Comando di build | `npm run build` | `netlify.toml` [build] |
| Cartella di pubblicazione | `dist` | `netlify.toml` [build]; generata da `scripts/build.js` |
| Node | 22 | `netlify.toml` `NODE_VERSION`, `.nvmrc` |
| Funzioni | `netlify/functions` (30, bundler esbuild) | `netlify.toml` [functions] |
| Edge function | `netlify/edge-functions/staging-auth.js` (tutto il sito escluso `/.netlify/functions/*`) | `netlify.toml` |
| Redirect | `dist/_redirects`: `/index.html`, `/index.htm`, `/servizi/index.html` → 301; nessun redirect generico verso la home | build |
| Intestazioni | `netlify.toml` [[headers]] (CSP, HSTS, X-Frame-Options, noindex sulle aree riservate) + `dist/_headers` (noindex su tutto il sito in anteprima) | build |
| Gestore pacchetti | npm (`package-lock.json`); unica dipendenza di runtime: `pdf-lib` | — |

## 3. Verifiche locali eseguite (Prompt 10)

| Controllo | Esito |
|---|---|
| Archivio integro, estrazione, struttura (`package.json`, `netlify.toml`, `src/`, `netlify/functions/`, `supabase/migrations/`, `README.md`) | ✅ |
| `npm ci` dal lockfile, `npm audit` | ✅ 0 vulnerabilità |
| Build di produzione | ✅ 37 pagine pubbliche, audit SEO 0 errori, non indicizzabile |
| Build con `APP_ENVIRONMENT=staging` | ✅ forzata in anteprima |
| `npm test` (sull'archivio estratto) | ✅ 181/181 |
| `npm run test:unit` | ✅ 161/161 (incluso il nuovo test di chiusura dello staging) |
| Impacchettamento delle 30 funzioni (zip-it-and-ship-it) | ✅ 0 avvisi (Prompt 9) |
| File da non caricare (`.env`, chiavi, dump, backup, ZIP, `node_modules`, `dist`) | ✅ nessuno tracciato; `.gitignore` corretto |
| Segreti (detect-secrets + storia git) | ✅ nessun segreto (7 falsi positivi già noti: valori di test) |
| Dati personali | ✅ solo indirizzi di prova (`@test.local`, `example.test`). Unico recapito reale: il numero pubblico del sito attuale, citato nei documenti come "da confermare" |

## 4. Netlify Functions

Senza Supabase configurato, ogni funzione risponde **503** (`NOT CONFIGURED` / `not_configured`) e non esegue nulla. È lo stato atteso della prima anteprima.

**Verificato in locale (Prompt 10)**: tutte e 30 le funzioni sono state chiamate in GET e in POST senza variabili. Risultato:
- nessun errore 500;
- 503 se manca la configurazione;
- 405 se il metodo non è previsto;
- 403 per `conversion-event` chiamata da un'origine diversa dal sito.

| Funzione | Percorso | Autenticazione | Variabili necessarie | Stato atteso nella prima anteprima |
|---|---|---|---|---|
| request-create | `/.netlify/functions/request-create` | pubblica, con limite di frequenza | SUPABASE_*, AI_HASH_SALT | 503 |
| lead-create | `…/lead-create` | pubblica, con limite di frequenza | SUPABASE_*, AI_HASH_SALT | 503 |
| certificate-verify | `…/certificate-verify` | pubblica (dati minimi) | SUPABASE_* | 503 |
| report-verify | `…/report-verify` | pubblica (dati minimi) | SUPABASE_* | 503 |
| conversion-event | `…/conversion-event` | pubblica (solo eventi anonimi, origine controllata) | SUPABASE_* | 403 se l'origine non è il sito, altrimenti 503 |
| ai-chat, ai-status | `…/ai-chat`, `…/ai-status` | pubblica / token | SUPABASE_*, AI_* | 503 (AI spento) |
| ai-confirm | `…/ai-confirm` | token del visitatore | SUPABASE_*, AI_* | 503 |
| checkout-create, order-create, order-summary, payment-status, payment-receipt | `…/checkout-create` ecc. | utente Supabase | SUPABASE_*, MYPOS_* | 503 |
| mypos-notify | `…/mypos-notify` | firma myPOS | SUPABASE_*, MYPOS_* | 503 |
| certificate-pdf, report-pdf, quote-pdf | `…/report-pdf` ecc. | utente Supabase | SUPABASE_* | 503 |
| payments-admin | `…/payments-admin` | amministratore | SUPABASE_*, MYPOS_* | 503 |
| setup-status, mypos-status, email-test, site-rebuild | `…/setup-status` ecc. | amministratore | SUPABASE_*, (MYPOS_*, RESEND_*, NETLIFY_BUILD_HOOK_URL) | 503 |
| seo-admin, seo-oauth | `…/seo-admin`, `…/seo-oauth` | amministratore | SUPABASE_*, GSC_* / GOOGLE_OAUTH_*, SEO_TOKEN_KEY | 503 |
| seo-deploy-hook | `…/seo-deploy-hook` | firma JWS di Netlify | NETLIFY_WEBHOOK_SECRET, SUPABASE_* | 503 / 401 |
| notifications-dispatch | pianificata ogni 15 min | interna | SUPABASE_*, RESEND_* | 503, nessun invio |
| expirations | pianificata ogni giorno | interna | SUPABASE_* | 503 |
| ai-automations | pianificata ogni ora | interna | SUPABASE_*, AI_* | 503 |
| seo-monitor, seo-sync | pianificate alle 04:50 e alle 04:20 UTC | interne | SUPABASE_*, GSC_* | 503 |

Dopo il primo deploy si verifica davvero, con l'URL reale:
- `request-create` con POST risponde 503 e non 500;
- `setup-status` con GET risponde 503 senza backend;
- la pagina di un'area riservata mostra "non ancora attiva".

## 5. Checklist di attivazione dei sistemi esterni (nessuno si attiva da solo)

**Supabase (progetto di test)**
- Progetto UE dedicato.
- Variabili `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `supabase db push` (25 migrazioni), poi `declare_system_environment('staging')`.
- Auth: Site URL e Redirect URL dello staging; registrazione libera disattivata.
- RLS: verifica in `/admin/setup/`, dove le tabelle senza RLS forzata devono essere 0.
- Procedura completa: `NETLIFY-STAGING-GUIDE.md` §2.

**myPOS**
- Credenziali sandbox (`MYPOS_SID`, `MYPOS_WALLET`, `MYPOS_PRIVATE_KEY`, `MYPOS_PUBLIC_CERT`), con `MYPOS_ENV=sandbox` e `MYPOS_ALLOW_LIVE=false`.
- Callback: `https://<staging>/.netlify/functions/mypos-notify`.
- Prova di connessione e prova completa in `/admin/impostazioni/pagamenti/`.
- Verifica delle transazioni nel pannello myPOS.

**Google**
- Search Console: la proprietà del dominio esiste già (verificata via DNS). Lo staging **non** si aggiunge.
- Sitemap: si invia solo dopo il lancio.
- GA4: solo dopo che la cookie policy è stata validata, e comunque con il consenso dell'utente.

**Email**
- Provider Resend.
- Mittente su un sottodominio, es. `notifiche.prontointerventoroma.it`.
- DNS: solo i record del sottodominio, previa autorizzazione.
- `NOTIFY_ALLOWED_DOMAINS` in staging.
- Email di prova da `/admin/setup/`.

**PRONTO AI**
- Provider e modello verificati.
- `AI_API_KEY` solo come variabile del server.
- Budget mensile e limiti in `/admin/pronto-ai/`.
- Funzionalità *PRONTO AI* accesa solo dopo il test dell'assistente.
