# Netlify e GitHub — configurazione, staging e procedure

**Stato al 18/11/2026.** Da questa sessione non sono stati creati né modificati repository GitHub, progetti Netlify o domini: non c'erano credenziali né un'autorizzazione esplicita. Tutto è pronto per essere eseguito dal titolare, oppure da Claude dopo la sua conferma.

## 1. Configurazione verificata (`netlify.toml`)

| Voce | Valore | Verifica |
|---|---|---|
| Build | `npm run build` (nessuna dipendenza da installare per la build) | build locale OK in production, preview e development |
| Publish | `dist` | |
| Node | `NODE_VERSION = "22"`, `.nvmrc` = 22, `engines >=20` | build e test eseguiti con Node 22 |
| Funzioni | `netlify/functions`, `node_bundler = "esbuild"`, `included_files` per l'audit SEO | 26 funzioni (5 pianificate) impacchettate con **zip-it-and-ship-it**, lo strumento di Netlify: 0 errori, `seo-audit.json` incluso; bundle esbuild verificato separatamente |
| Edge function | `netlify/edge-functions/staging-auth.js` (path `/*`, esclude `/.netlify/functions/*`) | 5 test unitari; attiva solo con `STAGING_BASIC_AUTH` |
| Contesti | production → `SITE_ENV=production`; deploy-preview e branch-deploy → `SITE_ENV=preview` | anteprime sempre noindex |
| Header | CSP pubblica + CSP più restrittive per aree riservate e checkout; HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP; cache immutabile per gli asset versionati | verificati nel browser con il server locale che applica `netlify.toml` (`launch-check.py`) |
| Redirect | `dist/_redirects` generato (301 forzati per `/index.html`), nessun catch-all | |
| 404 | `dist/404.html` con stato 404 | |
| Pagine applicative | HTML statici per ogni percorso (`/area-cliente/`, `/admin/…`, `/tecnico/…`), navigazione interna con `#`: nessun fallback SPA necessario | |

## 2. Repository GitHub (Fase 11)

Controlli eseguiti sul repository locale:
- `git status` pulito;
- `.gitignore` copre `.env*`, `node_modules`, `dist`, `backups/`, `netlify/generated/`, `.seo-audit-build/`;
- nessun `.env`, chiave, dump o backup tracciato (controllo automatico in `npm test`);
- scansione dei segreti con detect-secrets su tutti i file e ricerca di schemi di chiavi nell'intera storia git: **nessun segreto reale**. Le 7 segnalazioni sono falsi positivi: alfabeto base32, hash d'esempio, valori di test;
- `npm audit`: 0 vulnerabilità (unica dipendenza: `pdf-lib`).

Branch locali predisposti:
- `develop` = stato attuale del lavoro, Prompt 0–8;
- `feature/*` = rami di lavoro, per esempio `feature/prompt-8-collaudo`;
- `main` esiste in locale ma è **fermo al Prompt 4** (`6b8d07f`) (nessun codice è stato ancora approvato) e si aggiorna (`git checkout main && git merge --ff-only develop`) solo dopo l'approvazione del titolare;
- i rami storici `sviluppo/prompt-N-*` restano come archivio.

Procedura di collegamento, **da eseguire solo dopo conferma esplicita**:
```bash
# 1) creare il repository PRIVATO (account o organizzazione dell'impresa)
gh repo create <account>/pronto-intervento-roma --private --description "Pronto Intervento Roma 2.0"
# 2) collegare e caricare solo i rami voluti
git remote add origin git@github.com:<account>/pronto-intervento-roma.git
git push -u origin develop
git checkout main && git merge --ff-only develop && git push -u origin main   # solo dopo l'approvazione del codice
# 3) protezioni consigliate: main protetto (pull request + test), niente force-push
gh api -X PUT repos/<account>/pronto-intervento-roma/branches/main/protection --input docs/branch-protection.json
```
`docs/branch-protection.json` contiene le regole consigliate.

## 3. Staging indipendente `pronto-intervento-roma-2` (Fase 12–13)

| Elemento | Staging | Perché |
|---|---|---|
| Progetto Netlify | **nuovo**, nome `pronto-intervento-roma-2`, URL `https://pronto-intervento-roma-2.netlify.app` | Separato dal sito in produzione |
| Branch | `develop` | |
| `APP_ENVIRONMENT` | `staging` (variabile del progetto) | Prompt 9: la build resta in anteprima anche nel contesto Production dello staging (netlify.toml imposta `SITE_ENV=production` per quel contesto che può prevalere sulle variabili del pannello); le funzioni rifiutano un database di produzione |
| Accesso | `STAGING_BASIC_AUTH=collaudo:<password lunga>` | Password su tutto il sito (gratuita, edge function); i webhook restano raggiungibili |
| Indicizzazione | impossibile | `noindex` + `X-Robots-Tag` + `Disallow` + password + guardia sull'URL. Non ci si affida solo a robots.txt |
| Supabase | **progetto di test** separato, con dati fittizi | Mai il database di produzione |
| myPOS | solo **sandbox** (`MYPOS_ENV=sandbox`, `MYPOS_ALLOW_LIVE=false`) | Nessun pagamento reale |
| Email | `NOTIFY_ALLOWED_DOMAINS` con il dominio delle caselle di prova | Nessuna email a clienti veri |
| PRONTO AI | chiave con budget minimo, oppure assente | |
| Google | nessuna credenziale | |
| Aree amministrative | login Supabase + RLS (come in produzione) + password dello staging | Doppia barriera |

Passi:
1. Netlify → *Add new site* → *Import from Git* → repository → branch `develop`. Nome: `pronto-intervento-roma-2`.
2. Impostare le variabili della colonna S di ENVIRONMENT_VARIABLES.md **prima** del primo deploy (prima di tutto `STAGING_BASIC_AUTH` e `APP_ENVIRONMENT=staging`).
3. Primo deploy. Verifiche:
   - `curl -sI https://pronto-intervento-roma-2.netlify.app/` → **401** con `WWW-Authenticate`;
   - con la password → 200 e `x-robots-tag: noindex, nofollow`.
4. Supabase di test: applicare le migrazioni (`supabase db push`) e i dati di prova (`npm run db:seed`); creare gli utenti di collaudo (admin, operatore, tecnico, cliente).
5. myPOS sandbox: impostare l'URL di notifica `https://pronto-intervento-roma-2.netlify.app/.netlify/functions/mypos-notify`. È esclusa dalla password e verifica la firma myPOS.
6. Eseguire gli scenari di REPORT_TEST.md §4 a mano sullo staging e annotare gli esiti.

**Blocco attuale.** Servono un account Netlify con permesso di creare progetti, un account GitHub, un progetto Supabase di test e le credenziali myPOS sandbox. Nessuno di questi è disponibile in questa sessione.

## 4. Produzione

Si usa il progetto Netlify esistente (scenario A): vedi DOMAIN_MIGRATION.md §4 per i passi esatti, ROLLBACK_PLAN.md per backup e rollback.
