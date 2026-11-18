# Migrazione SEO: dal sito attuale al nuovo sito

## 1. Il sito attuale (rilevato il 18/11/2026)

Dettagli in `reports/migration/old-site-snapshot-2026-11-18.md`. Le richieste sono state fatte dal browser del titolare del progetto, previa sua approvazione, solo in lettura.

- È ospitato su **Netlify**, nel progetto `delfino-soffice-ca8830`. È una **pagina unica**: le sezioni sono ancore, l'HTML pesa circa 2,7 MB con le immagini incorporate.
- Le URL raggiungibili sono soltanto `/` e `/index.html`; `/index.htm` viene reindirizzata da Netlify.
- Non hanno `robots.txt`, `sitemap.xml`, canonical, meta description né dati strutturati.
- Altre 14 URL tipiche sono state provate e restituiscono 404: contatti, servizi, privacy, idraulico-roma, ecc.
- Nel DNS è presente il record `google-site-verification`. È probabile che il titolare abbia già una proprietà Search Console da recuperare: va controllato prima di crearne una nuova.

## 2. Tabella OLD URL → NEW URL

| Vecchia URL | Stato attuale | Nuova URL | Regola | Motivo |
|---|---|---|---|---|
| `/` | 200 | `/` | nessuna (stessa URL) | La home nuova sostituisce la pagina unica |
| `/index.html` | 200 (duplicato di `/`) | `/` | `301!` (forzata) | Su Netlify una regola non si applica se il file esiste: serve il `!` |
| `/index.htm` | redirect di Netlify | `/` | `301` | Alias storico |
| `/#servizi`, `/#chi-siamo` e altre ancore | ancore | `/` | nessuna | Le ancore non sono URL distinte per Google |

Regole generate in `dist/_redirects` da `src/data/seo/redirects.js`. Il server locale (`scripts/serve.js`) riproduce lo shadowing di Netlify e `launch-check.py` verifica che `/index.html` risponda con 301 verso `/`.

**Prima del passaggio va ripetuto il controllo:**
- in Search Console (proprietà esistente, Pagine → Indicizzate e "Pagine con reindirizzamento") ogni URL non presente in tabella va mappata sulla pagina nuova corrispondente;
- non si fa mai un reindirizzamento in blocco verso la home;
- non si crea alcuna regola catch-all `/*`: il test `npm test` lo impedisce.

## 3. Cosa cambia per Google

- Si passa da 1 pagina a 37 URL canoniche pubbliche, tutte in sitemap, con title e description unici, un solo H1, breadcrumb, JSON-LD (Organization, Service, BreadcrumbList, FAQ visibili) e link interni.
- Le aree riservate, il checkout, le bozze delle guide e le zone non confermate restano `noindex` e fuori dalla sitemap.

## 4. Indicizzazione: chi la accende e come

La build diventa indicizzabile **solo** quando valgono tutte e tre le condizioni (`scripts/build.js`):
1. `SITE_ENV=production`;
2. `ALLOW_INDEXING=true` impostata nel progetto Netlify di produzione;
3. l'URL del deploy (`URL` di Netlify) coincide con `https://prontointerventoroma.it`.

In ogni altro caso il sito esce con `noindex`, `X-Robots-Tag` e `Disallow: /`. Il test `tests/unit/launch.test.js` lo verifica su tre casi:
- senza autorizzazione → noindex;
- staging `*.netlify.app` con `ALLOW_INDEXING=true` → noindex;
- dominio ufficiale autorizzato → indicizzabile, con la sitemap dichiarata.

**Rischio opposto (noindex dimenticato in produzione).** Lo smoke test del lancio (ROLLBACK_PLAN.md §3) controlla che `https://prontointerventoroma.it/` **non** contenga `noindex` e che `robots.txt` non contenga `Disallow: /`.

## 5. Dopo il passaggio (prime 4 settimane)

1. Inviare `https://prontointerventoroma.it/sitemap.xml` in Search Console.
2. Usare il Controllo URL sulla home e su 3–5 landing, chiedendo l'indicizzazione.
3. Monitorare in PRONTO SEO (allarmi giornalieri):
   - errori 404;
   - pagine "Rilevata, ma non indicizzata";
   - canonical scelta da Google diversa dalla nostra.
4. Confrontare clic e impressioni prima/dopo in Search Console. Un calo temporaneo nei primi giorni è normale e non indica una penalizzazione.
5. Core Web Vitals reali: rapporto "Esperienza" di Search Console, disponibile solo dopo che arrivano dati di traffico.
