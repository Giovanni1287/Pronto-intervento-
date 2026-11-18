# Checklist del titolare — attivazione di PRONTO INTERVENTO ROMA 2.0

Aggiornata al 18/11/2026 (Prompt 9). Le voci sono in ordine di esecuzione. Accanto a ogni voce: **chi** la fa e **dove**.
Regola generale: **nessuna chiave, password o certificato va scritto in chat, in un'email, in un modulo del sito o nel repository**.
Le credenziali si inseriscono solo nei pannelli protetti (Netlify, Supabase, myPOS, Resend, Google).

Legenda: 🅰 = blocca il **sito pubblico** (livello A) · 🅱 = blocca la **piattaforma transazionale** (livello B) · ⏳ = si può fare dopo il lancio.

## 1. Dati aziendali e contatti (titolare) — /admin/configurazione-azienda/

| # | Voce | Livello | Documento per la verifica |
|---|---|---|---|
| 1.1 | Nome commerciale, ragione sociale, titolare | 🅰 | Visura camerale |
| 1.2 | Partita IVA | 🅰 | Certificato di attribuzione P.IVA o visura |
| 1.3 | Sede legale (e sede operativa se diversa) | 🅰 | Visura camerale |
| 1.4 | Telefono principale | 🅰 | Contratto o fattura dell'operatore. **Il numero +39 351 922 1277 presente sul sito attuale va confermato**: non è stato inserito |
| 1.5 | Email aziendale | 🅰 | Casella attiva (si verifica ricevendo un'email) |
| 1.6 | Orari di disponibilità | 🅰 | Decisione del titolare. Non indicare "H24" se non c'è un servizio reale a ogni ora |
| 1.7 | PEC, WhatsApp Business | facoltativi | Visura (PEC), profilo WhatsApp Business |
| 1.8 | Logo e foto del titolare | consigliati | File originali (logo vettoriale; foto autentica, non di repertorio) |
| 1.9 | Descrizione, disponibilità dei servizi, nota sulle zone | consigliati | Testo approvato dal titolare |
| 1.10 | Abilitazioni (DM 37/08 ecc.) | facoltative | **Solo** se documentate: il documento si carica nella sezione riservata e solo dopo si verifica il campo pubblico |
| 1.11 | Copertura assicurativa (testo pubblico) e dati della polizza (riservati) | facoltativi | Polizza RC in corso di validità |
| 1.12 | Codice fiscale, REA | riservati | Visura (non pubblicati) |

Procedura: compila → **Salva** → seleziona i campi → indica il documento in "Verificato su" → **Verifica** → **Aggiorna il sito**.
Un campo modificato torna "non verificato" e sparisce da sito, PDF e dati strutturati finché non viene riverificato.

## 2. Servizi, zone, prezzi (titolare)

| # | Voce | Livello | Dove |
|---|---|---|---|
| 2.1 | Confermare i 6 servizi e le 24 sottocategorie realmente offerti | 🅱 (🅰 consigliato) | /admin/setup/ → "Servizi attivi" → Registra con nota |
| 2.2 | Confermare le zone operative (quartieri e comuni) | ⏳ | /admin/seo/ → Impostazioni → Zone operative (attivare solo le zone servite davvero); la pagina /zone-operative/ si pubblica solo dopo |
| 2.3 | Approvare i listini Family, Lavoro Protetto, Business, Hotel (e il prezzo indicativo Corporate) | 🅱 | /admin/#prezzi e /admin/#listini: **Salva e approva** (con nota) → **Pubblica**. Senza approvazione e pubblicazione il sito di produzione mostra "Prezzo in definizione" |
| 2.4 | Spuntare per ogni piano "Titolare" e "Legale" | 🅱 | Stesse pagine |

## 3. Documenti legali (titolare + consulente)

| # | Voce | Livello |
|---|---|---|
| 3.1 | Informativa privacy (titolare del trattamento, finalità, basi giuridiche, conservazione, diritti) | 🅰 |
| 3.2 | Cookie policy (necessaria prima di attivare Google Analytics) | 🅰 solo con GA4 |
| 3.3 | Condizioni di vendita PRONTO+ (Family, Business, Hotel, Corporate) e recesso | 🅱 |
| 3.4 | Condizioni Lavoro Protetto: **diritti legali del cliente** (garanzia legale, Codice del consumo) **separati** dai servizi di assistenza facoltativi a pagamento | 🅱 |

Le bozze sono in `docs/legale/` e nelle pagine `/condizioni-bozza/` dell'anteprima (mai in produzione). Dopo la validazione: /admin/setup/ → "Privacy e documentazione legale" → Registra "Verificato" con il nome del consulente e la data.

## 4. Account e servizi esterni (titolare o tecnico di fiducia)

| # | Servizio | Livello | Cosa fare |
|---|---|---|---|
| 4.1 | **GitHub** | — | Creare (o indicare) l'account/organizzazione e un repository **privato** vuoto. Dare l'autorizzazione esplicita al push |
| 4.2 | **Netlify** | 🅰 | Creare il progetto di staging `pronto-intervento-roma-2` collegato al repository (branch `develop`). Il progetto attuale `delfino-soffice-ca8830` **non va toccato** |
| 4.3 | **Supabase — staging** | 🅱 | Nuovo progetto dedicato (regione UE), separato da Romeo H24 e da qualsiasi altro progetto. Vedi `docs/NETLIFY-STAGING-GUIDE.md` §3 |
| 4.4 | **Supabase — produzione** | 🅱 | Secondo progetto, creato solo dopo il collaudo dello staging |
| 4.5 | **myPOS** | 🅱 | Account merchant; credenziali **sandbox** per lo staging (SID, wallet, chiave privata, certificato pubblico myPOS) |
| 4.6 | **Email transazionali (Resend)** | 🅱 | Account, dominio mittente verificato (es. `notifiche.prontointerventoroma.it`), chiave API |
| 4.7 | **Record DNS email** | 🅱 | SPF/DKIM del provider sul **sottodominio** mittente. I record esistenti di Aruba (MX, SPF, DMARC) **non vanno modificati** senza autorizzazione |
| 4.8 | **Google Search Console** | ⏳ | La proprietà risulta già verificata via DNS (record `google-site-verification`). Aggiungere l'email del service account come utente "Limitato" |
| 4.9 | **Provider AI** (facoltativo) | ⏳ | Solo se si attiva PRONTO AI: chiave API, budget mensile approvato, DPA del provider |

## 5. Fotografie (titolare)

111 posizioni con immagini segnaposto (`reports/migration/foto-da-sostituire.csv`). Priorità alta: hero, home e 6 categorie (10 foto).
Servono foto **reali** dei lavori o con licenza commerciale; nessuna foto con clienti riconoscibili senza consenso.

## 6. Collaudo e approvazione finale

| # | Voce | Livello |
|---|---|---|
| 6.1 | Prova completa di acquisto in **sandbox** sullo staging (ordine → pagamento → notifica firmata → contratto attivo → duplicato respinto) | 🅱 |
| 6.2 | Email di prova ricevuta (pulsante in /admin/setup/) | 🅱 |
| 6.3 | Revisione di tutte le pagine pubbliche sullo staging (testi, foto, numeri) | 🅰 |
| 6.4 | Approvazione scritta del titolare al lancio (registrata in /admin/setup/ → Test finali) | 🅱 |
| 6.5 | Autorizzazione esplicita al passaggio di dominio (vedi `docs/PRODUCTION-LAUNCH-PLAN.md`) | 🅰 |

Il cruscotto **/admin/lancio/** ricalcola GO / NO-GO dai dati verificati: non si può forzare.
