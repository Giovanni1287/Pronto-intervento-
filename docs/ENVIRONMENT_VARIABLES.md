# Variabili d'ambiente — PRONTO INTERVENTO ROMA 2.0

Elenco ricavato dal codice il 18/11/2026 (ricerca di `env.*` in `netlify/`, `src/`, `scripts/build.js`).
Regole: **i segreti si impostano solo nel pannello Netlify** (Site configuration → Environment variables), mai nel
repository né nel codice del browser. Le variabili `PUBLIC_*` finiscono nell'HTML/JS generato: non devono mai contenere segreti.
Ogni variabile va impostata **per contesto** (Production / Deploy previews / Branch deploys) e **per progetto** (staging ≠ produzione).

Legenda contesto: **S** = staging (`pronto-intervento-roma-2`), **P** = produzione (progetto che serve prontointerventoroma.it).

## Build e indicizzazione

| Variabile | Tipo | S | P | Note |
|---|---|---|---|---|
| `SITE_ENV` | build | (da netlify.toml; forzato a `preview` da `APP_ENVIRONMENT=staging`) | `production` (da netlify.toml) | `preview`: banner anteprima e noindex. Le anteprime di Netlify sono sempre `preview` |
| `ALLOW_INDEXING` | build | **mai** | `true` solo al lancio | Terza condizione: anche con `true` la build è indicizzabile solo se `URL` = https://prontointerventoroma.it |
| `URL` | Netlify (automatica) | — | — | URL principale del progetto; usata dalla guardia di indicizzazione |
| `STAGING_BASIC_AUTH` | segreto | `utente:password` (≥ 12 caratteri) | **non impostare** | Attiva la protezione HTTP Basic dell'edge function `staging-auth` |
| `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` | pubbliche | progetto Supabase di **test** | progetto di produzione | Chiave anon: pubblica per definizione, protetta dalla RLS |
| `PUBLIC_GA4_MEASUREMENT_ID` | pubblica | vuota | solo dopo validazione legale | Senza: nessun banner, nessun Google Analytics |
| `PUBLIC_AI_WIDGET` | pubblica | `true` per collaudo | `false` finché PRONTO AI non è attivo | Mostra il pulsante dell'assistente |
| `BUILD_OUT_DIR`, `SEO_SIMULATE_INDEXABLE` | solo locale | — | — | Audit SEO simulato (`npm run seo:audit`), mai su Netlify |

## Backend (Netlify Functions)

| Variabile | Tipo | S | P | Note |
|---|---|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | server | test | produzione | |
| `SUPABASE_SERVICE_ROLE_KEY` | **segreto** | test | produzione | Mai nel browser; staging e produzione con chiavi **diverse** |
| `SITE_URL` | server | URL dello staging | https://prontointerventoroma.it | Link nelle email e nei PDF |
| `NOTIFY_FROM`, `RESEND_API_KEY` | segreto | facoltative | quando il mittente è verificato | Senza: le notifiche restano "non inviate" |
| `NOTIFY_ALLOWED_DOMAINS` | server | **obbligatoria se c'è RESEND** (es. dominio delle caselle di prova) | **non impostare** | In staging blocca ogni email verso indirizzi fuori da questi domini |
| `RATE_LIMIT_REQUESTS_PER_HOUR`, `RATE_LIMIT_LEADS_PER_HOUR` | server | facoltative (10) | facoltative (10) | Limite per connessione dei moduli pubblici |
| `APP_ENVIRONMENT` | server | `staging` | `production` | Prompt 9: le funzioni che scrivono confrontano questo valore con l'ambiente dichiarato dal database (`declare_system_environment`) e rispondono 503 `environment_mismatch` se diversi |
| `NETLIFY_BUILD_HOOK_URL` | segreto | build hook dello staging | build hook della produzione | Pulsante "Aggiorna il sito" (dati aziendali, listini, funzionalità). Accettato solo se inizia con `https://api.netlify.com/build_hooks/` |
| `AI_HASH_SALT` | segreto | casuale | casuale diverso | Sale delle impronte IP (PRONTO AI e limiti) |

## Pagamenti myPOS

| Variabile | S | P | Note |
|---|---|---|---|
| `MYPOS_ENV` | `sandbox` | `sandbox` fino all'autorizzazione, poi `production` | |
| `MYPOS_ALLOW_LIVE` | `false` | `true` **solo** con autorizzazione scritta del titolare | Senza, l'ambiente live è bloccato dal codice |
| `MYPOS_SID`, `MYPOS_WALLET`, `MYPOS_KEY_INDEX`, `MYPOS_PRIVATE_KEY`, `MYPOS_PUBLIC_CERT` | credenziali **sandbox** | credenziali live | Segreti; il certificato pubblico myPOS serve a verificare le notifiche |
| `MYPOS_CHECKOUT_URL`, `MYPOS_LANGUAGE`, `MYPOS_STORE_ID`, `MYPOS_STORE_PASSWORD` | sandbox | live | Vedi docs/PAGAMENTI-MYPOS.md |
| `MYPOS_STATUS_QUERY_ENABLED`, `MYPOS_TRUST_STATUS_QUERY`, `MYPOS_REFUNDS_ENABLED` | default sicuri | da abilitare dopo collaudo sandbox | |

## PRONTO AI

| Variabile | S | P | Note |
|---|---|---|---|
| `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL` | chiave con budget basso | chiave di produzione | Segreto; senza chiave PRONTO AI risponde "non configurato" |
| `AI_ENABLED` | facoltativa | `false` = spegnimento d'emergenza | Interruttore anche nel database (`ai_settings`) |

## PRONTO SEO e Google

| Variabile | S | P | Note |
|---|---|---|---|
| `GSC_SERVICE_ACCOUNT_JSON` | — | segreto | Oppure OAuth: |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `SEO_TOKEN_KEY` | — | segreti | `SEO_TOKEN_KEY` = 32 byte base64 |
| `GA4_MEASUREMENT_ID` | — | come `PUBLIC_GA4_MEASUREMENT_ID` | Solo per lo stato in dashboard |
| `GBP_API_ENABLED` | `false` | `true` solo dopo l'approvazione Google | |
| `NETLIFY_WEBHOOK_SECRET` | facoltativa | segreto | Allarme sulle build fallite |

## Separazione degli ambienti (verificata nel codice)

- Lo staging non può diventare indicizzabile (guardia su `URL`), anche con variabili sbagliate.
- myPOS live è bloccato senza `MYPOS_ALLOW_LIVE=true`; in sandbox il checkout rifiuta il dominio ufficiale (test unitario).
- Email in staging limitate a `NOTIFY_ALLOWED_DOMAINS`.
- Staging e produzione devono usare **progetti Supabase diversi**: nessuna variabile permette di condividerli in sicurezza.
