> **Storico (Prompt 8).** La versione aggiornata è `docs/GO-NOGO-REPORT.md`.

# Prontezza al lancio — GO / NO-GO (18/11/2026)

**Verdetto complessivo: NO-GO per la pubblicazione oggi.** Nessuno dei blocchi riguarda il codice o la sicurezza. Mancano configurazioni esterne e conferme del titolare. Il **sito vetrina** può andare online appena saranno chiusi i 4 blocchi della sezione 1, con le funzioni avanzate spente tramite i flag della sezione 3.

## 1. Sito vetrina (pagine pubbliche, SEO, moduli di contatto)

| Criterio | Stato | Esito |
|---|---|---|
| Build funzionante | 62 pagine in produzione, audit SEO senza errori né avvisi | ✅ GO |
| Pagine pubbliche su 8 dispositivi | Nessun errore, overflow o violazione CSP; menu e tastiera funzionanti | ✅ GO |
| Sicurezza (header, CSP, segreti) | SECURITY_CHECKLIST.md | ✅ GO |
| Redirect dal vecchio sito | `/`, `/index.html`, `/index.htm` mappati | ✅ GO (ricontrollare in Search Console) |
| **Recapiti** | Telefono e WhatsApp **non configurati**: il sito mostra "da configurare". Sul sito attuale compare +39 351 922 1277, ma va confermato dal titolare | ❌ **NO-GO**: un sito di pronto intervento senza numero non è pubblicabile |
| **Moduli che non perdono richieste** | `forms.provider` non impostato e Supabase di produzione non collegato: i moduli invitano a chiamare, nessuna richiesta viene registrata | ❌ **NO-GO** finché non si sceglie: Supabase (`provider = 'centrale'`, richieste in centrale) **oppure** Netlify Forms (`provider = 'netlify'`, nessun backend: le richieste arrivano per email dal pannello Netlify) **oppure** lancio senza moduli ma con il telefono |
| **Configurazioni legali obbligatorie** | Dati societari (P.IVA, ragione sociale, sede) mancanti nel footer; informativa privacy e cookie policy ancora bozze segnaposto | ❌ **NO-GO**: servono dati e testi validati |
| Fotografie | 111 posizioni con immagini segnaposto marcate "Immagine da sostituire" (`reports/migration/foto-da-sostituire.csv`) | ❌ **NO-GO estetico**: almeno hero, home e categorie (10 foto, priorità alta) |
| Affermazioni del vecchio sito ("30 minuti", "CEI", "10.000+ interventi", "garanzia") | Non riportate nel nuovo sito | ✅ Corretto così, finché non sono documentate |
| Indicizzazione | Guardia tripla; noindex finché non si imposta `ALLOW_INDEXING` in produzione | ✅ GO (da attivare al passaggio) |

## 2. Funzioni avanzate

| Modulo | Codice e test | Blocco esterno | Esito |
|---|---|---|---|
| Area clienti (login OTP, immobili, tessera, storico, documenti) | ✅ DB, unit e browser con backend simulato | Supabase di produzione, testi legali, SMTP di Supabase Auth | ❌ NO-GO → spenta (non configurata) |
| PRONTO+ Family / Lavoro Protetto (vendita) | ✅ prezzi versionati, contratti, crediti | Listini da approvare (`owner_approved`, `legal_reviewed`), condizioni legali, myPOS | ❌ NO-GO → `sales_enabled=false` |
| Business / Hotel / Corporate | ✅ scenario Hotel completo nei test DB | Come sopra, più l'approvazione dei listini B2B | ❌ NO-GO → solo raccolta lead (dopo Supabase) |
| Pagamenti myPOS | ✅ firma, idempotenza, importi, rimborsi, annullamenti (simulati) | **Nessuna credenziale sandbox**: collaudo reale non eseguito | ❌ NO-GO → `MYPOS_ALLOW_LIVE=false`, vendite spente |
| Centrale operativa e tecnici | ✅ scenario S1 completo (richiesta → pagamento → documenti) | Supabase, account dei tecnici | ⚠️ GO dopo Supabase + collaudo sullo staging |
| PRONTO AI | ✅ 6 agenti, sicurezza, budget, conferme | Chiave del provider AI, budget approvato | ❌ NO-GO → `PUBLIC_AI_WIDGET=false` |
| PRONTO SEO | ✅ audit, dashboard, attribuzione | Credenziali Search Console (proprietà già verificata via DNS) | ⚠️ GO parziale: audit e attribuzione sì, dati Google dopo il collegamento |
| GA4 | ✅ consenso e Consent Mode | Validazione della cookie policy | ❌ spento (`PUBLIC_GA4_MEASUREMENT_ID` vuoto) |

## 3. Interruttori per spegnere i moduli non pronti (feature flag esistenti)

| Interruttore | Dove | Effetto |
|---|---|---|
| `company_settings.sales_enabled = false` | Database (Impostazioni) | Nessun nuovo ordine: abbonamenti, Lavoro Protetto e pagamenti online non acquistabili. Le RPC rifiutano anche da API |
| `plans.owner_approved`, `plans.legal_reviewed` | Database | Un piano non approvato non è vendibile |
| `MYPOS_ALLOW_LIVE` assente o `false` | Netlify | Pagamenti reali impossibili |
| `PUBLIC_SUPABASE_*` assenti | Netlify (build) | Aree riservate in stato "non configurato", nessuna registrazione |
| `forms.provider` | `src/config/site.config.js` | `null` = moduli disattivati con invito a chiamare; `'centrale'` = richieste in centrale |
| `PUBLIC_AI_WIDGET=false`, `AI_ENABLED=false`, `ai_settings.enabled` | Netlify / database | PRONTO AI invisibile o spento |
| `PUBLIC_GA4_MEASUREMENT_ID` vuoto | Netlify (build) | Nessun tracciamento né banner |
| `GBP_API_ENABLED=false` | Netlify | Business Profile in gestione manuale |

Nessun acquisto o registrazione può dipendere da un componente non collaudato: con i valori predefiniti del repository vendite, pagamenti live, AI pubblica e analytics sono **spenti**.

## 4. Blocchi critici della Fase 19

| Blocco | Stato |
|---|---|
| Autenticazione vulnerabile | Non riscontrata: OTP Supabase, ruoli verificati nel database |
| Accesso non autorizzato ai dati | Non riscontrato: RLS forzata ovunque, test di isolamento |
| Pagamenti non verificati | Non possibili: attivazione solo da notifica firmata, mai dal browser |
| Prezzi errati | Prezzi dal database e versionati; listini **da approvare** prima della vendita |
| Contratti attivati impropriamente | Non possibile senza pagamento confermato (test) |
| Crediti scalati in modo scorretto | Consumo idempotente, solo lato server (test) |
| Form che perdono richieste | Oggi i moduli sono **disattivati** (nessuna perdita silenziosa); il limite per connessione lascia passare in caso di guasto del contatore |
| Esposizione di segreti | Nessuna (scansione) |
| Migrazioni non sicure | Migrazioni non distruttive, provate su database separati; backup e ripristino provati |
| Configurazioni legali mancanti | **Presenti come blocco**: dati societari, privacy, cookie policy, condizioni |
| Integrazioni dichiarate attive ma non collaudate | Nessuna: myPOS, Google, AI ed email sono dichiarati "non configurati" finché mancano le credenziali |

## 5. Operazioni manuali per arrivare al GO del sito vetrina

1. Il titolare conferma il telefono e WhatsApp (e l'email), poi li inserisce in `src/config/site.config.js` (`contacts`).
2. Il titolare fornisce ragione sociale, P.IVA e sede; un consulente valida privacy e cookie policy.
3. Almeno 10 foto autentiche o con licenza commerciale per hero e categorie.
4. Moduli: Supabase di produzione con `forms.provider = 'centrale'`; in alternativa, per la sola vetrina, `forms.provider = 'netlify'` (Netlify Forms) oppure il solo telefono.
5. Creazione dello staging, collaudo, poi la procedura in DOMAIN_MIGRATION.md §4.
