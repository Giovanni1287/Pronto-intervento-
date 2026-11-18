# Report di audit — Prompt 0–7 verificati nel Prompt 8 (18/11/2026)

Metodo:
- ogni modulo è stato giudicato sui **test eseguiti in questa sessione** (REPORT_TEST.md), non sulle dichiarazioni dei report precedenti;
- repository locale, branch `feature/prompt-8-collaudo`, partito da `develop` = Prompt 7 (versione 0.8.0);
- prima di ogni intervento è stata eseguita una baseline con tutte le suite: tutte verdi.

Stati possibili: **Completato e verificato** · **Implementato ma non collaudato** · **Parzialmente funzionante** · **Non implementato** · **Bloccato da una configurazione esterna**.
"Verificato" significa verificato in locale: build, browser, database PostgreSQL 16 con RLS, servizi esterni simulati e dichiarati tali.

## 1. Stato per modulo

| Prompt | Modulo | Stato | Evidenze e limiti |
|---|---|---|---|
| 0 | Architettura (generatore statico, Netlify Functions, Supabase) | Completato e verificato | Build in 3 ambienti; 26 funzioni impacchettate con lo strumento di Netlify |
| 0 | Homepage | Completato e verificato | 8 dispositivi senza errori; Lighthouse di laboratorio 99–100 (Prompt 7) |
| 0 | Design system (palette #081D30, #006BE6, #FF7824, #FFFFFF, #F3F6FA) | Completato e verificato | Token CSS identici alla palette richiesta; contrasti corretti nel Prompt 7 e bersagli di tocco nel Prompt 8 |
| 0 | Configurazione Netlify | Completato e verificato in locale · **bloccato** per la pubblicazione | Header, CSP, redirect, contesti, edge function; nessun progetto Netlify collegato |
| 1 | 6 categorie | Completato e verificato | Pagine con problemi, soluzioni, tecnologie, quando chiamare, FAQ |
| 1 | 24 sottocategorie | Completato e verificato | 24 landing con contenuti propri |
| 1 | "Trenta landing page" | Completato e verificato (come 30 pagine di servizio = 6 categorie + 24 landing) | Il prompt 1 chiedeva 24 sottocategorie; le pagine pubbliche indicizzabili sono in tutto 37 |
| 1 | Fotografie | **Non implementato (dati mancanti)** | 111 posizioni con segnaposto dichiarato; elenco in `reports/migration/foto-da-sostituire.csv` |
| 1 | SEO | Completato e verificato | Audit 0 errori, HTML completo senza JavaScript su 37 pagine |
| 2 | PRONTO+ Family (8 categorie, 16 piani) | Implementato e verificato in locale · **bloccato** | Listini **non approvati** dal titolare né validati legalmente; vendite spente |
| 2 | Listini dinamici versionati | Completato e verificato | Una nuova versione non altera i contratti esistenti (snapshot nel contratto, test DB) |
| 2 | Lavoro Protetto | Implementato e verificato in locale · **bloccato** | Catena certificato → acquisto → controllo programmato → prestazione nei test DB; contestazione difetti anche senza servizio aggiuntivo |
| 2 | Area clienti | Implementato e verificato in locale · **bloccato** | Login OTP, immobili, tessera, prestazioni, storico, documenti con backend simulato (85 controlli nel browser) e RLS reale |
| 3 | Business, Hotel, Corporate, multisede, contratti | Implementato e verificato in locale · **bloccato** | Scenario Hotel completo in `20_business.sql`; listini B2B non approvati |
| 4 | myPOS (checkout, notifiche, verifica, rimborsi) | Implementato ma **non collaudato con myPOS** · **bloccato** | Firma, importi, idempotenza, annullamenti, scadenze e rimborsi verificati con mock dichiarati; **nessuna credenziale sandbox** |
| 5 | Centrale operativa, tecnici, calendario, rapporti | Completato e verificato in locale · **bloccato** per l'uso reale (Supabase) | Scenario S1 completo dalla richiesta pubblica al pagamento e ai documenti; **trovato e corretto un difetto bloccante** (sotto) |
| 6 | PRONTO AI (6 agenti, automazioni, chat) | Implementato e verificato con provider simulato · **bloccato** (chiave AI) | Prompt injection, permessi, budget, conferma esplicita, nessun appuntamento inventato |
| 7 | SEO avanzata e dashboard PRONTO SEO | Completato e verificato | Audit, dashboard, attribuzione, consenso |
| 7 | Google Search Console, Business Profile, GA4 | Implementato, **non collaudato con Google** · **bloccato** | Credenziali assenti. La proprietà Search Console risulta già verificata via DNS: va recuperato l'accesso |
| 7 | Monitoraggio conversioni | Completato e verificato | Scenario S6: la landing di provenienza compare nel report con richiesta, cliente e incasso |

## 2. Difetti trovati e corretti in questo prompt

| # | Difetto | Dove | Effetto | Correzione |
|---|---|---|---|---|
| 1 | `miss := miss \|\| 'testo'` su `text[]` in PL/pgSQL genera "malformed array literal" | `report_missing_fields` (Prompt 5) | Una richiesta dal sito senza indirizzo completo bloccava il tecnico con un errore incomprensibile; ora compare il messaggio corretto ("manca l'indirizzo") | Migrazione `20261118180100` (array_append) |
| 2 | Stesso errore | `coverage_check` (Prompt 5) | La verifica di copertura andava in errore appena un contratto **non** copriva l'intervento | Stessa migrazione |
| 3 | Attribuzione "unknown" per le richieste confermate da PRONTO AI | Trigger del Prompt 7 | Report conversioni senza il canale PRONTO AI | Trigger su `source` + correzione dei dati esistenti |
| 4 | Redirect `/index.html` → `/` inefficace su Netlify (shadowing: il file esiste) | `_redirects` (Prompt 7) | URL duplicata indicizzabile | Regola `301!`; il server locale ora riproduce lo shadowing |
| 5 | Bersagli di tocco sotto i 24 px (footer, breadcrumb, checkbox, banner anteprima) | CSS | WCAG 2.2 (2.5.8) | Altezza minima 24 px senza cambiare l'aspetto |
| 6–12 | Sicurezza: privilegi superflui, CSP pubblica assente, limite per connessione, staging, URL `javascript:`, email in staging, limiti di upload | — | SECURITY_CHECKLIST.md §1 | Corretti |

I difetti 1 e 2 non erano emersi nei test dei Prompt 5–7: le prove usavano sempre indirizzi completi e contratti validi. Li hanno trovati gli scenari concatenati del Prompt 8.

## 3. Sito attuale e dominio

- Pagina unica ospitata sul progetto Netlify `delfino-soffice-ca8830`.
- DNS su Aruba, posta su Aruba.
- Dettagli in DOMAIN_MIGRATION.md e SEO_MIGRATION.md.

## 4. Cosa non è stato possibile verificare

- Integrazioni reali: myPOS sandbox, Search Console, Business Profile, GA4, provider AI, invio email. Mancano le credenziali.
- Supabase reale: RLS, Storage, Auth, limiti dei bucket, migrazioni con `supabase db push`.
- Pubblicazione su Netlify, staging online, comportamento reale dell'edge function, certificati.
- Core Web Vitals reali: il sito non è pubblicato. Le misure Lighthouse sono di laboratorio.
- GitHub: nessun repository remoto creato (serve una conferma esplicita).
