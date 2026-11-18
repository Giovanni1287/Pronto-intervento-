# PRONTO SEO — SEO tecnica, Google Search Console, Google Business Profile e acquisizione clienti

Modulo del Prompt 7. Principio guida: **solo dati verificabili, con fonte e data; nessuna
promessa di posizionamento; ogni modifica editoriale passa da una persona.**

## 1. Componenti

| Parte | Dove | Cosa fa |
|---|---|---|
| Sistema metadati | `src/seo/meta.js`, `src/data/seo/meta-overrides.js` | Title/description per pagina dal contenuto + modifiche approvate; titolo senza suffisso del marchio se supera 65 caratteri |
| Schede editoriali | `src/data/seo/editorial.js` | Per ogni pagina pubblica: keyword proposta, intento, servizi correlati, stato editoriale, ultima revisione, dati da confermare |
| Audit tecnico | `src/lib/seo/audit.js`, eseguito da `scripts/build.js` | 30+ controlli per pagina (title, description, H1 unico, gerarchia titoli, canonical, OG, breadcrumb, alt e dimensioni immagini, JSON-LD, FAQ visibili, link interni, contenuto scarso…) e per sito (duplicati, pagine orfane, sitemap ↔ pagine pubbliche, robots). In produzione la build si ferma se ci sono errori |
| Audit su richiesta | `npm run seo:audit` | Build di produzione simulata in `.seo-audit-build/` → `reports/seo-audit.md` / `.json` |
| Sitemap, robots, redirect | `scripts/build.js`, `src/data/seo/redirects.js` | Sitemap solo con URL canoniche pubbliche e indicizzabili (lastmod = ultima revisione editoriale); anteprima `Disallow: /` + `X-Robots-Tag: noindex`; `_redirects` 301 per `/index.html` |
| Pagine nuove | `src/pages/seo-pages.js` | `/servizi/` (indice), `/zone-operative/` (solo zone confermate), `/guide/` (solo guide approvate; bozze visibili in anteprima con `noindex`) |
| Database | `supabase/migrations/20261118170*.sql` | 24 tabelle `seo_*`, `lead_attribution`, `conversion_events`, `service_zones`, `gbp_*`, `review_*`; RLS forzata; token OAuth non leggibili da nessun utente |
| Funzioni Netlify | `netlify/functions/seo-*.mjs`, `conversion-event.mjs` | Sincronizzazione Search Console, monitoraggio, OAuth, amministrazione/PDF, eventi di conversione, webhook delle build |
| Dashboard | `/admin/seo/` (`src/scripts/app/pronto-seo.js`) | Panoramica, Pagine, Ricerche, Google Maps, SEO AI, Conversioni, Report, Impostazioni |
| PRONTO SEO Agent | `src/lib/ai/agents.js`, `src/lib/ai/tools.js` | Sesto agente di PRONTO AI (stessa infrastruttura del Prompt 6), 10 strumenti SEO |
| Consenso e GA4 | `src/components/layout.js`, `src/scripts/main.js` | Banner (Accetta / Rifiuta / Personalizza / Preferenze), Consent Mode, GA4 caricato solo dopo il consenso |

## 2. Search Console

**Endpoint usati** (verificati a novembre 2026):
- Search Analytics: `POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`
  — dimensioni `date`, `page`, `query`, `device`, `country`; `brandedClassification` solo per le proprietà idonee
  (dati dal 21/02/2026, non combinabile con il filtro per query); `dataState: all` per includere gli ultimi giorni (marcati come provvisori);
  paginazione con `startRow` fino a 25.000 righe per richiesta.
- URL Inspection: `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect` (stato di indicizzazione, canonical scelta da Google, ultimo crawl).
- Sitemaps: `GET .../webmasters/v3/sites/{siteUrl}/sitemaps`.
- Ambito: `https://www.googleapis.com/auth/webmasters.readonly` (sola lettura).

**Accesso** (scegliere uno):
1. *Service account* — `GSC_SERVICE_ACCOUNT_JSON`. Firma JWT RS256 sul server, token di accesso di 1 ora mai salvato.
   L'email del service account va aggiunta come utente della proprietà in Search Console.
2. *OAuth* — `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `SEO_TOKEN_KEY`.
   Dalla dashboard (Impostazioni → "Collega account Google"): stato monouso (solo l'impronta nel DB, scadenza 10 minuti),
   refresh token cifrato AES-256-GCM con `SEO_TOKEN_KEY`, tabella non leggibile da alcun ruolo utente.

**Sincronizzazione** (`seo-sync`, ogni giorno alle 04:20 UTC, oppure "Sincronizza ora"): incrementale (ultimi 5 giorni
riscritti a ogni esecuzione; storico su richiesta con `backfillDays` fino a 480 giorni, POST manuale dell'amministratore), un job per proprietà e giorno con tentativi registrati in `seo_automation_jobs`.
Totali giornalieri dalla query senza dimensioni (le righe per query/pagina escludono le ricerche anonimizzate:
la dashboard lo dichiara). La posizione media è sempre presentata come media ponderata, non come ranking.

**Multi-dominio**: ogni dominio è una `seo_properties` separata (prontointerventoroma.it gestito qui;
ispezionetubazioneroma.it e il futuro dominio delle perdite: solo lettura dei dati di ricerca, nessuna modifica,
nessun consolidamento, nessuna copia delle landing, nessuna rete di link).

## 3. Monitoraggio e allarmi (`seo-monitor`, ogni giorno alle 04:50 UTC)

Controlli: audit della build importato, sito pubblicato (HTTPS, robots, sitemap, noindex/canonical accidentali, link interni
rotti — solo se `live_site_url` è impostato), stato delle sitemap e campione URL Inspection (se Search Console è collegata),
calo di clic/impressioni oltre soglia rispetto al periodo precedente, dati non aggiornati, moduli con errori,
report settimanali (lunedì) e mensili (giorno 1), preparazione delle richieste di recensione.
`seo-deploy-hook` registra le build fallite (firma JWS di Netlify verificata con `NETLIFY_WEBHOOK_SECRET`).
Gli allarmi descrivono il fenomeno senza attribuirlo a penalizzazioni. Le notifiche usano solo i provider configurati
(`notifications` → email se `RESEND_API_KEY` è impostata).

## 4. Google Business Profile

Gestione **manuale** finché Google non approva l'accesso alle API per il progetto Cloud (richiesta con revisione
fino a ~14 giorni). La dashboard tiene: dati della scheda come registro interno, checklist (nome reale senza parole chiave,
categoria, telefono, orari, area servita senza indirizzi fittizi…), checklist fotografica, registro delle operazioni.
Con `GBP_API_ENABLED=true` e accesso approvato si leggono le metriche giornaliere (Business Profile Performance API).
Nessuna scheda viene creata o modificata su Google da questo sistema.

## 5. Recensioni

Per ogni intervento concluso con email disponibile si **prepara** una sola richiesta (tutti i clienti, senza filtri sulla
soddisfazione); l'invio è un'azione dell'amministratore; link di rinuncia `/recensioni/rinuncia/` (opt-out permanente);
nessun incentivo; nessuna recensione pubblicata sul sito; nessun dato strutturato di recensioni.

## 6. Conversioni e attribuzione

Eventi di prima parte (`conversion-event`, solo stessa origine, limite di frequenza): `phone_click`, `whatsapp_click`,
`quote_cta_click`, `plan_cta_click`, `form_submit_ok`, `form_submit_error`, `ai_open`, `checkout_start`. Payload: tipo, percorso, canale, UTM ammessi
— mai nomi, telefoni o email. Le richieste salvano l'attribuzione (`lead_attribution`, collegata a interventi e lead B2B
tramite trigger, senza duplicare dati). La dashboard distingue: clic → richiesta → lead qualificato → preventivo accettato
→ cliente → pagamento confermato.

## 7. GA4 e consenso

Senza `PUBLIC_GA4_MEASUREMENT_ID`: nessun banner, nessuno script Google, nessun cookie di analisi.
Con l'ID: banner con Accetta e Rifiuta di pari evidenza, Personalizza, "Preferenze cookie" nel footer; Consent Mode con
stato predefinito `denied` per tutti i segnali; `gtag.js` caricato **solo dopo** il consenso (modalità base); `allow_google_signals: false`;
eventi con il solo percorso della pagina; revoca → ricarica senza GA4; nessun banner nelle aree riservate.
Il banner da solo non rende il sito conforme al GDPR: servono informativa e cookie policy validate (pagine ancora segnaposto, `noindex`).

## 8. PRONTO SEO Agent

Strumenti: `seo_overview`, `seo_low_ctr_pages`, `seo_declining_pages`, `seo_queries`, `seo_page_details`, `seo_technical_issues`,
`seo_conversions`, `seo_propose_change` (crea una proposta da valutare), `seo_create_content_draft` (bozza non approvata),
`seo_weekly_report`, più `search_knowledge`. Nessuna scrittura su pagine, nessuna pubblicazione, nessuno scraping dei risultati Google.
Ogni proposta riporta i dati di riferimento; l'amministratore approva/rifiuta. Le proposte di title/description approvate
entrano nel repository con `npm run seo:apply` (controlla lunghezze e percorsi), poi audit, commit e pubblicazione manuali.

## 9. Ruoli

`seo.view` (admin, operatore): consultazione. `seo.manage` (admin): impostazioni, approvazioni, scheda Google, zone, report,
recensioni, collegamenti Google. `ai.use_seo` (admin): agente.

## 10. Comandi

```
npm run seo:audit      # audit di una build di produzione simulata
npm run seo:apply      # porta nel repository le modifiche approvate (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in locale)
npm run test:seo       # 71 controlli nel browser (consenso, conversioni, dashboard)
```
