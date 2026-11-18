# Checklist prima della pubblicazione

L'elenco sempre aggiornato è stampato da `npm run build` e visibile in anteprima su `/stato-progetto/`.

## Dati dell'impresa (`src/config/site.config.js`)
- [ ] Telefono (`contacts.phone`)
- [ ] WhatsApp (`contacts.whatsapp`)
- [ ] Email (`contacts.email`)
- [ ] Orari di disponibilità (`contacts.hours`) — non dichiarare H24 se non garantito
- [ ] Ragione sociale, P.IVA, codice fiscale, REA, PEC, sede (`company.*`)
- [ ] Storia aziendale (`company.story`)
- [ ] Foto autentica del titolare (`company.ownerPhoto`)
- [ ] Zone operative (`site.serviceArea.zones`)

## Contenuti
- [ ] Fotografie con licenza commerciale (vedi `docs/IMMAGINI.md`)
- [ ] Informativa privacy e cookie policy (`/privacy/`)
- [ ] Coperture e prezzi PRONTO+ (oppure mantenere "in definizione")
- [x] 24 landing di sottocategoria (Prompt 1)
- [ ] Revisione dei testi da parte del titolare (servizi effettivamente offerti, metodi e attrezzature disponibili)
- [ ] Abilitazioni e qualifiche confermate (`company.certifications`), es. DM 37/2008 per gli impianti
- [ ] Foto delle 30 pagine di servizio nel registro `src/config/images.config.js` (hero + 3 per galleria)
- [ ] Dominio specialistico ricerca perdite (`specialistDomains.leakDetection`), se previsto

## Tecnico
- [ ] Servizio di ricezione moduli (`forms.provider`) e test di invio reale
- [ ] Repository remoto (dopo autorizzazione)
- [ ] Nuovo sito Netlify (dopo autorizzazione) — build `npm run build`, publish `dist`
- [ ] `npm test` verde
- [ ] Solo al via libera definitivo: `seo.allowIndexing = true`, collegamento dominio `prontointerventoroma.it`, invio sitemap a Google Search Console

## PRONTO+ e aree riservate (Prompt 2)
- [ ] Conferma del titolare su prestazioni, uscite, durate, esclusioni e prezzi (listini in `src/data/catalog/`)
- [ ] Verifica legale delle bozze in `docs/legale/`, inclusa l'esclusione dell'attività assicurativa e le clausole di recesso
- [ ] Progetto Supabase (UE), migrazioni, seed, primo amministratore (`docs/CONFIGURAZIONE-BACKEND.md`)
- [ ] Variabili Netlify (pubbliche e solo server), senza chiavi nel repository
- [ ] Test myPOS in sandbox secondo la documentazione ufficiale; solo dopo, credenziali di produzione e `MYPOS_ALLOW_LIVE=true`
- [ ] Provider email e dominio mittente (facoltativo)
- [ ] Revisione dei testi dell'informativa privacy dell'area clienti e delle email di accesso
- [ ] Abilitazione della vendita (flag dei piani, impostazioni aziendali, `commerce.salesEnabled`)

## Business, Hotel, Condomini e Corporate (Prompt 3)
- [ ] Conferma del titolare sui pacchetti Business (349/749/1.490 €) e Hotel (1.900/4.900/9.900 €), su regole di contabilizzazione, tariffe extra (manodopera, diritto di chiamata, minimi, maggiorazioni), zone e fasce orarie (`src/data/catalog/business-plans.js` o dashboard → Listini)
- [ ] Prezzo indicativo Corporate "da 15.000 €" confermato
- [ ] Condizioni contrattuali B2B redatte e verificate da un legale (SLA, recesso tra imprese, foro, limitazioni di responsabilità): non ancora presenti
- [ ] Dati aziendali verificati in dashboard → Impostazioni (per i preventivi PDF)
- [ ] Soglia di margine e costi interni di riferimento
- [ ] URL di reindirizzamento Auth per `/area-business/`
- [ ] Foto reali per le hero di Business, Hotel e Corporate (chiavi `pronto-plus/business/hero`, `pronto-plus/hotel/hero`, `pronto-plus/corporate/hero`)
- [ ] Test end-to-end su Supabase reale: lead, preventivo, contratto, accettazione, pagamento sandbox, richiesta multisede, visita e conferma

## Pagamenti myPOS (Prompt 4)
- [ ] Credenziali **sandbox** myPOS nelle variabili Netlify dell'anteprima (mai nel repository); `SITE_URL` = anteprima HTTPS
- [ ] Test sandbox elencati in `docs/PAGAMENTI-MYPOS.md` §7 (pagamento, annullamento, rollback, duplicati, importo alterato, consultazione stato, rimborso)
- [ ] Modalità di pagamento B2B approvate dal titolare (dashboard → Impostazioni)
- [ ] Versione delle condizioni pubblicata (`commerce.termsUrl` e `terms_version_*` nelle impostazioni)
- [ ] Sistema di fatturazione e collegamento dei documenti fiscali agli ordini
- [ ] Riconciliazione mensile con l'estratto myPOS (dashboard → Pagamenti e incassi)
- [ ] Solo dopo autorizzazione: credenziali di produzione, `MYPOS_ENV=production`, `MYPOS_ALLOW_LIVE=true`

## Centrale operativa e tecnici (Prompt 5)
- [ ] Migrazioni `2026111715*` applicate e `supabase/seed.sql` rieseguito (specializzazioni e impostazioni della centrale)
- [ ] Account dei tecnici invitati e profili completati (specializzazioni, zone, disponibilità, costo orario interno)
- [ ] Abilitazioni dei tecnici verificate sui documenti e registrate con scadenza
- [ ] Requisiti professionali obbligatori per specializzazione definiti dal titolare (tabella `qualification_requirements`)
- [ ] Mappatura servizi → specializzazioni confermata (`src/data/catalog/specializations.js`)
- [ ] Eventuali operatori di centrale e relativi permessi (`role_permissions`)
- [ ] `forms.provider = 'centrale'` dopo aver collegato Supabase; prova di invio da homepage, landing e modulo preventivo
- [ ] Prova completa su Supabase reale: richiesta → assegnazione → area tecnico da smartphone → rapporto → approvazione → PDF → pagamento sandbox → chiusura con prestazione PRONTO+
- [ ] Testi delle notifiche approvati; provider email configurato; WhatsApp Business solo dopo autorizzazione e consenso
- [ ] Periodi di conservazione di foto e documenti definiti (`retention_months_photos`)
- [ ] Dati dell'impresa verificati per l'intestazione dei rapporti PDF
- [ ] Informativa privacy aggiornata per tecnici (dati trattati, assenze senza dati sanitari, nessuna geolocalizzazione) e per i richiedenti dal sito

## PRONTO AI (Prompt 6)

- [ ] Provider scelto e verificato: modello corrente (`AI_MODEL`), tariffe, conservazione dei dati, area geografica del trattamento, DPA firmato/accettato
- [ ] Informativa privacy aggiornata con l'uso dell'assistente AI (finalità, provider come responsabile, trasferimenti extra UE, conservazione 90 giorni o diversa)
- [ ] Variabili server impostate (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_HASH_SALT`); nessuna chiave nel repository
- [ ] Tariffe reali e budget inseriti nella console; soglie verificate; costo effettivo registrato a fine mese dalla fattura
- [ ] Prova completa con il provider reale su anteprima: classificazione, pericoli (gas, acqua e corrente), conferma, numero nella centrale
- [ ] Prove di prompt injection e di richieste fuori ambito con il modello reale (registro Sicurezza)
- [ ] Knowledge base: documenti aziendali approvati (FAQ, condizioni, procedure tecniche)
- [ ] Automazioni da attivare scelte e verificate; nessuna comunicazione commerciale automatica
- [ ] `PUBLIC_AI_WIDGET=true` solo dopo l'approvazione di Giovanni Romeo


## PRONTO SEO (Prompt 7)

- [ ] `npm run seo:audit`: 0 errori sulla build di produzione simulata (report in `reports/seo-audit.md`)
- [ ] Proprietà Search Console verificata per `prontointerventoroma.it` (consigliata la proprietà Dominio, verifica DNS) e sitemap `https://prontointerventoroma.it/sitemap.xml` inviata
- [ ] Accesso server: `GSC_SERVICE_ACCOUNT_JSON` (email del service account aggiunta alla proprietà) **oppure** OAuth (`GOOGLE_OAUTH_*`, `SEO_TOKEN_KEY`) e collegamento dalla dashboard
- [ ] Prima sincronizzazione completata (Impostazioni → "Sincronizza ora") e dati controllati con l'interfaccia di Search Console
- [ ] Scheda Google Business Profile ufficiale verificata dal titolare: nome reale, categoria, telefono, orari, area servita (nessuna sede fittizia, nessuna scheda duplicata)
- [ ] Link ufficiale per le recensioni inserito; provider email configurato prima di inviare richieste di recensione
- [ ] Zone operative realmente servite confermate da Giovanni Romeo e attivate dalla dashboard (pagine dedicate solo con contenuto distintivo approvato)
- [ ] Guide: revisione tecnica e approvazione di ciascuna bozza prima di cambiarne lo stato in `src/data/guides/`
- [ ] Informativa privacy e cookie policy validate da un consulente; solo dopo impostare `PUBLIC_GA4_MEASUREMENT_ID` (proprietà GA4 con conservazione dei dati e segnali Google verificati)
- [ ] Deploy notification di Netlify verso `/.netlify/functions/seo-deploy-hook` con `NETLIFY_WEBHOOK_SECRET`
- [ ] URL del sito pubblicato inserito nelle Impostazioni SEO per i controlli dal vivo (HTTPS, robots, sitemap, noindex accidentali)
- [ ] Dopo la pubblicazione: Lighthouse e Core Web Vitals reali (rapporto "Esperienza" di Search Console / CrUX) annotati nel report
