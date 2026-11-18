# Configurazione del backend (da eseguire dopo l'autorizzazione)

> Il progetto **non è collegato** ad alcun progetto Supabase, account myPOS o provider email. Finché non si completano questi passaggi:
> - l'area cliente, l'area Business, la dashboard, la centrale operativa, il calendario e l'area tecnico mostrano "non ancora attiva";
> - i moduli lead B2B (hotel, aziende, condomini, corporate) hanno l'invio disattivato;
> - le funzioni rispondono 503;
> - nessun pagamento è possibile.

## 1. Supabase
1. Creare un progetto, preferibilmente in una regione UE.
2. Applicare le migrazioni in ordine, con la Supabase CLI (`supabase link` e poi `supabase db push`) oppure dall'editor SQL:
   - `supabase/migrations/20261117120000_core_schema.sql`
   - `supabase/migrations/20261117120100_logic_and_guards.sql`
   - `supabase/migrations/20261117120200_rls_and_grants.sql`
   - `supabase/migrations/20261117120300_auth_and_storage.sql`
   - `supabase/migrations/20261117130000_business_schema.sql` (B2B, Prompt 3: estende senza eliminare)
   - `supabase/migrations/20261117130100_business_logic.sql`
   - `supabase/migrations/20261117130200_business_rls.sql`
   - `supabase/migrations/20261117140000_payments_schema.sql` (pagamenti, Prompt 4: ricostruisce gli ordini dei pagamenti esistenti senza cancellare nulla)
   - `supabase/migrations/20261117140100_payments_logic.sql`
   - `supabase/migrations/20261117140200_payments_rls.sql`
   - `supabase/migrations/20261117150000_operations_schema.sql` (centrale operativa, Prompt 5: estende `interventions`, `technicians`, `technician_assignments`, `intervention_reports`, `documents`, `notifications`; deriva i nuovi campi dai dati esistenti senza cancellare nulla)
   - `supabase/migrations/20261117150100_operations_logic.sql`
   - `supabase/migrations/20261117150110_operations_work_and_economics.sql`
   - `supabase/migrations/20261117150200_operations_rls.sql`
3. Eseguire `supabase/seed.sql`, rigenerabile con `npm run db:seed`.
4. **Non** eseguire `supabase/tests/00_local_supabase_shim.sql`: serve solo ai test locali.
5. Auth → Email:
   - abilitare l'accesso con link e codice OTP;
   - impostare come URL di reindirizzamento consentiti `https://<anteprima>/area-cliente/`, `https://<anteprima>/area-business/`, `https://<anteprima>/checkout/`, `https://<anteprima>/admin/`, `https://<anteprima>/admin/centrale-operativa/` e `https://<anteprima>/tecnico/`;
   - personalizzare il modello email includendo il codice `{{ .Token }}`.
6. Primo amministratore: dopo il suo primo accesso, eseguire nell'editor SQL
   `update public.profiles set role = 'admin' where email = '<email del titolare>';`
7. Tecnici: invitare l'account da Supabase Auth, poi `/admin/tecnici/` → "Nuovo tecnico" (assegna il ruolo, specializzazioni, zone, disponibilità). L'area tecnico è `/tecnico/` (aggiungere l'URL di reindirizzamento `https://<anteprima>/tecnico/`).
   Operatori di centrale (facoltativi): `update public.profiles set role = 'operator' where email = '<email>';` — permessi in `public.role_permissions` (vedi `docs/CENTRALE-OPERATIVA.md` §3).
   Requisiti professionali obbligatori per specializzazione: solo quelli confermati dal titolare, con `select public.set_qualification_requirement('<specializzazione>', '<codice>', '<descrizione>');`.
8. Clienti B2B (dashboard → Clienti B2B e sedi): creare l'azienda, le sedi e, dopo il primo accesso del referente all'area Business, associarlo con il ruolo corretto. L'amministratore aziendale può poi aggiungere da sé gli altri referenti.
9. Dashboard → Impostazioni: inserire ragione sociale, P.IVA, sede legale e PEC dell'impresa e spuntare "Dati verificati" (senza, i preventivi PDF portano la filigrana BOZZA); impostare la soglia di margine e, solo se desiderato, la regola di blocco.

## 2. Netlify (sito di anteprima, non il dominio ufficiale)
Impostare le variabili elencate in `.env.example`:
- `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_ANON_KEY`: valori pubblici, inclusi nelle pagine;
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: solo per le funzioni;
- `SITE_URL`: URL dell'anteprima.

## 3. myPOS (solo sandbox)
> Dettagli completi, scelta dell'integrazione, verifiche da fare in sandbox ed elenco delle autorizzazioni: `docs/PAGAMENTI-MYPOS.md`.

1. Ottenere da myPOS le credenziali sandbox: SID, wallet, key index, chiave privata del negozio, certificato pubblico myPOS.
2. Impostare `MYPOS_ENV=sandbox`, lasciare `MYPOS_ALLOW_LIVE=false` e configurare `URL_Notify` = `https://<anteprima>/.netlify/functions/mypos-notify`.
3. Verificare con la documentazione ufficiale il formato della firma e dei parametri, poi eseguire i test di sandbox: pagamento riuscito, annullato, notifica duplicata, importo alterato.
4. Solo dopo i test e l'autorizzazione del titolare: credenziali di produzione, `MYPOS_ENV=production`, `MYPOS_ALLOW_LIVE=true`.

Per le rate dei contratti B2B si usa lo stesso checkout (`kind: 'business'`). Bonifici e RiBa si registrano in dashboard con "Registra incasso" e il riferimento (CRO): il contratto si attiva solo allora.

## 4. Notifiche email (facoltative)
`RESEND_API_KEY` e `NOTIFY_FROM`, con dominio mittente verificato. Senza queste variabili le notifiche restano registrate come "non inviate".
Le notifiche della centrale (presa in carico, programmazione, tecnico assegnato, riprogrammazione, rapporto disponibile) usano la stessa coda; per le richieste dal sito senza account il destinatario è l'email indicata nel modulo. Il canale WhatsApp è previsto ma non attivo (solo API ufficiale WhatsApp Business, dopo autorizzazione).

## 4-bis. Moduli di richiesta del sito → centrale operativa (Prompt 5)
Con Supabase configurato, impostare `forms.provider = 'centrale'` in `src/config/site.config.js` e rifare la build: i moduli di homepage, landing e preventivo inviano a `/.netlify/functions/request-create` e le richieste compaiono in `/admin/centrale-operativa/`. Finché resta `null` l'invio è disattivato e dichiarato.

## 4-ter. PRONTO AI (Prompt 6)

1. Applicare le migrazioni `20261117160000_ai_schema.sql`, `…160100_ai_logic.sql`, `…160200_ai_rls.sql`.
2. Scegliere il provider (Anthropic o OpenAI) e **verificare sul sito ufficiale** modello corrente, tariffe, area di trattamento dei dati e DPA.
3. Variabili Netlify (solo server): `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_HASH_SALT`; facoltative `AI_ENABLED=false` (emergenza) e `AI_BASE_URL`.
4. In `/admin/pronto-ai/#impostazioni`: inserire le tariffe reali (€ per milione di token), confermare il DPA, la versione dell'informativa privacy, il budget (30 €/mese iniziali) e le soglie; poi attivare l'interruttore globale e i singoli agenti.
5. Automazioni: la funzione pianificata `ai-automations` gira ogni ora; le regole restano sospese finché non vengono attivate dalla console.
6. Pulsante sul sito: impostare `PUBLIC_AI_WIDGET=true` nella build dell'anteprima solo dopo i test con il provider reale.
7. Knowledge base: caricare e approvare solo documenti aziendali autorizzati (FAQ, condizioni, procedure).

Dettagli in `docs/PRONTO-AI.md`.

## 4-quater. PRONTO SEO (Prompt 7)

1. Applicare le migrazioni `20261118170000_seo_schema.sql`, `…170100_seo_logic.sql`, `…170200_seo_rls.sql`.
2. Search Console: verificare la proprietà (consigliata la proprietà Dominio con record DNS) e inviare la sitemap.
3. Accesso server, una delle due strade:
   - service account: Google Cloud → API "Google Search Console API" abilitata → service account → chiave JSON in `GSC_SERVICE_ACCOUNT_JSON` (una riga); aggiungere l'email del service account come utente della proprietà;
   - OAuth: client "Applicazione web" con URI di reindirizzamento `https://<anteprima>/.netlify/functions/seo-oauth` → `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `SEO_TOKEN_KEY` (`openssl rand -base64 32`); poi "Collega account Google" nelle Impostazioni della dashboard.
4. In `/admin/seo/#impostazioni`: indicare la proprietà (`sc-domain:prontointerventoroma.it`), il metodo di accesso, attivarla e premere "Sincronizza ora". Le funzioni pianificate `seo-sync` (04:20 UTC) e `seo-monitor` (04:50 UTC) proseguono ogni giorno.
5. Google Business Profile: gestione manuale nella dashboard; `GBP_API_ENABLED=true` solo dopo l'approvazione dell'accesso alle API da parte di Google.
6. Allarme build: in Netlify → Deploy notifications → HTTP POST su "Deploy failed" verso `/.netlify/functions/seo-deploy-hook` con segreto JWS = `NETLIFY_WEBHOOK_SECRET`.
7. GA4: solo dopo informativa e cookie policy validate, impostare `PUBLIC_GA4_MEASUREMENT_ID` e rifare la build.

Dettagli in `docs/PRONTO-SEO.md`.

## 5. Abilitare la vendita
Tutte le condizioni devono essere vere:
1. Il titolare conferma prestazioni e prezzi: in dashboard, flag "Titolare" sui piani.
2. Un legale approva le condizioni (bozze in `docs/legale/`): flag "Legale", e pubblicazione dell'URL in `commerce.termsUrl`.
3. Pagamenti myPOS testati.
4. In dashboard → Impostazioni → "Vendita online abilitata"; nel file `src/config/site.config.js`: `commerce.salesEnabled = true`, seguito da una nuova build.

## 6. Vendita B2B
I piani Business e Hotel seguono le stesse regole (flag Titolare e Legale sui piani). I contratti B2B non si vendono online: si creano dalla dashboard, il cliente li accetta nell'area Business e si attivano dopo il pagamento verificato o riconciliato. Prima di proporli servono condizioni contrattuali B2B riviste da un legale (non ancora redatte).

## 7. Test locali
```bash
npm run test:unit                 # logica economica, contrattuale, myPOS, PDF, funzioni
PGHOST=/percorso/socket PGPORT=5432 PGUSER=postgres npm run test:db   # PostgreSQL ≥ 16
npm test                          # build e controlli statici del sito
npm run test:browser              # sito pubblico in Chrome headless
python3 scripts/e2e/app-check.py  # aree riservate (backend simulato solo nel test)
python3 scripts/e2e/ops-check.py  # centrale operativa, calendario, tecnici, area tecnico mobile (backend simulato solo nel test)
```
