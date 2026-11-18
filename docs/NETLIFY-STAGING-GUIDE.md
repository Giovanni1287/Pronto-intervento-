# Guida allo staging su Netlify — `pronto-intervento-roma-2`

Prompt 9 · 18/11/2026. Lo staging **non è stato creato**: in questa sessione non c'è accesso a Netlify, GitHub, Supabase o myPOS e non è
stata data autorizzazione a pubblicare. Questa guida elenca i passi esatti, nell'ordine, per chi ha quegli accessi.

Obiettivo dello staging: collaudo online completo **senza** pagamenti reali, **senza** database di produzione, **senza** email a clienti
veri, con aree riservate protette e **nessuna indicizzazione**. Lo staging non deve poter modificare la produzione.

## 0. Prerequisiti

- Repository GitHub privato con il ramo `develop` (vedi §1). Il ramo `develop` contiene il lavoro dei Prompt 0–9.
- Account Netlify del titolare (o dell'organizzazione) con permesso di creare progetti.
- **Non** usare né modificare il progetto Netlify esistente `delfino-soffice-ca8830` (sito attuale), né i progetti Supabase di Romeo H24 o altri.

## 1. GitHub (dopo autorizzazione esplicita al push)

```bash
cd pronto-intervento-roma
git checkout develop && git merge --ff-only feature/prompt-9-attivazione   # già fatto in locale
gh repo create <account>/pronto-intervento-roma --private --description "Pronto Intervento Roma 2.0"
git remote add origin git@github.com:<account>/pronto-intervento-roma.git
git push -u origin develop
# main SOLO dopo l'approvazione del codice da parte del titolare:
# git checkout main && git merge --ff-only develop && git push -u origin main
gh api -X PUT repos/<account>/pronto-intervento-roma/branches/main/protection --input docs/branch-protection.json
```

## 2. Supabase di staging (progetto indipendente)

1. supabase.com → *New project* → nome `pronto-intervento-roma-staging`, regione **UE** (es. Frankfurt), password del database generata e conservata nel gestore di password del titolare.
2. In locale (Supabase CLI): `supabase link --project-ref <ref-staging>` → `supabase db push` (applica le 25 migrazioni, incluse RLS, funzioni e bucket di Storage).
3. Dichiarare l'ambiente **una sola volta** (SQL editor, come amministratore del progetto): `select public.declare_system_environment('staging');`
4. Catalogo: `supabase/seed.sql` (rigenerabile con `npm run db:seed`) carica servizi, categorie e listini dal codice, con i piani **non approvati** (titolare e legale da confermare) e la vendita spenta; eseguirlo dall'SQL editor. Nessun dato personale.
5. Authentication → URL configuration: *Site URL* = `https://pronto-intervento-roma-2.netlify.app`; *Redirect URLs* = lo stesso dominio con `/area-cliente/`, `/area-business/`, `/area-tecnico/`, `/tecnico/`, `/admin/**`.
6. Authentication → Providers → Email: **disattivare "Allow new users to sign up"** finché la registrazione clienti resta chiusa; utenti di collaudo creati con *Invite user* (admin, operatore, tecnico, cliente con caselle di prova). Promuovere l'amministratore: `update public.profiles set role = 'admin' where email = '<casella-di-prova>';`
7. Authentication → Emails → SMTP: per lo staging basta l'SMTP di Supabase (limiti bassi); in produzione serve un SMTP proprio.
8. Settings → API: copiare URL, chiave `anon` e chiave `service_role` **direttamente** nelle variabili di Netlify (§3). Non incollarle altrove.

## 3. Progetto Netlify

1. Netlify → *Add new project* → *Import an existing project* → GitHub → repository → ramo di produzione del progetto: **`develop`**. Nome: `pronto-intervento-roma-2`.
2. **Prima del primo deploy**, Project configuration → Environment variables (scope: Builds + Functions):

| Variabile | Valore |
|---|---|
| `APP_ENVIRONMENT` | `staging` (la build resta in anteprima anche nel contesto Production; le funzioni rifiutano un database non di staging) |
| `STAGING_BASIC_AUTH` | `collaudo:<password lunga generata>` |
| `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` | progetto di **staging** |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | progetto di **staging** (segreto) |
| `SITE_URL` | `https://pronto-intervento-roma-2.netlify.app` |
| `MYPOS_ENV` | `sandbox` |
| `MYPOS_ALLOW_LIVE` | `false` |
| `MYPOS_SID`, `MYPOS_WALLET`, `MYPOS_PRIVATE_KEY`, `MYPOS_PUBLIC_CERT` | credenziali **sandbox** (segreto) |
| `RESEND_API_KEY`, `NOTIFY_FROM` | facoltative |
| `NOTIFY_ALLOWED_DOMAINS` | **obbligatoria** se c'è `RESEND_API_KEY`: dominio delle caselle di prova |
| `NETLIFY_BUILD_HOOK_URL` | build hook del progetto di staging (Build & deploy → Build hooks) |
| `AI_*` | assenti, oppure chiave con budget minimo se autorizzato |
| `ALLOW_INDEXING`, `PUBLIC_GA4_MEASUREMENT_ID`, `GSC_*` | **non impostare** |

3. Primo deploy. La build legge dal database le funzionalità attive, i dati aziendali verificati e i listini: con un database nuovo tutte le funzionalità sono **spente**.

## 4. Verifiche dopo il primo deploy (annotare l'esito in /admin/setup/ → Test finali)

```bash
curl -sI https://pronto-intervento-roma-2.netlify.app/ | head -3          # atteso: 401 + WWW-Authenticate
curl -sI -u collaudo:<password> https://pronto-intervento-roma-2.netlify.app/ | grep -i x-robots   # atteso: noindex, nofollow
curl -s  -u collaudo:<password> https://pronto-intervento-roma-2.netlify.app/robots.txt           # atteso: Disallow: /
curl -s -X POST https://pronto-intervento-roma-2.netlify.app/.netlify/functions/setup-status       # atteso: 405 (solo GET) — e GET senza token: 403
```
- `/admin/setup/` con l'account amministratore: Supabase "Verificato" (chiavi del progetto giusto, Auth e Storage raggiungibili, migrazione presente, 0 tabelle senza RLS forzata, ambiente `staging`).
- `/admin/impostazioni/pagamenti/` → *Esegui la prova di connessione*: deve risultare verificata solo con le credenziali sandbox corrette.
- `/admin/funzionalita/`: accendere nell'ordine *myPOS* → *Acquisti online* → *PRONTO+ Family* → poi *Aggiorna il sito pubblico*.
- Acquisto di prova Family con carta di test myPOS sandbox → /admin/impostazioni/pagamenti/: le 6 voci della prova completa diventano verdi solo se gli eventi sono stati registrati. Ripetere la notifica dal pannello myPOS: il duplicato deve risultare respinto.
- Email di prova (/admin/setup/) verso una casella del dominio consentito.
- Scenari manuali di `docs/REPORT_TEST.md` §4 (richiesta → assegnazione → rapporto → PDF), accesso con ruoli diversi, tentativi di accesso non autorizzato.

## 5. Sicurezza dello staging (perché non può toccare la produzione)

| Rischio | Barriera |
|---|---|
| Indicizzazione | build in anteprima (noindex in pagina) + `X-Robots-Tag` + `robots.txt Disallow` + password + guardia sull'URL (indicizzabile solo su prontointerventoroma.it) |
| Database di produzione | chiavi di un progetto diverso; `APP_ENVIRONMENT=staging` + `system_environment()='staging'` obbligatori per scrivere; chiavi diverse per ambiente |
| Pagamenti reali | `MYPOS_ENV=sandbox` obbligatorio in staging (altrimenti myPOS "non pronto"); live bloccato senza `MYPOS_ALLOW_LIVE` |
| Email a clienti veri | `NOTIFY_ALLOWED_DOMAINS` obbligatoria; senza, nessun invio |
| Aree riservate | password dello staging + login Supabase + RLS + ruoli nel database |
| Segreti nel browser | solo `PUBLIC_*` nella build; controllo automatico in `npm test` e scansione segreti |
| Documenti privati | bucket privati (`interventi`, `tecnici`, `azienda-riservato`), PDF solo tramite funzioni con token |
| Endpoint amministrativi | `setup-status`, `mypos-status`, `email-test`, `site-rebuild`, `payments-admin`… verificano il ruolo admin nel database |

## 6. Disattivare o eliminare lo staging

Netlify → progetto `pronto-intervento-roma-2` → *Stop builds* oppure *Delete project*; Supabase → *Pause project*. Non ha effetti sul sito attuale.
